// backend/src/services/parsers/seabankParser.js
// Pola Regex divalidasi terhadap format email SeaBank Indonesia

const { autoAssignCategory } = require('../../utils/categoryHelper');
const { parseDate, MONTH_MAP, DATE_PATTERNS } = require('../../utils/dateHelper');

const PATTERNS = {
  AMOUNT: /Rp\s?([\d.]+)/i,
  DATE_FULL: DATE_PATTERNS.DATE_FULL,
  DATE_NUMERIC: DATE_PATTERNS.DATE_NUMERIC,
  MERCHANT_TRANSFER_TO: /(?:kepada|ke|tujuan)[:\s]+([A-Za-z0-9\s\-\.]+?)(?=\s*(?:\bberhasil\b|\btelah\b|\bpada\b|\bdengan\b|\bdari\b|\n|$))/i,
  MERCHANT_TRANSFER_FROM: /(?:dari|pengirim)[:\s]+([A-Za-z0-9\s\-\.]+?)(?=\s*(\btelah\b|\bberhasil\b|\bpada\b|\bdengan\b|\bke\b|\n|$))/i,
  MERCHANT_QRIS: /(?:merchant|nama toko|kepada|ke)[:\s]+([A-Za-z0-9\s\-\.]+?)(?=\s*(?:\bberhasil\b|\btelah\b|\bpada\b|\bdengan\b|\bke\b|\n|$))/i,
  REFERENCE_ID: /(?:no\.?\s*referensi|ref(?:erence)?|id transaksi)[:\s]+([A-Z0-9]+)/i,
};

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

function parseAmount(rawAmount) {
  if (!rawAmount) return 0;
  return parseInt(rawAmount.replace(/\./g, ''), 10);
}

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

function parseSeaBankEmail(emailData) {
  try {
    const { id: emailId, subject = '', body = '' } = emailData || {};
    const type = detectTransactionType(subject, body);
    const amountMatch = body.match(PATTERNS.AMOUNT);
    if (!amountMatch) throw new Error('Nominal tidak ditemukan');

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
      bank: 'SeaBank',
    };
  } catch (error) {
    console.warn(`[SeaBank Parser] Gagal parse email (ID: ${emailData?.id}):`, error.message);
    return null;
  }
}

module.exports = { 
  parseSeaBankEmail,
  detectTransactionType,
  parseAmount,
  parseDate,
  parseMerchant,
  autoAssignCategory,
  MONTH_MAP
};

