// lib/presentation/screens/home/home_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_text_styles.dart';
import '../../../providers/transaction_provider.dart';
import '../../../providers/dashboard_provider.dart';
import '../../shared_widgets/loading_shimmer.dart';
import '../transactions/transaction_detail_screen.dart';
import 'widgets/balance_card.dart';
import 'widgets/recent_transactions_list.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  String _activeBank = 'Semua';
  bool _isSyncing = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadData();
    });
  }

  void _loadData() {
    final now = DateTime.now();
    Provider.of<TransactionProvider>(context, listen: false).fetchTransactions(
      month: now.month,
      year: now.year,
      bank: _activeBank,
    );
    Provider.of<DashboardProvider>(context, listen: false).fetchSummary(
      month: now.month,
      year: now.year,
      bank: _activeBank,
    );
  }

  Future<void> _handleRefresh() async {
    _loadData();
  }

  Future<void> _syncEmails() async {
    setState(() => _isSyncing = true);
    try {
      await Provider.of<TransactionProvider>(context, listen: false).syncEmails();
      if (!mounted) return;
      final now = DateTime.now();
      await Provider.of<DashboardProvider>(context, listen: false).fetchSummary(
        month: now.month,
        year: now.year,
        bank: _activeBank,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Sinkronisasi email berhasil!')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal sinkronisasi: ${e.toString()}')),
      );
    } finally {
      if (mounted) {
        setState(() => _isSyncing = false);
      }
    }
  }

  void _changeBankFilter(String bank) {
    setState(() {
      _activeBank = bank;
    });
    _loadData();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('SeaTrack', style: AppTextStyles.heading1),
        actions: [
          IconButton(
            onPressed: () => Navigator.pushNamed(context, '/add-transaction'),
            icon: const Icon(Icons.add, color: AppColors.primary),
            tooltip: 'Tambah Transaksi',
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _handleRefresh,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Halo, Pengguna!',
                  style: AppTextStyles.heading1,
                ),
                const SizedBox(height: 4),
                Text(
                  'Berikut adalah rangkuman keuangan Anda.',
                  style: AppTextStyles.bodySmall,
                ),
                const SizedBox(height: 20),

                // Balance Card
                Consumer<DashboardProvider>(
                  builder: (context, dashProv, child) {
                    if (dashProv.isLoading) {
                      return Container(
                        height: 180,
                        width: double.infinity,
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        alignment: Alignment.center,
                        child: const CircularProgressIndicator(color: AppColors.primary),
                      );
                    }

                    final summary = dashProv.summary;
                    final totalIncome = summary?['totalIncome'] ?? 0;
                    final totalExpense = summary?['totalExpense'] ?? 0;
                    final netBalance = summary?['netBalance'] ?? 0;

                    return BalanceCard(
                      totalIncome: totalIncome,
                      totalExpense: totalExpense,
                      netBalance: netBalance,
                      activeBank: _activeBank,
                      onBankChanged: _changeBankFilter,
                      onSync: _syncEmails,
                      isSyncing: _isSyncing,
                    );
                  },
                ),
                const SizedBox(height: 24),

                // Recent Transactions List
                Consumer<TransactionProvider>(
                  builder: (context, txProv, child) {
                    if (txProv.isLoading && txProv.transactions.isEmpty) {
                      return const LoadingShimmer(count: 3);
                    }

                    if (txProv.error != null && txProv.transactions.isEmpty) {
                      return Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Color.fromRGBO(
                            AppColors.expense.r.toInt(),
                            AppColors.expense.g.toInt(),
                            AppColors.expense.b.toInt(),
                            0.05,
                          ),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: Color.fromRGBO(
                              AppColors.expense.r.toInt(),
                              AppColors.expense.g.toInt(),
                              AppColors.expense.b.toInt(),
                              0.15,
                            ),
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Gagal mengambil transaksi: ${txProv.error}',
                              style: AppTextStyles.bodyMedium.copyWith(color: AppColors.expense),
                            ),
                            const SizedBox(height: 12),
                            OutlinedButton.icon(
                              onPressed: _loadData,
                              icon: const Icon(Icons.refresh, size: 16),
                              label: const Text('Coba Lagi'),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: AppColors.expense,
                                side: const BorderSide(color: AppColors.expense),
                              ),
                            ),
                          ],
                        ),
                      );
                    }

                    return RecentTransactionsList(
                      transactions: txProv.transactions,
                      onTransactionTap: (tx) {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => TransactionDetailScreen(transaction: tx),
                          ),
                        );
                      },
                    );
                  },
                ),
              ],
            ),
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => Navigator.pushNamed(context, '/add-transaction'),
        backgroundColor: AppColors.primary,
        child: const Icon(Icons.add, color: Colors.white),
      ),
    );
  }
}
