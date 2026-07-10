# DATA SCHEMA — SeaTrack
## Dokumentasi Teknis Alur Data, Skema Database & Kontrak API

**Versi:** 1.0.0  
**Tanggal:** Juni 2026  
**Scope:** Google Sheets Schema, JSON API Contract, Regex Patterns, Data Flow

---

## 1. Gambaran Besar Alur Data

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ALUR DATA SEATRACK                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  [Email SeaBank]                                                        │
│       │                                                                 │
│       ▼                                                                 │
│  [Gmail Inbox] ──── Gmail API (read-only) ────► [Node.js Backend]      │
│                                                        │                │
│                                               ┌────────▼────────┐      │
│                                               │  Parser Service  │      │
│                                               │  (Regex Engine)  │      │
│                                               └────────┬────────┘      │
│                                                        │                │
│                                               ┌────────▼────────┐      │
│                                               │  Sheets Service  │      │
│                                               └────────┬────────┘      │
│                                                        │                │
│                                               [Google Sheets API]       │
│                                                        │                │
│                                               ┌────────▼────────┐      │
│                                               │   REST API       │      │
│                                               │   (Express)      │      │
│                                               └────────┬────────┘      │
│                                                        │                │
│                                               ┌────────▼────────┐      │
│                                               │  Flutter App     │      │
│                                               │  (UI Display)    │      │
│                                               └─────────────────┘      │
└─────────────────────────────────────────────────────────────────────────┘
```

**Catatan Alur:**
1. Backend melakukan polling Gmail setiap 5 menit.
2. Email baru diparse oleh `parserService.js` menggunakan pola Regex.
3. Hasil parsing disimpan ke Google Sheets via Sheets API.
4. Flutter mengambil data dari backend Express via HTTP GET.
5. Flutter tidak pernah mengakses Google Sheets atau Gmail secara langsung.

---

## 2. Skema Google Sheets

### 2.1 Sheet: `Transactions` (Sheet Utama)

Ini adalah sheet utama yang menyimpan seluruh riwayat transaksi.

| Kolom | Header | Tipe Data | Contoh Nilai | Keterangan |
|-------|--------|-----------|--------------|------------|
| A | `ID` | String | `TXN-1717824000000-0` | ID unik per baris, format: `TXN-{timestamp}-{index}` |
| B | `Email ID` | String | `18f3a2b1c4d5e678` | Gmail Message ID, untuk deduplikasi |
| C | `Reference ID` | String | `REF20260608001` | ID referensi transaksi dari email, atau `MAN-{timestamp}` untuk manual |
| D | `Date` | String (ISO 8601) | `2026-06-08T14:30:00+07:00` | Waktu transaksi (dari body email atau input manual) |
| E | `Type` | String (Enum) | `Transfer Keluar` | Jenis transaksi (lihat nilai valid di bawah) |
| F | `Amount` | Integer | `250000` | Nominal dalam Rupiah, tanpa titik/koma, selalu positif |
| G | `Merchant` | String | `Tokopedia` | Nama penerima/pengirim/merchant |
| H | `Category` | String | `Belanja` | Kategori yang bisa diedit pengguna |
| I | `Notes` | String | `Beli charger` | Catatan opsional dari pengguna |
| J | `Source` | String (Enum) | `auto` | Asal data: `auto` (dari email) atau `manual` |
| K | `Created At` | String (ISO 8601) | `2026-06-08T14:35:00.000Z` | Waktu data masuk ke sheet (timestamp server) |
| L | `Bank` | String | `SeaBank` | Sumber bank transaksi, contoh: `SeaBank`, `BCA`, `Jago`, atau `Manual` |

**Nilai valid untuk kolom `Type` (E):**

```
Transfer Masuk     ← Dana diterima dari rekening lain
Transfer Keluar    ← Transfer ke rekening lain
QRIS               ← Pembayaran via QRIS
Tarik Tunai        ← Penarikan ATM
Pemasukan          ← Input manual: pemasukan
Pengeluaran        ← Input manual: pengeluaran
Lainnya            ← Jenis yang tidak teridentifikasi
```

**Nilai valid untuk kolom `Source` (J):**

```
auto    ← Hasil parsing email otomatis
manual  ← Input manual pengguna via Flutter
```

---

### 2.2 Sheet: `ParseErrors` (Log Error)

Menyimpan email yang gagal diparse untuk investigasi manual.

| Kolom | Header | Tipe Data | Contoh Nilai | Keterangan |
|-------|--------|-----------|--------------|------------|
| A | `Error ID` | String | `ERR-1717824000000` | ID unik error |
| B | `Email ID` | String | `18f3a2b1c4d5e678` | Gmail Message ID |
| C | `Subject` | String | `Notifikasi Transaksi SeaBank` | Subject email asli |
| D | `Error Message` | String | `Nominal tidak ditemukan` | Pesan error dari parser |
| E | `Timestamp` | String (ISO 8601) | `2026-06-08T14:35:00.000Z` | Waktu error terjadi |
| F | `Raw Body Snippet` | String | `Halo, transaksi...` | 200 karakter pertama body email |

---

### 2.3 Sheet: `Categories` (Master Kategori)

Menyimpan daftar kategori yang tersedia untuk dropdown di Flutter.

| Kolom | Header | Tipe Data | Contoh Nilai |
|-------|--------|-----------|--------------|
| A | `Category Name` | String | `Makanan & Minuman` |
| B | `Icon Name` | String | `restaurant` |
| C | `Color Hex` | String | `#1A73E8` |
| D | `Type` | String | `expense` atau `income` |

