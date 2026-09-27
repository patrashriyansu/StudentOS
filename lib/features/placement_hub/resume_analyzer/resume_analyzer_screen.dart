import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/widgets/glass_card.dart';
import '../../../core/widgets/gradient_button.dart';
import '../../../core/widgets/custom_app_bar.dart';

class ResumeAnalyzerScreen extends StatefulWidget {
  const ResumeAnalyzerScreen({super.key});

  @override
  State<ResumeAnalyzerScreen> createState() => _ResumeAnalyzerScreenState();
}

class _ResumeAnalyzerScreenState extends State<ResumeAnalyzerScreen> with TickerProviderStateMixin {
  bool _uploaded = false;
  bool _analyzing = false;
  late AnimationController _scoreController;

  @override
  void initState() {
    super.initState();
    _scoreController = AnimationController(vsync: this, duration: const Duration(milliseconds: 1500));
  }

  @override
  void dispose() {
    _scoreController.dispose();
    super.dispose();
  }

  void _simulateUpload() async {
    setState(() => _analyzing = true);
    await Future.delayed(const Duration(seconds: 2));
    setState(() { _analyzing = false; _uploaded = true; });
    _scoreController.forward();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: CustomAppBar(title: 'Resume Analyzer', showBack: true),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (!_uploaded) ...[
              // Upload area
              GestureDetector(
                onTap: _analyzing ? null : _simulateUpload,
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 300),
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 48, horizontal: 24),
                  decoration: BoxDecoration(
                    color: AppColors.card,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: _analyzing ? AppColors.primary : AppColors.borderLight,
                      width: 2,
                      style: BorderStyle.solid,
                    ),
                  ),
                  child: Column(
                    children: [
                      _analyzing
                          ? const CircularProgressIndicator(valueColor: AlwaysStoppedAnimation(AppColors.primary))
                          : const Icon(Icons.cloud_upload_outlined, color: AppColors.primary, size: 56),
                      const SizedBox(height: 16),
                      Text(
                        _analyzing ? 'Analyzing your resume with AI...' : 'Upload Resume PDF',
                        style: AppTextStyles.titleLarge,
                        textAlign: TextAlign.center,
                      ),
                      if (!_analyzing) ...[
                        const SizedBox(height: 8),
                        Text('Tap to browse or drop your PDF here', style: AppTextStyles.body),
                        const SizedBox(height: 16),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          decoration: BoxDecoration(
                            gradient: AppColors.gradientPrimary,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text('Choose File', style: AppTextStyles.button),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ] else ...[
              // ATS Score
              GlassCard(
                child: Column(
                  children: [
                    Text('ATS Score', style: AppTextStyles.titleMedium),
                    const SizedBox(height: 16),
                    AnimatedBuilder(
                      animation: _scoreController,
                      builder: (_, __) {
                        final progress = Curves.easeOutCubic.transform(_scoreController.value);
                        final score = (86 * progress).toInt();
                        return Stack(
                          alignment: Alignment.center,
                          children: [
                            SizedBox(
                              width: 120,
                              height: 120,
                              child: CircularProgressIndicator(
                                value: progress * 0.86,
                                strokeWidth: 12,
                                backgroundColor: AppColors.border,
                                valueColor: AlwaysStoppedAnimation(
                                  score >= 80 ? AppColors.accentGreen : AppColors.accentOrange,
                                ),
                              ),
                            ),
                            Column(
                              children: [
                                Text('$score', style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: AppColors.accentGreen)),
                                Text('/100', style: AppTextStyles.caption),
                              ],
                            ),
                          ],
                        );
                      },
                    ),
                    const SizedBox(height: 8),
                    Text('🎯 Strong ATS performance! Minor improvements needed.', style: AppTextStyles.bodySmall, textAlign: TextAlign.center),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Missing Keywords
              GlassCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.warning_amber, color: AppColors.accentOrange, size: 20),
                        const SizedBox(width: 8),
                        Text('Missing Keywords', style: AppTextStyles.titleMedium),
                      ],
                    ),
                    const SizedBox(height: 12),
                    ...['Docker', 'AWS', 'REST API', 'Kubernetes'].map((kw) => Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Row(
                        children: [
                          Container(
                            width: 8, height: 8,
                            decoration: const BoxDecoration(color: AppColors.accentOrange, shape: BoxShape.circle),
                          ),
                          const SizedBox(width: 10),
                          Text(kw, style: AppTextStyles.body),
                          const Spacer(),
                          GestureDetector(
                            onTap: () {},
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: AppColors.primary.withOpacity(0.15),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text('+ Add', style: AppTextStyles.caption.copyWith(color: AppColors.primary)),
                            ),
                          ),
                        ],
                      ),
                    )),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Suggestions
              GlassCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.lightbulb, color: AppColors.accent, size: 20),
                        const SizedBox(width: 8),
                        Text('AI Suggestions', style: AppTextStyles.titleMedium),
                      ],
                    ),
                    const SizedBox(height: 12),
                    ...[
                      'Improve project descriptions with quantifiable metrics (e.g., reduced load time by 40%)',
                      'Add a dedicated Technical Skills section',
                      'Include your GitHub profile link',
                      'Use stronger action verbs: Developed, Architected, Optimized',
                    ].asMap().entries.map((e) => Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            margin: const EdgeInsets.only(top: 5),
                            width: 20, height: 20,
                            decoration: BoxDecoration(
                              color: AppColors.accent.withOpacity(0.15),
                              shape: BoxShape.circle,
                            ),
                            child: Center(child: Text('${e.key + 1}', style: AppTextStyles.caption.copyWith(color: AppColors.accent))),
                          ),
                          const SizedBox(width: 10),
                          Expanded(child: Text(e.value, style: AppTextStyles.body)),
                        ],
                      ),
                    )),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Strengths
              GlassCard(
                borderColor: AppColors.accentGreen.withOpacity(0.4),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.check_circle, color: AppColors.accentGreen, size: 20),
                        const SizedBox(width: 8),
                        Text('Strengths', style: AppTextStyles.titleMedium),
                      ],
                    ),
                    const SizedBox(height: 12),
                    ...['Good use of action verbs throughout', 'Clear and consistent formatting', 'Relevant project experience listed'].map((s) => Padding(
                      padding: const EdgeInsets.only(bottom: 6),
                      child: Row(
                        children: [
                          const Icon(Icons.check, color: AppColors.accentGreen, size: 16),
                          const SizedBox(width: 8),
                          Expanded(child: Text(s, style: AppTextStyles.body)),
                        ],
                      ),
                    )),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              GradientButton(text: '📥 Download Report', onTap: () {}),
            ],
          ],
        ),
      ),
    );
  }
}
