// 詳細デバッグ付き字幕取得テスト
const ytdl = require('@distube/ytdl-core');
const https = require('https');
const http = require('http');

async function fetchWithDetails(url) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        const req = protocol.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': '*/*',
                'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
            }
        }, (res) => {
            console.log('[Fetch] Status:', res.statusCode);
            console.log('[Fetch] Headers:', JSON.stringify(res.headers, null, 2).substring(0, 500));

            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, data }));
        });
        req.on('error', reject);
        req.setTimeout(30000, () => { req.destroy(); reject(new Error('Timeout')); });
    });
}

async function test() {
    // ユーザーが使用した動画
    const videoId = process.argv[2] || 'YOUR_VIDEO_ID'; // コマンドラインから指定可能

    console.log('='.repeat(60));
    console.log('YouTube Transcript Debug Test');
    console.log('Video ID:', videoId);
    console.log('='.repeat(60));
    console.log('');

    try {
        console.log('[Step 1] Getting video info via ytdl-core...');
        const url = `https://www.youtube.com/watch?v=${videoId}`;
        const info = await ytdl.getInfo(url);

        console.log('[Step 1] Video Title:', info.videoDetails.title);
        console.log('[Step 1] Duration:', info.videoDetails.lengthSeconds, 'seconds');
        console.log('');

        console.log('[Step 2] Checking caption tracks...');
        const captions = info.player_response?.captions?.playerCaptionsTracklistRenderer;

        if (!captions) {
            console.log('[Step 2] ERROR: No captions object in player_response');
            console.log('[Step 2] Available keys in player_response:', Object.keys(info.player_response || {}));
            return;
        }

        const captionTracks = captions.captionTracks;
        if (!captionTracks || captionTracks.length === 0) {
            console.log('[Step 2] ERROR: No caption tracks available');
            console.log('[Step 2] This video might not have subtitles enabled');
            return;
        }

        console.log('[Step 2] Found', captionTracks.length, 'caption track(s):');
        captionTracks.forEach((track, i) => {
            console.log(`  [${i}] Language: ${track.languageCode}, Kind: ${track.kind || 'standard'}, Name: ${track.name?.simpleText || 'N/A'}`);
        });
        console.log('');

        // 日本語または最初のトラックを選択
        let selectedTrack = captionTracks.find(t => t.languageCode === 'ja');
        if (!selectedTrack) {
            selectedTrack = captionTracks.find(t => t.kind === 'asr'); // 自動生成
        }
        if (!selectedTrack) {
            selectedTrack = captionTracks[0];
        }

        console.log('[Step 3] Selected track:', selectedTrack.languageCode, selectedTrack.kind || 'standard');
        console.log('[Step 3] Base URL:', selectedTrack.baseUrl?.substring(0, 100) + '...');
        console.log('');

        // JSON形式で取得を試す
        console.log('[Step 4] Fetching JSON format (fmt=json3)...');
        const jsonUrl = selectedTrack.baseUrl + '&fmt=json3';
        const jsonResult = await fetchWithDetails(jsonUrl);

        console.log('[Step 4] JSON Response length:', jsonResult.data.length);

        if (jsonResult.status === 200 && jsonResult.data.length > 0) {
            try {
                const json = JSON.parse(jsonResult.data);
                console.log('[Step 4] JSON keys:', Object.keys(json));

                if (json.events) {
                    console.log('[Step 4] Events count:', json.events.length);

                    const lines = [];
                    for (const event of json.events) {
                        if (event.segs) {
                            const text = event.segs.map(s => s.utf8 || '').join('');
                            if (text.trim()) lines.push(text.trim());
                        }
                    }

                    console.log('[Step 4] Extracted text segments:', lines.length);

                    if (lines.length > 0) {
                        const transcript = lines.join(' ');
                        console.log('');
                        console.log('='.repeat(60));
                        console.log('TRANSCRIPT PREVIEW (first 2000 chars):');
                        console.log('='.repeat(60));
                        console.log(transcript.substring(0, 2000));
                        console.log('');
                        console.log('Total transcript length:', transcript.length, 'characters');
                        return;
                    }
                }
            } catch (e) {
                console.log('[Step 4] JSON parse error:', e.message);
            }
        }

        // XML形式を試す
        console.log('');
        console.log('[Step 5] Trying XML format (fallback)...');
        const xmlResult = await fetchWithDetails(selectedTrack.baseUrl);

        console.log('[Step 5] XML Response length:', xmlResult.data.length);
        console.log('[Step 5] XML Preview:', xmlResult.data.substring(0, 300));

        const lines = [];
        const regex = /<text[^>]*>([^<]+)<\/text>/g;
        let match;
        while ((match = regex.exec(xmlResult.data)) !== null) {
            const text = match[1]
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&#39;/g, "'")
                .replace(/&quot;/g, '"')
                .trim();
            if (text) lines.push(text);
        }

        console.log('[Step 5] Extracted from XML:', lines.length, 'segments');

        if (lines.length > 0) {
            const transcript = lines.join(' ');
            console.log('');
            console.log('='.repeat(60));
            console.log('TRANSCRIPT PREVIEW (first 2000 chars):');
            console.log('='.repeat(60));
            console.log(transcript.substring(0, 2000));
            console.log('');
            console.log('Total transcript length:', transcript.length, 'characters');
        } else {
            console.log('[Step 5] ERROR: Could not extract any text from captions');
        }

    } catch (e) {
        console.log('');
        console.log('ERROR:', e.message);
        console.log('Stack:', e.stack);
    }
}

// 実行
test();
