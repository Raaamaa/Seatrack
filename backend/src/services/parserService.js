// backend/src/services/parserService.js
// PENTING: Semua pola Regex sudah divalidasi terhadap format email SeaBank Indonesia

const PATTERNS = {
  // Menangkap nominal: "Rp123.456" atau "Rp 1.234.567"
  AMOUNT: /Rp\s?([\d.]+)/i,

  // Menangkap tanggal format: "12 Juni 2026, 14:30 WIB"
  DATE_FULL: /(\d{1,2})\s+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+(\d{4}),?\s+(\d{2}:\d{2})/i,

  // Alternatif: "12/06/2026 14:30"
  DATE_NUMERIC: /(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}:\d{2})/,

  // Pengirim/Penerima
  MERCHANT_TRANSFER_TO: /(?:kepada|ke|tujuan)[:\s]+([A-Za-z0-9\s\-\.]+?)(?=\s*(?:\bberhasil\b|\btelah\b|\bpada\b|\bdengan\b|\bdari\b|\n|$))/i,
  MERCHANT_TRANSFER_FROM: /(?:dari|pengirim)[:\s]+([A-Za-z0-9\s\-\.]+?)(?=\s*(?:\btelah\b|\bberhasil\b|\bpada\b|\bdengan\b|\bke\b|\n|$))/i,
  MERCHANT_QRIS: /(?:merchant|nama toko|kepada|ke)[:\s]+([A-Za-z0-9\s\-\.]+?)(?=\s*(?:\bberhasil\b|\btelah\b|\bpada\b|\bdengan\b|\bke\b|\n|$))/i,

  // Nomor referensi
  REFERENCE_ID: /(?:no\.?\s*referensi|ref(?:erence)?|id transaksi)[:\s]+([A-Z0-9]+)/i,
};

const MONTH_MAP = {
  'januari': '01', 'februari': '02', 'maret': '03', 'april': '04',
  'mei': '05', 'juni': '06', 'juli': '07', 'agustus': '08',
  'september': '09', 'oktober': '10', 'november': '11', 'desember': '12'
};

/**
 * Menentukan jenis transaksi berdasarkan subject atau body email
 */
function detectTransactionType(subject, body) {
  const text = (subject + ' ' + body).toLowerCase();
  if (text.includes('dana diterima') || text.includes('uang masuk') || text.includes('transfer masuk')) {
    return 'Transfer Masuk';
  }
  if (text.includes('transfer berhasil') || text.includes('transfer keluar') || text.includes('berhasil ditransfer')) {
    return 'Transfer Keluar';
  }
  if (text.includes('qris') || text.includes('pembayaran berhasil') || text.includes('bayar')) {
    return 'QRIS';
  }
  if (text.includes('tarik tunai') || text.includes('penarikan')) {
    return 'Tarik Tunai';
  }
  return 'Lainnya';
}

/**
 * Parse nominal dari string, hapus titik pemisah ribuan
 * @returns {number} nominal dalam integer
 */
function parseAmount(rawAmount) {
  if (!rawAmount) return 0;
  return parseInt(rawAmount.replace(/\./g, ''), 10);
}

/**
 * Parse tanggal ke format ISO 8601
 */
function parseDate(body) {
  const matchFull = body.match(PATTERNS.DATE_FULL);
  if (matchFull) {
    const [, day, monthName, year, time] = matchFull;
    const month = MONTH_MAP[monthName.toLowerCase()];
    return `${year}-${month}-${day.padStart(2, '0')}T${time}:00+07:00`;
  }

  const matchNumeric = body.match(PATTERNS.DATE_NUMERIC);
  if (matchNumeric) {
    const [, day, month, year, time] = matchNumeric;
    return `${year}-${month}-${day}T${time}:00+07:00`;
  }

  return new Date().toISOString();
}

/**
 * Ekstrak nama merchant/penerima/pengirim
 */
function parseMerchant(type, body) {
  let match;
  if (type === 'Transfer Keluar') {
    match = body.match(PATTERNS.MERCHANT_TRANSFER_TO);
  } else if (type === 'Transfer Masuk') {
    match = body.match(PATTERNS.MERCHANT_TRANSFER_FROM);
  } else if (type === 'QRIS') {
    match = body.match(PATTERNS.MERCHANT_QRIS);
  }
  return match ? match[1].trim() : 'Tidak Diketahui';
}

/**
 * Auto-assign kategori berdasarkan jenis dan merchant
 */
function autoAssignCategory(type, merchant) {
  const m = merchant.toLowerCase();
  if (type === 'Transfer Masuk') return 'Pemasukan';
  if (type === 'Tarik Tunai') return 'Lainnya';
  if (m.includes('gojek') || m.includes('grab') || m.includes('maxim')) return 'Transportasi';
  if (m.includes('indomaret') || m.includes('alfamart') || m.includes('shopee') || m.includes('tokopedia')) return 'Belanja';
  if (m.includes('pln') || m.includes('telkom') || m.includes('indihome') || m.includes('bpjs')) return 'Tagihan & Utilitas';
  if (m.includes('kfc') || m.includes('mcdonalds') || m.includes('starbucks') || m.includes('warteg')) return 'Makanan & Minuman';
  if (type === 'QRIS') return 'Belanja';
  return 'Lainnya';
}

/**
 * Fungsi utama: parse keseluruhan email menjadi objek transaksi
 * @param {object} emailData - { id, subject, body, receivedAt }
 * @returns {object|null} transaction object atau null jika parsing gagal
 */
function parseSeaBankEmail(emailData) {
  try {
    const { id: emailId, subject, body } = emailData;
    const type = detectTransactionType(subject, body);

    const amountMatch = body.match(PATTERNS.AMOUNT);
    if (!amountMatch) {
      throw new Error('Nominal tidak ditemukan dalam email');
    }

    const amount = parseAmount(amountMatch[1]);
    const date = parseDate(body);
    const merchant = parseMerchant(type, body);
    const refMatch = body.match(PATTERNS.REFERENCE_ID);
    const referenceId = refMatch ? refMatch[1] : emailId;

    return {
      emailId,
      referenceId,
      date,
      type,
      amount,
      merchant,
      category: autoAssignCategory(type, merchant),
      notes: '',
      source: 'auto',
      rawSubject: subject,
    };
  } catch {
    return null;
  }
}

module.exports = { parseSeaBankEmail, detectTransactionType, parseAmount, parseDate, parseMerchant, autoAssignCategory };
