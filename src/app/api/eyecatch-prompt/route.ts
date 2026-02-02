import { NextRequest, NextResponse } from "next/server";

export const runtime = 'nodejs'; // Explicitly use Node.js runtime
export const maxDuration = 60;   // Set timeout to 60s

import { generateText, generateMultimodal } from "@/lib/gemini";
import { ExtractedEyecatch, GeneratedPrompt, ImageStyle, AspectRatio, IMAGE_STYLE_OPTIONS, ASPECT_RATIO_OPTIONS, StyleOption } from "@/types/eyecatch-prompt-types";
import { load } from "cheerio";

interface MediaAnalysisResult {
    styleDescription: string;
    imageUrl?: string;
    styleOptions: StyleOption[];
}

// Analyze visual style from a media URL
async function analyzeMediaStyle(url: string): Promise<MediaAnalysisResult> {
    try {
        console.log("Analyzing media style for:", url);
        const res = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
        });
        if (!res.ok) throw new Error("Failed to fetch media URL");
        const html = await res.text();
        const $ = load(html);

        // Try to find a representative image (OG Image or first large image)
        let imageUrl = $('meta[property="og:image"]').attr('content') ||
            $('meta[name="twitter:image"]').attr('content') ||
            $('img').first().attr('src');

        if (!imageUrl) return { styleDescription: "", styleOptions: [] };

        // Handle relative URLs
        if (imageUrl.startsWith('/')) {
            const urlObj = new URL(url);
            imageUrl = `${urlObj.protocol}//${urlObj.host}${imageUrl}`;
        }

        console.log("Found reference image:", imageUrl);

        // Fetch the image
        const imgRes = await fetch(imageUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
        });
        if (!imgRes.ok) return { styleDescription: "", styleOptions: [] };
        const arrayBuffer = await imgRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64 = buffer.toString('base64');
        const mimeType = imgRes.headers.get('content-type') || 'image/jpeg';

        // Analyze with Gemini Multimodal - generate 3 style options
        const analysisPrompt = `Analyze the visual style of this image from a media article.

Please provide:
1. A brief overall style description (2-3 sentences in English)
2. Three distinct style options that could be used to recreate similar imagery, formatted as JSON array with exactly 3 objects.

Format your response EXACTLY as:
DESCRIPTION: [your 2-3 sentence description here]

STYLES:
[
  {"id": "style1", "label": "[Japanese label]", "description": "[Detailed English style description for image generation, including lighting, colors, mood, composition]"},
  {"id": "style2", "label": "[Japanese label]", "description": "[Different variation description]"},
  {"id": "style3", "label": "[Japanese label]", "description": "[Another variation description]"}
]

The labels should be concise Japanese names like "ミニマリスト", "ビビッド", "プロフェッショナル", etc.
The descriptions should be detailed enough for image generation AI.`;

        const analysisResult = await generateMultimodal(analysisPrompt, [{ mimeType, data: base64 }]);

        // Parse the result
        let styleDescription = "";
        let styleOptions: StyleOption[] = [];

        const descMatch = analysisResult.match(/DESCRIPTION:\s*([\s\S]+?)(?=STYLES:|$)/);
        if (descMatch) {
            styleDescription = descMatch[1].trim();
        }

        const stylesMatch = analysisResult.match(/STYLES:\s*(\[[\s\S]*?\])/);
        if (stylesMatch) {
            try {
                styleOptions = JSON.parse(stylesMatch[1]);
            } catch (e) {
                console.error("Failed to parse style options:", e);
                // Fallback default options
                styleOptions = [
                    { id: "minimal", label: "ミニマリスト", description: "Clean, minimal design with muted colors and simple composition" },
                    { id: "vibrant", label: "ビビッド", description: "Vibrant colors with dynamic composition and bold elements" },
                    { id: "professional", label: "プロフェッショナル", description: "Professional, polished look with balanced lighting and refined aesthetics" }
                ];
            }
        }

        return {
            styleDescription,
            imageUrl,
            styleOptions
        };

    } catch (e) {
        console.error("Failed to analyze media style:", e);
        return { styleDescription: "", styleOptions: [] };
    }
}

// Extract [EYECATCH: ...] patterns from HTML
function extractEyecatches(html: string): ExtractedEyecatch[] {
    const eyecatches: ExtractedEyecatch[] = [];
    const pattern = /\[EYECATCH:\s*([^\]]+)\]/gi;
    let match;
    let index = 0;

    while ((match = pattern.exec(html)) !== null) {
        const description = match[1].trim();

        // Try to find surrounding H2 section for context
        const beforeMatch = html.substring(0, match.index);
        const h2Match = beforeMatch.match(/<h2[^>]*>([^<]+)<\/h2>/gi);
        const sectionTitle = h2Match && h2Match.length > 0
            ? h2Match[h2Match.length - 1].replace(/<[^>]+>/g, '').trim()
            : undefined;

        // Get surrounding context (up to 500 chars before and after)
        const contextStart = Math.max(0, match.index - 500);
        const contextEnd = Math.min(html.length, match.index + match[0].length + 500);
        const surroundingContext = html.substring(contextStart, contextEnd)
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        eyecatches.push({
            index: index++,
            description,
            sectionTitle,
            surroundingContext,
        });
    }

    return eyecatches;
}

