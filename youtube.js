const ytdl = require('@distube/ytdl-core');

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

        // Check cache
        const cached = infoCache.get(url);
        if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
             console.log('Returning cached info for:', url);
             return cached.data;
        }

        const info = await ytdl.getInfo(url);
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
            ffmpegAvailable: false 
        };
        
        infoCache.set(url, {
            data: result,
            timestamp: Date.now()
        });

        return result;

    } catch (error) {
        console.error('ytdl-core error:', error.message);
        throw new Error('Failed to fetch video details.');
    }
};

const getYouTubeDownloadStream = (url, itag) => {
    console.log(`Creating download stream for ${url} with format ${itag}`);
    try {
        // Use ytdl-core to get the stream
        // Valid options: quality: itag or 'highest'/'lowest'
        const options = {
            quality: itag || 'highest',
            filter: format => format.container === 'mp4'
        };
        return ytdl(url, options);
    } catch (error) {
        console.error('ytdl stream error:', error);
        throw error;
    }
};

module.exports = {
    getYouTubeInfo,
    getYouTubeDownloadStream
};
