// backend/src/services/parsers/bcaParser.js
// Pola Regex untuk email notifikasi transaksi BCA (contoh dari KlikBCA / M-BCA)

const PATTERNS = {
  // Menangkap nominal setelah kata "sebesar" atau "Rp"
  AMOUNT: /(?:sebesar|Rp)\s*([\d,.]+)/i,
  // Menangkap nomor rekening tujuan atau nama merchant
  MERCHANT: /(?:ke|dari|merchant|toko)\s+([A-Za-z0-9\s\-]+?)(?:\s+sebesar|\s+pada|\n|$)/i,
  REFERENCE_ID: /(?:ref|no|id)\s*(?:transaksi|referensi)?[:\s]+([A-Z0-9]+)/i,
};

function detectTransactionType(subject, body) {
  const text = (subject + ' ' + body).toLowerCase();
  if (text.includes('kredit') || text.includes('diterima') || text.includes('masuk')) {
    return 'Transfer Masuk';
  }
  if (text.includes('debet') || text.includes('transfer ke') || text.includes('keluar')) {
    return 'Transfer Keluar';
  }
  return 'Lainnya';
}

function parseBcaEmail(emailData) {
  try {
    const { id: emailId, subject, body } = emailData;
    const type = detectTransactionType(subject, body);
    const amountMatch = body.match(PATTERNS.AMOUNT);
    if (!amountMatch) throw new Error('Nominal tidak ditemukan');

    // BCA menggunakan koma atau titik tergantung format, hapus separator ribuan
    const amount = parseInt(amountMatch[1].replace(/[,.]/g, ''), 10);
    const merchantMatch = body.match(PATTERNS.MERCHANT);
    const merchant = merchantMatch ? merchantMatch[1].trim() : 'BCA Transaction';
    const refMatch = body.match(PATTERNS.REFERENCE_ID);
    const referenceId = refMatch ? refMatch[1] : emailId;

    return {
      emailId,
      referenceId,
      date: new Date().toISOString(), // Fallback ke waktu sekarang jika tidak ketemu di email
      type,
      amount,
      merchant,
      category: type === 'Transfer Masuk' ? 'Pemasukan' : 'Lainnya',
      notes: '',
      source: 'auto',
      rawSubject: subject,
      bank: 'BCA',
    };
  } catch (error) {
    return null;
  }
}

module.exports = { parseBcaEmail, detectTransactionType };