// Generate detailed prompt from description
async function generateDetailedPrompt(
    eyecatch: ExtractedEyecatch,
    style: ImageStyle,
    aspectRatio: AspectRatio,
    articleContext?: string,
    styleContext?: string
): Promise<string> {
    const styleOption = IMAGE_STYLE_OPTIONS.find(s => s.value === style);
    const styleDescription = styleOption?.description || style;
    const aspectOption = ASPECT_RATIO_OPTIONS.find(a => a.value === aspectRatio);
    const aspectDescription = aspectOption?.description || aspectRatio;

    const prompt = `あなたは画像生成AIプロンプトの専門家です。
以下の情報を元に、画像生成AI（Stable Diffusion、DALL-E、Midjourney等）で使用できる
高品質な英語プロンプトを生成してください。

【画像の説明（日本語）】
${eyecatch.description}

【セクションタイトル】
${eyecatch.sectionTitle || "不明"}

【記事の文脈】
${eyecatch.surroundingContext || articleContext || "コンテキストなし"}

【指定されたスタイル】
${style} - ${styleDescription}

${styleContext ? `【参照メディアのスタイル（重要・再現すること）】
${styleContext}
Note: Use this analyzed style description to guide the visual atmosphere (lighting, colors, mood). Match this vibe.` : ''}

【アスペクト比】
${aspectRatio} - ${aspectDescription}

【出力要件】
1. 英語で出力すること
2. 画像生成AIに最適化された形式にすること
3. 以下の要素を含めること：
   - 主題（what）: 何を描くか
   - 構図（composition）: アングル、距離、配置
   - 照明（lighting）: 光源、明るさ、ムード
   - スタイル指定: ${style}${styleContext ? ' + Reference Reference Style Vibe' : ''}適したスタイルタグ
   - 品質タグ: high quality, detailed, professional など

【重要】
- 抽象的な概念は具体的なビジュアルに変換すること
- ブログ記事に適した、クリーンでプロフェッショナルな画像になるようにすること
- ネガティブプロンプトは含めないこと

プロンプトのみを出力してください（説明や注釈は不要）:`;

    const text = await generateText(prompt, 0.7, "gemini-2.0-flash");
    return text.trim();
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { action, html, eyecatches, style, aspectRatio, articleContext, mediaUrl } = body;

        if (action === "extract") {
            // Step 1: Extract eyecatches from HTML + optionally analyze media
            if (!html) {
                return NextResponse.json({ success: false, error: "HTMLが入力されていません" }, { status: 400 });
            }

            const extracted = extractEyecatches(html);

            if (extracted.length === 0) {
                return NextResponse.json({
                    success: false,
                    error: "[EYECATCH: ...]形式の画像説明が見つかりませんでした。SEOツールで「アイキャッチ画像用の説明を挿入する」を有効にして記事を生成してください。"
                }, { status: 400 });
            }

            // Analyze media style if URL provided
            let analyzedMedia = null;
            if (mediaUrl && typeof mediaUrl === 'string' && mediaUrl.startsWith('http')) {
                const analysisResult = await analyzeMediaStyle(mediaUrl);
                if (analysisResult.styleDescription || analysisResult.styleOptions.length > 0) {
                    analyzedMedia = {
                        imageUrl: analysisResult.imageUrl || "",
                        styleDescription: analysisResult.styleDescription,
                        styleOptions: analysisResult.styleOptions
                    };
                }
            }

            return NextResponse.json({
                success: true,
                data: extracted,
                analyzedMedia
            });

        } else if (action === "generate") {
            // Step 2: Generate detailed prompts
            if (!eyecatches || !Array.isArray(eyecatches) || eyecatches.length === 0) {
                return NextResponse.json({ success: false, error: "画像説明が選択されていません" }, { status: 400 });
            }

            // Use selectedStyleDescription from client if provided (from previous analysis)
            // Otherwise fall back to re-analyzing or no style context
            let styleContext = "";
            const { selectedStyleDescription } = body;

            if (selectedStyleDescription && typeof selectedStyleDescription === 'string') {
                styleContext = selectedStyleDescription;
            } else if (mediaUrl && typeof mediaUrl === 'string' && mediaUrl.startsWith('http')) {
                // Fallback: re-analyze if no style was pre-selected
                const analysisResult = await analyzeMediaStyle(mediaUrl);
                styleContext = analysisResult.styleDescription;
            }

            const generatedPrompts: GeneratedPrompt[] = [];

            for (const eyecatch of eyecatches as ExtractedEyecatch[]) {
                const detailedPrompt = await generateDetailedPrompt(
                    eyecatch,
                    style as ImageStyle || 'photorealistic',
                    aspectRatio as AspectRatio || '16:9',
                    articleContext,
                    styleContext
                );

                generatedPrompts.push({
                    index: eyecatch.index,
                    originalDescription: eyecatch.description,
                    detailedPrompt,
                    style: style as ImageStyle || 'photorealistic',
                    aspectRatio: aspectRatio as AspectRatio || '16:9',
                });
            }

            return NextResponse.json({
                success: true,
                data: generatedPrompts,
            });

        } else {
            return NextResponse.json({ success: false, error: "不正なアクションです" }, { status: 400 });
        }

    } catch (error: unknown) {
        console.error("Eyecatch Prompt Error:", error);
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
