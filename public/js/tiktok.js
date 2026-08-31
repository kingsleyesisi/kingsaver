// Splash Screen Logic
window.addEventListener('load', () => {
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        const app = document.getElementById('app-content');

        if (splash && app) {
            splash.classList.add('opacity-0', 'pointer-events-none');

            // Show app content
            app.classList.remove('hidden');
            // Trigger reflow
            void app.offsetWidth;
            app.classList.remove('opacity-0');
            app.classList.add('flex'); // Restore flex display

            // Remove splash from DOM
            setTimeout(() => splash.remove(), 1000);
        }
    }, 2800);
});

// Tab Switching Logic
function switchTab(tab) {
    const singleBtn = document.getElementById('tab-single');
    const bulkBtn = document.getElementById('tab-bulk');
    const historyBtn = document.getElementById('tab-history');

    const singleArea = document.getElementById('single-input-area');
    const bulkArea = document.getElementById('bulk-input-area');
    const historyArea = document.getElementById('history-area');
    const results = document.getElementById('results');

    // Reset classes
    const activeClass = "px-6 py-2 rounded-lg text-sm font-medium transition-all bg-king-gold text-black shadow-lg";
    const inactiveClass = "px-6 py-2 rounded-lg text-sm font-medium transition-all text-gray-400 hover:text-white";

    if (tab === 'single') {
        singleBtn.className = activeClass;
        bulkBtn.className = inactiveClass;
        historyBtn.className = inactiveClass;
        singleArea.classList.remove('hidden');
        bulkArea.classList.add('hidden');
        historyArea.classList.add('hidden');
        results.innerHTML = ''; // Clear results when switching back
    } else if (tab === 'bulk') {
        singleBtn.className = inactiveClass;
        bulkBtn.className = activeClass;
        historyBtn.className = inactiveClass;
        singleArea.classList.add('hidden');
        bulkArea.classList.remove('hidden');
        historyArea.classList.add('hidden');
        results.innerHTML = '';
    } else if (tab === 'history') {
        singleBtn.className = inactiveClass;
        bulkBtn.className = inactiveClass;
        historyBtn.className = activeClass;
        singleArea.classList.add('hidden');
        bulkArea.classList.add('hidden');
        historyArea.classList.remove('hidden');
        loadHistory(); // Load history when tab is clicked
    }
}

