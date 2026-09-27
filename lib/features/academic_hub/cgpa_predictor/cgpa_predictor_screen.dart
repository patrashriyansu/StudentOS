import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/widgets/glass_card.dart';
import '../../../core/widgets/custom_app_bar.dart';

class CgpaPredictorScreen extends StatefulWidget {
  const CgpaPredictorScreen({super.key});

  @override
  State<CgpaPredictorScreen> createState() => _CgpaPredictorScreenState();
}

class _CgpaPredictorScreenState extends State<CgpaPredictorScreen> {
  double _targetSgpa = 9.0;
  double _currentCgpa = 8.5;
  int _completedSemesters = 4;
  int _totalSemesters = 8;
  double? _predictedCgpa;

  void _predict() {
    final remaining = _totalSemesters - _completedSemesters;
    final predicted = (_currentCgpa * _completedSemesters + _targetSgpa * remaining) / _totalSemesters;
    setState(() => _predictedCgpa = double.parse(predicted.toStringAsFixed(2)));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: CustomAppBar(title: 'CGPA Predictor', showBack: true),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // Current stats
            GlassCard(
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      _StatBox(label: 'Current CGPA', value: '$_currentCgpa', color: AppColors.accentGreen),
                      _StatBox(label: 'Semester', value: '$_completedSemesters / $_totalSemesters', color: AppColors.accent),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            GlassCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Target SGPA (remaining sems)', style: AppTextStyles.titleMedium),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: Slider(
                          value: _targetSgpa,
                          min: 6.0,
                          max: 10.0,
                          divisions: 40,
                          activeColor: AppColors.primary,
                          onChanged: (v) => setState(() => _targetSgpa = double.parse(v.toStringAsFixed(1))),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          gradient: AppColors.gradientPrimary,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text('$_targetSgpa', style: AppTextStyles.titleMedium),
                      ),
                    ],
                  ),

                  const SizedBox(height: 16),
                  Text('Completed Semesters: $_completedSemesters', style: AppTextStyles.label),
                  Slider(
                    value: _completedSemesters.toDouble(),
                    min: 1,
                    max: 7,
                    divisions: 6,
                    activeColor: AppColors.accent,
                    onChanged: (v) => setState(() => _completedSemesters = v.toInt()),
                  ),

                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _predict,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: Text('Predict Final CGPA', style: AppTextStyles.button),
                    ),
                  ),
                ],
              ),
            ),

            if (_predictedCgpa != null) ...[
              const SizedBox(height: 20),
              GlassCard(
                gradient: LinearGradient(
                  colors: [AppColors.primary.withOpacity(0.2), AppColors.secondary.withOpacity(0.1)],
                ),
                child: Column(
                  children: [
                    Text('🎯 Predicted Final CGPA', style: AppTextStyles.titleMedium),
                    const SizedBox(height: 16),
                    TweenAnimationBuilder<double>(
                      tween: Tween(begin: _currentCgpa, end: _predictedCgpa!),
                      duration: const Duration(milliseconds: 1000),
                      curve: Curves.easeOutCubic,
                      builder: (_, value, __) => Text(
                        value.toStringAsFixed(2),
                        style: TextStyle(
                          fontSize: 56,
                          fontWeight: FontWeight.bold,
                          foreground: Paint()
                            ..shader = const LinearGradient(
                              colors: [AppColors.primary, AppColors.secondary],
                            ).createShader(const Rect.fromLTWH(0, 0, 120, 60)),
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _predictedCgpa! >= 9.0
                          ? '🏆 Excellent! You\'ll be in the 9+ club'
                          : _predictedCgpa! >= 8.0
                              ? '✅ Good standing — keep pushing!'
                              : '⚠️ Below target — aim higher each semester',
                      style: AppTextStyles.body,
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        'To achieve CGPA $_predictedCgpa, you need an average SGPA of $_targetSgpa in the remaining ${_totalSemesters - _completedSemesters} semesters.',
                        style: AppTextStyles.bodySmall,
                        textAlign: TextAlign.center,
                      ),
                    ),
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

class _StatBox extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  const _StatBox({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(value, style: TextStyle(color: color, fontSize: 24, fontWeight: FontWeight.bold)),
        Text(label, style: AppTextStyles.caption),
      ],
    );
  }
}
