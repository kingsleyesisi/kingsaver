const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const compression = require('compression');
const { getTikTokData } = require('./main');
const { getYouTubeInfo, getYouTubeDownloadStream } = require('./youtube');
const { getTwitterInfo, getTwitterDownloadStream } = require('./twitter');
const { pool, initDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
  
// Enable compression for all responses
app.use(compression());

// Initialize Database
initDb();

// Trust proxy for IP extraction (if behind Vercel/Nginx)
app.set('trust proxy', true);
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Request Logger
app.use((req, res, next) => {
    const start = Date.now();
    const timestamp = new Date().toISOString();
    const { method, url, query, body } = req;

    // Log request details
    console.log(`[${timestamp}] [REQ] ${method} ${url}`);
    if (Object.keys(query).length > 0) console.log(`[${timestamp}] [QUERY]`, JSON.stringify(query));
    // Sanitize body if needed (avoid logging passwords, though not expected here)
    if (body && Object.keys(body).length > 0) console.log(`[${timestamp}] [BODY]`, JSON.stringify(body));

    // Capture response finish
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${new Date().toISOString()}] [RES] ${method} ${url} ${res.statusCode} - ${duration}ms`);
        
        // Track visit in DB (async, don't await)
        // Extract IP (handle proxy headers)
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const userAgent = req.get('User-Agent');
        
        // Only track API requests or main page visits, skip static assets if desired
        // But user said "let it also keep track of visitors", usually implies page views.
        // We will log everything for now, or maybe exclude /api/stats to avoid polluting own stats
        if (url !== '/api/stats' && !url.match(/\.(css|js|jpg|png|ico|svg|woff2)$/)) {
            // Determine Platform
            let platform = 'Web';
            if (url.includes('youtube')) platform = 'YouTube';
            else if (url.includes('tiktok')) platform = 'TikTok';
            else if (url.includes('instagram')) platform = 'Instagram';
            else if (url.includes('facebook')) platform = 'Facebook';
            else if (url.includes('twitter')) platform = 'Twitter';

             const insertQuery = `
                INSERT INTO visits (path, method, ip, user_agent, platform)
                VALUES ($1, $2, $3, $4, $5)
            `;
            pool.query(insertQuery, [url, method, ip, userAgent, platform]).catch(err => console.error('Tracking Error:', err.message));
        }
    });

    next();
});

// Stats API Endpoint (Private)
app.get('/api/stats', async (req, res) => {
    // Basic Auth
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        res.setHeader('WWW-Authenticate', 'Basic');
        return res.status(401).send('Authentication required');
    }

    const auth = new Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
    const user = auth[0];
    const pass = auth[1];

    if (user === 'admin' && pass === 'admin') {
        try {
            // Fetch stats
            const totalVisits = await pool.query('SELECT COUNT(*) FROM visits');
            const visitsByPath = await pool.query('SELECT path, COUNT(*) as count FROM visits GROUP BY path ORDER BY count DESC LIMIT 10');
            const recentVisits = await pool.query('SELECT * FROM visits ORDER BY timestamp DESC LIMIT 20');
            const visitsOverTime = await pool.query(`
                SELECT date_trunc('hour', timestamp) as time, COUNT(*) 
                FROM visits 
                WHERE timestamp > NOW() - INTERVAL '24 hours' 
                GROUP BY 1 
                ORDER BY 1
            `);
            const visitsByPlatform = await pool.query('SELECT platform, COUNT(*) as count FROM visits GROUP BY platform ORDER BY count DESC');

            res.json({
                total: totalVisits.rows[0].count,
                byPath: visitsByPath.rows,
                recent: recentVisits.rows,
                overTime: visitsOverTime.rows,
                byPlatform: visitsByPlatform.rows
            });
        } catch (err) {
            console.error('Stats Query Error:', err);
            res.status(500).json({ error: 'Failed to fetch stats' });
        }
    } else {
        res.setHeader('WWW-Authenticate', 'Basic');
        return res.status(401).send('Invalid credentials');
    }
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

// Instagram API Endpoints
const { getInstagramInfo, getInstagramDownloadStream } = require('./instagram');

app.post('/api/instagram/info', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ error: 'URL is required' });
        const data = await getInstagramInfo(url);
        res.json(data);
    } catch (error) {
        console.error('Error in /api/instagram/info:', error.message);
        res.status(500).json({ error: 'Failed to fetch video data', details: error.message });
    }
});

app.get('/api/instagram/download', async (req, res) => {
    try {
        const { url } = req.query;
        if (!url) return res.status(400).send('URL is required');

        const stream = getInstagramDownloadStream(url);
        
        res.setHeader('Content-Disposition', `attachment; filename="king_saver_instagram_${Date.now()}.mp4"`);
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
        console.error('Error in /api/instagram/download:', error.message);
        res.status(500).send('Failed to initiate download');
    }
});

// Facebook API Endpoints
const { getFacebookInfo, getFacebookDownloadStream } = require('./facebook');

app.post('/api/facebook/info', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ error: 'URL is required' });
        const data = await getFacebookInfo(url);
        res.json(data);
    } catch (error) {
        console.error('Error in /api/facebook/info:', error.message);
        res.status(500).json({ error: 'Failed to fetch video data', details: error.message });
    }
});

app.get('/api/facebook/download', async (req, res) => {
    try {
        const { url } = req.query;
        if (!url) return res.status(400).send('URL is required');

        const stream = getFacebookDownloadStream(url);
        
        res.setHeader('Content-Disposition', `attachment; filename="king_saver_facebook_${Date.now()}.mp4"`);
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
        console.error('Error in /api/facebook/download:', error.message);
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
            
        const contentType = response.headers['content-type'] || 'video/mp4';
        
        let extension = '.mp4';
        if (contentType.includes('image/jpeg')) extension = '.jpg';
        else if (contentType.includes('image/png')) extension = '.png';
        else if (contentType.includes('image/webp')) extension = '.webp';
        else if (contentType.includes('video/webm')) extension = '.webm';
        else if (contentType.includes('audio/mpeg')) extension = '.mp3';
        
        // If filename already has an extension, use it, otherwise append
        if (safeFilename.length > 10) {
             // Keep the start of the filename but ensure extension is preserved if we were strictly trimming
             // But here we are building the filename, so just trim the base name
             safeFilename = safeFilename.substring(0, 10);
        }

        const contentDisposition = `attachment; filename="${safeFilename}${extension}"`;

        res.setHeader('Content-Disposition', contentDisposition);
        res.setHeader('Content-Type', contentType);

        response.data.pipe(res);
    } catch (error) {
        console.error('Error in /api/download:', error.message);
        res.status(500).send('Failed to download video');
    }
});

// Serve index.html for root is handled by express.static
// But for clean URLs locally:
app.get('/stats', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'stats.html'));
});

// ZIP Download Endpoint
const archiver = require('archiver');

app.get('/api/download-zip', async (req, res) => {
    try {
        const { urls, filename } = req.query;
        if (!urls) return res.status(400).send('URLs are required');
        
        const urlArray = Array.isArray(urls) ? urls : [urls];
        const safeFilename = (filename || 'images').replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 50);

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}.zip"`);

        const archive = archiver('zip', {
            zlib: { level: 9 } // Sets the compression level.
        });

        archive.on('error', (err) => {
            console.error('Archive error:', err);
             if (!res.headersSent) res.status(500).send({ error: err.message });
        });

        archive.pipe(res);

        for (let i = 0; i < urlArray.length; i++) {
            const url = urlArray[i];
            try {
                const response = await axios({
                    method: 'GET',
                    url: url,
                    responseType: 'stream'
                });
                
                // Determine extension
                let extension = '.jpg';
                const contentType = response.headers['content-type'];
                 if (contentType) {
                    if (contentType.includes('image/png')) extension = '.png';
                    else if (contentType.includes('image/webp')) extension = '.webp';
                    else if (contentType.includes('image/jpeg')) extension = '.jpg';
                 }
                
                archive.append(response.data, { name: `image_${i + 1}${extension}` });
            } catch (err) {
                 console.error(`Failed to download image ${url} for zip:`, err.message);
                 // We continue even if one fails, or we could append an error text file
            }
        }

        await archive.finalize();

    } catch (error) {
        console.error('Error in /api/download-zip:', error.message);
        if (!res.headersSent) res.status(500).send('Failed to create zip');
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
