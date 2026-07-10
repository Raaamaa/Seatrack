# IMPLEMENTATION PLAN — SeaTrack
## Machine-Actionable Instructions for Cursor AI Composer

**Target AI:** Cursor Composer (Claude Sonnet / GPT-4)  
**Proyek:** SeaTrack — Money Management App  
**Stack:** Flutter (Frontend) + Node.js/Express (Backend) + Google Sheets API + Gmail API  
**Mode Eksekusi:** Ikuti fase secara berurutan. Jangan lompat fase. Buat file satu per satu.

---

## DIRECTORY STRUCTURE (Target Akhir)

```
seatrack/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── googleAuth.js          # Setup OAuth2 client Google
│   │   │   └── constants.js           # Konstanta aplikasi (scopes, sheet ID, dsb)
│   │   ├── services/
│   │   │   ├── gmailService.js        # Logic polling & fetch Gmail
│   │   │   ├── parserService.js       # Router/Orchestrator parser email
│   │   │   ├── parsers/               # Sub-folder modular untuk parser bank
│   │   │   │   ├── seabankParser.js   # Parser regex email SeaBank
│   │   │   │   └── bcaParser.js       # Parser regex email BCA
│   │   │   ├── sheetsService.js       # CRUD ke Google Sheets
│   │   │   └── schedulerService.js    # Cron job untuk polling otomatis
│   │   ├── routes/
│   │   │   ├── transactionRoutes.js   # Endpoint /api/transactions
│   │   │   └── dashboardRoutes.js     # Endpoint /api/dashboard
│   │   ├── middleware/
│   │   │   └── errorHandler.js        # Global error handler
│   │   └── app.js                     # Express app setup
│   ├── credentials/
│   │   └── .gitkeep                   # Simpan credentials.json di sini (jangan di-commit!)
│   ├── .env                           # Environment variables
│   ├── .env.example                   # Template env vars
│   ├── .gitignore
│   ├── package.json
│   └── server.js                      # Entry point server
│
├── frontend/
│   └── seatrack_app/                  # Flutter project root
│       ├── lib/
│       │   ├── main.dart
│       │   ├── app.dart               # MaterialApp + routing setup
│       │   ├── core/
│       │   │   ├── constants/
│       │   │   │   ├── app_colors.dart
│       │   │   │   ├── app_text_styles.dart
│       │   │   │   └── app_spacing.dart
│       │   │   ├── network/
│       │   │   │   └── api_client.dart  # HTTP client wrapper
│       │   │   └── utils/
│       │   │       └── formatters.dart  # Currency & date formatters
│       │   ├── data/
│       │   │   ├── models/
│       │   │   │   ├── transaction_model.dart
│       │   │   │   └── dashboard_summary_model.dart
│       │   │   └── repositories/
│       │   │       └── transaction_repository.dart
│       │   ├── presentation/
│       │   │   ├── screens/
│       │   │   │   ├── home/
│       │   │   │   │   ├── home_screen.dart
│       │   │   │   │   └── widgets/
│       │   │   │   │       ├── balance_card.dart
│       │   │   │   │       └── recent_transactions_list.dart
│       │   │   │   ├── dashboard/
│       │   │   │   │   ├── dashboard_screen.dart
│       │   │   │   │   └── widgets/
│       │   │   │   │       ├── spending_bar_chart.dart
│       │   │   │   │       └── category_pie_chart.dart
│       │   │   │   ├── transactions/
│       │   │   │   │   ├── transactions_screen.dart
│       │   │   │   │   ├── transaction_detail_screen.dart
│       │   │   │   │   └── add_transaction_screen.dart
│       │   │   │   └── settings/
│       │   │   │       └── settings_screen.dart
│       │   │   └── shared_widgets/
│       │   │       ├── transaction_tile.dart
│       │   │       ├── category_chip.dart
│       │   │       └── loading_shimmer.dart
│       │   └── providers/
│       │       ├── transaction_provider.dart
│       │       └── dashboard_provider.dart
│       ├── pubspec.yaml
│       └── android/
│           └── app/
│               └── src/main/AndroidManifest.xml
│
├── docs/
│   ├── PRD.md
│   ├── DESIGN_SYSTEM.md
│   ├── DATA_SCHEMA.md
│   ├── README.md
│   └── implementation_plan.md
│
└── .gitignore (root)
```

