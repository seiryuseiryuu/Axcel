"use server";

import { ChannelThumbnail } from "@/types/thumbnail";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// Safe Action Return Type
type ActionResponse<T> = { success: true; data: T } | { success: false; error: string };

export async function fetchChannelInfo(channelUrl: string): Promise<ActionResponse<{ id: string; name: string; icon: string; uploadsPlaylistId: string }>> {
    if (!YOUTUBE_API_KEY) {
        return { success: false, error: "YouTube API Key is not configured." };
    }

    try {
        // Extract handle or channel ID
        let handle = "";
        let channelId = "";

        if (channelUrl.includes("youtube.com/channel/")) {
            channelId = channelUrl.split("/channel/")[1].split("/")[0].split("?")[0];
        } else if (channelUrl.includes("youtube.com/@")) {
            handle = channelUrl.split("/@")[1].split("/")[0].split("?")[0];
        } else if (channelUrl.includes("youtube.com/c/")) {
            handle = channelUrl.split("/c/")[1].split("/")[0].split("?")[0];
        } else if (channelUrl.includes("youtube.com/user/")) {
            handle = channelUrl.split("/user/")[1].split("/")[0].split("?")[0];
        } else if (channelUrl.startsWith("@")) {
            handle = channelUrl.substring(1);
        } else {
            // Try assume it's a handle
            handle = channelUrl;
        }

        // 1. Resolve to Channel ID if handle
        if (handle && !channelId) {
            // FIRST: Try the official forHandle API (most accurate)
            const handleApiUrl = `https://www.googleapis.com/youtube/v3/channels?part=id,snippet&forHandle=${encodeURIComponent(handle)}&key=${YOUTUBE_API_KEY}`;
            console.log("[fetchChannelInfo] Trying forHandle API for:", handle);

            const handleRes = await fetch(handleApiUrl);
            if (handleRes.ok) {
                const handleData = await handleRes.json();
                if (handleData.items && handleData.items.length > 0) {
                    channelId = handleData.items[0].id;
                    console.log("[fetchChannelInfo] Found via forHandle:", channelId);
                }
            }

            // FALLBACK: If forHandle didn't work, try search API (less accurate)
            if (!channelId) {
                console.log("[fetchChannelInfo] forHandle failed, falling back to search API");
                const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent("@" + handle)}&maxResults=1&key=${YOUTUBE_API_KEY}`;
                const searchRes = await fetch(searchUrl);

                if (!searchRes.ok) {
                    const errText = await searchRes.text();
                    console.error("YouTube Search API Error:", errText);
                    try {
                        const errJson = JSON.parse(errText);
                        if (errJson.error?.errors?.[0]?.reason === 'quotaExceeded') {
                            return { success: false, error: "YouTube APIの1日の利用枠を超過しました。明日再度お試しください。" };
                        }
                    } catch (e) { /* ignore parse error */ }
                    return { success: false, error: `YouTube API Error: ${searchRes.status} ${searchRes.statusText}` };
                }

                const searchData = await searchRes.json();
                if (searchData.items && searchData.items.length > 0) {
                    // Verify the channel title or handle matches
                    const foundChannel = searchData.items[0];
                    channelId = foundChannel.snippet.channelId;
                    console.log("[fetchChannelInfo] Found via search:", channelId, foundChannel.snippet.title);
                }
            }
        }

        if (!channelId) {
            return { success: false, error: "チャンネルが見つかりませんでした。URLやハンドル名を確認してください。" };
        }

        // 2. Get Channel Details (Uploads Playlist ID)
        const detailsUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&id=${channelId}&key=${YOUTUBE_API_KEY}`;
        const channelRes = await fetch(detailsUrl);

        if (!channelRes.ok) {
            console.error("YouTube Details API Error:", await channelRes.text());
            return { success: false, error: "チャンネル詳細の取得に失敗しました。API制限の可能性があります。" };
        }

        const channelData = await channelRes.json();

        if (!channelData.items || channelData.items.length === 0) {
            return { success: false, error: "チャンネル詳細データが空でした。" };
        }

        const snippet = channelData.items[0].snippet;
        const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;

        return {
            success: true,
            data: {
                id: channelId,
                name: snippet.title,
                icon: snippet.thumbnails.default.url,
                uploadsPlaylistId
            }
        };

    } catch (e: any) {
        console.error("fetchChannelInfo Exception:", e);
        return { success: false, error: e.message || "予期せぬエラーが発生しました" };
    }
}

export async function fetchChannelVideos(
    channelId: string,
    uploadsPlaylistId: string,
    targetCount: number = 10,  // デフォルト10、サムネイル用は40まで指定可能
    forThumbnail: boolean = false  // サムネイルツール用は緩いフィルタリング
): Promise<ActionResponse<ChannelThumbnail[]>> {
    if (!YOUTUBE_API_KEY) return { success: false, error: "YouTube API Key is not configured." };

    try {
        const validVideos: ChannelThumbnail[] = [];
        let nextPageToken: string | undefined = "";
        let pageCount = 0;
        const TARGET_COUNT = Math.min(targetCount, 40); // 最大40本まで
        // 40本取得のため、最大20ページまで探索（50動画×20ページ=1000動画をチェック可能）
        const MAX_PAGES = forThumbnail ? 20 : 5;

        console.log(`[fetchChannelVideos] Starting: target=${TARGET_COUNT}, forThumbnail=${forThumbnail}, maxPages=${MAX_PAGES}`);

        while (validVideos.length < TARGET_COUNT && pageCount < MAX_PAGES) {
            // 3. Get Videos from Uploads Playlist
            const playlistUrl: string = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=50&key=${YOUTUBE_API_KEY}${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;
            const playlistRes: Response = await fetch(playlistUrl);

            pageCount++;

            if (!playlistRes.ok) {
                console.error("YouTube Playlist API Error:", await playlistRes.text());
                // If first page fails, basic error. If subsequent, return what we have?
                if (validVideos.length === 0) {
                    return { success: false, error: "動画リストの取得に失敗しました。" };
                }
                break; // Stop fetching
            }

            const playlistData: any = await playlistRes.json();
            if (!playlistData.items || playlistData.items.length === 0) {
                break;
            }

            nextPageToken = playlistData.nextPageToken;

            // 4. Fetch detailed video data (REQUIRED for duration check and live stream detection)
            const videoIds = playlistData.items.map((item: any) => item.snippet.resourceId.videoId).join(',');
            const videosRes = await fetch(
                `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,liveStreamingDetails&id=${videoIds}&key=${YOUTUBE_API_KEY}`
            );

            if (!videosRes.ok) {
                console.error("YouTube Videos API Error:", await videosRes.text());
                break;
            }

            const videosData = await videosRes.json();

            if (videosData.items) {
                for (const video of videosData.items) {
                    // Duration parsing (ISO 8601: PT#H#M#S)
                    const duration = video.contentDetails?.duration || "";
                    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);

                    let seconds = 0;
                    if (match) {
                        const h = parseInt((match[1] || "").replace("H", "")) || 0;
                        const m = parseInt((match[2] || "").replace("M", "")) || 0;
                        const s = parseInt((match[3] || "").replace("S", "")) || 0;
                        seconds = h * 3600 + m * 60 + s;
                    }

                    // フィルタリング条件
                    // サムネイル: 90秒以上（ショート確実除外）、2時間以下
                    // 台本分析: 3分〜30分
                    const minDuration = forThumbnail ? 90 : 180;  // サムネイル: 90秒（ショート確実除外）
                    const maxDuration = forThumbnail ? 7200 : 1800; // サムネイル: 2時間、それ以外: 30分
                    const isValidDuration = seconds >= minDuration && seconds <= maxDuration;
                    const noDuration = seconds === 0 && !match;
                    const title = video.snippet.title?.toLowerCase() || "";
                    const desc = video.snippet.description?.toLowerCase() || "";

                    // ショート動画判定（強化版）
                    // 1. タイトル・説明に #shorts があるか
                    // 2. 動画が60秒以下（ショートの定義）
                    const hasShortsKeyword =
                        title.includes("#shorts") ||
                        title.includes("shorts") ||
                        desc.includes("#shorts") ||
                        title.includes("ショート") ||
                        desc.includes("ショート");
                    const isShortByDuration = seconds > 0 && seconds <= 60;
                    const isShorts = hasShortsKeyword || isShortByDuration;

                    // ライブ配信チェック（サムネイル用も含め厳格に）
                    const isLiveStream = video.liveStreamingDetails !== undefined;
                    const liveBroadcastContent = video.snippet?.liveBroadcastContent;
                    const isLiveOrUpcoming = liveBroadcastContent === 'live' || liveBroadcastContent === 'upcoming';

                    // ライブ配信関連のキーワードチェック
                    const hasLiveKeyword =
                        title.includes("ライブ") ||
                        title.includes("live配信") ||
                        title.includes("生配信") ||
                        title.includes("配信アーカイブ") ||
                        title.includes("プレミア公開");

                    // ライブ除外（サムネイル用でも現在配信中・今後配信予定は除外）
                    const shouldExcludeLive = isLiveOrUpcoming || (!forThumbnail && (isLiveStream || hasLiveKeyword));

                    // Skip条件
                    const shouldSkip = !isValidDuration || isShorts || shouldExcludeLive || noDuration;

                    if (shouldSkip) {
                        console.log("[fetchChannelVideos] Skipping:", video.snippet.title,
                            `(${seconds}s, shorts:${isShorts}, live:${isLiveOrUpcoming || isLiveStream})`);
                        continue;
                    }

                    // Skip if we couldn't determine duration
                    if (noDuration) {
                        console.log("[fetchChannelVideos] Skipping video with no duration:", video.snippet.title);
                        continue;
                    }

                    const thumb = video.snippet.thumbnails.maxres?.url
                        || video.snippet.thumbnails.high?.url
                        || video.snippet.thumbnails.medium?.url
                        || video.snippet.thumbnails.standard?.url;

                    if (thumb) {
                        validVideos.push({
                            id: video.id,
                            video_id: video.id,
                            video_title: video.snippet.title,
                            thumbnail_url: thumb,
                            channel_name: video.snippet.channelTitle
                        });
                    }

                    if (validVideos.length >= TARGET_COUNT) break;
                }
            }

            // If we have no next page, stop
            if (!nextPageToken) {
                console.log(`[fetchChannelVideos] No more pages. Total valid: ${validVideos.length}`);
                break;
            }
        }

        console.log(`[fetchChannelVideos] Completed: ${validVideos.length}/${TARGET_COUNT} videos after ${pageCount} pages`);
        return { success: true, data: validVideos };

    } catch (e: any) {
        console.error("fetchChannelVideos Error:", e);
        return { success: false, error: e.message || "動画の取得中にエラーが発生しました。" };
    }
}

// Search similar videos by title within a channel
export async function searchSimilarVideos(
    channelId: string,
    searchQuery: string,
    maxResults: number = 5
): Promise<ChannelThumbnail[]> {
    if (!YOUTUBE_API_KEY || !searchQuery) return [];

    try {
        // Search for videos in the channel matching the query
        const searchRes = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&q=${encodeURIComponent(searchQuery)}&type=video&maxResults=${maxResults * 2}&key=${YOUTUBE_API_KEY}`
        );
        const searchData = await searchRes.json();

        if (!searchData.items || searchData.items.length === 0) return [];

        // Get video details to filter out Shorts
        const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');
        const videosRes = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoIds}&key=${YOUTUBE_API_KEY}`
        );
        const videosData = await videosRes.json();

        const validVideos: ChannelThumbnail[] = [];

        for (const video of videosData.items || []) {
            const duration = video.contentDetails.duration;
            const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
            let seconds = 0;
            if (match) {
                const h = parseInt(match[1]) || 0;
                const m = parseInt(match[2]) || 0;
                const s = parseInt(match[3]) || 0;
                seconds = h * 3600 + m * 60 + s;
            }

            // Skip Shorts (< 61 seconds)
            if (seconds >= 61) {
                const thumb = video.snippet.thumbnails.maxres?.url
                    || video.snippet.thumbnails.high?.url
                    || video.snippet.thumbnails.medium?.url;

                if (thumb) {
                    validVideos.push({
                        id: video.id,
                        video_id: video.id,
                        video_title: video.snippet.title,
                        thumbnail_url: thumb,
                        channel_name: video.snippet.channelTitle
                    });
                }
            }

            if (validVideos.length >= maxResults) break;
        }

        return validVideos;
    } catch (error) {
        console.error("Similar video search error:", error);
        return [];
    }
}

