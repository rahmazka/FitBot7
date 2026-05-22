/**
 * ============================================================
 * FITBOT - Frontend JavaScript (app.js)
 * Handles: UI logic, API calls, chat rendering
 * ============================================================
 */

const API_URL = 'http://localhost:3001/api/chat';

let chatHistory = [];
let isTyping = false;
let sessionCount = 0;

// DOM Elements
const welcomeScreen  = document.getElementById('welcomeScreen');
const chatArea       = document.getElementById('chatArea');
const chatMessages   = document.getElementById('chatMessages');
const userInput      = document.getElementById('userInput');
const sendBtn        = document.getElementById('sendBtn');
const chatHistoryEl  = document.getElementById('chatHistory');
const sidebar        = document.getElementById('sidebar');
const sidebarToggle  = document.getElementById('sidebarToggle');

// Event Listeners
document.getElementById('newChatBtn').addEventListener('click', resetChat);
sidebarToggle.addEventListener('click', toggleSidebar);
document.addEventListener('click', (e) => {
  if (window.innerWidth <= 768 && !sidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
    sidebar.classList.remove('open');
  }
});

// ============================================================
// KIRIM PESAN
// ============================================================
async function sendMessage() {
  const text = userInput.value.trim();
  if (!text || isTyping) return;

  showChatArea();
  appendUserBubble(text);
  chatHistory.push({ role: 'user', text });

  userInput.value = '';
  autoResize(userInput);
  setSendDisabled(true);

  const typingEl = showTypingIndicator();

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text })
    });
    const data = await response.json();
    typingEl.remove();

    if (data.success) {
      appendBotBubble(data.response);
      chatHistory.push({ role: 'bot', response: data.response });
    } else {
      appendBotBubble({ type: 'error', message: 'Terjadi kesalahan. Coba lagi ya! 😅' });
    }
  } catch (err) {
    typingEl.remove();
    appendBotBubble({ type: 'error', message: '❌ Tidak dapat terhubung ke server. Pastikan backend sudah berjalan di port 3001.' });
  }

  setSendDisabled(false);
  scrollToBottom();
  updateHistorySidebar(text);
}

function sendSuggestion(text) {
  userInput.value = text;
  sendMessage();
}

// ============================================================
// RENDER BUBBLE USER
// ============================================================
function appendUserBubble(text) {
  const row = document.createElement('div');
  row.className = 'message-row user';
  row.innerHTML = `
    <div class="avatar user">🧑</div>
    <div class="bubble user">${escapeHtml(text)}</div>`;
  chatMessages.appendChild(row);
  scrollToBottom();
}

// ============================================================
// RENDER BUBBLE BOT - routing ke renderer yang sesuai
// ============================================================
function appendBotBubble(response) {
  const row = document.createElement('div');
  row.className = 'message-row bot';

  let content = '';
  switch (response.type) {
    case 'greeting':
    case 'thanks':
      content = `<p>${escapeHtml(response.message)}</p>`; break;
    case 'latihan':
      content = renderLatihanResponse(response); break;
    case 'panduan':
      content = renderPanduanResponse(response); break;
    case 'jadwal':
      content = renderJadwalResponse(response); break;
    case 'set_rep':
      content = renderSetRepResponse(response); break;
    case 'pemula':
      content = renderPemulaResponse(response); break;
    case 'nutrisi':
      content = renderNutrisiResponse(response); break;
    case 'suplemen':
      content = renderSuplemenResponse(response); break;
    case 'stretching':
      content = renderStretchingResponse(response); break;
    case 'rumah':
      content = renderRumahResponse(response); break;
    case 'program_lanjutan':
      content = renderProgramLanjutanResponse(response); break;
    case 'cedera':
      content = renderCederaResponse(response); break;
    case 'out_of_topic':
    case 'unknown_fitness':
      content = `<p class="out-of-topic-msg">${escapeHtml(response.message)}</p>`; break;
    default:
      content = `<p>${escapeHtml(response.message || 'Maaf, terjadi kesalahan.')}</p>`;
  }

  row.innerHTML = `
    <div class="avatar bot">⚡</div>
    <div class="bubble bot">${content}</div>`;
  chatMessages.appendChild(row);
  scrollToBottom();
}

