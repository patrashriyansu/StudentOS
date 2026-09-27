import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/widgets/hub_feature_tile.dart';
import '../../core/widgets/custom_app_bar.dart';
import '../../core/widgets/section_header.dart';

class CodingHubScreen extends StatelessWidget {
  const CodingHubScreen({super.key});

  static const Color _hubColor = Color(0xFFFFB74D);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: CustomAppBar(title: 'Coding Hub', showBack: true),
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
                      const Text('💻', style: TextStyle(fontSize: 36)),
                      const SizedBox(width: 12),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Coding Hub', style: AppTextStyles.headingMedium),
                          Text('Level Up Your Skills', style: AppTextStyles.body),
                        ],
                      ),
                      const Spacer(),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: _hubColor.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: _hubColor.withOpacity(0.5)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Text('🔥', style: TextStyle(fontSize: 16)),
                            const SizedBox(width: 4),
                            Text('45 Days', style: AppTextStyles.label.copyWith(color: _hubColor)),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  // LeetCode summary
                  Row(
                    children: [
                      _LCStatChip(label: 'Easy', value: '150', color: AppColors.accentGreen),
                      const SizedBox(width: 8),
                      _LCStatChip(label: 'Medium', value: '80', color: _hubColor),
                      const SizedBox(width: 8),
                      _LCStatChip(label: 'Hard', value: '20', color: AppColors.accentRed),
                      const SizedBox(width: 8),
                      _LCStatChip(label: 'Total', value: '250', color: AppColors.primary),
                    ],
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
                HubFeatureTile(title: 'LeetCode Tracker', icon: Icons.code, color: _hubColor, subtitle: '250 solved', onTap: () => context.go('/coding-hub/leetcode-tracker')),
                HubFeatureTile(title: 'Daily Challenge', icon: Icons.flash_on, color: AppColors.accentGreen, subtitle: 'Today: Easy', onTap: () => context.go('/coding-hub/daily-challenges')),
                HubFeatureTile(title: 'DSA Roadmap', icon: Icons.account_tree, color: AppColors.primary, subtitle: '40% done', onTap: () => context.go('/coding-hub/dsa-roadmap')),
                HubFeatureTile(title: 'Contests', icon: Icons.emoji_events, color: AppColors.secondary, subtitle: '2 upcoming', onTap: () => context.go('/coding-hub/contest-tracker')),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _LCStatChip extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  const _LCStatChip({required this.label, required this.value, required this.color});

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
            Text(value, style: TextStyle(color: color, fontSize: 14, fontWeight: FontWeight.bold)),
            Text(label, style: AppTextStyles.caption),
          ],
        ),
      ),
    );
  }
}
