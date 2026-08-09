// lib/presentation/screens/transactions/transactions_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_text_styles.dart';
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
    'BRI',
    'Jago',
    'Manual'
  ];

  @override
  void initState() {
    super.initState();
    _loadTransactions();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _loadTransactions() {
    final now = DateTime.now();
    final prov = Provider.of<TransactionProvider>(context, listen: false);
    prov.fetchTransactions(
      month: now.month,
      year: now.year,
      bank: prov.selectedBank == 'Semua' ? null : prov.selectedBank,
    );
  }

  Future<void> _handleRefresh() async {
    _loadTransactions();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Daftar Transaksi', style: AppTextStyles.heading1),
        elevation: 0,
      ),
      body: Consumer<TransactionProvider>(
        builder: (context, prov, child) {
          return Column(
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
                        prov.setSearchQuery(val);
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
                            label: 'Bank: ${prov.selectedBank}',
                            value: prov.selectedBank,
                            items: _banks,
                            onChanged: (val) {
                              if (val != null) {
                                prov.setBank(val);
                                _loadTransactions();
                              }
                            },
                          ),
                          const SizedBox(width: 8),

                          // Category filter dropdown
                          _buildDropdownFilter(
                            label: 'Kategori: ${prov.selectedCategory}',
                            value: prov.selectedCategory,
                            items: _categories,
                            onChanged: (val) {
                              if (val != null) {
                                prov.setCategory(val);
                              }
                            },
                          ),
                          const SizedBox(width: 8),

                          // Type filter dropdown
                          _buildDropdownFilter(
                            label: 'Jenis: ${prov.selectedType}',
                            value: prov.selectedType,
                            items: _types,
                            onChanged: (val) {
                              if (val != null) {
                                prov.setType(val);
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
                  child: Builder(
                    builder: (context) {
                      if (prov.isLoading && prov.transactions.isEmpty) {
                        return const LoadingShimmer(count: 6);
                      }

                      if (prov.error != null && prov.transactions.isEmpty) {
                        return Center(
                          child: Padding(
                            padding: const EdgeInsets.all(24.0),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(Icons.error_outline, size: 48, color: AppColors.expense),
                                const SizedBox(height: 12),
                                Text(
                                  prov.error!,
                                  textAlign: TextAlign.center,
                                  style: AppTextStyles.bodyMedium,
                                ),
                                const SizedBox(height: 16),
                                ElevatedButton.icon(
                                  onPressed: _loadTransactions,
                                  icon: const Icon(Icons.refresh),
                                  label: const Text('Coba Lagi'),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppColors.primary,
                                    foregroundColor: Colors.white,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      }

                      final filtered = prov.filteredTransactions;

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
          );
        },
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
