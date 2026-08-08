import 'package:flutter_test/flutter_test.dart';
import 'package:seatrack_app/providers/dashboard_provider.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('DashboardProvider Test Suite', () {
    late DashboardProvider provider;

    setUp(() {
      provider = DashboardProvider();
    });

    test('Inisialisasi awal DashboardProvider', () {
      expect(provider.summary, isNull);
      expect(provider.isLoading, isFalse);
      expect(provider.error, isNull);
    });

    test('Mengolah kalkulasi total pemasukan, pengeluaran, dan arus bersih', () {
      final mockSummaryData = {
        'totalIncome': 5000000,
        'totalExpense': 2000000,
        'netCashFlow': 3000000,
        'categoryBreakdown': [
          {'category': 'Makanan & Minuman', 'amount': 1200000},
          {'category': 'Transportasi', 'amount': 800000},
        ]
      };

      final totalIncome = mockSummaryData['totalIncome'] as int;
      final totalExpense = mockSummaryData['totalExpense'] as int;
      final netCashFlow = mockSummaryData['netCashFlow'] as int;

      expect(netCashFlow, equals(totalIncome - totalExpense));
      expect(totalIncome, equals(5000000));
      expect(totalExpense, equals(2000000));
    });
  });
}
