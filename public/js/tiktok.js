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
        const response = await fetch(url);
        if (!response.ok) throw new Error('Download failed');

        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;

        const disposition = response.headers.get('content-disposition');
        let filename = 'video.mp4';
        if (disposition && disposition.indexOf('attachment') !== -1) {
            const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
            const matches = filenameRegex.exec(disposition);
            if (matches != null && matches[1]) {
                filename = matches[1].replace(/['"]/g, '');
            }
        }

        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        a.remove();

    } catch (error) {
        console.error("Download failed:", error);
        alert("Download failed. Please try again.");
    } finally {
        // Restore UI
        if (iconDefault) iconDefault.classList.remove('hidden');
        if (iconLoading) iconLoading.forEach(el => el.classList.add('hidden'));
        if (textDefault) textDefault.classList.remove('hidden');
        if (textLoading) textLoading.classList.add('hidden');
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


function createResultCard(data) {
    console.log("createResultCard data:", data); // Debugging

    // Unified Premium Card Design
    // Safely access author properties
    const author = data.author || {};
    const authorName = author.nickname || data.upload_user || 'TikTok User';
    const authorHandle = author.unique_id ? `@${author.unique_id}` : '';
    const authorAvatar = author.avatar || data.upload_user_avatar || 'https://p16-sign-va.tiktokcdn.com/tos-maliva-avt-0068/77f08b1f4ddcfddda7ab521ba665cab9~tplv-tiktokx-cropcenter-q:1080:1080:q70.webp'; // Fallback
    const title = data.title || '';
    
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
                <div class="mt-4">
                    <p class="text-gray-200 text-sm leading-relaxed">${title}</p>
                </div>
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
    const downloadUrl = data.play || data.hdplay;
    // Use our proxy endpoint
    const proxyDownloadUrl = `/api/download?url=${encodeURIComponent(downloadUrl)}&filename=${encodeURIComponent((data.title || 'video').substring(0, 10))}`;

    return `
        <div class="glass rounded-3xl overflow-hidden hover:shadow-2xl hover:shadow-yellow-500/10 transition-all duration-300 animate-[fadeIn_0.5s_ease-out] w-full max-w-xl bg-black/80 border border-white/10 backdrop-blur-md">
             <div class="p-4 border-b border-white/5 flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <img src="${authorAvatar}" class="w-10 h-10 rounded-full border border-gray-700">
                    <div>
                        <p class="text-sm font-bold text-white leading-tight">${authorName}</p>
                        <p class="text-xs text-gray-500">@${data.author.unique_id}</p>
                    </div>
                </div>
                 <div class="bg-white/5 px-2 py-1 rounded text-xs font-mono text-gray-300">
                    ${data.duration || '0'}s
                </div>
            </div>

            <div class="relative group aspect-[9/16] bg-gray-900 border-y border-white/5">
                <img src="${data.cover}" alt="${title}" class="w-full h-full object-cover">
                <div class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-[2px]">
                     
                     <div class="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                        <button onclick="triggerDownload('${proxyDownloadUrl}', this)" class="bg-king-gold hover:bg-yellow-400 text-black px-8 py-3 rounded-full font-bold shadow-xl shadow-yellow-500/20 flex items-center gap-2 transform hover:scale-105 transition-all">
                             <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 icon-default" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            <span class="text-default">Download Video</span>
                             <span class="text-loading hidden">Downloading...</span>
                            <svg class="animate-spin h-5 w-5 text-black icon-loading hidden" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        </button>
                     </div>

                </div>
            </div>
            
            <div class="p-5">
                <p class="text-gray-300 text-sm line-clamp-2 mb-4 h-10 leading-relaxed">${title}</p>

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
        results.innerHTML = createResultCard(data);
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
            results.insertAdjacentHTML('beforeend', createResultCard(data));
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
        results.insertAdjacentHTML('beforeend', createResultCard(data));
    });
}

function clearHistory() {
    if (confirm('Are you sure you want to clear your download history?')) {
        localStorage.removeItem('kingSaverHistory');
        loadHistory();
    }
}

