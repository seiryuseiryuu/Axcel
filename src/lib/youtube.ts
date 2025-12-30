/**
 * YouTube動画の字幕（トランスクリプト）を取得するためのユーティリティ
 * サーバーサイドでのみ使用
 */



// YouTube動画IDを抽出
export function extractVideoId(url: string): string | null {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /^([a-zA-Z0-9_-]{11})$/, // 直接IDが渡された場合
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

// HTMLエンティティをデコード
function decodeHtmlEntities(text: string): string {
    return text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&#x27;/g, "'")
        .replace(/&#x2F;/g, '/')
        .replace(/&nbsp;/g, ' ')
        .replace(/\\n/g, ' ')
        .replace(/\n/g, ' ');
}

// YouTube Data APIを使って動画情報を取得
export async function getVideoInfo(videoId: string) {
    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!apiKey) {
        console.warn("YOUTUBE_API_KEY not set, returning basic info");
        return {
            title: "（タイトル取得不可 - API Key未設定）",
            description: "",
            channelTitle: "",
        };
    }

    try {
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet`,
            { next: { revalidate: 3600 } }
        );

        if (!response.ok) {
            throw new Error(`YouTube API error: ${response.status}`);
        }

        const data = await response.json();
        const item = data.items?.[0];

        if (!item) {
            return { title: "動画が見つかりませんでした", description: "", channelTitle: "" };
        }

        return {
            title: item.snippet.title,
            description: item.snippet.description,
            channelTitle: item.snippet.channelTitle,
            publishedAt: item.snippet.publishedAt,
            thumbnails: item.snippet.thumbnails,
        };
    } catch (e: unknown) {
        console.error("YouTube API error:", e);
        return {
            title: "（取得エラー）",
            description: "",
            channelTitle: "",
        };
    }
}

// ====================================
// 字幕取得: 複数の方法を順番に試行
// ====================================

// 結果の型定義
interface TranscriptResult {
    transcript: string | null;
    method?: string;
    error?: string;
}

// 方法0: Supadata API (最も信頼性が高い - 有料APIだが無料枠あり)
// https://supadata.ai - 月100クレジット無料
async function fetchTranscriptViaSupadata(videoId: string): Promise<TranscriptResult> {
    const apiKey = process.env.SUPADATA_API_KEY;

    if (!apiKey) {
        console.log("[Supadata] API key not configured, skipping");
        return { transcript: null, error: "SUPADATA_API_KEY not set" };
    }

    console.log("[Supadata] Trying Supadata API for:", videoId);

    try {
        const response = await fetch(
            `https://api.supadata.ai/v1/youtube/transcript?videoId=${videoId}&lang=ja`,
            {
                headers: {
                    'x-api-key': apiKey,
                    'Accept': 'application/json',
                },
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[Supadata] API error:", response.status, errorText);
            return { transcript: null, error: `API error: ${response.status}` };
        }

        const data = await response.json();

        // Supadata returns { content: [{ text: "...", start: 0, duration: 0 }, ...] }
        if (data.content && Array.isArray(data.content)) {
            const transcript = data.content
                .map((item: any) => item.text || "")
                .join(' ')
                .replace(/\s+/g, ' ')
                .trim();

            if (transcript.length > 50) {
                console.log("[Supadata] Success, length:", transcript.length);
                return { transcript, method: "Supadata" };
            }
        }

        return { transcript: null, error: "Empty or short transcript" };
    } catch (e: any) {
        console.error("[Supadata] Error:", e.message);
        return { transcript: null, error: e.message };
    }
}

// 方法1: YouTube TimedText API (非公式だが最も安定)
async function fetchTranscriptViaTimedText(videoId: string): Promise<TranscriptResult> {
    console.log("[TimedText] Trying TimedText API for:", videoId);

    const languages = ['ja', 'en', 'a.ja', 'a.en']; // 'a.' prefix = auto-generated

    for (const lang of languages) {
        try {
            const url = `https://video.google.com/timedtext?lang=${lang}&v=${videoId}`;
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            if (!response.ok) continue;

            const xml = await response.text();
            if (!xml || xml.length < 100) continue;

            // XMLからテキストを抽出
            const textMatches = xml.match(/<text[^>]*>([^<]+)<\/text>/g);
            if (!textMatches || textMatches.length === 0) continue;

            const transcript = textMatches
                .map(match => {
                    const textContent = match.replace(/<text[^>]*>/, '').replace(/<\/text>/, '');
                    return decodeHtmlEntities(textContent);
                })
                .join(' ')
                .replace(/\s+/g, ' ')
                .trim();

            if (transcript.length > 50) {
                console.log(`[TimedText] Success with lang=${lang}, length: ${transcript.length}`);
                return { transcript, method: "TimedText" };
            }
        } catch (e: any) {
            // Continue to next language
        }
    }

    console.log("[TimedText] All languages failed");
    return { transcript: null, error: "All TimedText languages failed" };
}

// 方法2: youtubei.js (InnerTube API)
import { Innertube } from 'youtubei.js/web';
async function fetchTranscriptViaYoutubei(videoId: string): Promise<TranscriptResult> {
    console.log("[Youtubei] Trying youtubei.js for:", videoId);

    try {
        const youtube = await Innertube.create({
            lang: 'ja',
            location: 'JP',
        });

        const info = await youtube.getInfo(videoId);
        const transcriptInfo = await info.getTranscript();

        if (!transcriptInfo || !transcriptInfo.transcript) {
            console.log("[Youtubei] No transcript available");
            return { transcript: null, error: "No transcript in response" };
        }

        const content = transcriptInfo.transcript.content;
        if (!content || !content.body || !content.body.initial_segments) {
            console.log("[Youtubei] Transcript content structure not found");
            return { transcript: null, error: "Invalid transcript structure" };
        }

        const segments = content.body.initial_segments;
        const transcript = segments
            .map((segment: any) => segment.snippet?.text || "")
            .filter((text: string) => text.length > 0)
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();

        if (transcript.length > 50) {
            console.log("[Youtubei] Success, length:", transcript.length);
            return { transcript, method: "youtubei.js" };
        }
        return { transcript: null, error: "Transcript too short" };
    } catch (e: any) {
        console.error("[Youtubei] Error:", e.message);
        return { transcript: null, error: e.message };
    }
}

// 方法3: youtube-transcript ライブラリ
async function fetchTranscriptViaLibrary(videoId: string): Promise<TranscriptResult> {
    console.log("[youtube-transcript] Trying library for:", videoId);

    try {
        const { YoutubeTranscript } = await import('youtube-transcript');

        // まず日本語で試行
        try {
            const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'ja' });
            const transcript = transcriptItems.map(item => item.text).join(' ').replace(/\s+/g, ' ').trim();
            if (transcript.length > 50) {
                console.log("[youtube-transcript] Success with ja, length:", transcript.length);
                return { transcript, method: "youtube-transcript" };
            }
        } catch (e) {
            // Try without language preference
        }

        // 言語指定なしで試行
        const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
        const transcript = transcriptItems.map(item => item.text).join(' ').replace(/\s+/g, ' ').trim();
        if (transcript.length > 50) {
            console.log("[youtube-transcript] Success without lang, length:", transcript.length);
            return { transcript, method: "youtube-transcript" };
        }
        return { transcript: null, error: "Transcript too short" };
    } catch (e: any) {
        console.error("[youtube-transcript] Error:", e.message);
        return { transcript: null, error: e.message };
    }
}

