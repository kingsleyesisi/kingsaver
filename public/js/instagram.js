// Tab switching logic (Shared pattern)
function switchTab(tab) {
    const singleBtn = document.getElementById('tab-single');
    const historyBtn = document.getElementById('tab-history');

    const singleArea = document.getElementById('single-input-area');
    const historyArea = document.getElementById('history-area');
    const results = document.getElementById('results');

    const activeClass = "px-6 py-2 rounded-lg text-sm font-medium transition-all bg-white text-black shadow-lg hover:bg-gray-200";
    const inactiveClass = "px-6 py-2 rounded-lg text-sm font-medium transition-all text-gray-400 hover:text-white";

    if (tab === 'single') {
        singleBtn.className = activeClass;
        historyBtn.className = inactiveClass;
        singleArea.classList.remove('hidden');
        historyArea.classList.add('hidden');
        results.classList.remove('hidden');
        results.innerHTML = '';
    } else if (tab === 'history') {
        singleBtn.className = inactiveClass;
        historyBtn.className = activeClass;
        singleArea.classList.add('hidden');
        historyArea.classList.remove('hidden');
        results.classList.remove('hidden');
        loadHistory();
    }
}

async function fetchVideoData(url) {
    try {
        const response = await fetch('/api/instagram/info', {
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

        // Reset UI after a delay
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
    const downloadUrl = `/api/instagram/download?url=${encodeURIComponent(data.originalUrl || document.getElementById('single-url').value)}`;

    // Unified Premium Card Design
    const authorName = data.uploader || 'Instagram User';
    const authorHandle = data.uploader_id ? `@${data.uploader_id}` : '';
    // Fallback or generic Instagram avatar if not provided
    const authorAvatar = 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png'; 
    const title = data.description || data.title || 'Instagram Reel/Video';

    // Check for slideshow
    const isSlideshow = data.type === 'slideshow' || (data.images && data.images.length > 0);

    if (isSlideshow) {
        let imagesHtml = '';
        const images = data.images || [];
        
        // De-duplicate images for UI
        const uniqueImages = [...new Set(images)];

        uniqueImages.forEach((img, index) => {
            const imgDownloadUrl = `/api/download?url=${encodeURIComponent(img)}&filename=${encodeURIComponent((data.title || 'image').substring(0, 10) + '_' + index)}`;
            
            imagesHtml += `
            <div class="snap-center shrink-0 w-80 flex flex-col gap-3 group">
                <div class="relative rounded-2xl overflow-hidden aspect-[4/5] border border-white/10 bg-gray-900/50 shadow-2xl">
                    <img src="${img}" class="w-full h-full object-contain bg-black/50">
                </div>
                <button onclick="triggerDownload('${imgDownloadUrl}', this)" class="w-full bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-xl font-medium transition-colors border border-white/5 flex items-center justify-center gap-2 group-hover:border-purple-500/50">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 icon-default text-gray-400 group-hover:text-purple-400 transition-colors" viewBox="0 0 20 20" fill="currentColor">
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
        <div class="glass rounded-3xl overflow-hidden hover:shadow-2xl hover:shadow-pink-500/10 transition-all duration-300 animate-[fadeIn_0.5s_ease-out] w-full max-w-5xl bg-black/80 border border-white/10 backdrop-blur-md">
             <div class="p-6 border-b border-white/5">
                <div class="flex items-center gap-4">
                    <div class="relative">
                        <div class="w-12 h-12 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 p-0.5">
                            <div class="w-full h-full bg-black rounded-full p-0.5 overflow-hidden">
                                 <svg class="w-full h-full text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                            </div>
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
                     <button onclick="triggerBatchDownload(this)" data-images='${JSON.stringify(uniqueImages)}' data-title="${(title || 'slideshow').substring(0, 20)}" class="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white py-4 px-6 rounded-2xl font-bold text-lg transition-all shadow-xl shadow-pink-500/20 hover:shadow-pink-500/40 hover:scale-[1.01] flex items-center justify-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 icon-default" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span class="text-default">Download All ${uniqueImages.length} Photos (ZIP)</span>
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
                    <span class="flex items-center gap-1.5"><svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg> ${data.view_count ? data.view_count.toLocaleString() : 'N/A'}</span>
                    <span class="flex items-center gap-1.5"><svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg> ${data.like_count ? data.like_count.toLocaleString() : 'N/A'}</span>
                </div>
            </div>
        </div>
        `;
    }

    // Video Card
    // Use thumbnail or fallback
    const thumbnail = data.thumbnail || data.cover || 'https://upload.wikimedia.org/wikipedia/commons/e/e7/Instagram_logo_2016.svg';

    return `
        <div class="glass rounded-3xl overflow-hidden hover:shadow-2xl hover:shadow-pink-500/10 transition-all duration-300 animate-[fadeIn_0.5s_ease-out] w-full max-w-xl bg-black/80 border border-white/10 backdrop-blur-md">
             <div class="p-4 border-b border-white/5 flex items-center justify-between">
                <div class="flex items-center gap-3">
                     <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 p-0.5">
                        <div class="w-full h-full bg-black rounded-full p-0.5 overflow-hidden">
                                <svg class="w-full h-full text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                        </div>
                    </div>
                    <div>
                        <p class="text-sm font-bold text-white leading-tight">${authorName}</p>
                        <p class="text-xs text-gray-500">${authorHandle}</p>
                    </div>
                </div>
                 <div class="bg-white/5 px-2 py-1 rounded text-xs font-mono text-gray-300">
                    ${data.duration ? parseFloat(data.duration).toFixed(0) + 's' : ''}
                </div>
            </div>

            <div class="relative group aspect-[9/16] bg-gray-900 border-y border-white/5">
                <img src="${thumbnail}" alt="${title}" class="w-full h-full object-cover">
                <div class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-[2px]">
                     
                     <div class="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                        <button onclick="triggerDownload('${downloadUrl}', this)" class="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-8 py-3 rounded-full font-bold shadow-xl shadow-pink-500/20 flex items-center gap-2 transform hover:scale-105 transition-all">
                             <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 icon-default" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            <span class="text-default">Download Video</span>
                             <span class="text-loading hidden">Downloading...</span>
                            <svg class="animate-spin h-5 w-5 text-white icon-loading hidden" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
                    <span class="flex items-center gap-1.5"><svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg> ${data.view_count ? data.view_count.toLocaleString() : 'N/A'}</span>
                    <span class="flex items-center gap-1.5"><svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg> ${data.like_count ? data.like_count.toLocaleString() : 'N/A'}</span>
                </div>
            </div>
        </div>
    `;
}

async function processSingle() {
    const urlInput = document.getElementById('single-url');
    const url = urlInput.value;
    if (!url) return alert("Please enter a URL");

    const loading = document.getElementById('loading');
    const results = document.getElementById('results');

    loading.classList.remove('hidden');
    loading.classList.add('flex');
    results.innerHTML = '';

    const data = await fetchVideoData(url);

    loading.classList.add('hidden');
    loading.classList.remove('flex');

    if (data && data.error) {
         alert(data.error);
    } else if (data && (data.id || data.images)) {
        // Enhance data object with cache-friendly properties if needed
        data.sourceUrl = url;
        data.timestamp = Date.now();
        
        saveToHistory(data);
        results.innerHTML = createResultCard(data);
    } else {
        alert("Failed to fetch video. Please check the link or try again.");
    }
}

// Download Trigger Logic (Client-side)
async function triggerDownload(url, btnElement) {
    const iconDefault = btnElement.querySelector('.icon-default');
    const iconLoading = btnElement.querySelectorAll('.icon-loading');
    const textDefault = btnElement.querySelector('.text-default');
    const textLoading = btnElement.querySelector('.text-loading');

    if (iconDefault) iconDefault.classList.add('hidden');
    if (iconLoading) iconLoading.forEach(el => el.classList.remove('hidden'));
    if (textDefault) textDefault.classList.add('hidden');
    if (textLoading) textLoading.classList.remove('hidden');

    try {
        await new Promise(r => setTimeout(r, 500));
        window.location.href = url;
    } finally {
        setTimeout(() => {
            if (iconDefault) iconDefault.classList.remove('hidden');
            if (iconLoading) iconLoading.forEach(el => el.classList.add('hidden'));
            if (textDefault) textDefault.classList.remove('hidden');
            if (textLoading) textLoading.classList.add('hidden');
        }, 3000);
    }
}


function saveToHistory(data) {
    let history = JSON.parse(localStorage.getItem('kingSaverInstagramHistory') || '[]');
    if (!history.some(item => item.id === data.id)) {
        history.unshift(data);
        if (history.length > 50) history.pop();
        localStorage.setItem('kingSaverInstagramHistory', JSON.stringify(history));
    }
}

function loadHistory() {
    const results = document.getElementById('results');
    const history = JSON.parse(localStorage.getItem('kingSaverInstagramHistory') || '[]');
    results.innerHTML = '';

    if (history.length === 0) {
        results.innerHTML = '<div class="text-center text-gray-500 py-12">No history yet.</div>';
        return;
    }

    history.forEach(data => {
        results.insertAdjacentHTML('beforeend', createResultCard(data));
    });
}

function clearHistory() {
    if (confirm('Are you sure you want to clear your download history?')) {
        localStorage.removeItem('kingSaverInstagramHistory');
        loadHistory();
    }
}
    