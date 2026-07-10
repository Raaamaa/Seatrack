// backend/src/config/constants.js
module.exports = {
  GMAIL_SCOPES: [
    'https://www.googleapis.com/auth/gmail.readonly'
  ],
  SHEETS_SCOPES: [
    'https://www.googleapis.com/auth/spreadsheets'
  ],
  SHEET_NAMES: {
    TRANSACTIONS: 'Transactions',
    ERRORS: 'ParseErrors',
    CATEGORIES: 'Categories',
    SUMMARY: 'Monthly Summary'
  },
  TRANSACTION_TYPES: {
    INCOME: 'Pemasukan',
    EXPENSE: 'Pengeluaran',
    TRANSFER_OUT: 'Transfer Keluar',
    TRANSFER_IN: 'Transfer Masuk',
    QRIS: 'QRIS',
    MANUAL: 'Manual'
  },
  DEFAULT_CATEGORIES: [
    'Makanan & Minuman',
    'Transportasi',
    'Belanja',
    'Hiburan',
    'Tagihan & Utilitas',
    'Kesehatan',
    'Tabungan & Investasi',
    'Transfer',
    'Lainnya'
  ]
};
