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
                console.log(`[resolveImageUrl] Extracted OGP: ${targetImageUrl}`);

                // Fetch the actual image
                const imgRes = await fetch(targetImageUrl);
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

    const prompt = `あなたはトップクラスのWeb（Note/Brain/Tips）デザイナーです。
提供された画像を「完全に再現するための設計図」として分析してください。
画像生成AIが**この画像を忠実に再現できる**レベルの詳細な記述を行ってください。

## 分析項目（全て詳細に記述すること）

### 1. 構図とレイアウト (Composition)
- 全体の構図（中央寄せ、左右分割、上下分割など）
- 各要素の配置位置（被写体、テキスト、装飾）と相対的なサイズ
- 余白の取り方、視線誘導の流れ

### 2. 色彩設計 (Colors) - **HEXコードで正確に推定**
- 背景色
- メインテキスト色
- サブテキスト色
- アクセント色
- グラデーションがあればその詳細

### 3. タイポグラフィ (Typography) - **完全再現のため詳細に**
- フォントスタイル（ゴシック/明朝/手書き風など）
- フォントウェイト（極太/太/標準など）
- 文字装飾（袋文字、ドロップシャドウ、グロー効果、アウトライン）
- 文字サイズの比率（タイトル vs サブテキスト）
- 文字の配置と行間

### 4. 視覚効果とスタイル (Visual Style)
- 全体の雰囲気（モダン、レトロ、3D風、フラットなど）
- テクスチャ（光沢、マット、紙質など）
- 装飾要素（アイコン、図形、イラスト）
- ライティング（影の向き、ハイライト）

### 5. 画像内テキスト（そのまま記載）
- 表示されている全てのテキストをそのまま記載

## 出力形式（JSON）
\`\`\`json
{
  "layout": "詳細な構図の説明...",
  "colors": {
    "background": "#XXXXXX",
    "text_primary": "#XXXXXX",
    "text_secondary": "#XXXXXX",
    "accent": "#XXXXXX",
    "gradient": "なし or 詳細"
  },
  "typography": "フォント、ウェイト、装飾の詳細な説明...",
  "style": "全体のスタイルと雰囲気の説明...",
  "visual_elements": "装飾要素、イラスト、アイコンの詳細...",
  "text_content": "画像内の全テキストをそのまま記載..."
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

// 2. Generate Prompt for Editing
export async function generateNotePrompt(analysisData: any, title: string, category: string) {
    // Format colors for display
    const colorsStr = typeof analysisData.colors === 'object'
        ? JSON.stringify(analysisData.colors, null, 2)
        : analysisData.colors;

    const prompt = `あなたは世界最高峰の画像生成プロンプトエンジニアです。

**重要な目的**: ユーザーが参考画像の「どの要素を」「何に置き換えるか」を明確に指定できる**置換マップ形式**のプロンプトを作成してください。

参考画像の全要素を列挙し、それぞれに「元の内容」と「置換後」の欄を設けてください。
ユーザーは「置換後」欄を編集するだけで、参考画像のスタイルを完全に保ちながら内容を自分用にカスタマイズできます。

【参考画像の分析結果】
${JSON.stringify(analysisData, null, 2)}

【ユーザー情報】
- 新しいタイトル: ${title}
- カテゴリ: ${category}

【絶対禁止事項】
- タイポグラフィの詳細（フォント名、太さ、装飾、色など）を出力に含めないこと
- 配色の詳細（HEXコード、色名など）を出力に含めないこと
- 質感やエフェクトの詳細説明を含めないこと
→ これらは全て「参考画像と同一」で暗黙的に再現されるため、指定不要

【出力形式】
以下の構造で**日本語**のプロンプトを生成してください：

---
## 要素置換マップ

| # | 位置/領域 | 元の種類 | 元の内容 | → 置換後の種類 | → 置換後の内容 |
|---|----------|---------|---------|--------------|---------------|
| 1 | (位置) | テキスト | 「(元テキスト)」 | テキスト | 「${title}」 |
| 2 | (位置) | テキスト | 「(元テキスト)」 | テキスト | 「(記入)」 |
| 3 | (位置) | 画像 | (元の画像の内容説明) | 画像 | (そのまま or 新しい内容) |
| ... | ... | ... | ... | ... | ... |

