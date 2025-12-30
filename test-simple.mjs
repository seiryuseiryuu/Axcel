// Simple test script for TimedText API only
const videoId = 'dQw4w9WgXcQ'; // Rick Astley

async function test() {
    console.log('Testing video:', videoId);

    const languages = ['en', 'ja'];

    for (const lang of languages) {
        const url = `https://video.google.com/timedtext?lang=${lang}&v=${videoId}`;
        console.log(`\nTrying: ${url}`);

        try {
            const response = await fetch(url);
            const text = await response.text();
            console.log(`Status: ${response.status}`);
            console.log(`Response length: ${text.length}`);
            if (text.length > 0 && text.length < 500) {
                console.log(`Content: ${text}`);
            } else if (text.length > 500) {
                console.log(`First 300 chars: ${text.substring(0, 300)}`);
            }
        } catch (e) {
            console.log(`Error: ${e.message}`);
        }
    }
}

test();
