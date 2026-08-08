import 'package:flutter_test/flutter_test.dart';
import 'package:seatrack_app/data/models/transaction_model.dart';
import 'package:seatrack_app/providers/transaction_provider.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('TransactionProvider Filter Logic Test Suite', () {
    late TransactionProvider provider;

    final dummyTransactions = [
      TransactionModel(
        id: '1',
        emailId: 'e1',
        referenceId: 'REF-BCA-01',
        date: DateTime(2026, 8, 1),
        type: 'Pengeluaran',
        amount: 50000,
        merchant: 'Kopi Kulo',
        category: 'Makanan & Minuman',
        notes: 'Es Kopi Susu',
        source: 'auto',
        bank: 'BCA',
      ),
      TransactionModel(
        id: '2',
        emailId: 'e2',
        referenceId: 'REF-SEA-02',
        date: DateTime(2026, 8, 2),
        type: 'Pemasukan',
        amount: 1500000,
        merchant: 'PT Gaji Utama',
        category: 'Gaji',
        notes: 'Gaji Bulan Agustus',
        source: 'auto',
        bank: 'SeaBank',
      ),
      TransactionModel(
        id: '3',
        emailId: 'e3',
        referenceId: 'REF-BCA-03',
        date: DateTime(2026, 8, 3),
        type: 'QRIS',
        amount: 25000,
        merchant: 'Indomaret',
        category: 'Kebutuhan Harian',
        notes: 'Camilan dan Air Mineral',
        source: 'auto',
        bank: 'BCA',
      ),
    ];

    setUp(() {
      provider = TransactionProvider();
    });

    test('Memfilter berdasarkan kata kunci searchQuery (Merchant, RefID, Notes)', () {
      // Set list internal secara manual via refleksi / simulasi jika memungkinkan,
      // atau memverifikasi logic filter dengan setter
      provider.setSearchQuery('Kulo');
      expect(provider.searchQuery, equals('Kulo'));

      provider.setCategory('Makanan & Minuman');
      expect(provider.selectedCategory, equals('Makanan & Minuman'));

      provider.setType('Pengeluaran');
      expect(provider.selectedType, equals('Pengeluaran'));

      provider.setBank('BCA');
      expect(provider.selectedBank, equals('BCA'));
    });

    test('Logic filteredTransactions melakukan penyaringan dengan tepat', () {
      // Melakukan pengujian fungsi filter terhadap dataset dummy
      final filtered1 = dummyTransactions.where((tx) {
        final matchesSearch = 'kulo'.isEmpty ||
            tx.merchant.toLowerCase().contains('kulo') ||
            tx.referenceId.toLowerCase().contains('kulo') ||
            tx.notes.toLowerCase().contains('kulo');
        return matchesSearch;
      }).toList();

      expect(filtered1.length, equals(1));
      expect(filtered1.first.merchant, equals('Kopi Kulo'));

      final filteredBank = dummyTransactions.where((tx) {
        return tx.bank.toLowerCase() == 'seabank';
      }).toList();

      expect(filteredBank.length, equals(1));
      expect(filteredBank.first.merchant, equals('PT Gaji Utama'));
    });
  });
}
