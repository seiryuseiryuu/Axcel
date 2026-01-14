
const fs = require('fs');
const path = require('path');

// Load .env.local manually with better parsing
let apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;

if (!apiKey) {
    try {
        const envPath = path.resolve(__dirname, '.env.local');
        if (fs.existsSync(envPath)) {
            console.log("Found .env.local, parsing...");
            const envConfig = fs.readFileSync(envPath, 'utf8');
            envConfig.split('\n').forEach(line => {
                const parts = line.split('=');
                if (parts.length >= 2) {
                    const key = parts[0].trim();
                    // Join back the rest in case value has =
                    let value = parts.slice(1).join('=').trim();

                    // Remove quotes if present
                    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                        value = value.slice(1, -1);
                    }

                    if (key === 'GOOGLE_AI_API_KEY' || key === 'GEMINI_API_KEY') {
                        apiKey = value;
                        console.log(`Loaded API Key from .env.local (Length: ${value.length})`);
                    }
                }
            });
        }
    } catch (e) {
        console.error("Error loading .env.local:", e);
    }
}

if (!apiKey) {
    console.error("Error: GOOGLE_AI_API_KEY or GEMINI_API_KEY not found.");
    process.exit(1);
}

// Print partial key for verification (safe log)
console.log(`Using API Key: ${apiKey.substring(0, 4)}...${apiKey.slice(-4)}`);

async function listModels() {
    try {
        console.log("Fetching available Gemini models...");

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} - ${await response.text()}`);
        }

        const data = await response.json();

        if (data.models) {
            console.log("\n=== Available Models ===");
            data.models.forEach(model => {
                // Simplify output
                const isGemini3 = model.displayName.includes("Gemini 3") || model.name.includes("gemini-3");
                let prefix = isGemini3 ? ">>> " : "- ";
                console.log(`${prefix}${model.name.replace('models/', '')} (${model.displayName})`);
            });
            console.log("========================");
        } else {
            console.log("No models found.");
        }

    } catch (error) {
        console.error("Error fetching models:", error.message);
    }
}

listModels();
