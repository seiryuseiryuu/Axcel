"use server";

import { gemini, generateText, generateImage } from "@/lib/gemini";
import { requireRole } from "@/lib/rbac";

// Types
export interface PatternCategory {
    name: string;
    description: string;
    matchCount?: number;
    characteristics: {
        textPosition: string;
        textStyle?: string;
        colorScheme: string;
        colorMood?: string;
        personPosition: string;
        personExpression?: string;
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

【分析の重点: テロップ、人物、そして「テンション感」】
1. テロップと人物の位置関係を正確に記述してください（例: テロップが右上、人物が左下から見上げている）。
2. そのテロップの内容がどういう意図か（質問、煽り、事実提示など）を分析してください。
3. 画像全体から伝わる「テンション感」（例: ハイテンション、シリアス、ほのぼの）を言語化してください。

以下のJSON形式で回答:
{
  "individualAnalysis": [
    {
      "imageIndex": 1,
      "title": "動画タイトル",
      "text": {
        "content": "テロップ内容",
        "position": "配置（例: 画面上部80%を占有）",
        "style": "デザイン（例: 金色の極太ゴシックに赤の境界線）",
        "meaning": "内容の意図（例: 視聴者の不安を煽る問いかけ）"
      },
      "person": {
        "hasPerson": true,
        "position": "配置（例: 左下）",
        "expression": "表情（例: 口を大きく開けた驚きの表情）",
        "relationToText": "テロップとの関係（例: テロップを指差して注目させている）"
      },
      "vibe": {
        "mood": "テンション感（例: 緊迫感のあるハイテンション）",
        "colorScheme": "配色（例: 黒背景に赤と黄色）"
      }
    }
  ]
}`
            : `【第1段階：個別画像の精緻分析 (テキストベース)】

${thumbnailUrls.length}枚のYouTubeサムネイルを分析してください。

【動画タイトル参考】
${thumbnailTitles.map((t, i) => `画像${i + 1}: ${t}`).join('\n')}

【分析項目 - 各画像について以下を抽出】

1. テロップ/テキスト分析
   - 文字数・フォントスタイル（太字/細字）
   - 配置位置（上部/中央/下部）
   - 文字色・縁取りの有無

2. 配色・感情分析
   - 主要色（最大3色）
   - 配色の意図（例：赤黒=危機感）
   
3. 構図・レイアウト
   - 分割パターン（単一/2分割/3分割）
   - 視線誘導の仕掛け

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
        "color": "#FFFFFF"
      },
      "color": {
        "primary": "#FF0000",
        "secondary": "#000000",
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
        const stage2Prompt = `【第2段階：パターン抽出と絞り込み】

以下は${thumbnailUrls.length}枚のサムネイル画像の個別分析結果です。
これらを分析し、**効果的なパターンを「2〜3個」に厳選**して分類してください。

【個別分析データ】
${JSON.stringify(individualAnalysis, null, 2)}

【必須要件】
1. **2つ、または3つのパターンのみ**を出力してください。
2. 各パターンについて「テロップの配置」「テンション感」「人物とテロップの関係性」を詳細に定義してください。
3. **必要素材（requiredMaterials）**: そのパターンを再現するために必要な素材を具体的に記述してください。
4. **該当画像番号（exampleImageIndices）**: どの画像がこのパターンに該当するかを配列で記述してください。

【出力形式】
{
  "patterns": [
    {
      "name": "パターン名（例：危機感訴求型）",
      "description": "30文字以内の特徴説明",
      "matchCount": 3,
      "exampleImageIndices": [1, 3, 5],
      "characteristics": {
        "textPosition": "具体的な位置とサイズ感",
        "textStyle": "フォント・色・装飾の詳細",
        "colorScheme": "配色とムード",
        "colorMood": "詳細なテンション感（例：緊迫したハイテンション）",
        "personPosition": "人物配置とテロップとの距離感",
        "personExpression": "表情・視線・ジェスチャー",
        "layout": "構図（例：対角線構図）",
        "visualTechniques": "視線誘導、エフェクトの具体例"
      },
      "requiredMaterials": {
        "background": "必要な背景（例：暗いグラデーション、都市風景ぼかし）",
        "person": "必要な人物素材（例：驚いた表情の上半身、カメラ目線）",
        "props": ["追加オブジェクト1", "追加オブジェクト2"]
      },
      "designRules": [
        "ルール1: 人物の視線は必ずテロップに向ける",
        "ルール2: 背景は暗くし文字を蛍光色で目立たせる"
      ]
    }
  ],
  "summary": "全体の傾向まとめ（50文字以内）"
}`;

        logs.push(`[Stage 2] Starting Pattern Extraction.`);
        const stage2Response = await generateText(stage2Prompt, 0.5);
        logs.push(`[Stage 2] Response received.`);

        try {
            const cleanJson = stage2Response.replace(/```json/g, "").replace(/```/g, "").trim();
            const match = cleanJson.match(/\{[\s\S]*\}/);
            if (match) {
                const parsed = JSON.parse(match[0]);
                return {
                    data: {
                        ...parsed,
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
    thumbnailUrls?: string[]
): Promise<{ data?: ModelImageInfo[]; logs?: string[]; error?: string }> {
    await requireRole("student");
    const logs: string[] = [];

    if (!patterns || patterns.length === 0) {
        return { error: "パターンがありません。", logs };
    }

    try {
        const results: ModelImageInfo[] = [];

        for (const pattern of patterns) {
            logs.push(`[Model Gen] Starting '${pattern.name}' pattern...`);

            // Fetch reference images for this pattern based on exampleImageIndices
            const exampleIndices = pattern.exampleImageIndices || [];
            let referenceImages: { mimeType: string; data: string }[] = [];

            if (thumbnailUrls && exampleIndices.length > 0) {
                const refUrls = exampleIndices
                    .map(idx => thumbnailUrls[idx - 1])
                    .filter(Boolean)
                    .slice(0, 2);

                logs.push(`[Model Gen] Fetching ${refUrls.length} reference images...`);

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

            // High quality prompt that emphasizes matching reference style
            // DO NOT add any text unless specified
            const promptForImage = `Create a YouTube thumbnail template image.

[CRITICAL RULES]
- DO NOT add ANY text, letters, words, or typography to the image
- This is a TEMPLATE image - text will be added separately
- Match the EXACT visual style of the reference images provided

[SPECIFICATIONS]
- Aspect ratio: 16:9 (1280x720 pixels)
- Style: ${pattern.name}
- Color scheme: ${pattern.characteristics.colorScheme}

[PERSON/SUBJECT]
- Position: ${pattern.characteristics.personPosition}
- Expression: ${pattern.characteristics.personExpression || 'expressive, engaging'}
- IMPORTANT: Reproduce the person's pose and expression style from reference images

[LAYOUT & COMPOSITION]
- Layout: ${pattern.characteristics.layout}
${pattern.characteristics.visualTechniques ? `- Visual techniques: ${pattern.characteristics.visualTechniques}` : ''}
${pattern.requiredMaterials ? `- Background: ${pattern.requiredMaterials.background}` : ''}
${pattern.requiredMaterials?.props?.length ? `- Props: ${pattern.requiredMaterials.props.join(', ')}` : ''}

[QUALITY]
- 8K professional quality
- Photorealistic
- High contrast, vibrant colors
- Clean composition without any text or watermarks`;

            logs.push(`[Model Gen] '${pattern.name}' - ${referenceImages.length} refs loaded`);

            // Generate image using Gemini with reference if available
            let imageUrl: string;
            if (referenceImages.length > 0) {
                const { generateImageWithReference } = await import("@/lib/gemini");
                imageUrl = await generateImageWithReference(promptForImage, referenceImages);
            } else {
                imageUrl = await generateThumbnailImage(promptForImage);
            }

            // Generate text suggestions for this pattern
            const textSuggestionPrompt = `動画タイトル「${videoTitle}」のサムネイル（${pattern.name}パターン）用の文言を3つ提案。

JSON形式で回答:
{
  "suggestedTexts": [
    {"text": "文言例（2〜20文字）", "reason": "選定理由"}
  ]
}`;

            const textResponse = await generateText(textSuggestionPrompt, 0.7);
            let suggestedTexts: { text: string; reason: string }[] = [];

            try {
                const match = textResponse.match(/\{[\s\S]*\}/);
                if (match) {
                    const parsed = JSON.parse(match[0]);
                    suggestedTexts = parsed.suggestedTexts || [];
                }
            } catch (e) {
                suggestedTexts = [
                    { text: "衝撃", reason: "インパクト重視" },
                    { text: "必見", reason: "注目を集める" },
                ];
            }

            results.push({
                imageUrl,
                patternName: pattern.name,
                description: pattern.description,
                suggestedTexts,
            });
        }

        logs.push(`[Complete] Generated ${results.length} model images.`);
        return { data: results, logs };
    } catch (e: any) {
        console.error("Model generation error:", e);
        return { error: e.message || "モデル画像生成エラー", logs };
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
export async function generateFinalThumbnails(
    modelImage: ModelImageInfo | null,
    text: string,
    videoTitle: string,
    count: number = 3,
    patternData?: PatternCategory,
    referenceUrls?: string[]
): Promise<{ data?: string[]; error?: string }> {
    await requireRole("student");

    if (!text) {
        return { error: "サムネイル文言（テロップ）を入力してください。" };
    }

    try {
        const images: string[] = [];

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

        // Get text styling from pattern
        const textStyle = patternData?.characteristics?.textStyle || "bold white with black outline";
        const colorScheme = patternData?.characteristics?.colorScheme || "high contrast";

        for (let i = 0; i < count; i++) {
            // Enhanced prompt that emphasizes using the model image as base
            const variationPrompt = `[TASK]: Create a final YouTube thumbnail by combining the model image with text overlay.

[MANDATORY - EXACT TEXT]
The ONLY text on this thumbnail must be: "${text}"
- DO NOT add any other text, labels, watermarks, or typography
- Text must be large, bold, and highly readable
- Font style: ${textStyle}
- Text position: prominent center or upper area, maximum visibility

[STYLE REFERENCE]
- Pattern name: ${modelImage?.patternName || 'professional thumbnail'}
- Use the model image as the primary visual base
- Maintain the same person, pose, expression, lighting, and composition from the model
- Color scheme: ${colorScheme}

[SPECIFICATIONS]
- Resolution: 1280x720 (16:9 aspect ratio)
- Style: ${patternData?.description || 'eye-catching YouTube thumbnail'}
${patternData?.characteristics?.visualTechniques ? `- Visual effects: ${patternData.characteristics.visualTechniques}` : ''}

[CRITICAL QUALITY REQUIREMENTS]
- Create as if this is taken from a professional YouTube channel
- Photorealistic quality for any people in the image
- Sharp, high-definition image (8K equivalent quality)
- Professional color grading and contrast
- The text "${text}" must look like it was designed by a professional graphic designer

[VARIATION ${i + 1} of ${count}]
${i === 0 ? '- Standard composition from model image' : i === 1 ? '- Slightly more dynamic composition, vibrant colors' : '- Alternative angle or emphasis, maintain quality'}

IMPORTANT: The person in the image must look exactly like the model image. The text styling must match the reference thumbnails.`;

            let imageUrl: string;
            if (referenceImages.length > 0) {
                // Use multimodal generation with reference images
                const { generateImageWithReference } = await import("@/lib/gemini");
                imageUrl = await generateImageWithReference(variationPrompt, referenceImages);
            } else {
                imageUrl = await generateThumbnailImage(variationPrompt);
            }
            images.push(imageUrl);
        }

        return { data: images };
    } catch (e: any) {
        console.error("Final generation error:", e);
        return { error: e.message || "最終生成エラー" };
    }
}

