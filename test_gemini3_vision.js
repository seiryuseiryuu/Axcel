
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
                const value = match[2].trim().replace(/^["']|["']$/g, '');
                if (!process.env[key]) process.env[key] = value;
            }
        });
    }
} catch (e) {
    console.error("Error loading .env.local:", e);
}

async function main() {
    const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("No API KEY found");
        return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3-pro-preview" });

    // 1x1 pixel transparent gif or similar
    const testImage = {
        inlineData: {
            data: "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
            mimeType: "image/gif"
        }
    };

    console.log("Testing gemini-3-pro-preview with vision...");
    try {
        const result = await model.generateContent({
            contents: [{
                role: "user",
                parts: [
                    { text: "What color is this image?" },
                    testImage
                ]
            }]
        });
        console.log("Success!");
        console.log("Response:", result.response.text());
    } catch (e) {
        console.error("Failed:", e.message);
    }
}

main();
