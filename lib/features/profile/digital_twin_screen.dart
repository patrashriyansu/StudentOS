import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/widgets/glass_card.dart';
import '../../core/widgets/gradient_button.dart';
import '../../core/widgets/custom_app_bar.dart';

class DigitalTwinScreen extends StatefulWidget {
  const DigitalTwinScreen({super.key});

  @override
  State<DigitalTwinScreen> createState() => _DigitalTwinScreenState();
}

class _DigitalTwinScreenState extends State<DigitalTwinScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _progressAnim;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 1500));
    _progressAnim =
        Tween<double>(begin: 0, end: 0.78).animate(CurvedAnimation(
      parent: _controller,
      curve: Curves.easeOutCubic,
    ));
    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  final List<Map<String, dynamic>> _skills = [
    {'label': 'DSA', 'value': 0.72},
    {'label': 'DBMS', 'value': 0.68},
    {'label': 'OS', 'value': 0.75},
    {'label': 'Comms', 'value': 0.80},
    {'label': 'Projects', 'value': 0.65},
    {'label': 'Aptitude', 'value': 0.70},
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: CustomAppBar(title: 'Student Digital Twin 🤖', showBack: true),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Main readiness card
            GlassCard(
              gradient: LinearGradient(
                colors: [
                  AppColors.primary.withOpacity(0.25),
                  AppColors.secondary.withOpacity(0.1)
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderColor: AppColors.primary.withOpacity(0.4),
              child: Column(
                children: [
                  Text('Placement Readiness', style: AppTextStyles.titleMedium),
                  const SizedBox(height: 20),
                  AnimatedBuilder(
                    animation: _progressAnim,
                    builder: (_, __) => SizedBox(
                      width: 160,
                      height: 160,
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          SizedBox.expand(
                            child: CircularProgressIndicator(
                              value: _progressAnim.value,
                              strokeWidth: 14,
                              backgroundColor: AppColors.border,
                              valueColor: const AlwaysStoppedAnimation(
                                  AppColors.primary),
                            ),
                          ),
                          Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                '${(_progressAnim.value * 100).toInt()}%',
                                style: TextStyle(
                                  fontSize: 38,
                                  fontWeight: FontWeight.bold,
                                  foreground: Paint()
                                    ..shader =
                                        const LinearGradient(colors: [
                                      AppColors.primary,
                                      AppColors.secondary
                                    ]).createShader(
                                            const Rect.fromLTWH(0, 0, 120, 60)),
                                ),
                              ),
                              Text('Ready', style: AppTextStyles.body),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      _TwinStat(
                          label: 'Expected\nPackage',
                          value: '8–12 LPA',
                          color: AppColors.accentGreen),
                      Container(
                          width: 1, height: 40, color: AppColors.border),
                      _TwinStat(
                          label: '9+ SGPA\nChance',
                          value: '82%',
                          color: AppColors.accent),
                      Container(
                          width: 1, height: 40, color: AppColors.border),
                      _TwinStat(
                          label: 'Internship\nChances',
                          value: '85%',
                          color: AppColors.secondary),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Prediction cards
            Row(
              children: [
                Expanded(
                  child: GlassCard(
                    borderColor: AppColors.accentGreen.withOpacity(0.4),
                    child: Column(
                      children: [
                        const Text('💼', style: TextStyle(fontSize: 28)),
                        const SizedBox(height: 8),
                        Text('Expected Package',
                            style: AppTextStyles.caption,
                            textAlign: TextAlign.center),
                        const SizedBox(height: 4),
                        Text('8–12 LPA',
                            style: AppTextStyles.titleLarge
                                .copyWith(color: AppColors.accentGreen)),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: GlassCard(
                    borderColor: AppColors.accent.withOpacity(0.4),
                    child: Column(
                      children: [
                        const Text('🎓', style: TextStyle(fontSize: 28)),
                        const SizedBox(height: 8),
                        Text('9+ SGPA Prob.',
                            style: AppTextStyles.caption,
                            textAlign: TextAlign.center),
                        const SizedBox(height: 4),
                        Text('82%',
                            style: AppTextStyles.titleLarge
                                .copyWith(color: AppColors.accent)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Skills radar (manual bars)
            GlassCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Skills Profile', style: AppTextStyles.titleMedium),
                  const SizedBox(height: 14),
                  ..._skills.map((s) => Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: Row(
                          children: [
                            SizedBox(
                                width: 70,
                                child: Text(s['label'],
                                    style: AppTextStyles.body)),
                            Expanded(
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(6),
                                child: TweenAnimationBuilder<double>(
                                  tween: Tween(
                                      begin: 0, end: s['value'] as double),
                                  duration:
                                      const Duration(milliseconds: 1000),
                                  curve: Curves.easeOutCubic,
                                  builder: (_, v, __) =>
                                      LinearProgressIndicator(
                                    value: v,
                                    minHeight: 10,
                                    backgroundColor: AppColors.border,
                                    valueColor:
                                        AlwaysStoppedAnimation(AppColors
                                            .gradientPrimary.colors.first),
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                                '${((s['value'] as double) * 100).toInt()}%',
                                style: AppTextStyles.label
                                    .copyWith(color: AppColors.primary)),
                          ],
                        ),
                      )),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // AI Growth Plan
            GlassCard(
              borderColor: AppColors.primary.withOpacity(0.4),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Text('🤖', style: TextStyle(fontSize: 24)),
                      const SizedBox(width: 10),
                      Text('AI Growth Plan', style: AppTextStyles.titleMedium),
                    ],
                  ),
                  const SizedBox(height: 12),
                  ...[
                    '🎯 Focus on Graphs & DP → +5% readiness',
                    '📄 Add 1 more project with metrics → +3%',
                    '🏆 Participate in 2 more contests → +2%',
                    '📝 Complete DBMS mock tests → +3%',
                  ].map((tip) => Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const SizedBox(width: 4),
                            Expanded(
                                child: Text(tip, style: AppTextStyles.body)),
                          ],
                        ),
                      )),
                  const SizedBox(height: 12),
                  Text(
                    'Following this plan could raise your readiness to 91% by next semester.',
                    style: AppTextStyles.bodySmall
                        .copyWith(color: AppColors.primary),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            GradientButton(
              text: '📊 View Detailed Analytics',
              onTap: () {},
            ),
          ],
        ),
      ),
    );
  }
}

class _TwinStat extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  const _TwinStat(
      {required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) => Column(
        children: [
          Text(value,
              style: TextStyle(
                  color: color, fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 4),
          Text(label,
              style: AppTextStyles.caption, textAlign: TextAlign.center),
        ],
      );
}
