const { getVideoInfo, getDownloadStream } = require('./video_downloader');

const getFacebookInfo = async (url) => {
    // Validation
    if (!url.match(/facebook\.com|fb\.watch|fb\.com|facebook\.co/i)) {
         throw new Error('Invalid URL. This looks like it might belong to another platform. Please use a Facebook link.');
    }

    try {
        const info = await getVideoInfo(url);
        
        // Facebook specific adjustments if needed
        // For example, ensuring we have a good title
        if (!info.title || info.title === 'Video') {
            info.title = `Facebook Video - ${info.uploader || 'User'}`;
        }
        
        return info;
    } catch (error) {
        throw new Error('Failed to fetch Facebook video details: ' + error.message);
    }
};

const getFacebookDownloadStream = (url) => {
    return getDownloadStream(url);
};

module.exports = {
    getFacebookInfo,
    getFacebookDownloadStream
};
