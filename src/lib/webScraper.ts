import * as cheerio from 'cheerio';

export async function fetchWebContent(url: string): Promise<{ success: boolean; title?: string; content?: string; error?: string }> {
    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!res.ok) {
            return { success: false, error: `Failed to fetch: ${res.status} ${res.statusText}` };
        }

        const html = await res.text();
        const $ = cheerio.load(html);

        // Remove scripts, styles, etc.
        $('script').remove();
        $('style').remove();
        $('noscript').remove();
        $('iframe').remove();

        const title = $('title').text() || '';
        const content = $('body').text().replace(/\s+/g, ' ').trim();

        return { success: true, title, content: content.slice(0, 30000) }; // Limit context
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