// ============================================================
// RENDERERS
// ============================================================

function renderLatihanResponse(r) {
  const cards = r.latihan.map(l => `
    <div class="exercise-card">
      <div class="exercise-header">
        <span class="exercise-name">🏋️ ${escapeHtml(l.nama)}</span>
        <span class="exercise-level level-${l.level.toLowerCase()}">${escapeHtml(l.level)}</span>
      </div>
      <p class="exercise-desc">${escapeHtml(l.deskripsi)}</p>
      <p class="exercise-target">🎯 ${escapeHtml(l.target_otot)}</p>
      <div class="exercise-meta">
        <span class="meta-item">🔁 ${l.set} Set</span>
        <span class="meta-item">⚡ <span class="meta-val">${escapeHtml(String(l.repetisi))} Rep</span></span>
      </div>
      ${l.tips ? `<div class="exercise-tip">💡 Tips: ${escapeHtml(l.tips)}</div>` : ''}
    </div>`).join('');
  return `
    <div class="response-header">
      <span class="response-label">${escapeHtml(r.kategori)}</span>
      <div class="response-title">Latihan ${capitalize(r.kategori)}</div>
      <div class="response-subtitle">Rekomendasi dari knowledge base</div>
    </div>
    <div class="exercise-list">${cards}</div>`;
}

function renderPanduanResponse(r) {
  const items = r.panduan.map(p => `<li>${escapeHtml(p)}</li>`).join('');
  const rekomCards = (r.latihan_rekomendasi || []).map(l => `
    <div class="exercise-card">
      <div class="exercise-header"><span class="exercise-name">🏋️ ${escapeHtml(l.nama)}</span></div>
      <div class="exercise-meta">
        <span class="meta-item">🔁 ${l.set} Set</span>
        <span class="meta-item">⚡ <span class="meta-val">${escapeHtml(String(l.repetisi))} Rep</span></span>
      </div>
      ${l.catatan ? `<div class="exercise-tip">📝 ${escapeHtml(l.catatan)}</div>` : ''}
    </div>`).join('');
  return `
    <div class="response-header">
      <span class="response-label">${escapeHtml(r.kategori)}</span>
      <div class="response-title">Panduan ${capitalize(r.kategori)}</div>
    </div>
    <p style="color:var(--text-secondary);font-size:13.5px;margin-bottom:12px;">${escapeHtml(r.penjelasan)}</p>
    <ul class="panduan-list">${items}</ul>
    ${rekomCards ? `<div style="margin-top:14px;"><div class="response-subtitle" style="margin-bottom:10px;">🏋️ Latihan Rekomendasi:</div><div class="exercise-list">${rekomCards}</div></div>` : ''}`;
}

function renderJadwalResponse(r) {
  const jadwalCards = r.program.jadwal.map(j => `
    <div class="jadwal-card">
      <div class="jadwal-day">📅 ${escapeHtml(j.hari)}</div>
      <div class="jadwal-focus">${escapeHtml(j.fokus)}</div>
      <div class="jadwal-exercises">${j.latihan.map(l => `<span class="jadwal-tag">${escapeHtml(l)}</span>`).join('')}</div>
    </div>`).join('');
  return `
    <div class="response-header">
      <span class="response-label">Jadwal</span>
      <div class="response-title">${escapeHtml(r.program.nama)}</div>
      <div class="response-subtitle">${escapeHtml(r.penjelasan)}</div>
    </div>
    <div class="jadwal-grid">${jadwalCards}</div>`;
}

function renderSetRepResponse(r) {
  const cards = r.panduan.map(p => `
    <div class="setrep-card">
      <div>
        <div class="setrep-tujuan">${escapeHtml(p.tujuan)}</div>
        <div class="setrep-catatan">${escapeHtml(p.catatan)}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">⏱️ Istirahat: ${escapeHtml(p.istirahat)}</div>
      </div>
      <div class="setrep-stats">
        <div><div class="setrep-val">${escapeHtml(p.set)}</div><div class="setrep-key">Set</div></div>
        <div style="margin-top:6px;"><div class="setrep-val">${escapeHtml(p.repetisi)}</div><div class="setrep-key">Reps</div></div>
      </div>
    </div>`).join('');
  return `
    <div class="response-header">
      <span class="response-label">Volume Training</span>
      <div class="response-title">Panduan Set & Repetisi</div>
      <div class="response-subtitle">${escapeHtml(r.penjelasan)}</div>
    </div>
    <div class="setrep-grid">${cards}</div>`;
}

