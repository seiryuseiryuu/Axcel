import { NextRequest, NextResponse } from "next/server";
import { load } from "cheerio";

export async function POST(req: NextRequest) {
    try {
        const { url } = await req.json();

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

        $('a').each((_, element) => {
            const href = $(element).attr('href');
            // Remove newlines and extra spaces from title
            let title = $(element).text().replace(/\s+/g, ' ').trim();

            if (href && title && title.length > 2) { // Filter out very short titles like "More", "Top"
                try {
                    const fullUrl = new URL(href, baseUrl);

                    // Only include internal links (same origin)
                    // Also exclude anchor links on same page (#)
                    if (fullUrl.origin === baseUrl.origin && fullUrl.pathname !== baseUrl.pathname) {

                        // Simple deduplication
                        if (!links.some(l => l.url === fullUrl.href)) {
                            links.push({ title, url: fullUrl.href });
                        }
                    }
                } catch (e) {
                    // Invalid URL, ignore
                }
            }
        });

        // Limit results to prevent payload issues (e.g. max 50 links)
        const limitedLinks = links.slice(0, 50);

        return NextResponse.json({ success: true, data: limitedLinks });
    } catch (error: any) {
        console.error("Fetch Links Error:", error);
        return NextResponse.json({ success: false, error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
