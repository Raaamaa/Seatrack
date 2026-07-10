# DESIGN SYSTEM — SeaTrack
## Spesifikasi Visual untuk Implementasi Flutter

**Versi:** 1.0.0  
**Framework Target:** Flutter 3.x + Material Design 3  
**Prinsip Desain:** Bersih, Tepercaya, Efisien — estetika finansial modern yang tidak terasa dingin.

---

## 1. Fondasi Visual

### 1.1 Filosofi Desain

SeaTrack mengadopsi estetika **"Calm Finance"** — tampilan yang menenangkan, tidak menimbulkan kecemasan saat melihat angka, namun tetap memberikan kejelasan informasi secara instan. Inspirasinya adalah perpaduan antara antarmuka perbankan modern (kepercayaan) dan aplikasi produktivitas minimalis (efisiensi).

**Prinsip utama:**
- **Kejelasan di atas dekorasi** — setiap elemen visual memiliki fungsi
- **Hierarki visual yang kuat** — pengguna tahu mana yang paling penting dalam 3 detik
- **Konsistensi absolut** — warna, ukuran, dan spacing tidak berubah secara sembarangan
- **Affordance yang jelas** — elemen interaktif terlihat bisa diklik

---

## 2. Palet Warna

### 2.1 Warna Utama (Primary)

```dart
// Gunakan di AppColors
static const Color primary         = Color(0xFF1A73E8);  // Google Blue — kepercayaan
static const Color primaryDark     = Color(0xFF1557B0);  // Hover/pressed state
static const Color primaryLight    = Color(0xFFE8F0FE);  // Background chip/badge
```

**Penggunaan:** Tombol utama (CTA), ikon aktif navigasi, highlight, link.

### 2.2 Warna Semantik

Warna ini memiliki makna yang langsung dipahami secara intuitif oleh pengguna:

```dart
static const Color income          = Color(0xFF0D9F6E);  // Hijau — pemasukan/positif
static const Color incomeLight     = Color(0xFFE6F6F1);  // Background badge pemasukan
static const Color expense         = Color(0xFFE53E3E);  // Merah — pengeluaran/negatif
static const Color expenseLight    = Color(0xFFFFF5F5);  // Background badge pengeluaran
static const Color transfer        = Color(0xFF805AD5);  // Ungu — transfer antar rekening
static const Color transferLight   = Color(0xFFF3EFFE);  // Background badge transfer
static const Color qris            = Color(0xFFDD6B20);  // Oranye — pembayaran QRIS
static const Color qrisLight       = Color(0xFFFFF3E4);  // Background badge QRIS
```

**Aturan penggunaan semantik:**
- Tampilkan nominal pemasukan dengan warna `income` dan tanda `+`
- Tampilkan nominal pengeluaran dengan warna `expense` dan tanda `-`
- Jangan gunakan warna semantik untuk dekorasi non-fungsional

### 2.3 Warna Netral

```dart
static const Color background      = Color(0xFFF7F8FC);  // Background seluruh app
static const Color surface         = Color(0xFFFFFFFF);  // Card, bottom sheet, dialog
static const Color surfaceVariant  = Color(0xFFF1F3F9);  // Input field background
static const Color textPrimary     = Color(0xFF1A202C);  // Judul, label penting
static const Color textSecondary   = Color(0xFF718096);  // Subtitle, placeholder
static const Color textTertiary    = Color(0xFFA0AEC0);  // Timestamp, hint
static const Color divider         = Color(0xFFE2E8F0);  // Garis pemisah list
static const Color border          = Color(0xFFCBD5E0);  // Border input, card outline
```

### 2.4 Warna Grafik (Chart Colors)

Gunakan palet ini untuk pie chart kategori agar mudah dibedakan:

