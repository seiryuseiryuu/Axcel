"use server";

import { generateImage, generateMultimodal } from "@/lib/gemini";

// Helper to resolve image URL (handles OGP)
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

### 6. 構成要素の分解 (Visual Decomposition) - **重要**
- 画像を構成する要素を「テキスト」「形状/装飾」「イラスト/物体」「背景」に分類してリストアップしてください。
- 特に「丸い装飾」「金色の帯」「集中線」などの装飾要素を漏らさず記述すること。

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
  "visual_elements": [
    { "name": "要素名（例：金色の円）", "category": "decoration", "description": "詳細な見た目" },
    { "name": "要素名（例：メインタイトル）", "category": "text", "description": "書かれている内容" }
  ],
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

// 2. Generate Prompt for Editing (Updated to return structured data)
export async function generateNotePrompt(analysisData: any, title: string, category: string) {
    const prompt = `あなたは世界最高峰の画像生成プロンプトエンジニアです。
    ユーザーがアップロードした参考画像をベースに、新しいサムネイルを作成するための「要素置換計画」を作成してください。

    【参考画像の分析結果】
    ${JSON.stringify(analysisData, null, 2)}

    【ユーザーの要望】
    - タイトルやテキストは「${title}」のような雰囲気に変更したい（具体的テキストがない場合は空白でも可）
    - カテゴリ文脈: ${category}

    【タスク】
    参考画像を構成する**全ての要素**（テキスト、キャラクター、アイコン、背景、装飾、帯など）を漏れなくリストアップし、それぞれの「要素タイプ（文字か見た目か）」と「変更計画」を定義したJSONを作成してください。

    **【重要】要素タイプの分類 (type)**
    - "text": 文字情報。変更時は「文章」が変わる。（例：タイトル、キャッチコピー）
    - "visual": 見た目、物体、形状。変更時は「色・形・物体」が変わる。（例：アイコン、キャラクター、背景、装飾の帯、幾何学模様）
    - "style": 全体的な画風やトーン。（例：水彩風、3Dレンダリング）

    **【重要】デフォルトは「維持」**
    - ユーザーが具体的な変更を指示していない限り、全ての要素は「維持」としてください。
    - new_contentには「維持」とだけ書いてください。

    出力は**以下のJSON形式のみ**を行ってください。Markdownのコードブロックは不要です。

    {
      "base_style_prompt": "参考画像のスタイル、構図、配色、雰囲気を詳細に描写した英語のベースプロンプト...",
      "replacements": [
        {
          "id": 1,
          "element_name": "メインタイトル",
          "type": "text",
          "original_content": "元の画像にある文字（例：完全保存版）",
          "new_content": "維持"
        },
        {
          "id": 2,
          "element_name": "金色の丸い装飾",
          "type": "visual",
          "original_content": "右上の輝くエンブレム",
          "new_content": "維持"
        },
        {
          "id": 3,
          "element_name": "背景",
          "type": "visual",
          "original_content": "青いグラデーション",
          "new_content": "維持"
        }
      ],
      "design_notes": "特記事項があればここに入力"
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

// 2.5 Generate Arranged Content for a single element (Sparkle button)
export async function generateArrangedContent(
    elementName: string,
    originalContent: string,
    context?: string
): Promise<{ success: boolean; arrangedContent?: string; error?: string }> {
    const prompt = `あなたはサムネイルデザイナー兼コピーライターです。
以下の要素を「大胆にアレンジ」して、元の要素とは異なる新しい魅力を提案してください。

【要素名】${elementName}
【元の内容】${originalContent}
${context ? `【文脈】${context}` : ''}

【ルール】
- 元の「構成」は守りつつ、「表現」を大きく変える
- 視覚要素なら：全く別のモチーフや色味に変更する（例：女性→ロボット、青→赤、実写→3D）
- テキストなら：意味を変えずに、より強い（または全く違う）言い回しにする
- パクリに見えないよう、オリジナリティを優先する
- 短く簡潔に出力（説明文は不要）
- 「」や【】などの記号は使わない（普通の文章で出力）

【良い例（大胆な変更）】
- 入力「青い背景」→ 出力「燃えるような真紅の幾何学パターン」
- 入力「完全保存版」→ 出力「【極秘】裏マニュアル」
- 入力「スーツの男性」→ 出力「未来的なサイバーパンク風のアバター」

【悪い例（微修正）】
- 「少し明るい青の背景」
- 「スーツの男性（笑顔）」

出力（記号なしでシンプルに）:`;

    try {
        const { generateText } = await import("@/lib/gemini");
        const result = await generateText(prompt, 0.8, "gemini-2.0-flash");
        const cleanResult = result.trim().replace(/^["']|["']$/g, '');
        return { success: true, arrangedContent: cleanResult };
    } catch (e: any) {
        return { success: false, error: e.message || "アレンジ生成エラー" };
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
    // If custom prompt is provided, use it directly for the first variation, and create slight variations for others.

    // Platform optimization instructions
    let platformSpecs = "1280x670 (Aspect Ratio 1.91:1)";
    let platformContext = "Note article header image";
    let qualityBoosters = "High quality, Professional design, Clean layout, Trending on Pinterest";

    if (platform === 'brain') {
        platformSpecs = "1280x670 (Aspect Ratio 1.91:1)";
        platformContext = "Brain market info-product header"; // Updated context
        qualityBoosters = "Hyper-realistic 3D Render, Commercial Advertisement, High Impact, Bold Typography, 8k resolution, Octane Render, Financial/Business aesthetic, Depth of Field";
    } else if (platform === 'tips') {
        platformSpecs = "1200x630 (Aspect Ratio 1.91:1)";
        platformContext = "Tips.jp article header";
        qualityBoosters = "Vibrant colors, Eye-catching, Social Media Viral style, Glossy finish, High contrast, 3D text effects, Neon accents";
    } else {
        // Note defaults boost
        qualityBoosters += ", Professional Typography, Corporate Memphis or Modern SaaS style, High Clarity";
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
            imageRoleDescriptions.push(`[Image ${refIndex} - PREVIOUS VERSION STATE]: This is the current state of the thumbnail. Use it as the BASE for your edits.
1. PRESERVE everything in this image (background, characters, composition) that is NOT contradicted by the [HISTORY].
2. The user wants to KEEP past changes (like "Orange color", "Space background").
3. ONLY apply the NEW changes requested in the prompt.`);
            refIndex++;
        }
    }
    // 3. User Reference Image (Original Upload)
    else if (referenceImage) {
        const startLen = refImagesData.length;
        await addRefImage(referenceImage);
        if (refImagesData.length > startLen) {
            imageRoleDescriptions.push(`[Image ${refIndex} - Original Reference]: This is a LAYOUT GUIDE only. Strict Rules:\n1. Follow the COMPOSITION (where things are).\n2. Do NOT copy the character, art style, or specific details.\n3. Create a completely NEW design with the User's text/colors.`);
            refIndex++;
        }
    }

    let materialInstruction = '';
    if (imageRoleDescriptions.length > 0) {
        materialInstruction = `【REFERENCE IMAGE ROLES (CRITICAL)】\nYou have been provided with ${refImagesData.length} reference images. Follow these specific roles:\n\n${imageRoleDescriptions.join('\n')}\n\nIMPORTANT: If an image is marked as BACKGROUND, you must composite terms ON TOP of it.`;
    }

    let basePrompt = "";
    if (customPrompt) {
        // customPrompt comes from frontend constructed prompt (finalPrompt)
        basePrompt = customPrompt;

        // Append system context
        if (!basePrompt.includes("SYSTEM OPTIMIZATION")) {
            basePrompt += `
             
[SYSTEM OPTIMIZATION]
Target Platform: ${platformContext}
Specs: ${platformSpecs}
Quality Style: ${qualityBoosters}

${materialInstruction}

[CRITICAL INSTRUCTIONS FOR REFINEMENT]
1. HISTORY IS CUMULATIVE: You must respect ALL instructions in [HISTORY]. If Step 1 said "Space background" and Step 2 says "Add icon", the result MUST have BOTH "Space background" AND "New icon".
2. BASE IMAGE PRESERVATION: The [PREVIOUS VERSION STATE] image already contains past changes. Do NOT reset it to the original reference. Keep the "Space background" from the previous version.
3. UPGRADE PRIORITY: If the prompt contains "[ACTION: PROFESSIONAL UPGRADE]", you MUST PRIORITIZE improving quality and rewriting text.
4. TEXT REWRITING: You MUST write NEW, catchy Japanese copy. Examples of good copy: "今すぐ始める3ステップ", "稼げる人の共通点", "知らないと損する〇〇".
5. MATERIAL USAGE: If explicit materials are provided above (Image 1, etc.), their usage is MANDATORY.
6. QUALITY: Ensure the output looks like a premium "Commercial Advertisement".
7. VISUAL SUBSTITUTION: "COMPLETELY REPLACE" means DELETE the original object and DRAW NEW one.
8. ANTI-PLAGIARISM: Create ORIGINAL work. Use Reference for LAYOUT only.
`;
        }
    } else {
        // Fallback for direct calls (less common in flow)
        basePrompt = `Create a high-quality commercial header image for ${platform} (${platformContext}).
[TEXT CONTENT] Title: "${title}"
[VISUAL STYLE] Layout: ${analysisData.layout}, Colors: ${analysisData.colors}, Texture: ${analysisData.style}
[QUALITY STANDARDS] ${qualityBoosters}, ${platformSpecs}, Sharp focus, No blur, 3D Typography.

${materialInstruction}

[CRITICAL INSTRUCTIONS]
1. ADDITIONAL MATERIALS: If the [REPLACEMENT PLAN] below instructs to "Use Additional Material", use the provided Reference Image (Image 1, etc.).
2. TEXT REWRITING: If the plan says "PROFESSIONAL UPGRADE", you must ignore the original text and create NEW, high-impact Japanese copy.
3. ARRANGEMENT: If "UPGRADE" is requested, do not just keep the original. Improve it significantly (lighting, effects, detail).
4. VISUAL SUBSTITUTION: "COMPLETELY REPLACE" means DELETE the original object and DRAW NEW one. Ignore reference traits.
5. ANTI-PLAGIARISM: Create ORIGINAL work. Use Reference for LAYOUT only. Do not copy art style.
`;
    }

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
                description: i === 0 ? "Main Design" : variationDescription(i)
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
