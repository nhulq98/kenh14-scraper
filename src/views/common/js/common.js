
// DOM Elements
const urlInput = document.getElementById('urlInput');
const scrapeBtn = document.getElementById('scrapeBtn');
const clearInput = document.getElementById('clearInput');
const outputText = document.getElementById('outputText');
const copyBtn = document.getElementById('copyBtn');
const summarizeBtn = document.getElementById('summarizeBtn');
const inputStatus = document.getElementById('inputStatus');
const outputStatus = document.getElementById('outputStatus');
const charCount = document.getElementById('charCount');

const geminiOutput = document.getElementById('geminiOutput');
const copyGeminiBtn = document.getElementById('copyGeminiBtn');
const geminiStatus = document.getElementById('geminiStatus');
const geminiCount = document.getElementById('geminiCount');

const BATCH_HISTORY_KEY = 'batch_history_v1';

// Event Listeners
scrapeBtn.addEventListener('click', scrapeArticle);
clearInput.addEventListener('click', clearAll);
copyBtn.addEventListener('click', () => copyToClipboard(outputText, outputStatus));
copyGeminiBtn.addEventListener('click', () => copyToClipboard(geminiOutput, geminiStatus));
summarizeBtn.addEventListener('click', summarizeWithGemini);

outputText.addEventListener('input', updateCharCount);
geminiOutput.addEventListener('input', updateGeminiCount);

urlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') scrapeArticle();
});

// Functions
function clearAll() {
    urlInput.value = '';
    outputText.value = '';
    geminiOutput.value = '';
    inputStatus.classList.remove('show');
    outputStatus.classList.remove('show');
    geminiStatus.classList.remove('show');
    charCount.textContent = '';
    geminiCount.textContent = '';
    urlInput.focus();
}

async function scrapeArticle() {
    const url = urlInput.value.trim();

    if (!url) {
        showStatus(inputStatus, 'error', '❌ Vui lòng nhập URL');
        return;
    }

    if (!url.includes('kenh14.vn') && !url.includes('saostar.vn')) {
        showStatus(inputStatus, 'error', '❌ URL phải từ kenh14.vn hoặc saostar.vn');
        return;
    }

    scrapeBtn.disabled = true;
    showStatus(inputStatus, 'loading', '<span class="spinner"></span>Đang lấy dữ liệu...');
    outputText.value = '';
    geminiOutput.value = '';

    try {
        const response = await fetch('/api/scrape', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });

        const data = await response.json();

        if (!data.success) {
            showStatus(inputStatus, 'error', '❌ ' + data.error);
            outputText.value = '';
        } else {
            outputText.value = data.content;
            showStatus(inputStatus, 'success', '✅ Lấy dữ liệu thành công!');
            updateCharCount();
        }
    } catch (error) {
        console.error('Error:', error);
        showStatus(inputStatus, 'error', '❌ Lỗi: ' + error.message);
        outputText.value = '';
    } finally {
        scrapeBtn.disabled = false;
    }
}

async function summarizeWithGemini() {
    const content = outputText.value.trim();

    if (!content) {
        showStatus(geminiStatus, 'error', '❌ Chưa có nội dung để tóm tắt');
        return;
    }

    summarizeBtn.disabled = true;
    showStatus(geminiStatus, 'loading', '<span class="spinner"></span>Gemini đang tóm tắt...');
    geminiOutput.value = '';

    try {
        const response = await fetch('/api/summarize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
        });

        const data = await response.json();

        if (!data.success) {
            showStatus(geminiStatus, 'error', '❌ ' + data.error);
            geminiOutput.value = '';
        } else {
            geminiOutput.value = data.summary;
            showStatus(geminiStatus, 'success', '✅ Tóm tắt thành công!');
            updateGeminiCount();
        }
    } catch (error) {
        console.error('Error:', error);
        showStatus(geminiStatus, 'error', '❌ Lỗi: ' + error.message);
        geminiOutput.value = '';
    } finally {
        summarizeBtn.disabled = false;
    }
}

function showStatus(element, type, message) {
    element.className = `status show ${type}`;
    element.innerHTML = message;
}

function copyToClipboard(textarea, statusElement) {
    if (!textarea.value) {
        showStatus(statusElement, 'error', '❌ Không có nội dung để copy');
        return;
    }

    navigator.clipboard.writeText(textarea.value)
        .then(() => {
            showStatus(statusElement, 'success', '✅ Đã copy vào clipboard!');
            setTimeout(() => statusElement.classList.remove('show'), 2000);
        })
        .catch(() => {
            showStatus(statusElement, 'error', '❌ Lỗi khi copy');
        });
}

function updateCharCount() {
    const length = outputText.value.length;
    const words = outputText.value.trim().split(/\s+/).filter(w => w).length;
    charCount.textContent = `📊 ${length} ký tự | ${words} từ`;
}

function updateGeminiCount() {
    const length = geminiOutput.value.length;
    const words = geminiOutput.value.trim().split(/\s+/).filter(w => w).length;
    geminiCount.textContent = `📊 ${length} ký tự | ${words} từ`;
}

// Focus on input on load
window.addEventListener('load', () => {
    urlInput.focus();
    loadTrending()

    // THÊM DÒNG NÀY
    batchLoadHistory();
});

// ===== TRENDING FUNCTIONS =====

// localStorage cache key and duration (1 day)
const TRENDING_CACHE_KEY = 'trending_data_cache';
const TRENDING_CACHE_DURATION = 24 * 60 * 60 * 1000; // 1 day in milliseconds

// Save trending data to localStorage with expiration timestamp
function saveTrendingToCache(data) {
    const cacheData = {
        people: data.people,
        updatedAt: data.updatedAt,
        expiresAt: Date.now() + TRENDING_CACHE_DURATION
    };
    localStorage.setItem(TRENDING_CACHE_KEY, JSON.stringify(cacheData));
    console.log('📦 Lưu trending data vào cache (expires: ' + new Date(cacheData.expiresAt).toLocaleString('vi-VN') + ')');
}

// Load trending data from localStorage if not expired
function loadTrendingFromCache() {
    try {
        const cached = localStorage.getItem(TRENDING_CACHE_KEY);
        if (!cached) return null;
        
        const cacheData = JSON.parse(cached);
        
        // Check if cache has expired
        if (Date.now() > cacheData.expiresAt) {
            console.log('⏰ Cache hết hạn, cần cập nhật từ server');
            localStorage.removeItem(TRENDING_CACHE_KEY);
            return null;
        }
        
        console.log('✅ Đang dùng cache từ localStorage');
        return cacheData;
    } catch (err) {
        console.warn('Lỗi đọc cache:', err);
        return null;
    }
}