```dart
static const List<Color> chartColors = [
  Color(0xFF1A73E8),  // Makanan — Biru
  Color(0xFF0D9F6E),  // Transportasi — Hijau
  Color(0xFFDD6B20),  // Belanja — Oranye
  Color(0xFF805AD5),  // Hiburan — Ungu
  Color(0xFFE53E3E),  // Tagihan — Merah
  Color(0xFF2B6CB0),  // Kesehatan — Biru Tua
  Color(0xFF38A169),  // Tabungan — Hijau Tua
  Color(0xFFA0AEC0),  // Lainnya — Abu-abu
];
```

---

## 3. Tipografi

### 3.1 Font Family

SeaTrack menggunakan dua Google Fonts yang saling melengkapi:

| Peran | Font | Karakteristik |
|-------|------|---------------|
| **Display / Heading** | Plus Jakarta Sans | Geometris, modern, berkarakter — cocok untuk angka dan judul |
| **Body / UI** | Inter | Sangat readable, netral, profesional — standar industri fintech |

```yaml
# Tambahkan ke pubspec.yaml
dependencies:
  google_fonts: ^6.2.1
```

### 3.2 Type Scale

| Token | Font | Size | Weight | Line Height | Penggunaan |
|-------|------|------|--------|-------------|------------|
| `heading1` | Plus Jakarta Sans | 24px | 700 | 1.3 | Judul halaman |
| `heading2` | Plus Jakarta Sans | 20px | 700 | 1.3 | Judul section / card |
| `heading3` | Plus Jakarta Sans | 18px | 600 | 1.4 | Sub-section |
| `amountXL` | Plus Jakarta Sans | 32px | 700 | 1.2 | Total balance utama |
| `amountLg` | Plus Jakarta Sans | 24px | 700 | 1.2 | Balance secondary |
| `amountMd` | Plus Jakarta Sans | 16px | 600 | 1.3 | Nominal di list transaksi |
| `bodyLg` | Inter | 16px | 400 | 1.5 | Teks body utama |
| `bodyMd` | Inter | 14px | 400 | 1.5 | Teks deskripsi, subtitle |
| `bodySm` | Inter | 12px | 400 | 1.5 | Label chip, timestamp |
| `labelMd` | Inter | 12px | 500 | 1.4 | Label form, badge |
| `labelLg` | Inter | 14px | 500 | 1.4 | Tombol, tab label |

```dart
// Implementasi di Flutter
static TextStyle get heading1 => GoogleFonts.plusJakartaSans(
  fontSize: 24, fontWeight: FontWeight.w700,
  color: AppColors.textPrimary, height: 1.3);

static TextStyle get amountXL => GoogleFonts.plusJakartaSans(
  fontSize: 32, fontWeight: FontWeight.w700,
  color: AppColors.textPrimary, height: 1.2);
```

---

## 4. Spacing & Layout

### 4.1 Grid & Margin

SeaTrack menggunakan grid **8dp base unit** — semua spacing adalah kelipatan 4 atau 8:

```dart
class AppSpacing {
  static const double xs  = 4.0;   // Jarak minimal (chip gap)
  static const double sm  = 8.0;   // Padding kecil
  static const double md  = 12.0;  // Gap antar elemen related
  static const double lg  = 16.0;  // Padding card, padding horizontal screen
  static const double xl  = 20.0;  // Gap antar section
  static const double xxl = 24.0;  // Padding section besar
  static const double xxxl = 32.0; // Margin antar blok utama
}
```

**Aturan layout:**
- Margin horizontal kiri-kanan layar: **16dp** (`AppSpacing.lg`)
- Padding dalam card: **16dp** semua sisi
- Gap antar card dalam list: **8dp**
- Gap antar elemen dalam satu card: **12dp**

### 4.2 Border Radius

```dart
class AppRadius {
  static const double sm  = 8.0;   // Input field, chip kecil
  static const double md  = 12.0;  // Card kecil, tag
  static const double lg  = 16.0;  // Card utama, bottom sheet
  static const double xl  = 20.0;  // Card hero (balance card)
  static const double full = 100.0; // Tombol pill, avatar
}
```

