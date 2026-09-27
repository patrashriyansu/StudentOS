import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/widgets/glass_card.dart';
import '../../core/widgets/hub_feature_tile.dart';
import '../../core/widgets/custom_app_bar.dart';

class FinanceHubScreen extends StatelessWidget {
  const FinanceHubScreen({super.key});

  static const Color _hubColor = Color(0xFF80CBC4);

  @override
  Widget build(BuildContext context) {
    final categories = [
      {'label': 'Mess', 'amount': 3200, 'color': const Color(0xFF81C784)},
      {'label': 'Food', 'amount': 2800, 'color': const Color(0xFFFFB74D)},
      {'label': 'Transport', 'amount': 1200, 'color': const Color(0xFF4FC3F7)},
      {'label': 'Shopping', 'amount': 800, 'color': const Color(0xFFCE93D8)},
      {'label': 'Other', 'amount': 200, 'color': const Color(0xFF80CBC4)},
    ];
    final total = categories.fold<int>(0, (s, c) => s + (c['amount'] as int));

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: CustomAppBar(title: 'Finance Hub', showBack: true),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Monthly overview
            GlassCard(
              gradient: LinearGradient(
                colors: [_hubColor.withOpacity(0.25), _hubColor.withOpacity(0.05)],
              ),
              borderColor: _hubColor.withOpacity(0.4),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('June 2026', style: AppTextStyles.label),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      _MoneyTile(label: 'Budget', value: '₹12,500', color: _hubColor),
                      _MoneyTile(label: 'Spent', value: '₹${total.toStringAsFixed(0).replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')}', color: AppColors.accentRed),
                      _MoneyTile(label: 'Saved', value: '₹4,300', color: AppColors.accentGreen),
                    ],
                  ),
                  const SizedBox(height: 16),
                  // Simple horizontal bar
                  ClipRRect(
                    borderRadius: BorderRadius.circular(6),
                    child: LinearProgressIndicator(
                      value: total / 12500,
                      minHeight: 10,
                      backgroundColor: AppColors.border,
                      valueColor: AlwaysStoppedAnimation(total > 10000 ? AppColors.accentRed : AppColors.accentGreen),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text('${((total / 12500) * 100).toStringAsFixed(0)}% of budget used', style: AppTextStyles.caption),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Category breakdown
            GlassCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Spending by Category', style: AppTextStyles.titleMedium),
                  const SizedBox(height: 12),
                  ...categories.map((c) {
                    final amt = c['amount'] as int;
                    final color = c['color'] as Color;
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: Row(
                        children: [
                          Container(width: 10, height: 10, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
                          const SizedBox(width: 10),
                          Expanded(
                            flex: 2,
                            child: Text(c['label'] as String, style: AppTextStyles.body),
                          ),
                          Expanded(
                            flex: 4,
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(4),
                              child: LinearProgressIndicator(
                                value: amt / total,
                                minHeight: 8,
                                backgroundColor: AppColors.border,
                                valueColor: AlwaysStoppedAnimation(color),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Text('₹$amt', style: AppTextStyles.label.copyWith(color: color)),
                        ],
                      ),
                    );
                  }),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // AI insight
            GlassCard(
              borderColor: AppColors.accentOrange.withOpacity(0.4),
              child: Row(
                children: [
                  const Text('🤖', style: TextStyle(fontSize: 28)),
                  const SizedBox(width: 12),
                  Expanded(child: Text('You spent ₹2,500 extra on food this month compared to last month. Consider meal prepping!', style: AppTextStyles.body)),
                ],
              ),
            ),
            const SizedBox(height: 20),

            GridView.count(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisCount: 3,
              mainAxisSpacing: 10,
              crossAxisSpacing: 10,
              childAspectRatio: 1.0,
              children: [
                HubFeatureTile(title: 'Expense Tracker', icon: Icons.receipt_long, color: _hubColor, onTap: () => context.go('/finance-hub/expense-tracker')),
                HubFeatureTile(title: 'Budget Planner', icon: Icons.pie_chart, color: AppColors.accentOrange, onTap: () => context.go('/finance-hub/budget-planner')),
                HubFeatureTile(title: 'Savings', icon: Icons.savings, color: AppColors.accentGreen, onTap: () => context.go('/finance-hub/savings-predictor')),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _MoneyTile extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  const _MoneyTile({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) => Column(
    children: [
      Text(value, style: TextStyle(color: color, fontSize: 18, fontWeight: FontWeight.bold)),
      Text(label, style: AppTextStyles.caption),
    ],
  );
}