**Data awal (seed data):**

| Category Name | Icon | Color | Type |
|---------------|------|-------|------|
| Makanan & Minuman | restaurant | #DD6B20 | expense |
| Transportasi | directions_car | #0D9F6E | expense |
| Belanja | shopping_bag | #1A73E8 | expense |
| Hiburan | movie | #805AD5 | expense |
| Tagihan & Utilitas | receipt | #E53E3E | expense |
| Kesehatan | favorite | #E53E3E | expense |
| Tabungan & Investasi | savings | #38A169 | income |
| Transfer | swap_horiz | #718096 | both |
| Pemasukan | arrow_downward | #0D9F6E | income |
| Lainnya | category | #A0AEC0 | both |

---

## 3. Pola Regex untuk Email SeaBank

Semua pola berikut diuji terhadap format email notifikasi SeaBank Indonesia. Gunakan flag `i` (case-insensitive) dan `m` (multiline) saat dibutuhkan.

### 3.1 Deteksi Jenis Transaksi (dari Subject Email)

Pencocokan dilakukan pada subject email dan 200 karakter pertama body:

```javascript
// JENIS: Transfer Masuk / Dana Diterima
const TYPE_INCOME = /(dana diterima|uang masuk|transfer masuk|menerima transfer|berhasil diterima)/i;
// Contoh subject: "Dana Diterima - Rp500.000"

// JENIS: Transfer Keluar
const TYPE_TRANSFER_OUT = /(transfer berhasil|berhasil ditransfer|transfer keluar|pengiriman berhasil)/i;
// Contoh subject: "Transfer Berhasil - Rp250.000"

// JENIS: Pembayaran QRIS
const TYPE_QRIS = /(pembayaran qris|qris berhasil|bayar.*qris|qris.*berhasil)/i;
// Contoh subject: "Pembayaran QRIS Berhasil"

// JENIS: Tarik Tunai
const TYPE_ATM = /(tarik tunai|penarikan atm|cash withdrawal)/i;
// Contoh subject: "Tarik Tunai Berhasil"
```

---

### 3.2 Ekstraksi Nominal

```javascript
// POLA UTAMA: "Rp500.000" atau "Rp 1.234.567" atau "Rp500000"
const PATTERN_AMOUNT = /Rp\s?([\d.]+)/i;

// Contoh match:
// "Rp500.000"    → capture group 1: "500.000"
// "Rp 1.234.567" → capture group 1: "1.234.567"
// "Rp500000"     → capture group 1: "500000"

// Parsing ke integer:
function parseAmount(raw) {
  return parseInt(raw.replace(/\./g, ''), 10);
}
// parseAmount("500.000") → 500000
// parseAmount("1.234.567") → 1234567
```

**Edge cases yang ditangani:**
- Spasi opsional antara "Rp" dan angka
- Titik sebagai pemisah ribuan (bukan desimal)
- Nominal tanpa pemisah ribuan untuk angka kecil

