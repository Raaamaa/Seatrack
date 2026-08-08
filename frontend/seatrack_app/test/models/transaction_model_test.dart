import 'package:flutter_test/flutter_test.dart';
import 'package:seatrack_app/data/models/transaction_model.dart';

void main() {
  group('TransactionModel.fromJson Test Suite', () {
    test('Mem-parse data JSON valid dan lengkap dengan benar', () {
      final json = {
        'id': 'TXN-1001',
        'emailId': 'MSG-12345',
        'referenceId': 'REF-998877',
        'date': '2026-08-08T09:00:00.000Z',
        'type': 'Transfer Masuk',
        'amount': 250000,
        'merchant': 'Budi Santoso',
        'category': 'Transfer',
        'notes': 'Pembayaran piutang',
        'source': 'auto',
        'bank': 'BCA',
      };

      final model = TransactionModel.fromJson(json);

      expect(model.id, equals('TXN-1001'));
      expect(model.emailId, equals('MSG-12345'));
      expect(model.referenceId, equals('REF-998877'));
      expect(model.type, equals('Transfer Masuk'));
      expect(model.amount, equals(250000));
      expect(model.merchant, equals('Budi Santoso'));
      expect(model.category, equals('Transfer'));
      expect(model.notes, equals('Pembayaran piutang'));
      expect(model.source, equals('auto'));
      expect(model.bank, equals('BCA'));
      expect(model.isIncome, isTrue);
      expect(model.isPendingSync, isFalse);
    });

    test('Menangani field null dan memberikan nilai default yang aman', () {
      final json = <String, dynamic>{
        'id': null,
        'amount': null,
        'category': null,
        'date': null,
      };

      final model = TransactionModel.fromJson(json);

      expect(model.id, equals(''));
      expect(model.amount, equals(0));
      expect(model.category, equals('Lainnya'));
      expect(model.source, equals('auto'));
      expect(model.bank, equals('Unknown'));
      expect(model.date, isA<DateTime>());
    });

    test('Mendukung amount dalam bentuk integer maupun string angka', () {
      final jsonInt = {'amount': 150000};
      final jsonString = {'amount': '150000'};
      final jsonInvalid = {'amount': 'bukan_angka'};

      final model1 = TransactionModel.fromJson(jsonInt);
      final model2 = TransactionModel.fromJson(jsonString);
      final model3 = TransactionModel.fromJson(jsonInvalid);

      expect(model1.amount, equals(150000));
      expect(model2.amount, equals(150000));
      expect(model3.amount, equals(0));
    });

    test('Mendeteksi isPendingSync untuk transaksi lokal yang pending', () {
      final jsonPending = {
        'id': 'pending-1723100000000',
        'source': 'pending_sync',
      };

      final model = TransactionModel.fromJson(jsonPending);

      expect(model.isPendingSync, isTrue);
    });

    test('Mengonversi model kembali ke Map JSON dengan toJson()', () {
      final now = DateTime.now();
      final model = TransactionModel(
        id: 'TXN-001',
        emailId: 'MSG-001',
        referenceId: 'REF-001',
        date: now,
        type: 'Pengeluaran',
        amount: 50000,
        merchant: 'Kopi Kulo',
        category: 'Makanan & Minuman',
        notes: 'Kopi',
        source: 'manual',
        bank: 'SeaBank',
      );

      final json = model.toJson();

      expect(json['id'], equals('TXN-001'));
      expect(json['amount'], equals(50000));
      expect(json['category'], equals('Makanan & Minuman'));
      expect(json['date'], equals(now.toIso8601String()));
    });
  });
}
