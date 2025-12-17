const { getVideoInfo, getDownloadStream } = require('./video_downloader');

const getInstagramInfo = async (url) => {
    // Validation
    if (!url.match(/instagram\.com|instagr\.am/i)) {
        throw new Error('Invalid URL. This looks like it might belong to another platform. Please use an Instagram link.');
    }

    try {
        const info = await getVideoInfo(url);
        
        // Instagram specific adjustments
        if (!info.title || info.title === 'Video') {
            const shortDesc = info.description ? info.description.substring(0, 50) : '';
            info.title = shortDesc || `Instagram Reel - ${info.uploader || 'User'}`;
        }
        
        return info;
    } catch (error) {
        throw new Error('Failed to fetch Instagram video details: ' + error.message);
    }
};

const getInstagramDownloadStream = (url) => {
    return getDownloadStream(url);
};

module.exports = {
    getInstagramInfo,
    getInstagramDownloadStream
};
