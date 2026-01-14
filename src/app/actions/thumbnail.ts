"use server";

import { gemini, generateText, generateImage } from "@/lib/gemini";
import { requireRole } from "@/lib/rbac";

// Types
export interface PatternCategory {
    name: string;
    description: string;
    matchCount?: number;
    characteristics: {
        subjectType: 'real_person' | 'illustration' | 'character' | 'none';
        textPosition: string;
        textScale?: string;
        sentiment?: 'positive' | 'negative' | 'neutral' | 'shocking' | 'emotional';
        textStyle?: string;
        colorScheme: string;
        colorMood?: string;
        personPosition: string;
        personExpression?: string;
        personAttributes?: {
            ageGroup: string;
            gender: string;
            hairStyle: string;
            clothing: string;
            distinctiveFeatures?: string;
        };
        layout: string;
        visualTechniques?: string;
        effects?: string;
    };
    designRules?: string[];
    requiredMaterials?: {
        background: string;
        person: string;
        props: string[];
    };
    exampleImageIndices?: number[];
}

export interface PatternAnalysisResult {
    patterns: PatternCategory[];
    summary: string;
    uniqueFindings?: string[];
    individualAnalysis?: any[];
}

export interface ModelImageInfo {
    imageUrl: string;
    patternName: string;
    description: string;
    suggestedTexts: { text: string; reason: string }[];
}

export interface ThumbnailState {
    step: number;
    videoTitle: string;
    videoDescription: string;
    selectedThumbnails: { id: string; url: string; title: string }[];
    patternAnalysis: PatternAnalysisResult | null;
    modelImages: ModelImageInfo[];
    selectedModelIndex: number | null;
    text: string;
    generatedImages: string[];
}

