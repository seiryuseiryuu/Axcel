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
        $("script, style, nav, footer, header, aside, .sidebar, .navigation, .menu, .advertisement, .ad, .ads, .related-posts, #related-posts").remove();

        // Get page title
        const title = $("h1").first().text().trim() || $("title").text().trim();

        // Get meta description
        const metaDescription = $('meta[name="description"]').attr("content") || "";

        // Extract H2 sections with their content using document order traversal
        const h2Sections: { h2: string; content: string; h3List: string[] }[] = [];

        // Find the main content area first to avoid picking up H2s from sidebars/footers if untagged
        let searchContext = $("article, main, .post-content, .entry-content, .article-body, .content, .post-body, [class*='article'], [class*='post']").first();
        if (searchContext.length === 0) {
            searchContext = $("body").first();
        }

        // Try to find headings from table of contents first (more accurate for complex pages)
        const tocLinks: { text: string; id: string }[] = [];
        $("nav, .toc, .table-of-contents, [class*='toc'], [class*='index'], [class*='mokuji']").find("a").each((_, el) => {
            const href = $(el).attr("href");
            const text = $(el).text().trim();
            if (href && href.startsWith("#") && text) {
                tocLinks.push({ text, id: href.slice(1) });
            }
        });

        // Find all heading elements (h2, h3, h4) to support various page structures
        const allHeadings = searchContext.find("h2, h3, [class*='heading'], [class*='title']").filter((_, el) => {
            const $el = $(el);
            // Filter out navigation, sidebar headings
            return !$el.closest("nav, header, footer, aside, .sidebar, .menu").length;
        });

        // Group content by H2 sections
        let currentH2: { h2: string; content: string; h3List: string[] } | null = null;

        allHeadings.each((_, element) => {
            const $heading = $(element);
            const tagName = element.tagName?.toLowerCase() || "";
            const headingText = $heading.text().trim();

            if (!headingText || headingText.length < 3) return;

            // Check if this is an H2 or H2-equivalent (by class or role)
            const isH2 = tagName === "h2" ||
                $heading.hasClass("h2") ||
                $heading.attr("role") === "heading" && $heading.attr("aria-level") === "2";

            // Check if this is an H3 or H3-equivalent
            const isH3 = tagName === "h3" ||
                tagName === "h4" ||
                $heading.hasClass("h3") ||
                $heading.hasClass("h4");

            if (isH2) {
                // Save previous section if exists
                if (currentH2) {
                    h2Sections.push(currentH2);
                }

                // Get content between this H2 and next heading
                let content = "";
                let $next = $heading.next();
                while ($next.length > 0 && !$next.is("h2") && !$next.hasClass("h2")) {
                    if ($next.is("p, div, li, blockquote, table, ul, ol") && !$next.find("h2, h3").length) {
                        const text = $next.text().trim();
                        if (text.length > 0) {
                            content += text + "\n";
                        }
                    }
                    $next = $next.next();
                }

                currentH2 = {
                    h2: headingText,
                    content: content.trim().substring(0, 3000),
                    h3List: [],
                };
            } else if (isH3 && currentH2) {
                currentH2.h3List.push(headingText);
            }
        });

        // Don't forget the last section
        if (currentH2) {
            h2Sections.push(currentH2);
        }

        // Fallback: If no structured H2s found or content is very sparse, grab everything
        let mainContent = "";
        if (h2Sections.length === 0 || h2Sections.every(s => s.content.length < 50)) {
            mainContent = searchContext.text().trim();
        } else {
            // Reconstruct meaningful content from sections for the 'content' field
            mainContent = h2Sections.map(s => `## ${s.h2}\n${s.content}`).join("\n\n");
        }

        // Final cleanup
        mainContent = mainContent
            .replace(/\s+/g, " ")
            .replace(/\n\s*\n/g, "\n")
            .trim()
            .substring(0, 15000); // Increased limit

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
