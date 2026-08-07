// lib/providers/transaction_provider.dart
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:hive_flutter/hive_flutter.dart';
import '../data/models/transaction_model.dart';
import '../core/network/api_client.dart';

class TransactionProvider extends ChangeNotifier {
  List<TransactionModel> _transactions = [];
  bool _isLoading = false;
  String? _error;

  String _searchQuery = '';
  String _selectedCategory = 'Semua';
  String _selectedType = 'Semua';
  String _selectedBank = 'Semua';

  List<TransactionModel> get transactions => _transactions;
  bool get isLoading => _isLoading;
  String? get error => _error;

  String get searchQuery => _searchQuery;
  String get selectedCategory => _selectedCategory;
  String get selectedType => _selectedType;
  String get selectedBank => _selectedBank;

  void setSearchQuery(String query) {
    _searchQuery = query;
    notifyListeners();
  }

  void setCategory(String category) {
    _selectedCategory = category;
    notifyListeners();
  }

  void setType(String type) {
    _selectedType = type;
    notifyListeners();
  }

  void setBank(String bank) {
    _selectedBank = bank;
    notifyListeners();
  }

  List<TransactionModel> get filteredTransactions {
    return _transactions.where((tx) {
      final matchesSearch = _searchQuery.isEmpty ||
          tx.merchant.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          tx.referenceId.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          tx.notes.toLowerCase().contains(_searchQuery.toLowerCase());

      final matchesCategory = _selectedCategory == 'Semua' || tx.category == _selectedCategory;
      final matchesType = _selectedType == 'Semua' || tx.type == _selectedType;
      final matchesBank = _selectedBank == 'Semua' || tx.bank.toLowerCase() == _selectedBank.toLowerCase();

      return matchesSearch && matchesCategory && matchesType && matchesBank;
    }).toList();
  }

  TransactionProvider() {
    _loadFromCache();
  }

  void _loadFromCache() {
    try {
      final box = Hive.box<String>('transactions_cache');
      final cachedJson = box.get('data');
      if (cachedJson != null) {
        final List<dynamic> list = jsonDecode(cachedJson);
        _transactions = list.map((j) => TransactionModel.fromJson(j)).toList();
      }
    } catch (_) {
      // Ignore cache read errors
    }
  }

  void _saveToCache(List<TransactionModel> list) {
    try {
      final box = Hive.box<String>('transactions_cache');
      final jsonStr = jsonEncode(list.map((t) => t.toJson()).toList());
      box.put('data', jsonStr);
    } catch (_) {
      // Ignore cache write errors
    }
  }

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
      final List rawList = response['data'] as List;
      _transactions = rawList.map((json) => TransactionModel.fromJson(json)).toList();

      // Server-Wins: Update local Hive cache with clean server data
      _saveToCache(_transactions);
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      // Fallback to local cache if offline
      if (_transactions.isEmpty) {
        _loadFromCache();
      }
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
      _saveToCache(_transactions);
      notifyListeners();
    }
  }

  Future<void> syncEmails() async {
    await ApiClient.post('/transactions/sync', {});
    await fetchTransactions();
  }
}
