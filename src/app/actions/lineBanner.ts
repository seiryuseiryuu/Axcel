"use server";

import { generateText, generateImage, generateImageWithReference, generateMultimodal } from "@/lib/gemini";

// Types
export interface LineBannerInfo {
    message: string;
    campaignDetail?: string;
    size: 'rich_menu' | 'rich_message' | 'card';
    buttonText?: string;
    referenceImage?: string; // base64 or URL
}

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

        const res = await fetch(inputUrl);
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

                const imgRes = await fetch(targetImageUrl);
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

// 1. Analyze Banner Pattern
export async function analyzeLineBanner(referenceImageUrl: string) {
    let imageBase64 = "";

    const resolved = await resolveImageUrl(referenceImageUrl);
    if (!resolved) {
        return { success: false, error: "参考画像（または記事のOGP画像）が取得できませんでした。URLを確認してください。" };
    }
    imageBase64 = resolved.buffer.toString("base64");

    const prompt = `あなたはLINEマーケティングの専門家です。
このバナー画像を「完全に再現するための設計図」として分析してください。

## 分析項目
1. **レイアウト構成**: 視線誘導、要素の配置バランス、余白の取り方。
2. **配色戦略**: メインカラー、アクセントカラー、背景色を**HEXコードで推定**。
3. **CTAボタン**: ボタンの色（HEX）、形、配置、文言。
4. **タイポグラフィ**: フォントの種類（ゴシック/明朝）、太さ、装飾（袋文字、影）、**文字色（HEX）**。
5. **テキストブロック**: 画像内のテキストを「塊」として識別。各ブロックの**元のテキスト内容**、**配置位置**、**サイズ感（大/中/小）**を記録。

## 出力形式（JSON）
\`\`\`json
{
  "layout": "...",
  "colors": {
    "main": "#XXXXXX",
    "accent": "#XXXXXX",
    "background": "#XXXXXX",
    "text_primary": "#XXXXXX"
  },
  "cta": {
    "position": "...",
    "style": "...",
    "color": "#XXXXXX"
  },
  "typography": "...",
  "psychology": "...",
  "text_blocks": [
    { "id": "main_copy", "original_text": "...", "position": "center-top", "size": "large" },
    { "id": "sub_copy", "original_text": "...", "position": "center", "size": "medium" },
    { "id": "button_text", "original_text": "...", "position": "bottom", "size": "small" }
  ]
}
\`\`\`
`;

    try {
        const result = await generateMultimodal(prompt, [{ mimeType: resolved.mimeType, data: imageBase64 }]);
        const cleanJson = result.replace(/```json/g, "").replace(/```/g, "").trim();
        const match = cleanJson.match(/\{[\s\S]*\}/);
        return { success: true, data: match ? JSON.parse(match[0]) : null, raw: result };
    } catch (e: any) {
        return { success: false, error: e.message || "分析エラー" };
    }
}

// 2. Generate Prompt for Editing
export async function generateLinePrompt(analysisData: any, info: LineBannerInfo) {
    const prompt = `あなたはLINE広告バナーのプロンプトエンジニアです。
以下の分析結果と商品情報を元に、画像生成AIへの指示（プロンプト）を作成してください。

ユーザーが後で編集しやすいよう、日本語で記述してください。

【分析データ】
- レイアウト: ${analysisData.layout}
- 配色: ${analysisData.colors.main} / ${analysisData.colors.accent}
- 心理効果: ${analysisData.psychology}
- タイポグラフィ: ${analysisData.typography}

【バナー要件】
- コピー: "${info.message}"
- サブコピー: "${info.campaignDetail || 'なし'}"
- ボタン: "${info.buttonText || '詳細を見る'}"
- サイズ: ${info.size}

【プロンプト作成ルール】
1. テキスト描写よりも「デザイン」「構図」「雰囲気」の指示を重視
2. 日本語テキストを含める指示は出すが、文字化け対策として「テキストは最小限に」とする
3. 高品質、クリック率重視のデザイン指定

【出力形式】
テキストのみ（プロンプト本文）
`;

    try {
        const { generateText } = await import("@/lib/gemini");
        const textResult = await generateText(prompt, 0.7);
        return { success: true, prompt: textResult };
    } catch (e: any) {
        return { success: false, error: e.message || "プロンプト生成エラー" };
    }
}

// 3. Generate Banner Variations
export async function generateLineBanners(
    analysisData: any,
    info: LineBannerInfo,
    count: number = 1,
    customPrompt?: string
) {
    const sizeSpecs = {
        rich_menu: "2500x1686", // Aspect ratio approx 3:2
        rich_message: "1040x1040", // 1:1
        card: "1024x520" // approx 2:1
    };

    const aspectRatio = info.size === 'rich_message' ? '1:1' : info.size === 'card' ? '16:9' : '3:2'; // Approximations for generator

    let basePrompt = "";
    if (customPrompt) {
        basePrompt = customPrompt;
    } else {
        basePrompt = `Create a professional LINE Banner Advertisement.
[TARGET TEXT] "${info.message}"
[DESIGN RULES] Layout: ${analysisData.layout}, Colors: Main ${analysisData.colors.main} Accent ${analysisData.colors.accent}
[SPECS] Ratio: ${aspectRatio}, Mood: ${analysisData.psychology || 'Engaging'}`;
    }

    // Reference Image Handling
    let refImagesData: { mimeType: string; data: string }[] = [];
    // Prefer uploaded/reference image in info
    const refSource = info.referenceImage;

    if (refSource) {
        try {
            const resolved = await resolveImageUrl(refSource);
            if (resolved) {
                refImagesData.push({ mimeType: resolved.mimeType, data: resolved.buffer.toString("base64") });

                // Add VERY strong instruction for reference adherence
                basePrompt += `

[最重要：参考画像の完全踏襲]
この参考画像を**絶対的な設計図**として使用してください。
- 構図（レイアウト・配置バランス・余白）: 参考画像と**完全に同一**にすること
- 配色（背景色・文字色・アクセント色）: 参考画像の色を**そのまま使用**すること
- フォントスタイル（太さ・装飾・影）: 参考画像と**同じデザイン処理**を適用すること
- CTAボタン: 参考画像と同じ位置・色・形状にすること

参考画像と見た目が**ほぼ同じ**になるよう生成してください。オリジナリティは不要です。`;
            }
        } catch (e) {
            console.error("Failed to process reference image for banner:", e);
        }
    }

    const promises = Array.from({ length: count }).map(async (_, i) => {
        let prompt = basePrompt;
        if (i > 0) {
            prompt += `\n\n[VARIATION ${i + 1}]: Make the design slightly different (different background or layout) while keeping the main copy legible.`;
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
                description: i === 0 ? "Main Design" : variationDescription(i)
            };
        } catch (e) {
            console.error("Banner gen error:", e);
            return null;
        }
    });

    const results = (await Promise.all(promises)).filter(Boolean);
    return { success: true, images: results };
}

function variationDescription(i: number) {
    return i === 1 ? "Variation 1" : "Variation 2";
}
