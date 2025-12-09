import { createClient } from "@/lib/supabase/server";
import { AIClient } from "@/lib/ai/providers";

// Helper to generate embedding (OpenAI text-embedding-3-small via fetch)
// Note: This requires OPENAI_API_KEY env var
export async function generateEmbedding(text: string): Promise<number[]> {
    if (!process.env.OPENAI_API_KEY) {
        // Fallback or mock if no key
        console.warn("No OPENAI_API_KEY, returning mock embedding");
        return Array(1536).fill(0).map(() => Math.random());
    }

    const res = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            input: text,
            model: "text-embedding-3-small"
        })
    });

    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data.data[0].embedding;
}

export async function searchContext(query: string, courseId?: string): Promise<string> {
    const embedding = await generateEmbedding(query);
    const supabase = await createClient(); // Use server client

    // RPC call to 'match_transcript_chunks' (must be defined in SQL)
    // We assume migration 003_rag_schema defined vector logic but maybe not the function.
    // We'll try to select directly if function not exists, but usually vector search needs RPC for cosine similarity

    // Fallback: If no RPC, just return empty
    // Implementation of RPC usually looks like:
    /*
    create or replace function match_chunks (
      query_embedding vector(1536),
      match_threshold float,
      match_count int,
      filter_course_id uuid
    ) returns table (
      id uuid,
      content text,
      similarity float
    ) language plpgsql stable as $$
    begin
      return query
      select
        transcript_chunks.id,
        transcript_chunks.content,
        1 - (transcript_chunks.embedding <=> query_embedding) as similarity
      from transcript_chunks
      join transcripts on transcript_chunks.transcript_id = transcripts.id
      join contents on transcripts.content_id = contents.id
      where 1 - (transcript_chunks.embedding <=> query_embedding) > match_threshold
      and (filter_course_id is null or contents.course_id = filter_course_id)
      order by transcript_chunks.embedding <=> query_embedding
      limit match_count;
    end;
    $$;
    */

    try {
        const { data: chunks, error } = await supabase.rpc('match_transcript_chunks', {
            query_embedding: embedding,
            match_threshold: 0.5,
            match_count: 3,
            filter_course_id: courseId || null
        });

        if (error) {
            console.error("Vector search error:", error);
            return "";
        }

        if (chunks && chunks.length > 0) {
            return chunks.map((c: any) => c.content).join("\n\n");
        }
    } catch (e) {
        console.error("RAG logic failed", e);
    }

    return "";
}
