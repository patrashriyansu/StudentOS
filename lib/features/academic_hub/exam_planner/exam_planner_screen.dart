import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/widgets/glass_card.dart';
import '../../../core/widgets/gradient_button.dart';
import '../../../core/widgets/custom_app_bar.dart';

class ExamPlannerScreen extends StatefulWidget {
  const ExamPlannerScreen({super.key});

  @override
  State<ExamPlannerScreen> createState() => _ExamPlannerScreenState();
}

class _ExamPlannerScreenState extends State<ExamPlannerScreen> {
  final List<Map<String, dynamic>> _exams = [];
  bool _planGenerated = false;
  int _hoursPerDay = 6;

  final _subjectController = TextEditingController();
  DateTime? _selectedDate;

  final List<Map<String, dynamic>> _studyPlan = [
    {
      'day': 'Day 1 - Jun 25',
      'tasks': [
        {'subject': 'Operating Systems', 'hours': 2, 'color': Color(0xFF4FC3F7), 'topic': 'Process Scheduling & Memory Management'},
        {'subject': 'DBMS', 'hours': 1.5, 'color': Color(0xFF81C784), 'topic': 'Normalization & ER Diagrams'},
        {'subject': 'Revision', 'hours': 0.5, 'color': Color(0xFFFFB74D), 'topic': 'Quick notes review'},
      ]
    },
    {
      'day': 'Day 2 - Jun 26',
      'tasks': [
        {'subject': 'DBMS', 'hours': 2, 'color': Color(0xFF81C784), 'topic': 'SQL Queries & Transactions'},
        {'subject': 'Operating Systems', 'hours': 1.5, 'color': Color(0xFF4FC3F7), 'topic': 'File Systems & I/O'},
        {'subject': 'Practice', 'hours': 1, 'color': Color(0xFFCE93D8), 'topic': 'Previous year questions'},
      ]
    },
    {
      'day': 'Day 3 - Jun 27',
      'tasks': [
        {'subject': 'Operating Systems', 'hours': 2.5, 'color': Color(0xFF4FC3F7), 'topic': 'Full syllabus revision'},
        {'subject': 'Mock Test', 'hours': 1.5, 'color': Color(0xFFEF9A9A), 'topic': 'OS Mock Exam'},
        {'subject': 'Rest', 'hours': 0.5, 'color': Color(0xFF80CBC4), 'topic': 'Mental refresh'},
      ]
    },
    {
      'day': 'Day 4 - Jun 28',
      'tasks': [
        {'subject': 'DBMS', 'hours': 2, 'color': Color(0xFF81C784), 'topic': 'Full revision'},
        {'subject': 'Mock Test', 'hours': 2, 'color': Color(0xFFEF9A9A), 'topic': 'DBMS Mock Exam'},
      ]
    },
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: CustomAppBar(title: 'Exam Planner', showBack: true),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // AI Planner Banner
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF6C63FF), Color(0xFFA855F7)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Row(
                children: [
                  const Text('🤖', style: TextStyle(fontSize: 32)),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('AI Exam Planner', style: AppTextStyles.titleLarge),
                        Text('Enter your exams and get a personalized study plan', style: AppTextStyles.bodySmall.copyWith(color: Colors.white70)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Add Exam
            GlassCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Add Exam', style: AppTextStyles.titleLarge),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _subjectController,
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      hintText: 'Subject Name (e.g. Operating Systems)',
                      prefixIcon: const Icon(Icons.book, color: AppColors.primary),
                    ),
                  ),
                  const SizedBox(height: 12),
                  GestureDetector(
                    onTap: () async {
                      final date = await showDatePicker(
                        context: context,
                        initialDate: DateTime.now().add(const Duration(days: 3)),
                        firstDate: DateTime.now(),
                        lastDate: DateTime.now().add(const Duration(days: 60)),
                        builder: (ctx, child) => Theme(
                          data: ThemeData.dark().copyWith(
                            colorScheme: const ColorScheme.dark(primary: AppColors.primary),
                          ),
                          child: child!,
                        ),
                      );
                      if (date != null) setState(() => _selectedDate = date);
                    },
                    child: Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.calendar_today, color: AppColors.primary),
                          const SizedBox(width: 12),
                          Text(
                            _selectedDate == null
                                ? 'Select Exam Date'
                                : '${_selectedDate!.day}/${_selectedDate!.month}/${_selectedDate!.year}',
                            style: TextStyle(
                              color: _selectedDate == null ? AppColors.textMuted : AppColors.textPrimary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Text('Hours/day: $_hoursPerDay', style: AppTextStyles.label),
                      Expanded(
                        child: Slider(
                          value: _hoursPerDay.toDouble(),
                          min: 2,
                          max: 12,
                          divisions: 10,
                          activeColor: AppColors.primary,
                          onChanged: (v) => setState(() => _hoursPerDay = v.toInt()),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () {
                            if (_subjectController.text.isNotEmpty && _selectedDate != null) {
                              setState(() {
                                _exams.add({
                                  'subject': _subjectController.text,
                                  'date': _selectedDate,
                                });
                                _subjectController.clear();
                                _selectedDate = null;
                              });
                            }
                          },
                          icon: const Icon(Icons.add, color: AppColors.primary),
                          label: Text('Add', style: TextStyle(color: AppColors.primary)),
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: AppColors.primary),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: GradientButton(
                          text: 'Generate Plan',
                          onTap: () => setState(() => _planGenerated = true),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // Exam list
            if (_exams.isNotEmpty) ...[
              const SizedBox(height: 12),
              ..._exams.map((e) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: GlassCard(
                  child: Row(
                    children: [
                      const Icon(Icons.event, color: AppColors.accentRed),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(e['subject'], style: AppTextStyles.titleMedium),
                      ),
                      Text('${(e['date'] as DateTime).day}/${(e['date'] as DateTime).month}', style: AppTextStyles.body),
                    ],
                  ),
                ),
              )),
            ],

            const SizedBox(height: 20),

            // Generated Plan
            if (_planGenerated) ...[
              Row(
                children: [
                  Text('📅 AI Study Plan', style: AppTextStyles.headingSmall),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.accentGreen.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text('Generated', style: AppTextStyles.caption.copyWith(color: AppColors.accentGreen)),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              ..._studyPlan.map((day) => _buildDayCard(day)),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildDayCard(Map<String, dynamic> day) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: GlassCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(day['day'], style: AppTextStyles.titleMedium.copyWith(color: AppColors.accent)),
            const SizedBox(height: 12),
            ...(day['tasks'] as List).map((task) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                children: [
                  Container(
                    width: 4,
                    height: 40,
                    decoration: BoxDecoration(
                      color: task['color'],
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(task['subject'], style: AppTextStyles.label.copyWith(color: task['color'])),
                        Text(task['topic'], style: AppTextStyles.bodySmall),
                      ],
                    ),
                  ),
                  Text('${task['hours']}h', style: AppTextStyles.titleMedium),
                ],
              ),
            )),
          ],
        ),
      ),
    );
  }
}
