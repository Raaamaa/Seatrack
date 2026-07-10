import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:seatrack_app/app.dart';
import 'package:seatrack_app/providers/transaction_provider.dart';
import 'package:seatrack_app/providers/dashboard_provider.dart';

void main() {
  testWidgets('SeaTrackApp smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => TransactionProvider()),
          ChangeNotifierProvider(create: (_) => DashboardProvider()),
        ],
        child: const SeaTrackApp(),
      ),
    );

    // Verify that the navigation elements are present
    expect(find.byType(NavigationBar), findsOneWidget);
    expect(find.text('Beranda'), findsOneWidget);
    expect(find.text('Dashboard'), findsOneWidget);
    expect(find.text('Transaksi'), findsOneWidget);
  });
}
