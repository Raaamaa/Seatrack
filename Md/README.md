# SeaTrack 💰
### Aplikasi Manajemen Keuangan Pribadi Berbasis Otomatisasi Email SeaBank

SeaTrack mengotomatiskan pencatatan transaksi keuangan Anda dengan membaca notifikasi email SeaBank dari Gmail, mengekstrak data penting, dan menampilkannya dalam aplikasi mobile Flutter yang bersih dan intuitif.

```
Gmail (SeaBank Email) → Node.js Parser → Google Sheets → Flutter App
```

---

## ✨ Fitur Utama

- **🤖 Otomasi Penuh** — Tidak perlu input manual untuk transaksi digital SeaBank
- **📊 Dashboard Visual** — Grafik pengeluaran mingguan dan breakdown per kategori
- **🏷️ Edit Kategori** — Ubah kategori transaksi langsung dari aplikasi
- **✍️ Input Manual** — Catat transaksi uang tunai (cash) dengan mudah
- **☁️ Free Tier** — Berjalan 100% di Google free tier, biaya Rp 0
- **🔒 Privasi** — Data tersimpan di Google Sheets milik Anda sendiri

---

## 📋 Prasyarat

Pastikan semua tools berikut sudah terinstal sebelum memulai:

| Tool | Versi Minimum | Cek Versi |
|------|---------------|-----------|
| Node.js | 18.x | `node --version` |
| npm | 9.x | `npm --version` |
| Flutter | 3.x | `flutter --version` |
| Git | 2.x | `git --version` |
| Android Studio | Hedgehog+ | Untuk Android emulator |

Selain itu, Anda membutuhkan:
- **Akun Google** dengan Gmail aktif yang menerima notifikasi SeaBank
- **Google Cloud Project** dengan Gmail API dan Google Sheets API diaktifkan
- **File `credentials.json`** dari Google Cloud Console (OAuth 2.0 Desktop App)
- **Google Spreadsheet** yang sudah dibuat dan ID-nya dicatat

---

## 🚀 Panduan Instalasi & Setup

### Langkah 1: Clone Repository

```bash
git clone https://github.com/username/seatrack.git
cd seatrack
```

### Langkah 2: Setup Google Cloud Project

