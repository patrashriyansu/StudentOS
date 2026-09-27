import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/widgets/custom_app_bar.dart';

class AiAssistantScreen extends StatefulWidget {
  const AiAssistantScreen({super.key});

  @override
  State<AiAssistantScreen> createState() => _AiAssistantScreenState();
}

class _AiAssistantScreenState extends State<AiAssistantScreen> {
  final TextEditingController _controller = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  bool _isTyping = false;

  final List<Map<String, dynamic>> _messages = [
    {
      'role': 'ai',
      'text': 'Hi Shriyansu! 👋 I\'m your AI Copilot powered by Gemini. I can help you with:\n\n📚 Summarize notes\n📝 Create MCQs & quizzes\n📅 Build study plans\n💡 Explain concepts\n\nWhat would you like to do today?',
    },
    {'role': 'user', 'text': 'Explain Binary Search'},
    {
      'role': 'ai',
      'text': '**Binary Search** 🔍\n\nBinary Search is an efficient algorithm for finding an element in a **sorted** array.\n\n**How it works:**\n1. Start with the middle element\n2. If target == mid → found! ✅\n3. If target < mid → search left half\n4. If target > mid → search right half\n5. Repeat until found or array exhausted\n\n**Time Complexity:** O(log n)\n**Space Complexity:** O(1) iterative, O(log n) recursive\n\n```dart\nint binarySearch(List<int> arr, int target) {\n  int left = 0, right = arr.length - 1;\n  while (left <= right) {\n    int mid = left + (right - left) ~/ 2;\n    if (arr[mid] == target) return mid;\n    if (arr[mid] < target) left = mid + 1;\n    else right = mid - 1;\n  }\n  return -1;\n}\n```',
    },
    {'role': 'user', 'text': 'My DBMS exam is in 4 days. Create a study plan'},
    {
      'role': 'ai',
      'text': '**4-Day DBMS Exam Plan 📅**\n\n**Day 1 — Foundation**\n• ER Diagrams & Relational Model (2h)\n• Normalization (1NF→BCNF) (1.5h)\n• Practice ER Problems (0.5h)\n\n**Day 2 — SQL Deep Dive**\n• DDL, DML, DCL Commands (1h)\n• Joins (INNER, LEFT, RIGHT, FULL) (1.5h)\n• Subqueries & Aggregation (1h)\n\n**Day 3 — Advanced Topics**\n• Transactions & ACID Properties (1h)\n• Concurrency Control (Locks, 2PL) (1.5h)\n• Indexing (B-Tree, Hash Index) (1h)\n\n**Day 4 — Revision & Practice**\n• Full syllabus quick revision (2h)\n• Previous year questions (1.5h)\n• Weak areas focus (0.5h)\n\n💡 Tip: Focus most time on SQL and Normalization — they carry 60% of marks!',
    },
  ];

  final List<String> _quickActions = ['Summarize Notes', 'Create MCQ', 'Study Plan', 'Explain Concept', 'Viva Questions'];

