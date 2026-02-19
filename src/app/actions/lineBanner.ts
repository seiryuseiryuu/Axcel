"use server";

import { generateMultimodal } from "@/lib/gemini";

// Helper to resolve image URL (handles OGP)
async function resolveImageUrl(inputUrl: string): Promise<{ buffer: Buffer; mimeType: string; resolvedUrl: string } | null> {
    try {
        if (inputUrl.startsWith("data:")) {
            const parts = inputUrl.split(",");
            const mimeMatch = parts[0].match(/:(.*?);/);
            const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
            return {
                buffer: Buffer.from(parts[1], 'base64'),
                mimeType,
                resolvedUrl: inputUrl
            };
        }

        const res = await fetch(inputUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
        });
        const contentType = res.headers.get("content-type") || "";

        let targetImageUrl = inputUrl;

        // HTML -> Try OGP
        if (contentType.includes("text/html")) {
            const html = await res.text();
            const match = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i) ||
                html.match(/<meta\s+name="og:image"\s+content="([^"]+)"/i) ||
                html.match(/<meta\s+content="([^"]+)"\s+property="og:image"/i);

            if (match && match[1]) {
                targetImageUrl = match[1];
                if (targetImageUrl.startsWith("/")) {
                    const urlObj = new URL(inputUrl);
                    targetImageUrl = `${urlObj.origin}${targetImageUrl}`;
                }

                const imgRes = await fetch(targetImageUrl, {
                    headers: {
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
                    }
                });
                const imgBuffer = await imgRes.arrayBuffer();
                return {
                    buffer: Buffer.from(imgBuffer),
                    mimeType: "image/jpeg",
                    resolvedUrl: targetImageUrl
                };
            } else {
                return null;
            }
        } else {
            // Direct Image
            const buffer = await res.arrayBuffer();
            let mimeType = contentType;
            if (!mimeType.includes("image")) {
                if (inputUrl.endsWith(".png")) mimeType = "image/png";
                else mimeType = "image/jpeg";
            }
            return {
                buffer: Buffer.from(buffer),
                mimeType,
                resolvedUrl: targetImageUrl
            }
        }
    } catch (e) {
        console.error("Resolve Image Error:", e);
        return null;
    }
}

// 1. Analyze LINE Banner
export async function analyzeLineBanner(inputUrl: string) {
    let imageBase64 = "";

    const resolved = await resolveImageUrl(inputUrl);
    if (!resolved) {
        return { success: false, error: "参考画像が取得できませんでした。" };
    }
    imageBase64 = resolved.buffer.toString("base64");

    const prompt = `あなたはトップクラスのLINE公式アカウント専属デザイナーです。
提供されたバナー画像を「完全に再現するための設計図」として分析してください。
画像生成AIが**この画像を忠実に再現できる**レベルの詳細な記述を行ってください。

## 分析項目
特に「情報の視認性」と「クリックしたくなる仕掛け」に注目してください。

### 1. 構図とレイアウト
- 全体の構図（正方形、長方形、分割レイアウトなど）
- テキストとビジュアルのバランス（LINEのトーク画面で縮小されても読めるか）

### 2. 色彩設計
- 背景色、メインカラー、アクセントカラー（HEX推定）
- LINEのUI（白背景・黒文字）の中で目立つ配色か

### 3. タイポグラフィ
- フォントスタイル、ウェイト、袋文字などの装飾
- **スマホで見た時の可読性**

### 4. 構成要素
- 「ボタン風」の装飾があるか？（立体感、影）
- キャラクターや人物の表情
- アイコンや矢印の使用

## 出力形式（JSON）
\`\`\`json
{
  "layout": "詳細な構図説明...",
  "colors": {
    "background": "#XXXXXX",
    "text_primary": "#XXXXXX",
    "accent": "#XXXXXX"
  },
  "typography": "フォント・文字装飾の詳細...",
  "style": "全体の雰囲気...",
  "visual_elements": [
    { "name": "要素名", "category": "decoration", "description": "詳細" }
  ]
}
\`\`\`
`;

    try {
        const result = await generateMultimodal(prompt, [{ mimeType: resolved.mimeType, data: imageBase64 }]);
        const cleanJson = result.replace(/```json/g, "").replace(/```/g, "").trim();
        const match = cleanJson.match(/\{[\s\S]*\}/);
        return { success: true, data: match ? JSON.parse(match[0]) : null };
    } catch (e: any) {
        return { success: false, error: e.message || "分析エラー" };
    }
}

// 2. Generate Prompt
export async function generateLinePrompt(analysisData: any, title: string) {
    const prompt = `あなたはLINEバナー制作のプロです。
参考画像の分析結果を元に、新しいLINEバナー（リッチメッセージ等）を作成するための要素置換計画を作成してください。

【分析結果】
${JSON.stringify(analysisData, null, 2)}

【ユーザーの要望】
- タイトル/内容: ${title || "（指定なし・維持）"}

【出力JSON】
\`\`\`json
{
  "base_style_prompt": "参考画像のスタイル詳細...",
  "replacements": [
    { "id": 1, "element_name": "...", "type": "text", "original_content": "...", "new_content": "維持" }
    ...
  ],
  "design_notes": "..."
}
\`\`\`
`;

    try {
        const { generateText } = await import("@/lib/gemini");
        const textResult = await generateText(prompt, 0.7, "gemini-2.0-flash");
        const cleanJson = textResult.replace(/```json/g, "").replace(/```/g, "").trim();
        return { success: true, data: JSON.parse(cleanJson) };
    } catch (e: any) {
        return { success: false, error: e.message || "プロンプト生成エラー" };
    }
}

