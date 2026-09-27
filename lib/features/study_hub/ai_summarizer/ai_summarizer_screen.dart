import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/widgets/glass_card.dart';
import '../../../core/widgets/gradient_button.dart';
import '../../../core/widgets/custom_app_bar.dart';

class AiSummarizerScreen extends StatefulWidget {
  const AiSummarizerScreen({super.key});

  @override
  State<AiSummarizerScreen> createState() => _AiSummarizerScreenState();
}

class _AiSummarizerScreenState extends State<AiSummarizerScreen> {
  final _inputController = TextEditingController();
  bool _summarized = false;
  bool _loading = false;

  final String _sampleSummary = '''
**📌 Key Concepts**
• Binary Search Trees (BST) maintain the BST property: left < root < right
• Balanced BSTs (AVL, Red-Black) guarantee O(log n) for search/insert/delete
• Unbalanced BSTs degrade to O(n) in worst case (linked list)

**🔑 Important Operations**
1. Search: O(log n) average, O(n) worst
2. Insert: O(log n) average with rebalancing
3. Delete: 3 cases — leaf, one child, two children

**📊 Comparison Table**
| Type     | Search | Insert | Delete |
|----------|--------|--------|--------|
| BST      | O(log n)| O(log n)| O(log n)|
| AVL Tree | O(log n)| O(log n)| O(log n)|
| Heap     | O(n)  | O(log n)| O(log n)|

**💡 Key Takeaway**
Use AVL trees when frequent lookups are needed. Use Red-Black trees for databases (like Linux kernel, Java TreeMap).
''';

  final String _sampleInput = '''Binary Search Trees are a fundamental data structure in computer science. A BST is a rooted binary tree where each node contains a key, and the keys in the left subtree are less than the root key, while keys in the right subtree are greater. This property enables efficient searching in O(log n) time for balanced trees. However, in the worst case, when the tree becomes skewed (like a linked list), operations degrade to O(n). To maintain balance, self-balancing BSTs like AVL trees and Red-Black trees were developed. AVL trees maintain strict balance by ensuring the height difference between left and right subtrees is at most 1, while Red-Black trees use color properties to maintain approximate balance with fewer rotations.''';

  void _summarize() async {
    setState(() { _loading = true; _summarized = false; });
    await Future.delayed(const Duration(seconds: 2));
    setState(() { _loading = false; _summarized = true; });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: CustomAppBar(title: 'AI Summarizer ✨', showBack: true),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: AppColors.gradientPrimary,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Row(
                children: [
                  const Text('✨', style: TextStyle(fontSize: 32)),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('AI Note Summarizer', style: AppTextStyles.headingSmall),
                        Text('Powered by Gemini — paste text or scan notes', style: AppTextStyles.bodySmall.copyWith(color: Colors.white70)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Input
            GlassCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text('Your Notes', style: AppTextStyles.titleMedium),
                      const Spacer(),
                      GestureDetector(
                        onTap: () => _inputController.text = _sampleInput,
                        child: Text('Use sample', style: AppTextStyles.caption.copyWith(color: AppColors.primary)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: _inputController,
                    maxLines: 6,
                    style: const TextStyle(color: Colors.white),
                    decoration: const InputDecoration(hintText: 'Paste your notes here...'),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(child: GradientButton(
                        text: _loading ? 'Summarizing...' : '✨ Summarize',
                        isLoading: _loading,
                        onTap: _summarize,
                      )),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Output
            if (_loading)
              const Center(child: Padding(
                padding: EdgeInsets.all(32),
                child: Column(
                  children: [
                    CircularProgressIndicator(valueColor: AlwaysStoppedAnimation(AppColors.primary)),
                    SizedBox(height: 16),
                    Text('AI is reading your notes...', style: TextStyle(color: AppColors.textSecondary)),
                  ],
                ),
              ))
            else if (_summarized) ...[
              GlassCard(
                borderColor: AppColors.primary.withOpacity(0.4),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.auto_awesome, color: AppColors.primary, size: 20),
                        const SizedBox(width: 8),
                        Text('AI Summary', style: AppTextStyles.titleMedium),
                        const Spacer(),
                        GestureDetector(
                          onTap: () {},
                          child: const Icon(Icons.copy, color: AppColors.textMuted, size: 18),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(_sampleSummary, style: AppTextStyles.body),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(child: GradientButton(
                    text: '📝 Generate MCQ',
                    gradient: LinearGradient(colors: [AppColors.secondary, AppColors.primary]),
                    onTap: () {},
                  )),
                  const SizedBox(width: 10),
                  Expanded(child: GradientButton(
                    text: '💾 Save Note',
                    gradient: LinearGradient(colors: [AppColors.accentGreen, AppColors.accent]),
                    onTap: () {},
                  )),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}