---

### 3.3 Ekstraksi Tanggal & Waktu

```javascript
// FORMAT 1: "12 Juni 2026, 14:30 WIB" (format paling umum di email SeaBank)
const PATTERN_DATE_LONG = /(\d{1,2})\s+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+(\d{4}),?\s+(\d{2}:\d{2})(?:\s+WIB)?/i;
// Group: [, day, month_name, year, time]

// FORMAT 2: "12/06/2026 14:30"
const PATTERN_DATE_NUMERIC = /(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}:\d{2})/;
// Group: [, day, month, year, time]

// FORMAT 3: "Minggu, 8 Jun 2026 14:30"
const PATTERN_DATE_SHORT_MONTH = /(?:Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu),\s+(\d{1,2})\s+(Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agu|Sep|Okt|Nov|Des)\s+(\d{4})\s+(\d{2}:\d{2})/i;

const MONTH_MAP_LONG = {
  'januari':'01','februari':'02','maret':'03','april':'04',
  'mei':'05','juni':'06','juli':'07','agustus':'08',
  'september':'09','oktober':'10','november':'11','desember':'12'
};
const MONTH_MAP_SHORT = {
  'jan':'01','feb':'02','mar':'03','apr':'04',
  'mei':'05','jun':'06','jul':'07','agu':'08',
  'sep':'09','okt':'10','nov':'11','des':'12'
};
```

---

### 3.4 Ekstraksi Merchant / Penerima / Pengirim

```javascript
// Transfer Keluar — Cari nama penerima
// Contoh: "kepada: JOHN DOE" atau "Kepada\nJOHN DOE"
const PATTERN_TO = /(?:kepada|ke rekening|tujuan)[:\s]+([A-Za-z0-9\s\-\.\/]+?)(?:\n|\r|dengan|dari|no\.?rekening|$)/im;

// Transfer Masuk — Cari nama pengirim
// Contoh: "dari: JANE DOE" atau "Pengirim\nJANE DOE"
const PATTERN_FROM = /(?:dari|pengirim|dikirim oleh)[:\s]+([A-Za-z0-9\s\-\.\/]+?)(?:\n|\r|dengan|ke|nominal|$)/im;

// Pembayaran QRIS — Cari nama merchant
// Contoh: "Merchant: TOKOPEDIA" atau "kepada: GOJEK"
const PATTERN_MERCHANT = /(?:merchant|nama merchant|nama toko|kepada merchant)[:\s]+([A-Za-z0-9\s\-\.\/]+?)(?:\n|\r|$)/im;

// Cleanup hasil capture:
function cleanMerchantName(raw) {
  return raw
    .trim()
    .replace(/\s+/g, ' ')           // Hapus whitespace ganda
    .replace(/[^\w\s\-\.]/g, '')    // Hapus karakter non-alfanumerik kecuali - dan .
    .substring(0, 50);              // Batasi 50 karakter
}
```

---

### 3.5 Ekstraksi Nomor Referensi

```javascript
// Format referensi SeaBank bervariasi, tangkap semua kemungkinan
const PATTERN_REF = /(?:no\.?\s*referensi|no\.?\s*ref|reference\s*no\.?|id\s*transaksi|transaction\s*id)[:\s]+([A-Z0-9\-]+)/i;

// Contoh match:
// "No. Referensi: SEA20260608001234" → "SEA20260608001234"
// "Transaction ID: TXN-987654321"    → "TXN-987654321"
```

---

### 3.6 Contoh Parsing Lengkap per Jenis Transaksi

#### 3.6.1 Email "Dana Diterima" (Transfer Masuk)

```
Subject: Dana Diterima - Rp500.000
Body:
  Halo, SeaSaver!
  Kamu telah menerima dana sebesar
  Rp500.000
  Dari: AHMAD FAUZI
  Tanggal: 08 Juni 2026, 14:30 WIB
  No. Referensi: SEA20260608001234
  Keterangan: Bayar utang makan
```

**Hasil Parsing:**
```json
{
  "type": "Transfer Masuk",
  "amount": 500000,
  "merchant": "AHMAD FAUZI",
  "date": "2026-06-08T14:30:00+07:00",
  "referenceId": "SEA20260608001234",
  "category": "Pemasukan"
}
```