// Logic to fetch video data
async function fetchVideoData(url) {
    try {
        const response = await fetch('/api/info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });
        const data = await response.json();
        
        if (!response.ok) {
            return { error: data.details || data.error || 'Failed to fetch video' };
        }
        
        return data;
    } catch (error) {
        console.error("Error:", error);
        return { error: 'Network error or server is down' };
    }
}

async function triggerDownload(url, btnElement) {
    // UI Feedback
    const iconDefault = btnElement.querySelector('.icon-default');
    const iconLoading = btnElement.querySelectorAll('.icon-loading');
    const textDefault = btnElement.querySelector('.text-default');
    const textLoading = btnElement.querySelector('.text-loading');

    if (iconDefault) iconDefault.classList.add('hidden');
    if (iconLoading) iconLoading.forEach(el => el.classList.remove('hidden'));
    if (textDefault) textDefault.classList.add('hidden');
    if (textLoading) textLoading.classList.remove('hidden');

    try {
        // Direct browser streaming download via anchor with fallback
        const a = document.createElement('a');
        a.href = url;
        a.setAttribute('download', '');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } catch (error) {
        console.error("Direct download failed, using location fallback:", error);
        window.location.href = url;
    } finally {
        setTimeout(() => {
            if (iconDefault) iconDefault.classList.remove('hidden');
            if (iconLoading) iconLoading.forEach(el => el.classList.add('hidden'));
            if (textDefault) textDefault.classList.remove('hidden');
            if (textLoading) textLoading.classList.add('hidden');
        }, 3500);
    }
}

async function triggerBatchDownload(btnElement) {
    const images = JSON.parse(btnElement.getAttribute('data-images'));
    const title = btnElement.getAttribute('data-title');
    
    if (!images || images.length === 0) return alert('No images to download');

    // UI Feedback
    const iconDefault = btnElement.querySelector('.icon-default');
    const textDefault = btnElement.querySelector('.text-default');
    const textLoading = btnElement.querySelector('.text-loading');

    if (iconDefault) iconDefault.classList.add('hidden');
    if (textDefault) textDefault.classList.add('hidden');
    if (textLoading) textLoading.classList.remove('hidden');

    try {
        // Construct URL with query params
        const urlParams = new URLSearchParams();
        images.forEach(url => urlParams.append('urls', url));
        urlParams.append('filename', title);

        const downloadUrl = `/api/download-zip?${urlParams.toString()}`;
        
        // Trigger download
        window.location.href = downloadUrl;

        // Reset UI after a delay (since we can't easily track download finish of a direct link navigation/iframe)
        setTimeout(() => {
             if (iconDefault) iconDefault.classList.remove('hidden');
             if (textDefault) textDefault.classList.remove('hidden');
             if (textLoading) textLoading.classList.add('hidden');
        }, 3000);

    } catch (error) {
        console.error("Batch download failed:", error);
        alert("Download failed. Please try again.");
         if (iconDefault) iconDefault.classList.remove('hidden');
         if (textDefault) textDefault.classList.remove('hidden');
         if (textLoading) textLoading.classList.add('hidden');
    }
}


// Caption Management and Utilities
window.captionStore = window.captionStore || {};

function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

window.copyCaption = async function(captionId, btnElement) {
    const text = window.captionStore[captionId] || '';
    if (!text) return;

    let copied = false;
    if (navigator.clipboard && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(text);
            copied = true;
        } catch (err) {
            console.warn('Clipboard API failed, using fallback', err);
        }
    }
    
    if (!copied) {
        try {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            textarea.style.left = '-9999px';
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();
            copied = document.execCommand('copy');
            document.body.removeChild(textarea);
        } catch (err) {
            console.error('Fallback copy failed', err);
        }
    }

    if (copied && btnElement) {
        const copyIcon = btnElement.querySelector('.icon-copy');
        const checkIcon = btnElement.querySelector('.icon-check');
        const textSpan = btnElement.querySelector('.btn-text');

        if (copyIcon) copyIcon.classList.add('hidden');
        if (checkIcon) checkIcon.classList.remove('hidden');
        if (textSpan) textSpan.innerText = 'Copied!';

        btnElement.classList.add('bg-green-500/20', 'text-green-300', 'border-green-500/40');

        setTimeout(() => {
            if (copyIcon) copyIcon.classList.remove('hidden');
            if (checkIcon) checkIcon.classList.add('hidden');
            if (textSpan) textSpan.innerText = 'Copy';
            btnElement.classList.remove('bg-green-500/20', 'text-green-300', 'border-green-500/40');
        }, 2000);
    }
};

window.toggleCaption = function(captionId) {
    const body = document.getElementById(`caption-body-${captionId}`);
    const chevron = document.getElementById(`caption-chevron-${captionId}`);
    const preview = document.getElementById(`caption-preview-${captionId}`);

    if (body) {
        const isHidden = body.classList.contains('hidden');
        if (isHidden) {
            body.classList.remove('hidden');
            if (chevron) chevron.classList.add('rotate-180');
            if (preview) preview.classList.add('opacity-40');
        } else {
            body.classList.add('hidden');
            if (chevron) chevron.classList.remove('rotate-180');
            if (preview) preview.classList.remove('opacity-40');
        }
    }
};

