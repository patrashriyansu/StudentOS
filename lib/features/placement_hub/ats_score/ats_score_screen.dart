import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/widgets/glass_card.dart';
import '../../../core/widgets/custom_app_bar.dart';

class AtsScoreScreen extends StatefulWidget {
  const AtsScoreScreen({super.key});

  @override
  State<AtsScoreScreen> createState() => _AtsScoreScreenState();
}

class _AtsScoreScreenState extends State<AtsScoreScreen> with TickerProviderStateMixin {
  final _jobDescController = TextEditingController();
  bool _analyzed = false;
  late AnimationController _scoreAnim;

  @override
  void initState() {
    super.initState();
    _scoreAnim = AnimationController(vsync: this, duration: const Duration(milliseconds: 1200));
  }

  @override
  void dispose() {
    _scoreAnim.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: CustomAppBar(title: 'ATS Score Checker', showBack: true),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            GlassCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Paste Job Description', style: AppTextStyles.titleMedium),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _jobDescController,
                    maxLines: 6,
                    style: const TextStyle(color: Colors.white),
                    decoration: const InputDecoration(
                      hintText: 'Paste the job description here to check your resume match score...',
                    ),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () {
                        setState(() => _analyzed = true);
                        _scoreAnim.forward(from: 0);
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: Text('Check ATS Match', style: AppTextStyles.button),
                    ),
                  ),
                ],
              ),
            ),

            if (_analyzed) ...[
              const SizedBox(height: 20),
              AnimatedBuilder(
                animation: _scoreAnim,
                builder: (_, __) {
                  final p = Curves.easeOut.transform(_scoreAnim.value);
                  final score = (76 * p).toInt();
                  return GlassCard(
                    child: Column(
                      children: [
                        Text('Match Score', style: AppTextStyles.titleMedium),
                        const SizedBox(height: 16),
                        Stack(
                          alignment: Alignment.center,
                          children: [
                            SizedBox(
                              width: 120, height: 120,
                              child: CircularProgressIndicator(
                                value: p * 0.76,
                                strokeWidth: 12,
                                backgroundColor: AppColors.border,
                                valueColor: AlwaysStoppedAnimation(score > 70 ? AppColors.accentGreen : AppColors.accentOrange),
                              ),
                            ),
                            Column(
                              children: [
                                Text('$score%', style: TextStyle(color: score > 70 ? AppColors.accentGreen : AppColors.accentOrange, fontSize: 28, fontWeight: FontWeight.bold)),
                                Text('Match', style: AppTextStyles.caption),
                              ],
                            ),
                          ],
                        ),
                      ],
                    ),
                  );
                },
              ),
              const SizedBox(height: 16),
              GlassCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Matched Keywords ✅', style: AppTextStyles.titleMedium.copyWith(color: AppColors.accentGreen)),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8, runSpacing: 8,
                      children: ['Python', 'React', 'Git', 'SQL', 'Agile', 'Node.js'].map((k) => Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: AppColors.accentGreen.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: AppColors.accentGreen.withOpacity(0.4)),
                        ),
                        child: Text(k, style: AppTextStyles.caption.copyWith(color: AppColors.accentGreen)),
                      )).toList(),
                    ),
                    const SizedBox(height: 16),
                    Text('Missing Keywords ⚠️', style: AppTextStyles.titleMedium.copyWith(color: AppColors.accentOrange)),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8, runSpacing: 8,
                      children: ['Docker', 'AWS', 'Kubernetes', 'CI/CD'].map((k) => Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: AppColors.accentOrange.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: AppColors.accentOrange.withOpacity(0.4)),
                        ),
                        child: Text(k, style: AppTextStyles.caption.copyWith(color: AppColors.accentOrange)),
                      )).toList(),
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
