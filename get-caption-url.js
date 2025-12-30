// 字幕URLを取得して直接確認
const ytdl = require('@distube/ytdl-core');

async function main() {
    const videoId = 'XOK0s0RQaD4';
    console.log('Getting caption URL for:', videoId);

    try {
        const info = await ytdl.getInfo(`https://www.youtube.com/watch?v=${videoId}`);
        console.log('Title:', info.videoDetails.title);

        const tracks = info.player_response?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        if (!tracks || tracks.length === 0) {
            console.log('No caption tracks available');
            return;
        }

        console.log('\nCaption tracks:');
        tracks.forEach((t, i) => {
            console.log(`[${i}] ${t.languageCode} (${t.kind || 'manual'})`);
            console.log(`    URL: ${t.baseUrl}`);
        });

        const track = tracks[0];
        console.log('\n=== Try this URL in your browser ===');
        console.log('XML URL:', track.baseUrl);
        console.log('\nJSON URL:', track.baseUrl + '&fmt=json3');

    } catch (e) {
        console.log('Error:', e.message);
    }
}

main();
