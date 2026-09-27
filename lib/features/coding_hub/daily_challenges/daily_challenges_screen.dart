import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/widgets/glass_card.dart';
import '../../../core/widgets/gradient_button.dart';
import '../../../core/widgets/custom_app_bar.dart';

class DailyChallengesScreen extends StatefulWidget {
  const DailyChallengesScreen({super.key});

  @override
  State<DailyChallengesScreen> createState() => _DailyChallengesScreenState();
}

class _DailyChallengesScreenState extends State<DailyChallengesScreen> {
  bool _started = false;

  final List<Map<String, dynamic>> _recent = [
    {'date': 'Jun 21', 'title': 'Valid Parentheses', 'difficulty': 'Easy', 'status': 'solved', 'time': '12 min'},
    {'date': 'Jun 20', 'title': 'Merge Intervals', 'difficulty': 'Medium', 'status': 'solved', 'time': '28 min'},
    {'date': 'Jun 19', 'title': 'Binary Tree Paths', 'difficulty': 'Easy', 'status': 'solved', 'time': '18 min'},
    {'date': 'Jun 18', 'title': 'Word Break', 'difficulty': 'Medium', 'status': 'pending', 'time': '–'},
    {'date': 'Jun 17', 'title': 'Longest Substring', 'difficulty': 'Medium', 'status': 'solved', 'time': '22 min'},
    {'date': 'Jun 16', 'title': 'House Robber', 'difficulty': 'Medium', 'status': 'solved', 'time': '35 min'},
    {'date': 'Jun 15', 'title': 'Climbing Stairs', 'difficulty': 'Easy', 'status': 'solved', 'time': '8 min'},
  ];

  Color _diffColor(String diff) {
    switch (diff) {
      case 'Easy': return AppColors.accentGreen;
      case 'Medium': return AppColors.accentOrange;
      case 'Hard': return AppColors.accentRed;
      default: return AppColors.textMuted;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: CustomAppBar(title: 'Daily Challenges', showBack: true),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Streak banner
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [AppColors.accentOrange.withOpacity(0.25), AppColors.accentOrange.withOpacity(0.05)],
                ),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.accentOrange.withOpacity(0.3)),
              ),
              child: Row(
                children: [
                  const Text('🔥', style: TextStyle(fontSize: 40)),
                  const SizedBox(width: 16),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('45 Day Streak!', style: AppTextStyles.headingMedium.copyWith(color: AppColors.accentOrange)),
                      Text('Don\'t break the chain — solve today\'s problem!', style: AppTextStyles.bodySmall),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Daily goal
            GlassCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text('Daily Goal', style: AppTextStyles.titleMedium),
                      const Spacer(),
                      Text('1 / 2 done', style: AppTextStyles.label.copyWith(color: AppColors.accentGreen)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(6),
                    child: LinearProgressIndicator(
                      value: 0.5,
                      minHeight: 8,
                      backgroundColor: AppColors.border,
                      valueColor: const AlwaysStoppedAnimation(AppColors.accentGreen),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text('Solve 1 more problem to complete today\'s goal', style: AppTextStyles.caption),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Today's challenge
            GlassCard(
              borderColor: AppColors.primary.withOpacity(0.5),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          gradient: AppColors.gradientPrimary,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text('TODAY', style: AppTextStyles.caption.copyWith(color: Colors.white, fontWeight: FontWeight.bold)),
                      ),
                      const Spacer(),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.accentGreen.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text('Easy', style: AppTextStyles.caption.copyWith(color: AppColors.accentGreen)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text('Two Sum', style: AppTextStyles.headingSmall),
                  const SizedBox(height: 8),
                  Text('Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.', style: AppTextStyles.body),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    children: ['Array', 'Hash Map'].map((tag) => Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: AppColors.primary.withOpacity(0.3)),
                      ),
                      child: Text(tag, style: AppTextStyles.caption.copyWith(color: AppColors.primary)),
                    )).toList(),
                  ),
                  const SizedBox(height: 16),
                  GradientButton(
                    text: _started ? 'Continue Solving →' : 'Start Challenge',
                    onTap: () => setState(() => _started = true),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            Text('Recent Challenges', style: AppTextStyles.headingSmall),
            const SizedBox(height: 12),
            ..._recent.map((c) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: GlassCard(
                child: Row(
                  children: [
                    Icon(
                      c['status'] == 'solved' ? Icons.check_circle : Icons.radio_button_unchecked,
                      color: c['status'] == 'solved' ? AppColors.accentGreen : AppColors.textMuted,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(c['title'], style: AppTextStyles.titleMedium),
                          Text(c['date'], style: AppTextStyles.caption),
                        ],
                      ),
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: _diffColor(c['difficulty']).withOpacity(0.15),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(c['difficulty'], style: AppTextStyles.caption.copyWith(color: _diffColor(c['difficulty']))),
                        ),
                        const SizedBox(height: 4),
                        Text(c['time'], style: AppTextStyles.caption),
                      ],
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
