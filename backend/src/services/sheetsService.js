// backend/src/services/sheetsService.js
const { google } = require('googleapis');
const { SHEET_NAMES } = require('../config/constants');
const { withRetry } = require('../utils/retryHelper');
require('dotenv').config();

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

// Header kolom untuk sheet Transactions
const TRANSACTION_HEADERS = [
  'ID', 'Email ID', 'Reference ID', 'Date', 'Type',
  'Amount', 'Merchant', 'Category', 'Notes', 'Source', 'Created At', 'Bank'
];

/**
 * Sanitasi string untuk mencegah Google Sheets Formula Injection (=, +, -, @)
 */
function sanitizeFormulaInput(val) {
  if (typeof val !== 'string') return val;
  const trimmed = val.trim();
  if (/^[=+\-@]/.test(trimmed)) {
    return `'${val}`;
  }
  return val;
}

/**
 * In-Memory Sequential Queue untuk operasi write ke Google Sheets.
 * Mencegah race condition pergeseran baris saat multiple concurrent writes.
 * Menggunakan try...finally agar request yang throw error tidak memblokir antrian berikutnya.
 */
let writeQueuePromise = Promise.resolve();

function enqueueWrite(taskFn) {
  const result = writeQueuePromise.then(async () => {
    try {
      return await taskFn();
    } finally {
      // Selalu selesaikan rantai antrian di block finally
    }
  });

  writeQueuePromise = result.catch(() => {});
  return result;
}

/**
 * Inisialisasi sheet jika belum ada header
 */
async function initializeSheets(auth) {
  const sheets = google.sheets({ version: 'v4', auth });
  try {
    const spreadsheet = await withRetry(() => sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    }));
    const sheetTitles = spreadsheet.data.sheets.map(s => s.properties.title);

    // 1. Inisialisasi sheet Transactions jika belum ada
    if (!sheetTitles.includes(SHEET_NAMES.TRANSACTIONS)) {
      await withRetry(() => sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        resource: {
          requests: [{ addSheet: { properties: { title: SHEET_NAMES.TRANSACTIONS } } }]
        }
      }));
      console.log(`[Sheets] Sheet '${SHEET_NAMES.TRANSACTIONS}' berhasil dibuat.`);
      sheetTitles.push(SHEET_NAMES.TRANSACTIONS);
    }

    // Inisialisasi header Transactions jika belum ada
    const resTx = await withRetry(() => sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAMES.TRANSACTIONS}!A1:L1`,
    }));
    if (!resTx.data.values || resTx.data.values.length === 0) {
      await withRetry(() => sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAMES.TRANSACTIONS}!A1`,
        valueInputOption: 'RAW',
        resource: { values: [TRANSACTION_HEADERS] },
      }));
      console.log('[Sheets] Header kolom Transactions berhasil dibuat.');
    }

    // 2. Inisialisasi sheet Monthly Summary jika belum ada
    if (!sheetTitles.includes(SHEET_NAMES.SUMMARY)) {
      await withRetry(() => sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        resource: {
          requests: [{ addSheet: { properties: { title: SHEET_NAMES.SUMMARY } } }]
        }
      }));
      console.log(`[Sheets] Sheet '${SHEET_NAMES.SUMMARY}' berhasil dibuat.`);
      sheetTitles.push(SHEET_NAMES.SUMMARY);
    }

    // Selalu pastikan header & formula ada di Monthly Summary jika A1 kosong
    const resSummary = await withRetry(() => sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAMES.SUMMARY}!A1:A2`,
    }));
    if (!resSummary.data.values || resSummary.data.values.length === 0) {
      const summaryValues = [
        ['Bulan', 'Total Pemasukan', 'Total Pengeluaran', 'Arus Bersih'],
        [
          '=IFERROR(SORT(UNIQUE(ARRAYFORMULA(IF(Transactions!D2:D="", "", LEFT(Transactions!D2:D, 7)))), 1, FALSE), "")',
          '=MAP(A2:A, LAMBDA(m, IF(m="", "", SUMIFS(Transactions!F$2:F, Transactions!D$2:D, m & "*", Transactions!E$2:E, "Pemasukan") + SUMIFS(Transactions!F$2:F, Transactions!D$2:D, m & "*", Transactions!E$2:E, "Transfer Masuk"))))',
          '=MAP(A2:A, LAMBDA(m, IF(m="", "", SUMIFS(Transactions!F$2:F, Transactions!D$2:D, m & "*", Transactions!E$2:E, "<>Pemasukan", Transactions!E$2:E, "<>Transfer Masuk"))))',
          '=MAP(A2:A, B2:B, C2:C, LAMBDA(m, inc, exp, IF(m="", "", inc - exp)))'
        ]
      ];

      await withRetry(() => sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAMES.SUMMARY}!A1`,
        valueInputOption: 'USER_ENTERED',
        resource: { values: summaryValues },
      }));
      console.log('[Sheets] Formulas dan header Monthly Summary berhasil dibuat/diperbarui.');
    }
  } catch (error) {
    console.error('[Sheets] Error inisialisasi sheets:', error.message);
  }
}

