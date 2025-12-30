import { createClient } from "@supabase/supabase-js"; // Or use Google Generative AI SDK, OpenAI SDK

// Abstract interface for AI providers
export interface AIProvider {
    generateText(prompt: string, systemPrompt?: string): Promise<string>;
    generateImage(prompt: string): Promise<string>;
}

export class OpenAIProvider implements AIProvider {
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async generateText(prompt: string, systemPrompt?: string): Promise<string> {
        // Mock implementation to avoid installing openai package if not requested, 
        // or use fetch directly
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-4-turbo",
                messages: [
                    { role: "system", content: systemPrompt || "You are a helpful assistant." },
                    { role: "user", content: prompt }
                ]
            })
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        return data.choices?.[0]?.message?.content || "";
    }

    async generateImage(prompt: string): Promise<string> {
        return "https://via.placeholder.com/1024?text=OpenAI+Image+Placeholder";
    }
}

export class GeminiProvider implements AIProvider {
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async generateText(prompt: string, systemPrompt?: string): Promise<string> {
        // Using Gemini API REST
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.apiKey}`;

        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: `${systemPrompt ? systemPrompt + "\n" : ""}${prompt}` }] }]
            })
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    }

    async generateImage(prompt: string): Promise<string> {
        // Use the implementation from lib/gemini which supports Gemini 3 Imgen
        const { generateImage } = await import("@/lib/gemini");
        return generateImage(prompt);
    }
}

export class AIClient {
    private provider: AIProvider;

    constructor(providerName: "openai" | "gemini" = "openai") {
        if (providerName === "gemini" && process.env.GEMINI_API_KEY) {
            this.provider = new GeminiProvider(process.env.GEMINI_API_KEY);
        } else {
            this.provider = new OpenAIProvider(process.env.OPENAI_API_KEY || "");
        }
    }

    async completion(prompt: string, system?: string) {
        return this.provider.generateText(prompt, system);
    }

    async image(prompt: string) {
        return this.provider.generateImage(prompt);
    }
}
