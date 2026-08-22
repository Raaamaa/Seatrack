// backend/src/services/voiceService.js
const { GoogleGenAI, Type } = require('@google/genai');
const { DEFAULT_CATEGORIES } = require('../config/constants');
const { getTransactions, calculateFinancialSummary } = require('./sheetsService');
require('dotenv').config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';

// 1. SPECIFIC_KEYWORDS: Kata benda / domain / tempat spesifik (Prioritas Tinggi)
const SPECIFIC_KEYWORDS = {
  // Makanan & Minuman
  'makan': 'Makanan & Minuman',
  'minum': 'Makanan & Minuman',
  'kuliner': 'Makanan & Minuman',
  'restoran': 'Makanan & Minuman',
  'warung': 'Makanan & Minuman',
  'kafe': 'Makanan & Minuman',
  'cafe': 'Makanan & Minuman',
  'kopi': 'Makanan & Minuman',
  'snack': 'Makanan & Minuman',
  'sarapan': 'Makanan & Minuman',
  'lunch': 'Makanan & Minuman',
  'dinner': 'Makanan & Minuman',
  'gofood': 'Makanan & Minuman',
  'grabfood': 'Makanan & Minuman',
  'shopeefood': 'Makanan & Minuman',
  'kfc': 'Makanan & Minuman',
  'mcd': 'Makanan & Minuman',

  // Transportasi
  'bensin': 'Transportasi',
  'bbm': 'Transportasi',
  'pertamax': 'Transportasi',
  'pertalite': 'Transportasi',
  'solar': 'Transportasi',
  'parkir': 'Transportasi',
  'tol': 'Transportasi',
  'ojol': 'Transportasi',
  'gojek': 'Transportasi',
  'grab': 'Transportasi',
  'maxim': 'Transportasi',
  'taksi': 'Transportasi',
  'kereta': 'Transportasi',
  'krl': 'Transportasi',
  'mrt': 'Transportasi',
  'lrt': 'Transportasi',
  'pesawat': 'Transportasi',
  'kendaraan': 'Transportasi',

  // Hiburan
  'nonton': 'Hiburan',
  'bioskop': 'Hiburan',
  'cinema': 'Hiburan',
  'xxi': 'Hiburan',
  'cgv': 'Hiburan',
  'tiket bioskop': 'Hiburan',
  'tiket konser': 'Hiburan',
  'game': 'Hiburan',
  'topup game': 'Hiburan',
  'steam': 'Hiburan',
  'playstation': 'Hiburan',
  'wisata': 'Hiburan',
  'rekreasi': 'Hiburan',
  'karaoke': 'Hiburan',
  'spotify': 'Hiburan',
  'netflix': 'Hiburan',
  'disney': 'Hiburan',

  // Tagihan & Utilitas
  'listrik': 'Tagihan & Utilitas',
  'pln': 'Tagihan & Utilitas',
  'token listrik': 'Tagihan & Utilitas',
  'air': 'Tagihan & Utilitas',
  'pdam': 'Tagihan & Utilitas',
  'wifi': 'Tagihan & Utilitas',
  'internet': 'Tagihan & Utilitas',
  'indihome': 'Tagihan & Utilitas',
  'biznet': 'Tagihan & Utilitas',
  'myrepublic': 'Tagihan & Utilitas',
  'pulsa': 'Tagihan & Utilitas',
  'paket data': 'Tagihan & Utilitas',
  'kuota': 'Tagihan & Utilitas',
  'telkomsel': 'Tagihan & Utilitas',
  'indosat': 'Tagihan & Utilitas',
  'xl': 'Tagihan & Utilitas',
  'bpjs': 'Tagihan & Utilitas',
  'iuran': 'Tagihan & Utilitas',
  'asuransi': 'Tagihan & Utilitas',

  // Kesehatan
  'obat': 'Kesehatan',
  'apotek': 'Kesehatan',
  'apotik': 'Kesehatan',
  'dokter': 'Kesehatan',
  'rumah sakit': 'Kesehatan',
  'rs': 'Kesehatan',
  'klinik': 'Kesehatan',
  'puskesmas': 'Kesehatan',
  'vitamin': 'Kesehatan',
  'medis': 'Kesehatan',
  'halodoc': 'Kesehatan',
  'alodokter': 'Kesehatan',

  // Tabungan & Investasi
  'tabungan': 'Tabungan & Investasi',
  'nabung': 'Tabungan & Investasi',
  'investasi': 'Tabungan & Investasi',
  'reksadana': 'Tabungan & Investasi',
  'bibit': 'Tabungan & Investasi',
  'bareksa': 'Tabungan & Investasi',
  'saham': 'Tabungan & Investasi',
  'stockbit': 'Tabungan & Investasi',
  'ajaib': 'Tabungan & Investasi',
  'emas': 'Tabungan & Investasi',
  'deposito': 'Tabungan & Investasi',

  // Belanja (Nouns & Retailers)
  'baju': 'Belanja',
  'pakaian': 'Belanja',
  'celana': 'Belanja',
  'sepatu': 'Belanja',
  'tas': 'Belanja',
  'supermarket': 'Belanja',
  'minimarket': 'Belanja',
  'indomaret': 'Belanja',
  'alfamart': 'Belanja',
  'pasar': 'Belanja',
  'mall': 'Belanja',
  'shopee': 'Belanja',
  'tokopedia': 'Belanja',
  'lazada': 'Belanja',
  'zalora': 'Belanja',
  'elektronik': 'Belanja',
  'gadget': 'Belanja'
};

