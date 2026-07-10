// backend/src/services/sheetsService.js
const { google } = require('googleapis');
const { SHEET_NAMES } = require('../config/constants');
require('dotenv').config();

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

// Header kolom untuk sheet Transactions
const TRANSACTION_HEADERS = [
  'ID', 'Email ID', 'Reference ID', 'Date', 'Type',
  'Amount', 'Merchant', 'Category', 'Notes', 'Source', 'Created At', 'Bank'
];

/**
 * Inisialisasi sheet jika belum ada header
 */
async function initializeSheets(auth) {
  const sheets = google.sheets({ version: 'v4', auth });
  try {
    // Ambil metadata spreadsheet untuk melihat daftar sheet/tab yang ada
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });
    const sheetTitles = spreadsheet.data.sheets.map(s => s.properties.title);

    // 1. Inisialisasi sheet Transactions jika belum ada
    if (!sheetTitles.includes(SHEET_NAMES.TRANSACTIONS)) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        resource: {
          requests: [{ addSheet: { properties: { title: SHEET_NAMES.TRANSACTIONS } } }]
        }
      });
      console.log(`[Sheets] Sheet '${SHEET_NAMES.TRANSACTIONS}' berhasil dibuat.`);
      sheetTitles.push(SHEET_NAMES.TRANSACTIONS);
    }

    // Inisialisasi header Transactions jika belum ada
    const resTx = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAMES.TRANSACTIONS}!A1:L1`,
    });
    if (!resTx.data.values || resTx.data.values.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAMES.TRANSACTIONS}!A1`,
        valueInputOption: 'RAW',
        resource: { values: [TRANSACTION_HEADERS] },
      });
      console.log('[Sheets] Header kolom Transactions berhasil dibuat.');
    }

    // 2. Inisialisasi sheet Monthly Summary jika belum ada
    if (!sheetTitles.includes(SHEET_NAMES.SUMMARY)) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        resource: {
          requests: [{ addSheet: { properties: { title: SHEET_NAMES.SUMMARY } } }]
        }
      });
      console.log(`[Sheets] Sheet '${SHEET_NAMES.SUMMARY}' berhasil dibuat.`);
      sheetTitles.push(SHEET_NAMES.SUMMARY);
    }

    // Selalu pastikan header & formula ada di Monthly Summary jika A1 kosong
    const resSummary = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAMES.SUMMARY}!A1:A2`,
    });
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

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAMES.SUMMARY}!A1`,
        valueInputOption: 'USER_ENTERED',
        resource: { values: summaryValues },
      });
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
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAMES.TRANSACTIONS}!B2:B`,
    });
    return (res.data.values || []).flat();
  } catch (error) {
    console.error('[Sheets] Error ambil processed email IDs:', error.message);
    return [];
  }
}

/**
 * Simpan array transaksi baru ke sheet
 */
async function saveTransactions(auth, transactions) {
  if (!transactions.length) return;
  const sheets = google.sheets({ version: 'v4', auth });

  const rows = transactions.map((t, i) => [
    `TXN-${Date.now()}-${i}`,  // ID unik
    t.emailId,
    t.referenceId,
    t.date,
    t.type,
    t.amount,
    t.merchant,
    t.category,
    t.notes || '',
    t.source,
    new Date().toISOString(),
    t.bank || 'Unknown'
  ]);

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAMES.TRANSACTIONS}!A:L`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    resource: { values: rows },
  });

  console.log(`[Sheets] ${rows.length} transaksi berhasil disimpan.`);
}

/**
 * Ambil semua transaksi dengan filter opsional
 * @param {object} filters - { month, year, category, type, bank }
 */
async function getTransactions(auth, filters = {}) {
  const sheets = google.sheets({ version: 'v4', auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAMES.TRANSACTIONS}!A2:L`,
  });

  const rows = res.data.values || [];
  let transactions = rows.map(row => ({
    id: row[0],
    emailId: row[1],
    referenceId: row[2],
    date: row[3],
    type: row[4],
    amount: parseInt(row[5], 10) || 0,
    merchant: row[6],
    category: row[7],
    notes: row[8] || '',
    source: row[9],
    createdAt: row[10],
    bank: row[11] || 'Unknown'
  }));

  // Apply filters
  if (filters.month && filters.year) {
    transactions = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() + 1 === parseInt(filters.month) && d.getFullYear() === parseInt(filters.year);
    });
  }
  if (filters.category) {
    transactions = transactions.filter(t => t.category === filters.category);
  }
  if (filters.type) {
    transactions = transactions.filter(t => t.type === filters.type);
  }
  if (filters.bank) {
    transactions = transactions.filter(t => t.bank.toLowerCase() === filters.bank.toLowerCase());
  }

  return transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
}

/**
 * Update kategori sebuah transaksi berdasarkan ID
 */
async function updateTransactionCategory(auth, transactionId, newCategory) {
  const sheets = google.sheets({ version: 'v4', auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAMES.TRANSACTIONS}!A:A`,
  });

  const ids = (res.data.values || []).flat();
  const rowIndex = ids.indexOf(transactionId);
  if (rowIndex === -1) throw new Error('Transaksi tidak ditemukan');

  const rowNumber = rowIndex + 1; // 1-based, +1 karena header di row 1
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAMES.TRANSACTIONS}!H${rowNumber}`,
    valueInputOption: 'RAW',
    resource: { values: [[newCategory]] },
  });
}

module.exports = { 
  initializeSheets, 
  getProcessedEmailIds, 
  saveTransactions, 
  getTransactions, 
  updateTransactionCategory 
};