// ========================================
// 1. Analyze Patterns (2-Stage Analysis)
// ========================================
export async function analyzePatterns(
    thumbnailUrls: string[],
    thumbnailTitles: string[]
): Promise<{ data?: PatternAnalysisResult; logs?: string[]; error?: string }> {
    await requireRole("student");
    const logs: string[] = [];
    logs.push(`[System] Starting analysis for ${thumbnailUrls.length} thumbnails.`);

    if (thumbnailUrls.length < 3) {
        return { error: "最低3枚のサムネイルが必要です。", logs };
    }

    try {
        // Fetch images for multimodal analysis
        logs.push(`[System] Fetching images for multimodal analysis...`);
        const imagePromises = thumbnailUrls.slice(0, 5).map(async (url) => {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

                const res = await fetch(url, { signal: controller.signal });
                clearTimeout(timeoutId);

                if (!res.ok) {
                    logs.push(`[System] Failed to fetch ${url.slice(0, 30)}...: ${res.status}`);
                    return null;
                }
                const buffer = await res.arrayBuffer();
                const base64 = Buffer.from(buffer).toString('base64');
                const mimeType = res.headers.get('content-type') || 'image/jpeg';
                return { mimeType, data: base64 };
            } catch (e) {
                console.error("Image fetch failed:", url);
                logs.push(`[System] Image fetch error for ${url.slice(0, 30)}...`);
                return null;
            }
        });

        const images = (await Promise.all(imagePromises)).filter(Boolean) as { mimeType: string; data: string }[];

        // Stage 1: Individual Analysis (Visual + Text)
        // If images available, use Multimodal (Nanobanana Pro aka Gemini 1.5 Pro)
        const useMultimodal = images.length > 0;

        const stage1Prompt = useMultimodal
            ? `【第1段階：個別画像の視覚的分析 (Gemini 1.5 Pro Vision)】

${images.length}枚のYouTubeサムネイル画像を視覚的に詳細分析し、以下のJSON形式で出力してください。

【分析の重点: テロップの「フォント再現性」と「テンション感」】
1. テロップのデザイン（フォントの種類、太さ、縁取り、装飾）を、デザイナーが再現できるレベルで詳細に記述してください。
2. そのテロップの内容がどういう意図か（質問、煽り、事実提示など）を分析してください。
3. 画像全体から伝わる「テンション感」（例：ハイテンション、シリアス、ほのぼの）を言語化してください。

以下のJSON形式で回答:
{
  "individualAnalysis": [
    {
      "imageIndex": 1,
      "title": "動画タイトル",
      "text": {
        "content": "テロップ内容",
        "position": "配置（例：画面上部80%を占有）",
        "scale": "文字サイズ（例：巨大、中、小）",
        "style": "デザイン概要（例：金色の極太ゴシックに赤の境界線）",
        "typography": {
           "fontFamily": "フォント種別（例：極太ゴシック、明朝体、筆文字）",
           "weight": "太さ（例：ExtraBold, Heavy）",
           "effects": "装飾（例：二重縁取り、ドロップシャドウ、光彩、立体処理）",
           "colors": "文字色と縁取り色の組み合わせ（例：文字は白、内枠は赤、外枠は黒）"
        },
        "meaning": "内容の意図"
      },
      "person": {
        "hasPerson": true,
        "position": "配置",
        "expression": "表情",
        "relationToText": "テロップとの関係"
      },
      "vibe": {
        "mood": "テンション感",
        "sentiment": "感情の方向性（positive/negative/neutral/shock）",
        "colorScheme": "配色"
      }
    }
  ]
}`
            : `【第1段階：個別画像の精緻分析 (テキストベース)】

${thumbnailUrls.length}枚のYouTubeサムネイルを分析してください。

【動画タイトル参考】
${thumbnailTitles.map((t, i) => `画像${i + 1}: ${t}`).join('\n')}

【分析項目 - 各画像について以下を抽出】

1. テロップ/テキスト分析（詳細）
   - フォントスタイル（ゴシック/明朝/手書き、太さ）
   - 装飾（縁取り、影、立体感）
   - 配色（文字色、枠色）
   - 配置位置

2. 配色・感情分析
   - 主要色（最大3色）
   - 配色の意図

3. 構図・レイアウト
   - 分割パターン
   - 視線誘導

4. 人物・オブジェクト
   - 人物の有無と表情
   - ポーズ・配置位置

以下のJSON形式で回答:
{
  "individualAnalysis": [
    {
      "imageIndex": 1,
      "title": "動画タイトル",
      "text": {
        "hasText": true,
        "content": "テロップ内容",
        "position": "中央上部",
        "style": "極太ゴシック・赤縁取り",
        "typography": {
            "fontFamily": "ゴシック",
            "effects": "赤縁取り"
        }
      },
      "color": {
        "primary": "#FF0000",
        "mood": "危機感"
      },
      "composition": {
        "pattern": "中央集中型"
      },
      "person": {
        "hasPerson": true,
        "expression": "驚き"
      }
    }
  ]
}`;

        logs.push(`[Stage 1] Prompt Generated:\n${stage1Prompt.slice(0, 200)}...`);

        let stage1Response;
        if (useMultimodal) {
            // Import generateMultimodal dynamically or assume it's available via updated import
            const { generateMultimodal } = await import("@/lib/gemini");
            stage1Response = await generateMultimodal(stage1Prompt, images);
            logs.push(`[Stage 1] Multimodal Analysis Completed.`);
        } else {
            stage1Response = await generateText(stage1Prompt, 0.5);
            logs.push(`[Stage 1] Text Analysis Completed.`);
        }

        let individualAnalysis: any[] = [];

        try {
            const cleanJson = stage1Response.replace(/```json/g, "").replace(/```/g, "").trim();
            const match = cleanJson.match(/\{[\s\S]*\}/);
            if (match) {
                const parsed = JSON.parse(match[0]);
                individualAnalysis = parsed.individualAnalysis || [];
                logs.push(`[Stage 1] Extracted ${individualAnalysis.length} analysis items.`);
            }
        } catch (e) {
            console.warn("Stage 1 parsing failed, proceeding with empty analysis.");
            logs.push(`[Stage 1 Error] JSON Parsing failed: ${e}`);
        }

        // Stage 2: Pattern Extraction
        const stage2Prompt = `【第2段階：高度なパターン抽出と構造化分類】

以下は${thumbnailUrls.length}枚のサムネイル画像の個別分析結果です。
これらを分析し、**「共通点（構図・感情・文字配置）」を持つ画像をグループ化**し、最も有力な「2〜3個のパターン」を抽出してください。

【個別分析データ】
${JSON.stringify(individualAnalysis, null, 2)}

【必須要件（分類ロジック）】
1. **グルーピング基準**: 以下の要素が似ているものを同じパターンとして扱ってください。
   - 「テロップの位置と大きさ」
   - 「ポジティブ/ネガティブの感情（Sentiment）」
   - 「人物の有無と配置」
2. **パターン抽出数**: 2〜3個に厳選。
3. **Typography (超重要)**: フォント指示は詳細に記述。

【出力形式】
{
  "patterns": [
    {
      "name": "パターン名（例：危機感訴求型、ハッピー報告型）",
      "description": "30文字以内の特徴説明",
      "matchCount": 3,
      "exampleImageIndices": [1, 3, 5],
      "characteristics": {
        "subjectType": "被写体の種類（real_person / illustration / character / none）",
        "textPosition": "具体的な位置",
        "textScale": "文字サイズ（巨大/中/小）",
        "sentiment": "感情（positive/negative/neutral/shock）",
        "textStyle": "詳細な文字デザイン指示",
        "colorScheme": "配色とムード",
        "colorMood": "詳細なテンション感",
        "personPosition": "人物配置",
        "personExpression": "表情",
        "personAttributes": {
          "ageGroup": "年代（例：20代前半、30代半ば、50代以上）",
          "gender": "性別（例：男性、女性）",
          "hairStyle": "髪型・色（例：黒髪短髪、茶髪ロング）",
          "clothing": "服装（例：黒のパーカー、スーツ、白Tシャツ）",
          "distinctiveFeatures": "特徴（例：眼鏡、ひげ、帽子）"
        },
        "layout": "構図",
        "visualTechniques": "視線誘導、エフェクト"
      },
      "requiredMaterials": {
        "background": "背景詳細",
        "person": "人物詳細（上記の属性を含む）",
        "props": ["小物"]
      },
      "designRules": [
        "ルール1: 人物の視線は必ずテロップに向ける",
        "ルール2: 背景は暗くし文字を蛍光色で目立たせる"
      ]
    }
  ],
  "summary": "全体の傾向まとめ"
}`;

        logs.push(`[Stage 2] Starting Pattern Extraction.`);
        const stage2Response = await generateText(stage2Prompt, 0.5);
        logs.push(`[Stage 2] Response received.`);

        try {
            const cleanJson = stage2Response.replace(/```json/g, "").replace(/```/g, "").trim();
            const match = cleanJson.match(/\{[\s\S]*\}/);
            if (match) {
                const parsed = JSON.parse(match[0]);
                const patterns = Array.isArray(parsed.patterns) ? parsed.patterns : [];
                const summary = parsed.summary || "分析完了";

                return {
                    data: {
                        patterns,
                        summary,
                        individualAnalysis,
                    },
                    logs,
                };
            }
        } catch (e) {
            console.error("Stage 2 parsing failed:", e);
        }

        return { error: "パターン分析に失敗しました。", logs };
    } catch (e: any) {
        console.error("Analysis error:", e);
        return { error: e.message || "分析エラー", logs };
    }
}

