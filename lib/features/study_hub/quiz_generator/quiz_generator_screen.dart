import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class QuizGeneratorScreen extends StatefulWidget {
  const QuizGeneratorScreen({super.key});

  @override
  State<QuizGeneratorScreen> createState() => _QuizGeneratorScreenState();
}

class _QuizGeneratorScreenState extends State<QuizGeneratorScreen>
    with TickerProviderStateMixin {
  String _selectedSubject = 'DSA';
  final TextEditingController _topicController = TextEditingController();
  int _numQuestions = 5;
  String _difficulty = 'Medium';
  bool _quizStarted = false;
  bool _isGenerating = false;
  int _currentQuestion = 0;
  int? _selectedOption;
  bool _answered = false;
  int _score = 0;
  bool _quizFinished = false;

  late AnimationController _cardController;
  late AnimationController _optionController;
  late Animation<double> _cardScale;

  final List<String> _subjects = ['DSA', 'DBMS', 'OS', 'CN', 'MATHS'];
  final List<int> _questionCounts = [5, 10, 15];
  final List<String> _difficulties = ['Easy', 'Medium', 'Hard'];

  final List<_QuizQuestion> _mockQuestions = [
    _QuizQuestion(
      question: 'What is the time complexity of Binary Search?',
      options: ['O(n)', 'O(log n)', 'O(n²)', 'O(1)'],
      correctIndex: 1,
    ),
    _QuizQuestion(
      question: 'Which data structure is used in BFS traversal?',
      options: ['Stack', 'Queue', 'Priority Queue', 'Deque'],
      correctIndex: 1,
    ),
    _QuizQuestion(
      question: 'What is the worst-case time complexity of QuickSort?',
      options: ['O(n log n)', 'O(n)', 'O(n²)', 'O(log n)'],
      correctIndex: 2,
    ),
    _QuizQuestion(
      question: 'Which traversal visits root first?',
      options: ['Inorder', 'Postorder', 'Preorder', 'Level-order'],
      correctIndex: 2,
    ),
    _QuizQuestion(
      question: 'What is the height of a balanced BST with n nodes?',
      options: ['O(n)', 'O(log n)', 'O(n log n)', 'O(1)'],
      correctIndex: 1,
    ),
  ];

  List<_QuizQuestion> get _activeQuestions =>
      _mockQuestions.take(_numQuestions.clamp(1, _mockQuestions.length)).toList();

  @override
  void initState() {
    super.initState();
    _cardController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    );
    _optionController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 400),
    );
    _cardScale = Tween<double>(begin: 0.85, end: 1.0).animate(
      CurvedAnimation(parent: _cardController, curve: Curves.easeOutBack),
    );
  }

  @override
  void dispose() {
    _cardController.dispose();
    _optionController.dispose();
    _topicController.dispose();
    super.dispose();
  }

  void _generateQuiz() async {
    setState(() => _isGenerating = true);
    await Future.delayed(const Duration(seconds: 2));
    setState(() {
      _isGenerating = false;
      _quizStarted = true;
      _currentQuestion = 0;
      _selectedOption = null;
      _answered = false;
      _score = 0;
      _quizFinished = false;
    });
    _cardController.forward(from: 0);
    _optionController.forward(from: 0);
  }

  void _selectOption(int index) {
    if (_answered) return;
    setState(() {
      _selectedOption = index;
      _answered = true;
      if (index == _activeQuestions[_currentQuestion].correctIndex) {
        _score++;
      }
    });
  }

  void _nextQuestion() {
    if (_currentQuestion < _activeQuestions.length - 1) {
      setState(() {
        _currentQuestion++;
        _selectedOption = null;
        _answered = false;
      });
      _cardController.forward(from: 0);
      _optionController.forward(from: 0);
    } else {
      setState(() => _quizFinished = true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0A0A0F),
      body: SafeArea(
        child: Column(
          children: [
            _buildHeader(),
            Expanded(
              child: _quizFinished
                  ? _buildScoreScreen()
                  : _quizStarted
                      ? _buildQuizView()
                      : _buildInputCard(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 4),
      child: Row(
        children: [
          GestureDetector(
            onTap: () {
              if (_quizStarted) {
                setState(() {
                  _quizStarted = false;
                  _quizFinished = false;
                });
              } else {
                Navigator.pop(context);
              }
            },
            child: Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFF1A1A2E),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white12),
              ),
              child: const Icon(Icons.arrow_back_ios_new_rounded,
                  color: Colors.white70, size: 18),
            ),
          ),
          const SizedBox(width: 14),
          Text(
            'Quiz Generator',
            style: GoogleFonts.outfit(
              fontSize: 22,
              fontWeight: FontWeight.w700,
              color: Colors.white,
            ),
          ),
          const Spacer(),
          if (_quizStarted && !_quizFinished)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: const Color(0xFF00E676).withOpacity(0.15),
                borderRadius: BorderRadius.circular(10),
                border:
                    Border.all(color: const Color(0xFF00E676).withOpacity(0.35)),
              ),
              child: Text(
                'Score: $_score',
                style: GoogleFonts.outfit(
                  color: const Color(0xFF00E676),
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildInputCard() {
    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(24),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
              child: Container(
                padding: const EdgeInsets.all(22),
                decoration: BoxDecoration(
                  color: const Color(0xFF1A1A2E),
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(
                      color: const Color(0xFF00E676).withOpacity(0.2)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildSectionLabel('Subject'),
                    const SizedBox(height: 10),
                    _buildSubjectDropdown(),
                    const SizedBox(height: 18),
                    _buildSectionLabel('Topic (Optional)'),
                    const SizedBox(height: 10),
                    _buildTopicField(),
                    const SizedBox(height: 18),
                    _buildSectionLabel('Number of Questions'),
                    const SizedBox(height: 10),
                    _buildQuestionCountSelector(),
                    const SizedBox(height: 18),
                    _buildSectionLabel('Difficulty'),
                    const SizedBox(height: 10),
                    _buildDifficultyChips(),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 24),
          GestureDetector(
            onTap: _isGenerating ? null : _generateQuiz,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 300),
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 18),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF00E676), Color(0xFF00897B)],
                ),
                borderRadius: BorderRadius.circular(18),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF00E676).withOpacity(0.4),
                    blurRadius: 20,
                    spreadRadius: 2,
                  ),
                ],
              ),
              child: Center(
                child: _isGenerating
                    ? const SizedBox(
                        width: 24,
                        height: 24,
                        child: CircularProgressIndicator(
                          color: Colors.white,
                          strokeWidth: 2.5,
                        ),
                      )
                    : Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.quiz_rounded,
                              color: Colors.white, size: 22),
                          const SizedBox(width: 10),
                          Text(
                            'Generate Quiz',
                            style: GoogleFonts.outfit(
                              color: Colors.white,
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
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

  Widget _buildSectionLabel(String label) {
    return Text(
      label,
      style: GoogleFonts.outfit(
        color: Colors.white70,
        fontSize: 13,
        fontWeight: FontWeight.w600,
      ),
    );
  }

  Widget _buildSubjectDropdown() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
      decoration: BoxDecoration(
        color: const Color(0xFF0A0A0F),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white12),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: _selectedSubject,
          dropdownColor: const Color(0xFF1A1A2E),
          style: GoogleFonts.outfit(color: Colors.white, fontSize: 14),
          isExpanded: true,
          icon: const Icon(Icons.expand_more_rounded, color: Colors.white54),
          items: _subjects
              .map((s) => DropdownMenuItem(value: s, child: Text(s)))
              .toList(),
          onChanged: (val) => setState(() => _selectedSubject = val!),
        ),
      ),
    );
  }

  Widget _buildTopicField() {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF0A0A0F),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white12),
      ),
      child: TextField(
        controller: _topicController,
        style: GoogleFonts.outfit(color: Colors.white, fontSize: 14),
        decoration: InputDecoration(
          hintText: 'e.g. Sorting Algorithms, SQL Joins...',
          hintStyle: GoogleFonts.outfit(color: Colors.white30, fontSize: 14),
          border: InputBorder.none,
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        ),
      ),
    );
  }

  Widget _buildQuestionCountSelector() {
    return Row(
      children: _questionCounts.map((count) {
        final selected = _numQuestions == count;
        return Expanded(
          child: GestureDetector(
            onTap: () => setState(() => _numQuestions = count),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 220),
              margin: const EdgeInsets.only(right: 8),
              padding: const EdgeInsets.symmetric(vertical: 12),
              decoration: BoxDecoration(
                gradient: selected
                    ? const LinearGradient(
                        colors: [Color(0xFF00E676), Color(0xFF00897B)])
                    : null,
                color: selected ? null : const Color(0xFF0A0A0F),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: selected
                      ? Colors.transparent
                      : Colors.white12,
                ),
                boxShadow: selected
                    ? [
                        BoxShadow(
                          color: const Color(0xFF00E676).withOpacity(0.35),
                          blurRadius: 12,
                        )
                      ]
                    : [],
              ),
              child: Center(
                child: Text(
                  '$count',
                  style: GoogleFonts.outfit(
                    color: selected ? Colors.white : Colors.white54,
                    fontWeight: FontWeight.w700,
                    fontSize: 15,
                  ),
                ),
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildDifficultyChips() {
    return Row(
      children: _difficulties.map((d) {
        final selected = _difficulty == d;
        final color = d == 'Easy'
            ? const Color(0xFF00E676)
            : d == 'Medium'
                ? const Color(0xFFFFB300)
                : const Color(0xFFFF5252);
        return Expanded(
          child: GestureDetector(
            onTap: () => setState(() => _difficulty = d),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 220),
              margin: const EdgeInsets.only(right: 8),
              padding: const EdgeInsets.symmetric(vertical: 12),
              decoration: BoxDecoration(
                color:
                    selected ? color.withOpacity(0.2) : const Color(0xFF0A0A0F),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: selected ? color.withOpacity(0.7) : Colors.white12,
                ),
              ),
              child: Center(
                child: Text(
                  d,
                  style: GoogleFonts.outfit(
                    color: selected ? color : Colors.white54,
                    fontWeight: FontWeight.w600,
                    fontSize: 13,
                  ),
                ),
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildQuizView() {
    final questions = _activeQuestions;
    final q = questions[_currentQuestion];
    final progress = (_currentQuestion + 1) / questions.length;

    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Progress bar
          Row(
            children: [
              Text(
                'Q${_currentQuestion + 1} of ${questions.length}',
                style: GoogleFonts.outfit(
                    color: Colors.white70,
                    fontSize: 13,
                    fontWeight: FontWeight.w600),
              ),
              const Spacer(),
              Text(
                '$_difficulty  •  $_selectedSubject',
                style: GoogleFonts.outfit(
                    color: Colors.white38, fontSize: 12),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Stack(
            children: [
              Container(
                height: 6,
                decoration: BoxDecoration(
                  color: Colors.white10,
                  borderRadius: BorderRadius.circular(3),
                ),
              ),
              AnimatedFractionallySizedBox(
                duration: const Duration(milliseconds: 400),
                widthFactor: progress,
                child: Container(
                  height: 6,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF00E676), Color(0xFF00897B)],
                    ),
                    borderRadius: BorderRadius.circular(3),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF00E676).withOpacity(0.5),
                        blurRadius: 8,
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          // Question card
          ScaleTransition(
            scale: _cardScale,
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(22),
              decoration: BoxDecoration(
                color: const Color(0xFF12121A),
                borderRadius: BorderRadius.circular(22),
                border: Border.all(
                    color: const Color(0xFF00E676).withOpacity(0.25)),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF00E676).withOpacity(0.08),
                    blurRadius: 24,
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFF00E676).withOpacity(0.12),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      'Question ${_currentQuestion + 1}',
                      style: GoogleFonts.outfit(
                        color: const Color(0xFF00E676),
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Text(
                    q.question,
                    style: GoogleFonts.outfit(
                      color: Colors.white,
                      fontSize: 17,
                      fontWeight: FontWeight.w600,
                      height: 1.4,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),
          // Options
          Expanded(
            child: ListView.builder(
              physics: const NeverScrollableScrollPhysics(),
              itemCount: q.options.length,
              itemBuilder: (context, index) =>
                  _buildOptionTile(q, index),
            ),
          ),
          if (_answered)
            GestureDetector(
              onTap: _nextQuestion,
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 16),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF6C63FF), Color(0xFFA855F7)],
                  ),
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF6C63FF).withOpacity(0.4),
                      blurRadius: 16,
                      spreadRadius: 2,
                    ),
                  ],
                ),
                child: Center(
                  child: Text(
                    _currentQuestion < _activeQuestions.length - 1
                        ? 'Next Question →'
                        : 'Finish Quiz 🎉',
                    style: GoogleFonts.outfit(
                      color: Colors.white,
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildOptionTile(_QuizQuestion q, int index) {
    Color tileColor = const Color(0xFF1A1A2E);
    Color borderColor = Colors.white12;
    IconData? trailingIcon;

    if (_answered) {
      if (index == q.correctIndex) {
        tileColor = const Color(0xFF00E676).withOpacity(0.12);
        borderColor = const Color(0xFF00E676).withOpacity(0.6);
        trailingIcon = Icons.check_circle_rounded;
      } else if (index == _selectedOption && index != q.correctIndex) {
        tileColor = const Color(0xFFFF5252).withOpacity(0.12);
        borderColor = const Color(0xFFFF5252).withOpacity(0.6);
        trailingIcon = Icons.cancel_rounded;
      }
    } else if (_selectedOption == index) {
      tileColor = const Color(0xFF6C63FF).withOpacity(0.15);
      borderColor = const Color(0xFF6C63FF).withOpacity(0.5);
    }

    return GestureDetector(
      onTap: () => _selectOption(index),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
        decoration: BoxDecoration(
          color: tileColor,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: borderColor),
        ),
        child: Row(
          children: [
            Container(
              width: 28,
              height: 28,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white10,
                border: Border.all(color: Colors.white24),
              ),
              child: Center(
                child: Text(
                  String.fromCharCode(65 + index),
                  style: GoogleFonts.outfit(
                      color: Colors.white70,
                      fontWeight: FontWeight.w700,
                      fontSize: 13),
                ),
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Text(
                q.options[index],
                style: GoogleFonts.outfit(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            if (trailingIcon != null)
              Icon(
                trailingIcon,
                color: index == q.correctIndex
                    ? const Color(0xFF00E676)
                    : const Color(0xFFFF5252),
                size: 22,
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildScoreScreen() {
    final total = _activeQuestions.length;
    final percentage = (_score / total * 100).round();
    final grade = percentage >= 80
        ? 'Excellent! 🌟'
        : percentage >= 60
            ? 'Good Job! 👍'
            : 'Keep Practicing! 💪';
    final gradeColor = percentage >= 80
        ? const Color(0xFF00E676)
        : percentage >= 60
            ? const Color(0xFFFFB300)
            : const Color(0xFFFF5252);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          const SizedBox(height: 20),
          TweenAnimationBuilder<double>(
            tween: Tween(begin: 0, end: 1),
            duration: const Duration(milliseconds: 800),
            curve: Curves.easeOutBack,
            builder: (context, value, child) => Transform.scale(
              scale: value,
              child: child,
            ),
            child: Container(
              width: 140,
              height: 140,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    gradeColor.withOpacity(0.25),
                    gradeColor.withOpacity(0.05),
                  ],
                ),
                border: Border.all(color: gradeColor.withOpacity(0.5), width: 3),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    '$percentage%',
                    style: GoogleFonts.outfit(
                      fontSize: 36,
                      fontWeight: FontWeight.w800,
                      color: gradeColor,
                    ),
                  ),
                  Text(
                    '$_score/$total',
                    style: GoogleFonts.outfit(
                        color: Colors.white60, fontSize: 14),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),
          Text(
            grade,
            style: GoogleFonts.outfit(
              fontSize: 26,
              fontWeight: FontWeight.w700,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'You answered $_score out of $total questions correctly',
            textAlign: TextAlign.center,
            style: GoogleFonts.outfit(color: Colors.white54, fontSize: 14),
          ),
          const SizedBox(height: 32),
          Row(
            children: [
              Expanded(
                child: GestureDetector(
                  onTap: () => setState(() {
                    _quizStarted = false;
                    _quizFinished = false;
                  }),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1A1A2E),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.white12),
                    ),
                    child: Center(
                      child: Text(
                        'New Quiz',
                        style: GoogleFonts.outfit(
                            color: Colors.white70,
                            fontWeight: FontWeight.w600,
                            fontSize: 14),
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: GestureDetector(
                  onTap: _generateQuiz,
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF00E676), Color(0xFF00897B)],
                      ),
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF00E676).withOpacity(0.4),
                          blurRadius: 16,
                        ),
                      ],
                    ),
                    child: Center(
                      child: Text(
                        'Retry Quiz',
                        style: GoogleFonts.outfit(
                            color: Colors.white,
                            fontWeight: FontWeight.w700,
                            fontSize: 14),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _QuizQuestion {
  final String question;
  final List<String> options;
  final int correctIndex;

  const _QuizQuestion({
    required this.question,
    required this.options,
    required this.correctIndex,
  });
}
