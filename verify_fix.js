const axios = require('axios');
const { pool } = require('./db');
const { spawn } = require('child_process');

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runVerification() {
    console.log('Starting verification...');

    // 1. Verify Vercel Fix (YouTube Info)
    console.log('\n--- Verifying Vercel Fix (YouTube Info) ---');
    try {
        // Use a known safe video
        const res = await axios.post('http://localhost:3000/api/youtube/info', {
            url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw' // Me at the zoo
        });
        console.log('✅ YouTube Info Fetch Success:', res.status);
    } catch (err) {
        console.error('❌ YouTube Info Fetch Failed:', err.response ? err.response.data : err.message);
    }

    // 2. Verify Stats Tracking
    console.log('\n--- Verifying Stats Tracking ---');
    try {
        // Generate a visit
        await axios.get('http://localhost:3000/');
        console.log('Generated visit to /');
        
        // Allow DB write to happen (it's async)
        await sleep(1000);

        // Check DB
        const result = await pool.query('SELECT * FROM visits ORDER BY id DESC LIMIT 1');
        if (result.rows.length > 0) {
            console.log('✅ Visit logged:', result.rows[0]);
        } else {
            console.error('❌ No visits found in DB');
        }
    } catch (err) {
        console.error('❌ Stats Tracking Verification Failed:', err.message);
    }

    // 3. Verify Stats API
    console.log('\n--- Verifying Stats API ---');
    try {
        const auth = Buffer.from('admin:admin').toString('base64');
        const res = await axios.get('http://localhost:3000/api/stats', {
            headers: { 'Authorization': `Basic ${auth}` }
        });
        console.log('✅ Stats API Success:', res.status);
        console.log('Total Visits:', res.data.total);
    } catch (err) {
        console.error('❌ Stats API Failed:', err.response ? err.response.status : err.message);
    }

    process.exit(0);
}

// Start server first? No, assume server is running.
runVerification();
