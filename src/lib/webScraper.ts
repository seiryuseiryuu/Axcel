import * as cheerio from 'cheerio';

export async function fetchWebContent(url: string): Promise<{ success: boolean; title?: string; content?: string; error?: string }> {
    try {
        console.log("[WebScraper] Fetching:", url);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
                'Accept-Encoding': 'identity',
                'Cache-Control': 'no-cache',
            },
            redirect: 'follow',
            signal: controller.signal,
        });

        clearTimeout(timeout);

        console.log("[WebScraper] Response status:", res.status, res.statusText);

        if (!res.ok) {
            return { success: false, error: `HTTP ${res.status} ${res.statusText} (URL: ${url})` };
        }

        const html = await res.text();
        console.log("[WebScraper] HTML length:", html.length);

        if (!html || html.length < 100) {
            return { success: false, error: "取得したHTMLが空またはほぼ空です" };
        }

        const $ = cheerio.load(html);

        // Remove non-content elements
        $('script').remove();
        $('style').remove();
        $('noscript').remove();
        $('iframe').remove();
        $('nav').remove();
        $('footer').remove();
        $('header').remove();

        const title = $('title').text().trim() || $('h1').first().text().trim() || '';

        // Try to extract main content area first
        let content = '';
        const mainSelectors = ['main', 'article', '.main-content', '.entry-content', '.post-content', '#content', '.content', '[role="main"]'];
        for (const sel of mainSelectors) {
            const mainEl = $(sel);
            if (mainEl.length > 0 && mainEl.text().trim().length > 200) {
                content = mainEl.text().replace(/\s+/g, ' ').trim();
                break;
            }
        }

        // Fallback to body text
        if (!content || content.length < 200) {
            content = $('body').text().replace(/\s+/g, ' ').trim();
        }

        console.log("[WebScraper] Extracted content length:", content.length, "Title:", title);

        if (!content || content.length < 50) {
            // The page may be JS-rendered (SPA). Return what we have with a note.
            return {
                success: true,
                title,
                content: `[注意: このページはJavaScriptで動的に描画されている可能性があります。取得できたテキスト量が少ないため、分析精度が低下する場合があります]\n\n${content || $('body').text().replace(/\\s+/g, ' ').trim()}`
            };
        }

        return { success: true, title, content: content.slice(0, 30000) };
    } catch (e: any) {
        console.error("[WebScraper] Error:", e.message);
        if (e.name === 'AbortError') {
            return { success: false, error: "URLの取得がタイムアウトしました（15秒）。URLが正しいか確認してください。" };
        }
        return { success: false, error: `URL取得エラー: ${e.message}` };
    }
}