// ========================================
// 2. Generate Model Images for Each Pattern
// ========================================
export async function generateModelImages(
    patterns: PatternCategory[],
    videoTitle: string,
    videoDescription?: string,
    thumbnailUrls?: string[],
    text?: string
): Promise<{ data?: ModelImageInfo[]; logs?: string[]; error?: string }> {
    await requireRole("student");
    const logs: string[] = [];

    if (!patterns || patterns.length === 0) {
        return { error: "パターンがありません。", logs };
    }

    // Ensure we have at least 3 patterns to generate 3 images
    let workingPatterns = [...patterns];
    if (workingPatterns.length < 3) {
        let i = 0;
        while (workingPatterns.length < 3) {
            // Cycle through existing patterns to fill up to 3
            workingPatterns.push({ ...patterns[i % patterns.length], name: `${patterns[i % patterns.length].name} (Var ${Math.floor(workingPatterns.length / patterns.length) + 1})` });
            i++;
        }
    }
    // Limit to 3 if more
    workingPatterns = workingPatterns.slice(0, 3);

    try {
        const promises = workingPatterns.map(async (pattern, idx) => {
            logs.push(`[Model Gen] Starting '${pattern.name}'...`);

            // Fetch reference images for this pattern based on exampleImageIndices
            const exampleIndices = pattern.exampleImageIndices || [];
            let referenceImages: { mimeType: string; data: string }[] = [];

            if (thumbnailUrls && exampleIndices.length > 0) {
                const refUrls = exampleIndices
                    .map(idx => thumbnailUrls[idx - 1])
                    .filter(Boolean)
                    .slice(0, 2);

                logs.push(`[Model Gen] Fetching ${refUrls.length} reference images for '${pattern.name}'...`);

                const fetchPromises = refUrls.map(async (url) => {
                    try {
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 5000);
                        const res = await fetch(url, { signal: controller.signal });
                        clearTimeout(timeoutId);
                        if (!res.ok) return null;
                        const buffer = await res.arrayBuffer();
                        const base64 = Buffer.from(buffer).toString('base64');
                        const mimeType = res.headers.get('content-type') || 'image/jpeg';
                        return { mimeType, data: base64 };
                    } catch { return null; }
                });
                referenceImages = (await Promise.all(fetchPromises)).filter(Boolean) as any[];
            }

            // MODEL IMAGE: Include text with font reproduction
            const promptForImage = `Create a YouTube thumbnail image with text.

[TEXT - EXACT REPRODUCTION]
- Text to render: "${text || videoTitle}"
- Reproduce the EXACT font style from reference images
- If reference uses Gothic (ゴシック): heavy sans-serif, blocky
- If reference uses Mincho (明朝): sharp serif with contrast  
- If reference uses Brush (筆文字): dynamic calligraphy
- Copy text effects: outlines, shadows, gradients exactly from reference
- Text position: ${pattern.characteristics.textPosition}
- Font style: ${pattern.characteristics.textStyle}

[EXACT VISUAL REPRODUCTION FROM REFERENCE]
- Copy the EXACT visual style, colors, and composition from reference images
- Match the lighting, shadows, and color grading precisely

${pattern.characteristics.subjectType === 'real_person' ? `[PERSON - EXACT REPRODUCTION]
- COPY the person from reference: same pose, same angle, same expression
- Position: ${pattern.characteristics.personPosition}
- Expression: ${pattern.characteristics.personExpression || 'engaging'}
- Clothing: ${pattern.characteristics.personAttributes?.clothing || 'match reference'}
- Hair: ${pattern.characteristics.personAttributes?.hairStyle || 'match reference'}
- Age: ${pattern.characteristics.personAttributes?.ageGroup || 'match reference'}
- IMPORTANT: Reproduce the EXACT person appearance from reference` :
                    pattern.characteristics.subjectType === 'illustration' || pattern.characteristics.subjectType === 'character' ? `[CHARACTER/ILLUSTRATION - EXACT REPRODUCTION]
- COPY the character/illustration EXACTLY from reference
- Same art style (anime, flat, 3D, etc.)
- Same pose, expression, colors
- Same line weight and shading style
- Position: ${pattern.characteristics.personPosition}` :
                        `[GRAPHICS/ICONS - EXACT REPRODUCTION]
- Reproduce all icons, stamps, badges from reference
- Same colors, shapes, positions
- Main element: ${pattern.characteristics.layout}`}

[LAYOUT]
- Aspect ratio: 16:9 (1280x720)
- Layout: ${pattern.characteristics.layout}
- Color scheme: ${pattern.characteristics.colorScheme}
${pattern.requiredMaterials ? `- Background: ${pattern.requiredMaterials.background}` : ''}
${pattern.requiredMaterials?.props?.length ? `- Props/Icons: ${pattern.requiredMaterials.props.join(', ')}` : ''}

[QUALITY]
- 8K Ultra HD professional quality
- Photorealistic for photos, clean vectors for illustrations
- Vibrant, high-contrast colors

[NEGATIVE - DO NOT]
- NO garbled/broken Japanese text
- NO distorted faces or hands
- NO blurry elements
- NO changing the person/character from reference
- NO adding text other than "${text || videoTitle}"`;


            logs.push(`[Model Gen] '${pattern.name}' - ${referenceImages.length} refs loaded`);

            // Generate image using Gemini with reference if available
            let imageUrl: string;
            try {
                if (referenceImages.length > 0) {
                    const { generateImageWithReference } = await import("@/lib/gemini");
                    try {
                        imageUrl = await generateImageWithReference(promptForImage, referenceImages);
                        logs.push(`[Model Gen] '${pattern.name}' - Image generated with reference.`);
                    } catch (refError) {
                        console.warn(`[Model Gen] Failed with reference for '${pattern.name}', falling back to text-only generation.`, refError);
                        logs.push(`[Model Gen] '${pattern.name}' - Reference generation failed, falling back.`);
                        imageUrl = await generateThumbnailImage(promptForImage);
                    }
                } else {
                    imageUrl = await generateThumbnailImage(promptForImage);
                    logs.push(`[Model Gen] '${pattern.name}' - Image generated without reference.`);
                }
            } catch (e) {
                console.error(`Failed to generate image for pattern ${pattern.name}:`, e);
                logs.push(`[Model Gen Error] Failed to generate image for '${pattern.name}': ${e}`);
                return null;
            }

            // Generate text suggestions for this pattern
            const textSuggestionPrompt = `動画タイトル「${videoTitle}」のサムネイル（${pattern.name}パターン）用の文言を3つ提案。

JSON形式で回答:
{
  "suggestedTexts": [
    {"text": "文言例（2〜20文字）", "reason": "選定理由"}
  ]
}`;

            let suggestedTexts: { text: string; reason: string }[] = [];
            try {
                const textResponse = await generateText(textSuggestionPrompt, 0.7);
                const match = textResponse.match(/\{[\s\S]*\}/);
                if (match) {
                    const parsed = JSON.parse(match[0]);
                    suggestedTexts = parsed.suggestedTexts || [];
                }
                logs.push(`[Model Gen] '${pattern.name}' - Text suggestions generated.`);
            } catch (e) {
                suggestedTexts = [
                    { text: "衝撃", reason: "インパクト重視" },
                    { text: "必見", reason: "注目を集める" },
                ];
                logs.push(`[Model Gen Error] '${pattern.name}' - Text suggestion generation failed: ${e}`);
            }

            return {
                imageUrl,
                patternName: pattern.name,
                description: pattern.description,
                suggestedTexts,
            };
        });

        const results = (await Promise.all(promises)).filter(Boolean) as ModelImageInfo[];

        logs.push(`[Complete] Generated ${results.length} model images.`);
        return { data: results, logs };
    } catch (e: any) {
        console.error("Model generation error:", e);
        logs.push(`[Model Gen Error] Overall model generation error: ${e.message || "Unknown error"}`);
        return { error: e.message || "モデル画像生成エラー", logs };
    }
}

