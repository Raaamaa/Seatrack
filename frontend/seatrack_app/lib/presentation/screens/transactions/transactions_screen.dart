// lib/presentation/screens/transactions/transactions_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_text_styles.dart';
import '../../../data/models/transaction_model.dart';
import '../../../providers/transaction_provider.dart';
import '../../shared_widgets/loading_shimmer.dart';
import '../../shared_widgets/transaction_tile.dart';
import 'transaction_detail_screen.dart';

class TransactionsScreen extends StatefulWidget {
  const TransactionsScreen({super.key});

  @override
  State<TransactionsScreen> createState() => _TransactionsScreenState();
}

class _TransactionsScreenState extends State<TransactionsScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  String _selectedCategory = 'Semua';
  String _selectedType = 'Semua';
  String _selectedBank = 'Semua';
  
  final List<String> _categories = [
    'Semua',
    'Makanan & Minuman',
    'Transportasi',
    'Belanja',
    'Hiburan',
    'Tagihan & Utilitas',
    'Kesehatan',
    'Tabungan & Investasi',
    'Transfer',
    'Lainnya'
  ];

  final List<String> _types = [
    'Semua',
    'Transfer Masuk',
    'Transfer Keluar',
    'QRIS',
    'Tarik Tunai',
    'Pemasukan',
    'Pengeluaran'
  ];

  final List<String> _banks = [
    'Semua',
    'SeaBank',
    'BCA',
    'Jago',
    'Manual'
  ];

  @override
  void initState() {
    super.initState();
    _loadTransactions();
  }

  void _loadTransactions() {
    final now = DateTime.now();
    Provider.of<TransactionProvider>(context, listen: false).fetchTransactions(
      month: now.month,
      year: now.year,
      // note: filter locally for category/type/bank or let backend handle.
      // We pass the bank filter if it's set
      bank: _selectedBank == 'Semua' ? null : _selectedBank,
    );
  }

  Future<void> _handleRefresh() async {
    _loadTransactions();
  }

  List<TransactionModel> _filterTransactions(List<TransactionModel> rawList) {
    return rawList.where((tx) {
      final matchesSearch = tx.merchant.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          tx.referenceId.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          tx.notes.toLowerCase().contains(_searchQuery.toLowerCase());
      
      final matchesCategory = _selectedCategory == 'Semua' || tx.category == _selectedCategory;
      final matchesType = _selectedType == 'Semua' || tx.type == _selectedType;
      final matchesBank = _selectedBank == 'Semua' || tx.bank.toLowerCase() == _selectedBank.toLowerCase();

      return matchesSearch && matchesCategory && matchesType && matchesBank;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Daftar Transaksi', style: AppTextStyles.heading1),
        elevation: 0,
      ),
      body: Column(
        children: [
          // Search & Filters panel
          Container(
            color: AppColors.surface,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: Column(
              children: [
                // Search field
                TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    hintText: 'Cari merchant, nomor referensi...',
                    prefixIcon: const Icon(Icons.search, color: AppColors.textSecondary),
                    filled: true,
                    fillColor: AppColors.background,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                    contentPadding: const EdgeInsets.symmetric(vertical: 8),
                  ),
                  onChanged: (val) {
                    setState(() {
                      _searchQuery = val;
                    });
                  },
                ),
                const SizedBox(height: 12),
                
                // Filters horizontally scrollable
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      // Bank filter dropdown
                      _buildDropdownFilter(
                        label: 'Bank: $_selectedBank',
                        value: _selectedBank,
                        items: _banks,
                        onChanged: (val) {
                          if (val != null) {
                            setState(() => _selectedBank = val);
                            _loadTransactions();
                          }
                        },
                      ),
                      const SizedBox(width: 8),
                      
                      // Category filter dropdown
                      _buildDropdownFilter(
                        label: 'Kategori: $_selectedCategory',
                        value: _selectedCategory,
                        items: _categories,
                        onChanged: (val) {
                          if (val != null) {
                            setState(() => _selectedCategory = val);
                          }
                        },
                      ),
                      const SizedBox(width: 8),

                      // Type filter dropdown
                      _buildDropdownFilter(
                        label: 'Jenis: $_selectedType',
                        value: _selectedType,
                        items: _types,
                        onChanged: (val) {
                          if (val != null) {
                            setState(() => _selectedType = val);
                          }
                        },
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1, color: AppColors.divider),
          
          // Transactions list
          Expanded(
            child: RefreshIndicator(
              onRefresh: _handleRefresh,
              child: Consumer<TransactionProvider>(
                builder: (context, prov, child) {
                  if (prov.isLoading) {
                    return const LoadingShimmer(count: 6);
                  }

                  if (prov.error != null) {
                    return Center(child: Text('Error: ${prov.error}'));
                  }

                  final filtered = _filterTransactions(prov.transactions);

                  if (filtered.isEmpty) {
                    return ListView(
                      children: [
                        const SizedBox(height: 80),
                        const Icon(Icons.receipt_long_outlined, size: 64, color: AppColors.textSecondary),
                        const SizedBox(height: 16),
                        Center(
                          child: Text(
                            'Tidak ada transaksi yang cocok.',
                            style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textSecondary),
                          ),
                        ),
                      ],
                    );
                  }

                  return ListView.builder(
                    itemCount: filtered.length,
                    itemBuilder: (context, index) {
                      final tx = filtered[index];
                      return TransactionTile(
                        transaction: tx,
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => TransactionDetailScreen(transaction: tx),
                            ),
                          );
                        },
                      );
                    },
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDropdownFilter({
    required String label,
    required String value,
    required List<String> items,
    required Function(String?) onChanged,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.divider),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: value,
          isDense: true,
          style: AppTextStyles.bodySmall.copyWith(
            fontWeight: FontWeight.w600,
            color: AppColors.textPrimary,
          ),
          icon: const Icon(Icons.arrow_drop_down, size: 16),
          onChanged: onChanged,
          items: items
              .map((item) => DropdownMenuItem(
                    value: item,
                    child: Text(item),
                  ))
              .toList(),
        ),
      ),
    );
  }
}
