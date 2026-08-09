const { parseSeaBankEmail, detectTransactionType, parseAmount, parseMerchant } = require('./parsers/seabankParser');
const { parseBriEmail, detectTransactionType: detectBriType, parseBriAmount, parseBriMerchant } = require('./parsers/briParser');
const { parseEmail } = require('./parserService');
const { autoAssignCategory } = require('../utils/categoryHelper');
const { parseDate } = require('../utils/dateHelper');
const { sanitizeFormulaInput } = require('./sheetsService');
const { withRetry } = require('../utils/retryHelper');

describe('Retry Helper (withRetry)', () => {
  test('langsung sukses jika fungsi tidak melempar error', async () => {
    const fn = jest.fn().mockResolvedValue('OK');
    const res = await withRetry(fn, 3, 10);
    expect(res).toBe('OK');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('melakukan retry jika error 429 dan berhasil pada percobaaan berikutnya', async () => {
    let count = 0;
    const fn = jest.fn().mockImplementation(async () => {
      count++;
      if (count === 1) {
        const err = new Error('Rate limit');
        err.code = 429;
        throw err;
      }
      return 'SUCCESS';
    });

    const res = await withRetry(fn, 3, 10);
    expect(res).toBe('SUCCESS');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test('melempar error jika percobaan melebihi maxRetries', async () => {
    const fn = jest.fn().mockImplementation(async () => {
      const err = new Error('Server Error');
      err.code = 500;
      throw err;
    });

    await expect(withRetry(fn, 2, 10)).rejects.toThrow('Server Error');
    expect(fn).toHaveBeenCalledTimes(3); // Initial attempt + 2 retries
  });
});

describe('Sanitize Formula Input', () => {
  test('prepends single quote to inputs starting with formula special characters', () => {
    expect(sanitizeFormulaInput('=SUM(1,2)')).toBe("'=SUM(1,2)");
    expect(sanitizeFormulaInput('+12345')).toBe("'+12345");
    expect(sanitizeFormulaInput('-12345')).toBe("'-12345");
    expect(sanitizeFormulaInput('@cmd')).toBe("'@cmd");
  });

  test('does not alter normal string or number inputs', () => {
    expect(sanitizeFormulaInput('Toko Baju')).toBe('Toko Baju');
    expect(sanitizeFormulaInput('Indomaret')).toBe('Indomaret');
    expect(sanitizeFormulaInput(125000)).toBe(125000);
  });
});

describe('Parser Service Utils', () => {
  test('detectTransactionType detects correct types for SeaBank', () => {
    expect(detectTransactionType('Dana Diterima', 'Uang masuk dari Budi')).toBe('Transfer Masuk');
    expect(detectTransactionType('Transfer Berhasil', 'Transfer keluar ke Anto')).toBe('Transfer Keluar');
    expect(detectTransactionType('Pembayaran Berhasil', 'QRIS payment to Toko Baju')).toBe('QRIS');
    expect(detectTransactionType('Penarikan Sukses', 'Tarik tunai dari ATM')).toBe('Tarik Tunai');
    expect(detectTransactionType('Informasi Rekening', 'Some message')).toBe('Lainnya');
  });

  test('parseAmount parses correct amounts', () => {
    expect(parseAmount('123.456')).toBe(123456);
    expect(parseAmount('1.234.567')).toBe(1234567);
    expect(parseAmount('50.000')).toBe(50000);
  });

  test('parseDate parses full and abbreviated Indonesian month names correctly', () => {
    expect(parseDate('Transaksi pada 12 Juni 2026 14:30 WIB')).toBe('2026-06-12T14:30:00+07:00');
    expect(parseDate('Transaksi pada 12 Jun 2026 14:30 WIB')).toBe('2026-06-12T14:30:00+07:00');
    expect(parseDate('Tanggal: 09 Jul 2026, 20:51:08 WIB')).toBe('2026-07-09T20:51:00+07:00');
  });

  test('parseDate parses numeric dates correctly', () => {
    expect(parseDate('Transaksi pada 12/06/2026 14:30')).toBe('2026-06-12T14:30:00+07:00');
  });

  test('parseDate throws error for invalid date format (fail-loud)', () => {
    expect(() => parseDate('Tidak ada tanggal di sini')).toThrow();
  });

  test('parseMerchant parses SeaBank merchant name correctly', () => {
    expect(parseMerchant('Transfer Keluar', 'Transfer kepada ANTO SUSANTO berhasil')).toBe('ANTO SUSANTO');
    expect(parseMerchant('Transfer Masuk', 'Transfer dari BUDI UTOMO telah masuk')).toBe('BUDI UTOMO');
    expect(parseMerchant('QRIS', 'Pembayaran QRIS ke Kopi Kenangan berhasil')).toBe('Kopi Kenangan');
  });

  test('autoAssignCategory assigns correct categories with payment rail priority', () => {
    expect(autoAssignCategory('Transfer Masuk', 'Budi')).toBe('Pemasukan');
    expect(autoAssignCategory('Transfer Keluar', 'ShopeePay')).toBe('Lainnya');
    expect(autoAssignCategory('Transfer Keluar', 'GoPay')).toBe('Lainnya');
    expect(autoAssignCategory('Transfer Keluar', 'Gojek')).toBe('Transportasi');
    expect(autoAssignCategory('Transfer Keluar', 'Indomaret')).toBe('Belanja');
    expect(autoAssignCategory('Transfer Keluar', 'Shopee Official Store')).toBe('Belanja');
    expect(autoAssignCategory('Transfer Keluar', 'PLN')).toBe('Tagihan & Utilitas');
    expect(autoAssignCategory('Transfer Keluar', 'KFC')).toBe('Makanan & Minuman');
    expect(autoAssignCategory('QRIS', 'WARUNG DWI YA')).toBe('Makanan & Minuman');
    expect(autoAssignCategory('QRIS', 'Toko Kue')).toBe('Belanja');
    expect(autoAssignCategory('Transfer Keluar', 'Random Merchant')).toBe('Lainnya');
  });
});

describe('parseSeaBankEmail Integration', () => {
  test('parses incoming transfer email successfully', () => {
    const emailData = {
      id: 'msg-1',
      subject: 'Dana Diterima - SeaBank',
      body: 'Dana sebesar Rp 250.000 dari BUDI UTOMO telah masuk ke rekening Anda pada 10 Juni 2026 14:30. No. Referensi: Ref12345.'
    };

    const result = parseSeaBankEmail(emailData);
    expect(result).toEqual({
      emailId: 'msg-1',
      referenceId: 'Ref12345',
      date: '2026-06-10T14:30:00+07:00',
      type: 'Transfer Masuk',
      amount: 250000,
      merchant: 'BUDI UTOMO',
      category: 'Pemasukan',
      notes: '',
      source: 'auto',
      rawSubject: 'Dana Diterima - SeaBank',
      bank: 'SeaBank'
    });
  });

  test('parses outgoing transfer email with abbreviated month successfully', () => {
    const emailData = {
      id: 'msg-2',
      subject: 'Transfer Berhasil - SeaBank',
      body: 'Transfer sebesar Rp 150.000 ke ANTO SUSANTO berhasil pada 11 Jun 2026 10:15. No Referensi: Ref67890.'
    };

    const result = parseSeaBankEmail(emailData);
    expect(result).toEqual({
      emailId: 'msg-2',
      referenceId: 'Ref67890',
      date: '2026-06-11T10:15:00+07:00',
      type: 'Transfer Keluar',
      amount: 150000,
      merchant: 'ANTO SUSANTO',
      category: 'Lainnya',
      notes: '',
      source: 'auto',
      rawSubject: 'Transfer Berhasil - SeaBank',
      bank: 'SeaBank'
    });
  });

  test('returns null when date parsing fails (fail-loud)', () => {
    const emailData = {
      id: 'msg-bad-date',
      subject: 'Transfer Berhasil - SeaBank',
      body: 'Transfer sebesar Rp 150.000 ke ANTO SUSANTO berhasil tanpa tanggal.'
    };

    const result = parseSeaBankEmail(emailData);
    expect(result).toBeNull();
  });
});

describe('parseBriEmail Integration (Real Email Samples)', () => {
  const briSample1 = `
Halo, AKHMAD RIZKI RAMADHANI
Berikut ini adalah informasi transaksi yang telah Anda lakukan di Aplikasi BRImo.
10 Juli 2026, 12:33:06 WIB
Total Transaksi
Rp465.997
No. Ref
174473869740
Jenis Transaksi
ShopeePay
Catatan
-
Nominal
Rp465.997
Biaya Admin
Rp0
`;

  const briSample2 = `
Total Transaksi
25.000
Tujuan
MBL324495*WARUNG DWI YA
QRIS Bayar
9360000210065742388
Nomor Referensi
174178940118
Tanggal Transaksi
09 Jul 2026, 20:51:08 WIB
Rekening Sumber Dana
5845 **** **** 537
Nama Sumber Dana
AKHMAD RIZKI RAMADHANI
Jenis Transaksi
QRIS Bayar
Nama Merchant
MBL324495*WARUNG DWI YA
Lokasi Merchant
CIREBON
Nama Penerbit
BRI
Catatan
-
Nominal
Rp25.000
Biaya Admin
Rp0
`;

  test('parses BRI Sample 1 (Top-up ShopeePay via BRImo) correctly', () => {
    const emailData = {
      id: 'msg-bri-1',
      subject: 'Notifikasi Transaksi BRImo',
      body: briSample1
    };

    const result = parseBriEmail(emailData);
    expect(result).toEqual({
      emailId: 'msg-bri-1',
      referenceId: '174473869740',
      date: '2026-07-10T12:33:00+07:00',
      type: 'Transfer Keluar',
      amount: 465997,
      merchant: 'ShopeePay',
      category: 'Lainnya',
      notes: '',
      source: 'auto',
      rawSubject: 'Notifikasi Transaksi BRImo',
      bank: 'BRI'
    });
  });

  test('parses BRI Sample 2 (QRIS Bayar at Merchant Warung) correctly', () => {
    const emailData = {
      id: 'msg-bri-2',
      subject: 'Notifikasi Pembayaran QRIS BRI',
      body: briSample2
    };

    const result = parseBriEmail(emailData);
    expect(result).toEqual({
      emailId: 'msg-bri-2',
      referenceId: '174178940118',
      date: '2026-07-09T20:51:00+07:00',
      type: 'QRIS',
      amount: 25000,
      merchant: 'WARUNG DWI YA',
      category: 'Makanan & Minuman',
      notes: '',
      source: 'auto',
      rawSubject: 'Notifikasi Pembayaran QRIS BRI',
      bank: 'BRI'
    });
  });

  test('returns null when BRI date format is invalid (fail-loud)', () => {
    const emailData = {
      id: 'msg-bri-invalid',
      subject: 'Notifikasi BRI',
      body: 'Nominal Rp50.000 tanpa tanggal transaksi'
    };

    const result = parseBriEmail(emailData);
    expect(result).toBeNull();
  });
});

describe('parseEmail Orchestrator Routing', () => {
  test('routes SeaBank email based on sender', () => {
    const emailData = {
      id: 'msg-seabank',
      subject: 'Notifikasi SeaBank',
      body: 'Dana sebesar Rp 50.000 dari BUDI UTOMO masuk pada 10/06/2026 14:30'
    };
    const result = parseEmail(emailData, 'no-reply@sea.com');
    expect(result.bank).toBe('SeaBank');
    expect(result.amount).toBe(50000);
  });

  test('routes BRI email based on sender', () => {
    const emailData = {
      id: 'msg-bri',
      subject: 'Notifikasi BRImo',
      body: 'Nominal Rp 100.000 pada 10/06/2026 14:30. No. Ref: 12345.'
    };
    const result = parseEmail(emailData, 'BankBRI@bri.co.id');
    expect(result.bank).toBe('BRI');
    expect(result.amount).toBe(100000);
  });

  test('routes based on subject fallback if sender does not match', () => {
    const emailData = {
      id: 'msg-bri-fallback',
      subject: 'Notifikasi Transaksi BRImo',
      body: 'Nominal Rp 12.000 pada 10/06/2026 14:30. No. Ref: 67890.'
    };
    const result = parseEmail(emailData, 'unknown@example.com');
    expect(result.bank).toBe('BRI');
  });
});