// 2. GENERIC_KEYWORDS: Kata kerja generik (Prioritas Rendah — dievaluasi hanya jika tidak ada SPECIFIC_KEYWORDS yang cocok)
const GENERIC_KEYWORDS = {
  'beli': 'Belanja',
  'shopping': 'Belanja',
  'belanja': 'Belanja',
  'order': 'Belanja',
  'pesan': 'Belanja',
  'kirim': 'Transfer',
  'transfer': 'Transfer',
  'kirim uang': 'Transfer',
  'bayar': 'Lainnya'
};

/**
 * Helper untuk meng-escape karakter regex khusus
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Helper Word-Boundary Matching:
 * Mencocokkan kata/frasa utuh yang dibatasi oleh spasi, tanda baca, atau awal/akhir string.
 * Mencegah substring pendek (seperti 'rs', 'tas', 'air', 'tol', 'xl') nyangkut di dalam kata lain
 * seperti 'kursi', 'bersih', 'atas', 'kertas', 'tolol', 'cairkan'.
 */
function matchWordBoundary(text, keyword) {
  if (!text || !keyword) return false;
  const escaped = escapeRegExp(keyword.trim());
  const regex = new RegExp(`(^|[\\s.,!?;:()\\-"'/])${escaped}($|[\\s.,!?;:()\\-"'/])`, 'i');
  return regex.test(text);
}

/**
 * Normalisasi kategori input ke 9 kategori valid SeaTrack
 * Menggunakan arsitektur multi-tier specificity dengan Word-Boundary Regex:
 * Tier 1: Exact match DEFAULT_CATEGORIES
 * Tier 2: Specific keyword match dengan word-boundary (longest match wins)
 * Tier 3: Generic keyword match dengan word-boundary
 * Tier 4: Word-boundary match ke DEFAULT_CATEGORIES
 * Tier 5: Fallback "Lainnya"
 */
function normalizeCategory(rawCategory) {
  if (!rawCategory || typeof rawCategory !== 'string') {
    return 'Lainnya';
  }
  const trimmed = rawCategory.trim();
  if (!trimmed) return 'Lainnya';
  const lower = trimmed.toLowerCase();

  // 1. Direct exact match (case-insensitive) dengan DEFAULT_CATEGORIES
  const exactMatch = DEFAULT_CATEGORIES.find(
    c => c.toLowerCase() === lower
  );
  if (exactMatch) return exactMatch;

  // 2. Cari semua keyword spesifik (SPECIFIC_KEYWORDS) yang cocok dengan word boundary
  const matchedSpecific = [];
  for (const [keyword, category] of Object.entries(SPECIFIC_KEYWORDS)) {
    if (matchWordBoundary(lower, keyword)) {
      matchedSpecific.push({ keyword, category, length: keyword.length });
    }
  }

  if (matchedSpecific.length > 0) {
    // Pilih keyword spesifik yang paling panjang/eksplisit (misal "tiket bioskop" > "bioskop")
    matchedSpecific.sort((a, b) => b.length - a.length);
    return matchedSpecific[0].category;
  }

  // 3. Cari keyword generik (GENERIC_KEYWORDS) dengan word boundary
  const matchedGeneric = [];
  for (const [keyword, category] of Object.entries(GENERIC_KEYWORDS)) {
    if (matchWordBoundary(lower, keyword)) {
      matchedGeneric.push({ keyword, category, length: keyword.length });
    }
  }

  if (matchedGeneric.length > 0) {
    matchedGeneric.sort((a, b) => b.length - a.length);
    if (matchedGeneric[0].category !== 'Lainnya') {
      return matchedGeneric[0].category;
    }
  }

  // 4. Word-boundary match ke DEFAULT_CATEGORIES (misal user sebut "kategori transportasi")
  for (const cat of DEFAULT_CATEGORIES) {
    if (matchWordBoundary(lower, cat)) {
      return cat;
    }
  }

  // 5. Default fallback
  return 'Lainnya';
}

