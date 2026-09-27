import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/widgets/glass_card.dart';
import '../../core/widgets/hub_feature_tile.dart';
import '../../core/widgets/custom_app_bar.dart';
import '../../core/widgets/section_header.dart';

class AcademicHubScreen extends StatelessWidget {
  const AcademicHubScreen({super.key});

  static const Color _hubColor = Color(0xFF81C784);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: CustomAppBar(title: 'Academic Hub', showBack: true),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Hero banner
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [_hubColor.withOpacity(0.25), _hubColor.withOpacity(0.05)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: _hubColor.withOpacity(0.3)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Text('🎓', style: TextStyle(fontSize: 36)),
                      const SizedBox(width: 12),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Academic Hub', style: AppTextStyles.headingMedium),
                          Text('Track. Predict. Excel.', style: AppTextStyles.body),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      _QuickStat(label: 'CGPA', value: '8.5', color: _hubColor),
                      const SizedBox(width: 12),
                      _QuickStat(label: 'Attendance', value: '82%', color: AppColors.accent),
                      const SizedBox(width: 12),
                      _QuickStat(label: 'Semester', value: '5th', color: AppColors.secondary),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // CGPA Trend
            SectionHeader(title: 'CGPA Trend'),
            const SizedBox(height: 12),
            GlassCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Semester-wise CGPA', style: AppTextStyles.label),
                  const SizedBox(height: 12),
                  SizedBox(
                    height: 80,
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                      children: [
                        {'sem': 'S1', 'cgpa': 7.8, 'h': 0.78},
                        {'sem': 'S2', 'cgpa': 8.0, 'h': 0.80},
                        {'sem': 'S3', 'cgpa': 8.2, 'h': 0.82},
                        {'sem': 'S4', 'cgpa': 8.5, 'h': 0.85},
                        {'sem': 'S5*', 'cgpa': 9.0, 'h': 0.90},
                      ].map((d) {
                        final isLast = d['sem'] == 'S5*';
                        return Column(
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            Text('${d['cgpa']}', style: AppTextStyles.caption.copyWith(color: isLast ? _hubColor : AppColors.textMuted)),
                            const SizedBox(height: 4),
                            AnimatedContainer(
                              duration: const Duration(milliseconds: 600),
                              width: 30,
                              height: 80 * (d['h'] as double),
                              decoration: BoxDecoration(
                                gradient: isLast
                                    ? AppColors.gradientPrimary
                                    : LinearGradient(colors: [_hubColor.withOpacity(0.5), _hubColor.withOpacity(0.2)]),
                                borderRadius: const BorderRadius.vertical(top: Radius.circular(6)),
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(d['sem'] as String, style: AppTextStyles.caption),
                          ],
                        );
                      }).toList(),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            SectionHeader(title: 'Features'),
            const SizedBox(height: 12),
            GridView.count(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisCount: 2,
              mainAxisSpacing: 12,
              crossAxisSpacing: 12,
              childAspectRatio: 1.2,
              children: [
                HubFeatureTile(title: 'Attendance', icon: Icons.how_to_reg, color: _hubColor, subtitle: '82% avg', onTap: () => context.go('/academic-hub/attendance')),
                HubFeatureTile(title: 'SGPA Calc', icon: Icons.calculate, color: AppColors.accent, subtitle: 'Calc GPA', onTap: () => context.go('/academic-hub/sgpa-calculator')),
                HubFeatureTile(title: 'CGPA Predict', icon: Icons.trending_up, color: AppColors.secondary, subtitle: 'Predict 9.0', onTap: () => context.go('/academic-hub/cgpa-predictor')),
                HubFeatureTile(title: 'Exam Planner', icon: Icons.event_note, color: AppColors.accentOrange, subtitle: '2 exams soon', onTap: () => context.go('/academic-hub/exam-planner')),
                HubFeatureTile(title: 'Timetable', icon: Icons.schedule, color: AppColors.accentPink, subtitle: '5 classes', onTap: () => context.go('/academic-hub/timetable')),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _QuickStat extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  const _QuickStat({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: color.withOpacity(0.3)),
        ),
        child: Column(
          children: [
            Text(value, style: TextStyle(color: color, fontSize: 16, fontWeight: FontWeight.bold)),
            Text(label, style: AppTextStyles.caption),
          ],
        ),
      ),
    );
  }
}