/**
 * Ambil semua ID email yang sudah tersimpan (untuk deduplikasi)
 */
async function getProcessedEmailIds(auth) {
  const sheets = google.sheets({ version: 'v4', auth });
  try {
    const res = await withRetry(() => sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAMES.TRANSACTIONS}!B2:B`,
    }));
    return (res.data.values || []).flat();
  } catch (error) {
    console.error('[Sheets] Error ambil processed email IDs:', error.message);
    return [];
  }
}

/**
 * Simpan array transaksi baru ke sheet (menggunakan Queue, Retry & Formula Sanitization)
 */
async function saveTransactions(auth, transactions) {
  if (!transactions || !transactions.length) return;

  return enqueueWrite(async () => {
    const sheets = google.sheets({ version: 'v4', auth });

    // Deduplikasi berdasarkan Email ID (Kolom B) & Reference ID (Kolom C)
    const existingRes = await withRetry(() => sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAMES.TRANSACTIONS}!B2:C`,
    }));
    const existingRows = existingRes.data.values || [];
    const existingEmailIds = new Set(existingRows.map(r => r[0]).filter(Boolean));
    const existingRefIds = new Set(existingRows.map(r => r[1]).filter(Boolean));

    const newTransactions = transactions.filter(t => {
      if (t.referenceId && existingRefIds.has(t.referenceId)) return false;
      if (t.emailId && existingEmailIds.has(t.emailId)) return false;
      return true;
    });

    if (!newTransactions.length) {
      console.log('[Sheets] Transaksi sudah pernah disimpan (dilewati karena duplikat).');
      return;
    }

    const rows = newTransactions.map((t, i) => [
      `TXN-${Date.now()}-${i}`,
      sanitizeFormulaInput(t.emailId || ''),
      sanitizeFormulaInput(t.referenceId || ''),
      sanitizeFormulaInput(t.date || ''),
      sanitizeFormulaInput(t.type || ''),
      typeof t.amount === 'number' ? t.amount : (parseInt(t.amount, 10) || 0),
      sanitizeFormulaInput(t.merchant || ''),
      sanitizeFormulaInput(t.category || ''),
      sanitizeFormulaInput(t.notes || ''),
      sanitizeFormulaInput(t.source || ''),
      new Date().toISOString(),
      sanitizeFormulaInput(t.bank || 'Unknown')
    ]);

    await withRetry(() => sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAMES.TRANSACTIONS}!A:L`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: { values: rows },
    }));

    console.log(`[Sheets] ${rows.length} transaksi berhasil disimpan.`);
  });
}

/**
 * Ambil semua transaksi dengan filter opsional
 * @param {object} filters - { month, year, category, type, bank }
 */
async function getTransactions(auth, filters = {}) {
  const sheets = google.sheets({ version: 'v4', auth });
  const res = await withRetry(() => sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAMES.TRANSACTIONS}!A2:L`,
  }));

  const rows = res.data.values || [];
  let transactions = rows.map(row => ({
    id: row[0] || '',
    emailId: row[1] || '',
    referenceId: row[2] || '',
    date: row[3] || new Date().toISOString(),
    type: row[4] || '',
    amount: parseInt(row[5], 10) || 0,
    merchant: row[6] || '',
    category: row[7] || 'Lainnya',
    notes: row[8] || '',
    source: row[9] || 'auto',
    createdAt: row[10] || new Date().toISOString(),
    bank: row[11] || 'Unknown'
  }));

  // Apply filters
  if (filters.month && filters.year) {
    transactions = transactions.filter(t => {
      const d = new Date(t.date);
      return !isNaN(d) && d.getMonth() + 1 === parseInt(filters.month) && d.getFullYear() === parseInt(filters.year);
    });
  }
  if (filters.category) {
    transactions = transactions.filter(t => t.category === filters.category);
  }
  if (filters.type) {
    transactions = transactions.filter(t => t.type === filters.type);
  }
  if (filters.bank) {
    transactions = transactions.filter(t => t.bank && t.bank.toLowerCase() === filters.bank.toLowerCase());
  }

  return transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
}

