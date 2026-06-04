/**
 * Batch Queue Module
 * Xử lý hàng loạt: scrape + tóm tắt + TTS từ danh sách URL
 */

// ===== BATCH QUEUE =====
const BATCH_HISTORY_KEY = 'batch_history_v1';

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

    // Xóa history cũ khi bắt đầu batch mới
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
    const chips = { wait: 'chip-wait', scrape: 'chip-scrape', ai: 'chip-ai', done: 'chip-done', error: 'chip-err' };
    const ttsChip = item._ttsStatus === 'done'
        ? `<span class="status-chip" style="background:#e8f4fd;color:#1565c0;font-size:11px;font-weight:600;padding:3px 8px;border-radius:4px;white-space:nowrap;flex-shrink:0">🔊 Đã đọc</span>`
        : '';
    const labels = { wait: 'Chờ', scrape: 'Đang scrape', ai: 'Đang tóm tắt', done: 'Hoàn thành', error: 'Lỗi' };
    const dots = { wait: 'dot-wait', scrape: 'dot-scrape', ai: 'dot-ai', done: 'dot-done', error: 'dot-err' };
    const isOpen = batchOpen.has(item.id);
    const display = (item.title || item.url).slice(0, 60) + ((item.title || item.url).length > 60 ? '…' : '');
    const spinner = (item.status === 'scrape' || item.status === 'ai')
        ? `<span class="batch-spinner" style="color:${item.status === 'scrape' ? '#b45309' : '#7b1fa2'}"></span>` : '';
    const chevron = (item.status === 'done' || item.status === 'error')
        ? `<span style="font-size:12px;color:var(--text-secondary)">${isOpen ? '▲' : '▼'}</span>` : '';

    let body = '';
    if (item.status === 'done' && item.summary) {
        const activeTab = item._tab || 'sum';
        const charCount = (item.content || '').length.toLocaleString('vi-VN');
        const wordCount = (item.content || '').trim().split(/\s+/).filter(Boolean).length.toLocaleString('vi-VN');
        // Text TTS = title + ". " + summary (có thể user đã chỉnh sửa)
        const ttsText = item._ttsText !== undefined
            ? item._ttsText
            : (item.title ? item.title.trimEnd().replace(/\.+$/, '') + '.\n\n' : '') + (item.summary || '');

        const tabs = ['sum', 'tts', 'ori'];
        const tabLabels = ['✨ Tóm tắt AI', '🔊 Chuyển sang giọng nói (TTS)', '📄 Nội dung gốc'];

        const tabBar = tabs.map((t, i) => `
            <button onclick="batchSwitchTab(${item.id},'${t}',event)"
                style="font-size:14px;font-weight:${activeTab === t ? '600' : '500'};padding:8px 14px;border:none;background:transparent;cursor:pointer;
                border-bottom:2px solid ${activeTab === t ? 'var(--primary)' : 'transparent'};
                color:${activeTab === t ? 'var(--text-primary)' : 'var(--text-secondary)'};
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
                    ? `<div style="font-size:12px;padding:6px 10px;border-radius:8px;background:#fee2e2;color:#991b1b;margin-bottom:8px">❌ ${item._ttsError || 'Lỗi TTS'}</div>`
                    : '';

        const audioHtml = item._audioUrl
            ? `<div style="background:var(--bg-light);border:1px solid var(--border);border-radius:8px;padding:10px 12px;margin-bottom:8px">
                <div style="font-size:11px;color:var(--text-secondary);margin-bottom:6px">Giọng: ${selectedVoice || 'hn-quynhanh'} · Tốc độ: ${document.getElementById('speedSelect')?.value || 1}x</div>
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

        body = `<div class="q-body ${isOpen ? 'open' : ''}" id="bqb-${item.id}">
            <div style="display:flex;border-bottom:1px solid var(--border);padding:0 14px;gap:0">
                ${tabBar}
            </div>
            <div style="padding:12px 14px 14px">

                <div id="bqpane-${item.id}-sum" style="display:${activeTab === 'sum' ? 'block' : 'none'}">
                    <div style="font-size:13px;line-height:1.75;color:var(--text-primary);white-space:pre-line;border:1px solid var(--border);padding-left:10px;margin-bottom:12px;background:var(--bg-light); padding:10px 12px; border-radius: 8px;">${escapeHtml(item.summary)}</div>
                    <div class="q-actions">
                        <button onclick="batchCopyItem(${item.id},event)">📋 Copy tóm tắt</button>
                    </div>
                </div>

                <div id="bqpane-${item.id}-tts" style="display:${activeTab === 'tts' ? 'block' : 'none'}">
                    <div style="font-size:11px;color:var(--text-secondary);margin-bottom:6px;display:flex;justify-content:space-between">
                        <span>✏️ Chỉnh sửa nội dung trước khi đọc</span>
                        <span id="bqttsc-${item.id}">${ttsText.length.toLocaleString('vi-VN')} ký tự</span>
                    </div>
                    <textarea id="bqtts-${item.id}"
                        oninput="batchTtsTextChange(${item.id})"
                        style="width:100%;field-sizing:content;min-height:100px;font-size:13px;line-height:1.7;padding:10px 12px;border:1px solid var(--border);border-radius:8px;background:white;color:var(--text-primary);resize:vertical;font-family:inherit;margin-bottom:2px"
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

                <div id="bqpane-${item.id}-ori" style="display:${activeTab === 'ori' ? 'block' : 'none'}">
                    <div style="font-size:11px;color:var(--text-secondary);margin-bottom:6px">${charCount} ký tự · ${wordCount} từ</div>
                    <div style="font-size:12px;line-height:1.7;max-height:200px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;padding:10px 12px;background:var(--bg-light);white-space:pre-wrap;word-break:break-word;margin-bottom:12px">${escapeHtml(item.content || 'Không có nội dung gốc')}</div>
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
        item.content = scrapeData.content;
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
        const text = done.map((i, n) => `=== Bài ${n + 1}: ${i.title || i.url} ===\n${i.summary}`).join('\n\n');
        navigator.clipboard.writeText(text).then(() => alert('Đã copy ' + done.length + ' tóm tắt!'));
    } else {
        const blob = new Blob([JSON.stringify(done.map(i => ({ url: i.url, title: i.title, summary: i.summary })), null, 2)], { type: 'application/json' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'batch-summaries.json'; a.click();
    }
}

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
    batchSwitchTab(0, 'tts', event);
    const done = batchQueue.filter(i => i.status === 'done' && i.summary);
    if (!done.length) return;

    const voice = selectedVoice || 'hn-quynhanh';
    const speed = parseFloat(document.getElementById('speedSelect')?.value || 1);

    // Song song tất cả
    await Promise.all(done.map(item => batchConvertTTS(item, voice, speed)));

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
            headers: { 'Content-Type': 'application/json' },
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
    } catch (err) {
        item._ttsStatus = 'error';
        item._ttsError = err.message;
    }
    batchUpdateItem(item);
}

function batchGetFilename(id, ext) {
    const item = batchQueue[id];
    const title = (item.title || 'audio').replace(/[\\/:*?"<>|]/g, '').trim();
    const now = new Date();
    const date = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
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
    // Reuse hàm encodeAudioToWav đã có sẵn trong common.js
    try {
        const ctx = new AudioContext();
        const ab = await item._audioBlob.arrayBuffer();
        const audioBuf = await ctx.decodeAudioData(ab);
        const wavBlob = encodeAudioToWav(audioBuf);
        const a = document.createElement('a');
        a.href = URL.createObjectURL(wavBlob);
        a.download = batchGetFilename(id, 'wav');
        a.click();
    } catch (err) {
        alert('Lỗi convert WAV: ' + err.message);
    }
}

// ===== BATCH HISTORY =====

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
    } catch (e) {
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
    } catch (e) {
        console.warn('Load history thất bại:', e.message);
        return false;
    }
}

function batchClearHistory() {
    localStorage.removeItem(BATCH_HISTORY_KEY);
}

// ===== INIT =====
window.addEventListener('load', () => {
    batchLoadHistory();
    document.getElementById('batchUrlInput').addEventListener('input', batchUpdateCount);
});