function renderPemulaResponse(r) {
  const tips = r.tips.map(t => `<li>${escapeHtml(t)}</li>`).join('');
  const latihanCards = (r.latihan_awal || []).map(l => `
    <div class="exercise-card">
      <div class="exercise-header"><span class="exercise-name">🏋️ ${escapeHtml(l.nama)}</span></div>
      <div class="exercise-meta">
        <span class="meta-item">🔁 ${l.set} Set</span>
        <span class="meta-item">⚡ <span class="meta-val">${escapeHtml(String(l.repetisi))}</span></span>
      </div>
    </div>`).join('');
  return `
    <div class="response-header">
      <span class="response-label">Pemula</span>
      <div class="response-title">Panduan Gym untuk Pemula 🏋️</div>
      <div class="response-subtitle">${escapeHtml(r.penjelasan)}</div>
    </div>
    <ul class="panduan-list">${tips}</ul>
    <div style="margin-top:14px;">
      <div class="response-subtitle" style="margin-bottom:10px;">💪 Latihan Awal yang Disarankan:</div>
      <div class="exercise-list">${latihanCards}</div>
    </div>`;
}

function renderNutrisiResponse(r) {
  const items = r.panduan.map(p => `<li>${escapeHtml(p)}</li>`).join('');
  const menu = (r.contoh_menu || []).map(m => `
    <div class="jadwal-card" style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
      <span class="jadwal-day" style="white-space:nowrap;">🕐 ${escapeHtml(m.waktu)}</span>
      <span style="font-size:12.5px;color:var(--text-secondary);">${escapeHtml(m.contoh)}</span>
    </div>`).join('');
  return `
    <div class="response-header">
      <span class="response-label">Nutrisi</span>
      <div class="response-title">Panduan Nutrisi & Makanan 🥗</div>
      <div class="response-subtitle">${escapeHtml(r.penjelasan)}</div>
    </div>
    <ul class="panduan-list">${items}</ul>
    ${menu ? `<div style="margin-top:14px;"><div class="response-subtitle" style="margin-bottom:8px;">🍽️ Contoh Menu Harian:</div><div class="jadwal-grid">${menu}</div></div>` : ''}`;
}

function renderSuplemenResponse(r) {
  const items = r.panduan.map(p => `<li>${escapeHtml(p)}</li>`).join('');
  const prioritas = (r.prioritas || []).map(s => `
    <div class="exercise-card" style="display:flex;justify-content:space-between;align-items:start;gap:12px;">
      <div>
        <div class="exercise-name">💊 ${escapeHtml(s.nama)}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:3px;">${escapeHtml(s.catatan)}</div>
      </div>
      <span style="font-size:13px;flex-shrink:0;">${escapeHtml(s.prioritas)}</span>
    </div>`).join('');
  return `
    <div class="response-header">
      <span class="response-label">Suplemen</span>
      <div class="response-title">Panduan Suplemen Fitness 💊</div>
      <div class="response-subtitle">${escapeHtml(r.penjelasan)}</div>
    </div>
    <ul class="panduan-list">${items}</ul>
    ${prioritas ? `<div style="margin-top:14px;"><div class="response-subtitle" style="margin-bottom:8px;">⭐ Prioritas Suplemen:</div><div class="exercise-list">${prioritas}</div></div>` : ''}`;
}