---

## PHASE 1 — Project Initialization & Google API Setup

**Tujuan:** Membangun fondasi project dan mengonfigurasi autentikasi Google.

### 1.1 — Buat Root Project & Backend

```bash
# Buat root folder project
mkdir seatrack && cd seatrack

# Buat struktur backend
mkdir -p backend/src/{config,services,routes,middleware}
mkdir -p backend/credentials
cd backend

# Inisialisasi Node.js project
npm init -y

# Install semua dependencies backend
npm install express googleapis node-cron dotenv cors helmet morgan

# Install dev dependencies
npm install --save-dev nodemon
```

### 1.2 — Buat File `backend/package.json` (Update Scripts)

Tambahkan scripts berikut ke dalam `package.json` yang sudah ada:

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "main": "server.js"
}
```

### 1.3 — Buat File `backend/.env.example`

```env
# Google API Configuration
GOOGLE_CREDENTIALS_PATH=./credentials/credentials.json
GOOGLE_TOKEN_PATH=./credentials/token.json
SPREADSHEET_ID=your_google_spreadsheet_id_here

# Gmail Filter
GMAIL_SENDER_EMAILS=no-reply@sea.com,ebanking@klikbca.com,alerts@klikbca.com
GMAIL_LABEL_FILTER=SeaTrack

# Server Configuration
PORT=3000
NODE_ENV=development

# Polling Interval (dalam menit)
POLLING_INTERVAL_MINUTES=5
```

### 1.4 — Buat File `backend/.env`

Salin `.env.example` ke `.env` dan isi dengan nilai nyata.

```bash
cp .env.example .env
```

### 1.5 — Buat File `backend/.gitignore`

```gitignore
node_modules/
credentials/credentials.json
credentials/token.json
.env
*.log
```

### 1.6 — Buat File `backend/src/config/constants.js`

```javascript
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
    CATEGORIES: 'Categories'
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
```

### 1.7 — Buat File `backend/src/config/googleAuth.js`

```javascript
// backend/src/config/googleAuth.js
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
require('dotenv').config();

const CREDENTIALS_PATH = process.env.GOOGLE_CREDENTIALS_PATH;
const TOKEN_PATH = process.env.GOOGLE_TOKEN_PATH;
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/spreadsheets'
];

async function getAuthClient() {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf-8'));
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));
    oAuth2Client.setCredentials(token);
    // Auto-refresh jika token kadaluarsa
    oAuth2Client.on('tokens', (tokens) => {
      if (tokens.refresh_token) {
        const updatedToken = { ...token, ...tokens };
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(updatedToken));
      }
    });
    return oAuth2Client;
  }

  return getNewToken(oAuth2Client);
}

function getNewToken(oAuth2Client) {
  const authUrl = oAuth2Client.generateAuthUrl({ access_type: 'offline', scope: SCOPES });
  console.log('\n⚠️  Autentikasi diperlukan. Buka URL ini di browser:\n');
  console.log(authUrl);
  console.log('\n');

  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question('Masukkan kode dari halaman tersebut: ', async (code) => {
      rl.close();
      try {
        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
        console.log('✅ Token tersimpan di', TOKEN_PATH);
        resolve(oAuth2Client);
      } catch (err) {
        reject(err);
      }
    });
  });
}

module.exports = { getAuthClient };
```

---

## PHASE 2 — Backend: Gmail Parser & Email Service

**Tujuan:** Implementasi logika modular pengambilan dan parsing email dari SeaBank dan bank lain (contoh: BCA).

### 2.1 — Buat File `backend/src/services/parsers/seabankParser.js`

```javascript
// backend/src/services/parsers/seabankParser.js
// Pola Regex divalidasi terhadap format email SeaBank Indonesia

