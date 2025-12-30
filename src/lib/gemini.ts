
import { GoogleGenerativeAI } from "@google/generative-ai";

// Use GOOGLE_AI_API_KEY to match .env.local (also works as GEMINI_API_KEY fallback)
const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.warn("GOOGLE_AI_API_KEY is not set in environment variables.");
}

const genAI = new GoogleGenerativeAI(apiKey || "");


export async function generateText(prompt: string, temp = 0.7, modelName = "gemini-2.0-flash") {
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

    // Allow overriding the model
    const model = genAI.getGenerativeModel({ model: modelName });

    try {
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: temp,
                maxOutputTokens: 8192,
            }
        });
        const response = await result.response;
        return response.text();
    } catch (e: any) {
        console.error(`Gemini Generation Error (${modelName}):`, e);
        // Better error messages
        if (e.message?.includes("API key")) throw new Error("APIキーが無効、または設定されていません。");
        if (e.message?.includes("quota")) throw new Error("API利用枠を超過しました。");
        if (e.message?.includes("not found")) throw new Error(`指定されたモデル(${modelName})が利用できない可能性があります。`);
        throw new Error(`AI生成エラー: ${e.message || "不明なエラー"}`);
    }
}

// YouTube動画をGeminiで直接分析する関数
// Note: Gemini 2.0+ can analyze YouTube videos by including the URL in the prompt
export async function generateWithYouTube(prompt: string, youtubeUrl: string, temp = 0.7) {
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

    // Use gemini-2.0-flash which has URL/video understanding capabilities
    const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig: {
            temperature: temp,
            maxOutputTokens: 8192,
        }
    });

    console.log("[generateWithYouTube] Analyzing YouTube video:", youtubeUrl);

    // Gemini can understand YouTube URLs directly when included in the prompt
    const fullPrompt = `以下のYouTube動画を分析してください。

【分析対象動画】
${youtubeUrl}

---

${prompt}`;

    try {
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
        });
        const response = await result.response;
        console.log("[generateWithYouTube] Analysis complete");
        return response.text();
    } catch (e: any) {
        console.error("[generateWithYouTube] Error:", e);
        throw new Error(`動画分析エラー: ${e.message || "不明なエラー"}`);
    }
}

// Helper specific to structured JSON output (if needed in future, though standard text prompt usually works for Gemini Pro with explicit JSON instructions)
export const gemini = genAI;

export async function generateMultimodal(prompt: string, images: { mimeType: string; data: string }[]) {
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    try {
        const imageParts = images.map(img => ({
            inlineData: {
                data: img.data,
                mimeType: img.mimeType
            }
        }));

        const result = await model.generateContent({
            contents: [{
                role: "user",
                parts: [
                    { text: prompt },
                    ...imageParts
                ]
            }],
        });
        const response = await result.response;
        return response.text();
    } catch (e: any) {
        console.error("Gemini Multimodal Error:", e);
        throw new Error(`AI画像分析エラー: ${e.message || "不明なエラー"}`);
    }
}

// Image Generation using Gemini 3.0 Pro Image Preview
export async function generateImage(prompt: string): Promise<string> {
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

    console.log("[generateImage] Starting with prompt:", prompt.slice(0, 50) + "...");

    // Using gemini-3-pro-image-preview for high quality image generation
    const model = genAI.getGenerativeModel({
        model: "gemini-3-pro-image-preview",
        generationConfig: {
            // @ts-ignore - responseModalities is supported but not in types yet
            responseModalities: ["image", "text"],
        }
    });

    try {
        // Add timeout to prevent indefinite hanging (60 seconds)
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error("画像生成がタイムアウトしました（60秒）")), 60000);
        });

        const generatePromise = model.generateContent({
            contents: [{
                role: "user",
                parts: [{ text: prompt }]
            }],
        });

        console.log("[generateImage] Waiting for API response...");
        const result = await Promise.race([generatePromise, timeoutPromise]);

        const response = await result.response;
        const parts = response.candidates?.[0]?.content?.parts;

        console.log("[generateImage] Got response, parts:", parts?.length || 0);

        if (parts) {
            for (const part of parts) {
                // Check for inline data (image)
                if ((part as any).inlineData) {
                    const inlineData = (part as any).inlineData;
                    console.log("[generateImage] Image generated successfully");
                    return `data:${inlineData.mimeType};base64,${inlineData.data}`;
                }
            }
        }

        console.error("[generateImage] No image data in response");
        throw new Error("No image generated in response");
    } catch (e: any) {
        console.error("Gemini Image Generation Error:", e);
        throw new Error(`AI画像生成エラー: ${e.message || "不明なエラー"}`);
    }
}

// Image Generation with Reference Images (Multimodal)
export async function generateImageWithReference(
    prompt: string,
    referenceImages: { mimeType: string; data: string }[]
): Promise<string> {
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

    console.log("[generateImageWithReference] Starting with", referenceImages.length, "references");

    const model = genAI.getGenerativeModel({
        model: "gemini-3-pro-image-preview",
        generationConfig: {
            // @ts-ignore
            responseModalities: ["image", "text"],
        }
    });

    try {
        const imageParts = referenceImages.map(img => ({
            inlineData: {
                data: img.data,
                mimeType: img.mimeType
            }
        }));

        // Enhanced prompt that emphasizes reproduction from references
        const enhancedPrompt = `[REFERENCE IMAGES PROVIDED ABOVE]

Study the reference images carefully and reproduce:
1. The EXACT style, colors, and visual aesthetic
2. The font style, size, and effects if text is present
3. The person's appearance, pose, expression, and positioning
4. The lighting, shadows, and color grading
5. The overall composition and layout

[YOUR TASK]
${prompt}

IMPORTANT: Match the quality and style of the reference images as closely as possible.`;

        // Add timeout to prevent indefinite hanging (60 seconds)
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error("画像生成がタイムアウトしました（60秒）")), 60000);
        });

        const generatePromise = model.generateContent({
            contents: [{
                role: "user",
                parts: [
                    ...imageParts,  // Reference images first
                    { text: enhancedPrompt }
                ]
            }],
        });

        console.log("[generateImageWithReference] Waiting for API response...");
        const result = await Promise.race([generatePromise, timeoutPromise]);

        const response = await result.response;
        const parts = response.candidates?.[0]?.content?.parts;

        console.log("[generateImageWithReference] Got response, parts:", parts?.length || 0);

        if (parts) {
            for (const part of parts) {
                if ((part as any).inlineData) {
                    const inlineData = (part as any).inlineData;
                    console.log("[generateImageWithReference] Image generated successfully");
                    return `data:${inlineData.mimeType};base64,${inlineData.data}`;
                }
            }
        }

        console.error("[generateImageWithReference] No image data in response");
        throw new Error("No image generated in response");
    } catch (e: any) {
        console.error("Gemini Multimodal Image Generation Error:", e);
        throw new Error(`AI画像生成エラー: ${e.message || "不明なエラー"}`);
    }
}
