const { spawn } = require('child_process');
const path = require('path');
const { PassThrough } = require('stream');

// Check for ffmpeg availability to decide on merging capabilities
let ffmpegAvailable = false;
try {
    const { execSync } = require('child_process');
    execSync('ffmpeg -version', { stdio: 'ignore' });
    ffmpegAvailable = true;
} catch (e) {
    console.warn("FFmpeg not found. High quality video merging will be disabled.");
    ffmpegAvailable = false;
}

// Helper to identify format type from yt-dlp JSON
const getFormatType = (f) => {
    const hasVideo = f.vcodec !== 'none';
    const hasAudio = f.acodec !== 'none';
    if (hasVideo && hasAudio) return 'both';
    if (hasVideo) return 'video';
    if (hasAudio) return 'audio';
    return 'none';
};

const getYouTubeInfo = (url) => {
    return new Promise((resolve, reject) => {
        const ytDlpPath = path.join(__dirname, 'yt-dlp');
        // Add --js-runtimes node to fix warning/error about missing JS runtime
        const args = ['--js-runtimes', 'node', '-j', url];
        
        const proc = spawn(ytDlpPath, args);
        
        let data = '';
        let errorData = '';

        proc.stdout.on('data', (chunk) => data += chunk);
        proc.stderr.on('data', (chunk) => errorData += chunk);

        proc.on('close', (code) => {
            if (code !== 0) {
                console.error('yt-dlp error:', errorData);
                // Clean up error message for user display
                return reject(new Error(errorData || 'Failed to fetch video details'));
            }

            try {
                const info = JSON.parse(data);
                
                // Filter valid HTTP/HTTPS formats
                const validFormats = info.formats.filter(f => f.protocol === 'https' || f.protocol === 'http');

                const simpleFormats = validFormats.map(f => {
                    return {
                        itag: f.format_id, 
                        qualityLabel: f.format_note || (f.height ? `${f.height}p` : 'Unknown'),
                        container: f.ext,
                        hasVideo: f.vcodec !== 'none',
                        hasAudio: f.acodec !== 'none',
                        type: getFormatType(f),
                        height: f.height,
                        // Helper
                        needsMerging: f.vcodec !== 'none' && f.acodec === 'none'
                    };
                }).filter(f => f.type !== 'none');

                // Filter strategy based on ffmpeg availability
                const combined = simpleFormats.filter(f => f.type === 'both').reverse(); 
                const audioOnly = simpleFormats.filter(f => f.type === 'audio').reverse();
                
                // Only include video-only formats (which need merging) if ffmpeg is available
                let videoOnly = [];
                if (ffmpegAvailable) {
                    videoOnly = simpleFormats.filter(f => f.type === 'video' && f.height >= 1080).reverse();
                }

                resolve({
                    title: info.title,
                    thumbnail: info.thumbnail,
                    duration: info.duration_string,
                    author: {
                        name: info.uploader,
                        avatar: '' 
                    },
                    formats: [...combined, ...videoOnly, ...audioOnly],
                    ffmpegAvailable
                });

            } catch (err) {
                console.error('JSON Parse Error:', err);
                reject(new Error('Failed to parse video data'));
            }
        });
    });
};

const getYouTubeDownloadStream = (url, itag) => {
    const ytDlpPath = path.join(__dirname, 'yt-dlp');
    // Using node runtime
    let args = ['--js-runtimes', 'node'];
    
    // Format selection logic
    // We assume if generic 'itag' is passed, we just fetch it.
    // BUT we need to know if we should attempt merge.
    // yt-dlp is smart: 
    // If we say `-f itag+bestaudio`, and itag HAS audio, it might error or behave weirdly if not handled?
    // Actually, `yt-dlp` syntax `format1+format2` requires both to exist.
    // Safe strategy:
    // If ffmpegAvailable is true, we assume we *might* want to merge if the user selected a high-quality stream.
    // The safest "Try to merge if needed, otherwise just download" command in yt-dlp is complex.
    // However, since we filtered the list in `getInfo`, we know that if we are here:
    // 1. It's a combined format (no merge needed)
    // 2. It's an audio format (no merge needed)
    // 3. It's a video-only format (merge needed AND ffmpeg IS available because we filtered it otherwise)
    
    // So if ffmpegAvailable is true, we can try the merge syntax as a fallback?
    // actually, let's just be specific. `yt-dlp` allows `-f itag`.
    // If it's video only and we just ask for `-f itag`, we get video only (no sound).
    // Use `-f itag+bestaudio/itag` -> Try to merge with best audio, fallback to just itag.
    // And `--merge-output-format mp4`.
    
    if (ffmpegAvailable) {
        args.push('-f', `${itag}+bestaudio/${itag}`);
        args.push('--merge-output-format', 'mp4');
    } else {
        // Vercel / No FFmpeg -> Just download exactly what was asked.
        args.push('-f', itag);
    }

    args.push('-o', '-'); // Output to stdout
    args.push(url);

    console.log('Spawning yt-dlp download with args:', args.join(' '));

    const proc = spawn(ytDlpPath, args);
    const stream = new PassThrough();

    // Pipe stdout to the stream
    proc.stdout.pipe(stream);

    // Handle stderr for logging
    let errorLog = '';
    proc.stderr.on('data', (d) => {
        const msg = d.toString();
        // Ignore progress bars
        if (!msg.includes('[download]') && !msg.trim().startsWith('[0;3')) {
            errorLog += msg;
            console.error(`yt-dlp stderr: ${msg.trim()}`);
        }
    });

    proc.on('close', (code) => {
        if (code !== 0) {
            console.error(`yt-dlp process exited with code ${code}`);
            // If stream hasn't ended or if we want to signal error
            // We can emit error on the stream if it hasn't started piping data?
            // Once data flows, it's hard to send error.
            if (errorLog) {
                // Ideally emit, but might be too late if some bytes went through.
                // console.error(errorLog);
            }
        }
    });
    
    proc.on('error', (err) => {
        console.error('Spawn error:', err);
        stream.emit('error', err);
    });

    return stream;
};

module.exports = {
    getYouTubeInfo,
    getYouTubeDownloadStream
};