// Clear trending cache from localStorage
function clearTrendingCache() {
    localStorage.removeItem(TRENDING_CACHE_KEY);
    console.log('🗑️  Đã xóa trending cache');
}

// Load trending data - prioritizes localStorage cache
async function loadTrending() {
    try {
        // Try to load from localStorage first
        const cachedData = loadTrendingFromCache();
        if (cachedData) {
            renderPeople(cachedData.people || []);
            const timeStr = cachedData.updatedAt ? formatUpdatedAt(cachedData.updatedAt) : '--';
            document.getElementById('trendingUpdatedAt').textContent = timeStr + ' (📦 from cache)';
            return; // Don't call server if cache is valid
        }
        
        // If cache is empty or expired, fetch from server
        console.log('📡 Cache rỗng/hết hạn, fetch từ server...');
        const res = await fetch('/api/trending');
        const data = await res.json();
        if (data.success) {
            // Save to localStorage
            saveTrendingToCache(data);
            
            renderPeople(data.people || []);
            const timeStr = data.updatedAt ? formatUpdatedAt(data.updatedAt) : '--';
            document.getElementById('trendingUpdatedAt').textContent = timeStr + ' (📡 from server)';
        } else {
            showTrendingError();
        }
    } catch (err) {
        console.error('Trending fetch error:', err);
        showTrendingError();
    }
}

async function refreshTrending() {
    const btn = document.getElementById('refreshTrendingBtn');
    btn.classList.add('spinning');
    btn.disabled = true;
    // Show skeletons
    renderSkeletonPeople();
    try {
        const res = await fetch('/api/trending/refresh', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            // Save to localStorage
            saveTrendingToCache(data);
            
            renderPeople(data.people || []);
            const timeStr = data.updatedAt ? formatUpdatedAt(data.updatedAt) : '--';
            document.getElementById('trendingUpdatedAt').textContent = timeStr + ' (🔄 just refreshed)';
        } else {
            showTrendingError();
        }
    } catch (err) {
        console.error('Refresh error:', err);
        showTrendingError();
    } finally {
        btn.classList.remove('spinning');
        btn.disabled = false;
    }
}

function renderPeople(people) {
    const list = document.getElementById('peopleList');
    if (!people || people.filter(p => p).length === 0) {
        list.innerHTML = '<li style="padding:12px;color:var(--text-secondary);font-size:0.9em;">Chưa có dữ liệu nhân vật trending.</li>';
        return;
    }
    const rankClasses = ['rank-1', 'rank-2', 'rank-3', 'rank-4', 'rank-5', 'rank-6', 'rank-7'];
    const medals = ['🥇', '🥈', '🥉', '4', '5', '6', '7'];
    
    list.innerHTML = people
        .filter(p => p && (p.name || p))
        .slice(0, 7)
        .map((item, i) => {
            const name = item.name || item;
            const stats = item.stats || {};
            const articles = item.articles || [];
            
            // Tạo HTML dropdown articles
            const articlesHtml = articles.length > 0
                ? articles.map(a => `
                    <li class="dropdown-article-item">
                        <a href="${escapeHtml(a.url)}" target="_blank" rel="noopener" class="dropdown-article-link">
                            ${escapeHtml(a.title)}
                        </a>
                        <div class="dropdown-article-meta">
                            <span>📌 ${escapeHtml(a.source || 'Unknown')}</span>
                            <button class="article-copy-btn" style="padding:2px 6px;font-size:0.5em;" onclick="copyArticleLink('${escapeHtml(a.url)}', event)" title="Copy link">📋</button>
                        </div>
                    </li>
                `).join('')
                : '<li style="padding:8px;color:var(--text-secondary);font-size:0.58em;text-align:center;">Chưa có bài viết</li>';
            
            return `
            <li class="people-item">
                <div class="rank-badge ${rankClasses[i]}">${medals[i]}</div>
                <div style="flex:1;">
                    <span class="people-name">
                        ${escapeHtml(name)}
                        <span class="people-name-tooltip">Di chuyển chuột vào đây để xem ${articles.length} bài báo liên quan</span>
                    </span>
                </div>
                <div class="articles-dropdown">
                    <ul class="dropdown-articles-list">
                        ${articlesHtml}
                    </ul>
                </div>
            </li>`
        }).join('');
    
    // Attach dropdown hover listeners
    attachDropdownListeners();
}

function attachDropdownListeners() {
    const peopleItems = document.querySelectorAll('.people-item');
    peopleItems.forEach(item => {
        const dropdown = item.querySelector('.articles-dropdown');
        if (!dropdown) return;
        
        let hoverTimeout;
        let isHoveringItem = false;
        let isHoveringDropdown = false;
        
        function updateDropdownState() {
            if (isHoveringItem || isHoveringDropdown) {
                dropdown.classList.add('active');
                clearTimeout(hoverTimeout);
            } else {
                hoverTimeout = setTimeout(() => {
                    dropdown.classList.remove('active');
                }, 50);
            }
        }
        
        // When mouse enters the people-item
        item.addEventListener('mouseenter', () => {
            isHoveringItem = true;
            updateDropdownState();
        });
        
        // When mouse leaves the people-item
        item.addEventListener('mouseleave', () => {
            isHoveringItem = false;
            updateDropdownState();
        });
        
        // When mouse enters the dropdown
        dropdown.addEventListener('mouseenter', () => {
            isHoveringDropdown = true;
            updateDropdownState();
        });
        
        // When mouse leaves the dropdown
        dropdown.addEventListener('mouseleave', () => {
            isHoveringDropdown = false;
            updateDropdownState();
        });
    });
}

