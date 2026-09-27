import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/widgets/glass_card.dart';
import '../../../core/widgets/custom_app_bar.dart';

class BudgetPlannerScreen extends StatefulWidget {
  const BudgetPlannerScreen({super.key});

  @override
  State<BudgetPlannerScreen> createState() => _BudgetPlannerScreenState();
}

class _BudgetPlannerScreenState extends State<BudgetPlannerScreen> {
  final Map<String, double> _budgets = {
    'Mess': 3500,
    'Food': 2000,
    'Transport': 1000,
    'Shopping': 1000,
    'Education': 1500,
    'Entertainment': 500,
    'Other': 500,
  };

  final Map<String, double> _actuals = {
    'Mess': 3200,
    'Food': 2800,
    'Transport': 1200,
    'Shopping': 800,
    'Education': 350,
    'Entertainment': 300,
    'Other': 200,
  };

  final Map<String, Color> _colors = {
    'Mess': const Color(0xFF81C784),
    'Food': const Color(0xFFFFB74D),
    'Transport': const Color(0xFF4FC3F7),
    'Shopping': const Color(0xFFCE93D8),
    'Education': const Color(0xFF6C63FF),
    'Entertainment': const Color(0xFFEF9A9A),
    'Other': const Color(0xFF80CBC4),
  };

  double get _totalBudget => _budgets.values.fold(0, (a, b) => a + b);
  double get _totalSpent => _actuals.values.fold(0, (a, b) => a + b);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: CustomAppBar(title: 'Budget Planner', showBack: true),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            GlassCard(
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _BudgetStat(label: 'Total Budget', value: '₹${_totalBudget.toInt()}', color: AppColors.accent),
                  Container(width: 1, height: 40, color: AppColors.border),
                  _BudgetStat(label: 'Total Spent', value: '₹${_totalSpent.toInt()}', color: AppColors.accentRed),
                  Container(width: 1, height: 40, color: AppColors.border),
                  _BudgetStat(label: 'Remaining', value: '₹${(_totalBudget - _totalSpent).toInt()}', color: AppColors.accentGreen),
                ],
              ),
            ),
            const SizedBox(height: 20),

            Text('Category Budgets', style: AppTextStyles.headingSmall),
            const SizedBox(height: 12),

            ..._budgets.entries.map((entry) {
              final cat = entry.key;
              final budget = entry.value;
              final spent = _actuals[cat] ?? 0;
              final ratio = spent / budget;
              final color = _colors[cat]!;
              final isOver = ratio > 1;

              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: GlassCard(
                  borderColor: isOver ? AppColors.accentRed.withOpacity(0.4) : AppColors.border,
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Container(width: 10, height: 10, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
                          const SizedBox(width: 8),
                          Expanded(child: Text(cat, style: AppTextStyles.titleMedium)),
                          if (isOver)
                            const Icon(Icons.warning_amber, color: AppColors.accentRed, size: 16),
                          const SizedBox(width: 4),
                          Text('₹${spent.toInt()} / ₹${budget.toInt()}', style: AppTextStyles.label.copyWith(color: isOver ? AppColors.accentRed : AppColors.textMuted)),
                        ],
                      ),
                      const SizedBox(height: 8),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(6),
                        child: LinearProgressIndicator(
                          value: ratio.clamp(0, 1),
                          minHeight: 8,
                          backgroundColor: AppColors.border,
                          valueColor: AlwaysStoppedAnimation(isOver ? AppColors.accentRed : color),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('${(ratio * 100).toStringAsFixed(0)}% used', style: AppTextStyles.caption),
                          Text(isOver ? '⚠️ Over budget!' : '₹${(budget - spent).toInt()} left', style: AppTextStyles.caption.copyWith(color: isOver ? AppColors.accentRed : AppColors.accentGreen)),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            }),
          ],
        ),
      ),
    );
  }
}

class _BudgetStat extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  const _BudgetStat({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) => Column(
    children: [
      Text(value, style: TextStyle(color: color, fontSize: 16, fontWeight: FontWeight.bold)),
      Text(label, style: AppTextStyles.caption),
    ],
  );
}
