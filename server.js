const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const compression = require('compression');
const { getTikTokData } = require('./main');
const { getYouTubeInfo, getYouTubeDownloadStream } = require('./youtube');
const { getTwitterInfo, getTwitterDownloadStream } = require('./twitter');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable compression for all responses
app.use(compression());
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

// YouTube API Endpoints
app.post('/api/youtube/info', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ error: 'URL is required' });
        const data = await getYouTubeInfo(url);
        res.json(data);
    } catch (error) {
        console.error('Error in /api/youtube/info:', error.message);
        res.status(500).json({ error: 'Failed to fetch video data', details: error.message });
    }
});

app.get('/api/youtube/download', async (req, res) => {
    try {
        const { url, itag } = req.query;
        if (!url || !itag) return res.status(400).send('URL and itag are required');

        const stream = getYouTubeDownloadStream(url, itag);
        
        // We can't easily know the filename beforehand without another info fetch or just generic name
        // We'll use a generic name with a timestamp
        res.setHeader('Content-Disposition', `attachment; filename="king_saver_video_${Date.now()}.mp4"`);
        res.setHeader('Content-Type', 'video/mp4');

        stream.pipe(res).on('error', (err) => {
            console.error('Response pipe error:', err);
            // Response might be partially sent, so we can't easily send 500 here if headers sent
        });
        
        stream.on('error', (err) => {
            console.error('Stream error:', err);
             if (!res.headersSent) res.status(500).send('Download failed');
             else res.end(); // Ensure response ends if headers were sent
        });

    } catch (error) {
        console.error('Error in /api/youtube/download:', error.message);
        res.status(500).send('Failed to initiate download');
    }
});

// Twitter API Endpoints
app.post('/api/twitter/info', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ error: 'URL is required' });
        const data = await getTwitterInfo(url);
        res.json(data);
    } catch (error) {
        console.error('Error in /api/twitter/info:', error.message);
        res.status(500).json({ error: 'Failed to fetch video data', details: error.message });
    }
});

app.get('/api/twitter/download', async (req, res) => {
    try {
        const { url } = req.query;
        if (!url) return res.status(400).send('URL is required');

        const stream = getTwitterDownloadStream(url);
        
        res.setHeader('Content-Disposition', `attachment; filename="king_saver_twitter_${Date.now()}.mp4"`);
        res.setHeader('Content-Type', 'video/mp4');

        stream.pipe(res).on('error', (err) => {
            console.error('Response pipe error:', err);
        });
        
        stream.on('error', (err) => {
            console.error('Stream error:', err);
             if (!res.headersSent) res.status(500).send('Download failed');
             else res.end();
        });

    } catch (error) {
        console.error('Error in /api/twitter/download:', error.message);
        res.status(500).send('Failed to initiate download');
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
        // And strictly limit to 10 characters max
        let safeFilename = filename 
            ? filename.replace(/[^a-zA-Z0-9._-]/g, '_') 
            : 'video';
            
        if (safeFilename.length > 10) {
            safeFilename = safeFilename.substring(0, 10);
        }
            
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
