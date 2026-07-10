const { parseSeaBankEmail, detectTransactionType, parseAmount, parseDate, parseMerchant, autoAssignCategory } = require('./parserService');

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
      rawSubject: 'Dana Diterima - SeaBank'
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
      rawSubject: 'Transfer Berhasil - SeaBank'
    });
  });

  test('returns null if amount cannot be parsed', () => {
    const emailData = {
      id: 'msg-3',
      subject: 'Dana Diterima - SeaBank',
      body: 'Email body without any amount field.'
    };

    const result = parseSeaBankEmail(emailData);
    expect(result).toBeNull();
  });
});
