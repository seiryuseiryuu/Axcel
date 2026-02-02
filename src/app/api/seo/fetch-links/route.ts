import { NextRequest, NextResponse } from "next/server";
import { load } from "cheerio";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { generateText } from "@/lib/gemini";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "");

export async function POST(req: NextRequest) {
    try {
        const { url, keyword, articleTitle, outlineSections } = await req.json();

        if (!url) {
            return NextResponse.json({ success: false, error: "URL is required" }, { status: 400 });
        }

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!response.ok) {
            return NextResponse.json({ success: false, error: "Failed to fetch URL" }, { status: response.status });
        }

        const html = await response.text();
        const $ = load(html);
        const links: { title: string; url: string }[] = [];

        let baseUrl: URL;
        try {
            baseUrl = new URL(url);
        } catch {
            return NextResponse.json({ success: false, error: "Invalid URL provided" }, { status: 400 });
        }

        // Extract links from article-like sections (not navigation/footer/sidebar)
        $('article a, main a, .post a, .entry a, .content a, .article-body a').each((_, element) => {
            const href = $(element).attr('href');
            let title = $(element).text().replace(/\s+/g, ' ').trim();

            // Filter out very short titles or generic text
            if (href && title && title.length > 10 && title.length < 200) {
                try {
                    const fullUrl = new URL(href, baseUrl);

                    if (fullUrl.origin === baseUrl.origin && fullUrl.pathname !== baseUrl.pathname) {
                        const lowerHref = fullUrl.href.toLowerCase();
                        const lowerTitle = title.toLowerCase();

                        // Stricter exclusions
                        if (
                            !lowerHref.includes('/tag/') &&
                            !lowerHref.includes('/category/') &&
                            !lowerHref.includes('/page/') &&
                            !lowerHref.includes('/author/') &&
                            !lowerHref.includes('/archive/') &&
                            !lowerHref.includes('login') &&
                            !lowerHref.includes('signup') &&
                            !lowerHref.includes('contact') &&
                            !lowerHref.includes('about') &&
                            !lowerHref.includes('privacy') &&
                            !lowerHref.includes('terms') &&
                            !lowerHref.includes('sitemap') &&
                            !lowerHref.includes('feed') &&
                            !lowerHref.includes('search') &&
                            !lowerTitle.includes('もっと見る') &&
                            !lowerTitle.includes('ランキング') &&
                            !lowerTitle.includes('人気記事') &&
                            !lowerTitle.includes('新着記事')
                        ) {
                            if (!links.some(l => l.url === fullUrl.href)) {
                                links.push({ title, url: fullUrl.href });
                            }
                        }
                    }
                } catch {
                    // Invalid URL, ignore
                }
            }
        });

        // If not enough links from article sections, also check general links
        if (links.length < 20) {
            $('a').each((_, element) => {
                const href = $(element).attr('href');
                let title = $(element).text().replace(/\s+/g, ' ').trim();

                if (href && title && title.length > 10 && title.length < 200) {
                    try {
                        const fullUrl = new URL(href, baseUrl);

                        if (fullUrl.origin === baseUrl.origin && fullUrl.pathname !== baseUrl.pathname) {
                            const lowerHref = fullUrl.href.toLowerCase();
                            const lowerTitle = title.toLowerCase();

                            // Must look like an article URL (has slug-like path)
                            const hasArticlePattern = /\/[a-z0-9-]+\/[a-z0-9-]+\/?$/.test(lowerHref) ||
                                /\/article/.test(lowerHref) ||
                                /\/\d{4}\/\d{2}\//.test(lowerHref);

                            if (
                                hasArticlePattern &&
                                !lowerHref.includes('/tag/') &&
                                !lowerHref.includes('/category/') &&
                                !lowerHref.includes('/page/') &&
                                !lowerHref.includes('/author/') &&
                                !lowerTitle.includes('もっと見る') &&
                                !lowerTitle.includes('ランキング')
                            ) {
                                if (!links.some(l => l.url === fullUrl.href)) {
                                    links.push({ title, url: fullUrl.href });
                                }
                            }
                        }
                    } catch {
                        // Invalid URL, ignore
                    }
                }
            });
        }

        // Use AI to find the most relevant links with strict relevance scoring
        if ((keyword || articleTitle || outlineSections) && links.length > 0) {
            try {
                const candidateLinks = links.slice(0, 100);

                // Build rich context from article structure
                let articleContext = "";
                if (articleTitle) {
                    articleContext += `【記事タイトル】\n${articleTitle}\n\n`;
                }
                if (keyword) {
                    articleContext += `【ターゲットキーワード】\n${keyword}\n\n`;
                }
                if (outlineSections && outlineSections.length > 0) {
                    articleContext += `【記事の構成（H2見出し）】\n${outlineSections.map((s: { h2: string; h3List?: string[]; sectionSummary?: string }) =>
                        `● ${s.h2}${s.sectionSummary ? ` - ${s.sectionSummary}` : ''}${s.h3List && s.h3List.length > 0 ? `\n  └ ${s.h3List.join(', ')}` : ''}`
                    ).join('\n')}\n`;
                }

                // const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }); // Removed direct instantiation
                const prompt = `あなたは内部リンク最適化の専門家です。

${articleContext}

【タスク】
以下の記事リストから、上記の記事内容と**直接的に関連する記事のみ**を厳選してください。

【選定基準（厳格に適用）】
1. 記事のH2/H3見出し（構成案）で扱われている特定のトピックと**直接的に関連**しているかを最優先する
2. 読者がその見出しの内容を読んだ後に「もっと詳しく知りたい」と思う具体的な補足情報であるか
3. 単なるカテゴリ的な関連（同じジャンル）は除外・低評価にする

【除外基準】
- タイトルが一般的すぎる記事
- 本記事の内容と重複する記事
- 関連性が薄い記事（無関係なのにリンクすると読者体験を損なう）

【出力形式】
関連性スコア（1-10）が**7以上の記事のみ**をJSON配列で出力してください。
スコア7未満の記事は出力しないでください。該当がなければ空配列[]を返してください。

[
  { "title": "記事タイトル", "url": "記事URL", "score": 8, "reason": "H2「〇〇」の補足説明として最適" },
  ...
]

【候補記事リスト】
${candidateLinks.map((l, i) => `${i + 1}. ${l.title} | ${l.url}`).join("\n")}
`;

                const text = await generateText(prompt, 0.7, "gemini-2.0-flash");
                // const result = await model.generateContent(prompt);
                // const text = result.response.text();

                // Remove markdown code blocks if present
                let cleanedText = text.trim();
                if (cleanedText.startsWith("```json")) {
                    cleanedText = cleanedText.slice(7);
                } else if (cleanedText.startsWith("```")) {
                    cleanedText = cleanedText.slice(3);
                }
                if (cleanedText.endsWith("```")) {
                    cleanedText = cleanedText.slice(0, -3);
                }
                cleanedText = cleanedText.trim();

                const jsonMatch = cleanedText.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                    const relevantLinks = JSON.parse(jsonMatch[0]);
                    // Only return links with score >= 7
                    const highRelevanceLinks = relevantLinks.filter((link: { score?: number }) =>
                        !link.score || link.score >= 7
                    );
                    return NextResponse.json({ success: true, data: highRelevanceLinks });
                }
            } catch (aiError) {
                console.error("AI Filtering Error:", aiError);
                // Fallback: filter by keyword matching in title
                if (keyword) {
                    const filtered = links.filter(l =>
                        l.title.toLowerCase().includes(keyword.toLowerCase())
                    ).slice(0, 10);
                    if (filtered.length > 0) {
                        return NextResponse.json({ success: true, data: filtered });
                    }
                }
            }
        }

        // Fallback: return limited links without AI filtering
        const limitedLinks = links.slice(0, 20);
        return NextResponse.json({ success: true, data: limitedLinks });
    } catch (error: unknown) {
        console.error("Fetch Links Error:", error);
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
