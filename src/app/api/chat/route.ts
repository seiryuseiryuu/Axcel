import { NextRequest, NextResponse } from "next/server";
import { AIClient } from "@/lib/ai/providers";
import { searchContext } from "@/lib/ai/rag";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { messages, context } = body;

        // 1. Context Retrieval
        const lastMessage = messages[messages.length - 1].content;
        const retrievedContext = await searchContext(lastMessage, context?.courseId);

        // 2. System Prompt construction
        const systemPrompt = `You are a specialized teaching assistant for this course. 
        Use the provided context to answer questions. If the answer is not in the context, say "I don't have enough information in the course materials to answer that."
        
        Context found in course materials:
        ${retrievedContext || "(No relevant context found)"}`;

        // 3. Generation
        const client = new AIClient();
        const answer = await client.completion(lastMessage, systemPrompt);

        return NextResponse.json({ success: true, message: answer });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
