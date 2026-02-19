"use server";

import { generateImage, generateMultimodal } from "@/lib/gemini";

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

        // Add User-Agent to mimic browser behavior (required for Tips.jp etc.)
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
                console.log(`[resolveImageUrl] Extracted OGP: ${targetImageUrl}`);

                // Fetch the actual image
                const imgRes = await fetch(targetImageUrl, {
                    headers: {
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
                    }
                });
                const imgBuffer = await imgRes.arrayBuffer();
                return {
                    buffer: Buffer.from(imgBuffer),
                    mimeType: "image/jpeg", // Assume jpeg or detect from header
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

// 1. Analyze Note Thumbnail
export async function analyzeNoteThumbnail(inputUrl: string) {
    let imageBase64 = "";

    const resolved = await resolveImageUrl(inputUrl);
    if (!resolved) {
        return { success: false, error: "参考画像（または記事のOGP画像）が取得できませんでした。URLを確認してください。" };
    }
    imageBase64 = resolved.buffer.toString("base64");

    const prompt = `あなたはトップクラスのアートディレクター兼Webデザイナーです。
提供された画像を「完全に再現するための設計図」として分析してください。
画像生成AIが**この画像を忠実に再現できる**レベルの詳細な記述を行ってください。

## 分析項目
特に「余白」「バランス」「視線誘導」などの**構図の美しさ**に注目してください。

### 1. 構図とレイアウト (Composition)
- レイアウトパターン（例：黄金比、三分割法、シンメトリー）
- テキストとビジュアルの配置バランス
- **余白の取り方（余裕があるか、密か）**

### 2. 色彩設計 (Colors)
- 背景色（HEX）とテクスチャ（単色、グラデ、ノイズなど）
- メインカラーとアクセントカラーの役割
- 全体のトーン（信頼感、ポップ、高級感など）

### 3. タイポグラフィ (Typography)
- フォントの種類（ゴシック、明朝、手書き）とウェイト
- 文字組み（詰め、行間、文字サイズジャンプ率）
- テキスト装飾（袋文字、影、立体、ネオン）

### 4. グラフィック要素 (Visuals)
- メインビジュアルの特徴（実写、イラスト、3D、アイコン）
- あしらい・装飾（集中線、座布団、幾何学模様）

## 出力形式（JSON）
\`\`\`json
{
  "layout": "構図の詳細な説明（例：左にテキスト、右に人物の対比構造...）",
  "colors": {
    "background": "#XXXXXX",
    "text_primary": "#XXXXXX",
    "text_secondary": "#XXXXXX",
    "accent": "#XXXXXX",
    "gradient": "詳細"
  },
  "typography": "フォント・文字組みの詳細...",
  "style": "全体のデザインスタイル...",
  "visual_elements": [
    { "name": "要素名", "category": "decoration", "description": "詳細" }
  ],
  "text_content": "画像内のテキスト"
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

// 2. Generate Prompt for Editing (Updated to return structured data)
export async function generateNotePrompt(analysisData: any, title: string, category: string) {
    const prompt = `あなたは世界最高峰の画像生成プロンプトエンジニアです。
    ユーザーがアップロードした参考画像をベースに、新しいサムネイルを作成するための「要素置換計画」を作成してください。
    **「素人が作ったような散らかったデザイン」ではなく、「プロが作った整ったデザイン」を目指します。**

    【参考画像の分析結果】
    ${JSON.stringify(analysisData, null, 2)}

    【ユーザーの要望】
    - タイトル文言: ${title || "（指定なし・維持）"}
    - カテゴリ: ${category}

    【タスク】
    参考画像を構成する要素をリストアップし、それぞれの変更計画を定義してください。
    
    **【重要】ベーススタイルの記述**
    "base_style_prompt"には、参考画像の**「構図の美しさ」「色のまとまり」「質感」**を言語化した高品質な英語プロンプトを記述してください。
    （例： "Professional minimalist layout, golden ratio composition, high quality 3D typography, clean whitespace, corporate memphis style..."）

    出力は**以下のJSON形式のみ**を行ってください。

    {
      "base_style_prompt": "プロ品質の画像生成用英語プロンプト...",
      "replacements": [
        {
          "id": 1,
          "element_name": "...",
          "type": "text",
          "original_content": "...",
          "new_content": "維持"
        }
      ],
      "design_notes": "..."
    }`;

    try {
        const { generateText } = await import("@/lib/gemini");
        const textResult = await generateText(prompt, 0.7, "gemini-2.0-flash"); // Use stable model for JSON ensuring
        const cleanJson = textResult.replace(/```json/g, "").replace(/```/g, "").trim();
        return { success: true, data: JSON.parse(cleanJson) };
    } catch (e: any) {
        return { success: false, error: e.message || "プロンプト生成エラー" };
    }
}


export async function generateArrangedContent(elementName: string, originalContent: string): Promise<{ success: boolean; arrangedContent?: string; error?: string }> {
    const prompt = `あなたは世界トップクラスのコピーライター兼アートディレクターです。
        以下のWeb画像要素（テキストまたはビジュアル指示）を、**「よりプロフェッショナルで、クリック率が高くなるように」** ブラッシュアップ（アレンジ）してください。

【対象要素】: ${elementName}
【元の内容】: ${originalContent}

## 指示
        - ** 大胆な変更よりも、品質と効果を重視してください。**
            - テキストの場合: 短く、パンチがあり、かつ意味が通る魅力的な日本語に書き換えてください。
    - ビジュアル指示の場合: より具体的で、美しく、AIが生成しやすい描写に書き換えてください。
    - 決して「意味不明」な内容にはせず、文脈（Webコンテンツのサムネイル）を維持してください。
    - 元の内容が既に良い場合は、微調整に留めてください。

## 出力
    アレンジ後の内容のみを出力してください。（解説不要）
    `;

    try {
        const { generateText } = await import("@/lib/gemini");
        const result = await generateText(prompt, 0.6); // Lower temp for stability
        return { success: true, arrangedContent: result };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// 3. Generate Note Thumbnails
export async function generateNoteThumbnails(
    analysisData: any,
    title: string,
    category: string,
    count: number = 1,
    customPrompt?: string,
    platform: string = 'note', // 'note', 'brain', 'tips'
    referenceImage?: string, // URL or Base64 (User original upload)
    previousImage?: string | null, // The image we just generated (for refinement)
    additionalMaterials?: { image: string; description: string }[] // NEW: Additional images to include
) {
    // Platform optimization instructions
    let platformSpecs = "1280x670 aspect ratio 1.91:1";
    let platformContext = "Note article header image";
    let qualityBoosters = "High quality, Professional design, Clean layout, Trending on Pinterest";

    if (platform === 'brain') {
        platformSpecs = "1280x670 aspect ratio 1.91:1";
        platformContext = "Brain market info-product header"; // Updated context
        qualityBoosters = "Hyper-realistic 3D Render, Commercial Advertisement, High Impact, Bold Typography, 8k resolution, Octane Render, Financial/Business aesthetic, Depth of Field";
    } else if (platform === 'tips') {
        platformSpecs = "1200x630 aspect ratio 1.91:1";
        platformContext = "Tips.jp article header";
        qualityBoosters = "Vibrant colors, Eye-catching, Social Media Viral style, Glossy finish, High contrast, 3D text effects, Neon accents";
    } else {
        // Note defaults boost
        qualityBoosters += ", Professional Typography, Corporate Memphis or Modern SaaS style, High Clarity, Bauhaus layout principles";
    }

    // Initialize Reference Images Collection
    let refImagesData: { mimeType: string; data: string }[] = [];

    // Helper to add image to ref collection
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

    // Helper to track image roles
    let imageRoleDescriptions: string[] = [];
    let refIndex = 1;

    // 1. Additional Materials (Highest Priority)
    if (additionalMaterials && additionalMaterials.length > 0) {
        for (const mat of additionalMaterials) {
            const startLen = refImagesData.length;
            await addRefImage(mat.image);

            if (refImagesData.length > startLen) {
                // Translated Instructions
                let rawDesc = mat.description || '';
                let strictInstr = "Include this element prominently.";

                if (rawDesc.includes("背景") || rawDesc.includes("background")) {
                    strictInstr = "CRITICAL: Use this image EXCLUSIVELY as the BACKGROUND. Do NOT generate a new background. Preserve its details, style, and composition.";
                } else if (rawDesc.includes("メイン") || rawDesc.includes("キャラクター") || rawDesc.includes("character") || rawDesc.includes("顔") || rawDesc.includes("face")) {
                    strictInstr = "CRITICAL: This is the MAIN CHARACTER/SUBJECT. Place it centrally. Do NOT change the face or identity.";
                } else if (rawDesc.includes("スタイル") || rawDesc.includes("style")) {
                    strictInstr = "Use this image as a STYLE REFERENCE (Colors, Lighting, Texture).";
                }

                imageRoleDescriptions.push(`[Image ${refIndex} - User Material]: ${strictInstr} (User Note: ${rawDesc})`);
                refIndex++;
            }
        }
    }

    // 2. Previous Image (Refinement) - Changed to Base State for accumulation
    if (previousImage) {
        const startLen = refImagesData.length;
        await addRefImage(previousImage);
        if (refImagesData.length > startLen) {
            imageRoleDescriptions.push(`[Image ${refIndex} - PREVIOUS VERSION STATE]: This is the current state of the thumbnail.Use it as the BASE for your edits.
1. PRESERVE everything in this image(background, characters, composition) that is NOT contradicted by the[HISTORY].
2. The user wants to KEEP past changes(like "Orange color", "Space background").
3. ONLY apply the NEW changes requested in the prompt.`);
            refIndex++;
        }
    }
    // 3. User Reference Image (Original Upload)
    else if (referenceImage) {
        const startLen = refImagesData.length;
        await addRefImage(referenceImage);
        if (refImagesData.length > startLen) {
            imageRoleDescriptions.push(`[Image ${refIndex} - Original Reference]: This is a LAYOUT GUIDE only.Strict Rules: \n1.Follow the COMPOSITION(where things are).\n2.Do NOT copy the character, art style, or specific details.\n3.Create a completely NEW design with the User's text/colors.`);
            refIndex++;
        }
    }

    let materialInstruction = '';
    if (imageRoleDescriptions.length > 0) {
        materialInstruction = `【REFERENCE IMAGE ROLES (CRITICAL)】\nYou have been provided with ${refImagesData.length} reference images. Follow these specific roles:\n\n${imageRoleDescriptions.join('\n')}\n\nIMPORTANT: If an image is marked as BACKGROUND, you must composite terms ON TOP of it.`;
    }

    let basePrompt = customPrompt || "";

    // Fallback if no custom prompt provided (use Analysis Data)
    if (!basePrompt) {
        basePrompt = `
[SOURCE ANALYSIS]
The user wants to create a thumbnail based on this structure:
Layout: ${analysisData.layout}
Colors: ${analysisData.colors.dominant_colors.join(', ')}
Typography: ${analysisData.typography}
Style: ${analysisData.style}

[VISUAL ELEMENT VISIBILITY]
${analysisData.visual_elements.join('\n')}
`;
    }

    const additionalMaterialInstruction = additionalMaterials && additionalMaterials.length > 0
        ? `
[ADDITIONAL MATERIALS (CRITICAL)]
The user has uploaded specific images to use.
YOU MUST INCORPORATE THESE IMAGES into the design:
${additionalMaterials.map(m => `- Image: ${m.description}`).join('\n')}
Integrate them naturally. Do not just paste them; blend them into the composition.
` : "";

    const userInstruction = `
[INSTRUCTION]
${basePrompt}
`;

    const finalPrompt = `
[TASK]
Create a high-quality commercial header image for ${platform} (${platformContext}).
[TEXT CONTENT] Title: "${title}"
[VISUAL STYLE] Layout: ${analysisData.layout}, Colors: ${analysisData.colors}, Texture: ${analysisData.style}
[QUALITY STANDARDS] ${qualityBoosters}, ${platformSpecs}, Sharp focus, No blur, 3D Typography.

${additionalMaterialInstruction}

${userInstruction}

[CRITICAL INSTRUCTIONS FOR REFINEMENT]
1. HISTORY IS CUMULATIVE: Improve upon the previous image if one exists.
2. BASE IMAGE PRESERVATION: Keep the *structure* of the reference/previous image but UPGRADE the quality.
3. UPGRADE PRIORITY: If the user asks for "Omakase" or "Make it better", apply the [QUALITY STANDARDS] aggressively.
4. TEXT REWRITING: The text in the image should match the provided Tile: "${title}". DO NOT use the text from the reference image blindly.
5. MATERIAL USAGE: If materials are provided, they are the "Hero" elements.
6. QUALITY: Avoid "AI Artifacts" (weird hands, gibberish text). Use clean, geometric or photographic backgrounds if unsure.
7. VISUAL SUBSTITUTION: If the plan says "Replace Man with Woman", DO IT COMPLETELY.
8. ANTI-PLAGIARISM: Do not copy the reference image pixel-for-pixel. Re-create the *idea* with better execution.
`;

    // Use the constructed final prompt for generation
    basePrompt = finalPrompt;

    const { generateImageWithReference, generateImage } = await import("@/lib/gemini");

    const promises = Array.from({ length: count }).map(async (_, i) => {
        let prompt = basePrompt;

        // Add variations
        if (i > 0) {
            prompt += `\n\n[VARIATION ${i + 1}]: Make the design slightly different (different background or color accent).`;
        }

        try {
            let imgData = "";
            if (refImagesData.length > 0) {
                imgData = await generateImageWithReference(prompt, refImagesData);
            } else {
                imgData = await generateImage(prompt);
            }

            return {
                image: imgData,
                description: i === 0 ? "Main Design" : variationDescription(i) // Fixed missing function
            };
        } catch (e) {
            return null;
        }
    });

    const results = (await Promise.all(promises)).filter(Boolean);
    return { success: true, images: results };
}

function variationDescription(i: number) {
    return i === 1 ? "Variation 1" : "Variation 2";
}
