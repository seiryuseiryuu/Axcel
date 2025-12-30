// 字幕データを保存して確認
const ytdl = require('@distube/ytdl-core');
const https = require('https');
const fs = require('fs');

async function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        https.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

async function main() {
    const videoId = process.argv[2] || 'XOK0s0RQaD4';
    console.log('Video ID:', videoId);

    try {
        const info = await ytdl.getInfo(`https://www.youtube.com/watch?v=${videoId}`);
        console.log('Title:', info.videoDetails.title);

        const tracks = info.player_response?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        if (!tracks) {
            console.log('No caption tracks');
            return;
        }

        console.log('Tracks:', tracks.length);

        const track = tracks.find(t => t.languageCode === 'ja') || tracks[0];
        console.log('Using:', track.languageCode);

        // JSON形式を取得
        const jsonUrl = track.baseUrl + '&fmt=json3';
        const jsonData = await fetchUrl(jsonUrl);
        fs.writeFileSync('caption-json.txt', jsonData, 'utf8');
        console.log('Saved JSON to caption-json.txt, length:', jsonData.length);

        // XML形式を取得
        const xmlData = await fetchUrl(track.baseUrl);
        fs.writeFileSync('caption-xml.txt', xmlData, 'utf8');
        console.log('Saved XML to caption-xml.txt, length:', xmlData.length);

        // JSONをパースしてみる
        try {
            const json = JSON.parse(jsonData);
            console.log('JSON parsed. Keys:', Object.keys(json));
            if (json.events) {
                console.log('Events:', json.events.length);
                // 最初の5つのイベントを表示
                json.events.slice(0, 5).forEach((e, i) => {
                    console.log(`Event ${i}:`, JSON.stringify(e).substring(0, 200));
                });
            }
        } catch (e) {
            console.log('JSON parse error:', e.message);
        }

    } catch (e) {
        console.log('Error:', e.message);
    }
}

main();