// メイン関数: 4つの方法を順番に試行（デバッグ情報付き）
export async function getVideoTranscript(videoId: string): Promise<string> {
    console.log("[getVideoTranscript] Starting multi-method fetch for:", videoId);

    const errors: string[] = [];

    // 方法0: Supadata API (最も信頼性が高い)
    const result0 = await fetchTranscriptViaSupadata(videoId);
    if (result0.transcript) {
        console.log("[getVideoTranscript] Success via Supadata");
        return result0.transcript;
    }
    if (result0.error !== "SUPADATA_API_KEY not set") {
        errors.push(`Supadata: ${result0.error || "failed"}`);
    }

    // 方法1: TimedText API (最も軽量)
    const result1 = await fetchTranscriptViaTimedText(videoId);
    if (result1.transcript) {
        console.log("[getVideoTranscript] Success via TimedText");
        return result1.transcript;
    }
    errors.push(`TimedText: ${result1.error || "failed"}`);

    // 方法2: youtubei.js
    const result2 = await fetchTranscriptViaYoutubei(videoId);
    if (result2.transcript) {
        console.log("[getVideoTranscript] Success via youtubei.js");
        return result2.transcript;
    }
    errors.push(`Youtubei: ${result2.error || "failed"}`);

    // 方法3: youtube-transcript
    const result3 = await fetchTranscriptViaLibrary(videoId);
    if (result3.transcript) {
        console.log("[getVideoTranscript] Success via youtube-transcript");
        return result3.transcript;
    }
    errors.push(`Library: ${result3.error || "failed"}`);

    console.log("[getVideoTranscript] All methods failed:", errors.join("; "));
    return `【字幕取得失敗】${errors.join(" / ")}`; // Return error info for debugging
}

// 動画の情報と字幕を一括取得
export async function fetchVideoData(url: string) {
    const videoId = extractVideoId(url);

    if (!videoId) {
        return {
            success: false as const,
            error: "有効なYouTube URLを入力してください",
        };
    }

    console.log("[fetchVideoData] Fetching data for video:", videoId);

    const [info, transcript] = await Promise.all([
        getVideoInfo(videoId),
        getVideoTranscript(videoId),
    ]);

    console.log("[fetchVideoData] Info:", info.title);
    console.log("[fetchVideoData] Transcript available:", transcript.length > 0, "Length:", transcript.length);

    return {
        success: true as const,
        data: {
            videoId,
            ...info,
            transcript,
            hasTranscript: transcript.length > 0,
        },
    };
}
