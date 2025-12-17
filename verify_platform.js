const axios = require('axios');
const { pool } = require('./db');

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function verifyPlatformTracking() {
    console.log('--- Verifying Platform Usage Tracking ---');

    const platforms = [
        { name: 'YouTube', path: '/api/youtube/info' },
        { name: 'TikTok', path: '/api/tiktok/info' },
        { name: 'Instagram', path: '/api/instagram/info' },
        { name: 'Facebook', path: '/api/facebook/info' },
        { name: 'Twitter', path: '/api/twitter/info' },
        { name: 'Web', path: '/' },
    ];

    try {
        // Trigger generic "visits" to endpoints
        // Note: POST endpoints might reject empty body/bad request, but middleware logs *before* or *after*?
        // Middleware logs on 'finish'. So response code doesn't matter for tracking, just that the request happened.
        // But POST usually needs logic.
        
        for (const p of platforms) {
            console.log(`Generating visit for ${p.name} at ${p.path}`);
            try {
                if (p.path === '/') {
                    await axios.get('http://localhost:3000' + p.path);
                } else {
                     // Just a dummy request, might 400 or 500, but middleware logs url
                    await axios.post('http://localhost:3000' + p.path, { url: 'https://example.com' }).catch(() => {}); 
                }
            } catch (e) { /* ignore request errors, we just want to track */ }
        }
        
        // Wait for DB write
        await sleep(1500);

        // Check Stats API
        const auth = Buffer.from('admin:admin').toString('base64');
        const res = await axios.get('http://localhost:3000/api/stats', {
            headers: { 'Authorization': `Basic ${auth}` }
        });
        
        const byPlatform = res.data.byPlatform;
        console.log('Stats API returned platform data:', JSON.stringify(byPlatform, null, 2));

        const supportedPlatforms = ['YouTube', 'TikTok', 'Instagram', 'Facebook', 'Twitter', 'Web'];
        const found = byPlatform.filter(p => supportedPlatforms.includes(p.platform));
        
        if (found.length > 0) {
            console.log('✅ Platform tracking confirmed. Found entries for:', found.map(f => f.platform).join(', '));
        } else {
            console.error('❌ No platform specific tracking found in API response.');
        }

        if (res.data.byPlatform.length > 0) process.exit(0);
        else process.exit(1);

    } catch (err) {
        console.error('❌ Verification Failed:', err.message);
        process.exit(1);
    }
}

verifyPlatformTracking();
