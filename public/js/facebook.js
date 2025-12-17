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
        const response = await fetch('/api/facebook/info', {
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

function createResultCard(data) {
    const downloadUrl = `/api/facebook/download?url=${encodeURIComponent(data.originalUrl || document.getElementById('single-url').value)}`;

    // Fallback if no specific thumbnail or author
    const thumbnail = data.thumbnail || 'https://upload.wikimedia.org/wikipedia/commons/b/b8/2021_Facebook_icon.svg';
    const authorName = data.uploader || 'Facebook User';
    const authorHandle = data.uploader_id ? `@${data.uploader_id}` : '';
    const title = data.description || data.title || 'Facebook Video';

    // Check for slideshow
    if (data.type === 'slideshow' || (data.images && data.images.length > 0)) {
        let imagesHtml = '';
        data.images.forEach((img, index) => {
            const imgDownloadUrl = `/api/download?url=${encodeURIComponent(img)}&filename=${encodeURIComponent((data.title || 'image') + '_' + index)}`;
            
            imagesHtml += `
            <div class="relative group rounded-xl overflow-hidden mb-4 border border-gray-800">
                <img src="${img}" class="w-full h-auto object-cover">
                <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                     <button onclick="triggerDownload('${imgDownloadUrl}', this)" class="bg-blue-600 text-white p-3 rounded-full shadow-lg transform scale-90 group-hover:scale-110 transition-transform">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 icon-default" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
                        </svg>
                     </button>
                </div>
            </div>`;
        });

        return `
        <div class="glass rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 animate-[fadeIn_0.5s_ease-out] w-full max-w-2xl bg-black border border-gray-800 p-6">
             <div class="flex items-start justify-between mb-4">
                <div class="flex items-start gap-4">
                    <div class="flex-shrink-0">
                         <div class="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center overflow-hidden border border-gray-700">
                            <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/></svg>
                        </div>
                    </div>
                    <div class="flex-grow min-w-0">
                        <h3 class="text-lg font-bold text-white truncate">${authorName}</h3>
                        <p class="text-sm text-gray-400">${authorHandle}</p>
                    </div>
                </div>
            </div>
            <p class="text-gray-300 text-sm mb-4">${title}</p>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${imagesHtml}
            </div>
            
             <div class="flex items-center justify-center gap-4 text-xs text-gray-500 border-t border-gray-800 pt-3 mt-4">
                 <div class="flex items-center gap-2 bg-gray-900/50 p-2 rounded-lg justify-center">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                    <span>${data.view_count ? data.view_count.toLocaleString() : 'N/A'}</span>
                </div>
                <div class="flex items-center gap-2 bg-gray-900/50 p-2 rounded-lg justify-center">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                    <span>${data.like_count ? data.like_count.toLocaleString() : 'N/A'}</span>
                </div>
            </div>
        </div>
        `;
    }

    return `
        <div class="glass rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 animate-[fadeIn_0.5s_ease-out] w-full max-w-2xl bg-black border border-gray-800">
            <div class="p-6">
                <div class="flex items-start gap-4">
                    <div class="flex-shrink-0">
                         <div class="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center overflow-hidden border border-gray-700">
                            <!-- Try to use uploader avatar if available in data, else generic -->
                            <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/></svg>
                        </div>
                    </div>
                    <div class="flex-grow min-w-0">
                        <div class="flex items-center justify-between mb-1">
                            <h3 class="text-lg font-bold text-white truncate">${authorName}</h3>
                            <span class="text-xs text-gray-500">${data.duration ? parseFloat(data.duration).toFixed(0) + 's' : ''}</span>
                        </div>
                        <p class="text-sm text-gray-400 mb-3">${authorHandle}</p>
                        <p class="text-sm text-gray-300 line-clamp-3 mb-4">${title}</p>
                        
                        <div class="relative aspect-video rounded-xl overflow-hidden bg-gray-900 mb-6 border border-gray-800">
                            <img src="${thumbnail}" class="w-full h-full object-cover">
                            <div class="absolute inset-0 flex items-center justify-center">
                                <button onclick="triggerDownload('${downloadUrl}', this)" class="bg-blue-600 text-white p-4 rounded-full shadow-lg hover:scale-110 transition-transform">
                                   <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 icon-default" viewBox="0 0 20 20" fill="currentColor">
                                        <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
                                    </svg>
                                    <svg class="animate-spin h-6 w-6 text-white icon-loading hidden" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-4 text-xs text-gray-500 mb-4">
                             <div class="flex items-center gap-2 bg-gray-900/50 p-2 rounded-lg justify-center">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                                <span>${data.view_count ? data.view_count.toLocaleString() : 'N/A'}</span>
                            </div>
                            <div class="flex items-center gap-2 bg-gray-900/50 p-2 rounded-lg justify-center">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                                <span>${data.like_count ? data.like_count.toLocaleString() : 'N/A'}</span>
                            </div>
                        </div>

                        <button onclick="triggerDownload('${downloadUrl}', this)" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg">
                            <span class="text-default">Download Video</span>
                             <span class="text-loading hidden">Starting Download...</span>
                             <svg class="animate-spin h-5 w-5 text-white icon-loading hidden" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        </button>
                    </div>
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
    let history = JSON.parse(localStorage.getItem('kingSaverFacebookHistory') || '[]');
    if (!history.some(item => item.id === data.id)) {
        history.unshift(data);
        if (history.length > 50) history.pop();
        localStorage.setItem('kingSaverFacebookHistory', JSON.stringify(history));
    }
}

function loadHistory() {
    const results = document.getElementById('results');
    const history = JSON.parse(localStorage.getItem('kingSaverFacebookHistory') || '[]');
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
        localStorage.removeItem('kingSaverFacebookHistory');
        loadHistory();
    }
}
