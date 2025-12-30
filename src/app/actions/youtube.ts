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

export async function fetchChannelVideos(channelId: string, uploadsPlaylistId: string): Promise<ActionResponse<ChannelThumbnail[]>> {
    if (!YOUTUBE_API_KEY) return { success: false, error: "YouTube API Key is not configured." };

    try {
        // 3. Get Videos from Uploads Playlist
        const playlistRes = await fetch(
            `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=50&key=${YOUTUBE_API_KEY}`
        );

        if (!playlistRes.ok) {
            console.error("YouTube Playlist API Error:", await playlistRes.text());
            return { success: false, error: "動画リストの取得に失敗しました。" };
        }

        const playlistData = await playlistRes.json();
        if (!playlistData.items || playlistData.items.length === 0) {
            return { success: true, data: [] };
        }

        // 4. Fetch detailed video data (REQUIRED for duration check)
        const videoIds = playlistData.items.map((item: any) => item.snippet.resourceId.videoId).join(',');
        const videosRes = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoIds}&key=${YOUTUBE_API_KEY}`
        );

        if (!videosRes.ok) {
            console.error("YouTube Videos API Error:", await videosRes.text());
            return { success: false, error: "動画詳細情報の取得に失敗しました（排他フィルター適用不可）。" };
        }

        const videosData = await videosRes.json();
        const validVideos: ChannelThumbnail[] = [];

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

                // STRICT Filter for Shorts:
                // 1. Duration must be > 65s (Shorts are <= 60s, add buffer)
                // 2. No "#shorts" or "shorts" in title/description
                // 3. Skip if duration couldn't be parsed (safety first)
                const isShort = seconds > 0 && seconds <= 65;
                const noDuration = seconds === 0 && !match;
                const title = video.snippet.title?.toLowerCase() || "";
                const desc = video.snippet.description?.toLowerCase() || "";

                const hasShortsIndicator =
                    title.includes("#shorts") ||
                    title.includes("shorts") ||
                    desc.includes("#shorts") ||
                    title.includes("ショート");

                // Skip if it looks like a Short
                if (isShort || hasShortsIndicator) {
                    console.log("[fetchChannelVideos] Skipping short:", video.snippet.title, `(${seconds}s)`);
                    continue;
                }

                // Skip if we couldn't determine duration (might be a short)
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

                if (validVideos.length >= 20) break;
            }
        }

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

