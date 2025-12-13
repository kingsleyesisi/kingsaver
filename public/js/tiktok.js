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
        return await response.json();
    } catch (error) {
        console.error("Error:", error);
        return null;
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

function createResultCard(data) {
    // Determine best download URL (Standard Quality preferred for max compatibility)
    const downloadUrl = data.play || data.hdplay;
    // Use our proxy endpoint
    const proxyDownloadUrl = `/api/download?url=${encodeURIComponent(downloadUrl)}&filename=${encodeURIComponent(data.title || 'video')}`;

    return `
        <div class="glass rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-yellow-500/10 transition-all duration-300 animate-[fadeIn_0.5s_ease-out]">
            <div class="relative aspect-video bg-gray-900 group">
                <img src="${data.cover}" alt="${data.title}" class="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity">
                <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                        <button onclick="triggerDownload('${proxyDownloadUrl}', this)" class="bg-king-gold text-black p-4 rounded-full shadow-lg transform scale-90 group-hover:scale-110 transition-transform">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 icon-default" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
                        </svg>
                        <svg class="animate-spin h-8 w-8 text-black icon-loading hidden" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        </button>
                </div>
                <div class="absolute top-2 right-2 bg-black/60 px-2 py-1 rounded-md text-xs font-mono text-white">
                    ${(data.duration)}s
                </div>
            </div>
            <div class="p-5">
                <div class="flex items-start justify-between mb-3">
                    <div class="flex items-center gap-2">
                        <img src="${data.author.avatar}" class="w-8 h-8 rounded-full border border-gray-700">
                        <div>
                            <p class="text-sm font-bold text-white leading-tight">${data.author.nickname}</p>
                            <p class="text-xs text-gray-500">@${data.author.unique_id}</p>
                        </div>
                    </div>
                </div>
                <p class="text-gray-300 text-sm line-clamp-2 mb-4 h-10">${data.title}</p>

                <div class="flex items-center justify-between text-xs text-gray-500 border-t border-gray-800 pt-3">
                    <span class="flex items-center gap-1"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> ${data.play_count}</span>
                    <span class="flex items-center gap-1"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg> ${data.digg_count}</span>
                </div>

                    <button onclick="triggerDownload('${proxyDownloadUrl}', this)" class="block mt-4 w-full bg-gray-800 hover:bg-gray-700 text-white text-center py-3 rounded-lg font-medium transition-colors border border-gray-700 hover:border-king-gold/50 flex items-center justify-center gap-2">
                    <span class="text-default">Download Auto</span>
                    <span class="text-loading hidden">Downloading...</span>
                    <svg class="animate-spin h-5 w-5 text-white icon-loading hidden" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </button>
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

    if (data && data.id) {
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