### 4.3 Elevation & Shadow

Gunakan shadow secara minimal — hanya untuk elemen yang perlu "terangkat":

```dart
// Shadow untuk card biasa
BoxShadow(color: Color(0x0A000000), blurRadius: 8, offset: Offset(0, 2))

// Shadow untuk FAB / bottom sheet
BoxShadow(color: Color(0x14000000), blurRadius: 20, offset: Offset(0, 4))

// No shadow — untuk elemen flat (list item dengan divider)
```

---

## 5. Komponen UI

### 5.1 Balance Card (Hero Component)

**Lokasi:** Bagian atas `HomeScreen`  
**Tujuan:** Menampilkan ringkasan saldo bulan ini

```
┌─────────────────────────────────────┐
│  Pengeluaran Bulan Ini              │
│  Rp 2.450.000                       │  ← amountXL, textPrimary
│                                     │
│  ┌─────────────┐ ┌─────────────┐   │
│  │ ↑ Rp 5.2jt  │ │ ↓ Rp 2.7jt │   │
│  │ Pemasukan   │ │ Pengeluaran │   │
│  └─────────────┘ └─────────────┘   │
└─────────────────────────────────────┘
```

**Spesifikasi:**
- Background: gradient `primary → primaryDark` (sudut 135°)
- Teks: semua putih
- Border radius: `AppRadius.xl` (20dp)
- Padding: 20dp
- Shadow: medium shadow

### 5.2 Transaction Tile (List Item)

**Digunakan di:** HomeScreen (recent), TransactionsScreen  
**Anatomi:**

```
┌────────────────────────────────────────────────────┐
│ [ikon]  Nama Merchant / Deskripsi       +Rp 500.000│
│         Kategori · Jam 14:30                       │
└────────────────────────────────────────────────────┘
```

**Spesifikasi:**
- Height: 72dp
- Ikon container: 44×44dp, border radius 12, warna `typeLight`
- Ikon ukuran: 22dp, warna `type` (income/expense/transfer)
- Nama merchant: `bodyLg`, `textPrimary`, max 1 baris + ellipsis
- Kategori & waktu: `bodySm`, `textSecondary`
- Nominal: `amountMd`, `income` atau `expense` sesuai jenis
- Background: `surface`, no shadow
- Divider: `Divider(height: 1, color: AppColors.divider)`

### 5.3 Category Chip

**Digunakan di:** Filter list, badge pada TransactionTile  
**Spesifikasi:**
- Padding: 6dp vertikal, 10dp horizontal
- Border radius: `AppRadius.full` (pill shape)
- Background: `primaryLight` (ketika dipilih), `surfaceVariant` (tidak dipilih)
- Teks: `labelMd`, `primary` (dipilih), `textSecondary` (tidak dipilih)
- Border: 1px `border` (tidak dipilih), none (dipilih)

### 5.4 Primary Button

```dart
ElevatedButton(
  onPressed: () {},
  style: ElevatedButton.styleFrom(
    backgroundColor: AppColors.primary,
    foregroundColor: Colors.white,
    minimumSize: const Size.fromHeight(52),
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(AppRadius.lg)),
    elevation: 0,
  ),
  child: Text('Simpan Transaksi', style: AppTextStyles.labelLg),
)
```

### 5.5 Input Field

```dart
TextField(
  decoration: InputDecoration(
    filled: true,
    fillColor: AppColors.surfaceVariant,
    border: OutlineInputBorder(
      borderRadius: BorderRadius.circular(AppRadius.sm),
      borderSide: const BorderSide(color: AppColors.border, width: 1),
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(AppRadius.sm),
      borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
    ),
    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    labelStyle: AppTextStyles.bodyMd.copyWith(color: AppColors.textSecondary),
  ),
)
```

### 5.6 Bottom Sheet (Edit Kategori)

