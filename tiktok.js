const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function expandUrl(url) {
    if (url.includes('vt.tiktok.com') || url.includes('/t/')) {
        try {
            const response = await axios.head(url, {
                maxRedirects: 5,
                validateStatus: status => status >= 200 && status < 400
            });
            return response.request.res.responseUrl || url; // axios follows redirects, responseUrl is the final one
        } catch (error) {
            // If HEAD fails, try GET (some servers block HEAD)
             try {
                const response = await axios.get(url, {
                    maxRedirects: 5,
                    validateStatus: status => status >= 200 && status < 400
                });
                return response.request.res.responseUrl || url;
            } catch (err) {
                 console.warn(`Failed to expand URL ${url}: ${err.message}`);
                 return url;
            }
        }
    }
    return url;
}

function extractVideoId(url) {
    const regex = /\/video\/(\d+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

async function getTikTokData(videoUrl) {
    try {
        const fullUrl = await expandUrl(videoUrl);
        const videoId = extractVideoId(fullUrl);
        
        if (!videoId) {
            console.warn(`Could not extract video ID from ${fullUrl}. Sending original URL to API.`);
        }

        const apiUrl = 'https://www.tikwm.com/api/';
        console.log(`[INFO] Fetching data for: ${fullUrl}`);
        
        const response = await axios.post(apiUrl, {
            url: fullUrl,
            hd: 1
        });

        if (response.data.code !== 0) {
            throw new Error(`API Error: ${response.data.msg || 'Failed to get video information'}`);
        }

        return response.data.data;
    } catch (error) {
        console.error('[ERROR] Fetching data:', error.message);
        throw error;
    }
}

// Function to sanitize filenames
function sanitizeFileName(fileName) {
    return fileName
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, '') 
        .substring(0, 100);
}

// Note: server.js uses its own download proxy, but we can export a download function for CLI or server internal use
async function downloadVideo(videoData, downloadDir = 'downloads') {
    try {
        const videoDownloadUrl = videoData.hdplay || videoData.play;

        // Create downloads directory if it doesn't exist
        const targetDir = path.isAbsolute(downloadDir) ? downloadDir : path.join(__dirname, downloadDir);
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        // Download the video
        console.log('\n⬇️ Downloading video...');
        const videoResponse = await axios({
            method: 'GET',
            url: videoDownloadUrl,
            responseType: 'stream'
        });

        // Create filename from description, fallback to ID if no description
        const safeDescription = videoData.title ? sanitizeFileName(videoData.title) : videoData.id;
        const fileName = `${safeDescription}.mp4`;
        const filePath = path.join(targetDir, fileName);

        const writer = fs.createWriteStream(filePath);
        videoResponse.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => {
                console.log(`✅ Video downloaded successfully: ${fileName}`);
                resolve(filePath);
            });
            writer.on('error', reject);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    }
}

module.exports = {
    getTikTokData,
    downloadVideo,
    expandUrl,
    extractVideoId
};
