const { spawn } = require('child_process');
const path = require('path');

// Path to local yt-dlp binary
const ytDlpPath = path.join(__dirname, 'yt-dlp');

// In-memory cache for video info (5 minute TTL)
const infoCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Clean expired cache entries
const cleanCache = () => {
    const now = Date.now();
    for (const [key, value] of infoCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
            infoCache.delete(key);
        }
    }
};

// Run cache cleanup every minute
setInterval(cleanCache, 60 * 1000);

const getTwitterInfo = async (url) => {
    try {
        console.log('Fetching Twitter info for:', url);

        // Check cache first
        const cacheKey = url;
        const cached = infoCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
             console.log('Returning cached info for:', url);
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
                    reject(new Error(`yt-dlp exited with code ${code}: ${stderr}`));
                } else {
                    try {
                        resolve(JSON.parse(stdout));
                    } catch (e) {
                         reject(new Error(`Failed to parse yt-dlp output: ${e.message}`));
                    }
                }
            });
        });

        const videoDetails = data;
        console.log('Got info from yt-dlp');

        // Twitter videos usually have simpler formats. 
        // We will just return the variants that are actually video/mp4.
        
        let formats = (videoDetails.formats || []).map(f => {
             return {
                url: f.url,
                format_id: f.format_id,
                height: f.height,
                width: f.width,
                ext: f.ext,
                protocol: f.protocol,
                vcodec: f.vcodec,
                acodec: f.acodec
             };
        });

        // Filter for MP4 videos with both audio and video if possible, or just video
        // Twitter HLS streams might be separate, but usually yt-dlp exposes a direct http link to mp4 variants
        const mp4Formats = formats.filter(f => f.ext === 'mp4' && f.vcodec !== 'none');
        
        // Sort by resolution
        mp4Formats.sort((a, b) => (b.height || 0) - (a.height || 0));

        const result = {
            id: videoDetails.id,
            title: videoDetails.title || videoDetails.description || 'Twitter Video',
            description: videoDetails.description,
            thumbnail: videoDetails.thumbnail,
            duration: videoDetails.duration,
            timestamp: videoDetails.timestamp,
            uploader: videoDetails.uploader,
            uploader_id: videoDetails.uploader_id,
            view_count: videoDetails.view_count,
            like_count: videoDetails.like_count,
            repost_count: videoDetails.repost_count,
            comment_count: videoDetails.comment_count,
            formats: mp4Formats.length > 0 ? mp4Formats : formats // Fallback to all if no clear MP4s
        };
        
        infoCache.set(cacheKey, {
            data: result,
            timestamp: Date.now()
        });

        return result;

    } catch (error) {
        console.error('yt-dlp error (Twitter):', error.message);
        throw new Error('Failed to fetch Twitter video details.');
    }
};

const getTwitterDownloadStream = (url) => {
    console.log(`Creating download stream for Twitter: ${url}`);
    
    // For Twitter, we can mostly trust yt-dlp to pick the best video directly or passing -f best
    // We pipe the output.
    const args = ['-o', '-', url];
    
    const ytDlpProcess = spawn(ytDlpPath, args);
    
    ytDlpProcess.on('error', (err) => {
        console.error('Failed to start yt-dlp process:', err);
    });
    
    ytDlpProcess.stderr.on('data', (data) => {
        // console.error('yt-dlp stderr:', data.toString());
    });

    return ytDlpProcess.stdout;
};

module.exports = {
    getTwitterInfo,
    getTwitterDownloadStream
};