function renderStretchingResponse(r) {
  const cards = r.latihan.map(l => `
    <div class="exercise-card">
      <div class="exercise-header">
        <span class="exercise-name">🧘 ${escapeHtml(l.nama)}</span>
        <span class="exercise-level level-${l.level.toLowerCase()}">${escapeHtml(l.level)}</span>
      </div>
      <p class="exercise-desc">${escapeHtml(l.deskripsi)}</p>
      <div class="exercise-meta"><span class="meta-item">⏱️ ${escapeHtml(String(l.repetisi))}</span></div>
      ${l.tips ? `<div class="exercise-tip">💡 ${escapeHtml(l.tips)}</div>` : ''}
    </div>`).join('');
  const tips = (r.tips_recovery || []).map(t => `<li>${escapeHtml(t)}</li>`).join('');
  return `
    <div class="response-header">
      <span class="response-label">Recovery</span>
      <div class="response-title">Stretching & Recovery 🧘</div>
      <div class="response-subtitle">${escapeHtml(r.penjelasan)}</div>
    </div>
    <div class="exercise-list">${cards}</div>
    ${tips ? `<div style="margin-top:14px;"><div class="response-subtitle" style="margin-bottom:8px;">💤 Tips Recovery:</div><ul class="panduan-list">${tips}</ul></div>` : ''}`;
}

function renderRumahResponse(r) {
  const cards = r.latihan.map(l => `
    <div class="exercise-card">
      <div class="exercise-header">
        <span class="exercise-name">🏠 ${escapeHtml(l.nama)}</span>
        <span class="exercise-level level-${l.level.toLowerCase()}">${escapeHtml(l.level)}</span>
      </div>
      <p class="exercise-desc">${escapeHtml(l.deskripsi)}</p>
      <p class="exercise-target">🎯 ${escapeHtml(l.target_otot)}</p>
      <div class="exercise-meta">
        <span class="meta-item">🔁 ${l.set} Set</span>
        <span class="meta-item">⚡ <span class="meta-val">${escapeHtml(String(l.repetisi))}</span></span>
      </div>
      ${l.tips ? `<div class="exercise-tip">💡 ${escapeHtml(l.tips)}</div>` : ''}
    </div>`).join('');
  let programHtml = '';
  if (r.program_rumah) {
    const jadwal = r.program_rumah.jadwal.map(j => `
      <div class="jadwal-card">
        <div class="jadwal-day">📅 ${escapeHtml(j.hari)}</div>
        <div class="jadwal-focus">${escapeHtml(j.fokus)}</div>
        <div class="jadwal-exercises">${j.latihan.map(l => `<span class="jadwal-tag">${escapeHtml(l)}</span>`).join('')}</div>
      </div>`).join('');
    programHtml = `<div style="margin-top:14px;"><div class="response-subtitle" style="margin-bottom:8px;">📅 ${escapeHtml(r.program_rumah.nama)}:</div><div class="jadwal-grid">${jadwal}</div></div>`;
  }
  return `
    <div class="response-header">
      <span class="response-label">Home Workout</span>
      <div class="response-title">Latihan Di Rumah Tanpa Alat 🏠</div>
      <div class="response-subtitle">${escapeHtml(r.penjelasan)}</div>
    </div>
    <div class="exercise-list">${cards}</div>${programHtml}`;
}

function renderProgramLanjutanResponse(r) {
  const programs = (r.program_list || []).map(p => `
    <div class="exercise-card">
      <div class="exercise-header">
        <span class="exercise-name">📋 ${escapeHtml(p.nama)}</span>
        <span class="exercise-level level-menengah">${escapeHtml(p.level)}</span>
      </div>
      <p class="exercise-desc">${escapeHtml(p.deskripsi)}</p>
      <div class="exercise-meta" style="margin-bottom:8px;"><span class="meta-item">📅 ${escapeHtml(p.frekuensi)}</span></div>
      <div style="display:flex;flex-direction:column;gap:3px;">
        ${p.jadwal.map(j => `
          <div style="font-size:12px;color:var(--text-secondary);padding:3px 0;border-bottom:1px solid var(--border);">
            <span style="color:var(--accent);font-weight:600;">${escapeHtml(j.hari)}</span> — ${escapeHtml(j.fokus)}
          </div>`).join('')}
      </div>
      <div class="exercise-tip" style="margin-top:8px;">👤 Cocok untuk: ${escapeHtml(p.cocok_untuk)}</div>
    </div>`).join('');
  return `
    <div class="response-header">
      <span class="response-label">Program Lanjutan</span>
      <div class="response-title">Program Intermediate & Advanced 📋</div>
      <div class="response-subtitle">${escapeHtml(r.penjelasan)}</div>
    </div>
    <div class="exercise-list">${programs}</div>`;
}

