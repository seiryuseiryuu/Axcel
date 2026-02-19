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
        let html = await res.text();
        let $ = load(html);
        let finalUrl = url;

        // CRAWLER LOGIC: If this looks like a top page, find the first article
        // Heuristic: User likely sent a media home page. valid article links usually have detailed paths.
        const articleLinks: string[] = [];
        $('a').each((_, el) => {
            const href = $(el).attr('href');
            if (!href) return;

            // Normalize URL
            let fullUrl = href;
            try {
                if (href.startsWith('/')) {
                    const u = new URL(url);
                    fullUrl = `${u.protocol}//${u.host}${href}`;
                } else if (!href.startsWith('http')) {
                    return; // Skip weird protocols
                }
            } catch (e) { return; }

            // Filter out common non-article pages
            if (fullUrl === url) return;
            if (fullUrl.includes('/category/')) return;
            if (fullUrl.includes('/tag/')) return;
            if (fullUrl.includes('/author/')) return;
            if (fullUrl.includes('contact')) return;
            if (fullUrl.includes('about')) return;
            if (fullUrl.includes('login')) return;
            if (fullUrl.includes('search')) return;
            if (fullUrl.length < url.length + 10) return; // Too short likely nav

            articleLinks.push(fullUrl);
        });

        // If we found potential articles, pick the first one and fetch IT
        if (articleLinks.length > 0) {
            console.log("Found article links, analyzing first one:", articleLinks[0]);
            try {
                const articleRes = await fetch(articleLinks[0], {
                    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36" }
                });
                if (articleRes.ok) {
                    html = await articleRes.text();
                    $ = load(html);
                    finalUrl = articleLinks[0];
                }
            } catch (e) {
                console.warn("Failed to fetch article, falling back to original page:", e);
            }
        }

        // Try to find a representative image (OG Image or first large image)
        let imageUrl = $('meta[property="og:image"]').attr('content') ||
            $('meta[name="twitter:image"]').attr('content') ||
            $('img').first().attr('src');

        if (!imageUrl) return { styleDescription: "", styleOptions: [] };

        // Handle relative URLs
        if (imageUrl.startsWith('/')) {
            const urlObj = new URL(finalUrl); // Use finalUrl (article url) for base
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
        const analysisPrompt = `この画像の視覚的スタイルを分析してください。

以下の情報を日本語で提供してください：
1. 全体的なスタイルの簡潔な説明（2〜3文。日本語で）
2. この画像と同様の雰囲気を再現するための3つの異なるスタイル案（JSON配列形式）

Format your response EXACTLY as:
DESCRIPTION: [ここに2〜3文の日本語の説明]

STYLES:
[
  {"id": "style1", "label": "[日本語の短いラベル]", "description": "[画像生成AI向けの英語の詳細なスタイル指示。ライティング、色、ムード、構図などを含む]"},
  {"id": "style2", "label": "[日本語の短いラベル]", "description": "[別のバリエーションの英語記述]"},
  {"id": "style3", "label": "[日本語の短いラベル]", "description": "[また別のバリエーションの英語記述]"}
]

Labels examples: "ミニマリスト", "ビビッド", "プロフェッショナル", "手書き風", "3Dイラスト" etc.
Descriptions (English) should use words like "flat design", "vector art", "minimalist", "illustration" if the image is not photorealistic. If it is a photo, use "photorealistic", "photography".
`;

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
                    { id: "minimal", label: "ミニマリスト", description: "Clean, minimal design with muted colors and simple composition, flat vector art style, no photorealism" },
                    { id: "vibrant", label: "ビビッド", description: "Vibrant colors with dynamic composition and bold elements, digital illustration style" },
                    { id: "professional", label: "プロフェッショナル", description: "Professional, polished look with balanced lighting and refined aesthetics, high quality photography or 3D render" }
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

    const prompt = `あなたは世界最高峰の画像生成プロンプトエンジニアです（Midjourney v6 / Stable Diffusion XL 専門家）。
    以下の入力情報に基づき、**日本語で詳細かつ高精細なプロンプト**を作成してください。

    【入力情報】
    - 画像説明: ${eyecatch.description}
    - セクション文脈: ${eyecatch.sectionTitle || "なし"}
    - 記事文脈: ${eyecatch.surroundingContext || articleContext || "なし"}
    - 指定スタイル: ${style} (${styleDescription})
    ${styleContext ? `
    【重要】参考メディアのスタイル分析:
    ${styleContext}
    
    ↑ このスタイル（色調、雰囲気、照明、質感、構図）に **完全に合わせて** プロンプトを作成してください。
    参考メディアの「トンマナ（トーン&マナー）」を絶対に逸脱しないこと。` : ''}
    - アスペクト比: ${aspectRatio}

    【プロンプト構成ルール】以下の順番で、カンマ区切りで構成すること。
    
    1. **被写体（Subject）**: 
       - 人物なら: 年齢層、性別、服装（色・素材まで）、髪型、表情、ポーズ、持ち物
       - 物なら: 形状、色、質感、ブランド感、配置
       
    2. **環境・背景（Environment）**:
       - 場所（オフィス、カフェ、抽象背景など）
       - 時間帯・時刻
       - 天候・光源の方向
       
    3. **アートスタイル（Art Style）**:
       - フォトリアル: 「一眼レフ撮影、Canon EOS R5、85mm f/1.2、被写界深度、8K解像度」
       - イラスト: 「フラットデザイン、ベクターアート」
       - 3D: 「Octane Render、Unreal Engine 5、クレイ質感、等角投影」
       - アニメ: 「新海誠風、セルシェーディング、繊細な光」
       
    4. **ライティング・カラー（Lighting & Color）**:
       - 照明タイプ（自然光、スタジオ照明、ネオン、シネマティック）
       - 色温度（暖色系、寒色系、中間色）
       - カラーパレット（HEXコードを3-4色指定推奨）
       - 影の強さ、コントラスト
       
    5. **構図（Composition）**:
       - カメラアングル（正面、俯瞰、ローアングル、アイレベル）
       - フレーミング（全身、バストアップ、クローズアップ）
       - ルールオブサード、黄金比、対称性など
       
    6. **テクスチャ・質感（Texture）**:
       - 表面の質感（マット、光沢、メタリック、ベルベット）
       - 粒状感、ノイズ感
       
    7. **品質ブースター**:
       - 「最高品質、商業広告クオリティ、ArtStation人気作品、細部まで精緻」

    【出力形式】
    - **日本語でプロンプトを出力**すること（英語ではなく）
    - 文章ではなく、キーワードとフレーズをカンマで区切る
    - 抽象的な概念は具体的なビジュアルに変換すること
      例：「成功」→「高層ビルの窓から朝日を眺める30代男性CEOの後ろ姿」
    - 最後にMidjourney用パラメータを追加: --ar ${aspectRatio} --v 6.0 --q 2

    プロンプト:`;

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
