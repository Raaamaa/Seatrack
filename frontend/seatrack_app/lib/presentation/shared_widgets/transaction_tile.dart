// lib/presentation/shared_widgets/transaction_tile.dart
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_text_styles.dart';
import '../../data/models/transaction_model.dart';

class TransactionTile extends StatelessWidget {
  final TransactionModel transaction;
  final VoidCallback? onTap;

  const TransactionTile({
    super.key,
    required this.transaction,
    this.onTap,
  });

  Color _getTypeColor() {
    switch (transaction.type) {
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
    switch (transaction.type) {
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

  @override
  Widget build(BuildContext context) {
    final currencyFormat = NumberFormat.currency(
      locale: 'id_ID',
      symbol: 'Rp',
      decimalDigits: 0,
    );

    final dateFormat = DateFormat('dd MMM yyyy, HH:mm', 'id_ID');

    final color = _getTypeColor();

    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: const BoxDecoration(
          color: AppColors.surface,
          border: Border(
            bottom: BorderSide(color: AppColors.divider, width: 1),
          ),
        ),
        child: Row(
          children: [
            // Icon
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(
                _getTypeIcon(),
                color: color,
                size: 20,
              ),
            ),
            const SizedBox(width: 12),
            // Details
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          transaction.merchant,
                          style: AppTextStyles.bodyMedium.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (transaction.isPendingSync) ...[
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.amber.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.sync, size: 10, color: Colors.amber),
                              const SizedBox(width: 2),
                              Text(
                                'Menunggu Sync',
                                style: AppTextStyles.bodySmall.copyWith(
                                  color: Colors.amber[900],
                                  fontSize: 9,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ] else ...[
                        // Bank Badge
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppColors.primaryLight,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            transaction.bank,
                            style: AppTextStyles.bodySmall.copyWith(
                              color: AppColors.primary,
                              fontSize: 9,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        dateFormat.format(transaction.date.toLocal()),
                        style: AppTextStyles.bodySmall,
                      ),
                      // Category Chip
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppColors.background,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          transaction.category,
                          style: AppTextStyles.bodySmall.copyWith(
                            fontSize: 10,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            // Amount
            Text(
              (transaction.isIncome ? '+' : '-') + currencyFormat.format(transaction.amount),
              style: AppTextStyles.amountMedium.copyWith(
                color: color,
                fontSize: 15,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