/**
 * Update kategori sebuah transaksi berdasarkan ID (menggunakan Queue, Retry & Formula Sanitization)
 */
async function updateTransactionCategory(auth, transactionId, newCategory) {
  return enqueueWrite(async () => {
    const sheets = google.sheets({ version: 'v4', auth });
    const res = await withRetry(() => sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAMES.TRANSACTIONS}!A:A`,
    }));

    const ids = (res.data.values || []).flat();
    const rowIndex = ids.indexOf(transactionId);
    if (rowIndex === -1) throw new Error('Transaksi tidak ditemukan');

    const rowNumber = rowIndex + 1; // 1-based index
    const sanitizedCat = sanitizeFormulaInput(newCategory || '');

    await withRetry(() => sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAMES.TRANSACTIONS}!H${rowNumber}`,
      valueInputOption: 'RAW',
      resource: { values: [[sanitizedCat]] },
    }));
  });
}

/**
 * Update category dan/atau notes sebuah transaksi berdasarkan ID (menggunakan Queue, Retry & Formula Sanitization).
 * Mengambil data baris lama dari kolom A:I dalam 1 kali read call, lalu memperbarui H:I dalam 1 kali write call.
 */
async function updateTransactionDetails(auth, transactionId, { category, notes }) {
  return enqueueWrite(async () => {
    const sheets = google.sheets({ version: 'v4', auth });
    
    // 1. Ambil kolom A sampai I dari sheet Transactions (A=ID, H=Category, I=Notes)
    const res = await withRetry(() => sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAMES.TRANSACTIONS}!A:I`,
    }));

    const rows = res.data.values || [];
    const rowIndex = rows.findIndex(r => r[0] === transactionId);
    if (rowIndex === -1) throw new Error('Transaksi tidak ditemukan');

    const rowNumber = rowIndex + 1; // 1-based index
    const targetRow = rows[rowIndex] || [];
    
    // Ekstrak nilai eksisting (Index 7 = Kolom H Category, Index 8 = Kolom I Notes)
    const oldCategory = targetRow[7] || '';
    const oldNotes = targetRow[8] || '';

    // Preserve nilai lama jika field bernilai undefined (tidak dikirim)
    const finalCategory = category !== undefined ? category : oldCategory;
    const finalNotes = notes !== undefined ? notes : oldNotes;

    const sanitizedCat = sanitizeFormulaInput(finalCategory || '');
    const sanitizedNotes = sanitizeFormulaInput(finalNotes || '');

    // 2. Write batch ke range H{rowNumber}:I{rowNumber} dalam 1 kali API call
    await withRetry(() => sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAMES.TRANSACTIONS}!H${rowNumber}:I${rowNumber}`,
      valueInputOption: 'RAW',
      resource: { values: [[sanitizedCat, sanitizedNotes]] },
    }));
  });
}

module.exports = { 
  initializeSheets, 
  getProcessedEmailIds, 
  saveTransactions, 
  getTransactions, 
  updateTransactionCategory,
  updateTransactionDetails,
  sanitizeFormulaInput 
};
