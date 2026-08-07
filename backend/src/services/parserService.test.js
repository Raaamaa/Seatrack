const { parseSeaBankEmail, detectTransactionType, parseAmount, parseDate, parseMerchant, autoAssignCategory } = require('./parsers/seabankParser');
const { parseBcaEmail } = require('./parsers/bcaParser');
const { parseEmail } = require('./parserService');
const { sanitizeFormulaInput } = require('./sheetsService');

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
  test('detectTransactionType detects correct types', () => {
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

  test('parseDate parses Indonesian month names correctly', () => {
    const body = 'Transaksi pada 12 Juni 2026 14:30 WIB';
    expect(parseDate(body)).toBe('2026-06-12T14:30:00+07:00');
  });

  test('parseDate parses numeric dates correctly', () => {
    const body = 'Transaksi pada 12/06/2026 14:30';
    expect(parseDate(body)).toBe('2026-06-12T14:30:00+07:00');
  });

  test('parseMerchant parses merchant name correctly', () => {
    expect(parseMerchant('Transfer Keluar', 'Transfer kepada ANTO SUSANTO berhasil')).toBe('ANTO SUSANTO');
    expect(parseMerchant('Transfer Masuk', 'Transfer dari BUDI UTOMO telah masuk')).toBe('BUDI UTOMO');
    expect(parseMerchant('QRIS', 'Pembayaran QRIS ke Kopi Kenangan berhasil')).toBe('Kopi Kenangan');
  });

  test('autoAssignCategory assigns correct categories', () => {
    expect(autoAssignCategory('Transfer Masuk', 'Budi')).toBe('Pemasukan');
    expect(autoAssignCategory('Transfer Keluar', 'Gojek')).toBe('Transportasi');
    expect(autoAssignCategory('Transfer Keluar', 'Indomaret')).toBe('Belanja');
    expect(autoAssignCategory('Transfer Keluar', 'PLN')).toBe('Tagihan & Utilitas');
    expect(autoAssignCategory('Transfer Keluar', 'KFC')).toBe('Makanan & Minuman');
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

  test('parses outgoing transfer email successfully', () => {
    const emailData = {
      id: 'msg-2',
      subject: 'Transfer Berhasil - SeaBank',
      body: 'Transfer sebesar Rp 150.000 ke ANTO SUSANTO berhasil pada 11 Juni 2026 10:15. No Referensi: Ref67890.'
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

  test('routes BCA email based on sender', () => {
    const emailData = {
      id: 'msg-bca',
      subject: 'Transaksi KlikBCA',
      body: 'Debet sebesar Rp 100,000 ke TOKO INDO pada 10/06/2026'
    };
    const result = parseEmail(emailData, 'ebanking@klikbca.com');
    expect(result.bank).toBe('BCA');
    expect(result.amount).toBe(100000);
  });

  test('routes based on subject fallback if sender does not match', () => {
    const emailData = {
      id: 'msg-seabank-fallback',
      subject: 'Your SeaBank Transfer is Successful',
      body: 'Dana sebesar Rp 12.000 ke TOKO INDO masuk pada 10/06/2026 14:30'
    };
    const result = parseEmail(emailData, 'unknown@example.com');
    expect(result.bank).toBe('SeaBank');
  });
});
