import { NextRequest, NextResponse } from "next/server";
import { FetchTopArticlesRequest } from "@/types/seo-types";

export async function POST(req: NextRequest) {
    try {
        const body: FetchTopArticlesRequest = await req.json();
        const { keyword, count = 3 } = body;

        // Check if Tavily API key is available
        const tavilyApiKey = process.env.TAVILY_API_KEY;
        if (!tavilyApiKey) {
            return NextResponse.json({
                success: false,
                error: "Tavily API key not configured. Please set TAVILY_API_KEY in environment variables."
            }, { status: 500 });
        }

        // Use Tavily API to search for top SEO articles in Japanese
        // Query optimized for blog/article content without domain restrictions
        const response = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                api_key: tavilyApiKey,
                query: `${keyword}`,  // Simple Japanese query without site restrictions
                search_depth: "advanced",
                include_answer: false,
                include_domains: [],
                exclude_domains: [
                    // Wikipedia/Encyclopedia
                    "wikipedia.org",
                    "ja.wikipedia.org",
                    "en.wikipedia.org",
                    "wikiwand.com",
                    "weblio.jp",
                    "kotobank.jp",
                    "dic.nicovideo.jp",
                    // Video/SNS
                    "youtube.com",
                    "youtu.be",
                    "twitter.com",
                    "x.com",
                    "instagram.com",
                    "facebook.com",
                    "tiktok.com",
                    "linkedin.com",
                    "pinterest.com",
                    // Q&A Sites
                    "yahoo.co.jp",
                    "chiebukuro.yahoo.co.jp",
                    "oshiete.goo.ne.jp",
                    "detail.chiebukuro.yahoo.co.jp",
                    "okwave.jp",
                    "quora.com",
                    "reddit.com",
                    // EC Sites
                    "amazon.co.jp",
                    "amazon.com",
                    "rakuten.co.jp",
                    "kakaku.com",
                    // PDF/Documents
                    "speakerdeck.com",
                    "slideshare.net",
                    // Non-article pages
                    "github.com",
                    "stackoverflow.com",
                ],
                max_results: count * 4,  // Request more to filter
            }),
        });

        if (!response.ok) {
            throw new Error(`Tavily API error: ${response.statusText}`);
        }

        const data = await response.json();

        // Filter results to prioritize SEO blog articles
        // Don't restrict by domain, but prioritize article-like URLs
        const isBlogArticleLike = (url: string): boolean => {
            const lower = url.toLowerCase();
            // Positive signals for blog articles
            const blogSignals = [
                "/blog/",
                "/article/",
                "/column/",
                "/media/",
                "/magazine/",
                "/news/",
                "/post/",
                "/entry/",
                "/tips/",
                "/guide/",
                "/how-to/",
                "/knowledge/",
                "/learn/",
                "/beginner/",
                "note.com",
                "hatena",
                "ameblo",
                "livedoor",
            ];
            // URL structure patterns that suggest article (slug/id after path)
            const hasArticlePattern = /\/[a-z0-9-]+\/[a-z0-9-]+\/?$/.test(lower);

            return blogSignals.some(signal => lower.includes(signal)) || hasArticlePattern;
        };

        // Sort results: prioritize blog-like URLs while maintaining search relevance
        const sortedResults = (data.results || []).sort((a: { url?: string }, b: { url?: string }) => {
            const aIsBlog = isBlogArticleLike(a.url || "");
            const bIsBlog = isBlogArticleLike(b.url || "");
            if (aIsBlog && !bIsBlog) return -1;
            if (!aIsBlog && bIsBlog) return 1;
            return 0;  // Keep original order (Tavily's relevance ranking)
        });

        const articles = sortedResults
            .map((result: { title?: string; url?: string; content?: string }) => ({
                title: result.title || "",
                url: result.url || "",
                snippet: result.content || "",
            }))
            .slice(0, count);

        return NextResponse.json({ success: true, data: articles });
    } catch (error: unknown) {
        console.error("Fetch Top Articles Error:", error);
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