function renderCaptionComponent(title, captionId, isBulk = false, accentColor = 'gold') {
    if (!title || !title.trim()) {
        return '';
    }

    window.captionStore[captionId] = title;
    const escapedTitle = escapeHtml(title);
    
    const accentColors = {
        gold: {
            text: 'text-king-gold',
            hoverBg: 'hover:bg-king-gold',
            glow: 'hover:border-king-gold/40'
        },
        purple: {
            text: 'text-pink-400',
            hoverBg: 'hover:bg-pink-500',
            glow: 'hover:border-pink-500/40'
        },
        blue: {
            text: 'text-blue-400',
            hoverBg: 'hover:bg-blue-600',
            glow: 'hover:border-blue-500/40'
        },
        white: {
            text: 'text-white',
            hoverBg: 'hover:bg-white',
            glow: 'hover:border-white/40'
        }
    };
    
    const theme = accentColors[accentColor] || accentColors.gold;

    if (isBulk) {
        // Collapsed accordion view by default for bulk downloads to save vertical space
        return `
        <div class="mt-4 mb-2 rounded-2xl bg-white/[0.04] border border-white/10 overflow-hidden transition-all duration-300">
            <div class="flex items-center justify-between p-3.5 cursor-pointer hover:bg-white/[0.07] transition-colors select-none" onclick="toggleCaption('${captionId}')">
                <div class="flex items-center gap-2 min-w-0 pr-2">
                    <span class="text-xs font-semibold uppercase tracking-wider ${theme.text} flex items-center gap-1.5 shrink-0">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/>
                        </svg>
                        Caption
                    </span>
                    <span id="caption-preview-${captionId}" class="text-xs text-gray-400 truncate opacity-75 transition-opacity">${escapedTitle}</span>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                    <button onclick="event.stopPropagation(); copyCaption('${captionId}', this)" class="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 ${theme.hoverBg} hover:text-black text-gray-300 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer border border-white/10 shadow-sm" title="Copy caption">
                        <svg class="w-3.5 h-3.5 icon-copy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                        </svg>
                        <svg class="w-3.5 h-3.5 icon-check hidden text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                        </svg>
                        <span class="btn-text">Copy</span>
                    </button>
                    <button type="button" class="p-1 rounded-lg hover:bg-white/10 text-gray-400 transition-colors" title="Toggle full caption">
                        <svg id="caption-chevron-${captionId}" class="w-4 h-4 transform transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div id="caption-body-${captionId}" class="hidden px-4 pb-4 pt-2 border-t border-white/[0.06] bg-black/30 animate-[fadeIn_0.2s_ease-out]">
                <p class="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap select-text break-words font-sans">${escapedTitle}</p>
            </div>
        </div>
        `;
    }

    // Default Single View: Full caption displayed with sleek copy button
    return `
    <div class="mt-4 mb-2 p-4 rounded-2xl bg-white/[0.04] border border-white/10 relative group/caption transition-all hover:bg-white/[0.06]">
        <div class="flex items-center justify-between gap-2 mb-2.5 pb-2 border-b border-white/[0.06]">
            <span class="text-xs font-semibold uppercase tracking-wider ${theme.text} flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/>
                </svg>
                Caption
            </span>
            <button onclick="copyCaption('${captionId}', this)" class="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 ${theme.hoverBg} hover:text-black text-gray-300 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer border border-white/10 shadow-sm" title="Copy caption">
                <svg class="w-3.5 h-3.5 icon-copy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                </svg>
                <svg class="w-3.5 h-3.5 icon-check hidden text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                <span class="btn-text">Copy</span>
            </button>
        </div>
        <p class="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap select-text break-words font-sans">${escapedTitle}</p>
    </div>
    `;
}

