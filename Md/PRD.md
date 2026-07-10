# PRD — Product Requirements Document
## SeaTrack: Aplikasi Manajemen Keuangan Pribadi Berbasis Otomatisasi SeaBank

**Versi:** 1.0.0  
**Tanggal:** Juni 2026  
**Status:** Draft MVP  
**Penulis:** Tim Produk SeaTrack

---

## 1. Ringkasan Proyek

SeaTrack adalah aplikasi manajemen keuangan pribadi mobile-first yang dirancang untuk mengotomatiskan pencatatan transaksi keuangan dari rekening SeaBank. Aplikasi ini membaca notifikasi email transaksi dari Gmail, mengekstrak data relevan menggunakan pola Regex, menyimpannya ke Google Sheets, dan menampilkannya dalam antarmuka Flutter yang intuitif.

Masalah utama yang dipecahkan: pencatatan transaksi manual itu lambat, rentan kesalahan, dan sering tidak konsisten. SeaTrack menghilangkan gesekan tersebut dengan pipeline otomasi penuh dari email → data → visualisasi.

---

## 2. Latar Belakang & Konteks

### 2.1 Masalah yang Dihadapi

- Pencatatan pengeluaran manual membutuhkan disiplin tinggi dan mudah terlupakan.
- Aplikasi keuangan umum di pasaran tidak terintegrasi langsung dengan SeaBank Indonesia.
- Data transaksi tersebar di notifikasi email tanpa agregasi.
- Pengguna kehilangan visibilitas atas pola pengeluaran mereka.

### 2.2 Solusi yang Diusulkan

Pipeline otomatis: Gmail → Node.js (parser) → Google Sheets (storage) → Flutter (display). Pengguna tidak perlu melakukan input apapun untuk transaksi digital SeaBank.

### 2.3 Target Pengguna

- **Segmen Primer:** Individu berusia 20–35 tahun yang aktif menggunakan SeaBank sebagai rekening utama.
- **Profil:** Familiar dengan teknologi, ingin kontrol penuh atas data pribadinya, dan tidak nyaman data finansialnya dipegang pihak ketiga berbayar.
- **Kebutuhan Utama:** Visibilitas spending otomatis, zero friction, privasi data.

---

## 3. Tujuan & Objektif

### 3.1 Tujuan Bisnis/Produk

| Tujuan | Metrik Keberhasilan |
|--------|---------------------|
| Mengotomatiskan pencatatan transaksi SeaBank | ≥ 95% transaksi terparsing dengan benar |
| Memberikan visibilitas keuangan real-time | Dashboard dimuat dalam < 3 detik |
| Mendukung input manual untuk transaksi tunai | Input selesai dalam < 30 detik |
| Beroperasi penuh di free tier Google | Biaya operasional = Rp 0 |

### 3.2 Non-Tujuan (Out of Scope untuk MVP)

- Fitur multi-pengguna atau berbagi data antar akun.
- Notifikasi push berbasis anggaran (budget alert).
- Ekspor laporan ke PDF/Excel.
- Autentikasi OAuth untuk pengguna akhir (scope pribadi/lokal).

---

## 4. User Stories

### 4.1 Pencatatan Otomatis

```
Sebagai pengguna SeaBank,
Saya ingin transaksi saya tercatat otomatis setelah email notifikasi masuk ke Gmail,
Sehingga saya tidak perlu repot input manual untuk setiap transaksi digital.
```

**Kriteria Penerimaan:**
- Email notifikasi SeaBank diproses dalam waktu < 5 menit setelah diterima.
- Data yang diekstrak meliputi: nominal, tanggal/waktu, jenis transaksi, dan merchant/penerima.
- Transaksi duplikat tidak tersimpan dua kali (deduplikasi via ID email).

---

```
Sebagai pengguna,
Saya ingin melihat daftar transaksi terbaru di halaman utama aplikasi,
Sehingga saya bisa memantau aktivitas keuangan saya kapan saja.
```

**Kriteria Penerimaan:**
- Daftar transaksi memuat data terbaru (max 5 menit delay).
- Setiap item menampilkan: ikon jenis transaksi, nama merchant, nominal, dan waktu.
- List dapat di-scroll dan mendukung pull-to-refresh.

---

### 4.2 Kategorisasi

```
Sebagai pengguna,
Saya ingin mengubah kategori sebuah transaksi langsung dari aplikasi,
Sehingga laporan keuangan saya akurat sesuai kebiasaan belanja saya.
```

**Kriteria Penerimaan:**
- Kategori bisa diubah dengan tap pada transaksi.
- Perubahan kategori tersimpan ke Google Sheets dalam < 2 detik.
- Tersedia minimal 8 kategori bawaan: Makanan, Transportasi, Belanja, Hiburan, Tagihan, Kesehatan, Tabungan, Lainnya.

---

### 4.3 Input Manual

```
Sebagai pengguna yang bertransaksi tunai,
Saya ingin menambahkan pengeluaran atau pemasukan manual,
Sehingga semua arus kas saya—termasuk yang cash—tercatat di satu tempat.
```

**Kriteria Penerimaan:**
- Form input manual tersedia di halaman dedicated.
- Field wajib: nominal, jenis (pemasukan/pengeluaran), kategori, tanggal.
- Field opsional: catatan/deskripsi, merchant.
- Validasi input mencegah nilai kosong atau negatif.

---

### 4.4 Dashboard & Visualisasi

