import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/widgets/glass_card.dart';
import '../../../core/widgets/custom_app_bar.dart';

class ContestTrackerScreen extends StatelessWidget {
  const ContestTrackerScreen({super.key});

  final List<Map<String, dynamic>> _upcoming = const [
    {'name': 'LeetCode Weekly Contest 400', 'platform': 'LeetCode', 'date': 'Jun 23, 8:00 AM', 'duration': '1.5 hrs', 'icon': '🟡', 'registered': true},
    {'name': 'Codeforces Round 952 (Div. 2)', 'platform': 'Codeforces', 'date': 'Jun 25, 11:30 PM', 'duration': '2 hrs', 'icon': '🔵', 'registered': false},
    {'name': 'AtCoder Beginner Contest 360', 'platform': 'AtCoder', 'date': 'Jun 29, 5:30 PM', 'duration': '1.5 hrs', 'icon': '⚫', 'registered': false},
    {'name': 'CodeChef Starters 143', 'platform': 'CodeChef', 'date': 'Jul 3, 8:00 PM', 'duration': '3 hrs', 'icon': '🟤', 'registered': false},
  ];

  final List<Map<String, dynamic>> _past = const [
    {'name': 'LeetCode Weekly 399', 'rank': '1245', 'solved': '3/4', 'rating': '+12'},
    {'name': 'Codeforces Round 951', 'rank': '3456', 'solved': '2/6', 'rating': '-5'},
    {'name': 'LeetCode Biweekly 132', 'rank': '2100', 'solved': '3/4', 'rating': '+18'},
    {'name': 'CodeChef Starters 142', 'rank': '890', 'solved': '4/5', 'rating': '+25'},
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: CustomAppBar(title: 'Contest Tracker', showBack: true),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Stats row
            Row(
              children: [
                Expanded(child: _StatTile(label: 'Contests', value: '24', color: AppColors.primary)),
                const SizedBox(width: 10),
                Expanded(child: _StatTile(label: 'Best Rank', value: '456', color: AppColors.accentGreen)),
                const SizedBox(width: 10),
                Expanded(child: _StatTile(label: 'Rating Δ', value: '+50', color: AppColors.accentOrange)),
              ],
            ),
            const SizedBox(height: 20),

            Text('📅 Upcoming Contests', style: AppTextStyles.headingSmall),
            const SizedBox(height: 12),
            ..._upcoming.map((c) => Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: GlassCard(
                borderColor: c['registered'] ? AppColors.primary.withOpacity(0.5) : AppColors.border,
                child: Row(
                  children: [
                    Text(c['icon'], style: const TextStyle(fontSize: 28)),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(c['name'], style: AppTextStyles.titleMedium, maxLines: 1, overflow: TextOverflow.ellipsis),
                          const SizedBox(height: 4),
                          Text('${c['date']} • ${c['duration']}', style: AppTextStyles.caption),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    TextButton(
                      onPressed: () {},
                      style: TextButton.styleFrom(
                        backgroundColor: c['registered']
                            ? AppColors.accentGreen.withOpacity(0.15)
                            : AppColors.primary.withOpacity(0.15),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      ),
                      child: Text(
                        c['registered'] ? 'Registered ✓' : 'Register',
                        style: TextStyle(
                          color: c['registered'] ? AppColors.accentGreen : AppColors.primary,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            )),

            const SizedBox(height: 20),
            Text('📊 Past Performance', style: AppTextStyles.headingSmall),
            const SizedBox(height: 12),
            ..._past.map((c) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: GlassCard(
                child: Row(
                  children: [
                    Expanded(child: Text(c['name'], style: AppTextStyles.titleMedium, maxLines: 1, overflow: TextOverflow.ellipsis)),
                    const SizedBox(width: 8),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text('Rank #${c['rank']}', style: AppTextStyles.label.copyWith(color: AppColors.accent)),
                        Text('${c['solved']} solved', style: AppTextStyles.caption),
                      ],
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: c['rating'].startsWith('+')
                            ? AppColors.accentGreen.withOpacity(0.15)
                            : AppColors.accentRed.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        c['rating'],
                        style: AppTextStyles.caption.copyWith(
                          color: c['rating'].startsWith('+') ? AppColors.accentGreen : AppColors.accentRed,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            )),
          ],
        ),
      ),
    );
  }
}

class _StatTile extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  const _StatTile({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 14),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        children: [
          Text(value, style: TextStyle(color: color, fontSize: 20, fontWeight: FontWeight.bold)),
          Text(label, style: AppTextStyles.caption),
        ],
      ),
    );
  }
}
