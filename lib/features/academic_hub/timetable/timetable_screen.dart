import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/widgets/custom_app_bar.dart';

class TimetableScreen extends StatefulWidget {
  const TimetableScreen({super.key});

  @override
  State<TimetableScreen> createState() => _TimetableScreenState();
}

class _TimetableScreenState extends State<TimetableScreen> {
  int _selectedDay = 0;
  final List<String> _days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  final Map<int, List<Map<String, dynamic>>> _schedule = {
    0: [
      {'time': '9:00 AM', 'subject': 'Operating Systems', 'room': 'Room 301', 'color': Color(0xFF4FC3F7), 'duration': '1h', 'isCurrent': true},
      {'time': '11:00 AM', 'subject': 'DBMS Lab', 'room': 'Lab 2', 'color': Color(0xFF81C784), 'duration': '2h', 'isCurrent': false},
      {'time': '2:00 PM', 'subject': 'Data Structures', 'room': 'Room 205', 'color': Color(0xFFFFB74D), 'duration': '1h', 'isCurrent': false},
      {'time': '4:00 PM', 'subject': 'Free Period', 'room': '–', 'color': Color(0xFF6B6B8A), 'duration': '1h', 'isCurrent': false},
    ],
    1: [
      {'time': '10:00 AM', 'subject': 'Computer Networks', 'room': 'Room 102', 'color': Color(0xFFCE93D8), 'duration': '1h', 'isCurrent': false},
      {'time': '12:00 PM', 'subject': 'OS Lab', 'room': 'Lab 3', 'color': Color(0xFF4FC3F7), 'duration': '2h', 'isCurrent': false},
      {'time': '3:00 PM', 'subject': 'Mathematics', 'room': 'Room 401', 'color': Color(0xFFEF9A9A), 'duration': '1h', 'isCurrent': false},
    ],
    2: [
      {'time': '9:00 AM', 'subject': 'DBMS', 'room': 'Room 301', 'color': Color(0xFF81C784), 'duration': '1h', 'isCurrent': false},
      {'time': '11:00 AM', 'subject': 'Data Structures Lab', 'room': 'Lab 1', 'color': Color(0xFFFFB74D), 'duration': '2h', 'isCurrent': false},
      {'time': '2:00 PM', 'subject': 'Computer Networks', 'room': 'Room 102', 'color': Color(0xFFCE93D8), 'duration': '1h', 'isCurrent': false},
    ],
    3: [
      {'time': '10:00 AM', 'subject': 'Operating Systems', 'room': 'Room 301', 'color': Color(0xFF4FC3F7), 'duration': '1h', 'isCurrent': false},
      {'time': '2:00 PM', 'subject': 'Mathematics', 'room': 'Room 401', 'color': Color(0xFFEF9A9A), 'duration': '1h', 'isCurrent': false},
    ],
    4: [
      {'time': '9:00 AM', 'subject': 'DBMS', 'room': 'Room 203', 'color': Color(0xFF81C784), 'duration': '1h', 'isCurrent': false},
      {'time': '11:00 AM', 'subject': 'CN Lab', 'room': 'Lab 4', 'color': Color(0xFFCE93D8), 'duration': '2h', 'isCurrent': false},
      {'time': '3:00 PM', 'subject': 'Data Structures', 'room': 'Room 205', 'color': Color(0xFFFFB74D), 'duration': '1h', 'isCurrent': false},
    ],
    5: [
      {'time': '10:00 AM', 'subject': 'Project Work', 'room': 'Lab 5', 'color': Color(0xFF6C63FF), 'duration': '3h', 'isCurrent': false},
    ],
  };

  @override
  Widget build(BuildContext context) {
    final todaySchedule = _schedule[_selectedDay] ?? [];

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: CustomAppBar(title: 'Timetable', showBack: true),
      floatingActionButton: FloatingActionButton(
        backgroundColor: AppColors.primary,
        onPressed: () {},
        child: const Icon(Icons.add, color: Colors.white),
      ),
      body: Column(
        children: [
          // Day Selector
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: List.generate(_days.length, (i) {
                final isSelected = i == _selectedDay;
                return Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _selectedDay = i),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 250),
                      margin: const EdgeInsets.symmetric(horizontal: 3),
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      decoration: BoxDecoration(
                        gradient: isSelected ? AppColors.gradientPrimary : null,
                        color: isSelected ? null : AppColors.surface,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isSelected ? Colors.transparent : AppColors.border,
                        ),
                      ),
                      child: Text(
                        _days[i],
                        textAlign: TextAlign.center,
                        style: AppTextStyles.bodySmall.copyWith(
                          color: isSelected ? Colors.white : AppColors.textMuted,
                          fontWeight: isSelected ? FontWeight.w700 : FontWeight.normal,
                        ),
                      ),
                    ),
                  ),
                );
              }),
            ),
          ),
          const SizedBox(height: 8),

          // Schedule List
          Expanded(
            child: todaySchedule.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.free_breakfast, color: AppColors.textMuted, size: 48),
                        const SizedBox(height: 12),
                        Text('No classes today! 🎉', style: AppTextStyles.titleMedium),
                        Text('Enjoy your free day', style: AppTextStyles.body),
                      ],
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: todaySchedule.length,
                    itemBuilder: (context, i) {
                      final slot = todaySchedule[i];
                      return _buildTimeSlot(slot, i == todaySchedule.length - 1);
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildTimeSlot(Map<String, dynamic> slot, bool isLast) {
    final color = slot['color'] as Color;
    final isCurrent = slot['isCurrent'] as bool;

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Timeline
          SizedBox(
            width: 72,
            child: Column(
              children: [
                Text(slot['time'], style: AppTextStyles.caption.copyWith(color: AppColors.textMuted)),
                const SizedBox(height: 4),
                Container(width: 2, color: AppColors.border, height: double.infinity),
              ],
            ),
          ),
          const SizedBox(width: 12),

          // Card
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.card,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: isCurrent ? color : AppColors.border,
                    width: isCurrent ? 2 : 1,
                  ),
                  boxShadow: isCurrent
                      ? [BoxShadow(color: color.withOpacity(0.25), blurRadius: 12, offset: const Offset(0, 4))]
                      : null,
                ),
                child: Row(
                  children: [
                    Container(
                      width: 4,
                      height: 40,
                      decoration: BoxDecoration(
                        color: color,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(child: Text(slot['subject'], style: AppTextStyles.titleMedium)),
                              if (isCurrent)
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: AppColors.accentGreen.withOpacity(0.2),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Container(width: 6, height: 6, decoration: const BoxDecoration(color: AppColors.accentGreen, shape: BoxShape.circle)),
                                      const SizedBox(width: 4),
                                      Text('Now', style: AppTextStyles.caption.copyWith(color: AppColors.accentGreen)),
                                    ],
                                  ),
                                ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              Icon(Icons.location_on, size: 12, color: color),
                              const SizedBox(width: 4),
                              Text(slot['room'], style: AppTextStyles.caption.copyWith(color: AppColors.textMuted)),
                              const SizedBox(width: 12),
                              Icon(Icons.schedule, size: 12, color: AppColors.textMuted),
                              const SizedBox(width: 4),
                              Text(slot['duration'], style: AppTextStyles.caption.copyWith(color: AppColors.textMuted)),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
