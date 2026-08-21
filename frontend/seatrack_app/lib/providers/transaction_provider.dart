// lib/providers/transaction_provider.dart
import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import '../data/models/transaction_model.dart';
import '../core/network/api_client.dart';

class TransactionProvider extends ChangeNotifier {
  List<TransactionModel> _transactions = [];
  bool _isLoading = false;
  String? _error;
  bool _isSyncingQueue = false;

  StreamSubscription<List<ConnectivityResult>>? _connectivitySubscription;

  String _searchQuery = '';
  String _selectedCategory = 'Semua';
  String _selectedType = 'Semua';
  String _selectedBank = 'Semua';

  List<TransactionModel> get transactions => _transactions;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isSyncingQueue => _isSyncingQueue;

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
    _initConnectivityListener();
    syncPendingQueue();
  }

  void _initConnectivityListener() {
    _connectivitySubscription = Connectivity().onConnectivityChanged.listen((results) {
      final hasConnection = results.any((r) => r != ConnectivityResult.none);
      if (hasConnection) {
        syncPendingQueue();
      }
    });
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

    // Trigger sync pending queue jika ada koneksi
    syncPendingQueue();

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

      // Merge local pending transactions if any exist in Hive queue
      _mergePendingFromQueue();

      // Server-Wins: Update local Hive cache with merged data
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

  void _mergePendingFromQueue() {
    try {
      final queueBox = Hive.box<String>('pending_transactions_queue');
      for (var key in queueBox.keys) {
        final rawStr = queueBox.get(key);
        if (rawStr != null) {
          final map = jsonDecode(rawStr) as Map<String, dynamic>;
          final payload = map['data'] as Map<String, dynamic>? ?? {};
          final tempId = map['tempId']?.toString() ?? key.toString();
          final clientRefId = map['clientRefId']?.toString() ?? '';

          final existsInList = _transactions.any((t) => t.id == tempId || t.referenceId == clientRefId);
          if (!existsInList) {
            final pendingTx = TransactionModel(
              id: tempId,
              emailId: 'manual-$clientRefId',
              referenceId: clientRefId,
              date: DateTime.tryParse(payload['date']?.toString() ?? '') ?? DateTime.now(),
              type: payload['type']?.toString() ?? 'Pengeluaran',
              amount: int.tryParse(payload['amount']?.toString() ?? '0') ?? 0,
              merchant: payload['merchant']?.toString() ?? 'Manual Input',
              category: payload['category']?.toString() ?? 'Lainnya',
              notes: payload['notes']?.toString() ?? '',
              source: 'pending_sync',
              bank: payload['bank']?.toString() ?? 'Manual',
            );
            _transactions.insert(0, pendingTx);
          }
        }
      }
    } catch (_) {
      // Ignore merge errors
    }
  }

  Future<void> addManualTransaction(Map<String, dynamic> data) async {
    final clientRefId = 'MAN-OFFLINE-${DateTime.now().millisecondsSinceEpoch}';
    final payload = Map<String, dynamic>.from(data);
    payload['clientRefId'] = clientRefId;

    try {
      await ApiClient.post('/transactions', payload);
      await fetchTransactions();
    } catch (e) {
      // Offline fallback: simpan ke pending_transactions_queue
      final tempId = 'pending-${DateTime.now().millisecondsSinceEpoch}';
      final queueItem = {
        'tempId': tempId,
        'clientRefId': clientRefId,
        'data': payload,
        'status': 'pending',
        'createdAt': DateTime.now().toIso8601String(),
        'retryCount': 0,
        'lastError': e.toString(),
      };

      try {
        final queueBox = Hive.box<String>('pending_transactions_queue');
        await queueBox.put(tempId, jsonEncode(queueItem));

        final pendingTx = TransactionModel(
          id: tempId,
          emailId: 'manual-$clientRefId',
          referenceId: clientRefId,
          date: DateTime.tryParse(payload['date']?.toString() ?? '') ?? DateTime.now(),
          type: payload['type']?.toString() ?? 'Pengeluaran',
          amount: int.tryParse(payload['amount']?.toString() ?? '0') ?? 0,
          merchant: payload['merchant']?.toString() ?? 'Manual Input',
          category: payload['category']?.toString() ?? 'Lainnya',
          notes: payload['notes']?.toString() ?? '',
          source: 'pending_sync',
          bank: payload['bank']?.toString() ?? 'Manual',
        );

        _transactions.insert(0, pendingTx);
        _saveToCache(_transactions);
        notifyListeners();
      } catch (_) {
        // Fallback write error
      }
    }
  }

  Future<void> syncPendingQueue({void Function(int syncedCount)? onSyncSuccess}) async {
    if (_isSyncingQueue) return;
    _isSyncingQueue = true;
    int syncedCount = 0;

    try {
      final queueBox = Hive.box<String>('pending_transactions_queue');
      final keys = List.from(queueBox.keys);

      for (var key in keys) {
        final rawStr = queueBox.get(key);
        if (rawStr == null) continue;

        final item = jsonDecode(rawStr) as Map<String, dynamic>;
        final payload = item['data'] as Map<String, dynamic>;
        final tempId = item['tempId']?.toString() ?? key.toString();
        final clientRefId = item['clientRefId']?.toString() ?? payload['clientRefId']?.toString() ?? '';

        try {
          await ApiClient.post('/transactions', payload);
          await queueBox.delete(key);

          // Update state in-memory _transactions agar badge "Menunggu Sync" langsung hilang
          final index = _transactions.indexWhere(
            (t) => t.id == tempId || (clientRefId.isNotEmpty && t.referenceId == clientRefId),
          );

          if (index != -1) {
            final oldTx = _transactions[index];
            _transactions[index] = TransactionModel(
              id: clientRefId.isNotEmpty ? clientRefId : (oldTx.referenceId.isNotEmpty ? oldTx.referenceId : tempId),
              emailId: oldTx.emailId,
              referenceId: clientRefId.isNotEmpty ? clientRefId : oldTx.referenceId,
              date: oldTx.date,
              type: oldTx.type,
              amount: oldTx.amount,
              merchant: oldTx.merchant,
              category: oldTx.category,
              notes: oldTx.notes,
              source: 'manual',
              bank: oldTx.bank,
            );
          }
          syncedCount++;
        } catch (e) {
          int retries = (item['retryCount'] as int? ?? 0) + 1;
          item['retryCount'] = retries;
          item['lastError'] = e.toString();
          if (retries >= 5) {
            item['status'] = 'failed';
          }
          await queueBox.put(key, jsonEncode(item));
        }
      }

      if (syncedCount > 0) {
        _saveToCache(_transactions);
      }
    } catch (_) {
      // Ignore queue iteration errors
    } finally {
      _isSyncingQueue = false;
      if (syncedCount > 0 && onSyncSuccess != null) {
        onSyncSuccess(syncedCount);
      }
      notifyListeners();
    }
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

  Future<void> updateTransactionDetails(String transactionId, {String? category, String? notes}) async {
    final Map<String, dynamic> body = {};
    if (category != null) body['category'] = category;
    if (notes != null) body['notes'] = notes;

    if (body.isEmpty) return;

    await ApiClient.patch('/transactions/$transactionId/details', body);

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
        category: category ?? oldTx.category,
        notes: notes ?? oldTx.notes,
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

  @override
  void dispose() {
    _connectivitySubscription?.cancel();
    super.dispose();
  }
}
