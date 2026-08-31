const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Robust Instagram Scraper using official Embed endpoints.
 * Completely bypasses login requirements, rate-limits, and serverless IP blocks.
 */
async function scrapeInstagram(url) {
    const match = url.match(/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
    const shortcode = match ? match[1] : null;
    if (!shortcode) {
        throw new Error('Invalid Instagram URL. Could not extract post ID.');
    }

    console.log(`[Instagram Scraper] Fetching post: ${shortcode}`);

    const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;
    
    const response = await axios.get(embedUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Referer': 'https://www.instagram.com/'
        },
        timeout: 12000
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // 1. Author information
    const uploader = $('.UsernameText').first().text().trim() || 'Instagram User';
    const avatar = $('.Avatar img').attr('src') || $('.AvatarLoaded').attr('src') || '';

    // 2. Caption
    let caption = $('.Caption').text().trim();
    if (caption.startsWith(uploader)) {
        caption = caption.substring(uploader.length).trim();
    }
    const title = caption || `Instagram Post by ${uploader}`;

    // 3. Check for Video
    let videoUrl = $('video').attr('src') || $('video source').attr('src') || null;
    if (!videoUrl) {
        const mp4Matches = html.match(/https:\\\/\\\/[^"'\s\\]+\.mp4[^"'\s\\]*/g) || [];
        if (mp4Matches.length > 0) {
            videoUrl = mp4Matches[0].replace(/\\\//g, '/').replace(/\\u0026/g, '&');
        }
    }

    // 4. Extract Images (Carousel & Single Photos)
    const images = [];
    $('img').each((i, el) => {
        const src = $(el).attr('src');
        if (src && !src.includes('data:image') && !src.includes('embed/images') && !src.includes('rsrc.php')) {
            if (src.includes('fbcdn.net') || src.includes('cdninstagram.com')) {
                if (!images.includes(src) && src !== avatar) {
                    images.push(src);
                }
            }
        }
    });

    // Fallback script scan for images if none found in img tags
    if (images.length === 0) {
        const imgMatches = html.match(/https:\\\/\\\/[^"'\s\\]+\.(?:jpg|jpeg|webp|png)[^"'\s\\]*/g) || [];
        imgMatches.forEach(img => {
            const clean = img.replace(/\\\//g, '/').replace(/\\u0026/g, '&');
            if ((clean.includes('fbcdn.net') || clean.includes('cdninstagram.com')) && !clean.includes('s150x150') && !images.includes(clean)) {
                images.push(clean);
            }
        });
    }

    const thumbnail = images[0] || avatar || 'https://upload.wikimedia.org/wikipedia/commons/e/e7/Instagram_logo_2016.svg';

    if (videoUrl) {
        return {
            id: shortcode,
            title: title,
            description: caption,
            thumbnail: thumbnail,
            play: videoUrl,
            type: 'video',
            uploader: uploader,
            uploader_id: uploader,
            originalUrl: url,
            duration: 0
        };
    } else if (images.length > 0) {
        return {
            id: shortcode,
            title: title,
            description: caption,
            thumbnail: thumbnail,
            images: images,
            type: images.length > 1 ? 'slideshow' : 'photo',
            uploader: uploader,
            uploader_id: uploader,
            originalUrl: url
        };
    } else {
        throw new Error('Could not extract media from Instagram post. The post might be private or removed.');
    }
}

module.exports = {
    scrapeInstagram
};
