// backend/src/services/parsers/briParser.js
// Pola Regex & Parser Notifikasi Transaksi Email Bank BRI (BRImo & QRIS)

const { autoAssignCategory } = require('../../utils/categoryHelper');
const { parseDate } = require('../../utils/dateHelper');

const PATTERNS = {
  // Field Nominal diutamakan untuk menghindari ketidaksesuaian saat ada Biaya Admin
  // CATATAN: (?:Rp)? (bukan Rp?) — "Rp?" berarti "R wajib, p opsional", bukan "Rp opsional".
  NOMINAL_FIELD: /(?:Nominal)[\s\n\r:]+(?:Rp)?\s?([\d.]+)/i,
  TOTAL_FIELD: /(?:Total\s+Transaksi|Rp)\s*[\n\r:]*\s*(?:Rp)?\s?([\d.]+)/i,
  // Menangkap Nomor Referensi / No. Ref
  REFERENCE_ID: /(?:No\.?\s*Ref|Nomor\s*Referensi)[\s\n\r:]+([A-Z0-9]+)/i,
  // Menangkap Nama Merchant jika ada
  MERCHANT_FIELD: /(?:Nama\s+Merchant)[\s\n\r:]+([^\n\r]+)/i,
  // Menangkap Jenis Transaksi untuk fallback nama merchant
  TRANSACTION_TYPE_FIELD: /(?:Jenis\s+Transaksi)[\s\n\r:]+([^\n\r]+)/i,
};

/**
 * Mendeteksi tipe transaksi BRI (*best-effort*)
 * CATATAN: Pengecekan transfer masuk belum terverifikasi dengan sampel email asli.
 */
function detectTransactionType(subject, body) {
  const text = (subject + ' ' + body).toLowerCase();
  if (text.includes('dana diterima') || text.includes('kredit') || text.includes('transfer masuk')) {
    return 'Transfer Masuk';
  }
  if (text.includes('qris')) {
    return 'QRIS';
  }
  return 'Transfer Keluar';
}

/**
 * Ekstraksi nominal transaksi BRI dengan prioritas field "Nominal" terlebih dahulu
 */
function parseBriAmount(body) {
  const nominalMatch = body.match(PATTERNS.NOMINAL_FIELD);
  if (nominalMatch) {
    return parseInt(nominalMatch[1].replace(/\./g, ''), 10);
  }
  const totalMatch = body.match(PATTERNS.TOTAL_FIELD);
  if (totalMatch) {
    return parseInt(totalMatch[1].replace(/\./g, ''), 10);
  }
  throw new Error('Nominal transaksi BRI tidak ditemukan');
}

/**
 * Ekstraksi nama merchant BRI:
 * 1. Prioritaskan field "Nama Merchant" (bersihkan prefix kode QRIS berpemisah '*')
 * 2. Fallback ke field "Jenis Transaksi" (misal "ShopeePay")
 * 3. Fallback default ke "Transaksi BRI"
 */
function parseBriMerchant(body) {
  const merchantMatch = body.match(PATTERNS.MERCHANT_FIELD);
  if (merchantMatch) {
    let rawName = merchantMatch[1].trim();
    if (rawName.includes('*')) {
      const parts = rawName.split('*');
      rawName = parts[parts.length - 1].trim();
    }
    return rawName || 'Transaksi BRI';
  }

  const typeMatch = body.match(PATTERNS.TRANSACTION_TYPE_FIELD);
  if (typeMatch) {
    return typeMatch[1].trim();
  }

  return 'Transaksi BRI';
}

/**
 * Main parser fungsi untuk email notifikasi transaksi BRI
 */
function parseBriEmail(emailData) {
  try {
    const { id: emailId, subject = '', body = '' } = emailData || {};
    
    const type = detectTransactionType(subject, body);
    const amount = parseBriAmount(body);
    const date = parseDate(body);
    const merchant = parseBriMerchant(body);
    
    const refMatch = body.match(PATTERNS.REFERENCE_ID);
    const referenceId = refMatch ? refMatch[1].trim() : emailId;

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
      bank: 'BRI',
    };
  } catch (error) {
    console.warn(`[BRI Parser] Gagal parse email (ID: ${emailData?.id}):`, error.message);
    return null;
  }
}

module.exports = {
  parseBriEmail,
  detectTransactionType,
  parseBriAmount,
  parseBriMerchant,
};