1. Buka [Google Cloud Console](https://console.cloud.google.com)
2. Buat project baru bernama `seatrack`
3. Aktifkan **Gmail API** dan **Google Sheets API**
4. Buat **Credentials → OAuth 2.0 Client ID** (pilih tipe: Desktop App)
5. Unduh file JSON dan simpan sebagai `backend/credentials/credentials.json`
6. Buat Google Spreadsheet baru, salin ID-nya dari URL:
   ```
   https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID_INI]/edit
   ```

### Langkah 3: Setup Backend (Node.js)

```bash
# Masuk ke folder backend
cd backend

# Install dependencies
npm install

# Salin template environment variables
cp .env.example .env
```

Edit file `.env` dan isi nilai berikut:

```env
GOOGLE_CREDENTIALS_PATH=./credentials/credentials.json
GOOGLE_TOKEN_PATH=./credentials/token.json
SPREADSHEET_ID=your_actual_spreadsheet_id_here
GMAIL_SENDER_EMAIL=no-reply@sea.com
PORT=3000
POLLING_INTERVAL_MINUTES=5
```

### Langkah 4: Autentikasi Google (Pertama Kali)

```bash
# Jalankan server untuk pertama kali
# Akan muncul URL autentikasi di terminal
npm run dev
```

Saat pertama dijalankan, terminal akan menampilkan URL Google. Buka URL tersebut di browser, login dengan akun Gmail Anda, berikan izin akses, lalu salin kode yang muncul dan tempelkan ke terminal. Token akan tersimpan otomatis di `credentials/token.json`.

### Langkah 5: Setup Frontend (Flutter)

```bash
# Masuk ke folder Flutter
cd ../frontend/seatrack_app

# Install dependencies Flutter
flutter pub get
```

> **Catatan untuk Android Emulator:** URL backend secara default menggunakan `10.0.2.2:3000` (alias `localhost` di Android emulator). Jika Anda menggunakan device fisik, ganti dengan IP lokal komputer Anda (cek dengan `ipconfig` atau `ifconfig`).

---

## ▶️ Menjalankan Aplikasi

### Jalankan Backend Server

```bash
# Mode development (auto-restart saat ada perubahan)
cd backend
npm run dev

# Mode production
npm start
```

Server akan berjalan di `http://localhost:3000`. Periksa status server:
```bash
curl http://localhost:3000/api/health
# Response: {"status":"ok","timestamp":"..."}
```

### Jalankan Aplikasi Flutter

```bash
# Pastikan emulator/device sudah berjalan
flutter devices   # Lihat daftar device yang tersedia

# Jalankan aplikasi
cd frontend/seatrack_app
flutter run
```

### Menjalankan Keduanya Sekaligus (Opsional)

Buka dua terminal terpisah:

```bash
# Terminal 1 — Backend
cd seatrack/backend && npm run dev

# Terminal 2 — Flutter
cd seatrack/frontend/seatrack_app && flutter run
```

---

## 📡 API Endpoints

Base URL: `http://localhost:3000/api`

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `GET` | `/health` | Status server |
| `GET` | `/transactions` | Ambil semua transaksi (filter: `month`, `year`, `category`, `type`) |
| `POST` | `/transactions` | Tambah transaksi manual |
| `PATCH` | `/transactions/:id/category` | Update kategori transaksi |
| `POST` | `/transactions/sync` | Trigger sinkronisasi email manual |
| `GET` | `/dashboard/summary` | Ringkasan dashboard (filter: `month`, `year`) |

---

## 📁 Struktur Project

```
seatrack/
├── backend/           # Node.js + Express API server
│   ├── src/
│   │   ├── config/    # Autentikasi & konstanta
│   │   ├── services/  # Business logic (Gmail, Parser, Sheets, Scheduler)
│   │   ├── routes/    # API route handlers
│   │   └── middleware/# Error handling
│   ├── credentials/   # Google OAuth credentials (tidak di-commit)
│   └── server.js      # Entry point
│
├── frontend/
│   └── seatrack_app/  # Flutter mobile app
│       └── lib/
│           ├── core/           # Konstanta, network client, utils
│           ├── data/           # Models & repositories
│           ├── presentation/   # Screens & widgets
│           └── providers/      # State management
│
└── docs/              # Semua dokumentasi proyek
```

---

## 🔒 Keamanan

- File `credentials.json` dan `token.json` **TIDAK** disimpan di Git (sudah ada di `.gitignore`)
- Aplikasi hanya meminta scope `gmail.readonly` — tidak bisa mengirim atau menghapus email
- Data finansial tersimpan di Google Sheets pribadi Anda, bukan server pihak ketiga
- Backend hanya dapat diakses secara lokal (tidak di-expose ke internet)

---

## 🐛 Troubleshooting

**Backend gagal start:**
- Pastikan `credentials.json` ada di `backend/credentials/`
- Pastikan `SPREADSHEET_ID` di `.env` sudah benar dan tidak ada spasi

**Email tidak terparse:**
- Cek log terminal backend untuk pesan error parsing
- Pastikan `GMAIL_SENDER_EMAIL` sesuai dengan pengirim notifikasi SeaBank Anda

**Flutter tidak bisa connect ke backend:**
- Pastikan backend sudah berjalan di port 3000
- Di emulator Android: gunakan `10.0.2.2:3000`, bukan `localhost:3000`
- Di device fisik: ganti dengan IP lokal komputer (contoh: `192.168.1.5:3000`)

**Token OAuth kadaluarsa:**
- Hapus file `backend/credentials/token.json`
- Restart backend dan ikuti proses autentikasi ulang

---

## 📄 Lisensi

Proyek ini dibuat untuk penggunaan pribadi. Tidak untuk distribusi komersial.

---

*Made with ❤️ for personal finance clarity*
