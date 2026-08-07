// lib/presentation/screens/transactions/transaction_detail_screen.dart
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_text_styles.dart';
import '../../../data/models/transaction_model.dart';
import '../../../providers/transaction_provider.dart';
import '../../../providers/dashboard_provider.dart';

class TransactionDetailScreen extends StatefulWidget {
  final TransactionModel transaction;

  const TransactionDetailScreen({
    super.key,
    required this.transaction,
  });

  @override
  State<TransactionDetailScreen> createState() => _TransactionDetailScreenState();
}

class _TransactionDetailScreenState extends State<TransactionDetailScreen> {
  late String _selectedCategory;

  final List<String> _categories = [
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

  @override
  void initState() {
    super.initState();
    _selectedCategory = widget.transaction.category;
  }

  Color _getTypeColor() {
    switch (widget.transaction.type) {
      case 'Transfer Masuk':
      case 'Pemasukan':
        return AppColors.income;
      case 'Transfer Keluar':
      case 'Pengeluaran':
        return AppColors.expense;
      case 'QRIS':
        return AppColors.qris;
      default:
        return AppColors.transfer;
    }
  }

  IconData _getTypeIcon() {
    switch (widget.transaction.type) {
      case 'Transfer Masuk':
      case 'Pemasukan':
        return Icons.arrow_downward;
      case 'Transfer Keluar':
      case 'Pengeluaran':
        return Icons.arrow_upward;
      case 'QRIS':
        return Icons.qr_code_scanner;
      case 'Tarik Tunai':
        return Icons.atm;
      default:
        return Icons.swap_horiz;
    }
  }

  Future<void> _handleCategoryChange(String? newCategory) async {
    if (newCategory == null || newCategory == _selectedCategory) return;
    
    setState(() => _selectedCategory = newCategory);

    try {
      await Provider.of<TransactionProvider>(context, listen: false)
          .updateCategory(widget.transaction.id, newCategory);
      
      if (!mounted) return;

      final now = DateTime.now();
      await Provider.of<DashboardProvider>(context, listen: false).fetchSummary(
        month: now.month,
        year: now.year,
      );

      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Kategori berhasil diperbarui.')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal memperbarui kategori: $e')),
      );
      setState(() => _selectedCategory = widget.transaction.category);
    }
  }

  @override
  Widget build(BuildContext context) {
    final currencyFormat = NumberFormat.currency(
      locale: 'id_ID',
      symbol: 'Rp',
      decimalDigits: 0,
    );

    final dateFormat = DateFormat('dd MMMM yyyy, HH:mm', 'id_ID');
    final color = _getTypeColor();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Detail Transaksi'),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            children: [
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.01),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    Container(
                      width: 54,
                      height: 54,
                      decoration: BoxDecoration(
                        color: color.withValues(alpha: 0.1),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(_getTypeIcon(), color: color, size: 28),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      widget.transaction.merchant,
                      style: AppTextStyles.heading2.copyWith(fontSize: 20),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      (widget.transaction.isIncome ? '+' : '-') + currencyFormat.format(widget.transaction.amount),
                      style: AppTextStyles.amountLarge.copyWith(color: color, fontSize: 32),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.primaryLight,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        widget.transaction.bank,
                        style: AppTextStyles.bodySmall.copyWith(
                          color: AppColors.primary,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Column(
                  children: [
                    _buildDetailRow('Tanggal', dateFormat.format(widget.transaction.date.toLocal())),
                    _buildDetailRow('Jenis Transaksi', widget.transaction.type),
                    _buildDetailRow('Sumber Transaksi', widget.transaction.source == 'auto' ? 'Otomatis (Email)' : 'Manual Input'),
                    _buildDetailRow('ID Transaksi / Ref', widget.transaction.referenceId),
                    const Divider(color: AppColors.divider),

                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8.0),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Kategori', style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textSecondary)),
                          DropdownButton<String>(
                            value: _selectedCategory,
                            onChanged: _handleCategoryChange,
                            underline: const SizedBox(),
                            icon: const Icon(Icons.edit, size: 16, color: AppColors.primary),
                            style: AppTextStyles.bodyMedium.copyWith(
                              fontWeight: FontWeight.bold,
                              color: AppColors.primary,
                            ),
                            items: _categories
                                .map((cat) => DropdownMenuItem(
                                      value: cat,
                                      child: Text(cat),
                                    ))
                                .toList(),
                          ),
                        ],
                      ),
                    ),

                    if (widget.transaction.notes.isNotEmpty) ...[
                      const Divider(color: AppColors.divider),
                      _buildDetailRow('Catatan', widget.transaction.notes),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textSecondary)),
          const SizedBox(width: 16),
          Expanded(
            child: Text(
              value,
              style: AppTextStyles.bodyMedium.copyWith(fontWeight: FontWeight.w500),
              textAlign: TextAlign.end,
            ),
          ),
        ],
      ),
    );
  }
}
