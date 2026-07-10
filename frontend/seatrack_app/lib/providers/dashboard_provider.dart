// lib/providers/dashboard_provider.dart
import 'package:flutter/material.dart';
import '../core/network/api_client.dart';

class DashboardProvider extends ChangeNotifier {
  Map<String, dynamic>? _summary;
  bool _isLoading = false;
  String? _error;

  Map<String, dynamic>? get summary => _summary;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> fetchSummary({int? month, int? year, String? bank}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final now = DateTime.now();
      final queryParams = {
        'month': '${month ?? now.month}',
        'year': '${year ?? now.year}',
      };
      if (bank != null && bank != 'Semua') {
        queryParams['bank'] = bank;
      }
      final response = await ApiClient.get('/dashboard/summary', queryParams: queryParams);
      _summary = response['data'];
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