function createResultCard(data, isBulk = false) {
    console.log("createResultCard data:", data); // Debugging

    // Unified Premium Card Design
    // Safely access author properties
    const author = data.author || {};
    const authorName = author.nickname || data.upload_user || 'TikTok User';
    const authorHandle = author.unique_id ? `@${author.unique_id}` : '';
    const authorAvatar = author.avatar || data.upload_user_avatar || 'https://p16-sign-va.tiktokcdn.com/tos-maliva-avt-0068/77f08b1f4ddcfddda7ab521ba665cab9~tplv-tiktokx-cropcenter-q:1080:1080:q70.webp'; // Fallback
    const title = data.title || '';
    const captionId = 'tiktok_' + (data.id || Math.random().toString(36).substring(2, 9));
    
    // Check for slideshow: Type is slideshow, OR images exist (and not empty), OR duration is 0
    // Coerce duration to number just in case
    const duration = Number(data.duration || 0);
    const hasImages = data.images && Array.isArray(data.images) && data.images.length > 0;
    const isSlideshow = data.type === 'slideshow' || hasImages || duration === 0;

    if (isSlideshow) {
        let imagesHtml = '';
        const images = data.images || [];
        
        // If it's a slideshow but no images array (edge case), try to use cover
        if (images.length === 0 && data.cover) {
             images.push(data.cover);
        }

        images.forEach((img, index) => {
            const imgDownloadUrl = `/api/download?url=${encodeURIComponent(img)}&filename=${encodeURIComponent((data.title || 'image').substring(0, 10) + '_' + index)}`;
            
            imagesHtml += `
            <div class="snap-center shrink-0 w-80 flex flex-col gap-3 group">
                <div class="relative rounded-2xl overflow-hidden aspect-[3/4] border border-white/10 bg-gray-900/50 shadow-2xl">
                    <img src="${img}" class="w-full h-full object-cover">
                </div>
                <button onclick="triggerDownload('${imgDownloadUrl}', this)" class="w-full bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-xl font-medium transition-colors border border-white/5 flex items-center justify-center gap-2 group-hover:border-king-gold/50">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 icon-default text-gray-400 group-hover:text-king-gold transition-colors" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
                    </svg>
                    <span class="text-default">Download Photo</span>
                    <span class="text-loading hidden">Downloading...</span>
                    <svg class="animate-spin h-5 w-5 text-white icon-loading hidden" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </button>
            </div>`;
        });

        return `
        <div class="glass rounded-3xl overflow-hidden hover:shadow-2xl hover:shadow-yellow-500/10 transition-all duration-300 animate-[fadeIn_0.5s_ease-out] w-full max-w-5xl bg-black/80 border border-white/10 backdrop-blur-md">
             <div class="p-6 border-b border-white/5">
                <div class="flex items-center gap-4">
                    <div class="relative">
                        <img src="${authorAvatar}" class="w-12 h-12 rounded-full border-2 border-king-gold p-0.5">
                        <div class="absolute -bottom-1 -right-1 bg-black rounded-full p-0.5">
                            <svg class="w-4 h-4 text-king-gold" fill="currentColor" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
                        </div>
                    </div>
                    <div>
                        <p class="text-base font-bold text-white leading-tight">${authorName}</p>
                        <p class="text-xs text-gray-400 font-medium">${authorHandle}</p>
                    </div>
                </div>
                ${renderCaptionComponent(title, captionId, isBulk, 'gold')}
            </div>
            
            <div class="p-6 bg-gradient-to-b from-transparent to-black/50">
                <!-- Action Buttons: Download All Photos -->
                <div class="mb-8">
                     <button onclick="triggerBatchDownload(this)" data-images='${JSON.stringify(images)}' data-title="${(title || 'slideshow').substring(0, 20)}" class="w-full bg-gradient-to-r from-king-gold to-yellow-500 hover:from-yellow-400 hover:to-yellow-500 text-black py-4 px-6 rounded-2xl font-bold text-lg transition-all shadow-xl shadow-yellow-500/20 hover:shadow-yellow-500/40 hover:scale-[1.01] flex items-center justify-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 icon-default" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span class="text-default">Download All ${images.length} Photos (ZIP)</span>
                        <span class="text-loading hidden">Creating ZIP...</span>
                     </button>
                     <p class="text-center text-xs text-gray-500 mt-3">High Quality • Watermark Free</p>
                </div>

                <!-- Carousel Container -->
                <div class="relative -mx-6 px-6">
                    <div class="flex overflow-x-auto snap-x snap-mandatory gap-6 pb-8 scrollbar-hide">
                        ${imagesHtml}
                        <!-- Spacer for end padding -->
                        <div class="shrink-0 w-6"></div> 
                    </div>
                    
                    <!-- Scroll Hint/Fade -->
                    <div class="absolute top-0 right-0 bottom-8 w-12 bg-gradient-to-l from-black/80 to-transparent pointer-events-none"></div>
                </div>
                
                 <div class="flex items-center justify-between text-xs text-gray-500 border-t border-white/5 pt-4 font-mono">
                    <span class="flex items-center gap-1.5"><svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg> ${data.play_count ? data.play_count.toLocaleString() : '0'}</span>
                    <span class="flex items-center gap-1.5"><svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg> ${data.digg_count ? data.digg_count.toLocaleString() : '0'}</span>
                </div>
            </div>
        </div>
        `;
    }

    // Video Card
    // Note: data.play is high-bitrate H.264 (AVC) which is 100% compatible across all devices, browsers, and media players.
    // data.hdplay uses HEVC/H.265 which causes a black screen on web browsers and default media players without HEVC codecs.
    const downloadUrl = data.play || data.hdplay;
    const safeTitle = (data.title || 'tiktok_video').substring(0, 30);
    
    // Use our high-speed proxy endpoint for instant streaming with safe filename
    const proxyDownloadUrl = `/api/download?url=${encodeURIComponent(downloadUrl)}&filename=${encodeURIComponent(safeTitle)}`;

    return `
        <div class="glass rounded-3xl overflow-hidden hover:shadow-2xl hover:shadow-yellow-500/10 transition-all duration-300 animate-[fadeIn_0.5s_ease-out] w-full max-w-xl bg-black/80 border border-white/10 backdrop-blur-md flex flex-col justify-between">
             <div>
                 <div class="p-4 border-b border-white/5 flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <img src="${authorAvatar}" class="w-10 h-10 rounded-full border border-gray-700">
                        <div>
                            <p class="text-sm font-bold text-white leading-tight">${authorName}</p>
                            <p class="text-xs text-gray-500">@${data.author?.unique_id || ''}</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 text-king-gold border border-yellow-500/30 px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm">
                            <svg class="w-3 h-3 text-king-gold" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                            Crystal Clear HD
                        </span>
                        <div class="bg-white/5 px-2 py-1 rounded text-xs font-mono text-gray-300">
                            ${data.duration || '0'}s
                        </div>
                    </div>
                </div>

                <div class="relative group aspect-[9/16] bg-gray-900 border-y border-white/5">
                    <img src="${data.cover}" alt="${title}" class="w-full h-full object-cover">
                    <div class="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-all backdrop-blur-[2px]">
                         
                         <div class="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 flex flex-col items-center gap-2.5">
                            <button onclick="triggerDownload('${proxyDownloadUrl}', this)" class="bg-gradient-to-r from-king-gold to-yellow-500 hover:from-yellow-400 hover:to-yellow-500 text-black px-8 py-3.5 rounded-2xl font-bold text-base shadow-2xl shadow-yellow-500/30 flex items-center gap-2.5 transform hover:scale-105 transition-all cursor-pointer border border-yellow-300/40">
                                 <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 icon-default" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                <span class="text-default flex items-center gap-1.5">
                                    <span>Download HD Video</span>
                                    <span class="bg-black/20 text-black text-xs px-1.5 py-0.5 rounded font-black tracking-wider">No Watermark</span>
                                </span>
                                <span class="text-loading hidden">Downloading Video...</span>
                                <svg class="animate-spin h-5 w-5 text-black icon-loading hidden" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            </button>
                         </div>

                    </div>
                </div>
                
                <div class="p-5 pb-2">
                    ${renderCaptionComponent(title, captionId, isBulk, 'gold')}
                </div>
            </div>

            <div class="px-5 pb-5">
                <div class="flex items-center justify-between text-xs text-gray-500 border-t border-white/5 pt-3 font-mono">
                    <span class="flex items-center gap-1.5"><svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg> ${data.play_count ? data.play_count.toLocaleString() : '0'}</span>
                    <span class="flex items-center gap-1.5"><svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg> ${data.digg_count ? data.digg_count.toLocaleString() : '0'}</span>
                </div>
            </div>
        </div>
    `;
}