function renderCederaResponse(r) {
  const pencegahan = (r.panduan_pencegahan || []).map(p => `<li>${escapeHtml(p)}</li>`).join('');
  const cedera = (r.jenis_cedera_umum || []).map(c => `
    <div class="exercise-card">
      <div class="exercise-name" style="margin-bottom:6px;">⚠️ ${escapeHtml(c.nama)}</div>
      <p class="exercise-desc">${escapeHtml(c.deskripsi)}</p>
      <div class="exercise-tip">🩹 Penanganan: ${escapeHtml(c.penanganan)}</div>
    </div>`).join('');
  return `
    <div class="response-header">
      <span class="response-label">Cedera & Keamanan</span>
      <div class="response-title">Pencegahan & Penanganan Cedera 🩹</div>
      <div class="response-subtitle">${escapeHtml(r.penjelasan)}</div>
    </div>
    <ul class="panduan-list" style="margin-bottom:14px;">${pencegahan}</ul>
    <div class="response-subtitle" style="margin-bottom:8px;">⚠️ Jenis Cedera Umum di Gym:</div>
    <div class="exercise-list">${cedera}</div>`;
}

// ============================================================
// TYPING INDICATOR
// ============================================================
function showTypingIndicator() {
  const row = document.createElement('div');
  row.className = 'message-row bot';
  row.id = 'typingRow';
  row.innerHTML = `
    <div class="avatar bot">⚡</div>
    <div class="bubble bot">
      <div class="typing-indicator">
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
      </div>
    </div>`;
  chatMessages.appendChild(row);
  scrollToBottom();
  isTyping = true;
  return row;
}

// ============================================================
// UI HELPERS
// ============================================================
function showChatArea() {
  if (welcomeScreen.style.display !== 'none') {
    welcomeScreen.style.display = 'none';
    chatArea.classList.add('active');
  }
}

function resetChat() {
  chatHistory = [];
  chatMessages.innerHTML = '';
  welcomeScreen.style.display = '';
  chatArea.classList.remove('active');
  userInput.focus();
}

function scrollToBottom() { chatArea.scrollTop = chatArea.scrollHeight; }
function setSendDisabled(d) { sendBtn.disabled = d; isTyping = d; }
function autoResize(el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 160) + 'px'; }
function handleKeyDown(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }
function toggleSidebar() { sidebar.classList.toggle('open'); }
function openFlowModal() { document.getElementById('flowModal').classList.add('open'); }
function closeFlowModal() { document.getElementById('flowModal').classList.remove('open'); }

document.getElementById('flowModal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('flowModal')) closeFlowModal();
});

function updateHistorySidebar(firstMessage) {
  if (chatHistory.filter(h => h.role === 'user').length === 1) {
    sessionCount++;
    const emptyEl = chatHistoryEl.querySelector('.history-empty');
    if (emptyEl) emptyEl.remove();
    chatHistoryEl.querySelectorAll('.history-item').forEach(el => el.classList.remove('active'));
    const item = document.createElement('div');
    item.className = 'history-item active';
    item.innerHTML = `<span class="history-icon">💬</span><span>${escapeHtml(firstMessage.slice(0, 28))}${firstMessage.length > 28 ? '…' : ''}</span>`;
    chatHistoryEl.insertBefore(item, chatHistoryEl.firstChild);
  }
}

// ============================================================
// UTILITY
// ============================================================
function escapeHtml(str) {
  if (typeof str !== 'string') return String(str);
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function capitalize(str) { return str.charAt(0).toUpperCase() + str.slice(1); }

// Init
userInput.focus();
console.log('🏋️ FitBot siap! Topik: latihan, nutrisi, suplemen, abs, stretching, rumah, PPL, 5x5, cedera, dan banyak lagi.');