**Trigger:** Tap pada `TransactionTile`  
**Spesifikasi:**
- Background: `surface`
- Border radius atas: 20dp
- Handle bar: 4×40dp, warna `divider`, centered
- Padding dalam: 20dp
- Judul: `heading3`
- Grid kategori: 2 kolom, `Wrap` dengan spacing 8dp
- Setiap item kategori: `CategoryChip` style
- Tombol konfirmasi: `Primary Button` full-width

### 5.7 Empty State

Tampilkan saat tidak ada transaksi:

```
         [Ilustrasi SVG sederhana]
         Belum Ada Transaksi          ← heading2
         Transaksi dari email SeaBank  ← bodyMd, textSecondary
         akan muncul di sini.
         
         [Tombol Sync Manual]         ← Primary Button, 50% width
```

### 5.8 Loading Shimmer

Gunakan `shimmer` package untuk skeleton loading agar terasa native:

```dart
Shimmer.fromColors(
  baseColor: AppColors.shimmerBase,
  highlightColor: AppColors.shimmerHighlight,
  child: Container(
    height: 72,
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(AppRadius.md),
    ),
  ),
)
```

---

## 6. Ikon

Gunakan ikon dari `Icons` (Material Icons) yang sudah built-in di Flutter. Berikut mapping per jenis transaksi:

| Jenis Transaksi | Ikon Material | Warna |
|-----------------|---------------|-------|
| Transfer Masuk | `Icons.arrow_downward_rounded` | `income` |
| Transfer Keluar | `Icons.arrow_upward_rounded` | `expense` |
| QRIS | `Icons.qr_code_scanner` | `qris` |
| Tarik Tunai | `Icons.money_outlined` | `transfer` |
| Manual | `Icons.edit_outlined` | `textSecondary` |

**Ikon navigasi:**
- Beranda: `Icons.home_rounded` (aktif), `Icons.home_outlined` (tidak aktif)
- Dashboard: `Icons.bar_chart_rounded` (aktif), `Icons.bar_chart_outlined`
- Transaksi: `Icons.receipt_long_rounded` (aktif), `Icons.receipt_long_outlined`

---

## 7. Animasi & Transisi

SeaTrack menggunakan animasi yang subtle dan fungsional:

| Konteks | Jenis | Durasi |
|---------|-------|--------|
| Navigasi antar screen | `FadeTransition` | 250ms |
| Muncul bottom sheet | Slide up (default Material) | 300ms |
| Pull-to-refresh | Bawaan `RefreshIndicator` | — |
| Loading state → data | Shimmer fade out | 200ms |
| Tap feedback | `InkWell` ripple | Default |
| Nomor balance berubah | `AnimatedSwitcher` | 400ms |

**Kurva animasi:** Gunakan `Curves.easeInOut` untuk transisi halaman, `Curves.easeOut` untuk elemen yang muncul.

---

## 8. Design Tokens (Ringkasan Implementasi)

```dart
// lib/core/constants/design_tokens.dart
class DesignTokens {
  // Warna
  static const primaryColor = Color(0xFF1A73E8);
  static const incomeColor  = Color(0xFF0D9F6E);
  static const expenseColor = Color(0xFFE53E3E);

  // Spacing
  static const spacingSm = 8.0;
  static const spacingMd = 12.0;
  static const spacingLg = 16.0;
  static const spacingXl = 24.0;

  // Radius
  static const radiusSm = 8.0;
  static const radiusMd = 12.0;
  static const radiusLg = 16.0;
  static const radiusXl = 20.0;

  // Duration
  static const durationFast   = Duration(milliseconds: 200);
  static const durationNormal = Duration(milliseconds: 300);
  static const durationSlow   = Duration(milliseconds: 400);
}
```

---

*Design system ini adalah acuan. Konsistensi dalam implementasi lebih penting daripada kesempurnaan visual individual.*