// ========================================
// 2.5 Generate SINGLE Model Image (for streaming API)
// ========================================
export async function generateSingleModelImage(
    pattern: PatternCategory,
    videoTitle: string,
    videoDescription: string = "",
    thumbnailUrls: string[] = [],
    customText: string = ""
): Promise<{ data?: ModelImageInfo; error?: string }> {
    await requireRole("student");

    try {
        const exampleIndices = pattern.exampleImageIndices || [];
        let referenceImages: { mimeType: string; data: string }[] = [];

        if (thumbnailUrls && exampleIndices.length > 0) {
            const refUrls = exampleIndices
                .map(idx => thumbnailUrls[idx - 1])
                .filter(Boolean)
                .slice(0, 2);

            const fetchPromises = refUrls.map(async (url) => {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 5000);
                    const res = await fetch(url, { signal: controller.signal });
                    clearTimeout(timeoutId);
                    if (!res.ok) return null;
                    const buffer = await res.arrayBuffer();
                    const base64 = Buffer.from(buffer).toString('base64');
                    const mimeType = res.headers.get('content-type') || 'image/jpeg';
                    return { mimeType, data: base64 };
                } catch { return null; }
            });
            referenceImages = (await Promise.all(fetchPromises)).filter(Boolean) as any[];
        }

        const textToRender = customText || videoTitle;
        const promptForImage = `Create a YouTube thumbnail image with text.

[TEXT - EXACT REPRODUCTION]
- Text to render: "${textToRender}"
- Reproduce the EXACT font style from reference images
- If reference uses Gothic (ゴシック): heavy sans-serif, blocky
- If reference uses Mincho (明朝): sharp serif with contrast
- If reference uses Brush (筆文字): dynamic calligraphy
- Copy text effects: outlines, shadows, gradients exactly from reference
- Text position: ${pattern.characteristics.textPosition}
- Font style: ${pattern.characteristics.textStyle}

[EXACT VISUAL REPRODUCTION FROM REFERENCE]
- Copy the EXACT visual style, colors, and composition from reference images

${pattern.characteristics.subjectType === 'real_person' ? `[PERSON - EXACT REPRODUCTION]
- COPY the person from reference: same pose, same angle, same expression
- Position: ${pattern.characteristics.personPosition}
- IMPORTANT: Reproduce the EXACT person appearance from reference` :
                pattern.characteristics.subjectType === 'illustration' || pattern.characteristics.subjectType === 'character' ? `[CHARACTER/ILLUSTRATION - EXACT REPRODUCTION]
