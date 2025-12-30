import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

interface ScrapeRequest {
    url: string;
}

interface ScrapeResponse {
    title: string;
    content: string;
    h2Sections: { h2: string; content: string; h3List: string[] }[];
    metaDescription: string;
}

export async function POST(req: NextRequest) {
    try {
        const body: ScrapeRequest = await req.json();
        const { url } = body;

        if (!url) {
            return NextResponse.json({
                success: false,
                error: "URLが指定されていません"
            }, { status: 400 });
        }

        // Fetch the page content
        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Accept-Language": "ja,en-US;q=0.7,en;q=0.3",
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // Remove script, style, nav, footer, header, aside elements
        $("script, style, nav, footer, header, aside, .sidebar, .navigation, .menu, .advertisement, .ad, .ads").remove();

        // Get page title
        const title = $("h1").first().text().trim() || $("title").text().trim();

        // Get meta description
        const metaDescription = $('meta[name="description"]').attr("content") || "";

        // Extract H2 sections with their content
        const h2Sections: { h2: string; content: string; h3List: string[] }[] = [];

        $("h2").each((_, h2Element) => {
            const h2Text = $(h2Element).text().trim();
            if (!h2Text) return;

            // Get content between this H2 and the next H2
            let content = "";
            const h3List: string[] = [];
            let currentElement = $(h2Element).next();

            while (currentElement.length > 0 && !currentElement.is("h2")) {
                if (currentElement.is("h3")) {
                    h3List.push(currentElement.text().trim());
                }

                // Get text content from paragraphs, lists, etc.
                if (currentElement.is("p, li, blockquote, div")) {
                    const text = currentElement.text().trim();
                    if (text) {
                        content += text + "\n";
                    }
                }

                currentElement = currentElement.next();
            }

            h2Sections.push({
                h2: h2Text,
                content: content.trim().substring(0, 2000), // Limit content length
                h3List,
            });
        });

        // Get main content (fallback if no H2 structure)
        let mainContent = "";

        // Try common article containers
        const articleSelectors = ["article", "main", ".post-content", ".entry-content", ".article-body", ".content"];
        let articleElement = null;

        for (const selector of articleSelectors) {
            const el = $(selector).first();
            if (el.length > 0) {
                articleElement = el;
                break;
            }
        }

        if (articleElement) {
            mainContent = articleElement.text().trim();
        } else {
            mainContent = $("body").text().trim();
        }

        // Clean up the content
        mainContent = mainContent
            .replace(/\s+/g, " ")
            .replace(/\n\s*\n/g, "\n")
            .trim()
            .substring(0, 10000); // Limit to 10k characters for API

        const result: ScrapeResponse = {
            title,
            content: mainContent,
            h2Sections,
            metaDescription,
        };

        return NextResponse.json({ success: true, data: result });
    } catch (error: unknown) {
        console.error("Web Scraping Error:", error);
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