const PATTERNS = {
  AMOUNT: /Rp\s?([\d.]+)/i,
  DATE_FULL: /(\d{1,2})\s+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+(\d{4}),?\s+(\d{2}:\d{2})/i,
  DATE_NUMERIC: /(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}:\d{2})/,
  MERCHANT_TRANSFER_TO: /(?:kepada|ke|tujuan)[:\s]+([A-Za-z0-9\s\-\.]+?)(?:\n|$|dengan|dari)/i,
  MERCHANT_TRANSFER_FROM: /(?:dari|pengirim)[:\s]+([A-Za-z0-9\s\-\.]+?)(?:\n|$|dengan|ke)/i,
  MERCHANT_QRIS: /(?:merchant|nama toko|kepada)[:\s]+([A-Za-z0-9\s\-\.]+?)(?:\n|$)/i,
  REFERENCE_ID: /(?:no\.?\s*referensi|ref(?:erence)?|id transaksi)[:\s]+([A-Z0-9]+)/i,
};

const MONTH_MAP = {
  'januari': '01', 'februari': '02', 'maret': '03', 'april': '04',
  'mei': '05', 'juni': '06', 'juli': '07', 'agustus': '08',
  'september': '09', 'oktober': '10', 'november': '11', 'desember': '12'
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

function parseSeaBankEmail(emailData) {
  try {
    const { id: emailId, subject, body } = emailData;
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
    return null;
  }
}

module.exports = { parseSeaBankEmail };
```

### 2.2 — Buat File `backend/src/services/parsers/bcaParser.js`

```javascript
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

module.exports = { parseBcaEmail };
```

### 2.3 — Buat/Update File `backend/src/services/parserService.js` (Router Orchestrator)

```javascript
// backend/src/services/parserService.js
const { parseSeaBankEmail } = require('./parsers/seabankParser');
const { parseBcaEmail } = require('./parsers/bcaParser');

/**
 * Mendeteksi pengirim dan mem-parsing email berdasarkan bank yang sesuai
 * @param {object} emailData - { id, subject, body }
 * @param {string} sender - Email pengirim (from)
 */
function parseEmail(emailData, sender = '') {
  const fromEmail = sender.toLowerCase();
  
  if (fromEmail.includes('sea.com') || fromEmail.includes('seabank')) {
    return parseSeaBankEmail(emailData);
  }
  
  if (fromEmail.includes('klikbca.com') || fromEmail.includes('bca.co.id')) {
    return parseBcaEmail(emailData);
  }

  // Fallback deteksi via subject jika email pengirim tidak match
  const subject = (emailData.subject || '').toLowerCase();
  if (subject.includes('seabank')) {
    return parseSeaBankEmail(emailData);
  }
  if (subject.includes('bca') || subject.includes('klikbca')) {
    return parseBcaEmail(emailData);
  }

  return null;
}

module.exports = { parseEmail };
```

### 2.4 — Buat File `backend/src/services/gmailService.js`

```javascript
// backend/src/services/gmailService.js
const { google } = require('googleapis');
const { parseEmail } = require('./parserService');
require('dotenv').config();

const SENDER_EMAILS = process.env.GMAIL_SENDER_EMAILS || 'no-reply@sea.com';

/**
 * Decode base64 string dari Gmail API
 */
function decodeBase64(encoded) {
  return Buffer.from(encoded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
}

/**
 * Ekstrak body teks dari payload email (handle multipart)
 */
function extractBodyText(payload) {
  if (!payload) return '';
  if (payload.body && payload.body.data) {
    return decodeBase64(payload.body.data);
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body && part.body.data) {
        return decodeBase64(part.body.data);
      }
    }
    // Fallback ke HTML jika tidak ada plain text
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body && part.body.data) {
        const html = decodeBase64(part.body.data);
        // Strip HTML tags sederhana
        return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      }
    }
  }
  return '';
}

/**
 * Ambil daftar email transaksi yang belum diproses dari berbagai bank
 * @param {object} auth - OAuth2 client
 * @param {string[]} processedIds - Daftar email ID yang sudah diproses
 */
