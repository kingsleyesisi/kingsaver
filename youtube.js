const play = require('play-dl');

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
        // Extract video ID for caching
        const parsed = new URL(url);
        const videoId = parsed.searchParams.get('v') || parsed.pathname.split('/').pop();
        
        if (!videoId) throw new Error('Invalid YouTube URL');
        
        // Check cache first
        const cached = infoCache.get(videoId);
        if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
            console.log('Returning cached info for:', videoId);
            return cached.data;
        }
        
        console.log('Fetching YouTube info for:', videoId);
        
        // Fetch basic info (faster than full info)
        const info = await play.video_basic_info(url);
        const videoDetails = info.video_details;
        
        console.log('Got info, processing formats...');
        
        // Get all available formats
        const allFormats = info.format || [];
        
        // Process formats with better detection
        const simpleFormats = allFormats
            .filter(f => f.url) // Only formats with URLs
            .map(f => {
                // Detect video/audio based on quality string and codecs
                const qualityStr = f.quality || '';
                const hasVideo = f.height && f.height > 0;
                const hasAudio = f.audio_codec && f.audio_codec !== 'none';
                const container = f.mimeType?.split(';')[0].split('/')[1] || 'mp4';
                
                return {
                    itag: f.itag?.toString() || String(Math.random()),
                    qualityLabel: f.qualityLabel || qualityStr || (f.height ? `${f.height}p` : 'Audio'),
                    container,
                    hasVideo,
                    hasAudio,
                    type: hasVideo && hasAudio ? 'both' : hasVideo ? 'video' : 'audio',
                    height: f.height || null
                };
            })
            .filter(f => f.type !== 'none');

        // Organize formats by type
        const combined = simpleFormats
            .filter(f => f.type === 'both')
            .sort((a, b) => (b.height || 0) - (a.height || 0))
            .slice(0, 10);
            
        const audioOnly = simpleFormats
            .filter(f => f.type === 'audio')
            .slice(0, 3);
            
        const videoOnly = simpleFormats
            .filter(f => f.type === 'video')
            .sort((a, b) => (b.height || 0) - (a.height || 0))
            .slice(0, 5);

        const result = {
            title: videoDetails.title,
            thumbnail: videoDetails.thumbnails[0]?.url || '',
            duration: videoDetails.durationInSec,
            author: {
                name: videoDetails.channel?.name || 'Unknown',
                avatar: videoDetails.channel?.icons?.[0]?.url || ''
            },
            formats: [...combined, ...videoOnly, ...audioOnly],
            ffmpegAvailable: false
        };
        
        // Cache the result
        infoCache.set(videoId, {
            data: result,
            timestamp: Date.now()
        });
        
        console.log(`Cached and returning info with ${result.formats.length} formats`);
        
        return result;
    } catch (error) {
        console.error('play-dl error:', error.message);
        throw new Error(error.message || 'Failed to fetch video details. Please check the URL and try again.');
    }
};

const getYouTubeDownloadStream = async (url, itag) => {
    try {
        console.log('Creating download stream for:', url);
        
        // play-dl stream provides the best quality automatically
        const stream = await play.stream(url, {
            quality: 2, // Highest quality
            discordPlayerCompatibility: false
        });
        
        return stream.stream;
    } catch (error) {
        console.error('Failed to create download stream:', error);
        throw error;
    }
};

module.exports = {
    getYouTubeInfo,
    getYouTubeDownloadStream
};
