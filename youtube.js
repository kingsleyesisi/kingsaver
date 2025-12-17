const ytdl = require('@distube/ytdl-core');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

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

// Helper to write cookies from ENV to a temp file for yt-dlp
const ensureCookiesFile = () => {
    if (!process.env.YOUTUBE_COOKIES) return null;
    const cookiesPath = path.join(os.tmpdir(), 'youtube_cookies.txt');
    try {
        fs.writeFileSync(cookiesPath, process.env.YOUTUBE_COOKIES, 'utf8');
        return cookiesPath;
    } catch (e) {
        console.error('Failed to write cookies file:', e);
        return null;
    }
};

const getYouTubeInfo = async (url) => {
    try {
        console.log('Fetching YouTube info for:', url);

        // Check cache
        const cached = infoCache.get(url);
        if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
             console.log('Returning cached info for:', url);
             return cached.data;
        }

        let info;
        try {
            // Try ytdl-core first (faster)
            // Add agents/cookies if provided in env
            const agentOptions = {};
            const cookiesPath = ensureCookiesFile();
            
            // If we have cookies, we can try to create an agent for ytdl-core
            // But ytdl-core allows passing cookies directly in agent options sometimes?
            // Actually @distube/ytdl-core createAgent is good.
            if (cookiesPath) {
                 try {
                    // We need to parse Netscape format to JSON for ytdl-core if we want to use it purely JS
                    // OR we just rely on yt-dlp fallback if ytdl-core fails.
                    // Let's create a generic agent just in case.
                    const agent = ytdl.createAgent(JSON.parse(fs.readFileSync(cookiesPath, 'utf8'))); 
                    // Wait, YOUTUBE_COOKIES usage for ytdl-core implies we have them in JSON? 
                    // The plan says Netscape format for yt-dlp. 
                    // Parsing Netscape to JSON is extra work. 
                    // Let's rely on yt-dlp fallback for signed-in stuff, it's more robust.
                    // But we will print we have cookies.
                    console.log('Cookies detected, available for yt-dlp fallback.');
                 } catch (e) { 
                     // Ignore json parse error if it is netscape format
                 }
            }
            
            // Standard call
            info = await ytdl.getInfo(url);
            console.log('Got info from ytdl-core');

             // Extract formats
            const formats = ytdl.filterFormats(info.formats, 'video');
            
            // Map to our structure
            const resultFormats = formats.map(f => ({
                itag: f.itag,
                qualityLabel: f.qualityLabel,
                container: f.container,
                hasVideo: f.hasVideo,
                hasAudio: f.hasAudio,
                url: f.url
            }));

            const result = {
                title: info.videoDetails.title,
                thumbnail: info.videoDetails.thumbnails[info.videoDetails.thumbnails.length - 1].url, // Best thumbnail
                duration: info.videoDetails.lengthSeconds,
                author: {
                    name: info.videoDetails.author.name,
                    avatar: info.videoDetails.author.thumbnails ? info.videoDetails.author.thumbnails[0].url : ''
                },
                formats: resultFormats,
                ffmpegAvailable: false,
                source: 'ytdl-core'
            };
            
            infoCache.set(url, {
                data: result,
                timestamp: Date.now()
            });

            return result;

        } catch (coreError) {
            console.warn('ytdl-core failed, falling back to yt-dlp:', coreError.message);
            // Fallback to yt-dlp
            return await getYtDlpInfo(url);
        }

    } catch (error) {
        console.error('All YouTube fetch methods failed:', error.message);
        throw new Error('Failed to fetch video details.');
    }
};

