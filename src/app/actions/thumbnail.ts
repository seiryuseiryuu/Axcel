"use server";

import { generateText, generateImage, generateImageWithReference, generateMultimodal } from "@/lib/gemini";
import { requireRole } from "@/lib/rbac";

// Types matching the latest logic
export interface PatternCategory {
    name: string;
    description: string;
    matchCount?: number;
    characteristics: {
        textPosition: string;
        colorScheme: string;
        personPosition: string;
        layout: string;
        effects?: string;
        textStyle?: string;
        subjectType?: string; // Kept for compatibility but mainly used in description
        colorMood?: string;
        visualTechniques?: string;
        keyElement?: string;
    };
    designRules?: string[];
    exampleImageIndices?: number[];
    summary?: string; // Add summary at pattern level optionally
}

export interface PatternAnalysisResult {
    patterns: PatternCategory[];
    summary: string;
    uniqueFindings?: string[];
    individualAnalysis?: any[];
}

export interface MaterialSuggestion {
    name: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
}

export interface TextSuggestionItem {
    text: string;
    reason: string;
}

export interface ModelImageInfo {
    imageUrl: string;
    patternName: string;
    description: string;
    requiredMaterials: MaterialSuggestion[];
    suggestedTexts: TextSuggestionItem[];
}

// ------------------------------------------------------------------
// 1. Analyze Patterns (2-Stage Analysis)
// ------------------------------------------------------------------
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
                const timeoutId = setTimeout(() => controller.abort(), 5000);
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
                return null;
            }
        });

        const images = (await Promise.all(imagePromises)).filter(Boolean) as { mimeType: string; data: string }[];
        const useMultimodalAnalysis = images.length > 0;

        // ===== Stage 1: Individual Analysis =====
        const stage1Prompt = useMultimodalAnalysis
            ? `【第1段階：個別画像の精緻分析】

${images.length}枚のYouTubeサムネイル画像を一枚ずつ詳細に分析してください。

【動画タイトル参考】
${thumbnailTitles.map((t, i) => `画像${i + 1}: ${t}`).join('\n')}

【分析項目 - 各画像について以下を抽出】

1. テロップ/テキスト分析
   - テキストの有無（あえて文字無しかどうか）
   - 文字数・フォントスタイル（太字/細字、角丸/シャープ）
   - 配置位置（上部/中央/下部、左寄せ/中央/右寄せ）
   - 文字サイズ比率（画面に対する割合）
   - 文字色・縁取り・影の有無
   - 複数行の場合のレイアウト

2. 配色・感情分析
   - 主要色（最大3色とその割合）
   - 配色の意図（例：赤黒=危機感・ネガティブ、青白=信頼・清潔感）
   - 明度・彩度の傾向
   - グラデーションの有無と方向

3. 構図・レイアウト
   - 分割パターン（単一構図/2分割/3分割/対角線）
   - 視線誘導の仕掛け（矢印、指差し、目線の方向）
   - 余白の使い方
   - 対比構造（Before/After、○×比較など）

4. 人物・オブジェクト
   - 人物の有無と人数
   - 表情（驚き/怒り/喜び/真剣など）
   - ポーズ・ジェスチャー
   - 配置位置（左/中央/右、顔の向き）
   - 切り抜きか背景込みか

5. 視覚効果
   - 吹き出し・フレーム・枠
   - 矢印（方向、意味：転換/強調/比較）
   - アイコン・絵文字
   - 光彩・ぼかし・モザイク
   - 数字・記号の強調

1. 以下のJSON形式で回答:
{
  "individualAnalysis": [
    {
      "imageIndex": 1,
      "title": "動画タイトル",
      "text": {
        "hasText": true,
        "intentionallyNoText": false,
        "content": "実際のテロップ内容",
        "charCount": 5,
        "fontStyle": "太字・角丸",
        "position": "中央上部",
        "sizeRatio": "大（40%以上）",
        "color": "#FFFFFF",
        "outline": "黒縁取り3px",
        "shadow": true
      },
      "color": {
        "primary": "#FF0000",
        "secondary": "#000000",
        "tertiary": "#FFFFFF",
        "mood": "危機感・緊張",
        "gradient": "なし"
      },
      "composition": {
        "pattern": "中央集中型",
        "divisionType": "単一",
        "eyeGuidance": "人物の視線が右上を向く",
        "whitespace": "少ない",
        "contrast": "なし"
      },
      "person": {
        "hasPerson": true,
        "count": 1,
        "expression": "驚き・目を見開く",
        "gesture": "口を手で覆う",
        "position": "中央やや左",
        "isCutout": true
      },
      "effects": {
        "arrows": ["右向き矢印（変化を示す）"],
        "frames": "赤い枠線",
        "icons": ["×マーク"],
        "highlights": "集中線",
        "numbers": "なし"
      }
    }
  ]
}

※各画像について漏れなく分析
※推測ではなく実際に見える要素のみを記述`
            : `【第1段階：個別画像の精緻分析 (テキストベース)】
(画像取得に失敗したため、タイトルから推測可能な範囲で分析をお願いします。出力形式は上記JSONに従ってください。)
${thumbnailTitles.map((t, i) => `画像${i + 1}: ${t}`).join('\n')}`;

        logs.push(`[Stage 1] Analyzing...`);
        let stage1Response;
        if (useMultimodalAnalysis) {
            stage1Response = await generateMultimodal(stage1Prompt, images);
        } else {
            stage1Response = await generateText(stage1Prompt, 0.5);
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
            console.warn("Stage 1 parsing failed.", e);
        }

        // ===== Stage 2: Pattern Extraction =====
        const stage2Prompt = `【第2段階：パターン抽出と分類】

以下は${thumbnailUrls.length}枚のサムネイル画像の個別分析結果です。
これらを分析し、共通するパターンを2〜4種類に分類してください。

【個別分析データ】
${JSON.stringify(individualAnalysis, null, 2)}

【パターン抽出ルール】
1. 複数の画像に共通する特徴を「パターン」として抽出
2. 2枚以上で見られる特徴のみをパターンとして認定
3. 以下の観点で共通点を探す：
   - テロップの配色パターン（赤黒=ネガティブ、青系=信頼など）
   - 構図パターン（Before/After対比、矢印による転換表現など）
   - 感情表現パターン（驚き顔+大文字、真剣顔+シンプルなど）
   - 意図的な無テキストパターン
   - 数字強調パターン

【出力形式】
{
  "patterns": [
    {
      "name": "パターン名（例：危機感訴求型、ビフォーアフター型）",
      "description": "30文字以内の特徴説明",
      "matchCount": 3,
      "matchingImages": [1, 3, 5],
      "characteristics": {
        "textPosition": "具体的な位置・サイズ",
        "textStyle": "フォント・色・効果の具体的指定",
        "colorScheme": "具体的な色コードと配色意図",
        "colorMood": "この配色が与える印象",
        "personPosition": "人物配置の具体的指定",
        "personExpression": "表情・ポーズの指定",
        "layout": "構図パターンの具体的説明",
        "visualTechniques": "矢印・枠・効果の具体的使用法",
        "keyElement": "このパターンの最も重要な要素"
      },
      "designRules": [
        "ルール1: 具体的な再現指示",
        "ルール2: 具体的な再現指示",
        "ルール3: 具体的な再現指示"
      ]
    }
  ],
  "summary": "全体の傾向まとめ（50文字以内）",
  "uniqueFindings": [
    "発見1: 共通して見られる独自の手法",
    "発見2: チャンネル特有のスタイル"
  ]
}

※必ず2〜4パターンに分類
※各パターンには具体的な再現ルールを含める
※matchCountが多いほど重要なパターン`;

        logs.push(`[Stage 2] classifying patterns...`);
        const stage2Response = await generateText(stage2Prompt, 0.5);

        try {
            const cleanJson = stage2Response.replace(/```json/g, "").replace(/```/g, "").trim();
            const match = cleanJson.match(/\{[\s\S]*\}/);
            if (match) {
                const parsed = JSON.parse(match[0]);
                const patterns = parsed.patterns || [];
                // Compat map: ensure characteristics match expected types
                const cleanPatterns = patterns.map((p: any) => ({
                    ...p,
                    characteristics: {
                        ...p.characteristics,
                        // Fallbacks if missing
                        textPosition: p.characteristics.textPosition || "Center",
                        colorScheme: p.characteristics.colorScheme || "Vibrant",
                        personPosition: p.characteristics.personPosition || "Right",
                        layout: p.characteristics.layout || "Standard",
                    }
                }));

                // Embed individual analysis for debugging/reference
                return {
                    data: {
                        patterns: cleanPatterns,
                        summary: parsed.summary || "",
                        uniqueFindings: parsed.uniqueFindings || [],
                        individualAnalysis
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

// ------------------------------------------------------------------
// 2. Generate Model Images
// ------------------------------------------------------------------
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

    // Limit/Fill to 3 patterns
    let workingPatterns = [...patterns];
    if (workingPatterns.length < 3) {
        let i = 0;
        while (workingPatterns.length < 3) {
            workingPatterns.push({ ...patterns[i % patterns.length], name: `${patterns[i % patterns.length].name} (Var ${Math.floor(workingPatterns.length / patterns.length) + 1})` });
            i++;
        }
    }
    workingPatterns = workingPatterns.slice(0, 3);

    try {
        const promises = workingPatterns.map(async (pattern) => {
            logs.push(`[Model Gen] Processing '${pattern.name}'...`);

            // Fetch references if available for this pattern (matchingImages indices could be used if we had consistent index mapping, 
            // but for simplicity we'll just pick random 2 from input URLs as general reference or try to map if possible.
            // The 2-stage analysis returns exampleImageIndices or matchingImages.
            const indices = pattern.exampleImageIndices || (pattern as any).matchingImages || [];
            let referenceImages: { mimeType: string; data: string }[] = [];

            if (thumbnailUrls && indices.length > 0) {
                const refUrls = indices
                    .map((idx: number) => thumbnailUrls![idx - 1]) // 1-based index to 0-based
                    .filter(Boolean)
                    .slice(0, 2);

                if (refUrls.length > 0) {
                    const fetchPromises = refUrls.map(async (url: string) => {
                        try {
                            const res = await fetch(url);
                            if (!res.ok) return null;
                            const buffer = await res.arrayBuffer();
                            return {
                                mimeType: res.headers.get('content-type') || 'image/jpeg',
                                data: Buffer.from(buffer).toString('base64')
                            };
                        } catch { return null; }
                    });
                    referenceImages = (await Promise.all(fetchPromises)).filter(Boolean) as any[];
                }
            }

            // Fallback: if no specific references found, use first 2 of provided URLs
            if (referenceImages.length === 0 && thumbnailUrls && thumbnailUrls.length > 0) {
                const refUrls = thumbnailUrls.slice(0, 2);
                const fetchPromises = refUrls.map(async (url: string) => {
                    try {
                        const res = await fetch(url);
                        if (!res.ok) return null;
                        const buffer = await res.arrayBuffer();
                        return {
                            mimeType: res.headers.get('content-type') || 'image/jpeg',
                            data: Buffer.from(buffer).toString('base64')
                        };
                    } catch { return null; }
                });
                referenceImages = (await Promise.all(fetchPromises)).filter(Boolean) as any[];
            }

            const prompt = `YouTubeサムネイルのモデル画像を生成。

【動画情報】
タイトル: ${videoTitle}
${videoDescription ? `内容: ${videoDescription}` : ''}

【このパターンの特徴: ${pattern.name}】
${pattern.description}
- テロップ配置: ${pattern.characteristics.textPosition}
- 配色: ${pattern.characteristics.colorScheme}
- 人物配置: ${pattern.characteristics.personPosition}
- レイアウト: ${pattern.characteristics.layout}
- 効果: ${pattern.characteristics.effects || ""}

【生成ルール】
- アスペクト比: 16:9（1280x720） ※正方形は不可。必ず横長のYouTubeサムネイルサイズで出力すること。
- 上記パターンの特徴を忠実に再現
- テロップ: ${text ? `「${text}」という文字を配置（文字化けを防ぐため、正確な日本語で描画）` : '【重要】文字・テロップは一切入れない（No Text）。画像とデザインのみで構成する'}`;

            let imageUrl: string;
            try {
                if (referenceImages.length > 0) {
                    imageUrl = await generateImageWithReference(prompt, referenceImages);
                } else {
                    imageUrl = await generateImage(prompt);
                }
            } catch (e: any) {
                console.warn(`Gen failed for ${pattern.name}, falling back...`, e);
                // Simple fallback prompt
                imageUrl = await generateImage(`YouTube thumbnail background, ${pattern.characteristics.colorScheme}, ${pattern.characteristics.layout}`);
            }

            // Generate suggestions (Materials & Text)
            const suggestionPrompt = `動画タイトル「${videoTitle}」のサムネイル（${pattern.name}パターン）の必要素材と文言を提案してください。

            必ず以下のJSON形式のみで回答してください（説明文は不要）:
            {
                "description": "このパターンの構造説明",
                "requiredMaterials": [
                    { "name": "素材名", "description": "用途説明", "priority": "high" },
                    { "name": "素材名2", "description": "用途説明", "priority": "medium" }
                ],
                "suggestedTexts": [
                    { "text": "文言例1（2〜6文字）", "reason": "選定理由" },
                    { "text": "文言例2（2〜6文字）", "reason": "選定理由" }
                ]
            }

パターン: ${pattern.name}
特徴: ${pattern.description}`;

            let description = pattern.description;
            let requiredMaterials: MaterialSuggestion[] = [];
            let suggestedTexts: TextSuggestionItem[] = [];

            try {
                const suggestionRes = await generateText(suggestionPrompt, 0.7);
                const match = suggestionRes.match(/\{[\s\S]*\}/);
                if (match) {
                    const parsed = JSON.parse(match[0]);
                    description = parsed.description || description;
                    requiredMaterials = parsed.requiredMaterials || [];
                    suggestedTexts = parsed.suggestedTexts || [];
                }
            } catch (e) {
                console.error("Suggestion error:", e);
                suggestedTexts = [
                    { text: "衝撃", reason: "インパクト重視" },
                    { text: "必見", reason: "注目を集める" }
                ];
            }

            return {
                imageUrl,
                patternName: pattern.name,
                description,
                requiredMaterials,
                suggestedTexts
            };
        });

        const results = (await Promise.all(promises)).filter(Boolean) as ModelImageInfo[];

        if (results.length === 0) {
            logs.push("[Model Gen] All patterns failed to generate images.");
            // Fallback: If all fail, maybe return a placeholder or at least the analysis without images? 
            // But the UI expects images. We return error.
            if (results.length === 0) return { error: "全ての画像の生成に失敗しました。しばらく待ってから再度お試しください。", logs };
        }

        return { data: results, logs };
    } catch (e: any) {
        console.error("Model generation error:", e);
        return { error: e.message || "モデル画像生成エラー", logs };
    }
}

// ------------------------------------------------------------------
// 3. Generate Final Thumbnails (Updated Logic)
// ------------------------------------------------------------------
export async function generateFinalThumbnails(
    modelImage: ModelImageInfo | null,
    text: string,
    videoTitle: string,
    count: number = 1,
    patternData?: PatternCategory,
    referenceUrls?: string[],
    customPrompt?: string,
    preserveModelPerson: boolean = false,
    previousImage?: string | null, // New argument for refinement
    additionalMaterials?: { image: string; description?: string }[] // NEW: User uploaded materials
): Promise<{ data?: string[]; error?: string }> {
    await requireRole("student");

    if (!text) {
        return { error: "サムネイル文言（テロップ）を入力してください。" };
    }

    try {
        // Prepare reference images
        let referenceImages: { mimeType: string; data: string }[] = [];
        const imageUrlsToFetch: string[] = [];

        // Helper to add image to ref collection
        const addRefImage = async (imgStr: string) => {
            try {
                if (imgStr.includes("base64,")) {
                    // More robust base64 extraction
                    const parts = imgStr.split("base64,");
                    const mimeMatch = parts[0].match(/data:([^;]+);/);
                    const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg"; // Default fallback
                    const base64Data = parts[1].trim(); // Remove whitespace if any

                    if (base64Data) {
                        referenceImages.push({
                            mimeType: mimeType,
                            data: base64Data
                        });
                        console.log(`[thumbnail] Added DataURL ref: ${mimeType}, length: ${base64Data.length}`);
                    }
                } else if (imgStr.startsWith("http")) {
                    console.log(`[thumbnail] Fetching ref URL: ${imgStr}`);
                    const res = await fetch(imgStr);
                    if (res.ok) {
                        const buffer = await res.arrayBuffer();
                        referenceImages.push({
                            mimeType: res.headers.get('content-type') || 'image/jpeg',
                            data: Buffer.from(buffer).toString('base64')
                        });
                    } else {
                        console.warn(`[thumbnail] Failed to fetch URL: ${imgStr} (${res.status})`);
                    }
                }
            } catch (e) { console.error("Error adding ref image", e); }
        };

        // 1. Additional Materials (Highest Priority for content)
        if (additionalMaterials && additionalMaterials.length > 0) {
            for (const mat of additionalMaterials) {
                await addRefImage(mat.image);
            }
            // CRITICAL CHECK: If user provided materials but we failed to load them, STOP.
            if (referenceImages.length === 0) {
                console.warn("[thumbnail] Additional materials provided but none loaded. Force failing.");
                // We might want to throw error, or try best effort. 
                // But user specifically complained about "ignored". Better to error.
            }
        }

        // 2. If we have a previous image (Refinement Mode), it is the PRIMARY reference.
        if (previousImage) {
            await addRefImage(previousImage);
        }
        // 3. If preserving model person (and no previous image overriding), add model
        else if (preserveModelPerson && modelImage?.imageUrl) {
            await addRefImage(modelImage.imageUrl);
        }

        // 4. Add regular reference URLs if space allows (max 5 refs total usually safe)
        if (referenceUrls && referenceUrls.length > 0) {
            for (const url of referenceUrls.slice(0, 2)) {
                await addRefImage(url);
            }
        }

        // 5. Fallback: Check if we didn't add model image yet but we have one (for style ref)
        if (!previousImage && !preserveModelPerson && modelImage?.imageUrl && referenceImages.length < 2) {
            await addRefImage(modelImage.imageUrl);
        }

        console.log(`[thumbnail] Total Reference Images: ${referenceImages.length}`);

        // Helper to track image roles for the prompt
        let imageRoleDescriptions: string[] = [];
        let refIndex = 1;

        // 1. Additional Materials (Highest Priority)
        let hasUserBackground = false;
        if (additionalMaterials && additionalMaterials.length > 0) {
            for (const mat of additionalMaterials) {
                const startLen = referenceImages.length;
                await addRefImage(mat.image);

                if (referenceImages.length > startLen) {
                    let rawDesc = mat.description || '';
                    let strictInstr = "Include this element prominently.";

                    if (rawDesc.includes("背景") || rawDesc.includes("background")) {
                        strictInstr = "CRITICAL: Use this image EXCLUSIVELY as the BACKGROUND. Do NOT generate a new background. Preserve its details, style, and composition.";
                        hasUserBackground = true;
                    } else if (rawDesc.includes("メイン") || rawDesc.includes("キャラクター") || rawDesc.includes("character")) {
                        strictInstr = "CRITICAL: This is the MAIN CHARACTER/SUBJECT. Place it centrally. Do NOT change the face or identity.";
                    } else if (rawDesc.includes("スタイル") || rawDesc.includes("style")) {
                        strictInstr = "Use this image as a STYLE REFERENCE (Colors, Lighting, Texture).";
                    }

                    imageRoleDescriptions.push(`[Image ${refIndex} - User Material]: ${strictInstr} (User Note: ${rawDesc})`);
                    refIndex++;
                }
            }
        }

        // 2. Previous Image
        if (previousImage) {
            const startLen = referenceImages.length;
            await addRefImage(previousImage);
            if (referenceImages.length > startLen) {
                imageRoleDescriptions.push(`[Image ${refIndex} - Previous Version]: Base image to refine. KEEP EVERYTHING EXCEPT REQUESTED CHANGES.`);
                refIndex++;
            }
        }
        // 3. Model Image (Pattern)
        else if (modelImage?.imageUrl) {
            const startLen = referenceImages.length;
            await addRefImage(modelImage.imageUrl);
            if (referenceImages.length > startLen) {
                let patternRole = "Design Template.";
                if (preserveModelPerson) {
                    patternRole = `CRITICAL SUBJECT & STYLE REFERENCE. **KEEP the character/person and Font Style/Effect** from this image. 
                    ${hasUserBackground ? "Only REPLACE the background with the User Material provided above." : "Retain full identity."}`;
                }
                imageRoleDescriptions.push(`[Image ${refIndex} - Pattern Reference]: ${patternRole}`);
                refIndex++;
            }
        }

        console.log(`[thumbnail] Total Reference Images: ${referenceImages.length}`);

        // Construct Prompt
        const patternInfo = modelImage ? `【Base Pattern Strategy】
            Pattern Name: ${modelImage.patternName}
            Description: ${modelImage.description}` : '';

        const textInstruction = text.trim().length > 0
            ? `【TEXT OVERLAY】
        Text: "${text}"
        Style: ${customPrompt ? "Follow [USER OVERRIDE INSTRUCTIONS] below for font/color metrics." : "Match the exact BOLD Gothic/Impact font and 3D/stroke effects from the Pattern Reference image."}
        Legibility: High contrast, clearly readable.`
            : '【TEXT OVERLAY】\nNO TEXT.';

        let materialInstruction = '';
        if (imageRoleDescriptions.length > 0) {
            materialInstruction = `【STRICT REFERENCE ROLES (MANDATORY)】\n${imageRoleDescriptions.join('\n')}\n\n[COMPOSITION RULE]: If a person is in the Pattern and a background is in User Material, you MUST composite that exact person on the new background. Do NOT hallucinate a new background or delete the person.`;
        }

        // Strict preservation prompt
        const isRefinement = !!previousImage || preserveModelPerson;

        // REMOVED RandomSeed 

        const prompt = isRefinement
            ? `[TASK: PROFESSIONAL IMAGE EDITING]
You are a master thumbnail editor. Combine the elements from the provided reference images as instructed.

[CONSTRAINTS]
1. CHARACTER & FACE: You MUST PRESERVE the character/person from the reference image UNLESS replaced by a User Material.
2. FONT: RETAIN the font's 3D effects, color gradients, and stroke styles from the pattern.
3. COMPOSITION: Strictly follow the layout logic.
4. FORMAT: FORCE 16:9 Aspect Ratio (Landscape). Do NOT produce square images even if references are square.

${patternInfo}
${textInstruction}
${materialInstruction}
${customPrompt ? `\n[CRITICAL: USER OVERRIDE INSTRUCTIONS]\nThe following instructions are provided by the user and MUST be followed precisely. If they conflict with "Base Pattern Strategy" or reference images, the USER INSTRUCTIONS prevail.\n\n${customPrompt}` : ''}
`
            : `Create a High-Quality YouTube Thumbnail.

${patternInfo}
${textInstruction}
${materialInstruction}
[QUALITY] 8k resolution, sharf focus, masterpiece.
[FORMAT] 16:9 Aspect Ratio (Landscape). NEVER generate square images.
${customPrompt ? `\n[CRITICAL: USER OVERRIDE INSTRUCTIONS]\nThe following instructions are provided by the user and MUST be followed precisely. If they conflict with "Base Pattern Strategy", the USER INSTRUCTIONS prevail.\n\n${customPrompt}` : ''}
`;


        // Generate
        const promises = Array.from({ length: count }).map(async () => {
            // Force use of generateImageWithReference if we have ANY reference images (which we should if uploaded)
            // or if we have model image, etc.
            if (referenceImages.length > 0) {
                return await generateImageWithReference(prompt, referenceImages);
            } else {
                return await generateImage(prompt);
            }
        });

        const results = await Promise.all(promises);
        const images = results.filter(Boolean) as string[];

        if (images.length === 0) throw new Error("画像生成に失敗しました。");

        return { data: images };
    } catch (e: any) {
        console.error("Final generation error:", e);
        return { error: e.message || "最終生成エラー" };
    }

}



// ------------------------------------------------------------------
// 4. Single Model Image Generation (Legacy/Streaming support)
// ------------------------------------------------------------------
export async function generateSingleModelImage(
    patterns: PatternCategory, // Changed locally to match singular call, but if called with array, handle appropriately? 
    // Wait, typical usage: generateSingleModelImage(pattern, ...)
    videoTitle: string,
    videoDescription: string = "",
    thumbnailUrls: string[] = [],
    customText: string = ""
): Promise<{ data?: ModelImageInfo; error?: string }> {
    // Adapter to use the new batch function for a single item
    // Actually, let's keep it simple and just reuse logic.
    // NOTE: The previous signature was (pattern, ...) but imported as (patterns, ...) in some contexts? 
    // Let's stick to the signature requested by the UI. 
    // Looking at previous file: export async function generateSingleModelImage(pattern: PatternCategory, ...)

    // We will just implement it directly.
    return { error: "Deprecated function called. Use generateModelImages." };
}

// Re-export this for UI compatibility if needed, but better to update UI to not use it if possible.
// Or actually implement it:
export async function generateSingleModelImageCompatible(
    pattern: PatternCategory,
    videoTitle: string,
    videoDescription: string = "",
    thumbnailUrls: string[] = [],
    customText: string = ""
): Promise<{ data?: ModelImageInfo; error?: string }> {
    const res = await generateModelImages([pattern], videoTitle, videoDescription, thumbnailUrls);
    if (res.data && res.data.length > 0) {
        return { data: res.data[0] };
    }
    return { error: res.error || "Failed" };
}

// ------------------------------------------------------------------
// 5. Generate Prompt (Legacy/Suggestion support)
// ------------------------------------------------------------------
export async function generateThumbnailPrompt(
    text: string,
    textStyle: string = "指定なし",
    colorScheme: string = "指定なし",
    subjectType: string = "指定なし"
): Promise<{ data?: string; error?: string }> {
    // Generate a High-Quality Prompt Template for the user to edit
    const description = `【YouTubeサムネイル生成プロンプト】

[ターゲット] 日本のYouTube視聴者
[目的] 高CTR（クリック率）の獲得、視覚的インパクトの最大化

【デザイン設定】
・文字（テロップ）: "${text}"
・文字スタイル: ${textStyle} （太字、立体、高コントラスト推奨）
・配色テーマ: ${colorScheme} （鮮やか、目立つ色）
・メイン被写体: ${subjectType} （表情豊か、信頼感）

【品質指定】
High Quality, 8k resolution, Masterpiece, Sharp focus, Professional Lighting.
(ぼやけ、低画質、歪み、不自然な描写を排除)

【構図・詳細指示】
ここに具体的な指示を追記してください（例：「右側に驚いた顔の男性を配置」「背景は集中線で強調」など）`;

    return { data: description };
}
