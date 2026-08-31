const axios = require('axios');
const { scrapeInstagram } = require('./instagram_scraper');
const { getVideoInfo, getDownloadStream } = require('./video_downloader');

const getInstagramInfo = async (url) => {
    // Validation
    if (!url.match(/instagram\.com|instagr\.am/i)) {
        throw new Error('Invalid URL. This looks like it might belong to another platform. Please use an Instagram link.');
    }

    try {
        // 1. Try dedicated embed scraper first (bypasses login and rate limits on Vercel)
        try {
            const data = await scrapeInstagram(url);
            return data;
        } catch (scraperErr) {
            console.warn('[Instagram] Embed scraper failed, trying yt-dlp fallback:', scraperErr.message);
        }

        // 2. Fallback to yt-dlp
        const info = await getVideoInfo(url);
        
        if (!info.title || info.title === 'Video') {
            const shortDesc = info.description ? info.description.substring(0, 50) : '';
            info.title = shortDesc || `Instagram Post - ${info.uploader || 'User'}`;
        }
        
        return info;
    } catch (error) {
        throw new Error('Failed to fetch Instagram post details: ' + error.message);
    }
};

const getInstagramDownloadStream = (url) => {
    // If URL is already a direct CDN media link, stream directly via axios
    if (url.startsWith('http') && (url.includes('cdninstagram.com') || url.includes('fbcdn.net'))) {
        const streamPass = new (require('stream').PassThrough)();
        axios({
            method: 'GET',
            url: url,
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
                'Referer': 'https://www.instagram.com/'
            },
            timeout: 30000
        }).then(response => {
            response.data.pipe(streamPass);
        }).catch(err => {
            streamPass.emit('error', err);
        });
        return streamPass;
    }

    return getDownloadStream(url);
};

module.exports = {
    getInstagramInfo,
    getInstagramDownloadStream
};