// Helper for yt-dlp info (Generic)
const getYtDlpInfo = async (url) => {
    return new Promise((resolve, reject) => {
        // Use --cookies if env var set
        const args = ['--dump-json', url];
        const cookiesPath = ensureCookiesFile();
        if (cookiesPath) {
             args.push('--cookies', cookiesPath);
             args.push('--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        }

        const childProcess = spawn(ytDlpPath, args);
        
        let stdout = '';
        let stderr = '';

        childProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        childProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        childProcess.on('close', (code) => {
            if (code !== 0) {
                return reject(new Error(`yt-dlp exited with code ${code}: ${stderr}`));
            }
            try {
                const videoDetails = JSON.parse(stdout);
                
                // Map yt-dlp format to our format
                // We need to mimic the ytdl-core format structure for the UI to understand it
                // Or update UI to understand both. 
                // Let's coerce into a compatible structure.
                
                const formats = (videoDetails.formats || []).map(f => ({
                    itag: f.format_id, // Use format_id as itag
                    qualityLabel: f.height ? `${f.height}p` : 'audio',
                    container: f.ext,
                    hasVideo: f.vcodec !== 'none',
                    hasAudio: f.acodec !== 'none',
                    url: f.url
                })).filter(f => f.container === 'mp4' && f.hasVideo && f.hasAudio); 
                // Note: yt-dlp often separates audio/video. 
                // We should prioritize "best" pre-merged formats usually found in 'formats' or use 'url' from main object if available.
                
                // If no pre-merged formats found, we might just return the raw videoDetails options and let the downloader handle merging (complex).
                // For now, let's just return what we find.
                
                const result = {
                    title: videoDetails.title,
                    thumbnail: videoDetails.thumbnail,
                    duration: videoDetails.duration,
                    author: {
                        name: videoDetails.uploader,
                        avatar: '' // yt-dlp doesn't always give avatar
                    },
                    formats: formats.length > 0 ? formats : [],
                    ffmpegAvailable: true, // Signal that we can do advanced stuff if needed
                    source: 'yt-dlp',
                    // Fallback download url if no formats
                    play: videoDetails.url 
                };

                // Cache it
                infoCache.set(url, { data: result, timestamp: Date.now() });
                resolve(result);

            } catch (e) {
                reject(new Error(`Failed to parse yt-dlp output: ${e.message}`));
            }
        });
    });
};

const getYouTubeDownloadStream = (url, itag) => {
    console.log(`Creating download stream for ${url} with format ${itag}`);
    try {
        // We need to know if we should use ytdl-core or yt-dlp
        // But since we want to be robust, we can try ytdl-core, if it fails, fallback.
        // HOWEVER, ytdl-core streams error out asynchronously.
        
        // Strategy: 
        // If itag looks like a number (ytdl-core standard itags), try ytdl-core.
        // If itag is complex or we know we need yt-dlp logic, use yt-dlp.
        // But really, we should likely just try one and fallback.
        // Since we can't easily fallback a stream once started, we might need to rely on what 'getYouTubeInfo' told us?
        // Actually, let's just use yt-dlp spawning for everything if ytdl-core is reliably failing on Vercel.
        
        // HYBRID APPROACH:
        // Try ytdl-core. If it throws immediately, switch.
        
        try {
             const options = {
                quality: itag || 'highest',
                filter: format => format.container === 'mp4'
            };
            return ytdl(url, options);
        } catch (e) {
            console.log("ytdl-core stream creation worked, but stream might fail later. Using it for now.");
            throw e; 
        }

    } catch (error) {
        console.error('ytdl-core immediate error, falling back to yt-dlp:', error);
        return getYtDlpStream(url);
    }
};

const getYtDlpStream = (url) => {
    console.log("Spawning yt-dlp for stream...");
    const args = ['-o', '-', url]; // dump to stdout
    const cookiesPath = ensureCookiesFile();
    if (cookiesPath) {
        args.push('--cookies', cookiesPath);
        args.push('--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    }
    
    // We might want -f best?
    
    const child = spawn(ytDlpPath, args);
    // Log stderr for debugging
    child.stderr.on('data', d => console.log('yt-dlp stderr:', d.toString()));
    return child.stdout;
}

module.exports = {
    getYouTubeInfo,
    getYouTubeDownloadStream
};
