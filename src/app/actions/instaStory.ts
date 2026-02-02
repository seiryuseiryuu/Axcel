"use server";

import { generateText, generateImage, generateImageWithReference, generateMultimodal } from "@/lib/gemini";

// Types
export interface InstaStoryInfo {
    theme: string;           // 投稿テーマ
    target?: string;        // ターゲット層
    style: 'photo' | 'illustration' | 'typography'; // デザインスタイル
    textOverlay?: string;   // 画像に入れる文字
    referenceImage?: string; // base64 or URL
}

// Helper to resolve image URL (handles OGP) - Same as LineBanner
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

// 1. Analyze Story Pattern
export async function analyzeInstaStory(referenceImageUrl: string) {
    let imageBase64 = "";

    const resolved = await resolveImageUrl(referenceImageUrl);
    if (!resolved) {
        return { success: false, error: "参考画像（または記事のOGP画像）が取得できませんでした。URLを確認してください。" };
    }
    imageBase64 = resolved.buffer.toString("base64");

    const prompt = `あなたはInstagramマーケティングの専門家です。
このストーリーズ画像を「完全に再現するための設計図」として分析してください。

## 分析項目
1. **レイアウト構成**: 画像とテキストの配置、余白、スタンプやステッカーの位置。
2. **配色戦略**: 背景色、文字色、アクセントカラーを**HEXコードで推定**。
3. **インタラクティブ要素**: 質問ボックス、アンケート、リンクスタンプなどの有無と位置。
4. **タイポグラフィ**: フォントの雰囲気（手書き風/ゴシック/明朝）、文字の大きさ、装飾。
5. **ビジュアルスタイル**: 写真中心か、イラスト中心か、文字中心か。

## 出力形式（JSON）
\`\`\`json
{
  "layout": "...",
  "colors": {
    "background": "#XXXXXX",
    "text_primary": "#XXXXXX",
    "accent": "#XXXXXX"
  },
  "interactive_elements": "...",
  "typography": "...",
  "visual_style": "...",
  "text_blocks": [
    { "id": "main_text", "original_text": "...", "position": "center", "size": "large" }
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
export async function generateInstaStoryPrompt(analysisData: any, info: InstaStoryInfo) {
    const prompt = `あなたはInstagramストーリーズ作成のプロンプトエンジニアです。
以下の分析結果とテーマ情報を元に、画像生成AIへの指示（プロンプト）を作成してください。

ユーザーが後で編集しやすいよう、日本語で記述してください。

【分析データ】
- レイアウト: ${analysisData.layout}
- 配色: ${analysisData.colors.background} / ${analysisData.colors.text_primary}
- ビジュアルスタイル: ${analysisData.visual_style}
- タイポグラフィ: ${analysisData.typography}

【ストーリーズ要件】
- テーマ: "${info.theme}"
- ターゲット: "${info.target || '指定なし'}"
- スタイル: "${info.style}"
- 表示テキスト: "${info.textOverlay || info.theme}"

【プロンプト作成ルール】
1. ストーリーズ特有の縦長レイアウト(9:16)を意識した構図指定
2. インタラクティブ要素（スタンプ等）を配置するスペースを確保
3. "Instagram Story style", "Vertical layout", "Mobile UI" 等のキーワードを含める
4. 日本語テキストを含める指示は出すが、文字化け対策として「テキストは英語、または最小限」とする（ユーザーが後で編集・追加することを想定）

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

// 3. Generate Insta Stories
export async function generateInstaStories(
    analysisData: any,
    info: InstaStoryInfo,
    count: number = 1,
    customPrompt?: string
) {
    const aspectRatio = "9:16";

    let basePrompt = "";
    if (customPrompt) {
        basePrompt = customPrompt;
    } else {
        basePrompt = `Create a professional Instagram Story background.
[THEME] "${info.theme}"
[DESIGN RULES] Layout: ${analysisData.layout}, Colors: Background ${analysisData.colors.background}
[SPECS] Ratio: ${aspectRatio}, Style: ${info.style}`;
    }

    // Reference Image Handling
    let refImagesData: { mimeType: string; data: string }[] = [];
    const refSource = info.referenceImage;

    if (refSource) {
        try {
            const resolved = await resolveImageUrl(refSource);
            if (resolved) {
                refImagesData.push({ mimeType: resolved.mimeType, data: resolved.buffer.toString("base64") });

                basePrompt += `

[最重要：参考画像の完全踏襲]
この参考画像を**絶対的な設計図**として使用してください。
- 構図（レイアウト・配置バランス・余白）: 参考画像と**完全に同一**にすること
- 配色（背景色・文字色・アクセント色）: 参考画像の色を**そのまま使用**すること
- 雰囲気: 参考画像のトーン＆マナーを再現すること

参考画像と見た目が**ほぼ同じ**になるよう生成してください。`;
            }
        } catch (e) {
            console.error("Failed to process reference image for story:", e);
        }
    }

    const promises = Array.from({ length: count }).map(async (_, i) => {
        let prompt = basePrompt;
        if (i > 0) {
            prompt += `\n\n[VARIATION ${i + 1}]: Make the design slightly different while keeping the theme.`;
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
            console.error("Story gen error:", e);
            return null;
        }
    });

    const results = (await Promise.all(promises)).filter(Boolean);
    return { success: true, images: results };
}

function variationDescription(i: number) {
    return i === 1 ? "Variation 1" : "Variation 2";
}