---
## 生成指示

参考画像のスタイルを完全に再現すること。
上記マップで「置換後」が指定された要素のみ内容を変更する。
品質: Commercial Quality, High Detail, 4K, 1280x670

---
`;

    try {
        const { generateText } = await import("@/lib/gemini");
        const textResult = await generateText(prompt, 0.7);
        return { success: true, prompt: textResult };
    } catch (e: any) {
        return { success: false, error: e.message || "プロンプト生成エラー" };
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
    referenceImage?: string // URL or Base64
) {
    // If custom prompt is provided, use it directly for the first variation, and create slight variations for others.

    // Platform optimization instructions
    let platformSpecs = "1280x670 (Aspect Ratio 1.91:1)";
    let platformContext = "Note article header image";
    let qualityBoosters = "High quality, Professional design, Clean layout, Trending on Pinterest";

    if (platform === 'brain') {
        platformSpecs = "1280x670 (Aspect Ratio 1.91:1)";
        platformContext = "Brain market info-product header";
        qualityBoosters = "Hyper-realistic, Commercial Advertisement, High Impact, Bold Typography, 8k resolution, Financial/Business aesthetic";
    } else if (platform === 'tips') {
        platformSpecs = "1200x630 (Aspect Ratio 1.91:1)";
        platformContext = "Tips.jp article header";
        qualityBoosters = "Vibrant colors, Eye-catching, Social Media Viral style, Glossy finish, High contrast";
    }

    let basePrompt = "";

    if (customPrompt) {
        basePrompt = customPrompt;
        // Append platform context and quality boosters if not present
        if (!basePrompt.toLowerCase().includes(platform)) {
            basePrompt += `\n\n[SYSTEM OPTIMIZATION]\nTarget Platform: ${platformContext}\nSpecs: ${platformSpecs}\nQuality Style: ${qualityBoosters}`;
        }
    } else {
        basePrompt = `Create a high-quality commercial header image for ${platform} (${platformContext}).
[TEXT CONTENT] Title: "${title}"
[VISUAL STYLE] Layout: ${analysisData.layout}, Colors: ${analysisData.colors}, Texture: ${analysisData.style}
[QUALITY STANDARDS] ${qualityBoosters}, ${platformSpecs}, Sharp focus, No blur.`;
    }

    // Reference Image Handling
    let refImagesData: { mimeType: string; data: string }[] = [];
    if (referenceImage) {
        try {
            const resolved = await resolveImageUrl(referenceImage);
            if (resolved) {
                refImagesData.push({ mimeType: resolved.mimeType, data: resolved.buffer.toString("base64") });

                // Add VERY strong instruction to use the reference - this is critical
                basePrompt += `

[最重要：参考画像の完全踏襲]
この参考画像を**絶対的な設計図**として使用してください。
- 構図（レイアウト・配置バランス・余白）: 参考画像と**完全に同一**にすること
- 配色（背景色・文字色・アクセント色）: 参考画像の色を**そのまま使用**すること  
- フォントスタイル（太さ・装飾・影）: 参考画像と**同じデザイン処理**を適用すること
- 全体の雰囲気・質感: 参考画像から**一切逸脱しない**こと

参考画像と見た目が**ほぼ同じ**になるよう生成してください。オリジナリティは不要です。`;
            }
        } catch (e) {
            console.error("Failed to process reference image for generation:", e);
        }
    }

    const { generateImageWithReference, generateImage } = await import("@/lib/gemini");

    const promises = Array.from({ length: count }).map(async (_, i) => {
        let prompt = basePrompt;

        // Add variations if using auto-prompt, or just use custom prompt as is
        if (i > 0) {
            prompt += `\n\n[VARIATION ${i + 1}]: Make the design slightly different (different background or color accent) while keeping the text and main subject.`;
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
                description: i === 0 ? "Main Design" : variationDescription(i) // Use helper or string
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
