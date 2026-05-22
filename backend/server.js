/**
 * ============================================================
 * BACKEND SERVER - Chatbot Fitness Berbasis Rule-Based
 * Mata Kuliah: Sistem Cerdas
 * ============================================================
 * ALUR: User Input → Normalisasi → Rule Matching → Knowledge Base → Response
 */

const express = require('express');
const cors    = require('cors');
const fs      = require('fs');
const path    = require('path');

const app  = express();
const PORT = 3001;

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, '../frontend')));

// ============================================================
// LOAD KNOWLEDGE BASE
// ============================================================
const KB_PATH = path.join(__dirname, '../knowledge-base/fitness_knowledge.json');
let knowledgeBase = [];

try {
  const raw = fs.readFileSync(KB_PATH, 'utf-8');
  knowledgeBase = JSON.parse(raw).pengetahuan;
  console.log(`✅ Knowledge base dimuat: ${knowledgeBase.length} kategori`);
} catch (err) {
  console.error('❌ Gagal memuat knowledge base:', err.message);
}

// ============================================================
// RULE-BASED ENGINE
// ============================================================

function normalizeInput(text) {
  return text.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();
}

/**
 * RULE: IF input mengandung keyword → THEN cocokkan kategori
 * Scoring: keyword lebih panjang = lebih spesifik = skor lebih tinggi
 */
function findMatchingCategory(input) {
  let bestMatch = null;
  let highestScore = 0;

  for (const kategori of knowledgeBase) {
    let score = 0;
    for (const keyword of kategori.keywords) {
      if (input.includes(keyword)) {
        score += keyword.length;
      }
    }
    if (score > highestScore) {
      highestScore = score;
      bestMatch = kategori;
    }
  }

  return highestScore > 0 ? bestMatch : null;
}

/**
 * Format response sesuai tipe kategori
 */
function formatResponse(k) {
  // Latihan (dada, punggung, kaki, bahu, lengan, cardio, pemanasan, abs, stretching, rumah)
  if (k.latihan && Array.isArray(k.latihan)) {
    // Kategori stretching punya tips_recovery tambahan
    if (k.kategori === 'stretching') {
      return { type: 'stretching', kategori: k.kategori, penjelasan: k.penjelasan, latihan: k.latihan, tips_recovery: k.tips_recovery || [] };
    }
    // Kategori rumah punya program_rumah tambahan
    if (k.kategori === 'rumah') {
      return { type: 'rumah', kategori: k.kategori, penjelasan: k.penjelasan, latihan: k.latihan, program_rumah: k.program_rumah || null };
    }
    return { type: 'latihan', kategori: k.kategori, latihan: k.latihan };
  }

  // Bulking / Cutting (panduan + latihan rekomendasi)
  if (k.panduan && k.penjelasan && k.latihan_rekomendasi !== undefined) {
    return { type: 'panduan', kategori: k.kategori, penjelasan: k.penjelasan, panduan: k.panduan, latihan_rekomendasi: k.latihan_rekomendasi || [] };
  }

  // Nutrisi (panduan + contoh_menu)
  if (k.kategori === 'nutrisi') {
    return { type: 'nutrisi', kategori: k.kategori, penjelasan: k.penjelasan, panduan: k.panduan, contoh_menu: k.contoh_menu || [] };
  }

  // Suplemen (panduan + prioritas)
  if (k.kategori === 'suplemen') {
    return { type: 'suplemen', kategori: k.kategori, penjelasan: k.penjelasan, panduan: k.panduan, prioritas: k.prioritas || [] };
  }

  // Program lanjutan (PPL, 5x5, dll)
  if (k.kategori === 'program_lanjutan') {
    return { type: 'program_lanjutan', kategori: k.kategori, penjelasan: k.penjelasan, program_list: k.program_list || [] };
  }

  // Cedera & pencegahan
  if (k.kategori === 'cedera') {
    return { type: 'cedera', kategori: k.kategori, penjelasan: k.penjelasan, panduan_pencegahan: k.panduan_pencegahan || [], jenis_cedera_umum: k.jenis_cedera_umum || [] };
  }

  // Jadwal
  if (k.program) {
    return { type: 'jadwal', kategori: k.kategori, penjelasan: k.penjelasan, program: k.program };
  }

  // Set & rep
  if (k.kategori === 'set_rep') {
    return { type: 'set_rep', kategori: k.kategori, penjelasan: k.penjelasan, panduan: k.panduan };
  }

  // Pemula
  if (k.tips) {
    return { type: 'pemula', kategori: k.kategori, penjelasan: k.penjelasan, tips: k.tips, latihan_awal: k.latihan_awal || [] };
  }

  return { type: 'info', kategori: k.kategori, message: 'Informasi ditemukan namun format belum tersedia.' };
}