```
Sebagai pengguna,
Saya ingin melihat ringkasan keuangan bulanan berupa grafik,
Sehingga saya bisa memahami pola pengeluaran saya secara visual.
```

**Kriteria Penerimaan:**
- Bar chart atau line chart untuk pengeluaran per minggu dalam sebulan.
- Pie chart breakdown kategori pengeluaran.
- Kartu ringkasan: Total Pemasukan, Total Pengeluaran, dan Saldo Bersih bulan ini.
- Filter periode: Minggu ini, Bulan ini, 3 Bulan terakhir.

---

## 5. Spesifikasi Fitur

### 5.1 Modul Otomatisasi (Backend)

| Fitur | Deskripsi | Prioritas |
|-------|-----------|-----------|
| Gmail Polling | Polling Gmail API setiap 5 menit untuk email SeaBank baru | P0 |
| Email Parser | Regex extractor untuk nominal, tanggal, jenis, merchant | P0 |
| Deduplication | Cek via Gmail Message ID sebelum menyimpan | P0 |
| Google Sheets Writer | Simpan baris transaksi baru ke sheet | P0 |
| Error Logging | Log email yang gagal diparse ke sheet terpisah | P1 |
| Auto-Kategorisasi | Rule-based kategori otomatis berdasarkan keyword merchant | P2 |

### 5.2 Modul Frontend (Flutter)

| Fitur | Deskripsi | Prioritas |
|-------|-----------|-----------|
| Halaman Beranda | Ringkasan balance + daftar transaksi terbaru | P0 |
| Dashboard Grafik | Chart pengeluaran bulanan dan breakdown kategori | P0 |
| Daftar Transaksi | List lengkap dengan filter dan pencarian | P0 |
| Edit Kategori | Modal/bottom sheet untuk ubah kategori transaksi | P0 |
| Input Manual | Form tambah transaksi cash | P0 |
| Detail Transaksi | Halaman detail dengan semua field transaksi | P1 |
| Filter & Pencarian | Filter berdasarkan periode, kategori, dan jenis | P1 |

### 5.3 Infrastruktur

| Komponen | Teknologi | Keterangan |
|----------|-----------|------------|
| Frontend | Flutter 3.x | Mobile (Android + iOS) |
| Backend | Node.js + Express | REST API server lokal |
| Database | Google Sheets API v4 | Free tier, max 10MB/sheet |
| Email Source | Gmail API | OAuth 2.0, read-only scope |
| Desain | Figma | Design system & prototyping |

---

## 6. Batasan MVP

### Yang Ada di MVP v1.0

- Otomatisasi parsing email SeaBank (jenis: Transfer, Pembayaran QRIS, Dana Masuk)
- Kerangka parser modular untuk mendukung bank lain jika memungkinkan (contoh: BCA)
- CRUD transaksi manual (Create + Read + Update kategori)
- Dashboard dengan 2 jenis grafik (bar + pie)
- Filter transaksi berdasarkan bulan dan bank/rekening
- Aplikasi Flutter untuk Android

### Yang Tidak Ada di MVP v1.0

- iOS build (bisa dikembangkan setelah MVP)
- Notifikasi push lokal
- Mode offline dengan local database
- Ekspor data

---

## 7. Asumsi & Risiko

### 7.1 Asumsi

- Pengguna memiliki akun Gmail aktif yang menerima notifikasi SeaBank.
- Format email notifikasi SeaBank relatif konsisten dan dapat diparsing dengan Regex.
- Google Sheets API free tier (cukup untuk penggunaan pribadi).
- Backend dijalankan secara lokal di komputer pengguna (bukan cloud deployment).

### 7.2 Risiko

| Risiko | Dampak | Mitigasi |
|--------|--------|----------|
| SeaBank mengubah format email notifikasi | Parsing gagal | Implementasi error logging + alert manual |
| Gmail API rate limit terlampaui | Polling terhenti | Gunakan exponential backoff + kurangi frekuensi polling |
| Google Sheets melebihi kapasitas | Data tidak tersimpan | Monitor jumlah baris, arsip data lama |
| Token OAuth kadaluarsa | API calls gagal | Implementasi auto-refresh token |

---

## 8. Indikator Kesuksesan

| KPI | Target | Cara Mengukur |
|-----|--------|---------------|
| Akurasi Parsing Email | ≥ 95% | (Parsed / Total Email SeaBank) × 100 |
| Waktu Proses Email | < 5 menit | Timestamp email vs timestamp di Sheets |
| Load Time Beranda | < 3 detik | Waktu dari launch sampai data tampil |
| Uptime Backend | ≥ 99% (saat PC menyala) | Log monitoring |
| Kepuasan Pengguna (Diri Sendiri) | Digunakan setiap hari | Frekuensi buka aplikasi |

---

## 9. Roadmap Rilis

| Fase | Milestone | Estimasi Durasi |
|------|-----------|-----------------|
| Phase 1 | Setup project + autentikasi Google API | Minggu 1 |
| Phase 2 | Backend: Gmail polling + parser | Minggu 2 |
| Phase 3 | Backend: Google Sheets integration | Minggu 3 |
| Phase 4 | Flutter: UI + koneksi ke backend | Minggu 4–5 |
| Phase 5 | Testing, bug fix, dan polish | Minggu 6 |

---

*Dokumen ini adalah living document dan akan diperbarui seiring perkembangan proyek.*
