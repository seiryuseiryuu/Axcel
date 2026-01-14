
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');

// Manually load .env.local
try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
        console.log("Loading .env.local...");
        const envConfig = fs.readFileSync(envPath, 'utf8');
        envConfig.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim().replace(/^["']|["']$/g, ''); // Remove quotes
                if (!process.env[key]) {
                    process.env[key] = value;
                }
            }
        });
    } else {
        console.log(".env.local not found at", envPath);
    }
} catch (e) {
    console.error("Error loading .env.local:", e);
}

async function main() {
    const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("No API KEY found in environment variables");
        // Debug: print available env keys (not values)
        console.log("Available Env Keys:", Object.keys(process.env).filter(k => k.includes('API') || k.includes('KEY') || k.includes('GOOGLE')));
        return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    console.log("Fetching available models...");
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (!response.ok) {
            console.error("Response not OK:", response.status, response.statusText);
            const errorText = await response.text();
            console.error("Error Body:", errorText);
            return;
        }
        const data = await response.json();

        if (data.models) {
            console.log("--- Available Models ---");
            data.models.forEach(m => {
                // Filter for Gemini models explicitly
                if (m.name.toLowerCase().includes("gemini")) {
                    console.log(`\nName: ${m.name}`);
                    console.log(`Display: ${m.displayName}`);
                    console.log(`Methods: ${m.supportedGenerationMethods}`);
                }
            });
        } else {
            console.error("No models found in response:", data);
        }

    } catch (error) {
        console.error("Error listing models:", error);
    }
}

main();