// ============================================================
// KEYWORD KHUSUS
// ============================================================
const greetingKeywords = ['halo', 'hai', 'hello', 'hi', 'selamat', 'hei', 'hy'];
const thankKeywords    = ['terima kasih', 'makasih', 'thanks', 'thank', 'thx'];
const fitnessHints     = ['gym', 'latih', 'olahraga', 'workout', 'fitness', 'otot', 'tubuh', 'sehat', 'bb', 'berat badan'];

const greetingResponses = [
  'Halo! Selamat datang di FitBot 💪 Tanyakan apa saja tentang latihan, nutrisi, suplemen, atau program gym!',
  'Hai! Saya FitBot, asisten fitness kamu. Coba tanyakan tentang latihan dada, program PPL, panduan nutrisi, atau tips menghindari cedera!',
  'Hello! Senang bertemu denganmu 🏋️ Saya siap membantu dengan informasi seputar fitness dan gym.'
];

// ============================================================
// API ENDPOINT - PROSES CHAT
// ============================================================
app.post('/api/chat', (req, res) => {
  const { message } = req.body;

  if (!message || message.trim() === '') {
    return res.json({ success: false, response: { type: 'error', message: 'Pesan tidak boleh kosong!' } });
  }

  const input = normalizeInput(message);
  console.log(`📩 Input: "${message}" → "${input}"`);

  // RULE 1: Greeting
  if (greetingKeywords.some(kw => input.includes(kw))) {
    const msg = greetingResponses[Math.floor(Math.random() * greetingResponses.length)];
    return res.json({ success: true, response: { type: 'greeting', message: msg } });
  }

  // RULE 2: Terima kasih
  if (thankKeywords.some(kw => input.includes(kw))) {
    return res.json({ success: true, response: { type: 'thanks', message: 'Sama-sama! Semangat latihan ya! 💪 Kalau ada pertanyaan lain seputar fitness, jangan ragu bertanya.' } });
  }

  // RULE 3: Match ke knowledge base
  const match = findMatchingCategory(input);
  if (match) {
    console.log(`✅ Match: "${match.kategori}"`);
    return res.json({ success: true, response: formatResponse(match) });
  }

  // RULE 4: Kemungkinan fitness tapi topik belum ada
  if (fitnessHints.some(h => input.includes(h))) {
    return res.json({
      success: true,
      response: {
        type: 'unknown_fitness',
        message: `Maaf, saya belum memiliki pengetahuan tentang topik tersebut. 🤔\n\nCoba tanyakan tentang:\n• Latihan dada, punggung, kaki, bahu, lengan, abs\n• Latihan di rumah tanpa alat\n• Program bulking atau cutting\n• Nutrisi & makanan fitness\n• Suplemen (whey, creatine, BCAA)\n• Stretching & recovery\n• Program PPL, 5x5, Upper/Lower\n• Cedera & pencegahan\n• Jadwal gym untuk pemula`
      }
    });
  }

  // RULE 5: Di luar topik fitness
  return res.json({
    success: true,
    response: {
      type: 'out_of_topic',
      message: `Maaf, pertanyaanmu berada di luar topik chatbot fitness ini. 🏋️\n\nSaya hanya bisa menjawab seputar:\n• Latihan gym (dada, punggung, kaki, bahu, lengan, abs)\n• Latihan di rumah tanpa alat\n• Program bulking & cutting\n• Nutrisi & makanan\n• Suplemen fitness\n• Stretching & recovery\n• Program lanjutan (PPL, 5x5, Bro Split)\n• Cedera & pencegahan\n• Jadwal & panduan untuk pemula`
    }
  });
});

// GET /api/categories
app.get('/api/categories', (req, res) => {
  const categories = knowledgeBase.map(k => ({ id: k.id, kategori: k.kategori, keywords: k.keywords }));
  res.json({ success: true, data: categories });
});

// GET /api/health
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', knowledge_base_loaded: knowledgeBase.length, timestamp: new Date().toISOString() });
});

// ============================================================
// START SERVER
// ============================================================
app.listen(PORT, () => {
  console.log('============================================================');
  console.log('  🏋️  FITBOT SERVER - SISTEM CERDAS');
  console.log('============================================================');
  console.log(`  ✅ Berjalan di: http://localhost:${PORT}`);
  console.log(`  📚 Kategori dimuat: ${knowledgeBase.length}`);
  console.log(`  📋 Topik: latihan, nutrisi, suplemen, abs, stretching,`);
  console.log(`            rumah, PPL/5x5, cedera, jadwal, pemula, dll`);
  console.log('============================================================');
});