async function fetchNewTransactionEmails(auth, processedIds = []) {
  const gmail = google.gmail({ version: 'v1', auth });
  
  // Konstruksi query pencarian untuk multi-sender
  const sendersList = SENDER_EMAILS.split(',').map(email => email.trim());
  const fromQuery = sendersList.length > 1
    ? `from:(${sendersList.join(' OR ')})`
    : `from:${sendersList[0]}`;
  const query = `${fromQuery} is:unread`;

  try {
    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 20,
    });

    const messages = listResponse.data.messages || [];
    const newMessages = messages.filter(msg => !processedIds.includes(msg.id));

    if (newMessages.length === 0) {
      console.log(`[Gmail] Tidak ada email transaksi baru.`);
      return [];
    }

    console.log(`[Gmail] Ditemukan ${newMessages.length} email baru.`);
    const parsedTransactions = [];

    for (const msg of newMessages) {
      const detail = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'full',
      });

      const headers = detail.data.payload.headers;
      const senderHeader = headers.find(h => h.name.toLowerCase() === 'from')?.value || '';
      const subject = headers.find(h => h.name === 'Subject')?.value || '';
      const receivedAt = new Date(parseInt(detail.data.internalDate)).toISOString();
      const body = extractBodyText(detail.data.payload);

      const transaction = parseEmail({ id: msg.id, subject, body, receivedAt }, senderHeader);

      if (transaction) {
        parsedTransactions.push(transaction);
      } else {
        console.warn(`[Gmail] Gagal parse email ID: ${msg.id}, Subject: ${subject}`);
      }
    }

    return parsedTransactions;
  } catch (error) {
    console.error('[Gmail] Error fetching emails:', error.message);
    throw error;
  }
}

module.exports = { fetchNewTransactionEmails };
```

---

## PHASE 3 — Backend: Google Sheets Integration & API Server

**Tujuan:** Implementasi penyimpanan ke Google Sheets dan semua endpoint REST API.

### 3.1 — Buat File `backend/src/services/sheetsService.js`

```javascript
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
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAMES.TRANSACTIONS}!A1:L1`,
    });
    if (!res.data.values || res.data.values.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAMES.TRANSACTIONS}!A1`,
        valueInputOption: 'RAW',
        resource: { values: [TRANSACTION_HEADERS] },
      });
      console.log('[Sheets] Header kolom berhasil dibuat.');
    }
  } catch (error) {
    console.error('[Sheets] Error inisialisasi sheet:', error.message);
  }
}

/**
 * Ambil semua ID email yang sudah tersimpan (untuk deduplikasi)
 */
