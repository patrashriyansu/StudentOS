import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/widgets/glass_card.dart';
import '../../../core/widgets/custom_app_bar.dart';

class InternshipFinderScreen extends StatefulWidget {
  const InternshipFinderScreen({super.key});

  @override
  State<InternshipFinderScreen> createState() => _InternshipFinderScreenState();
}

class _InternshipFinderScreenState extends State<InternshipFinderScreen> {
  String _selectedFilter = 'All';

  final List<Map<String, dynamic>> _internships = [
    {'company': 'Google', 'role': 'STEP Intern - SDE', 'location': 'Bangalore', 'match': 82, 'stipend': '₹40,000/mo', 'color': Color(0xFF4285F4), 'type': 'Remote'},
    {'company': 'Microsoft', 'role': 'Explore Intern - SDE', 'location': 'Hyderabad', 'match': 78, 'stipend': '₹35,000/mo', 'color': Color(0xFF00A4EF), 'type': 'On-site'},
    {'company': 'Amazon', 'role': 'SDE Intern', 'location': 'Pune', 'match': 75, 'stipend': '₹38,000/mo', 'color': Color(0xFFFF9900), 'type': 'On-site'},
    {'company': 'Flipkart', 'role': 'ML Intern', 'location': 'Bangalore', 'match': 71, 'stipend': '₹30,000/mo', 'color': Color(0xFF2874F0), 'type': 'Hybrid'},
    {'company': 'Adobe', 'role': 'UI/UX Intern', 'location': 'Noida', 'match': 68, 'stipend': '₹25,000/mo', 'color': Color(0xFFFF0000), 'type': 'Remote'},
    {'company': 'Razorpay', 'role': 'Backend Intern', 'location': 'Remote', 'match': 65, 'stipend': '₹28,000/mo', 'color': Color(0xFF2D81F7), 'type': 'Remote'},
  ];

  Color _matchColor(int match) {
    if (match >= 80) return AppColors.accentGreen;
    if (match >= 70) return AppColors.accentOrange;
    return AppColors.accentRed;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: CustomAppBar(title: 'Internship Finder', showBack: true),
      body: Column(
        children: [
          // AI Match Banner
          Padding(
            padding: const EdgeInsets.all(16),
            child: GlassCard(
              gradient: LinearGradient(
                colors: [AppColors.primary.withOpacity(0.2), AppColors.secondary.withOpacity(0.1)],
              ),
              child: Row(
                children: [
                  const Text('🤖', style: TextStyle(fontSize: 32)),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('AI found 12 matches for you!', style: AppTextStyles.titleMedium),
                        Text('Based on your skills: Python, React, DSA, SQL', style: AppTextStyles.bodySmall),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Filter chips
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: ['All', 'Remote', 'On-site', 'Hybrid', 'SDE', 'ML'].map((f) {
                  final selected = f == _selectedFilter;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: GestureDetector(
                      onTap: () => setState(() => _selectedFilter = f),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
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
          const SizedBox(height: 12),

          // List
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: _internships.length,
              itemBuilder: (context, i) {
                final intern = _internships[i];
                final color = intern['color'] as Color;
                final match = intern['match'] as int;

                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: GlassCard(
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Company logo
                        Container(
                          width: 48, height: 48,
                          decoration: BoxDecoration(
                            color: color.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: color.withOpacity(0.4)),
                          ),
                          child: Center(
                            child: Text(
                              intern['company'][0],
                              style: TextStyle(color: color, fontSize: 20, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),

                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Expanded(child: Text(intern['company'], style: AppTextStyles.titleMedium)),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: _matchColor(match).withOpacity(0.15),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Text('$match% match', style: AppTextStyles.caption.copyWith(color: _matchColor(match), fontWeight: FontWeight.bold)),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text(intern['role'], style: AppTextStyles.body),
                              const SizedBox(height: 4),
                              Row(
                                children: [
                                  Icon(Icons.location_on, size: 12, color: AppColors.textMuted),
                                  const SizedBox(width: 4),
                                  Text(intern['location'], style: AppTextStyles.caption),
                                  const SizedBox(width: 12),
                                  Icon(Icons.attach_money, size: 12, color: AppColors.accentGreen),
                                  Text(intern['stipend'], style: AppTextStyles.caption.copyWith(color: AppColors.accentGreen)),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: AppColors.surface,
                                      borderRadius: BorderRadius.circular(6),
                                      border: Border.all(color: AppColors.border),
                                    ),
                                    child: Text(intern['type'], style: AppTextStyles.caption),
                                  ),
                                  const Spacer(),
                                  GestureDetector(
                                    onTap: () {},
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                                      decoration: BoxDecoration(
                                        gradient: AppColors.gradientPrimary,
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: Text('Apply →', style: AppTextStyles.caption.copyWith(color: Colors.white, fontWeight: FontWeight.bold)),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
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