/**
 * Tool Declarations untuk @google/genai function calling
 */
const voiceTools = [
  {
    functionDeclarations: [
      {
        name: 'add_transaction',
        description: 'Mencatat transaksi keuangan baru (pengeluaran atau pemasukan) berdasarkan ucapan pengguna.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER, description: 'Nominal transaksi dalam angka bulat Rupiah, misal 25000' },
            type: { 
              type: Type.STRING, 
              enum: ['Pengeluaran', 'Pemasukan', 'Transfer Keluar', 'Transfer Masuk', 'QRIS'],
              description: 'Tipe transaksi' 
            },
            category: { 
              type: Type.STRING, 
              description: 'Kategori transaksi (misal: Makanan & Minuman, Transportasi, Belanja, Tagihan & Utilitas, dll)' 
            },
            merchant: { type: Type.STRING, description: 'Nama merchant, tempat, atau keterangan toko' },
            notes: { type: Type.STRING, description: 'Catatan tambahan transaksi jika ada' },
            bank: { type: Type.STRING, description: 'Sumber rekening atau bank, misal SeaBank, BRI, Jago, Tunai, Manual' },
            date: { type: Type.STRING, description: 'Tanggal transaksi format YYYY-MM-DD (gunakan tanggal hari ini jika tidak disebut)' }
          },
          required: ['amount', 'type']
        }
      },
      {
        name: 'query_summary',
        description: 'Menanyakan ringkasan keuangan, total pengeluaran, total pemasukan, atau saldo pada bulan/tahun tertentu.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            month: { type: Type.INTEGER, description: 'Bulan (1-12)' },
            year: { type: Type.INTEGER, description: 'Tahun 4 digit, misal 2026' },
            bank: { type: Type.STRING, description: 'Filter bank tertentu jika disebutkan' },
            category: { type: Type.STRING, description: 'Filter kategori spesifik jika ditanyakan' }
          }
        }
      },
      {
        name: 'edit_transaction',
        description: 'Mengubah kategori atau catatan dari transaksi yang sudah ada atau transaksi terakhir.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            transactionId: { type: Type.STRING, description: 'ID transaksi jika diketahui (misal TXN-...)' },
            searchMerchant: { type: Type.STRING, description: 'Nama merchant atau keterangan transaksi yang ingin diubah jika ID tidak disebut' },
            category: { type: Type.STRING, description: 'Kategori baru yang diinginkan' },
            notes: { type: Type.STRING, description: 'Catatan baru yang diinginkan' }
          }
        }
      }
    ]
  }
];

/**
 * Memproses teks suara pengguna dengan Gemini function calling
 * @param {object} auth - Google Auth Client
 * @param {string} text - Teks ucapan pengguna
 */
