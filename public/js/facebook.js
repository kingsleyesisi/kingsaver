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

function renderCaptionComponent(title, captionId, isBulk = false, accentColor = 'blue') {
    if (!title || !title.trim()) {
        return '';
    }

    window.captionStore[captionId] = title;
    const escapedTitle = escapeHtml(title);
    
    const theme = {
        text: 'text-blue-400',
        hoverBg: 'hover:bg-blue-600',
        glow: 'hover:border-blue-500/40'
    };

    if (isBulk) {
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
                    <button onclick="event.stopPropagation(); copyCaption('${captionId}', this)" class="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 ${theme.hoverBg} hover:text-white text-gray-300 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer border border-white/10 shadow-sm" title="Copy caption">
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

    return `
    <div class="mt-4 mb-2 p-4 rounded-2xl bg-white/[0.04] border border-white/10 relative group/caption transition-all hover:bg-white/[0.06]">
        <div class="flex items-center justify-between gap-2 mb-2.5 pb-2 border-b border-white/[0.06]">
            <span class="text-xs font-semibold uppercase tracking-wider ${theme.text} flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/>
                </svg>
                Caption
            </span>
            <button onclick="copyCaption('${captionId}', this)" class="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 ${theme.hoverBg} hover:text-white text-gray-300 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer border border-white/10 shadow-sm" title="Copy caption">
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
    const downloadUrl = `/api/facebook/download?url=${encodeURIComponent(data.originalUrl || document.getElementById('single-url')?.value || '')}`;

    // Fallback if no specific thumbnail or author
    const thumbnail = data.thumbnail || 'https://upload.wikimedia.org/wikipedia/commons/b/b8/2021_Facebook_icon.svg';
    const authorName = data.uploader || 'Facebook User';
    const authorHandle = data.uploader_id ? `@${data.uploader_id}` : '';
    const title = data.description || data.title || 'Facebook Video';
    const captionId = 'fb_' + (data.id || Math.random().toString(36).substring(2, 9));

    // Check for slideshow
    if (data.type === 'slideshow' || (data.images && data.images.length > 0)) {
        let imagesHtml = '';
        data.images.forEach((img, index) => {
            const imgDownloadUrl = `/api/download?url=${encodeURIComponent(img)}&filename=${encodeURIComponent((data.title || 'image') + '_' + index)}`;
            
            imagesHtml += `
            <div class="relative group rounded-xl overflow-hidden mb-4 border border-gray-800">
                <img src="${img}" class="w-full h-auto object-cover">
                <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                     <button onclick="triggerDownload('${imgDownloadUrl}', this)" class="bg-blue-600 text-white p-3 rounded-full shadow-lg transform scale-90 group-hover:scale-110 transition-transform cursor-pointer">
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
            ${renderCaptionComponent(title, captionId, isBulk, 'blue')}
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
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
                            <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/></svg>
                        </div>
                    </div>
                    <div class="flex-grow min-w-0">
                        <div class="flex items-center justify-between mb-1">
                            <h3 class="text-lg font-bold text-white truncate">${authorName}</h3>
                            <span class="text-xs text-gray-500">${data.duration ? parseFloat(data.duration).toFixed(0) + 's' : ''}</span>
                        </div>
                        <p class="text-sm text-gray-400 mb-3">${authorHandle}</p>
                        
                        <div class="relative aspect-video rounded-xl overflow-hidden bg-gray-900 mb-4 border border-gray-800">
                            <img src="${thumbnail}" class="w-full h-full object-cover">
                            <div class="absolute inset-0 flex items-center justify-center">
                                <button onclick="triggerDownload('${downloadUrl}', this)" class="bg-blue-600 text-white p-4 rounded-full shadow-lg hover:scale-110 transition-transform cursor-pointer">
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

                        ${renderCaptionComponent(title, captionId, isBulk, 'blue')}

                        <div class="grid grid-cols-2 gap-4 text-xs text-gray-500 mb-4 mt-4">
                             <div class="flex items-center gap-2 bg-gray-900/50 p-2 rounded-lg justify-center">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                                <span>${data.view_count ? data.view_count.toLocaleString() : 'N/A'}</span>
                            </div>
                            <div class="flex items-center gap-2 bg-gray-900/50 p-2 rounded-lg justify-center">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                                <span>${data.like_count ? data.like_count.toLocaleString() : 'N/A'}</span>
                            </div>
                        </div>

                        <button onclick="triggerDownload('${downloadUrl}', this)" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg cursor-pointer">
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
        results.innerHTML = createResultCard(data, false);
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
        results.insertAdjacentHTML('beforeend', createResultCard(data, false));
    });
}

function clearHistory() {
    if (confirm('Are you sure you want to clear your download history?')) {
        localStorage.removeItem('kingSaverFacebookHistory');
        loadHistory();
    }
}
