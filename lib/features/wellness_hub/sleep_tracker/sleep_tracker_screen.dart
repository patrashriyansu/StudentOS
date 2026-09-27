import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/widgets/glass_card.dart';
import '../../../core/widgets/custom_app_bar.dart';

class SleepTrackerScreen extends StatefulWidget {
  const SleepTrackerScreen({super.key});

  @override
  State<SleepTrackerScreen> createState() => _SleepTrackerScreenState();
}

class _SleepTrackerScreenState extends State<SleepTrackerScreen> {
  TimeOfDay _bedTime = const TimeOfDay(hour: 23, minute: 0);
  TimeOfDay _wakeTime = const TimeOfDay(hour: 6, minute: 30);

  final List<Map<String, dynamic>> _weekData = [
    {'day': 'Mon', 'hours': 7.5, 'quality': 'Good'},
    {'day': 'Tue', 'hours': 6.0, 'quality': 'Fair'},
    {'day': 'Wed', 'hours': 8.0, 'quality': 'Excellent'},
    {'day': 'Thu', 'hours': 5.5, 'quality': 'Poor'},
    {'day': 'Fri', 'hours': 7.0, 'quality': 'Good'},
    {'day': 'Sat', 'hours': 9.0, 'quality': 'Excellent'},
    {'day': 'Sun', 'hours': 7.5, 'quality': 'Good'},
  ];

  double get _avgSleep => _weekData.map((d) => d['hours'] as double).reduce((a, b) => a + b) / _weekData.length;

  Color _qualityColor(String q) {
    switch (q) {
      case 'Excellent': return AppColors.accentGreen;
      case 'Good': return AppColors.accent;
      case 'Fair': return AppColors.accentOrange;
      default: return AppColors.accentRed;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: CustomAppBar(title: 'Sleep Tracker', showBack: true),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Last night summary
            GlassCard(
              gradient: LinearGradient(
                colors: [const Color(0xFF3F51B5).withOpacity(0.25), const Color(0xFF7C4DFF).withOpacity(0.1)],
              ),
              child: Column(
                children: [
                  const Text('🌙', style: TextStyle(fontSize: 40)),
                  const SizedBox(height: 8),
                  Text('Last Night', style: AppTextStyles.titleMedium),
                  const SizedBox(height: 4),
                  Text('7h 30min', style: AppTextStyles.displayLarge.copyWith(color: AppColors.accent)),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.star, color: AppColors.accentOrange, size: 16),
                      const Icon(Icons.star, color: AppColors.accentOrange, size: 16),
                      const Icon(Icons.star, color: AppColors.accentOrange, size: 16),
                      const Icon(Icons.star, color: AppColors.accentOrange, size: 16),
                      const Icon(Icons.star_border, color: AppColors.accentOrange, size: 16),
                      const SizedBox(width: 8),
                      Text('Good', style: AppTextStyles.label.copyWith(color: AppColors.accentOrange)),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Log sleep
            GlassCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Log Tonight\'s Sleep', style: AppTextStyles.titleMedium),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: _TimePickerTile(
                          label: '🌙 Bed Time',
                          time: _bedTime.format(context),
                          onTap: () async {
                            final t = await showTimePicker(context: context, initialTime: _bedTime,
                              builder: (ctx, child) => Theme(data: ThemeData.dark().copyWith(colorScheme: const ColorScheme.dark(primary: AppColors.primary)), child: child!));
                            if (t != null) setState(() => _bedTime = t);
                          },
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _TimePickerTile(
                          label: '☀️ Wake Time',
                          time: _wakeTime.format(context),
                          onTap: () async {
                            final t = await showTimePicker(context: context, initialTime: _wakeTime,
                              builder: (ctx, child) => Theme(data: ThemeData.dark().copyWith(colorScheme: const ColorScheme.dark(primary: AppColors.primary)), child: child!));
                            if (t != null) setState(() => _wakeTime = t);
                          },
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () {},
                      style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                      child: Text('Save Sleep Log', style: AppTextStyles.button),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Weekly chart
            GlassCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text('This Week', style: AppTextStyles.titleMedium),
                      const Spacer(),
                      Text('Avg: ${_avgSleep.toStringAsFixed(1)}h', style: AppTextStyles.label.copyWith(color: AppColors.accent)),
                    ],
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    height: 100,
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                      children: _weekData.map((d) {
                        final h = d['hours'] as double;
                        final color = _qualityColor(d['quality']);
                        return Column(
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            Text('${h.toStringAsFixed(0)}h', style: AppTextStyles.caption.copyWith(color: color)),
                            const SizedBox(height: 4),
                            Container(
                              width: 28,
                              height: (h / 10) * 80,
                              decoration: BoxDecoration(
                                color: color.withOpacity(0.7),
                                borderRadius: const BorderRadius.vertical(top: Radius.circular(6)),
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(d['day'], style: AppTextStyles.caption),
                          ],
                        );
                      }).toList(),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            GlassCard(
              borderColor: AppColors.accent.withOpacity(0.3),
              child: Row(
                children: [
                  const Text('💡', style: TextStyle(fontSize: 24)),
                  const SizedBox(width: 12),
                  Expanded(child: Text(
                    'You averaged ${_avgSleep.toStringAsFixed(1)}h this week. Aim for 7-8h for optimal performance and focus.',
                    style: AppTextStyles.body,
                  )),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TimePickerTile extends StatelessWidget {
  final String label;
  final String time;
  final VoidCallback onTap;
  const _TimePickerTile({required this.label, required this.time, required this.onTap});

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: [
          Text(label, style: AppTextStyles.caption),
          const SizedBox(height: 4),
          Text(time, style: AppTextStyles.titleMedium.copyWith(color: AppColors.accent)),
        ],
      ),
    ),
  );
}
