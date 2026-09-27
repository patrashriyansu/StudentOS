import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/widgets/gradient_button.dart';
import '../../core/widgets/custom_app_bar.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final badges = [
      {'label': '🔥 45-Day Streak', 'color': const Color(0xFFFFB74D)},
      {'label': '🎓 9+ CGPA Club', 'color': const Color(0xFF81C784)},
      {'label': '💪 250 LC Solved', 'color': const Color(0xFF4FC3F7)},
      {'label': '🏆 Top 10%', 'color': const Color(0xFFCE93D8)},
      {'label': '📚 Note Creator', 'color': const Color(0xFF6C63FF)},
    ];

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: CustomAppBar(
        title: 'Profile',
        showBack: false,
        actions: [
          IconButton(
            icon: const Icon(Icons.settings_outlined, color: AppColors.textSecondary),
            onPressed: () {},
          ),
        ],
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            // Profile header
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [AppColors.primary.withOpacity(0.2), AppColors.background],
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                ),
              ),
              child: Column(
                children: [
                  Stack(
                    children: [
                      Container(
                        width: 88,
                        height: 88,
                        decoration: const BoxDecoration(
                          gradient: AppColors.gradientPrimary,
                          shape: BoxShape.circle,
                        ),
                        child: const Center(
                          child: Text('S', style: TextStyle(color: Colors.white, fontSize: 36, fontWeight: FontWeight.bold)),
                        ),
                      ),
                      Positioned(
                        bottom: 0,
                        right: 0,
                        child: Container(
                          width: 26,
                          height: 26,
                          decoration: const BoxDecoration(color: AppColors.accentGreen, shape: BoxShape.circle),
                          child: const Icon(Icons.edit, color: Colors.white, size: 14),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text('Shriyansu Patra', style: AppTextStyles.headingMedium),
                  const SizedBox(height: 4),
                  Text('KIIT University • CSE • 5th Semester', style: AppTextStyles.body),
                  const SizedBox(height: 4),
                  Text('shriyansu@example.com', style: AppTextStyles.caption),
                ],
              ),
            ),

            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Achievement badges
                  SizedBox(
                    height: 40,
                    child: ListView(
                      scrollDirection: Axis.horizontal,
                      children: badges.map((b) => Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          decoration: BoxDecoration(
                            color: (b['color'] as Color).withOpacity(0.15),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: (b['color'] as Color).withOpacity(0.4)),
                          ),
                          child: Text(b['label'] as String, style: AppTextStyles.caption.copyWith(color: b['color'] as Color)),
                        ),
                      )).toList(),
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Stats grid
                  Row(
                    children: [
                      _ProfileStat(label: 'CGPA', value: '8.5', color: AppColors.accentGreen),
                      const SizedBox(width: 10),
                      _ProfileStat(label: 'Attendance', value: '82%', color: AppColors.accent),
                      const SizedBox(width: 10),
                      _ProfileStat(label: 'LeetCode', value: '250', color: AppColors.accentOrange),
                      const SizedBox(width: 10),
                      _ProfileStat(label: 'Projects', value: '4', color: AppColors.secondary),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Digital Twin button
                  GradientButton(
                    text: '🤖 View Student Digital Twin',
                    onTap: () => context.go('/profile/digital-twin'),
                  ),
                  const SizedBox(height: 20),

                  // Settings sections
                  _SettingsSection(title: 'Account', items: [
                    _SettingsItem(icon: Icons.person_outline, label: 'Edit Profile', onTap: () {}),
                    _SettingsItem(icon: Icons.lock_outline, label: 'Change Password', onTap: () {}),
                  ]),
                  const SizedBox(height: 12),
                  _SettingsSection(title: 'Academic', items: [
                    _SettingsItem(icon: Icons.school_outlined, label: 'College & Branch', onTap: () {}),
                    _SettingsItem(icon: Icons.calendar_today_outlined, label: 'Semester Settings', onTap: () {}),
                  ]),
                  const SizedBox(height: 12),
                  _SettingsSection(title: 'Preferences', items: [
                    _SettingsItem(icon: Icons.notifications_outlined, label: 'Notifications', onTap: () {}),
                    _SettingsItem(icon: Icons.palette_outlined, label: 'Theme', onTap: () {}),
                  ]),
                  const SizedBox(height: 12),
                  _SettingsSection(title: 'App', items: [
                    _SettingsItem(icon: Icons.info_outline, label: 'About StudentOS', onTap: () {}),
                    _SettingsItem(icon: Icons.privacy_tip_outlined, label: 'Privacy Policy', onTap: () {}),
                    _SettingsItem(icon: Icons.logout, label: 'Logout', onTap: () => context.go('/login'), color: AppColors.accentRed),
                  ]),
                  const SizedBox(height: 32),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ProfileStat extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  const _ProfileStat({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) => Expanded(
    child: Container(
      padding: const EdgeInsets.symmetric(vertical: 12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        children: [
          Text(value, style: TextStyle(color: color, fontSize: 18, fontWeight: FontWeight.bold)),
          Text(label, style: AppTextStyles.caption),
        ],
      ),
    ),
  );
}

class _SettingsSection extends StatelessWidget {
  final String title;
  final List<Widget> items;
  const _SettingsSection({required this.title, required this.items});

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Padding(
        padding: const EdgeInsets.only(left: 4, bottom: 8),
        child: Text(title, style: AppTextStyles.label.copyWith(color: AppColors.textMuted)),
      ),
      Container(
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          children: items.asMap().entries.map((e) => Column(
            children: [
              e.value,
              if (e.key < items.length - 1) const Divider(height: 1, color: AppColors.border, indent: 52),
            ],
          )).toList(),
        ),
      ),
    ],
  );
}

class _SettingsItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final Color? color;
  const _SettingsItem({required this.icon, required this.label, required this.onTap, this.color});

  @override
  Widget build(BuildContext context) => ListTile(
    leading: Icon(icon, color: color ?? AppColors.textSecondary, size: 22),
    title: Text(label, style: AppTextStyles.body.copyWith(color: color ?? AppColors.textPrimary)),
    trailing: Icon(Icons.chevron_right, color: AppColors.textMuted, size: 20),
    onTap: onTap,
    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
  );
}
