import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/widgets/glass_card.dart';
import '../../../core/widgets/custom_app_bar.dart';

class SavingsPredictorScreen extends StatefulWidget {
  const SavingsPredictorScreen({super.key});

  @override
  State<SavingsPredictorScreen> createState() => _SavingsPredictorScreenState();
}

class _SavingsPredictorScreenState extends State<SavingsPredictorScreen> {
  double _monthlySavings = 4300;
  double _targetAmount = 50000;
  int _months = 0;

  void _calculate() {
    setState(() => _months = (_targetAmount / _monthlySavings).ceil());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: CustomAppBar(title: 'Savings Predictor', showBack: true),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            GlassCard(
              gradient: LinearGradient(colors: [AppColors.accentGreen.withOpacity(0.2), AppColors.accentGreen.withOpacity(0.05)]),
              child: Column(
                children: [
                  const Text('💰', style: TextStyle(fontSize: 40)),
                  const SizedBox(height: 8),
                  Text('Current Savings Rate', style: AppTextStyles.titleMedium),
                  Text('₹4,300 / month', style: AppTextStyles.headingLarge.copyWith(color: AppColors.accentGreen)),
                ],
              ),
            ),
            const SizedBox(height: 20),

            GlassCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Monthly Savings: ₹${_monthlySavings.toInt()}', style: AppTextStyles.titleMedium),
                  Slider(value: _monthlySavings, min: 500, max: 10000, divisions: 95, activeColor: AppColors.accentGreen,
                    onChanged: (v) => setState(() => _monthlySavings = v)),
                  const SizedBox(height: 12),
                  Text('Savings Goal: ₹${_targetAmount.toInt()}', style: AppTextStyles.titleMedium),
                  Slider(value: _targetAmount, min: 5000, max: 200000, divisions: 195, activeColor: AppColors.primary,
                    onChanged: (v) => setState(() => _targetAmount = v)),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _calculate,
                      style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                      child: Text('Predict', style: AppTextStyles.button),
                    ),
                  ),
                ],
              ),
            ),

            if (_months > 0) ...[
              const SizedBox(height: 20),
              GlassCard(
                borderColor: AppColors.accentGreen.withOpacity(0.4),
                child: Column(
                  children: [
                    const Text('🎯', style: TextStyle(fontSize: 40)),
                    const SizedBox(height: 8),
                    Text('You\'ll reach ₹${_targetAmount.toInt()} in', style: AppTextStyles.titleMedium),
                    const SizedBox(height: 8),
                    Text('$_months Months', style: AppTextStyles.displayLarge.copyWith(color: AppColors.accentGreen)),
                    const SizedBox(height: 4),
                    Text('(${(_months / 12).toStringAsFixed(1)} years)', style: AppTextStyles.body),
                    const SizedBox(height: 12),
                    Text('Keep saving ₹${_monthlySavings.toInt()}/month consistently! 💪', style: AppTextStyles.body, textAlign: TextAlign.center),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
