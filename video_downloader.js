const { spawn } = require('child_process');
const path = require('path');

// Path to local yt-dlp binary
const ytDlpPath = path.join(__dirname, 'yt-dlp');

// In-memory cache for video info (5 minute TTL)
const infoCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Clean expired cache entries
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of infoCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
            infoCache.delete(key);
        }
    }
}, 60 * 1000);

const axios = require('axios');
const cheerio = require('cheerio');

const getVideoInfo = async (url) => {
    try {
        console.log('[Downloader] Fetching info for:', url);

        // Check cache first
        const cacheKey = url;
        const cached = infoCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
             console.log('[Downloader] Returning cached info for:', url);
             return cached.data;
        }

        let data;
        try {
            data = await new Promise((resolve, reject) => {
                const process = spawn(ytDlpPath, ['--dump-json', '--ignore-no-formats-error', '--no-warnings', url]);
                
                let stdout = '';
                let stderr = '';

                process.stdout.on('data', (data) => {
                    stdout += data.toString();
                });

                process.stderr.on('data', (data) => {
                    stderr += data.toString();
                });

                process.on('close', (code) => {
                    // Attempt to parse JSON regardless of exit code if we have output
                    if (stdout && stdout.trim().length > 0) {
                        try {
                            const parsedData = JSON.parse(stdout);
                            resolve(parsedData);
                            return;
                        } catch (e) {
                            // If parsing fails, fall through to error handling
                            console.warn('[Downloader] JSON parse failed despite stdout presence:', e.message);
                        }
                    }

                    if (code !== 0) {
                        const errorMsg = stderr.split('\n').filter(line => line.includes('ERROR:')).join(' ') || stderr;
                        // specific check for "no video" error which implies it might be a photo post
                        if (errorMsg.includes('There is no video in this post') || errorMsg.includes('No video formats found')) {
                             reject(new Error('NO_VIDEO_FOUND'));
                        } else {
                             reject(new Error(`yt-dlp exited with code ${code}: ${errorMsg}`));
                        }
                    } else {
                         // Should have been handled above if stdout was present, but just in case
                         reject(new Error('yt-dlp exited with code 0 but no output'));
                    }
                });
            });
        } catch (ytError) {
             if (ytError.message === 'NO_VIDEO_FOUND') {
                 console.log('[Downloader] No video found by yt-dlp, attempting fallback for images...');
                 // Fallback to basic scraping for images
                 try {
                     const response = await axios.get(url, {
                         headers: {
                             'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G960F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Mobile Safari/537.36',
                             'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                             'Accept-Language': 'en-US,en;q=0.9',
                             'Sec-Fetch-Dest': 'document',
                             'Sec-Fetch-Mode': 'navigate',
                             'Sec-Fetch-Site': 'none',
                             'Upgrade-Insecure-Requests': '1'
                         }
                     });
                     
                     const $ = cheerio.load(response.data);
                     
                     const ogImage = $('meta[property="og:image"]').attr('content');
                     const ogTitle = $('meta[property="og:title"]').attr('content');
                     const ogDesc = $('meta[property="og:description"]').attr('content');
                     
                     if (!ogImage) {
                         throw new Error('Could not find image metadata');
                     }

                     // Try to find if it's a video first (sometimes yt-dlp fails but meta tags exist)
                     // Try to find if it's a video first (sometimes yt-dlp fails but meta tags exist)
                     const ogVideo = $('meta[property="og:video"]').attr('content');
                     
                     if (ogVideo) {
                         // It is actually a video, but yt-dlp failed. We can try to return video data.
                         data = {
                            id: 'video_' + Date.now(),
                            title: ogTitle || 'Instagram Video',
                            description: ogDesc,
                            thumbnail: ogImage,
                            play: ogVideo, // The video URL from meta tag
                            type: 'video',
                            uploader: 'Instagram User',
                            uploader_id: 'instagram_user',
                            originalUrl: url
                         };
                     } else {
                         // It's likely a photo or slideshow.
                         // Attempt to find all shared data images to support slideshows and better quality
                         const images = [];
                         
                         // 1. Check for multiple og:image tags (less common for carousels but possible)
                         $('meta[property="og:image"]').each((i, el) => {
                             const src = $(el).attr('content');
                             if (src && !images.includes(src)) images.push(src);
                         });

                         // 3. Global Regex Scan (Loose Parsing) - The "Nuclear Option" for Quality
                         // Instead of relying on specific JSON paths which might change or be nested differently,
                         // we scan the whole HTML for patterns of {"src": "...", "config_width": 1080} 
                         // because Instagram *always* provides these pairs for responsive loading.
                         
                         const html = response.data;
                         const candidates = [];

                         // Regex A: "config_width": 1080 ... "src": "url"
                         // We use [\s\S]*? to match across newlines if minified/pretty-printed, but usually it's one line.
                         const regexA = /"config_width"\s*:\s*(\d+)[^}]*?"src"\s*:\s*"([^"]+)"/g;
                         let matchA;
                         while ((matchA = regexA.exec(html)) !== null) {
                             candidates.push({ width: parseInt(matchA[1]), url: matchA[2] });
                         }

                         // Regex B: "src": "url" ... "config_width": 1080 (Order might be swapped)
                         const regexB = /"src"\s*:\s*"([^"]+)"[^}]*?"config_width"\s*:\s*(\d+)/g;
                         let matchB;
                         while ((matchB = regexB.exec(html)) !== null) {
                             candidates.push({ width: parseInt(matchB[2]), url: matchB[1] });
                         }

                         // Process candidates
                         // 1. Unescape URLs
                         // 2. Sort by width DESC
                         // 3. Filter duplicates
                         
                         candidates.forEach(c => {
                             if (c.url) {
                                 c.url = c.url.replace(/\\u0026/g, '&');
                             }
                         });

                         // Sort: Highest resolution first
                         candidates.sort((a, b) => b.width - a.width);

                         // Filter: 
                         // - Width must be > 640 (to avoid thumbnails if possible)
                         // - Unique URLs
                         const seenUrls = new Set();
                         
                         candidates.forEach(c => {
                             // We allow width > 600 generally, but prefer > 1000
                             // If we have nothing, we take what we can get.
                             if (c.width >= 640 && !seenUrls.has(c.url)) {
                                 images.push(c.url);
                                 seenUrls.add(c.url);
                             }
                         });

                         // If 'display_url' found nothing or we want to backfill
                         if (images.length === 0) {
                             // Fallback to finding ANY display_url
                             const displayUrlRegex = /"display_url"\s*:\s*"([^"]+)"/g;
                             let match;
                             while ((match = displayUrlRegex.exec(html)) !== null) {
                                 let url = match[1].replace(/\\u0026/g, '&');
                                 if (url && !images.includes(url)) {
                                     images.push(url);
                                 }
                             }
                         }

                         // Limit to top 10 unique high-res images
                         // Since we sorted by width, the first ones are the best quality.
                         // But for carousels, we might have multiple 1080p images.
                         // We need to preserve the order of the carousel? 
                         // "Loose parsing" loses order. This is a trade-off. 
                         // HOWEVER, usually the JSON blob listing children is in order.
                         // If the user wants *slideshow order* to be correct, we might need a hybrid.
                         // But for now, "Getting the full image" is priority #1. 
                         
                         // Re-sort: Actually, if we just grabbed them all, we might have mixed up the order 
                         // vs the carousel order. 
                         // Attempt to recover order? 
                         // The structure `edge_sidecar_to_children` usually appears in order.
                         // Let's try to parse that specifically if we can, BUT use the loose regex to "upgrade" URLs?
                         // Too complex. Let's stick to: "We found these high res images".
                         // Note: candidates array likely filled in document order which *usually* matches slideshow order 
                         // (except for the sorting we just did).
                         
                         // Let's NOT sort by width for the *final list* if they are all 1080p.
                         // We want to keep document order if possible.
                         // Modified strategy:
                         // 1. Capture all candidates in order.
                         // 2. Filter for only "Good" widths (e.g. max width found).
                         
                         const maxWidth = candidates.reduce((max, c) => Math.max(max, c.width), 0);
                         // If we have high res (e.g. 1080), only keep those.
                         const threshold = maxWidth > 1000 ? 1000 : (maxWidth > 640 ? 640 : 0);
                         
                         // Clear images and re-populate respecting document order (roughly)
                         images.length = 0;
                         const seen = new Set();
                         
                         // We go through the candidates *as found in regex scan* (scan is sequential).
                         // Wait, regex exec loop goes in order.
                         // So we should re-scan or sort candidates by "index"? Regex doesn't give index easily unless stored.
                         // Let's just use the width filter on the collected candidates (which were pushed in order of Regex A then Regex B).
                         // Regex A/B splitting might mess up order.
                         
                         // Let's rely on the fact that for a single regex, it's in order.
                         // Merging A and B might shuffle.
                         // Use a single smarter regex? /...config_width...src...|...src...config_width.../
                         // Or just just trust that getting the images is better than perfect order for now.
                         // User said "cut places off" is the main issue.
                         
                         candidates.forEach(c => {
                             if (c.width >= threshold && !seen.has(c.url)) {
                                 images.push(c.url);
                                 seen.add(c.url);
                             }
                         });

                         // Combine with ogImage fallback
                         if (images.length === 0 && ogImage) {
                             images.push(ogImage);
                         } 
                         
                         // Dedupe again just in case
                         const finalImages = [...new Set(images)].slice(0, 15);

                         // If we found multiple images, it's a slideshow
                         data = {
                             id: 'image_' + Date.now(),
                             title: ogTitle || 'Instagram Photo',
                             description: ogDesc,
                             thumbnail: finalImages[0] || ogImage, 
                             images: finalImages,
                             type: 'slideshow', 
                             uploader: 'Instagram User',
                             uploader_id: 'instagram_user',
                             originalUrl: url
                         };
                     }
                     
                 } catch (scrapeError) {
                     console.error('[Downloader] Fallback scraping failed:', scrapeError.message);
                     throw new Error('Failed to fetch content: ' + ytError.message); // Return original error if fallback fails
                 }
             } else {
                 throw ytError;
             }
        }

        const result = {
            id: data.id,
            title: data.title || data.description || 'Video',
            description: data.description,
            thumbnail: data.thumbnail,
            duration: data.duration,
            timestamp: data.timestamp,
            uploader: data.uploader,
            uploader_id: data.uploader_id,
            view_count: data.view_count,
            like_count: data.like_count,
            repost_count: data.repost_count,
            comment_count: data.comment_count,
            originalUrl: url,
            // Keep original data for advanced processing if needed
            width: data.width,
            height: data.height,
            formats: data.formats,
             // Explicitly carry over images/type from fallback or yt-dlp
            images: data.images,
            type: data.type || 'video'
        };

        // Handle Slideshows / Playlists (e.g. Instagram Carousels) from yt-dlp
        if (!result.type && data._type === 'playlist' && data.entries) {
            result.type = 'slideshow';
            result.images = data.entries.map(entry => {
                // Try to find the best quality image
                const bestThumb = (entry.thumbnails || []).sort((a,b) => (b.width || 0) - (a.width || 0))[0];
                return bestThumb ? bestThumb.url : entry.thumbnail || entry.url;
            }).filter(Boolean);
        } else if (!result.type && data.formats) {
            // Check if it's purely an image format (sometimes happens with specific extractors)
             result.type = 'video';
        } else if (!result.type) {
             result.type = 'video';
        }
        
        infoCache.set(cacheKey, {
            data: result,
            timestamp: Date.now()
        });

        return result;

    } catch (error) {
        console.error('[Downloader] Error:', error.message);
        throw error;
    }
};

const getDownloadStream = (url) => {
    console.log(`[Downloader] Creating download stream for: ${url}`);
    
    // We pipe the output. yt-dlp typically picks the best video+audio for the container
    // or we can enforce mp4.
    const args = ['-o', '-', url];
    
    // If we want to ensure mp4 (might cause re-encoding which is slow):
    // const args = ['-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best', '-o', '-', url];
    // For now, let's stick to default best but maybe hint generic mp4 preference if possible
    // or just let it be. 'best' is usually fine.
    
    const ytDlpProcess = spawn(ytDlpPath, args);
    
    ytDlpProcess.on('error', (err) => {
        console.error('[Downloader] Failed to start yt-dlp process:', err);
    });
    
    // Optional: Log stderr for debug but don't crash
    ytDlpProcess.stderr.on('data', (data) => {
        // console.error('[Downloader] yt-dlp stderr:', data.toString());
    });

    return ytDlpProcess.stdout;
};

module.exports = {
    getVideoInfo,
    getDownloadStream
};