---

#### 3.6.2 Email "Transfer Berhasil" (Transfer Keluar)

```
Subject: Transfer Berhasil - Rp250.000
Body:
  Transfer kamu telah berhasil!
  Nominal: Rp250.000
  Kepada: BUDI SANTOSO
  No. Rekening: 901234567890
  Tanggal: 08 Juni 2026, 09:15 WIB
  No. Referensi: TRF20260608007890
```

**Hasil Parsing:**
```json
{
  "type": "Transfer Keluar",
  "amount": 250000,
  "merchant": "BUDI SANTOSO",
  "date": "2026-06-08T09:15:00+07:00",
  "referenceId": "TRF20260608007890",
  "category": "Transfer"
}
```

---

#### 3.6.3 Email "Pembayaran QRIS Berhasil"

```
Subject: Pembayaran QRIS Berhasil - Rp45.000
Body:
  Pembayaran QRIS kamu berhasil!
  Merchant: STARBUCKS COFFEE INDONESIA
  Nominal: Rp45.000
  Tanggal: 08 Juni 2026, 10:00 WIB
  No. Referensi: QRIS20260608099123
```

**Hasil Parsing:**
```json
{
  "type": "QRIS",
  "amount": 45000,
  "merchant": "STARBUCKS COFFEE INDONESIA",
  "date": "2026-06-08T10:00:00+07:00",
  "referenceId": "QRIS20260608099123",
  "category": "Makanan & Minuman"
}
```

---

## 4. Kontrak JSON API (Backend ↔ Frontend)

### 4.1 Struktur Objek Transaksi (Transaction Object)

Objek ini digunakan di seluruh API response dan model Flutter:

```json
{
  "id": "TXN-1717824000000-0",
  "emailId": "18f3a2b1c4d5e678",
  "referenceId": "SEA20260608001234",
  "date": "2026-06-08T14:30:00+07:00",
  "type": "Transfer Masuk",
  "amount": 500000,
  "merchant": "AHMAD FAUZI",
  "category": "Pemasukan",
  "notes": "",
  "source": "auto",
  "createdAt": "2026-06-08T07:35:00.000Z",
  "bank": "SeaBank"
}
```

---

### 4.2 `GET /api/transactions`

**Query Parameters:**

| Parameter | Tipe | Wajib | Default | Keterangan |
|-----------|------|-------|---------|------------|
| `month` | Integer (1-12) | Tidak | Bulan saat ini | Filter bulan |
| `year` | Integer (YYYY) | Tidak | Tahun saat ini | Filter tahun |
| `category` | String | Tidak | — | Filter per kategori |
| `type` | String | Tidak | — | Filter per jenis transaksi |
| `bank` | String | Tidak | — | Filter per bank/sumber (contoh: `SeaBank`, `BCA`) |

**Response Sukses (200):**

```json
{
  "success": true,
  "count": 12,
  "data": [
    {
      "id": "TXN-1717824000000-0",
      "emailId": "18f3a2b1c4d5e678",
      "referenceId": "SEA20260608001234",
      "date": "2026-06-08T14:30:00+07:00",
      "type": "Transfer Masuk",
      "amount": 500000,
      "merchant": "AHMAD FAUZI",
      "category": "Pemasukan",
      "notes": "",
      "source": "auto",
      "createdAt": "2026-06-08T07:35:00.000Z",
      "bank": "SeaBank"
    }
  ]
}
```

---

### 4.3 `POST /api/transactions` (Input Manual)

**Request Body:**

```json
{
  "amount": 50000,
  "type": "Pengeluaran",
  "category": "Makanan & Minuman",
  "date": "2026-06-08",
  "merchant": "Warteg Barokah",
  "notes": "Makan siang",
  "bank": "Manual"
}
```

**Validasi Request:**

| Field | Wajib | Validasi |
|-------|-------|----------|
| `amount` | Ya | Integer positif, > 0 |
| `type` | Ya | Harus salah satu enum `Type` yang valid |
| `category` | Ya | String tidak kosong |
| `date` | Ya | Format date yang bisa di-parse |
| `merchant` | Tidak | String, default "Manual Input" |
| `notes` | Tidak | String, default "" |
| `bank` | Tidak | String, default "Manual" |

