// backend/src/routes/voiceRoutes.test.js
const mockGenerateContent = jest.fn();

// Mock @google/genai dengan closure (...args) => mockGenerateContent(...args)
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: {
      generateContent: (...args) => mockGenerateContent(...args)
    }
  })),
  Type: {
    OBJECT: 'OBJECT',
    STRING: 'STRING',
    NUMBER: 'NUMBER',
    INTEGER: 'INTEGER'
  }
}));

jest.mock('../config/googleAuth', () => ({
  getAuthClient: jest.fn().mockResolvedValue({}),
}));

jest.mock('../services/sheetsService', () => {
  const actual = jest.requireActual('../services/sheetsService');
  return {
    ...actual,
    getTransactions: jest.fn(),
    saveTransactions: jest.fn(),
    updateTransactionDetails: jest.fn()
  };
});

const router = require('./voiceRoutes');
const { normalizeCategory } = require('../services/voiceService');
const { calculateFinancialSummary, getTransactions, saveTransactions, updateTransactionDetails } = require('../services/sheetsService');

describe('Voice Assistant Backend Test Suite', () => {
  function createMockRes() {
    const res = {};
    res.statusCode = 200;
    res.status = jest.fn().mockImplementation((code) => {
      res.statusCode = code;
      return res;
    });
    res.json = jest.fn().mockImplementation((data) => {
      res.body = data;
      return res;
    });
    return res;
  }

  async function invokePostProcessRoute(req, res, next) {
    const route = router.stack.find(
      (layer) => layer.route && layer.route.path === '/process' && layer.route.methods.post
    );
    const handler = route.route.stack[0].handle;
    await handler(req, res, next);
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================
  // 1. Unit Test: normalizeCategory() & Word-Boundary
  // ==========================================
  describe('normalizeCategory() Word-Boundary & Specificity Test Suite', () => {
    test('Exact match DEFAULT_CATEGORIES (case-insensitive)', () => {
      expect(normalizeCategory('Makanan & Minuman')).toBe('Makanan & Minuman');
      expect(normalizeCategory('transportasi')).toBe('Transportasi');
      expect(normalizeCategory('BELANJA')).toBe('Belanja');
      expect(normalizeCategory('Tagihan & Utilitas')).toBe('Tagihan & Utilitas');
      expect(normalizeCategory('Hiburan')).toBe('Hiburan');
      expect(normalizeCategory('Kesehatan')).toBe('Kesehatan');
      expect(normalizeCategory('Tabungan & Investasi')).toBe('Tabungan & Investasi');
      expect(normalizeCategory('Transfer')).toBe('Transfer');
      expect(normalizeCategory('Lainnya')).toBe('Lainnya');
    });

    test('Memetakan kombinasi "kata kerja generik + objek spesifik" ke kategori objek spesifik (bukan tertelan Belanja)', () => {
      expect(normalizeCategory('beli obat di apotek')).toBe('Kesehatan');
      expect(normalizeCategory('beli tiket bioskop')).toBe('Hiburan');
      expect(normalizeCategory('beli tiket konser')).toBe('Hiburan');
      expect(normalizeCategory('beli pulsa telkomsel')).toBe('Tagihan & Utilitas');
      expect(normalizeCategory('beli bensin di pom')).toBe('Transportasi');
      expect(normalizeCategory('bayar tagihan listrik PLN')).toBe('Tagihan & Utilitas');
      expect(normalizeCategory('bayar iuran BPJS')).toBe('Tagihan & Utilitas');
      expect(normalizeCategory('order makan siang warteg')).toBe('Makanan & Minuman');
      expect(normalizeCategory('pesan kopi cafe')).toBe('Makanan & Minuman');
      expect(normalizeCategory('beli baju di mall')).toBe('Belanja');
      expect(normalizeCategory('belanja bulanan supermarket')).toBe('Belanja');
      expect(normalizeCategory('beli reksadana bibit')).toBe('Tabungan & Investasi');
      expect(normalizeCategory('kirim uang ke orang tua')).toBe('Transfer');
    });

    test('Word-boundary matching: Mencegah keyword pendek (rs, tas, tol, air, xl, pln) nyangkut sebagai substring di dalam kata lain', () => {
      // 1. Keyword 'rs' tidak boleh false-match di 'kursi', 'bersih', 'kursus'
      expect(normalizeCategory('beli kursi kantor')).not.toBe('Kesehatan');
      expect(normalizeCategory('beli kursi kantor')).toBe('Belanja');
      expect(normalizeCategory('bersih-bersih kamar kos')).not.toBe('Kesehatan');
      expect(normalizeCategory('bersih-bersih kamar kos')).toBe('Lainnya');
      expect(normalizeCategory('kursus bahasa inggris')).not.toBe('Kesehatan');
      expect(normalizeCategory('kursus bahasa inggris')).toBe('Lainnya');

      // 2. Keyword 'tas' tidak boleh false-match di 'atas', 'kertas', 'pesta'
      expect(normalizeCategory('transfer di atas jam 5 sore')).toBe('Transfer');
      expect(normalizeCategory('beli kertas hvs')).toBe('Belanja'); // 'beli' -> Belanja, bukan 'tas'
      expect(normalizeCategory('tugas kuliah semester ini')).not.toBe('Belanja');
      expect(normalizeCategory('tugas kuliah semester ini')).toBe('Lainnya');

      // 3. Keyword 'tol' tidak boleh false-match di 'tolol'
      expect(normalizeCategory('motor tolol di jalan')).not.toBe('Transportasi');
      expect(normalizeCategory('bayar tol jagorawi')).toBe('Transportasi');

      // 4. Keyword 'air' tidak boleh false-match di 'cairkan'
      expect(normalizeCategory('cairkan dana reksadana')).toBe('Tabungan & Investasi');
      expect(normalizeCategory('bayar tagihan air pdam')).toBe('Tagihan & Utilitas');

      // 5. Keyword 'xl' dan 'pln' sebagai kata utuh
      expect(normalizeCategory('beli pulsa xl')).toBe('Tagihan & Utilitas');
      expect(normalizeCategory('bayar tagihan pln')).toBe('Tagihan & Utilitas');
      expect(normalizeCategory('periksa ke rs fatmawati')).toBe('Kesehatan'); // 'rs' sebagai kata utuh -> Kesehatan
    });

    test('Memetakan kata kerja generik murni ke Belanja jika tanpa objek spesifik lain', () => {
      expect(normalizeCategory('beli barang baru')).toBe('Belanja');
      expect(normalizeCategory('shopping online')).toBe('Belanja');
      expect(normalizeCategory('belanja kebutuhan')).toBe('Belanja');
    });

    test('Mencegah false positive substring pendek seperti "in", "an", "a", "k" ke "Makanan & Minuman"', () => {
      expect(normalizeCategory('in')).toBe('Lainnya');
      expect(normalizeCategory('an')).toBe('Lainnya');
      expect(normalizeCategory('a')).toBe('Lainnya');
      expect(normalizeCategory('k')).toBe('Lainnya');
    });

    test('Fallback ke "Lainnya" untuk input kosong, null, undefined, atau kategori asing', () => {
      expect(normalizeCategory('')).toBe('Lainnya');
      expect(normalizeCategory(null)).toBe('Lainnya');
      expect(normalizeCategory(undefined)).toBe('Lainnya');
      expect(normalizeCategory('crypto token arbitrum')).toBe('Lainnya');
      expect(normalizeCategory('forex trading')).toBe('Lainnya');
    });
  });

  // ==========================================
  // 2. Unit Test: calculateFinancialSummary()
  // ==========================================
  describe('calculateFinancialSummary() Logic & Aggregation', () => {
    test('Menghitung totalIncome, totalExpense, netBalance, categoryBreakdown, dan weeklyExpense secara akurat', () => {
      const mockTxs = [
        { id: '1', date: '2026-08-02', type: 'Transfer Masuk', amount: 5000000, category: 'Transfer' },
        { id: '2', date: '2026-08-05', type: 'Pengeluaran', amount: 50000, category: 'Makanan & Minuman' },
        { id: '3', date: '2026-08-10', type: 'Pengeluaran', amount: 150000, category: 'Transportasi' },
        { id: '4', date: '2026-08-20', type: 'Pengeluaran', amount: 200000, category: 'Makanan & Minuman' }
      ];

      const summary = calculateFinancialSummary(mockTxs, { month: 8, year: 2026, bank: 'SeaBank' });

      expect(summary.totalIncome).toBe(5000000);
      expect(summary.totalExpense).toBe(400000);
      expect(summary.netBalance).toBe(4600000);
      expect(summary.transactionCount).toBe(4);
      expect(summary.categoryBreakdown['Makanan & Minuman']).toBe(250000);
      expect(summary.categoryBreakdown['Transportasi']).toBe(150000);
      expect(summary.period).toEqual({ month: 8, year: 2026, bank: 'SeaBank' });
      expect(summary.weeklyExpense).toHaveLength(4);
    });
  });

  // ==========================================
  // 3. Route POST /api/voice/process Tests
  // ==========================================
  describe('POST /api/voice/process Route Handlers', () => {
    test('Mengembalikan HTTP 400 jika request body tidak menyertakan text atau text kosong', async () => {
      const req = { body: { text: '   ' } };
      const res = createMockRes();
      const next = jest.fn();

      await invokePostProcessRoute(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Field text wajib diisi');
    });

    test('Intent add_transaction: Mengembalikan DRAFT transaksi tanpa memanggil saveTransactions()', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        functionCalls: [
          {
            name: 'add_transaction',
            args: {
              amount: 35000,
              type: 'Pengeluaran',
              category: 'beli obat di apotek',
              merchant: 'Apotek Kimia Farma',
              notes: 'Beli paracetamol',
              bank: 'SeaBank'
            }
          }
        ]
      });

      const req = { body: { text: 'Catat beli obat di apotek kimia farma 35 ribu pakai SeaBank' } };
      const res = createMockRes();
      const next = jest.fn();

      await invokePostProcessRoute(req, res, next);

      expect(res.status).not.toHaveBeenCalledWith(400);
      expect(res.body.success).toBe(true);
      expect(res.body.data.intent).toBe('add_transaction');
      expect(res.body.data.status).toBe('draft');
      expect(res.body.data.draft).toEqual(expect.objectContaining({
        amount: 35000,
        type: 'Pengeluaran',
        category: 'Kesehatan', // Terbukti tidak salah jadi Belanja
        merchant: 'Apotek Kimia Farma',
        bank: 'SeaBank',
        notes: 'Beli paracetamol'
      }));

      // Non-negotiable: Tidak boleh auto-save ke Sheets
      expect(saveTransactions).not.toHaveBeenCalled();
    });

    test('Intent edit_transaction: Mengembalikan DRAFT perubahan transaksi tanpa memanggil updateTransactionDetails()', async () => {
      getTransactions.mockResolvedValueOnce([
        {
          id: 'TXN-999',
          merchant: 'XXI Cinema',
          amount: 50000,
          category: 'Lainnya',
          notes: '',
          date: '2026-08-20T10:00:00.000Z'
        }
      ]);

      mockGenerateContent.mockResolvedValueOnce({
        functionCalls: [
          {
            name: 'edit_transaction',
            args: {
              searchMerchant: 'XXI',
              category: 'beli tiket bioskop',
              notes: 'Nonton film bareng teman'
            }
          }
        ]
      });

      const req = { body: { text: 'Ubah kategori transaksi XXI jadi tiket bioskop dan catatan nonton film' } };
      const res = createMockRes();
      const next = jest.fn();

      await invokePostProcessRoute(req, res, next);

      expect(res.body.success).toBe(true);
      expect(res.body.data.intent).toBe('edit_transaction');
      expect(res.body.data.status).toBe('draft');
      expect(res.body.data.draft).toEqual(expect.objectContaining({
        transactionId: 'TXN-999',
        merchant: 'XXI Cinema',
        oldCategory: 'Lainnya',
        newCategory: 'Hiburan', // Terbukti tidak salah jadi Belanja
        oldNotes: '',
        newNotes: 'Nonton film bareng teman'
      }));

      // Non-negotiable: Tidak boleh auto-update ke Sheets
      expect(updateTransactionDetails).not.toHaveBeenCalled();
    });

    test('Intent query_summary: Mengambil data real dari Sheets, menghitung agregasi, dan mengirimkan angka asli ke Gemini untuk sintesis', async () => {
      const mockTransactions = [
        { id: '1', date: '2026-08-01', type: 'Transfer Masuk', amount: 10000000, category: 'Transfer' },
        { id: '2', date: '2026-08-05', type: 'Pengeluaran', amount: 1500000, category: 'Makanan & Minuman' },
        { id: '3', date: '2026-08-10', type: 'Pengeluaran', amount: 500000, category: 'Transportasi' }
      ];

      getTransactions.mockResolvedValueOnce(mockTransactions);

      // Step 1: Function call extraction
      mockGenerateContent.mockResolvedValueOnce({
        functionCalls: [
          {
            name: 'query_summary',
            args: { month: 8, year: 2026 }
          }
        ]
      });

      // Step 2: Grounded synthesis response
      mockGenerateContent.mockResolvedValueOnce({
        text: 'Total pengeluaran Anda di bulan Agustus 2026 adalah Rp 2.000.000 dengan sisa saldo Rp 8.000.000.'
      });

      const req = { body: { text: 'Berapa total pengeluaran dan saldo saya bulan ini?' } };
      const res = createMockRes();
      const next = jest.fn();

      await invokePostProcessRoute(req, res, next);

      expect(res.body.success).toBe(true);
      expect(res.body.data.intent).toBe('query_summary');
      expect(res.body.data.status).toBe('completed');
      expect(res.body.data.reply).toBe('Total pengeluaran Anda di bulan Agustus 2026 adalah Rp 2.000.000 dengan sisa saldo Rp 8.000.000.');
      expect(res.body.data.data.totalExpense).toBe(2000000);
      expect(res.body.data.data.totalIncome).toBe(10000000);
      expect(res.body.data.data.netBalance).toBe(8000000);

      // Verifikasi prompt sintesis kedua memuat persis angka faktual dari Sheets
      const secondCallArgs = mockGenerateContent.mock.calls[1][0];
      expect(secondCallArgs.contents).toContain('"totalExpense": 2000000');
      expect(secondCallArgs.contents).toContain('"netBalance": 8000000');
    });

    test('Pertanyaan umum di luar intent: Mengembalikan reply umum dengan status completed', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        functionCalls: [],
        text: 'Halo! Saya asisten suara SeaTrack. Ada yang bisa dibantu?'
      });

      const req = { body: { text: 'Halo selamat pagi' } };
      const res = createMockRes();
      const next = jest.fn();

      await invokePostProcessRoute(req, res, next);

      expect(res.body.success).toBe(true);
      expect(res.body.data.intent).toBe('general');
      expect(res.body.data.status).toBe('completed');
      expect(res.body.data.reply).toBe('Halo! Saya asisten suara SeaTrack. Ada yang bisa dibantu?');
    });
  });
});
