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

const getYouTubeInfo = async (url) => {
    try {
        console.log('Fetching YouTube info for:', url);

        // Check cache first (using URL as key for simplicity, or extract ID if robust)
        // Extract video ID for better caching
        let videoId = url;
        try {
             const u = new URL(url);
             if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
                 videoId = u.searchParams.get('v') || u.pathname.split('/').pop();
             }
        } catch(e) {}

        const cached = infoCache.get(videoId);
        if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
             console.log('Returning cached info for:', videoId);
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
                    resolve(JSON.parse(stdout));
                }
            });
        });

        const videoDetails = data;
        
        console.log('Got info from yt-dlp');

        // Map yt-dlp formats to our expected format
        const formats = (videoDetails.formats || []).map(f => {
            // Determine type
            let type = 'none';
            const hasVideo = f.vcodec && f.vcodec !== 'none';
            const hasAudio = f.acodec && f.acodec !== 'none';

            if (hasVideo && hasAudio) type = 'both';
            else if (hasVideo) type = 'video';
            else if (hasAudio) type = 'audio';

            return {
                itag: f.format_id, // Use format_id as itag
                qualityLabel: f.format_note || (f.height ? `${f.height}p` : ''),
                container: f.ext,
                hasVideo,
                hasAudio,
                type,
                height: f.height,
                url: f.url
            };
        }).filter(f => f.type !== 'none');

        // Organize formats same as before
        const combined = formats
            .filter(f => f.type === 'both')
            .sort((a, b) => (b.height || 0) - (a.height || 0));
            
        const audioOnly = formats
            .filter(f => f.type === 'audio')
            .sort((a, b) => (b.abr || 0) - (a.abr || 0)); // Sort by bitrate if possible, else it's fine

        const videoOnly = formats
            .filter(f => f.type === 'video')
            .sort((a, b) => (b.height || 0) - (a.height || 0));

        // Create a simplified list for the frontend
        // We want ensure we have at least some playable options
        // mp4 720p/360p valid combos are best for direct play
        
        const resultFormats = [
            ...combined.slice(0, 10),
            ...videoOnly.slice(0, 5),
            ...audioOnly.slice(0, 3)
        ];

        const result = {
            title: videoDetails.title,
            thumbnail: videoDetails.thumbnail,
            duration: videoDetails.duration,
            author: {
                name: videoDetails.uploader,
                avatar: '' // yt-dlp doesn't always give avatar easily in dump-json without extra calls
            },
            formats: resultFormats,
            ffmpegAvailable: true // We are using yt-dlp which handles merging if needed but here we just list formats
        };
        
        infoCache.set(videoId, {
            data: result,
            timestamp: Date.now()
        });

        return result;

    } catch (error) {
        console.error('yt-dlp error:', error.message);
        throw new Error('Failed to fetch video details.');
    }
};

const getYouTubeDownloadStream = (url, itag) => {
    console.log(`Creating download stream for ${url} with format ${itag}`);
    
    // Spawn yt-dlp to output to stdout
    // If itag matches a format_id, use -f
    // If itag is 'best', let it choose
    
    const args = ['-o', '-', url];
    if (itag && itag !== 'undefined') {
        args.push('-f', itag);
    }
    
    // Important: 403 Forbidden happens because of IP mismatch between where URL is signed strings generated 
    // and where it is downloaded. access via yt-dlp directly solves this as it downloads and pipes the bytes.
    
    const ytDlpProcess = spawn(ytDlpPath, args);
    
    // Handle spawn errors
    ytDlpProcess.on('error', (err) => {
        console.error('Failed to start yt-dlp process:', err);
    });
    
    ytDlpProcess.stderr.on('data', (data) => {
        // Log stderr but don't treat all as errors (progress info etc)
        // console.error('yt-dlp stderr:', data.toString());
    });

    return ytDlpProcess.stdout;
};

module.exports = {
    getYouTubeInfo,
    getYouTubeDownloadStream
};
