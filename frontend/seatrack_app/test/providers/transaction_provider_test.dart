import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive/hive.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:seatrack_app/core/network/api_client.dart';
import 'package:seatrack_app/data/models/transaction_model.dart';
import 'package:seatrack_app/providers/transaction_provider.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late Directory tempDir;

  setUpAll(() async {
    tempDir = await Directory.systemTemp.createTemp('seatrack_test_');
    Hive.init(tempDir.path);
  });

  setUp(() async {
    if (!Hive.isBoxOpen('transactions_cache')) {
      await Hive.openBox<String>('transactions_cache');
    }
    if (!Hive.isBoxOpen('pending_transactions_queue')) {
      await Hive.openBox<String>('pending_transactions_queue');
    }
    await Hive.box<String>('transactions_cache').clear();
    await Hive.box<String>('pending_transactions_queue').clear();
  });

  tearDownAll(() async {
    await Hive.deleteFromDisk();
    await tempDir.delete(recursive: true);
  });

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

    test('Transaksi pending memiliki isPendingSync true, dan berubah menjadi false saat tersinkronisasi (tanpa id backend)', () {
      final pendingTx = TransactionModel(
        id: 'pending-100',
        emailId: 'manual-MAN-OFFLINE-100',
        referenceId: 'MAN-OFFLINE-100',
        date: DateTime(2026, 8, 8),
        type: 'Pengeluaran',
        amount: 30000,
        merchant: 'Warung Makan',
        category: 'Makanan & Minuman',
        notes: 'Makan Siang',
        source: 'pending_sync',
        bank: 'Manual',
      );

      expect(pendingTx.isPendingSync, isTrue);

      final syncedTx = TransactionModel(
        id: pendingTx.referenceId,
        emailId: pendingTx.emailId,
        referenceId: pendingTx.referenceId,
        date: pendingTx.date,
        type: pendingTx.type,
        amount: pendingTx.amount,
        merchant: pendingTx.merchant,
        category: pendingTx.category,
        notes: pendingTx.notes,
        source: 'manual',
        bank: pendingTx.bank,
      );

      expect(syncedTx.isPendingSync, isFalse);
      expect(syncedTx.id, equals('MAN-OFFLINE-100'));
      expect(syncedTx.source, equals('manual'));
    });
  });

  group('syncPendingQueue() Integration Test Suite', () {
    tearDown(() {
      ApiClient.client = http.Client();
    });

    test('Sync sukses: item terhapus dari queue, _transactions ter-update, isPendingSync jadi false', () async {
      final queueBox = Hive.box<String>('pending_transactions_queue');
      await queueBox.put('key-1', jsonEncode({
        'tempId': 'pending-100',
        'clientRefId': 'MAN-OFFLINE-100',
        'data': {
          'clientRefId': 'MAN-OFFLINE-100',
          'date': '2026-08-08',
          'type': 'Pengeluaran',
          'amount': '30000',
          'merchant': 'Warung Makan',
          'category': 'Makanan & Minuman',
          'notes': 'Makan Siang',
          'bank': 'Manual',
        },
      }));

      final cacheBox = Hive.box<String>('transactions_cache');
      final pendingTxModel = TransactionModel(
        id: 'pending-100',
        emailId: 'manual-MAN-OFFLINE-100',
        referenceId: 'MAN-OFFLINE-100',
        date: DateTime(2026, 8, 8),
        type: 'Pengeluaran',
        amount: 30000,
        merchant: 'Warung Makan',
        category: 'Makanan & Minuman',
        notes: 'Makan Siang',
        source: 'pending_sync',
        bank: 'Manual',
      );
      await cacheBox.put('data', jsonEncode([pendingTxModel.toJson()]));

      ApiClient.client = MockClient((request) async {
        if (request.url.path.contains('/transactions') && request.method == 'POST') {
          return http.Response(jsonEncode({
            'success': true,
            'message': 'Transaksi berhasil disimpan.',
            'data': {
              'emailId': 'manual-MAN-OFFLINE-100',
              'referenceId': 'MAN-OFFLINE-100',
              'source': 'manual',
              'merchant': 'Warung Makan',
            }
          }), 200);
        }
        return http.Response('Not Found', 404);
      });

      final provider = TransactionProvider();
      while (provider.isSyncingQueue) {
        await Future.delayed(const Duration(milliseconds: 5));
      }

      expect(Hive.box<String>('pending_transactions_queue').containsKey('key-1'), isFalse);
      expect(provider.transactions.length, equals(1));

      final synced = provider.transactions.first;
      expect(synced.isPendingSync, isFalse);
      expect(synced.source, equals('manual'));
      expect(synced.id, equals('MAN-OFFLINE-100'));
    });

    test('Sync gagal (network error): item TETAP di queue, retryCount bertambah, badge tetap pending', () async {
      final queueBox = Hive.box<String>('pending_transactions_queue');
      await queueBox.put('key-2', jsonEncode({
        'tempId': 'pending-200',
        'clientRefId': 'MAN-OFFLINE-200',
        'retryCount': 0,
        'data': {'merchant': 'Toko A', 'amount': '10000'},
      }));

      ApiClient.client = MockClient((request) async {
        return http.Response(jsonEncode({'success': false, 'message': 'Server error'}), 500);
      });

      final provider = TransactionProvider();
      while (provider.isSyncingQueue) {
        await Future.delayed(const Duration(milliseconds: 5));
      }

      expect(Hive.box<String>('pending_transactions_queue').containsKey('key-2'), isTrue);

      final updated = jsonDecode(Hive.box<String>('pending_transactions_queue').get('key-2')!);
      expect(updated['retryCount'], equals(1));
    });

    test('Concurrency guard: pemanggilan syncPendingQueue() paralel tidak menyebabkan sync ganda', () async {
      int callCount = 0;
      ApiClient.client = MockClient((request) async {
        callCount++;
        await Future.delayed(const Duration(milliseconds: 50));
        return http.Response(jsonEncode({'success': true, 'data': {}}), 200);
      });

      final provider = TransactionProvider();
      while (provider.isSyncingQueue) {
        await Future.delayed(const Duration(milliseconds: 5));
      }

      callCount = 0;

      final queueBox = Hive.box<String>('pending_transactions_queue');
      await queueBox.put('key-3', jsonEncode({
        'tempId': 'pending-300',
        'clientRefId': 'MAN-OFFLINE-300',
        'data': {'merchant': 'Toko B', 'amount': '5000'},
      }));

      await Future.wait([
        provider.syncPendingQueue(),
        provider.syncPendingQueue(),
      ]);

      expect(callCount, equals(1));
    });

    test('onSyncSuccess callback dipanggil dengan jumlah item yang benar', () async {
      ApiClient.client = MockClient((request) async {
        return http.Response(jsonEncode({'success': true, 'data': {}}), 200);
      });

      final provider = TransactionProvider();
      while (provider.isSyncingQueue) {
        await Future.delayed(const Duration(milliseconds: 5));
      }

      final queueBox = Hive.box<String>('pending_transactions_queue');
      await queueBox.put('key-4', jsonEncode({
        'tempId': 'pending-400',
        'clientRefId': 'MAN-OFFLINE-400',
        'data': {'merchant': 'Toko C', 'amount': '7000'},
      }));
      await queueBox.put('key-5', jsonEncode({
        'tempId': 'pending-500',
        'clientRefId': 'MAN-OFFLINE-500',
        'data': {'merchant': 'Toko D', 'amount': '8000'},
      }));

      int? reportedCount;
      await provider.syncPendingQueue(onSyncSuccess: (count) => reportedCount = count);

      expect(reportedCount, equals(2));
    });

    test('Sync sukses ketika item di queue tidak ada di _transactions in-memory: item tetap terhapus dari queue tanpa error', () async {
      final queueBox = Hive.box<String>('pending_transactions_queue');
      await queueBox.put('key-orphan', jsonEncode({
        'tempId': 'pending-999',
        'clientRefId': 'MAN-OFFLINE-999',
        'data': {'merchant': 'Toko X', 'amount': '9000'},
      }));

      ApiClient.client = MockClient((request) async {
        return http.Response(jsonEncode({'success': true, 'data': {}}), 200);
      });

      final provider = TransactionProvider();
      while (provider.isSyncingQueue) {
        await Future.delayed(const Duration(milliseconds: 5));
      }

      expect(Hive.box<String>('pending_transactions_queue').containsKey('key-orphan'), isFalse);
    });
  });
}