// 3. Generate LINE Banner
export async function generateLineBanner(
    analysisData: any,
    count: number = 1,
    customPrompt?: string,
    sizeMode: string = 'square', // 'square' (1040x1040), 'card' (1200x628), 'manual'
    referenceImage?: string,
    previousImage?: string | null,
    additionalMaterials?: { image: string; description: string }[],
    mainColor?: string
) {
    let sizeContext = "Square 1:1 Aspect Ratio (1040x1040)";
    if (sizeMode === 'card_small') sizeContext = "Landscape 3:1 Aspect Ratio (1040x350)";
    if (sizeMode === 'card_large') sizeContext = "Landscape 1.5:1 Aspect Ratio (1040x700)";
    if (sizeMode === 'vertical') sizeContext = "Portrait 4:5 Aspect Ratio (1040x1300)";
    if (sizeMode === 'vertical_full') sizeContext = "Portrait 9:16 Aspect Ratio (1040x1850)";

    // Reference Processing
    let refImagesData: { mimeType: string; data: string }[] = [];

    const addRefImage = async (imgStr: string) => {
        try {
            if (imgStr.startsWith("data:")) {
                const parts = imgStr.split(",");
                const mimeMatch = parts[0].match(/:(.*?);/);
                const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
                refImagesData.push({ mimeType, data: parts[1] });
            } else {
                const resolved = await resolveImageUrl(imgStr);
                if (resolved) {
                    refImagesData.push({ mimeType: resolved.mimeType, data: resolved.buffer.toString("base64") });
                }
            }
        } catch (e) { console.error("Error adding ref image", e); }
    };

    // Add Additional Materials (First priority)
    if (additionalMaterials && additionalMaterials.length > 0) {
        for (const mat of additionalMaterials) {
            await addRefImage(mat.image);
        }
    }

    // Add Reference Image (Structure Guide)
    if (referenceImage) {
        await addRefImage(referenceImage);
    }

    const basePrompt = customPrompt || `Create a high-CTR LINE Rich Message Banner.
Context: ${sizeContext}
Style: ${analysisData.style}
Layout: ${analysisData.layout}
Colors: ${analysisData.colors.background} background, ${analysisData.colors.accent} accent
Requirements: High readability on mobile, Clickable button styling, Eye-catching contrast.`;

    const colorInstruction = mainColor ? `
[COLOR OVERRIDE - CRITICAL]
Primary Color: ${mainColor}
Adjust the entire color scheme to match this Primary Color.
- Backgrounds, accents, and key visual elements must harmonize with ${mainColor}.
- Maintain high contrast and readability.
- Ignore the original reference colors if they conflict with ${mainColor}.
` : "";

    const materialInstruction = additionalMaterials && additionalMaterials.length > 0
        ? `
[ADDITIONAL MATERIALS]
The user has provided the following images to be included in the banner.
MUST USE these images as key visual elements:
${additionalMaterials.map(m => `- Image: ${m.description}`).join('\n')}
Integrate them naturally into the layout.
` : "";

    const userInstruction = customPrompt ? `
[USER INSTRUCTION]
${customPrompt}
` : "";

    const finalPrompt = `
[TASK]
Create a LINE app banner image.
Size/Ratio Target: ${sizeContext}

[SOURCE ANALYSIS]
Colors: ${JSON.stringify(analysisData.colors)}
Typography: ${analysisData.typography}
Visuals: ${analysisData.visual_elements?.join(', ')}

${basePrompt}

${colorInstruction}

${materialInstruction}

${userInstruction}

[CRITICAL RULES]
1. TEXT MUST BE LEGIBLE ON SMARTPHONES. Use bold, clear fonts.
2. If this is a Rich Message, it often needs a "Button-like" appearance or clear Call-to-Action visual.
3. PRESERVE the layout of the reference image if provided.
4. If Omakase/Upgrade is requested, make it look like a top-tier Japanese marketing creative.
`;

    try {
        const { generateImageWithReference, generateImage } = await import("@/lib/gemini");

        const promises = Array.from({ length: count }).map(async (_, i) => {
            let prompt = finalPrompt;
            if (i > 0) prompt += `\n\nVariation ${i + 1}: Different layout or color accent.`;

            try {
                let imgData = "";
                if (refImagesData.length > 0) {
                    imgData = await generateImageWithReference(prompt, refImagesData);
                } else {
                    imgData = await generateImage(prompt);
                }
                return { imageUrl: imgData };
            } catch (e) {
                return null;
            }
        });

        const results = (await Promise.all(promises)).filter(Boolean);
        return { success: true, images: results }; // Return { success, images: [{ imageUrl: ... }] }
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
