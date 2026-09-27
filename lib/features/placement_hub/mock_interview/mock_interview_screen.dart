import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/widgets/glass_card.dart';
import '../../../core/widgets/gradient_button.dart';
import '../../../core/widgets/custom_app_bar.dart';

class MockInterviewScreen extends StatefulWidget {
  const MockInterviewScreen({super.key});

  @override
  State<MockInterviewScreen> createState() => _MockInterviewScreenState();
}

enum InterviewState { setup, active, results }

class _MockInterviewScreenState extends State<MockInterviewScreen> with TickerProviderStateMixin {
  InterviewState _state = InterviewState.setup;
  String _selectedRole = 'Software Engineer';
  String _selectedLevel = 'Entry';
  bool _isListening = false;
  int _questionIndex = 0;
  late AnimationController _pulseController;

  final List<String> _questions = [
    'Explain the difference between TCP and UDP.',
    'What is the time complexity of quicksort in the worst case?',
    'Describe a challenging project you built and the technical decisions you made.',
    'How does a HashMap work internally in Java?',
    'What is SOLID principles? Give an example.',
  ];

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(vsync: this, duration: const Duration(milliseconds: 1000))..repeat(reverse: true);
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: CustomAppBar(title: 'Mock Interview', showBack: true),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: _state == InterviewState.setup
            ? _buildSetup()
            : _state == InterviewState.active
                ? _buildActive()
                : _buildResults(),
      ),
    );
  }

  Widget _buildSetup() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: const LinearGradient(colors: [Color(0xFF4FC3F7), Color(0xFF6C63FF)]),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Row(
            children: [
              const Text('🎤', style: TextStyle(fontSize: 40)),
              const SizedBox(width: 16),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('AI Mock Interview', style: AppTextStyles.headingSmall),
                  Text('Powered by Gemini AI', style: AppTextStyles.bodySmall.copyWith(color: Colors.white70)),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),

        Text('Role', style: AppTextStyles.titleMedium),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8, runSpacing: 8,
          children: ['Software Engineer', 'Data Scientist', 'Product Manager'].map((r) => GestureDetector(
            onTap: () => setState(() => _selectedRole = r),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                gradient: _selectedRole == r ? AppColors.gradientPrimary : null,
                color: _selectedRole == r ? null : AppColors.surface,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: _selectedRole == r ? Colors.transparent : AppColors.border),
              ),
              child: Text(r, style: AppTextStyles.label.copyWith(color: Colors.white)),
            ),
          )).toList(),
        ),
        const SizedBox(height: 16),

        Text('Difficulty Level', style: AppTextStyles.titleMedium),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          children: ['Entry', 'Mid', 'Senior'].map((l) => GestureDetector(
            onTap: () => setState(() => _selectedLevel = l),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: _selectedLevel == l ? AppColors.accent.withOpacity(0.2) : AppColors.surface,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: _selectedLevel == l ? AppColors.accent : AppColors.border),
              ),
              child: Text(l, style: AppTextStyles.label.copyWith(color: _selectedLevel == l ? AppColors.accent : AppColors.textMuted)),
            ),
          )).toList(),
        ),
        const SizedBox(height: 24),

        GradientButton(
          text: '🚀 Start Interview',
          onTap: () => setState(() => _state = InterviewState.active),
        ),
      ],
    );
  }

  Widget _buildActive() {
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Q${_questionIndex + 1} of ${_questions.length}', style: AppTextStyles.label),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: AppColors.accentOrange.withOpacity(0.15),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text('02:00 ⏱️', style: AppTextStyles.label.copyWith(color: AppColors.accentOrange)),
            ),
          ],
        ),
        const SizedBox(height: 12),
        ClipRRect(
          borderRadius: BorderRadius.circular(6),
          child: LinearProgressIndicator(
            value: (_questionIndex + 1) / _questions.length,
            minHeight: 6,
            backgroundColor: AppColors.border,
            valueColor: const AlwaysStoppedAnimation(AppColors.primary),
          ),
        ),
        const SizedBox(height: 20),

        GlassCard(
          child: Column(
            children: [
              const Icon(Icons.psychology, color: AppColors.primary, size: 32),
              const SizedBox(height: 12),
              Text(
                _questions[_questionIndex],
                style: AppTextStyles.headingSmall,
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),

        // Record button
        AnimatedBuilder(
          animation: _pulseController,
          builder: (_, child) => Container(
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              boxShadow: _isListening ? [
                BoxShadow(
                  color: AppColors.accentRed.withOpacity(0.4 * _pulseController.value),
                  blurRadius: 30 * _pulseController.value,
                  spreadRadius: 10 * _pulseController.value,
                )
              ] : null,
            ),
            child: child!,
          ),
          child: GestureDetector(
            onTap: () => setState(() => _isListening = !_isListening),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: _isListening
                    ? const LinearGradient(colors: [AppColors.accentRed, Color(0xFFFF1744)])
                    : AppColors.gradientPrimary,
              ),
              child: Icon(_isListening ? Icons.stop : Icons.mic, color: Colors.white, size: 36),
            ),
          ),
        ),
        const SizedBox(height: 8),
        Text(_isListening ? '🔴 Listening... Speak clearly' : 'Tap to record your answer', style: AppTextStyles.body),
        const SizedBox(height: 24),

        Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: () {
                  if (_questionIndex > 0) setState(() { _questionIndex--; _isListening = false; });
                },
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: AppColors.border),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: const Text('← Previous', style: TextStyle(color: AppColors.textMuted)),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: GradientButton(
                text: _questionIndex < _questions.length - 1 ? 'Submit & Next' : 'Finish',
                onTap: () {
                  setState(() => _isListening = false);
                  if (_questionIndex < _questions.length - 1) {
                    setState(() => _questionIndex++);
                  } else {
                    setState(() => _state = InterviewState.results);
                  }
                },
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildResults() {
    return Column(
      children: [
        const SizedBox(height: 8),
        const Text('🏆', style: TextStyle(fontSize: 56)),
        const SizedBox(height: 8),
        Text('Interview Complete!', style: AppTextStyles.headingLarge),
        Text('Here\'s your performance analysis', style: AppTextStyles.body),
        const SizedBox(height: 24),

        Row(
          children: [
            _MetricCircle(label: 'Confidence', value: 80, color: AppColors.accentGreen),
            const SizedBox(width: 12),
            _MetricCircle(label: 'Communication', value: 75, color: AppColors.accent),
            const SizedBox(width: 12),
            _MetricCircle(label: 'Technical', value: 82, color: AppColors.primary),
          ],
        ),
        const SizedBox(height: 20),

        GlassCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('💡 AI Feedback', style: AppTextStyles.titleMedium),
              const SizedBox(height: 12),
              Text('Strong technical knowledge demonstrated in algorithms. Work on structuring answers using STAR method for behavioral questions. Communication was clear but could be more concise.', style: AppTextStyles.body),
              const SizedBox(height: 12),
              const Divider(color: AppColors.border),
              const SizedBox(height: 8),
              Text('Areas to improve:', style: AppTextStyles.label),
              const SizedBox(height: 8),
              ...['Practice system design questions', 'Work on DP problem explanations'].map((t) => Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Row(
                  children: [
                    const Icon(Icons.arrow_right, color: AppColors.primary),
                    Text(t, style: AppTextStyles.body),
                  ],
                ),
              )),
            ],
          ),
        ),
        const SizedBox(height: 16),
        GradientButton(
          text: '🔄 Start New Interview',
          onTap: () => setState(() { _state = InterviewState.setup; _questionIndex = 0; }),
        ),
      ],
    );
  }
}

class _MetricCircle extends StatelessWidget {
  final String label;
  final int value;
  final Color color;
  const _MetricCircle({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GlassCard(
        child: Column(
          children: [
            Stack(
              alignment: Alignment.center,
              children: [
                SizedBox(
                  width: 60, height: 60,
                  child: CircularProgressIndicator(
                    value: value / 100,
                    strokeWidth: 6,
                    backgroundColor: AppColors.border,
                    valueColor: AlwaysStoppedAnimation(color),
                  ),
                ),
                Text('$value%', style: TextStyle(color: color, fontSize: 13, fontWeight: FontWeight.bold)),
              ],
            ),
            const SizedBox(height: 8),
            Text(label, style: AppTextStyles.caption, textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}