**Response Sukses (201):**

```json
{
  "success": true,
  "message": "Transaksi berhasil ditambahkan.",
  "data": {
    "id": "TXN-1717824099000-0",
    "emailId": "manual-1717824099000",
    "referenceId": "MAN-1717824099000",
    "date": "2026-06-08T00:00:00.000Z",
    "type": "Pengeluaran",
    "amount": 50000,
    "merchant": "Warteg Barokah",
    "category": "Makanan & Minuman",
    "notes": "Makan siang",
    "source": "manual",
    "createdAt": "2026-06-08T07:40:00.000Z",
    "bank": "Manual"
  }
}
```

---

### 4.4 `PATCH /api/transactions/:id/category`

**Request Body:**

```json
{
  "category": "Transportasi"
}
```

**Response Sukses (200):**

```json
{
  "success": true,
  "message": "Kategori berhasil diperbarui."
}
```

---

### 4.5 `GET /api/dashboard/summary`

**Query Parameters:**

| Parameter | Tipe | Default |
|-----------|------|---------|
| `month` | Integer | Bulan saat ini |
| `year` | Integer | Tahun saat ini |

**Response Sukses (200):**

```json
{
  "success": true,
  "data": {
    "period": {
      "month": 6,
      "year": 2026
    },
    "totalIncome": 5200000,
    "totalExpense": 2750000,
    "netBalance": 2450000,
    "transactionCount": 18,
    "categoryBreakdown": {
      "Makanan & Minuman": 850000,
      "Transportasi": 320000,
      "Belanja": 1200000,
      "Tagihan & Utilitas": 380000,
      "Lainnya": 0
    },
    "weeklyExpense": [
      { "week": "Minggu 1", "amount": 720000 },
      { "week": "Minggu 2", "amount": 850000 },
      { "week": "Minggu 3", "amount": 630000 },
      { "week": "Minggu 4", "amount": 550000 }
    ]
  }
}
```

---

### 4.6 Format Response Error (Semua Endpoint)

```json
{
  "success": false,
  "message": "Deskripsi error yang user-friendly",
  "stack": "Error: ...\n    at ..." 
}
```

> **Catatan:** Field `stack` hanya muncul saat `NODE_ENV=development`.

**HTTP Status Codes yang Digunakan:**

| Kode | Makna |
|------|-------|
| 200 | OK — Request berhasil |
| 201 | Created — Data baru berhasil dibuat |
| 400 | Bad Request — Validasi input gagal |
| 404 | Not Found — Resource tidak ditemukan |
| 500 | Internal Server Error — Kesalahan server |

---

## 5. Aturan Integritas Data

### 5.1 Deduplikasi

Sebelum menyimpan ke Google Sheets, sistem selalu mengecek apakah `emailId` sudah ada di kolom B. Ini mencegah data ganda jika sinkronisasi berjalan saat email belum ditandai "read".

```javascript
// Cek di sheetsService.js sebelum saveTransactions()
const processedIds = await getProcessedEmailIds(auth);
const newTransactions = parsed.filter(t => !processedIds.includes(t.emailId));
```

### 5.2 Normalisasi Nominal

Nominal selalu disimpan sebagai **integer positif dalam satuan Rupiah** tanpa desimal. Konversi dari format email ("Rp500.000") ke integer (500000) dilakukan di `parserService.js` sebelum data masuk ke Sheets.

### 5.3 Timezone

Semua timestamp disimpan dalam format ISO 8601 dengan offset `+07:00` (WIB) untuk waktu transaksi dari email. Timestamp `createdAt` menggunakan UTC (`Z`). Flutter wajib melakukan parsing timezone dengan benar menggunakan package `intl`.

```dart
// Contoh formatting di Flutter
import 'package:intl/intl.dart';

final formatter = DateFormat('dd MMM yyyy, HH:mm', 'id_ID');
final formatted = formatter.format(transaction.date.toLocal());
// Output: "08 Jun 2026, 14:30"
```

---

*Dokumen ini adalah sumber kebenaran tunggal (single source of truth) untuk semua keputusan data di proyek SeaTrack.*