  void _sendMessage() async {
    if (_controller.text.trim().isEmpty) return;
    final text = _controller.text.trim();
    _controller.clear();

    setState(() {
      _messages.add({'role': 'user', 'text': text});
      _isTyping = true;
    });

    _scrollToBottom();

    await Future.delayed(const Duration(milliseconds: 1500));
    setState(() {
      _isTyping = false;
      _messages.add({
        'role': 'ai',
        'text': 'Great question! 🤖 Here\'s what I found:\n\n**$text**\n\nThis is a comprehensive topic in computer science. Let me break it down for you with clear examples and key concepts that will be helpful for your exam preparation.\n\n• Key concept 1: Understanding the fundamentals\n• Key concept 2: Practical applications\n• Key concept 3: Common interview questions\n\nWould you like me to create practice MCQs on this topic?',
      });
    });
    _scrollToBottom();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: CustomAppBar(
        title: 'AI Copilot 🤖',
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                gradient: AppColors.gradientPrimary,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text('Gemini', style: AppTextStyles.caption.copyWith(color: Colors.white)),
            ),
          ),
        ],
        showBack: true,
      ),
      body: Column(
        children: [
          // Quick action chips
          SizedBox(
            height: 44,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              children: _quickActions.map((a) => Padding(
                padding: const EdgeInsets.only(right: 8),
                child: GestureDetector(
                  onTap: () {
                    _controller.text = a;
                    _sendMessage();
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: AppColors.primary.withOpacity(0.4)),
                    ),
                    child: Text(a, style: AppTextStyles.caption.copyWith(color: AppColors.primary)),
                  ),
                ),
              )).toList(),
            ),
          ),
          const Divider(color: AppColors.border, height: 1),

          // Messages
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(12),
              itemCount: _messages.length + (_isTyping ? 1 : 0),
              itemBuilder: (context, i) {
                if (_isTyping && i == _messages.length) return _buildTypingIndicator();
                final msg = _messages[i];
                return _buildMessage(msg);
              },
            ),
          ),

          // Input bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: AppColors.surface,
              border: const Border(top: BorderSide(color: AppColors.border)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _controller,
                    style: const TextStyle(color: Colors.white),
                    maxLines: null,
                    decoration: InputDecoration(
                      hintText: 'Ask me anything...',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: BorderSide.none),
                      filled: true,
                      fillColor: AppColors.card,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    ),
                    onSubmitted: (_) => _sendMessage(),
                  ),
                ),
                const SizedBox(width: 8),
                GestureDetector(
                  onTap: _sendMessage,
                  child: Container(
                    width: 48, height: 48,
                    decoration: const BoxDecoration(
                      gradient: AppColors.gradientPrimary,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.send_rounded, color: Colors.white, size: 20),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMessage(Map<String, dynamic> msg) {
    final isAi = msg['role'] == 'ai';
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        mainAxisAlignment: isAi ? MainAxisAlignment.start : MainAxisAlignment.end,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (isAi) ...[
            Container(
              width: 32, height: 32,
              decoration: const BoxDecoration(gradient: AppColors.gradientPrimary, shape: BoxShape.circle),
              child: const Center(child: Text('🤖', style: TextStyle(fontSize: 16))),
            ),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                gradient: isAi ? null : AppColors.gradientPrimary,
                color: isAi ? AppColors.card : null,
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(16),
                  topRight: const Radius.circular(16),
                  bottomLeft: Radius.circular(isAi ? 4 : 16),
                  bottomRight: Radius.circular(isAi ? 16 : 4),
                ),
                border: isAi ? Border.all(color: AppColors.border) : null,
              ),
              child: Text(msg['text'], style: AppTextStyles.body.copyWith(color: Colors.white)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTypingIndicator() {
    return Row(
      children: [
        Container(
          width: 32, height: 32,
          decoration: const BoxDecoration(gradient: AppColors.gradientPrimary, shape: BoxShape.circle),
          child: const Center(child: Text('🤖', style: TextStyle(fontSize: 16))),
        ),
        const SizedBox(width: 8),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.border)),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: List.generate(3, (i) => _TypingDot(delay: i * 200)),
          ),
        ),
      ],
    );
  }
}

class _TypingDot extends StatefulWidget {
  final int delay;
  const _TypingDot({required this.delay});

  @override
  State<_TypingDot> createState() => _TypingDotState();
}

class _TypingDotState extends State<_TypingDot> with SingleTickerProviderStateMixin {
  late AnimationController _c;

  @override
  void initState() {
    super.initState();
    _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 600))
      ..repeat(reverse: true);
    Future.delayed(Duration(milliseconds: widget.delay), () {
      if (mounted) _c.forward();
    });
  }

  @override
  void dispose() { _c.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _c,
      builder: (_, __) => Padding(
        padding: const EdgeInsets.symmetric(horizontal: 3),
        child: Container(
          width: 8, height: 8,
          decoration: BoxDecoration(
            color: AppColors.primary.withOpacity(0.4 + 0.6 * _c.value),
            shape: BoxShape.circle,
          ),
        ),
      ),
    );
  }
}
