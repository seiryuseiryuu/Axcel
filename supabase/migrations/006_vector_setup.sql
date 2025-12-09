-- Enable the pgvector extension to work with embedding vectors
CREATE EXTENSION IF NOT EXISTS vector;

-- Create a function to match transcript chunks
CREATE OR REPLACE FUNCTION match_transcript_chunks (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter_course_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  content text,
  similarity float
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    tc.id,
    tc.content,
    1 - (tc.embedding <=> query_embedding) AS similarity
  FROM transcript_chunks tc
  JOIN transcripts t ON tc.transcript_id = t.id
  JOIN contents c ON t.content_id = c.id
  WHERE 1 - (tc.embedding <=> query_embedding) > match_threshold
  AND (filter_course_id IS NULL OR c.course_id = filter_course_id)
  ORDER BY tc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