- COPY the character/illustration EXACTLY from reference
- Same art style, pose, expression, colors` :
                    `[GRAPHICS/ICONS - EXACT REPRODUCTION]
- Reproduce all icons, stamps, badges from reference`}

[LAYOUT]
- Aspect ratio: 16:9 (1280x720)
- Layout: ${pattern.characteristics.layout}
- Color scheme: ${pattern.characteristics.colorScheme}

[QUALITY]
- 8K Ultra HD professional quality
- Vibrant, high-contrast colors

[NEGATIVE - DO NOT]
- NO garbled/broken Japanese text
- NO distorted faces or hands
- NO blurry elements`;

        let imageUrl: string;
        try {
            if (referenceImages.length > 0) {
                const { generateImageWithReference } = await import("@/lib/gemini");
                imageUrl = await generateImageWithReference(promptForImage, referenceImages);
            } else {
                imageUrl = await generateThumbnailImage(promptForImage);
            }
        } catch (e) {
            console.error(`Failed to generate image for pattern ${pattern.name}:`, e);
            return {
                data: {
                    imageUrl: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4MCIgaGVpZ2h0PSI3MjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iIzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjQ4IiBmaWxsPSIjZmZmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7nlJ/miJDjgqjjg6njg7w8L3RleHQ+PC9zdmc+",
                    patternName: pattern.name,
                    description: `${pattern.description} (生成失敗)`,
                    suggestedTexts: [{ text: "衝撃", reason: "インパクト" }]
                }
            };
        }

        return {
            data: {
                imageUrl,
                patternName: pattern.name,
                description: pattern.description,
                suggestedTexts: [{ text: videoTitle.slice(0, 6), reason: "タイトルから抽出" }]
            }
        };
    } catch (e: any) {
        console.error("Single model generation error:", e);
        return { error: e.message || "モデル画像生成エラー" };
    }
}

