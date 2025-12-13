async function fetchVideoData(url) {
    try {
        const response = await fetch('/api/youtube/info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || data.details || 'Failed to fetch');
        }
        
        return data;
    } catch (error) {
        console.error("Error:", error);
        return { error: error.message };
    }
}

// Make triggerDownload globally accessible so onclick works
// Make triggerDownload globally accessible so onclick works
window.triggerDownload = async function(originalUrl, btnElement) {
    const select = document.getElementById('quality-select');
    const itag = select.value;
    
    if (!itag) return alert('Please select a quality format');

    // UI Feedback
    const oldText = btnElement.innerHTML; // Save innerHTML to preserve icon if any
    btnElement.innerText = 'Downloading...';
    btnElement.disabled = true;
    btnElement.classList.add('opacity-50', 'cursor-not-allowed');

    // Construct the download URL
    const downloadUrl = `/api/youtube/download?url=${encodeURIComponent(originalUrl)}&itag=${itag}`;

    // Trigger download
    window.location.href = downloadUrl;

    // Reset UI
    setTimeout(() => {
        btnElement.innerHTML = oldText;
        btnElement.disabled = false;
        btnElement.classList.remove('opacity-50', 'cursor-not-allowed');
    }, 4000);
}

function createResultCard(data, originalUrl) {
    let qualityOptions = '';
    
    if (data.formats && data.formats.length > 0) {
        data.formats.forEach(format => {
            // Label construction
            let label = format.qualityLabel;
            
            // Helpful context
            if (format.type === 'audio') {
                 label += ' (Audio Only)';
            } else if (format.type === 'both') {
                 label += ' (Audio + Video)';
            } else if (format.type === 'video') {
                 // Even if merged on backend, it's good to know it's high quality
                 label += ' (High Quality)';
            }
            
            label += ` - ${format.container.toUpperCase()}`;
            
            qualityOptions += `<option value="${format.itag}">${label}</option>`;
        });
    } else {
        qualityOptions = '<option disabled>No formats found</option>';
    }
    
    const duration = new Date(data.duration * 1000).toISOString().substr(11, 8).replace(/^00:/, '');

    return `
        <div class="glass rounded-2xl overflow-hidden shadow-2xl w-full max-w-2xl animate-[fadeIn_0.5s_ease-out]">
            <div class="flex flex-col md:flex-row">
                <div class="w-full md:w-1/2 aspect-video md:aspect-auto bg-black relative">
                    <img src="${data.thumbnail}" alt="${data.title}" class="w-full h-full object-cover">
                    <div class="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-xs text-white">
                        ${duration}
                    </div>
                </div>
                    <div class="p-6 w-full md:w-1/2 flex flex-col">
                    <h3 class="text-xl font-bold text-white line-clamp-2 mb-2" title="${data.title}">${data.title}</h3>
                    <div class="flex items-center gap-2 mb-4">
                        ${data.author.avatar ? `<img src="${data.author.avatar}" class="w-6 h-6 rounded-full">` : ''}
                        <p class="text-sm text-gray-400">${data.author.name}</p>
                    </div>
                    
                    <div class="mt-auto space-y-3">
                        <div>
                            <label class="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Select Quality</label>
                            
                            <div class="relative">
                                <select id="quality-select" class="w-full bg-king-dark border border-gray-700 text-white text-sm rounded-lg p-3 outline-none focus:border-red-600 appearance-none cursor-pointer hover:bg-gray-800 transition-colors">
                                    ${qualityOptions}
                                </select>
                                <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                                    <svg class="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                </div>
                            </div>
                        </div>

                        <button onclick="triggerDownload('${originalUrl}', this)" 
                            class="w-full bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 text-white font-bold py-3 px-4 rounded-lg shadow-lg hover:shadow-red-500/20 transform hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2">
                            <span>Download</span>
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Tab Switching Logic
function switchTab(tab) {
    const singleBtn = document.getElementById('tab-single');
    const historyBtn = document.getElementById('tab-history');

    const singleArea = document.getElementById('single-input-area');
    const historyArea = document.getElementById('history-area');
    const results = document.getElementById('results');

    // Reset classes
    const activeClass = "px-6 py-2 rounded-lg text-sm font-medium transition-all bg-king-gold text-black shadow-lg";
    const inactiveClass = "px-6 py-2 rounded-lg text-sm font-medium transition-all text-gray-400 hover:text-white";

    if (tab === 'single') {
        singleBtn.className = activeClass;
        historyBtn.className = inactiveClass;
        singleArea.classList.remove('hidden');
        historyArea.classList.add('hidden');
        results.innerHTML = ''; // Clear results when switching back
    } else if (tab === 'history') {
        singleBtn.className = inactiveClass;
        historyBtn.className = activeClass;
        singleArea.classList.add('hidden');
        historyArea.classList.remove('hidden');
        loadHistory(); // Load history when tab is clicked
    }
}

async function processSingle() {
    const urlInput = document.getElementById('single-url');
    const url = urlInput.value;
    if (!url) return alert("Please enter a YouTube URL");

    const loading = document.getElementById('loading');
    const results = document.getElementById('results');

    loading.classList.remove('hidden');
    loading.classList.add('flex');
    results.innerHTML = ''; 

    const data = await fetchVideoData(url);

    loading.classList.add('hidden');
    loading.classList.remove('flex');

    if (data && !data.error) {
        saveToHistory(data, url); // Save to history with URL
        results.innerHTML = createResultCard(data, url);
    } else {
        alert(data?.error || "Failed to fetch video. Please check the link.");
    }
}

// History Management
function saveToHistory(data, url) {
    let history = JSON.parse(localStorage.getItem('kingSaverYouTubeHistory') || '[]');
    // Create a unique ID if not present (youtube doesn't send explicit ID, uses URL or title as proxy?)
    // data has no ID field in my backend implementation currently. Let's use title + duration as proxy or add ID to backend?
    // Actually, let's use the URL as ID if possible.
    
    // Check if already exists to avoid duplicates
    // We filter by title for now or URL
    if (!history.some(item => item.title === data.title)) {
        // Store only necessary data to recreate card
        const historyItem = { 
            ...data, 
            url: url, // Store original URL
            savedAt: new Date().toISOString() 
        };
        
        history.unshift(historyItem); 
        if (history.length > 50) history.pop(); 
        localStorage.setItem('kingSaverYouTubeHistory', JSON.stringify(history));
    }
}

function loadHistory() {
    const results = document.getElementById('results');
    const history = JSON.parse(localStorage.getItem('kingSaverYouTubeHistory') || '[]');
    results.innerHTML = '';

    if (history.length === 0) {
        results.innerHTML = '<div class="text-center text-gray-500 py-12">No history yet. Start downloading!</div>';
        return;
    }

    history.forEach(data => {
        results.insertAdjacentHTML('beforeend', createResultCard(data, data.url));
    });
}

function clearHistory() {
    if (confirm('Are you sure you want to clear your download history?')) {
        localStorage.removeItem('kingSaverYouTubeHistory');
        loadHistory();
    }
}
