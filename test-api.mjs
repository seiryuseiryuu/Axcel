// Test YouTube Data API v3 Captions
const YOUTUBE_API_KEY = 'AIzaSyCn7j7W3QRZKbMOtYh11sGDt0aJKcLEYCU';
const videoId = 'dQw4w9WgXcQ';

async function test() {
    console.log('Testing video:', videoId);

    // Get caption tracks list
    const url = `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=${YOUTUBE_API_KEY}`;
    console.log('\nFetching caption list...');

    try {
        const response = await fetch(url);
        const data = await response.json();
        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(data, null, 2));
    } catch (e) {
        console.log('Error:', e.message);
    }
}

test();
