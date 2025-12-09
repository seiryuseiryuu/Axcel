import { NextRequest, NextResponse } from "next/server";
import { AIClient } from "@/lib/ai/providers";
import { requirePermission } from "@/lib/rbac";

export async function POST(request: NextRequest) {
    try {
        await requirePermission("canManageCourses"); // Ensure user can use AI

        const body = await request.json();
        const { prompt, type, system } = body;

        // 1. Select provider (could be dynamic)
        const client = new AIClient(process.env.DEFAULT_AI_PROVIDER as "openai" | "gemini" || "openai");

        let result = "";
        if (type === "text") {
            result = await client.completion(prompt, system);
        } else if (type === "image") {
            result = await client.image(prompt);
        }

        return NextResponse.json({ success: true, data: result });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