async function processVoiceCommand(auth, text) {
  if (!text || typeof text !== 'string' || text.trim() === '') {
    throw new Error('Teks perintah suara tidak boleh kosong.');
  }

  const todayStr = new Date().toISOString().split('T')[0];

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: text,
    config: {
      systemInstruction: `Anda adalah Voice Assistant cerdas untuk aplikasi pengelola keuangan SeaTrack. 
Gunakan function call yang tepat berdasarkan maksud pengguna dalam bahasa Indonesia:
- add_transaction: untuk mencatat pengeluaran/pemasukan baru.
- query_summary: untuk menanyakan pengeluaran, pemasukan, saldo, atau ringkasan bulanan.
- edit_transaction: untuk mengganti/mengoreksi kategori atau catatan transaksi yang sudah ada.
Hari ini adalah tanggal ${todayStr}.`,
      tools: voiceTools
    }
  });

  const functionCalls = response.functionCalls;

  if (!functionCalls || functionCalls.length === 0) {
    // Pengguna bertanya di luar ketiga intent
    const replyText = response.text || 'Maaf, saya hanya dapat membantu mencatat transaksi, menanyakan ringkasan keuangan, atau mengubah kategori/catatan transaksi.';
    return {
      intent: 'general',
      status: 'completed',
      reply: replyText
    };
  }

  const call = functionCalls[0];
  const { name, args } = call;

  // --- INTENT 1: ADD TRANSACTION (Return Draft) ---
  if (name === 'add_transaction') {
    const rawCategory = args.category || 'Lainnya';
    const validCategory = normalizeCategory(rawCategory);

    const draft = {
      amount: Math.round(Number(args.amount) || 0),
      type: args.type || 'Pengeluaran',
      category: validCategory,
      merchant: args.merchant || 'Manual Input',
      notes: args.notes || '',
      bank: args.bank || 'Manual',
      date: args.date || todayStr
    };

    return {
      intent: 'add_transaction',
      status: 'draft',
      message: `Draft transaksi Rp ${draft.amount.toLocaleString('id-ID')} (${draft.category}) siap dikonfirmasi.`,
      draft
    };
  }

  // --- INTENT 2: EDIT TRANSACTION (Return Draft) ---
  if (name === 'edit_transaction') {
    const transactions = await getTransactions(auth, {});
    let targetTx = null;

    if (args.transactionId) {
      targetTx = transactions.find(t => t.id === args.transactionId);
    } else if (args.searchMerchant) {
      const q = args.searchMerchant.toLowerCase();
      targetTx = transactions.find(t => t.merchant.toLowerCase().includes(q) || t.notes.toLowerCase().includes(q));
    } else {
      // Ambil transaksi paling baru jika tidak ada identifier
      targetTx = transactions[0];
    }

    if (!targetTx) {
      return {
        intent: 'edit_transaction',
        status: 'error',
        message: 'Transaksi yang ingin diubah tidak ditemukan.'
      };
    }

    const newCategory = args.category ? normalizeCategory(args.category) : targetTx.category;
    const newNotes = args.notes !== undefined ? args.notes : targetTx.notes;

    const draft = {
      transactionId: targetTx.id,
      merchant: targetTx.merchant,
      amount: targetTx.amount,
      date: targetTx.date,
      oldCategory: targetTx.category,
      newCategory,
      oldNotes: targetTx.notes,
      newNotes
    };

    return {
      intent: 'edit_transaction',
      status: 'draft',
      message: `Draft perubahan transaksi '${targetTx.merchant}' siap dikonfirmasi.`,
      draft
    };
  }

  // --- INTENT 3: QUERY SUMMARY (Grounded by calculateFinancialSummary) ---
  if (name === 'query_summary') {
    const now = new Date();
    const month = args.month ? parseInt(args.month, 10) : (now.getMonth() + 1);
    const year = args.year ? parseInt(args.year, 10) : now.getFullYear();
    const bank = args.bank || null;
    const targetCategory = args.category ? normalizeCategory(args.category) : null;

    // 1. Ambil data faktual dari Google Sheets
    const transactions = await getTransactions(auth, { month, year, bank });

    // 2. REUSE FUNGSI BERSAMA calculateFinancialSummary
    const summaryData = calculateFinancialSummary(transactions, { month, year, bank });

    const groundData = {
      ...summaryData,
      specificCategoryQuery: targetCategory ? {
        category: targetCategory,
        amount: summaryData.categoryBreakdown[targetCategory] || 0
      } : null
    };

    // 3. Grounded natural language response synthesis via Gemini
    const prompt = `Anda adalah asisten keuangan SeaTrack. Berikan jawaban yang ramah, ringkas, dan jelas dalam 1-2 kalimat bahasa Indonesia berdasarkan DATA ASLI BERIKUT SAJA. 
DILARANG KERAS mengarang, mengasumsikan, atau menghitung ulang angka di luar data yang diberikan.

Pertanyaan Pengguna: "${text}"
Data Asli Ringkasan Keuangan:
${JSON.stringify(groundData, null, 2)}`;

    const synthesisResult = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt
    });
    const naturalReply = (synthesisResult.text || '').trim();

    return {
      intent: 'query_summary',
      status: 'completed',
      reply: naturalReply,
      data: groundData
    };
  }

  return {
    intent: 'unknown',
    status: 'completed',
    reply: 'Perintah tidak dikenali.'
  };
}

module.exports = {
  processVoiceCommand,
  normalizeCategory,
  matchWordBoundary,
  voiceTools,
  SPECIFIC_KEYWORDS,
  GENERIC_KEYWORDS
};
