const { spawn } = require('child_process');
const path = require('path');

// Path to local yt-dlp binary
const ytDlpPath = path.join(__dirname, 'yt-dlp');

// In-memory cache for video info (5 minute TTL)
const infoCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Clean expired cache entries
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of infoCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
            infoCache.delete(key);
        }
    }
}, 60 * 1000);

const getVideoInfo = async (url) => {
    try {
        console.log('[Downloader] Fetching info for:', url);

        // Check cache first
        const cacheKey = url;
        const cached = infoCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
             console.log('[Downloader] Returning cached info for:', url);
             return cached.data;
        }

        const data = await new Promise((resolve, reject) => {
            const process = spawn(ytDlpPath, ['--dump-json', url]);
            
            let stdout = '';
            let stderr = '';

            process.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            process.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            process.on('close', (code) => {
                if (code !== 0) {
                    // Try to extract a meaningful error message from stderr
                    const errorMsg = stderr.split('\n').filter(line => line.includes('ERROR:')).join(' ') || stderr;
                    reject(new Error(`yt-dlp exited with code ${code}: ${errorMsg}`));
                } else {
                    try {
                        resolve(JSON.parse(stdout));
                    } catch (e) {
                         reject(new Error(`Failed to parse yt-dlp output: ${e.message}`));
                    }
                }
            });
        });

        const result = {
            id: data.id,
            title: data.title || data.description || 'Video',
            description: data.description,
            thumbnail: data.thumbnail,
            duration: data.duration,
            timestamp: data.timestamp,
            uploader: data.uploader,
            uploader_id: data.uploader_id,
            view_count: data.view_count,
            like_count: data.like_count,
            repost_count: data.repost_count,
            comment_count: data.comment_count,
            originalUrl: url,
            // Keep original data for advanced processing if needed
            width: data.width,
            height: data.height,
            formats: data.formats
        };

        infoCache.set(cacheKey, {
            data: result,
            timestamp: Date.now()
        });

        return result;

    } catch (error) {
        console.error('[Downloader] Error:', error.message);
        throw error;
    }
};

const getDownloadStream = (url) => {
    console.log(`[Downloader] Creating download stream for: ${url}`);
    
    // We pipe the output. yt-dlp typically picks the best video+audio for the container
    // or we can enforce mp4.
    const args = ['-o', '-', url];
    
    // If we want to ensure mp4 (might cause re-encoding which is slow):
    // const args = ['-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best', '-o', '-', url];
    // For now, let's stick to default best but maybe hint generic mp4 preference if possible
    // or just let it be. 'best' is usually fine.
    
    const ytDlpProcess = spawn(ytDlpPath, args);
    
    ytDlpProcess.on('error', (err) => {
        console.error('[Downloader] Failed to start yt-dlp process:', err);
    });
    
    // Optional: Log stderr for debug but don't crash
    ytDlpProcess.stderr.on('data', (data) => {
        // console.error('[Downloader] yt-dlp stderr:', data.toString());
    });

    return ytDlpProcess.stdout;
};

module.exports = {
    getVideoInfo,
    getDownloadStream
};