async function processSingle() {
    const url = document.getElementById('single-url').value;
    if (!url) return alert("Please enter a URL");

    const loading = document.getElementById('loading');
    const results = document.getElementById('results');

    loading.classList.remove('hidden');
    loading.classList.add('flex');
    results.innerHTML = ''; // Clear previous

    const data = await fetchVideoData(url);

    loading.classList.add('hidden');
    loading.classList.remove('flex');

    if (data && data.error) {
        alert(data.error);
    } else if (data && (data.id || data.images)) {
        saveToHistory(data); // Save to history
        results.innerHTML = createResultCard(data, false);
    } else {
        alert("Failed to fetch video. Please check the link.");
    }
}

async function processBulk() {
    const urls = document.getElementById('bulk-urls').value.split('\n').filter(u => u.trim());
    if (urls.length === 0) return alert("Please enter URLs");

    const loading = document.getElementById('loading');
    const results = document.getElementById('results');

    loading.classList.remove('hidden');
    loading.classList.add('flex');
    results.innerHTML = '';

    for (const url of urls) {
        const data = await fetchVideoData(url.trim());
        if (data && data.id) {
            saveToHistory(data); // Save to history
            results.insertAdjacentHTML('beforeend', createResultCard(data, true));
        }
    }

    loading.classList.add('hidden');
    loading.classList.remove('flex');
}

// History Management
function saveToHistory(data) {
    let history = JSON.parse(localStorage.getItem('kingSaverHistory') || '[]');
    // Check if already exists to avoid duplicates
    if (!history.some(item => item.id === data.id)) {
        history.unshift(data); // Add to beginning
        if (history.length > 50) history.pop(); // Limit to 50 items
        localStorage.setItem('kingSaverHistory', JSON.stringify(history));
    }
}

function loadHistory() {
    const results = document.getElementById('results');
    const history = JSON.parse(localStorage.getItem('kingSaverHistory') || '[]');
    results.innerHTML = '';

    if (history.length === 0) {
        results.innerHTML = '<div class="col-span-1 md:col-span-2 text-center text-gray-500 py-12">No history yet. Start downloading!</div>';
        return;
    }

    history.forEach(data => {
        results.insertAdjacentHTML('beforeend', createResultCard(data, false));
    });
}

function clearHistory() {
    if (confirm('Are you sure you want to clear your download history?')) {
        localStorage.removeItem('kingSaverHistory');
        loadHistory();
    }
}