// ========================================
// 3. Generate Thumbnail Image
// ========================================
export async function generateThumbnailImage(prompt: string): Promise<string> {
    try {
        // Use the new generateImage function which returns base64 data URL
        const imageDataUrl = await generateImage(prompt);
        return imageDataUrl;
    } catch (e: any) {
        console.error("Image generation error:", e);
        // Return a gradient placeholder on error (base64 encoded simple gradient)
        return "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4MCIgaGVpZ2h0PSI3MjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJnIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdHlsZT0ic3RvcC1jb2xvcjojNjM2NmYxIi8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojYTg1NWY3Ii8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNnKSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSI0OCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5BSeWbvuWDj+eUn+aIkOWkseaVlzwvdGV4dD48L3N2Zz4=";
    }
}

// ========================================
// 4. Generate Final Thumbnails (Multiple)
// ========================================
// ========================================
// 3.5 Generate Prompt for Final Thumbnail
// ========================================
export async function generateThumbnailPrompt(
    text: string,
    textStyle: string = "bold white with black outline",
    colorScheme: string = "high contrast",
    subjectType: string = "real_person"
): Promise<{ data?: string; error?: string }> {
    try {
        await requireRole("student");

        if (!text) return { error: "サムネイル文言がありません。" };

        const prompt = `[TASK]: Add text overlay to the model image template.

[MANDATORY TEXT - EXACT CHARACTERS]
Render EXACTLY this text: "${text}"
- Write ONLY these characters: "${text}"
- DO NOT modify, paraphrase, or add to this text
- DO NOT write any other text, labels, or watermarks
- Use standard Japanese characters (no garbled/broken text)

[TYPOGRAPHY - MATCH REFERENCE STYLE]
- Font style: ${textStyle}
- If "Gothic/ゴシック": heavy sans-serif, blocky
- If "Mincho/明朝": sharp serif with contrast
- If "Brush/筆文字": dynamic calligraphy
- Apply effects from reference: outlines, shadows, gradients
- Text must look professionally designed

[PRESERVE FROM MODEL IMAGE]
- Keep the EXACT same person/character (pose, expression, clothing)
- Keep the EXACT same background and composition
- Keep the EXACT same color scheme: ${colorScheme}
- Keep all icons, stamps, badges in their original positions
${subjectType === 'real_person' ? `- PERSON must match model exactly` : subjectType === 'illustration' || subjectType === 'character' ? `- CHARACTER/ILLUSTRATION must match model exactly` : `- GRAPHICS must match model exactly`}

[SPECIFICATIONS]
- Resolution: 1280x720 (16:9)
- 8K professional quality
- High contrast, vibrant colors

[NEGATIVE - ABSOLUTELY DO NOT]
- DO NOT write text other than "${text}"
- DO NOT change the person/character appearance
- DO NOT add new people or elements
- DO NOT create garbled/broken Japanese text
- DO NOT blur or distort any element

CRITICAL: The ONLY text must be "${text}". Everything else stays identical to model.`;

        return { data: prompt };
    } catch (e: any) {
        console.error("Generate Prompt Error:", e);
        return { error: e.message || "プロンプト生成中にエラーが発生しました" };
    }
}

