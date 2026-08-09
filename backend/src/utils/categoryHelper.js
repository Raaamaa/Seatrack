// backend/src/utils/categoryHelper.js

/**
 * Categorize transaction automatically based on transaction type and merchant name.
 * @param {string} type - Transaction type ('Transfer Masuk', 'Transfer Keluar', 'QRIS', 'Tarik Tunai', etc.)
 * @param {string} merchant - Merchant or counterparty name
 * @returns {string} - Assigned category ('Pemasukan', 'Transportasi', 'Belanja', 'Tagihan & Utilitas', 'Makanan & Minuman', 'Lainnya')
 */
function autoAssignCategory(type, merchant) {
  const m = (merchant || '').toLowerCase();

  if (type === 'Transfer Masuk') return 'Pemasukan';
  if (type === 'Tarik Tunai') return 'Lainnya';

  // 1. Generic Payment Rail Check (MUST BE CHECKED FIRST before e-commerce/retail)
  const paymentRails = ['shopeepay', 'gopay', 'ovo', 'dana', 'linkaja', 'bayar instan'];
  if (paymentRails.some(rail => m.includes(rail))) {
    return 'Lainnya';
  }

  // 2. Transportasi
  if (m.includes('gojek') || m.includes('grab') || m.includes('maxim')) {
    return 'Transportasi';
  }

  // 3. Belanja (E-Commerce & Retail)
  if (m.includes('indomaret') || m.includes('alfamart') || m.includes('shopee') || m.includes('tokopedia')) {
    return 'Belanja';
  }

  // 4. Tagihan & Utilitas
  if (m.includes('pln') || m.includes('telkom') || m.includes('indihome') || m.includes('bpjs')) {
    return 'Tagihan & Utilitas';
  }

  // 5. Makanan & Minuman (Specific brands + Generic restaurant terms)
  if (m.includes('kfc') || m.includes('mcdonalds') || m.includes('starbucks') || m.includes('warteg') ||
      m.includes('warung') || m.includes('rumah makan') || m.includes('kedai')) {
    return 'Makanan & Minuman';
  }

  if (type === 'QRIS') return 'Belanja';
  return 'Lainnya';
}

module.exports = { autoAssignCategory };
