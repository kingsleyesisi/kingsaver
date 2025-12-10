const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const { getTikTokData } = require('./main');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Request Logger
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.url}`);
    next();
});

// API Endpoint to get video info
app.post('/api/info', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        const data = await getTikTokData(url);
        res.json(data);
    } catch (error) {
        console.error('Error in /api/info:', error.message);
        res.status(500).json({ error: 'Failed to fetch video data', details: error.message });
    }
});

// API Endpoint to download video (proxy to avoid CORS/Hotlinking issues)
app.get('/api/download', async (req, res) => {
    try {
        const { url, filename } = req.query;
        if (!url) {
            return res.status(400).send('URL is required');
        }

        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'stream'
        });

        // Sanitize filename to ensure it only contains safe characters for headers
        const safeFilename = filename 
            ? filename.replace(/[^a-zA-Z0-9._-]/g, '_') 
            : 'video';
            
        const contentDisposition = `attachment; filename="${safeFilename}.mp4"`;

        res.setHeader('Content-Disposition', contentDisposition);
        res.setHeader('Content-Type', response.headers['content-type'] || 'video/mp4');

        response.data.pipe(res);
    } catch (error) {
        console.error('Error in /api/download:', error.message);
        res.status(500).send('Failed to download video');
    }
});

// Serve index.html for root is handled by express.static


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