// ========================================
// 4. Generate Final Thumbnails (Multiple)
// ========================================
export async function generateFinalThumbnails(
    modelImage: ModelImageInfo | null,
    text: string,
    videoTitle: string,
    count: number = 3,
    patternData?: PatternCategory,
    referenceUrls?: string[],
    customPrompt?: string // Add custom prompt support
): Promise<{ data?: string[]; error?: string }> {
    await requireRole("student");

    if (!text) {
        return { error: "サムネイル文言（テロップ）を入力してください。" };
    }

    try {
        // Fetch reference images if provided
        let referenceImages: { mimeType: string; data: string }[] = [];
        if (referenceUrls && referenceUrls.length > 0) {
            const fetchPromises = referenceUrls.slice(0, 2).map(async (url) => {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 5000);
                    const res = await fetch(url, { signal: controller.signal });
                    clearTimeout(timeoutId);
                    if (!res.ok) return null;
                    const buffer = await res.arrayBuffer();
                    const base64 = Buffer.from(buffer).toString('base64');
                    const mimeType = res.headers.get('content-type') || 'image/jpeg';
                    return { mimeType, data: base64 };
                } catch { return null; }
            });
            referenceImages = (await Promise.all(fetchPromises)).filter(Boolean) as any[];
        }

        // Generate images in parallel
        const promises = Array.from({ length: count }).map(async (_, i) => {
            // Use custom prompt if provided, otherwise generate default variation prompt
            let variationPrompt = customPrompt || "";

            if (!variationPrompt) {
                // Fallback to default generation logic if no custom prompt
                const textStyle = patternData?.characteristics?.textStyle || "bold white with black outline";
                const colorScheme = patternData?.characteristics?.colorScheme || "high contrast";
                variationPrompt = `[TASK]: Add text overlay to the model image template.

[MANDATORY TEXT - EXACT CHARACTERS]
Render EXACTLY this text: "${text}"
- Write ONLY these characters: "${text}"
- DO NOT modify, paraphrase, or add to this text
- DO NOT write any other text, labels, or watermarks
- Use standard Japanese characters (no garbled/broken text)

[TYPOGRAPHY - MATCH REFERENCE STYLE]
- Font style: ${textStyle}
- If "Gothic/ゴシック": heavy sans-serif, blocky
- If "Mincho/明朝": sharp serif with contrast
- If "Brush/筆文字": dynamic calligraphy
- Apply effects from reference: outlines, shadows, gradients
- Text must look professionally designed

[PRESERVE FROM MODEL IMAGE]
- Keep the EXACT same person/character (pose, expression, clothing)
- Keep the EXACT same background and composition
- Keep the EXACT same color scheme: ${colorScheme}
- Keep all icons, stamps, badges in their original positions
${patternData?.characteristics?.subjectType === 'real_person' ? `- PERSON must match model exactly` : patternData?.characteristics?.subjectType === 'illustration' || patternData?.characteristics?.subjectType === 'character' ? `- CHARACTER/ILLUSTRATION must match model exactly` : `- GRAPHICS must match model exactly`}

[SPECIFICATIONS]
- Resolution: 1280x720 (16:9)
- 8K professional quality
- Masterpiece, Best Quality, Award-winning photography
- Sharp focus, Highly detailed, Cinematic lighting
- Vibrant, clean, high-contrast colors
- Perfect composition, professional color grading

[NEGATIVE - ABSOLUTELY DO NOT]
- DO NOT write text other than "${text}"
- DO NOT change the person/character appearance
- DO NOT add new people or elements
- DO NOT create garbled/broken Japanese text
- DO NOT distort faces/hands/eyes
- DO NOT blur or distort any element
- NO pixelation, jpeg artifacts, or low resolution
- NO amateur, sketch, or unfinished look

[VARIATION ${i + 1}]
${i === 0 ? 'Standard composition' : i === 1 ? 'Slightly more vibrant' : 'Alternative emphasis'}

CRITICAL: The ONLY text must be "${text}". Everything else stays identical to model.`;
            }

            try {
                if (referenceImages.length > 0) {
                    const { generateImageWithReference } = await import("@/lib/gemini");
                    try {
                        // Attempt generation with reference
                        return await generateImageWithReference(variationPrompt, referenceImages);
                    } catch (refError) {
                        // Fallback to text-only if reference fails (e.g. image too large, network error)
                        console.warn(`[Final Gen] Variation ${i} failed with reference, retrying without ref.`, refError);
                        return await generateThumbnailImage(variationPrompt);
                    }
                } else {
                    return await generateThumbnailImage(variationPrompt);
                }
            } catch (e: any) {
                console.error(`Generation failed for variation ${i}:`, e);
                // Return placeholder or null on failure, but filter later
                return null;
            }
        });

        const results = await Promise.all(promises);
        const images = results.filter(Boolean) as string[];

        if (images.length === 0) {
            throw new Error("すべての画像生成に失敗しました。時間をおいて再度お試しください。");
        }

        return { data: images };
    } catch (e: any) {
        console.error("Final generation error:", e);
        return { error: e.message || "最終生成エラー" };
    }
}

