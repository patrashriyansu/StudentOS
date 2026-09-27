import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/widgets/glass_card.dart';
import '../../core/widgets/hub_feature_tile.dart';
import '../../core/widgets/custom_app_bar.dart';

class PlacementHubScreen extends StatelessWidget {
  const PlacementHubScreen({super.key});

  static const Color _hubColor = Color(0xFFCE93D8);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: CustomAppBar(title: 'Placement Hub', showBack: true),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Readiness card
            GlassCard(
              gradient: LinearGradient(
                colors: [_hubColor.withOpacity(0.25), _hubColor.withOpacity(0.05)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderColor: _hubColor.withOpacity(0.4),
              child: Row(
                children: [
                  Stack(
                    alignment: Alignment.center,
                    children: [
                      SizedBox(
                        width: 80,
                        height: 80,
                        child: CircularProgressIndicator(
                          value: 0.78,
                          strokeWidth: 8,
                          backgroundColor: AppColors.border,
                          valueColor: AlwaysStoppedAnimation(_hubColor),
                        ),
                      ),
                      Column(
                        children: [
                          Text('78%', style: TextStyle(color: _hubColor, fontSize: 18, fontWeight: FontWeight.bold)),
                          Text('Ready', style: AppTextStyles.caption),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(width: 20),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Placement Ready 💼', style: AppTextStyles.headingSmall),
                        const SizedBox(height: 4),
                        Text('Focus on DSA & Projects to reach 85%', style: AppTextStyles.bodySmall),
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            _Tag(label: '8-12 LPA', color: _hubColor),
                            const SizedBox(width: 8),
                            _Tag(label: 'SDE Role', color: AppColors.accent),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            GridView.count(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisCount: 2,
              mainAxisSpacing: 12,
              crossAxisSpacing: 12,
              childAspectRatio: 1.2,
              children: [
                HubFeatureTile(title: 'Resume Analyzer', icon: Icons.description, color: _hubColor, subtitle: 'ATS: 86/100', onTap: () => context.go('/placement-hub/resume-analyzer')),
                HubFeatureTile(title: 'Mock Interview', icon: Icons.mic, color: AppColors.accent, subtitle: 'Last: 82%', onTap: () => context.go('/placement-hub/mock-interview')),
                HubFeatureTile(title: 'ATS Score', icon: Icons.score, color: AppColors.accentGreen, subtitle: 'Check score', onTap: () => context.go('/placement-hub/ats-score')),
                HubFeatureTile(title: 'Find Internship', icon: Icons.work, color: AppColors.accentOrange, subtitle: '12 matches', onTap: () => context.go('/placement-hub/internship-finder')),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _Tag extends StatelessWidget {
  final String label;
  final Color color;
  const _Tag({required this.label, required this.color});

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
    decoration: BoxDecoration(
      color: color.withOpacity(0.15),
      borderRadius: BorderRadius.circular(8),
      border: Border.all(color: color.withOpacity(0.4)),
    ),
    child: Text(label, style: AppTextStyles.caption.copyWith(color: color)),
  );
}