async function getProcessedEmailIds(auth) {
  const sheets = google.sheets({ version: 'v4', auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAMES.TRANSACTIONS}!B2:B`,
  });
  return (res.data.values || []).flat();
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
    notes: row[8],
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

module.exports = { initializeSheets, getProcessedEmailIds, saveTransactions, getTransactions, updateTransactionCategory };
```

### 3.2 — Buat File `backend/src/services/schedulerService.js`

```javascript
// backend/src/services/schedulerService.js
const cron = require('node-cron');
const { getAuthClient } = require('../config/googleAuth');
const { fetchNewTransactionEmails } = require('./gmailService');
const { getProcessedEmailIds, saveTransactions } = require('./sheetsService');
require('dotenv').config();

const INTERVAL = process.env.POLLING_INTERVAL_MINUTES || 5;

async function runEmailSync() {
  console.log(`[Scheduler] Memulai sinkronisasi email... ${new Date().toLocaleTimeString('id-ID')}`);
  try {
    const auth = await getAuthClient();
    const processedIds = await getProcessedEmailIds(auth);
    const newTransactions = await fetchNewTransactionEmails(auth, processedIds);
    if (newTransactions.length > 0) {
      await saveTransactions(auth, newTransactions);
      console.log(`[Scheduler] ✅ ${newTransactions.length} transaksi baru tersimpan.`);
    }
  } catch (error) {
    console.error('[Scheduler] ❌ Error sinkronisasi:', error.message);
  }
}

function startScheduler() {
  // Jalankan sekali saat startup
  runEmailSync();
  // Jadwalkan setiap N menit
  cron.schedule(`*/${INTERVAL} * * * *`, runEmailSync);
  console.log(`[Scheduler] Polling aktif setiap ${INTERVAL} menit.`);
}

module.exports = { startScheduler, runEmailSync };
```

### 3.3 — Buat File `backend/src/routes/transactionRoutes.js`

```javascript
// backend/src/routes/transactionRoutes.js
const express = require('express');
const router = express.Router();
const { getAuthClient } = require('../config/googleAuth');
const { getTransactions, saveTransactions, updateTransactionCategory } = require('../services/sheetsService');
const { runEmailSync } = require('../services/schedulerService');

// GET /api/transactions — ambil semua transaksi dengan filter opsional
router.get('/', async (req, res, next) => {
  try {
    const auth = await getAuthClient();
    const { month, year, category, type, bank } = req.query;
    const transactions = await getTransactions(auth, { month, year, category, type, bank });
    res.json({ success: true, count: transactions.length, data: transactions });
  } catch (error) {
    next(error);
  }
});

// POST /api/transactions — tambah transaksi manual
router.post('/', async (req, res, next) => {
  try {
    const { amount, type, category, date, merchant, notes, bank } = req.body;
    if (!amount || !type || !category || !date) {
      return res.status(400).json({ success: false, message: 'Field amount, type, category, dan date wajib diisi.' });
    }
    const auth = await getAuthClient();
    const manualTransaction = {
      emailId: `manual-${Date.now()}`,
      referenceId: `MAN-${Date.now()}`,
      date: new Date(date).toISOString(),
      type,
      amount: parseInt(amount, 10),
      merchant: merchant || 'Manual Input',
      category,
      notes: notes || '',
      source: 'manual',
      bank: bank || 'Manual',
    };
    await saveTransactions(auth, [manualTransaction]);
    res.status(201).json({ success: true, message: 'Transaksi berhasil ditambahkan.', data: manualTransaction });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/transactions/:id/category — update kategori
router.patch('/:id/category', async (req, res, next) => {
  try {
    const { category } = req.body;
    if (!category) return res.status(400).json({ success: false, message: 'Category wajib diisi.' });
    const auth = await getAuthClient();
    await updateTransactionCategory(auth, req.params.id, category);
    res.json({ success: true, message: 'Kategori berhasil diperbarui.' });
  } catch (error) {
    next(error);
  }
});

// POST /api/transactions/sync — trigger sync manual
router.post('/sync', async (req, res, next) => {
  try {
    await runEmailSync();
    res.json({ success: true, message: 'Sinkronisasi email selesai.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
```

### 3.4 — Buat File `backend/src/routes/dashboardRoutes.js`

```javascript
// backend/src/routes/dashboardRoutes.js
const express = require('express');
const router = express.Router();
const { getAuthClient } = require('../config/googleAuth');
const { getTransactions } = require('../services/sheetsService');

// GET /api/dashboard/summary?month=6&year=2026&bank=SeaBank
router.get('/summary', async (req, res, next) => {
  try {
    const auth = await getAuthClient();
    const now = new Date();
    const month = req.query.month || (now.getMonth() + 1);
    const year = req.query.year || now.getFullYear();
    const bank = req.query.bank;

    const transactions = await getTransactions(auth, { month, year, bank });

    const totalIncome = transactions
      .filter(t => t.type === 'Transfer Masuk' || t.type === 'Pemasukan')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = transactions
      .filter(t => t.type !== 'Transfer Masuk' && t.type !== 'Pemasukan')
      .reduce((sum, t) => sum + t.amount, 0);

    // Breakdown per kategori
    const categoryBreakdown = transactions.reduce((acc, t) => {
      if (t.type !== 'Transfer Masuk' && t.type !== 'Pemasukan') {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
      }
      return acc;
    }, {});

    // Pengeluaran per minggu
    const weeklyExpense = [0, 0, 0, 0];
    transactions.forEach(t => {
      if (t.type !== 'Transfer Masuk' && t.type !== 'Pemasukan') {
        const day = new Date(t.date).getDate();
        const weekIndex = Math.min(Math.floor((day - 1) / 7), 3);
        weeklyExpense[weekIndex] += t.amount;
      }
    });

    res.json({
      success: true,
      data: {
        period: { month, year, bank: bank || 'Semua' },
        totalIncome,
        totalExpense,
        netBalance: totalIncome - totalExpense,
        transactionCount: transactions.length,
        categoryBreakdown,
        weeklyExpense: weeklyExpense.map((amount, i) => ({
          week: `Minggu ${i + 1}`,
          amount
        })),
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
```

### 3.5 — Buat File `backend/src/middleware/errorHandler.js`

```javascript
// backend/src/middleware/errorHandler.js
function errorHandler(err, req, res, next) {
  console.error('[Error]', err.message);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Terjadi kesalahan pada server.',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

module.exports = errorHandler;
```

### 3.6 — Buat File `backend/src/app.js`

```javascript
// backend/src/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const transactionRoutes = require('./routes/transactionRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(cors({ origin: '*' })); // Untuk development lokal
app.use(morgan('dev'));
app.use(express.json());

// Routes
app.use('/api/transactions', transactionRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

module.exports = app;
```

### 3.7 — Buat File `backend/server.js`

```javascript
// backend/server.js
require('dotenv').config();
const app = require('./src/app');
const { getAuthClient } = require('./src/config/googleAuth');
const { initializeSheets } = require('./src/services/sheetsService');
const { startScheduler } = require('./src/services/schedulerService');

const PORT = process.env.PORT || 3000;

async function bootstrap() {
  try {
    console.log('🚀 Menginisialisasi SeaTrack Backend...');
    const auth = await getAuthClient();
    await initializeSheets(auth);
    startScheduler();

    app.listen(PORT, () => {
      console.log(`✅ Server berjalan di http://localhost:${PORT}`);
      console.log(`📊 API Health Check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Gagal menjalankan server:', error);
    process.exit(1);
  }
}

bootstrap();
```

---

## PHASE 4 — Frontend: Flutter App

**Tujuan:** Bangun aplikasi Flutter yang mengonsumsi REST API backend.

### 4.1 — Buat Flutter Project

```bash
# Dari root folder seatrack/
cd frontend
flutter create seatrack_app
cd seatrack_app

# Install dependencies Flutter
flutter pub add http
flutter pub add provider
flutter pub add fl_chart
flutter pub add intl
flutter pub add shimmer
flutter pub add google_fonts
```

### 4.2 — Update `frontend/seatrack_app/pubspec.yaml`

Pastikan section `dependencies` berisi:

```yaml
dependencies:
  flutter:
    sdk: flutter
  http: ^1.2.0
  provider: ^6.1.2
  fl_chart: ^0.68.0
  intl: ^0.19.0
  shimmer: ^3.0.0
  google_fonts: ^6.2.1
```

### 4.3 — Buat File `lib/core/constants/app_colors.dart`

```dart
// lib/core/constants/app_colors.dart
import 'package:flutter/material.dart';

class AppColors {
  AppColors._();

  // Primary
  static const Color primary = Color(0xFF1A73E8);
  static const Color primaryDark = Color(0xFF1557B0);
  static const Color primaryLight = Color(0xFFE8F0FE);

  // Semantic
  static const Color income = Color(0xFF0D9F6E);
  static const Color expense = Color(0xFFE53E3E);
  static const Color transfer = Color(0xFF805AD5);
  static const Color qris = Color(0xFFDD6B20);

  // Neutral
  static const Color background = Color(0xFFF7F8FC);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color textPrimary = Color(0xFF1A202C);
  static const Color textSecondary = Color(0xFF718096);
  static const Color divider = Color(0xFFE2E8F0);
  static const Color shimmerBase = Color(0xFFE0E0E0);
  static const Color shimmerHighlight = Color(0xFFF5F5F5);
}
```

### 4.4 — Buat File `lib/core/constants/app_text_styles.dart`

```dart
// lib/core/constants/app_text_styles.dart
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';

class AppTextStyles {
  AppTextStyles._();

  static TextStyle get heading1 => GoogleFonts.plusJakartaSans(
        fontSize: 24, fontWeight: FontWeight.w700, color: AppColors.textPrimary);

  static TextStyle get heading2 => GoogleFonts.plusJakartaSans(
        fontSize: 18, fontWeight: FontWeight.w600, color: AppColors.textPrimary);

  static TextStyle get bodyLarge => GoogleFonts.inter(
        fontSize: 16, fontWeight: FontWeight.w400, color: AppColors.textPrimary);

  static TextStyle get bodyMedium => GoogleFonts.inter(
        fontSize: 14, fontWeight: FontWeight.w400, color: AppColors.textPrimary);

  static TextStyle get bodySmall => GoogleFonts.inter(
        fontSize: 12, fontWeight: FontWeight.w400, color: AppColors.textSecondary);

  static TextStyle get labelMedium => GoogleFonts.inter(
        fontSize: 12, fontWeight: FontWeight.w500, color: AppColors.textSecondary);

  static TextStyle get amountLarge => GoogleFonts.plusJakartaSans(
        fontSize: 28, fontWeight: FontWeight.w700, color: AppColors.textPrimary);

  static TextStyle get amountMedium => GoogleFonts.plusJakartaSans(
        fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.textPrimary);
}
```

### 4.5 — Buat File `lib/core/network/api_client.dart`

```dart
// lib/core/network/api_client.dart
import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiClient {
  static const String _baseUrl = 'http://10.0.2.2:3000/api'; // Android emulator
  // Ganti ke 'http://localhost:3000/api' jika testing di web/desktop

  static Future<Map<String, dynamic>> get(String endpoint, {Map<String, String>? queryParams}) async {
    Uri uri = Uri.parse('$_baseUrl$endpoint');
    if (queryParams != null) {
      uri = uri.replace(queryParameters: queryParams);
    }
    final response = await http.get(uri, headers: {'Content-Type': 'application/json'});
    return _handleResponse(response);
  }

  static Future<Map<String, dynamic>> post(String endpoint, Map<String, dynamic> body) async {
    final response = await http.post(
      Uri.parse('$_baseUrl$endpoint'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(body),
    );
    return _handleResponse(response);
  }

  static Future<Map<String, dynamic>> patch(String endpoint, Map<String, dynamic> body) async {
    final response = await http.patch(
      Uri.parse('$_baseUrl$endpoint'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(body),
    );
    return _handleResponse(response);
  }

  static Map<String, dynamic> _handleResponse(http.Response response) {
    final data = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return data;
    }
    throw Exception(data['message'] ?? 'Terjadi kesalahan: ${response.statusCode}');
  }
}
```

### 4.6 — Buat File `lib/data/models/transaction_model.dart`

```dart
// lib/data/models/transaction_model.dart
class TransactionModel {
  final String id;
  final String emailId;
  final String referenceId;
  final DateTime date;
  final String type;
  final int amount;
  final String merchant;
  final String category;
  final String notes;
  final String source;
  final String bank;

  TransactionModel({
    required this.id,
    required this.emailId,
    required this.referenceId,
    required this.date,
    required this.type,
    required this.amount,
    required this.merchant,
    required this.category,
    required this.notes,
    required this.source,
    required this.bank,
  });

  bool get isIncome => type == 'Transfer Masuk' || type == 'Pemasukan';

  factory TransactionModel.fromJson(Map<String, dynamic> json) {
    return TransactionModel(
      id: json['id'] ?? '',
      emailId: json['emailId'] ?? '',
      referenceId: json['referenceId'] ?? '',
      date: DateTime.parse(json['date']),
      type: json['type'] ?? '',
      amount: json['amount'] ?? 0,
      merchant: json['merchant'] ?? '',
      category: json['category'] ?? 'Lainnya',
      notes: json['notes'] ?? '',
      source: json['source'] ?? 'auto',
      bank: json['bank'] ?? 'Unknown',
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id, 'emailId': emailId, 'referenceId': referenceId,
    'date': date.toIso8601String(), 'type': type, 'amount': amount,
    'merchant': merchant, 'category': category, 'notes': notes, 'source': source,
    'bank': bank,
  };
}
```

### 4.7 — Buat File `lib/providers/transaction_provider.dart`

```dart
// lib/providers/transaction_provider.dart
import 'package:flutter/material.dart';
import '../data/models/transaction_model.dart';
import '../core/network/api_client.dart';

class TransactionProvider extends ChangeNotifier {
  List<TransactionModel> _transactions = [];
  bool _isLoading = false;
  String? _error;

  List<TransactionModel> get transactions => _transactions;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> fetchTransactions({int? month, int? year}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final now = DateTime.now();
      final response = await ApiClient.get('/transactions', queryParams: {
        'month': '${month ?? now.month}',
        'year': '${year ?? now.year}',
      });
      _transactions = (response['data'] as List)
          .map((json) => TransactionModel.fromJson(json))
          .toList();
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> addManualTransaction(Map<String, dynamic> data) async {
    await ApiClient.post('/transactions', data);
    await fetchTransactions();
  }

  Future<void> updateCategory(String transactionId, String newCategory) async {
    await ApiClient.patch('/transactions/$transactionId/category', {'category': newCategory});
    final index = _transactions.indexWhere((t) => t.id == transactionId);
    if (index != -1) {
      // Optimistic update — langsung update di UI
      notifyListeners();
      await fetchTransactions();
    }
  }

  Future<void> syncEmails() async {
    await ApiClient.post('/transactions/sync', {});
    await fetchTransactions();
  }
}
```

### 4.8 — Buat File `lib/main.dart`

```dart
// lib/main.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'providers/transaction_provider.dart';
import 'providers/dashboard_provider.dart';
import 'app.dart';

void main() {
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => TransactionProvider()),
        ChangeNotifierProvider(create: (_) => DashboardProvider()),
      ],
      child: const SeaTrackApp(),
    ),
  );
}
```

### 4.9 — Buat File `lib/app.dart`

```dart
// lib/app.dart
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'core/constants/app_colors.dart';
import 'presentation/screens/home/home_screen.dart';
import 'presentation/screens/dashboard/dashboard_screen.dart';
import 'presentation/screens/transactions/transactions_screen.dart';
import 'presentation/screens/transactions/add_transaction_screen.dart';

class SeaTrackApp extends StatelessWidget {
  const SeaTrackApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SeaTrack',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(seedColor: AppColors.primary),
        scaffoldBackgroundColor: AppColors.background,
        textTheme: GoogleFonts.interTextTheme(),
        appBarTheme: const AppBarTheme(
          backgroundColor: AppColors.surface,
          elevation: 0,
          centerTitle: false,
          foregroundColor: AppColors.textPrimary,
        ),
      ),
      home: const MainNavigation(),
      routes: {
        '/add-transaction': (_) => const AddTransactionScreen(),
      },
    );
  }
}

class MainNavigation extends StatefulWidget {
  const MainNavigation({super.key});
  @override
  State<MainNavigation> createState() => _MainNavigationState();
}

class _MainNavigationState extends State<MainNavigation> {
  int _currentIndex = 0;
  final List<Widget> _screens = [
    const HomeScreen(),
    const DashboardScreen(),
    const TransactionsScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _screens[_currentIndex],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (i) => setState(() => _currentIndex = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Beranda'),
          NavigationDestination(icon: Icon(Icons.bar_chart_outlined), selectedIcon: Icon(Icons.bar_chart), label: 'Dashboard'),
          NavigationDestination(icon: Icon(Icons.receipt_long_outlined), selectedIcon: Icon(Icons.receipt_long), label: 'Transaksi'),
        ],
      ),
    );
  }
}
```

**Selanjutnya buat semua screen dan widget yang ada di dalam `presentation/` mengikuti struktur direktori di atas. Setiap screen menggunakan `Consumer<TransactionProvider>` untuk state management.**

---

## PHASE 5 — Testing, Validasi & Finalisasi

### 5.1 — Checklist Testing Backend

```bash
# Jalankan backend
cd backend && npm run dev

# Test health check
curl http://localhost:3000/api/health

# Test ambil transaksi (akan kosong jika baru)
curl "http://localhost:3000/api/transactions?month=6&year=2026"

# Test tambah transaksi manual
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{"amount":50000,"type":"Pengeluaran","category":"Makanan & Minuman","date":"2026-06-08","merchant":"Warteg Barokah","notes":"Makan siang"}'

# Test sync email
curl -X POST http://localhost:3000/api/transactions/sync

# Test dashboard summary
curl "http://localhost:3000/api/dashboard/summary?month=6&year=2026"
```

### 5.2 — Checklist Testing Flutter

```bash
# Dari folder frontend/seatrack_app
flutter analyze          # Periksa error statik
flutter test             # Jalankan unit test
flutter run              # Jalankan di emulator/device
```

### 5.3 — Checklist Sebelum Rilis

- [ ] Semua endpoint API mengembalikan response yang konsisten
- [ ] Error handling di Flutter menampilkan pesan yang user-friendly
- [ ] Pull-to-refresh berfungsi di semua screen dengan daftar
- [ ] Parsing email bekerja untuk minimal 3 jenis transaksi SeaBank
- [ ] Input manual memvalidasi semua field wajib
- [ ] Edit kategori langsung terupdate di UI (optimistic update)
- [ ] Chart di dashboard merender data dengan benar
- [ ] Tidak ada credentials yang masuk ke git repository

---

*End of Implementation Plan. Mulai dari Phase 1 dan ikuti urutan pembuatan file yang tertera.*
