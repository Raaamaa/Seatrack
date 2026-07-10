// lib/presentation/screens/dashboard/dashboard_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_text_styles.dart';
import '../../../providers/dashboard_provider.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  String _selectedBank = 'Semua';
  final List<String> _banks = ['Semua', 'SeaBank', 'BCA', 'Jago', 'Manual'];

  int _selectedMonth = DateTime.now().month;
  int _selectedYear = DateTime.now().year;

  final List<int> _years = [
    DateTime.now().year - 2,
    DateTime.now().year - 1,
    DateTime.now().year,
    DateTime.now().year + 1,
  ];

  final List<Map<String, dynamic>> _months = [
    {'value': 1, 'name': 'Januari'},
    {'value': 2, 'name': 'Februari'},
    {'value': 3, 'name': 'Maret'},
    {'value': 4, 'name': 'April'},
    {'value': 5, 'name': 'Mei'},
    {'value': 6, 'name': 'Juni'},
    {'value': 7, 'name': 'Juli'},
    {'value': 8, 'name': 'Agustus'},
    {'value': 9, 'name': 'September'},
    {'value': 10, 'name': 'Oktober'},
    {'value': 11, 'name': 'November'},
    {'value': 12, 'name': 'Desember'},
  ];

  @override
  void initState() {
    super.initState();
    _loadDashboardData();
  }

  void _loadDashboardData() {
    Provider.of<DashboardProvider>(context, listen: false).fetchSummary(
      month: _selectedMonth,
      year: _selectedYear,
      bank: _selectedBank == 'Semua' ? null : _selectedBank,
    );
  }

  Color _getCategoryColor(String category) {
    switch (category) {
      case 'Makanan & Minuman':
        return const Color(0xFFDD6B20);
      case 'Transportasi':
        return const Color(0xFF0D9F6E);
      case 'Belanja':
        return const Color(0xFF1A73E8);
      case 'Hiburan':
        return const Color(0xFF805AD5);
      case 'Tagihan & Utilitas':
        return const Color(0xFFE53E3E);
      case 'Kesehatan':
        return const Color(0xFFFF5A5F);
      case 'Tabungan & Investasi':
        return const Color(0xFF38A169);
      case 'Transfer':
        return const Color(0xFF718096);
      default:
        return const Color(0xFFA0AEC0);
    }
  }

  @override
  Widget build(BuildContext context) {
    final currencyFormat = NumberFormat.currency(
      locale: 'id_ID',
      symbol: 'Rp',
      decimalDigits: 0,
    );

    return Scaffold(
      appBar: AppBar(
        title: Text('Analisis Keuangan', style: AppTextStyles.heading1),
        elevation: 0,
      ),
      body: Consumer<DashboardProvider>(
        builder: (context, prov, child) {
          if (prov.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (prov.error != null) {
            return Center(child: Text('Gagal memuat dashboard: ${prov.error}'));
          }

          final summary = prov.summary;
          if (summary == null) {
            return const Center(child: Text('Tidak ada data dashboard.'));
          }

          final totalIncome = summary['totalIncome'] ?? 0;
          final totalExpense = summary['totalExpense'] ?? 0;
          final categoryMap = Map<String, dynamic>.from(summary['categoryBreakdown'] ?? {});
          final weeklyList = List<dynamic>.from(summary['weeklyExpense'] ?? []);

          return SingleChildScrollView(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Filters Section (Bank, Month, Year)
                  Card(
                    elevation: 0,
                    color: AppColors.surface.withOpacity(0.5),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                      side: BorderSide(color: AppColors.divider),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(12.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Filter Bank
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('Filter Rekening/Bank', style: AppTextStyles.labelMedium),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                                decoration: BoxDecoration(
                                  color: AppColors.surface,
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(color: AppColors.divider),
                                ),
                                child: DropdownButtonHideUnderline(
                                  child: DropdownButton<String>(
                                    value: _selectedBank,
                                    style: AppTextStyles.bodySmall.copyWith(
                                      fontWeight: FontWeight.bold,
                                      color: AppColors.textPrimary,
                                    ),
                                    icon: const Icon(Icons.arrow_drop_down, size: 16),
                                    onChanged: (val) {
                                      if (val != null) {
                                        setState(() => _selectedBank = val);
                                        _loadDashboardData();
                                      }
                                    },
                                    items: _banks
                                        .map((b) => DropdownMenuItem(value: b, child: Text(b)))
                                        .toList(),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          // Filter Bulan & Tahun
                          Row(
                            children: [
                              // Bulan
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('Bulan', style: AppTextStyles.labelMedium),
                                    const SizedBox(height: 6),
                                    Container(
                                      width: double.infinity,
                                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: AppColors.surface,
                                        borderRadius: BorderRadius.circular(10),
                                        border: Border.all(color: AppColors.divider),
                                      ),
                                      child: DropdownButtonHideUnderline(
                                        child: DropdownButton<int>(
                                          value: _selectedMonth,
                                          style: AppTextStyles.bodySmall.copyWith(
                                            fontWeight: FontWeight.bold,
                                            color: AppColors.textPrimary,
                                          ),
                                          icon: const Icon(Icons.arrow_drop_down, size: 16),
                                          onChanged: (val) {
                                            if (val != null) {
                                              setState(() => _selectedMonth = val);
                                              _loadDashboardData();
                                            }
                                          },
                                          items: _months
                                              .map((m) => DropdownMenuItem<int>(
                                                    value: m['value'] as int,
                                                    child: Text(m['name'] as String),
                                                  ))
                                              .toList(),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 12),
                              // Tahun
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('Tahun', style: AppTextStyles.labelMedium),
                                    const SizedBox(height: 6),
                                    Container(
                                      width: double.infinity,
                                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: AppColors.surface,
                                        borderRadius: BorderRadius.circular(10),
                                        border: Border.all(color: AppColors.divider),
                                      ),
                                      child: DropdownButtonHideUnderline(
                                        child: DropdownButton<int>(
                                          value: _selectedYear,
                                          style: AppTextStyles.bodySmall.copyWith(
                                            fontWeight: FontWeight.bold,
                                            color: AppColors.textPrimary,
                                          ),
                                          icon: const Icon(Icons.arrow_drop_down, size: 16),
                                          onChanged: (val) {
                                            if (val != null) {
                                              setState(() => _selectedYear = val);
                                              _loadDashboardData();
                                            }
                                          },
                                          items: _years
                                              .map((y) => DropdownMenuItem<int>(
                                                    value: y,
                                                    child: Text(y.toString()),
                                                  ))
                                              .toList(),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Balance Cards Summary
                  Row(
                    children: [
                      _buildSummaryCard(
                        title: 'Pemasukan',
                        amount: currencyFormat.format(totalIncome),
                        color: AppColors.income,
                        icon: Icons.arrow_downward,
                      ),
                      const SizedBox(width: 12),
                      _buildSummaryCard(
                        title: 'Pengeluaran',
                        amount: currencyFormat.format(totalExpense),
                        color: AppColors.expense,
                        icon: Icons.arrow_upward,
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Weekly Expense Chart (Bar Chart)
                  Text('Pengeluaran per Minggu', style: AppTextStyles.heading2),
                  const SizedBox(height: 12),
                  Container(
                    height: 220,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: BarChart(
                      BarChartData(
                        alignment: BarChartAlignment.spaceAround,
                        maxY: _getMaxWeeklyExpense(weeklyList) * 1.2,
                        barTouchData: BarTouchData(enabled: true),
                        titlesData: FlTitlesData(
                          show: true,
                          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                          rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                          bottomTitles: AxisTitles(
                            sideTitles: SideTitles(
                              showTitles: true,
                              getTitlesWidget: (val, meta) {
                                final index = val.toInt();
                                if (index >= 0 && index < weeklyList.length) {
                                  return Padding(
                                    padding: const EdgeInsets.only(top: 8.0),
                                    child: Text(
                                      weeklyList[index]['week'] ?? '',
                                      style: AppTextStyles.bodySmall.copyWith(fontSize: 10),
                                    ),
                                  );
                                }
                                return const SizedBox();
                              },
                            ),
                          ),
                        ),
                        borderData: FlBorderData(show: false),
                        gridData: const FlGridData(show: false),
                        barGroups: weeklyList.asMap().entries.map((entry) {
                          final idx = entry.key;
                          final amount = entry.value['amount'] as num;
                          return BarChartGroupData(
                            x: idx,
                            barRods: [
                              BarChartRodData(
                                toY: amount.toDouble(),
                                color: AppColors.primary,
                                width: 18,
                                borderRadius: BorderRadius.circular(4),
                              ),
                            ],
                          );
                        }).toList(),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Category Breakdown Chart (Pie Chart)
                  Text('Breakdown Pengeluaran', style: AppTextStyles.heading2),
                  const SizedBox(height: 12),
                  if (categoryMap.isEmpty)
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(vertical: 40),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        'Tidak ada pengeluaran untuk ditampilkan.',
                        style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textSecondary),
                      ),
                    )
                  else
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Column(
                        children: [
                          SizedBox(
                            height: 180,
                            child: PieChart(
                              PieChartData(
                                sectionsSpace: 2,
                                centerSpaceRadius: 40,
                                sections: categoryMap.entries.map((entry) {
                                  final amount = entry.value as num;
                                  final color = _getCategoryColor(entry.key);
                                  return PieChartSectionData(
                                    color: color,
                                    value: amount.toDouble(),
                                    title: '${(amount / totalExpense * 100).toStringAsFixed(0)}%',
                                    radius: 50,
                                    titleStyle: const TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.white,
                                    ),
                                  );
                                }).toList(),
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),
                          // Category Legend List
                          Column(
                            children: categoryMap.entries.map((entry) {
                              final cat = entry.key;
                              final amount = entry.value as num;
                              final color = _getCategoryColor(cat);
                              return Padding(
                                padding: const EdgeInsets.symmetric(vertical: 4.0),
                                child: Row(
                                  children: [
                                    Container(
                                      width: 12,
                                      height: 12,
                                      decoration: BoxDecoration(color: color, shape: BoxShape.circle),
                                    ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(cat, style: AppTextStyles.bodySmall.copyWith(color: AppColors.textPrimary)),
                                    ),
                                    Text(
                                      currencyFormat.format(amount),
                                      style: AppTextStyles.bodySmall.copyWith(fontWeight: FontWeight.bold),
                                    ),
                                  ],
                                ),
                              );
                            }).toList(),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  double _getMaxWeeklyExpense(List<dynamic> weekly) {
    if (weekly.isEmpty) return 100000;
    double max = 0;
    for (var w in weekly) {
      final amount = (w['amount'] as num).toDouble();
      if (amount > max) max = amount;
    }
    return max == 0 ? 100000 : max;
  }

  Widget _buildSummaryCard({
    required String title,
    required String amount,
    required Color color,
    required IconData icon,
  }) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.01),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(icon, color: color, size: 14),
                ),
                const SizedBox(width: 8),
                Text(title, style: AppTextStyles.bodySmall),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              amount,
              style: AppTextStyles.heading2.copyWith(fontSize: 16, color: color),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}
