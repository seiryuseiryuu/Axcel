
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.warn("GEMINI_API_KEY is not set in environment variables.");
}

const genAI = new GoogleGenerativeAI(apiKey || "");

export async function generateText(prompt: string, temp = 0.7) {
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    try {
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: temp,
            }
        });
        const response = await result.response;
        return response.text();
    } catch (e) {
        console.error("Gemini Generation Error:", e);
        throw new Error("AI生成中にエラーが発生しました。");
    }
}

// Helper specific to structured JSON output (if needed in future, though standard text prompt usually works for Gemini Pro with explicit JSON instructions)
export const gemini = genAI;
