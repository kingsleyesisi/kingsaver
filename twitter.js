const { getVideoInfo, getDownloadStream } = require('./video_downloader');

const getTwitterInfo = async (url) => {
    try {
        const videoDetails = await getVideoInfo(url);
        
        // Twitter videos post-processing (Legacy logic preservation)
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
        const mp4Formats = formats.filter(f => f.ext === 'mp4' && f.vcodec !== 'none');
        
        // Sort by resolution
        mp4Formats.sort((a, b) => (b.height || 0) - (a.height || 0));

        // Return the enriched object
        return {
            ...videoDetails,
            formats: mp4Formats.length > 0 ? mp4Formats : formats 
        };

    } catch (error) {
        throw new Error('Failed to fetch Twitter video details: ' + error.message);
    }
};

const getTwitterDownloadStream = (url) => {
    return getDownloadStream(url);
};

module.exports = {
    getTwitterInfo,
    getTwitterDownloadStream
};
