import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/widgets/custom_app_bar.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  String _selectedFilter = 'All';

  final List<Map<String, dynamic>> _notifications = [
    {'icon': '⚠️', 'title': 'Attendance Alert', 'body': 'CN attendance below 65%! Attend next 3 classes to avoid shortage.', 'time': '2h ago', 'category': 'Academic', 'read': false, 'color': Color(0xFFFF5252)},
    {'icon': '🔥', 'title': 'LeetCode Streak', 'body': 'Day 45 maintained! Solve today\'s problem to keep the streak going.', 'time': '5h ago', 'category': 'Coding', 'read': false, 'color': Color(0xFFFFB74D)},
    {'icon': '📚', 'title': 'Exam Reminder', 'body': 'Operating Systems exam is in 3 days. Your study plan starts tomorrow.', 'time': '1d ago', 'category': 'Academic', 'read': true, 'color': Color(0xFF4FC3F7)},
    {'icon': '💰', 'title': 'Budget Alert', 'body': 'Food budget 90% used with 8 days left in the month!', 'time': '1d ago', 'category': 'Finance', 'read': true, 'color': Color(0xFF80CBC4)},
    {'icon': '🤖', 'title': 'AI Suggestion', 'body': 'Based on your weak topics, try solving Graph problems today!', 'time': '2d ago', 'category': 'Coding', 'read': true, 'color': Color(0xFF6C63FF)},
    {'icon': '🧘', 'title': 'Wellness Check', 'body': 'You haven\'t logged your mood today. How are you feeling?', 'time': '2d ago', 'category': 'Wellness', 'read': true, 'color': Color(0xFFEF9A9A)},
    {'icon': '💼', 'title': 'Internship Deadline', 'body': 'Google STEP application closes in 2 days. Don\'t miss it!', 'time': '3d ago', 'category': 'Placement', 'read': true, 'color': Color(0xFFCE93D8)},
    {'icon': '💧', 'title': 'Water Reminder', 'body': 'You\'ve only had 3 glasses today. Drink 5 more to reach your goal!', 'time': '3d ago', 'category': 'Wellness', 'read': true, 'color': Color(0xFF4FC3F7)},
  ];

  List<Map<String, dynamic>> get _filtered {
    if (_selectedFilter == 'All') return _notifications;
    return _notifications.where((n) => n['category'] == _selectedFilter).toList();
  }

  @override
  Widget build(BuildContext context) {
    final unreadCount = _notifications.where((n) => !(n['read'] as bool)).length;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: CustomAppBar(
        title: 'Notifications',
        showBack: true,
        actions: [
          if (unreadCount > 0)
            TextButton(
              onPressed: () => setState(() {
                for (final n in _notifications) n['read'] = true;
              }),
              child: Text('Mark all read', style: AppTextStyles.label.copyWith(color: AppColors.primary)),
            ),
        ],
      ),
      body: Column(
        children: [
          // Filter chips
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: ['All', 'Academic', 'Coding', 'Placement', 'Wellness', 'Finance'].map((f) {
                  final selected = f == _selectedFilter;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: GestureDetector(
                      onTap: () => setState(() => _selectedFilter = f),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        decoration: BoxDecoration(
                          gradient: selected ? AppColors.gradientPrimary : null,
                          color: selected ? null : AppColors.surface,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: selected ? Colors.transparent : AppColors.border),
                        ),
                        child: Text(f, style: AppTextStyles.label.copyWith(color: Colors.white)),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
          ),

          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              itemCount: _filtered.length,
              itemBuilder: (context, i) {
                final notif = _filtered[i];
                final isUnread = !(notif['read'] as bool);
                final color = notif['color'] as Color;

                return Dismissible(
                  key: ValueKey(notif['title']),
                  direction: DismissDirection.endToStart,
                  background: Container(
                    alignment: Alignment.centerRight,
                    padding: const EdgeInsets.only(right: 20),
                    decoration: BoxDecoration(
                      color: AppColors.accentRed.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: const Icon(Icons.delete, color: AppColors.accentRed),
                  ),
                  onDismissed: (_) => setState(() => _notifications.remove(notif)),
                  child: Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: GestureDetector(
                      onTap: () => setState(() => notif['read'] = true),
                      child: Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: isUnread ? AppColors.card : AppColors.surface,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: isUnread ? color.withOpacity(0.4) : AppColors.border,
                          ),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              width: 44, height: 44,
                              decoration: BoxDecoration(
                                color: color.withOpacity(0.15),
                                shape: BoxShape.circle,
                              ),
                              child: Center(child: Text(notif['icon'], style: const TextStyle(fontSize: 22))),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Expanded(child: Text(notif['title'], style: AppTextStyles.titleMedium)),
                                      if (isUnread)
                                        Container(
                                          width: 8, height: 8,
                                          decoration: const BoxDecoration(color: AppColors.primary, shape: BoxShape.circle),
                                        ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(notif['body'], style: AppTextStyles.bodySmall, maxLines: 2, overflow: TextOverflow.ellipsis),
                                  const SizedBox(height: 6),
                                  Row(
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: color.withOpacity(0.1),
                                          borderRadius: BorderRadius.circular(4),
                                        ),
                                        child: Text(notif['category'], style: AppTextStyles.caption.copyWith(color: color)),
                                      ),
                                      const SizedBox(width: 8),
                                      Text(notif['time'], style: AppTextStyles.caption),
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
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