function formatNumber(num) {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

function renderArticles(articles) {
    const list = document.getElementById('articlesList');
    if (!articles || articles.length === 0) {
        list.innerHTML = '<li style="padding:12px;color:var(--text-secondary);font-size:0.9em;">Chưa tìm được bài viết liên quan. Thử Refresh sau ít phút.</li>';
        return;
    }
    list.innerHTML = articles.slice(0, 7).map((a, i) => `
        <li class="article-item">
            <div class="article-num">${i + 1}</div>
            <div class="article-info">
                <a class="article-link" href="${escapeHtml(a.url)}" target="_blank" rel="noopener">${escapeHtml(a.title)}</a>
                <div class="article-source">📌 ${escapeHtml(a.source || '')}</div>
            </div>
            <button class="article-copy-btn" onclick="copyArticleLink('${escapeHtml(a.url)}', this)" title="Copy link">
                📋 Copy
            </button>
        </li>`).join('');
}

function renderSkeletonPeople() {
    const list = document.getElementById('peopleList');
    list.innerHTML = Array(5).fill(`<li class="skeleton-item"><div class="skeleton-circle"></div><div class="skeleton" style="flex:1"></div></li>`).join('');
}

function showTrendingError() {
    document.getElementById('peopleList').innerHTML = '<li style="padding:12px;color:var(--error);font-size:0.9em;">❌ Lỗi tải dữ liệu trending. Vui lòng thử lại.</li>';
}

function formatUpdatedAt(isoStr) {
    try {
        const d = new Date(isoStr);
        return `Cập nhật: ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ${d.toLocaleDateString('vi-VN')}`;
    } catch { return isoStr; }
}

function copyArticleLink(url, buttonOrEvent) {
    // Handle both direct button reference and event object
    let button = buttonOrEvent;
    if (buttonOrEvent && buttonOrEvent.target) {
        // It's an event, get the button
        buttonOrEvent.preventDefault();
        button = buttonOrEvent.target;
    }
    
    navigator.clipboard.writeText(url).then(() => {
        const originalText = button.innerHTML;
        button.innerHTML = '✅ Đã copy!';
        button.style.background = '#34a853';
        setTimeout(() => {
            button.innerHTML = originalText;
            button.style.background = 'var(--primary)';
        }, 2000);
    }).catch(() => {
        alert('Không thể copy link. Vui lòng thử lại.');
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Auto-refresh removed - only runs at 9 AM daily or manual refresh
// setInterval(loadTrending, 15 * 60 * 1000);

// ==================== VIETTEL TTS SECTION ====================
const ttsText = document.getElementById('ttsText');
const ttsCharCount = document.getElementById('ttsCharCount');
const speedSelect = document.getElementById('speedSelect');
const speedValue = document.getElementById('speedValue');
const convertBtn = document.getElementById('convertBtn');
const detectBtn = document.getElementById('detectBtn');
const uploadWordsBtn = document.getElementById('uploadWordsBtn');
const copyFromContentBtn = document.getElementById('copyFromContentBtn');
const audioPlayer = document.getElementById('audioPlayer');
const audioElement = document.getElementById('audioElement');
const ttsStatus = document.getElementById('ttsStatus');
const downloadBtn = document.getElementById('downloadBtn');
const downloadWavBtn = document.getElementById('downloadWavBtn');
const downloadWrapper = document.getElementById('downloadWrapper');

// Voice selection
const regionButtons = document.getElementById('regionButtons');
const voiceOptions = document.getElementById('voiceOptions');

// Voice data by region
const voiceData = {
    north: [
        { id: 'hn-quynhanh', name: 'Quỳnh Anh', gender: 'Nữ' },
        { id: 'hn-phuongtrang', name: 'Phương Trăng', gender: 'Nữ' },
        { id: 'hn-thaochi', name: 'Thảo Chi', gender: 'Nữ' },
        { id: 'hn-thanhha', name: 'Thạnh Hà', gender: 'Nữ' },
        { id: 'hn-thanhphuong', name: 'Thạnh Phương', gender: 'Nữ' },
        { id: 'hn-thanhtung', name: 'Thạnh Tùng', gender: 'Nam' },
        { id: 'hn-namkhanh', name: 'Nam Khánh', gender: 'Nam' },
        { id: 'hn-tienquan', name: 'Tiến Quân', gender: 'Nam' }
    ],
    central: [
        { id: 'hue-maingoc', name: 'Mai Ngọc', gender: 'Nữ' },
        { id: 'hue-baoquoc', name: 'Bảo Quốc', gender: 'Nam' }
    ],
    south: [
        { id: 'hcm-diemmy', name: 'Diễm My', gender: 'Nữ' },
        { id: 'hcm-phuongly', name: 'Phương Ly', gender: 'Nữ' },
        { id: 'hcm-thuydung', name: 'Thủy Dung', gender: 'Nữ' },
        { id: 'hcm-thuyduyen', name: 'Thủy Duyên', gender: 'Nữ' },
        { id: 'hcm-leyen', name: 'Lệ Yên', gender: 'Nữ' },
        { id: 'hcm-minhquan', name: 'Minh Quân', gender: 'Nam' }
    ]
};

let selectedVoice = 'hn-quynhanh';
let selectedRegion = 'north';
let audioBlob = null;
let audioUrl = null;

// Local Storage Settings Management
const STORAGE_KEY = 'tts_settings';

function saveSettings() {
    const settings = {
        voice: selectedVoice,
        region: selectedRegion,
        speed: speedSelect.value
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function loadSettings() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            const settings = JSON.parse(saved);
            selectedRegion = settings.region || 'north';
            selectedVoice = settings.voice || 'hn-quynhanh';

            // Render voice options for saved region
            renderVoiceOptions(selectedRegion);

            // Update region buttons
            document.querySelectorAll('.region-btn').forEach(btn => {
                if (btn.dataset.region === selectedRegion) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });

            // Set speed
            speedSelect.value = settings.speed || '1';
            updateSpeedValue();

            // Set radio button for voice
            const voiceRadios = document.querySelectorAll('input[name="voice"]');
            voiceRadios.forEach(radio => {
                if (radio.value === selectedVoice) {
                    radio.checked = true;
                }
            });
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }
}

// Event Listeners for TTS
ttsText.addEventListener('input', () => {
    updateTtsCharCount();
    updateButtonStates();
});
convertBtn.addEventListener('click', convertToSpeech);
detectBtn.addEventListener('click', detectSpecialSyllables);
uploadWordsBtn.addEventListener('click', () => alert('Upload file feature coming soon'));
copyFromContentBtn.addEventListener('click', copyFromContent);
speedSelect.addEventListener('input', updateSpeedValue);
downloadBtn.addEventListener('click', downloadAudio);
downloadWavBtn.addEventListener('click', downloadAudioAsWav);

// Region button clicks
regionButtons.addEventListener('click', (e) => {
            if (e.target.classList.contains('region-btn') && !e.target.disabled) {
        selectedRegion = e.target.dataset.region;
        renderVoiceOptions(selectedRegion);
        // Reset selected voice to first voice of new region
        const voices = voiceData[selectedRegion] || [];
        if (voices.length > 0) {
            selectedVoice = voices[0].id;
        }
    }
});

// Speed buttons clicks
document.getElementById('speedButtons').addEventListener('click', (e) => {
    if (e.target.classList.contains('speed-btn')) {
        document.querySelectorAll('.speed-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        const speed = e.target.dataset.speed;
        speedSelect.value = speed;
        updateSpeedValue();
    }
});

function updateButtonStates() {
    const hasText = ttsText.value.trim().length > 0;
    convertBtn.disabled = !hasText;
    detectBtn.disabled = !hasText;
}

function renderVoiceOptions(region) {
    voiceOptions.innerHTML = '';
    const voices = voiceData[region] || [];

    voices.forEach((voice, index) => {
        const label = document.createElement('label');
        label.className = 'voice-option';
        label.style.cursor = 'pointer';

        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'voice';
        radio.value = voice.id;
        radio.checked = index === 0;
        radio.addEventListener('change', () => {
            selectedVoice = voice.id;
        });

        const labelText = document.createElement('label');
        labelText.textContent = `${voice.name} (${voice.gender})`;
        labelText.style.cursor = 'pointer';

        // Make the entire label clickable
        label.addEventListener('click', (e) => {
            if (e.target !== radio) {
                radio.checked = true;
                radio.dispatchEvent(new Event('change'));
            }
        });

        label.appendChild(radio);
        label.appendChild(labelText);
        voiceOptions.appendChild(label);
    });
}

function updateTtsCharCount() {
    const length = ttsText.value.length;
    ttsCharCount.textContent = length;

    if (length > 50000) {
        ttsText.value = ttsText.value.substring(0, 50000);
        ttsCharCount.textContent = '50000';
    }
}

function updateSpeedValue() {
    const value = speedSelect.value;
    speedValue.textContent = value;
    const percentage = ((value - 0.8) / 0.4) * 100;
    speedSelect.style.setProperty('--speed-percentage', percentage + '%');

    // Update speed buttons
    document.querySelectorAll('.speed-btn').forEach(btn => {
        if (btn.dataset.speed === value) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function copyFromContent() {
    if (!geminiOutput.value) {
        showTtsStatus('error', '❌ Chưa có nội dung để copy');
        return;
    }

    const content = geminiOutput.value.substring(0, 50000);
    ttsText.value = content;
    updateTtsCharCount();
    updateButtonStates();
    showTtsStatus('success', '✅ Đã copy nội dung!');
    setTimeout(() => ttsStatus.classList.remove('show'), 2000);
}
async function downloadAudioAsWav() {
    if (!audioBlob) {
        showTtsStatus('error', '❌ Chưa có âm thanh để tải');
        return;
    }

    try {
        downloadWavBtn.disabled = true;
        showTtsStatus('loading', '<span class="spinner"></span>Đang chuyển đổi sang WAV...');

        // Decode MP3 and convert to WAV
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        // Encode to WAV
        const wavBlob = encodeAudioToWav(audioBuffer);
        
        // Download WAV
        const timestamp = new Date().toLocaleTimeString('vi-VN').replace(/:/g, '-');
        const filename = `audio_${timestamp}.wav`;

        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(wavBlob);
        downloadLink.download = filename;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        // Clean up object URL
        setTimeout(() => URL.revokeObjectURL(downloadLink.href), 100);

        showTtsStatus('success', `✅ Đã tải "${filename}"`);
        setTimeout(() => ttsStatus.classList.remove('show'), 1500);
    } catch (error) {
        console.error('Error converting to WAV:', error);
        showTtsStatus('error', '❌ Lỗi khi chuyển đổi sang WAV. Vui lòng thử lại.');
        setTimeout(() => ttsStatus.classList.remove('show'), 3000);
    } finally {
        downloadWavBtn.disabled = false;
    }
}

function encodeAudioToWav(audioBuffer) {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numberOfChannels * bytesPerSample;

    // Get interleaved audio data
    const channelData = [];
    for (let i = 0; i < numberOfChannels; i++) {
        channelData.push(audioBuffer.getChannelData(i));
    }

    // Interleave channels
    const length = audioBuffer.length * numberOfChannels * bytesPerSample;
    const arrayBuffer = new ArrayBuffer(44 + length);
    const view = new DataView(arrayBuffer);

    // WAV header
    const writeString = (offset, string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length, true);
    writeString(8, 'WAVE');

    // fmt sub-chunk
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size
    view.setUint16(20, format, true); // AudioFormat
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true); // ByteRate
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);

    // data sub-chunk
    writeString(36, 'data');
    view.setUint32(40, length, true);

    // Write interleaved samples
    let offset = 44;
    const volume = 0.8; // Adjust volume to prevent clipping
    for (let i = 0; i < audioBuffer.length; i++) {
        for (let j = 0; j < numberOfChannels; j++) {
            const sample = channelData[j][i] * volume;
            // Convert to 16-bit PCM
            const s = Math.max(-1, Math.min(1, sample));
            view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
            offset += 2;
        }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
}

async function convertToSpeech() {
    const text = ttsText.value.trim();

    if (!text) {
        showTtsStatus('error', '❌ Vui lòng nhập văn bản');
        return;
    }

    if (text.length > 50000) {
        showTtsStatus('error', '❌ Văn bản không được vượt quá 50,000 ký tự');
        return;
    }

    // Save current settings before converting
    saveSettings();

    convertBtn.disabled = true;
    detectBtn.disabled = true;
    showTtsStatus('loading', '<span class="spinner"></span>Đang chuyển đổi thành âm thanh...');

    try {
        const response = await fetch('/api/tts/convert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: text,
                voice: selectedVoice,
                speed: parseFloat(speedSelect.value)
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Lỗi khi chuyển đổi');
        }

        audioBlob = await response.blob();
        audioUrl = URL.createObjectURL(audioBlob);
        audioElement.src = audioUrl;
        audioPlayer.classList.add('show');
        downloadWrapper.classList.add('show');
        showTtsStatus('success', '✅ Chuyển đổi thành công!');

    } catch (error) {
        console.error('Error:', error);
        showTtsStatus('error', '❌ Lỗi: ' + error.message);
        audioPlayer.classList.remove('show');
        downloadWrapper.classList.remove('show');
    } finally {
        updateButtonStates();
    }
}

function detectSpecialSyllables() {
    const text = ttsText.value.trim();
    if (!text) {
        showTtsStatus('error', '❌ Vui lòng nhập văn bản');
        return;
    }
    showTtsStatus('loading', '🔍 Phát hiện âm tiết đặc biệt...');
    // Add your detection logic here
    setTimeout(() => {
        showTtsStatus('success', '✅ Hoàn thành phát hiện âm tiết đặc biệt');
        setTimeout(() => ttsStatus.classList.remove('show'), 2000);
    }, 1000);
}

function downloadAudio() {
    if (!audioBlob) {
        showTtsStatus('error', '❌ Chưa có âm thanh để tải');
        return;
    }

    const timestamp = new Date().toLocaleTimeString('vi-VN').replace(/:/g, '-');
    const filename = `audio_${timestamp}.mp3`;

    const downloadLink = document.createElement('a');
    downloadLink.href = audioUrl;
    downloadLink.download = filename;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    showTtsStatus('success', `✅ Đã tải "${filename}"`);
    setTimeout(() => ttsStatus.classList.remove('show'), 1500);
}

function showTtsStatus(type, message) {
    ttsStatus.className = `tts-status show ${type}`;
    ttsStatus.innerHTML = message;
}

// Initialize voice options
renderVoiceOptions('north');
updateSpeedValue();
updateButtonStates();

// Load saved settings from localStorage
loadSettings();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
    }
});

// ===== BATCH QUEUE =====
let batchQueue = [];
let batchRunning = false;
let batchOpen = new Set();

document.getElementById('batchUrlInput').addEventListener('input', batchUpdateCount);

function batchUpdateCount() {
    const urls = batchParseUrls(document.getElementById('batchUrlInput').value);
    document.getElementById('batchUrlCount').textContent = urls.length + ' URLs';
}

function batchParseUrls(text) {
    return text.split('\n').map(s => s.trim())
        .filter(s => s.startsWith('http') && (s.includes('kenh14.vn') || s.includes('saostar.vn')));
}

function batchStart() {
    const urls = batchParseUrls(document.getElementById('batchUrlInput').value).slice(0, 10);
    if (!urls.length) { alert('Vui lòng nhập ít nhất 1 URL hợp lệ (kenh14.vn hoặc saostar.vn)'); return; }

    batchQueue = urls.map((url, i) => ({ id: i, url, status: 'wait', title: null, summary: null, error: null }));
    batchOpen = new Set();

    document.getElementById('batchInputArea').style.display = 'none';
    document.getElementById('batchQueueArea').style.display = 'block';
    batchRender();
    batchUpdateStats();
    batchRun();
}

function batchReset() {
    // Revoke blob URLs tránh memory leak
    batchQueue.forEach(i => i._audioUrl && URL.revokeObjectURL(i._audioUrl));

    batchQueue = []; batchRunning = false; batchOpen = new Set();
    document.getElementById('batchInputArea').style.display = 'block';
    document.getElementById('batchQueueArea').style.display = 'none';
    document.getElementById('batchExportRow').classList.remove('show');
    document.getElementById('batchUrlInput').value = '';
    batchUpdateCount();

    // THÊM: xóa history cũ khi bắt đầu batch mới
    batchClearHistory();
}

function batchRender() {
    document.getElementById('batchQueueList').innerHTML = batchQueue.map(batchRenderItem).join('');
    batchQueue.forEach(item => {
        const h = document.getElementById('bqh-' + item.id);
        if (h) h.onclick = () => batchToggle(item.id);
    });
}

function batchRenderItem(item) {
    const chips = { wait:'chip-wait', scrape:'chip-scrape', ai:'chip-ai', done:'chip-done', error:'chip-err' };
    const ttsChip = item._ttsStatus === 'done'
        ? `<span class="status-chip" style="background:#e8f4fd;color:#1565c0;font-size:11px;font-weight:600;padding:3px 8px;border-radius:4px;white-space:nowrap;flex-shrink:0">🔊 Đã đọc</span>`
        : '';
    const labels = { wait:'Chờ', scrape:'Đang scrape', ai:'Đang tóm tắt', done:'Hoàn thành', error:'Lỗi' };
    const dots = { wait:'dot-wait', scrape:'dot-scrape', ai:'dot-ai', done:'dot-done', error:'dot-err' };
    const isOpen = batchOpen.has(item.id);
    const display = (item.title || item.url).slice(0, 60) + ((item.title || item.url).length > 60 ? '…' : '');
    const spinner = (item.status === 'scrape' || item.status === 'ai')
        ? `<span class="batch-spinner" style="color:${item.status==='scrape'?'#b45309':'#7b1fa2'}"></span>` : '';
    const chevron = (item.status === 'done' || item.status === 'error')
        ? `<span style="font-size:12px;color:var(--text-secondary)">${isOpen ? '▲' : '▼'}</span>` : '';

    let body = '';
    if (item.status === 'done' && item.summary) {
        const activeTab = item._tab || 'sum';
        const charCount = (item.content||'').length.toLocaleString('vi-VN');
        const wordCount = (item.content||'').trim().split(/\s+/).filter(Boolean).length.toLocaleString('vi-VN');
        // Text TTS = title + ". " + summary (có thể user đã chỉnh sửa)
        const ttsText = item._ttsText !== undefined
            ? item._ttsText
            : (item.title ? item.title.trimEnd().replace(/\.+$/, '') + '.\n\n' : '') + (item.summary || '');

        const tabs = ['sum','tts', 'ori'];
        const tabLabels = ['✨ Tóm tắt AI','🔊 Text to speech','📄 Nội dung gốc'];

        const tabBar = tabs.map((t,i) => `
            <button onclick="batchSwitchTab(${item.id},'${t}',event)"
                style="font-size:14px;font-weight:${activeTab===t?'600':'500'};padding:8px 14px;border:none;background:transparent;cursor:pointer;
                border-bottom:2px solid ${activeTab===t?'var(--primary)':'transparent'};
                color:${activeTab===t?'var(--text-primary)':'var(--text-secondary)'};
                margin-bottom:-0.5px;white-space:nowrap;display:inline-flex;align-items:center;gap:4px">
                ${tabLabels[i]}
            </button>`).join('');

        // TTS status + audio player html
        const ttsStatusHtml = item._ttsStatus === 'loading'
            ? `<div style="font-size:12px;padding:6px 10px;border-radius:8px;background:#dbeafe;color:#1e40af;display:flex;align-items:center;gap:6px;margin-bottom:8px">
                <span style="width:11px;height:11px;border:1.5px solid #1e40af;border-top-color:transparent;border-radius:50%;animation:spin 0.7s linear infinite;display:inline-block;flex-shrink:0"></span>
                Đang chuyển đổi văn bản...
            </div>`
            : item._ttsStatus === 'done'
            ? `<div style="font-size:12px;padding:6px 10px;border-radius:8px;background:#d1fae5;color:#065f46;margin-bottom:8px">✅ Chuyển đổi thành công!</div>`
            : item._ttsStatus === 'error'
            ? `<div style="font-size:12px;padding:6px 10px;border-radius:8px;background:#fee2e2;color:#991b1b;margin-bottom:8px">❌ ${item._ttsError||'Lỗi TTS'}</div>`
            : '';

        const audioHtml = item._audioUrl
            ? `<div style="background:var(--bg-light);border:1px solid var(--border);border-radius:8px;padding:10px 12px;margin-bottom:8px">
                <div style="font-size:11px;color:var(--text-secondary);margin-bottom:6px">Giọng: ${selectedVoice||'hn-quynhanh'} · Tốc độ: ${document.getElementById('speedSelect')?.value||1}x</div>
                <audio controls src="${item._audioUrl}" style="width:100%;height:36px;margin-bottom:8px;border-radius:4px"></audio>
                <div style="display:flex;gap:6px; width: 30%;">
                    <button onclick="batchDownloadAudio(${item.id},'mp3',event)" class="btn-read"
                        style="font-size: 12px;padding: 5px 10px;">
                        ⬇ Tải MP3
                    </button>
                    <button onclick="batchDownloadAudioWav(${item.id},event)" class="btn-read"
                        style="font-size: 12px;padding: 5px 10px;">
                        ⬇ Tải WAV
                    </button>
                </div>
            </div>`
            : '';

        body = `<div class="q-body ${isOpen?'open':''}" id="bqb-${item.id}">
            <div style="display:flex;border-bottom:1px solid var(--border);padding:0 14px;gap:0">
                ${tabBar}
            </div>
            <div style="padding:12px 14px 14px">

                <div id="bqpane-${item.id}-sum" style="display:${activeTab==='sum'?'block':'none'}">
                    <div style="font-size:13px;line-height:1.75;color:var(--text-primary);white-space:pre-line;border-left:3px solid var(--border);padding-left:10px;margin-bottom:12px">${escapeHtml(item.summary)}</div>
                    <div class="q-actions">
                        <button onclick="batchCopyItem(${item.id},event)">📋 Copy tóm tắt</button>
                    </div>
                </div>

                <div id="bqpane-${item.id}-tts" style="display:${activeTab==='tts'?'block':'none'}">
                    <div style="font-size:11px;color:var(--text-secondary);margin-bottom:6px;display:flex;justify-content:space-between">
                        <span>✏️ Chỉnh sửa nội dung trước khi đọc</span>
                        <span id="bqttsc-${item.id}">${ttsText.length.toLocaleString('vi-VN')} ký tự</span>
                    </div>
                    <textarea id="bqtts-${item.id}"
                        oninput="batchTtsTextChange(${item.id})"
                        style="width:100%;field-sizing:content;min-height:100px;font-size:13px;line-height:1.7;padding:10px 12px;border:1px solid var(--border);border-radius:8px;background:var(--bg-light);color:var(--text-primary);resize:vertical;font-family:inherit;margin-bottom:2px"
                    >${escapeHtml(ttsText)}</textarea>
                    <div style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap; width: 30%; margin-left: 10px;">
                        <button id="bqreadbtn-${item.id}" onclick="batchReadTTS(${item.id},event)" class="btn-read"
                            style="font-size:12px;padding:5px 10px">
                            🔊 Đọc văn bản
                        </button>
                    </div>
                    ${ttsStatusHtml}
                    ${audioHtml}
                </div>

                <div id="bqpane-${item.id}-ori" style="display:${activeTab==='ori'?'block':'none'}">
                    <div style="font-size:11px;color:var(--text-secondary);margin-bottom:6px">${charCount} ký tự · ${wordCount} từ</div>
                    <div style="font-size:12px;line-height:1.7;color:var(--text-secondary);max-height:200px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;padding:10px 12px;background:var(--bg-light);white-space:pre-wrap;word-break:break-word;margin-bottom:12px">${escapeHtml(item.content||'Không có nội dung gốc')}</div>
                    <div class="q-actions">
                        <button onclick="batchCopyOriginal(${item.id},event)">📋 Copy nội dung gốc</button>
                    </div>
                </div>

            </div>
        </div>`;
    } else if (item.status === 'error') {
        body = `<div class="q-body ${isOpen ? 'open' : ''}" id="bqb-${item.id}">
            <div class="batch-err-msg">${escapeHtml(item.error || 'Lỗi không xác định')}</div>
            <div class="q-actions">
                <button onclick="batchRetry(${item.id},event)">🔄 Thử lại</button>
            </div>
        </div>`;
    }

    return `<div class="q-item" id="bqi-${item.id}">
        <div class="q-header" id="bqh-${item.id}">
            <div class="q-num">${item.id + 1}</div>
            ${spinner}
            <span class="${item.title ? 'q-title' : 'q-url'}" ...>${escapeHtml(display)}</span>
            ${item.title ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener"
                onclick="event.stopPropagation()"
                style="font-size:11px;padding:3px 8px;border:0.5px solid var(--border);border-radius:4px;background:transparent;color:var(--text-secondary);text-decoration:none;white-space:nowrap;flex-shrink:0;display:inline-flex;align-items:center;gap:3px">
                🔗 Bài gốc
            </a>` : ''}
            <span class="status-chip ${chips[item.status]}">${labels[item.status]}</span>
            ${ttsChip}
            <span class="status-dot ${dots[item.status]}"></span>
            ${chevron}
        </div>
        ${body}
    </div>`;
}

function batchToggle(id) {
    const item = batchQueue[id];
    if (item.status !== 'done' && item.status !== 'error') return;
    batchOpen.has(id) ? batchOpen.delete(id) : batchOpen.add(id);
    batchUpdateItem(item);
}

function batchUpdateItem(item) {
    const el = document.getElementById('bqi-' + item.id);
    if (!el) return;
    el.outerHTML = batchRenderItem(item);
    const h = document.getElementById('bqh-' + item.id);
    if (h) h.onclick = () => batchToggle(item.id);
}

function batchUpdateStats() {
    const total = batchQueue.length;
    const done = batchQueue.filter(i => i.status === 'done').length;
    const proc = batchQueue.filter(i => i.status === 'scrape' || i.status === 'ai').length;
    const err = batchQueue.filter(i => i.status === 'error').length;
    const finished = done + err;

    document.getElementById('bsTotal').textContent = total;
    document.getElementById('bsDone').textContent = done;
    document.getElementById('bsProc').textContent = proc;
    document.getElementById('bsErr').textContent = err;
    document.getElementById('batchProgressLabel').textContent = finished + ' / ' + total;
    document.getElementById('batchProgressBar').style.width = (total ? Math.round(finished / total * 100) : 0) + '%';

    const badge = document.getElementById('batchQueueBadge');
    if (finished === total && total > 0) {
        badge.textContent = 'Hoàn tất ✅';
        badge.style.cssText = 'font-size:0.75em;font-weight:600;padding:3px 8px;border-radius:20px;margin-left:6px;background:#d1fae5;color:#065f46';
        document.getElementById('batchExportRow').classList.add('show');
        // Auto-expand item đầu tiên done
        const firstDone = batchQueue.find(i => i.status === 'done');
        if (firstDone && !batchOpen.has(firstDone.id)) { batchOpen.add(firstDone.id); batchRender(); }
    } else if (proc > 0) {
        badge.textContent = 'Đang chạy...';
        badge.style.cssText = 'font-size:0.75em;font-weight:600;padding:3px 8px;border-radius:20px;margin-left:6px;background:#fff8e1;color:#b45309';
    }
}

async function batchRun() {
    if (batchRunning) return;
    batchRunning = true;
    for (let i = 0; i < batchQueue.length; i++) {
        if (batchQueue[i].status !== 'wait') continue;
        await batchProcessItem(i);
        if (i < batchQueue.length - 1) await new Promise(r => setTimeout(r, 2500)); // delay tránh rate limit
    }
    batchRunning = false;
    batchSaveHistory();
}

async function batchProcessItem(idx) {
    const item = batchQueue[idx];
    item.status = 'scrape';
    batchUpdateItem(item); batchUpdateStats();

    try {
        const scrapeRes = await fetch('/api/scrape', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: item.url })
        });
        const scrapeData = await scrapeRes.json();
        if (!scrapeData.success) throw new Error(scrapeData.error || 'Không lấy được nội dung');

        item.title = scrapeData.title || item.url;
        item.content = scrapeData.content; // ← dòng này phải có
        item.status = 'ai';
        batchUpdateItem(item); batchUpdateStats();

        const aiRes = await fetch('/api/summarize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: scrapeData.content })
        });
        const aiData = await aiRes.json();
        if (!aiData.success) throw new Error(aiData.error || 'Tóm tắt thất bại');

        item.summary = aiData.summary;
        item.status = 'done';
    } catch (e) {
        item.status = 'error';
        item.error = e.message;
        batchOpen.add(item.id);
    }

    batchUpdateItem(item); batchUpdateStats();
}

async function batchRetry(id, e) {
    e && e.stopPropagation();
    const item = batchQueue[id];
    item.status = 'wait'; item.error = null;
    batchOpen.delete(id);
    batchUpdateItem(item); batchUpdateStats();
    await batchProcessItem(id);
}

function batchCopyItem(id, e) {
    e && e.stopPropagation();
    const item = batchQueue[id];
    if (!item.summary) return;
    navigator.clipboard.writeText(item.summary).then(() => {
        const btn = e.target.closest('button');
        if (btn) { const o = btn.textContent; btn.textContent = '✅ Đã copy!'; setTimeout(() => btn.textContent = o, 1800); }
    });
}

function batchSendTTS(id, e) {
    e && e.stopPropagation();
    const item = batchQueue[id];
    const ttsEl = document.getElementById('ttsText');
    if (ttsEl && item.summary) {
        ttsEl.value = item.summary;
        ttsEl.dispatchEvent(new Event('input'));
        ttsEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function batchExport(type) {
    const done = batchQueue.filter(i => i.status === 'done' && i.summary);
    if (!done.length) return;
    if (type === 'text') {
        const text = done.map((i, n) => `=== Bài ${n+1}: ${i.title || i.url} ===\n${i.summary}`).join('\n\n');
        navigator.clipboard.writeText(text).then(() => alert('Đã copy ' + done.length + ' tóm tắt!'));
    } else {
        const blob = new Blob([JSON.stringify(done.map(i => ({ url: i.url, title: i.title, summary: i.summary })), null, 2)], { type: 'application/json' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'batch-summaries.json'; a.click();
    }
}
// ===== END BATCH QUEUE =====

window.addEventListener('load', () => {
    urlInput.focus();
    loadTrending();
    // THÊM DÒNG NÀY:
    document.getElementById('batchUrlInput').addEventListener('input', batchUpdateCount);
});

function batchSwitchTab(id, tab, e) {
    e && e.stopPropagation();
    batchQueue[id]._tab = tab;
    batchUpdateItem(batchQueue[id]);
}

function batchCopyOriginal(id, e) {
    e && e.stopPropagation();
    const item = batchQueue[id];
    if (!item.content) return;
    navigator.clipboard.writeText(item.content).then(() => {
        const btn = e.target.closest('button');
        if (btn) { const o = btn.textContent; btn.textContent = '✅ Đã copy!'; setTimeout(() => btn.textContent = o, 1800); }
    });
}

async function batchStartTTSAll() {

    //switch tab sang TTS của item đầu tiên có summary để render sẵn voice/speed select
    batchSwitchTab(0,'tts',event);
    const done = batchQueue.filter(i => i.status === 'done' && i.summary);
    if (!done.length) return;

    const voice = selectedVoice || 'hn-quynhanh';
    const speed = parseFloat(document.getElementById('speedSelect')?.value || 1);

    for (let i = 0; i < done.length; i++) {
        await batchConvertTTS(done[i], voice, speed);
        if (i < done.length - 1) await new Promise(r => setTimeout(r, 1000));
    }

    for (const item of done) {
        if (!item._audioUrl) continue;
        await batchPlayItem(item);
    }

    batchQueue.forEach(i => i.status === 'done' && batchUpdateItem(i));

    const first = done[0];
    if (first) {
        first._tab = 'tts';
        batchOpen.add(first.id);
        batchUpdateItem(first);
        document.getElementById('bqi-' + first.id)
            ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

async function batchConvertTTS(item, voice, speed) {
    // Skip nếu đã có audio rồi
    if (item._audioUrl) return;

    const ttsText = item._ttsText !== undefined
        ? item._ttsText
        : (item.title ? item.title.trimEnd().replace(/\.+$/, '') + '.\n\n' : '') + (item.summary || '');

    item._ttsStatus = 'loading';
    batchUpdateItem(item);

    try {
        const res = await fetch('/api/tts/convert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: ttsText, voice, speed })
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Lỗi TTS');
        }
        const blob = await res.blob();
        item._audioBlob = blob;
        item._audioUrl = URL.createObjectURL(blob);
        item._ttsStatus = 'done';
    } catch (err) {
        item._ttsStatus = 'error';
        item._ttsError = err.message;
    }
    batchUpdateItem(item);
}

function batchPlayItem(item) {
    return new Promise(resolve => {
        if (!item._audioUrl) { resolve(); return; }

        item._tab = 'tts';
        batchOpen.add(item.id);
        batchUpdateItem(item); // render audio element vào DOM

        const el = document.getElementById('bqi-' + item.id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Tăng timeout để chắc chắn DOM đã render xong + scroll
        setTimeout(() => {
            // Query đúng audio trong pane TTS của item này
            const pane = document.getElementById('bqpane-' + item.id + '-tts');
            const audioEl = pane?.querySelector('audio');
            if (!audioEl) { resolve(); return; }

            audioEl.onended = () => resolve();
            audioEl.onerror = () => resolve();
            audioEl.play().catch(() => resolve());
        }, 7000);
    });
}

function batchTtsTextChange(id) {
    const ta = document.getElementById('bqtts-' + id);
    const counter = document.getElementById('bqttsc-' + id);
    if (ta) batchQueue[id]._ttsText = ta.value;
    if (counter && ta) counter.textContent = ta.value.length.toLocaleString('vi-VN') + ' ký tự';
}

function batchResetTtsText(id, e) {
    e && e.stopPropagation();
    const item = batchQueue[id];
    item._ttsText = undefined; // reset về default
    item._ttsStatus = null;
    item._audioUrl = null;
    item._audioBlob = null;
    batchUpdateItem(item);
}

async function batchReadTTS(id, e) {
    e && e.stopPropagation();
    const item = batchQueue[id];
    const ta = document.getElementById('bqtts-' + id);
    const text = ta ? ta.value.trim() : '';
    if (!text) return;

    // Lấy voice/speed từ TTS section hiện có
    const voice = selectedVoice || 'hn-quynhanh';
    const speed = parseFloat(document.getElementById('speedSelect')?.value || 1);

    item._ttsStatus = 'loading';
    item._ttsError = null;
    batchUpdateItem(item);

    try {
        const res = await fetch('/api/tts/convert', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ text, voice, speed })
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Lỗi TTS');
        }
        const blob = await res.blob();
        item._audioBlob = blob;
        item._audioUrl = URL.createObjectURL(blob);
        item._ttsStatus = 'done';
    } catch(err) {
        item._ttsStatus = 'error';
        item._ttsError = err.message;
    }
    batchUpdateItem(item);
}

function batchGetFilename(id, ext) {
    const item = batchQueue[id];
    const title = (item.title || 'audio').replace(/[\\/:*?"<>|]/g, '').trim();
    const now = new Date();
    const date = `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()}`;
    return `${title}_${date}.${ext}`;
}

function batchDownloadAudio(id, fmt, e) {
    e && e.stopPropagation();
    const item = batchQueue[id];
    if (!item._audioUrl) return;
    const a = document.createElement('a');
    a.href = item._audioUrl;
    a.download = batchGetFilename(id, 'mp3');
    a.click();
}

async function batchDownloadAudioWav(id, e) {
    e && e.stopPropagation();
    const item = batchQueue[id];
    if (!item._audioBlob) return;
    // Reuse hàm encodeAudioToWav đã có sẵn trong file gốc
    try {
        const ctx = new AudioContext();
        const ab = await item._audioBlob.arrayBuffer();
        const audioBuf = await ctx.decodeAudioData(ab);
        const wavBlob = encodeAudioToWav(audioBuf); // hàm này đã có trong index.html
        const a = document.createElement('a');
        a.href = URL.createObjectURL(wavBlob);
        a.download = batchGetFilename(id, 'wav');
        a.click();
    } catch(err) {
        alert('Lỗi convert WAV: ' + err.message);
    }
}

function batchSaveHistory() {
    const snapshot = batchQueue.map(item => ({
        id: item.id,
        url: item.url,
        title: item.title || null,
        content: item.content || null,
        summary: item.summary || null,
        status: item.status,
        error: item.error || null,
    }));
    try {
        localStorage.setItem(BATCH_HISTORY_KEY, JSON.stringify({
            savedAt: new Date().toISOString(),
            queue: snapshot
        }));
    } catch(e) {
        console.warn('Lưu history thất bại:', e.message);
    }
}

function batchLoadHistory() {
    try {
        const raw = localStorage.getItem(BATCH_HISTORY_KEY);
        if (!raw) return false;
        const data = JSON.parse(raw);
        if (!data.queue || !data.queue.length) return false;

        batchQueue = data.queue.map(item => ({
            ...item,
            _audioUrl: null,   // blob không restore được
            _audioBlob: null,
            _ttsStatus: item._ttsStatus === 'done' ? 'done' : item._ttsStatus,
        }));
        batchOpen = new Set();

        // Auto-open item đầu tiên done
        const first = batchQueue.find(i => i.status === 'done');
        if (first) {
            first._tab = first._tab || 'sum';
            batchOpen.add(first.id);
        }

        document.getElementById('batchInputArea').style.display = 'none';
        document.getElementById('batchQueueArea').style.display = 'block';
        batchRender();
        batchUpdateStats();

        // Show banner thông báo
        const label = document.getElementById('batchProgressLabel');
        const savedAt = new Date(data.savedAt).toLocaleString('vi-VN');
        if (label) label.title = `Khôi phục từ: ${savedAt}`;

        console.log(`📂 Batch history loaded (saved: ${savedAt})`);
        return true;
    } catch(e) {
        console.warn('Load history thất bại:', e.message);
        return false;
    }
}

function batchClearHistory() {
    localStorage.removeItem(BATCH_HISTORY_KEY);
}