import { GoogleGenerativeAI } from "@google/generative-ai";

// Use GOOGLE_AI_API_KEY to match .env.local (also works as GEMINI_API_KEY fallback)
const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.warn("GOOGLE_AI_API_KEY is not set in environment variables.");
}

const genAI = new GoogleGenerativeAI(apiKey || "");

// Helper for Exponential Backoff & Model Fallback
async function runWithRetry<T>(
    operation: (modelName: string) => Promise<T>,
    primaryModel: string,
    fallbackModels: string[] = []
): Promise<T> {
    const models = [primaryModel, ...fallbackModels];
    let lastError: any;

    for (const model of models) {
        // Retry logic for each model (up to 3 attempts)
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                return await operation(model);
            } catch (e: any) {
                lastError = e;
                const isRateLimit = e.message?.includes("429") || e.message?.includes("quota") || e.message?.includes("Too Many Requests") || e.message?.includes("Resource exhausted");
                const isServerOverload = e.message?.includes("503") || e.message?.includes("Overloaded");

                if (isRateLimit || isServerOverload) {
                    console.warn(`Gemini API Error (${model}, attempt ${attempt}/3): ${e.message}. Retrying...`);
                    // Exponential backoff: 1s, 2s, 4s
                    await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
                    continue;
                }

                // If other error, break retry loop and try next model (if strictly model related) or throw
                // Assume 4xx errors (bad request) shouldn't change with model, except maybe capability
                if (e.message?.includes("not found") || e.message?.includes("not supported")) {
                    console.warn(`Model ${model} not available or supported. Trying next model...`);
                    break; // Try next model immediately
                }

                throw e; // Non-retriable error
            }
        }
        console.warn(`All attempts failed for model ${model}. Switching to fallback...`);
    }

    throw lastError;
}

export async function generateText(prompt: string, temp = 0.7, initialModelName = "gemini-2.0-flash") {
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

    return runWithRetry(async (modelName) => {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: temp,
                maxOutputTokens: 8192,
            }
        });
        const response = await result.response;
        return response.text();
    }, initialModelName, ["gemini-1.5-flash", "gemini-1.5-pro"]);
}

// YouTube動画をGeminiで直接分析する関数
export async function generateWithYouTube(prompt: string, youtubeUrl: string, temp = 0.7) {
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

    console.log("[generateWithYouTube] Analyzing YouTube video:", youtubeUrl);

    // Gemini can understand YouTube URLs directly when included in the prompt
    // Fallback: gemini-1.5-flash also supports this
    return runWithRetry(async (modelName) => {
        const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
                temperature: temp,
                maxOutputTokens: 8192,
            }
        });

        const fullPrompt = `以下のYouTube動画を分析してください。

【分析対象動画】
${youtubeUrl}

---

${prompt}`;

        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
        });
        const response = await result.response;
        console.log(`[generateWithYouTube] Analysis complete using ${modelName}`);
        return response.text();
    }, "gemini-2.0-flash", ["gemini-1.5-flash", "gemini-1.5-pro"]);
}

// Helper specific to structured JSON output
export const gemini = genAI;

export async function generateMultimodal(prompt: string, images: { mimeType: string; data: string }[]) {
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

    // Only newer models support multimodal well
    return runWithRetry(async (modelName) => {
        const model = genAI.getGenerativeModel({ model: modelName });
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
    }, "gemini-2.0-flash", ["gemini-1.5-flash", "gemini-1.5-pro"]); // Fallback sequence
}

// Image Generation using Gemini 3.0 Pro Image Preview (No fallback currently widely available via same API shape except maybe older Imagen)
export async function generateImage(prompt: string): Promise<string> {
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

    console.log("[generateImage] Starting with prompt:", prompt.slice(0, 50) + "...");

    // Only gemini-3-pro-image-preview currently for image gen in this lib
    // We can retry, but fallback is tricky without changing API shape usually.
    return runWithRetry(async (modelName) => {
        const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
                // @ts-ignore
                responseModalities: ["image", "text"],

            }
        });

        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error("画像生成がタイムアウトしました（60秒）")), 60000);
        });

        const generatePromise = model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
        });

        console.log(`[generateImage] Waiting for API response (${modelName})...`);
        const result = await Promise.race([generatePromise, timeoutPromise]);

        const response = await result.response;
        const parts = response.candidates?.[0]?.content?.parts;

        if (parts) {
            for (const part of parts) {
                if ((part as any).inlineData) {
                    const inlineData = (part as any).inlineData;
                    console.log("[generateImage] Image generated successfully");
                    return `data:${inlineData.mimeType};base64,${inlineData.data}`;
                }
            }
        }
        throw new Error("No image generated in response");
    }, "gemini-3-pro-image-preview", []); // No fallback for image yet
}

// Image Generation with Reference Images (Multimodal)
export async function generateImageWithReference(
    prompt: string,
    referenceImages: { mimeType: string; data: string }[]
): Promise<string> {
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

    console.log("[generateImageWithReference] Starting with", referenceImages.length, "references");

    return runWithRetry(async (modelName) => {
        const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
                // @ts-ignore
                responseModalities: ["image", "text"],

            }
        });

        const imageParts = referenceImages.map(img => ({
            inlineData: {
                data: img.data,
                mimeType: img.mimeType
            }
        }));

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

        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error("画像生成がタイムアウトしました（60秒）")), 60000);
        });

        const generatePromise = model.generateContent({
            contents: [{
                role: "user",
                parts: [
                    ...imageParts,
                    { text: enhancedPrompt }
                ]
            }],
        });

        console.log(`[generateImageWithReference] Waiting for API response (${modelName})...`);
        const result = await Promise.race([generatePromise, timeoutPromise]);
        const response = await result.response;
        const parts = response.candidates?.[0]?.content?.parts;

        if (parts) {
            for (const part of parts) {
                if ((part as any).inlineData) {
                    const inlineData = (part as any).inlineData;
                    console.log("[generateImageWithReference] Image generated successfully");
                    return `data:${inlineData.mimeType};base64,${inlineData.data}`;
                }
            }
        }
        throw new Error("No image generated in response");
    }, "gemini-3-pro-image-preview", []);
}
