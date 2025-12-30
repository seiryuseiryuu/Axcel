// Test Supadata API for YouTube transcript
// Based on common API patterns

const testVideoId = 'dQw4w9WgXcQ';

// Supadata API endpoint (typical format)
const SUPADATA_BASE = 'https://api.supadata.ai/v1';

async function testSupadataAPI() {
    console.log('Testing Supadata API for video:', testVideoId);

    // Typical endpoints to try
    const endpoints = [
        `${SUPADATA_BASE}/youtube/transcript?videoId=${testVideoId}`,
        `${SUPADATA_BASE}/transcript?url=https://youtube.com/watch?v=${testVideoId}`,
        `https://api.supadata.ai/youtube/transcript/${testVideoId}`,
    ];

    for (const url of endpoints) {
        console.log('\nTrying:', url);
        try {
            const response = await fetch(url, {
                headers: {
                    'Accept': 'application/json',
                    // Note: API key would be needed
                }
            });
            console.log('Status:', response.status);
            const text = await response.text();
            console.log('Response:', text.substring(0, 500));
        } catch (e) {
            console.log('Error:', e.message);
        }
    }
}

testSupadataAPI();
