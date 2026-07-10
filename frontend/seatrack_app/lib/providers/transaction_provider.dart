// lib/providers/transaction_provider.dart
import 'package:flutter/material.dart';
import '../data/models/transaction_model.dart';
import '../core/network/api_client.dart';

class TransactionProvider extends ChangeNotifier {
  List<TransactionModel> _transactions = [];
  bool _isLoading = false;
  String? _error;

  List<TransactionModel> get transactions => _transactions;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> fetchTransactions({int? month, int? year, String? bank}) async {
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
      
      final response = await ApiClient.get('/transactions', queryParams: queryParams);
      _transactions = (response['data'] as List)
          .map((json) => TransactionModel.fromJson(json))
          .toList();
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> addManualTransaction(Map<String, dynamic> data) async {
    await ApiClient.post('/transactions', data);
    await fetchTransactions();
  }

  Future<void> updateCategory(String transactionId, String newCategory) async {
    await ApiClient.patch('/transactions/$transactionId/category', {'category': newCategory});
    final index = _transactions.indexWhere((t) => t.id == transactionId);
    if (index != -1) {
      // Optimistic update
      final oldTx = _transactions[index];
      _transactions[index] = TransactionModel(
        id: oldTx.id,
        emailId: oldTx.emailId,
        referenceId: oldTx.referenceId,
        date: oldTx.date,
        type: oldTx.type,
        amount: oldTx.amount,
        merchant: oldTx.merchant,
        category: newCategory,
        notes: oldTx.notes,
        source: oldTx.source,
        bank: oldTx.bank,
      );
      notifyListeners();
    }
  }

  Future<void> syncEmails() async {
    await ApiClient.post('/transactions/sync', {});
    await fetchTransactions();
  }
}
