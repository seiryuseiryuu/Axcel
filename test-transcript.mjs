// Test script to check YouTube transcript retrieval
// Testing with a popular video that has captions
const videoId = 'dQw4w9WgXcQ'; // Rick Astley - Never Gonna Give You Up (has captions)

async function testTimedText() {
    console.log('\n=== Testing TimedText API ===');
    const languages = ['ja', 'en', 'a.ja', 'a.en'];

    for (const lang of languages) {
        try {
            const url = `https://video.google.com/timedtext?lang=${lang}&v=${videoId}`;
            const response = await fetch(url);
            const text = await response.text();
            console.log(`${lang}: status=${response.status}, length=${text.length}`);
            if (text.length > 100) {
                console.log(`  First 200 chars: ${text.substring(0, 200)}`);
            }
        } catch (e) {
            console.log(`${lang}: Error - ${e.message}`);
        }
    }
}

async function testYoutubei() {
    console.log('\n=== Testing youtubei.js ===');
    try {
        const { Innertube } = await import('youtubei.js/web');
        const youtube = await Innertube.create({ lang: 'ja', location: 'JP' });
        const info = await youtube.getInfo(videoId);
        console.log('Video title:', info.basic_info?.title);

        const transcript = await info.getTranscript();
        if (transcript?.transcript?.content?.body?.initial_segments) {
            const segments = transcript.transcript.content.body.initial_segments;
            console.log('Segments found:', segments.length);
            console.log('First segment:', segments[0]?.snippet?.text);
        } else {
            console.log('No transcript structure found');
        }
    } catch (e) {
        console.log('Error:', e.message);
    }
}

async function testLibrary() {
    console.log('\n=== Testing youtube-transcript ===');
    try {
        const { YoutubeTranscript } = await import('youtube-transcript');
        const transcript = await YoutubeTranscript.fetchTranscript(videoId);
        console.log('Segments:', transcript.length);
        console.log('First:', transcript[0]);
    } catch (e) {
        console.log('Error:', e.message);
    }
}

async function main() {
    console.log('Testing video:', videoId);
    await testTimedText();
    await testYoutubei();
    await testLibrary();
}

main();
