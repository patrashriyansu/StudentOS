import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/widgets/glass_card.dart';
import '../../../core/widgets/custom_app_bar.dart';

class MeditationScreen extends StatefulWidget {
  const MeditationScreen({super.key});

  @override
  State<MeditationScreen> createState() => _MeditationScreenState();
}

class _MeditationScreenState extends State<MeditationScreen> with TickerProviderStateMixin {
  int _selectedDuration = 5;
  bool _isPlaying = false;
  late AnimationController _breathController;
  late AnimationController _glowController;

  @override
  void initState() {
    super.initState();
    _breathController = AnimationController(vsync: this, duration: const Duration(seconds: 4))..repeat(reverse: true);
    _glowController = AnimationController(vsync: this, duration: const Duration(seconds: 2))..repeat(reverse: true);
  }

  @override
  void dispose() {
    _breathController.dispose();
    _glowController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: CustomAppBar(title: 'Meditation', showBack: true),
      body: SingleChildScrollView(
        child: Column(
          children: [
            // Ambient background + circle
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 40),
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  center: Alignment.center,
                  radius: 1.0,
                  colors: [
                    const Color(0xFF6C63FF).withOpacity(0.3),
                    AppColors.background,
                  ],
                ),
              ),
              child: Column(
                children: [
                  // Duration selector
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [5, 10, 15, 20].map((d) {
                      final sel = d == _selectedDuration;
                      return GestureDetector(
                        onTap: () => setState(() => _selectedDuration = d),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          margin: const EdgeInsets.symmetric(horizontal: 6),
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          decoration: BoxDecoration(
                            gradient: sel ? AppColors.gradientPrimary : null,
                            color: sel ? null : AppColors.surface,
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: sel ? Colors.transparent : AppColors.border),
                          ),
                          child: Text('${d}m', style: AppTextStyles.label.copyWith(color: Colors.white)),
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 48),

                  // Breathing animation circle
                  AnimatedBuilder(
                    animation: _breathController,
                    builder: (_, child) {
                      final scale = 0.7 + 0.3 * _breathController.value;
                      return AnimatedBuilder(
                        animation: _glowController,
                        builder: (_, __) => Container(
                          width: 200 * scale,
                          height: 200 * scale,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            gradient: RadialGradient(
                              colors: [
                                AppColors.primary.withOpacity(0.6),
                                AppColors.secondary.withOpacity(0.3),
                                Colors.transparent,
                              ],
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: AppColors.primary.withOpacity(0.3 + 0.2 * _glowController.value),
                                blurRadius: 40,
                                spreadRadius: 10,
                              ),
                            ],
                          ),
                          child: Center(
                            child: Text(
                              _isPlaying
                                  ? (_breathController.value > 0.5 ? 'Breathe in...' : 'Breathe out...')
                                  : '🧘',
                              style: _isPlaying
                                  ? AppTextStyles.label.copyWith(color: Colors.white)
                                  : const TextStyle(fontSize: 48),
                              textAlign: TextAlign.center,
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 32),

                  if (_isPlaying)
                    Text('${_selectedDuration}:00 remaining', style: AppTextStyles.headingMedium),
                  const SizedBox(height: 16),

                  // Play / Pause button
                  GestureDetector(
                    onTap: () => setState(() => _isPlaying = !_isPlaying),
                    child: Container(
                      width: 72,
                      height: 72,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: AppColors.gradientPrimary,
                        boxShadow: [BoxShadow(color: AppColors.primary.withOpacity(0.4), blurRadius: 20)],
                      ),
                      child: Icon(_isPlaying ? Icons.pause : Icons.play_arrow, color: Colors.white, size: 36),
                    ),
                  ),
                ],
              ),
            ),

            // Stats
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Streak
                  GlassCard(
                    child: Row(
                      children: [
                        const Text('🔥', style: TextStyle(fontSize: 32)),
                        const SizedBox(width: 12),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('7 Day Streak!', style: AppTextStyles.titleMedium),
                            Text('Keep meditating daily for mental clarity', style: AppTextStyles.bodySmall),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),

                  Text('Recent Sessions', style: AppTextStyles.titleMedium),
                  const SizedBox(height: 8),
                  ...['Jun 22 • 10 min • Focus', 'Jun 21 • 5 min • Calm', 'Jun 20 • 15 min • Sleep'].map((s) {
                    final parts = s.split(' • ');
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: GlassCard(
                        child: Row(
                          children: [
                            const Icon(Icons.self_improvement, color: AppColors.primary),
                            const SizedBox(width: 12),
                            Expanded(child: Text(parts[0], style: AppTextStyles.body)),
                            Text(parts[1], style: AppTextStyles.label.copyWith(color: AppColors.accent)),
                            const SizedBox(width: 12),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(color: AppColors.primary.withOpacity(0.1), borderRadius: BorderRadius.circular(6)),
                              child: Text(parts[2], style: AppTextStyles.caption.copyWith(color: AppColors.primary)),
                            ),
                          ],
                        ),
                      ),
                    );
                  }),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
