import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/widgets/glass_card.dart';
import '../../../core/widgets/custom_app_bar.dart';

class DsaRoadmapScreen extends StatefulWidget {
  const DsaRoadmapScreen({super.key});

  @override
  State<DsaRoadmapScreen> createState() => _DsaRoadmapScreenState();
}

class _DsaRoadmapScreenState extends State<DsaRoadmapScreen> {
  final List<Map<String, dynamic>> _topics = [
    {'name': 'Arrays & Strings', 'status': 'completed', 'progress': 1.0, 'problems': '45/45', 'icon': '📦', 'subtopics': ['Two Pointers', 'Sliding Window', 'Prefix Sum', 'Sorting']},
    {'name': 'Linked Lists', 'status': 'completed', 'progress': 1.0, 'problems': '28/28', 'icon': '🔗', 'subtopics': ['Reversal', 'Fast/Slow Pointers', 'Cycle Detection']},
    {'name': 'Stack & Queue', 'status': 'in_progress', 'progress': 0.7, 'problems': '21/30', 'icon': '📚', 'subtopics': ['Monotonic Stack', 'Deque', 'Min Stack']},
    {'name': 'Trees', 'status': 'in_progress', 'progress': 0.5, 'problems': '25/50', 'icon': '🌳', 'subtopics': ['DFS/BFS', 'Binary Search Tree', 'LCA', 'Segment Tree']},
    {'name': 'Graphs', 'status': 'not_started', 'progress': 0.0, 'problems': '0/60', 'icon': '🕸️', 'subtopics': ['BFS/DFS', 'Dijkstra', 'Union Find', 'Topological Sort']},
    {'name': 'Dynamic Programming', 'status': 'not_started', 'progress': 0.0, 'problems': '0/80', 'icon': '🧠', 'subtopics': ['1D DP', '2D DP', 'Knapsack', 'LCS', 'Matrix Chain']},
    {'name': 'Greedy', 'status': 'not_started', 'progress': 0.0, 'problems': '0/25', 'icon': '⚡', 'subtopics': ['Interval Scheduling', 'Activity Selection']},
    {'name': 'Backtracking', 'status': 'not_started', 'progress': 0.0, 'problems': '0/20', 'icon': '🔄', 'subtopics': ['Permutations', 'Subsets', 'N-Queens']},
  ];

  Set<int> _expanded = {};

  Color _statusColor(String status) {
    switch (status) {
      case 'completed': return AppColors.accentGreen;
      case 'in_progress': return AppColors.accentOrange;
      default: return AppColors.textMuted;
    }
  }

  String _statusLabel(String status) {
    switch (status) {
      case 'completed': return '✅ Done';
      case 'in_progress': return '🔄 In Progress';
      default: return '⬜ Not Started';
    }
  }

  @override
  Widget build(BuildContext context) {
    final completedCount = _topics.where((t) => t['status'] == 'completed').length;
    final inProgressCount = _topics.where((t) => t['status'] == 'in_progress').length;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: CustomAppBar(title: 'DSA Roadmap', showBack: true),
      body: Column(
        children: [
          // Overall progress
          Padding(
            padding: const EdgeInsets.all(16),
            child: GlassCard(
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _RoadmapStat(label: 'Completed', value: '$completedCount', color: AppColors.accentGreen),
                  Container(width: 1, height: 40, color: AppColors.border),
                  _RoadmapStat(label: 'In Progress', value: '$inProgressCount', color: AppColors.accentOrange),
                  Container(width: 1, height: 40, color: AppColors.border),
                  _RoadmapStat(label: 'Remaining', value: '${_topics.length - completedCount - inProgressCount}', color: AppColors.textMuted),
                ],
              ),
            ),
          ),

          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: _topics.length,
              itemBuilder: (context, i) {
                final topic = _topics[i];
                final isExpanded = _expanded.contains(i);
                final color = _statusColor(topic['status']);

                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Column(
                    children: [
                      if (i > 0)
                        Padding(
                          padding: const EdgeInsets.only(left: 20, bottom: 4),
                          child: Container(width: 2, height: 16, color: AppColors.border),
                        ),
                      GlassCard(
                        borderColor: color.withOpacity(0.4),
                        child: Column(
                          children: [
                            GestureDetector(
                              onTap: () => setState(() {
                                if (isExpanded) _expanded.remove(i);
                                else _expanded.add(i);
                              }),
                              child: Row(
                                children: [
                                  Text(topic['icon'], style: const TextStyle(fontSize: 24)),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(topic['name'], style: AppTextStyles.titleMedium),
                                        const SizedBox(height: 4),
                                        LinearProgressIndicator(
                                          value: topic['progress'] as double,
                                          backgroundColor: AppColors.border,
                                          valueColor: AlwaysStoppedAnimation(color),
                                          borderRadius: BorderRadius.circular(4),
                                        ),
                                        const SizedBox(height: 4),
                                        Row(
                                          children: [
                                            Text(topic['problems'], style: AppTextStyles.caption.copyWith(color: color)),
                                            const SizedBox(width: 8),
                                            Text(_statusLabel(topic['status']), style: AppTextStyles.caption),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                  Icon(isExpanded ? Icons.expand_less : Icons.expand_more, color: AppColors.textMuted),
                                ],
                              ),
                            ),
                            if (isExpanded) ...[
                              const SizedBox(height: 12),
                              const Divider(color: AppColors.border),
                              const SizedBox(height: 8),
                              Wrap(
                                spacing: 8,
                                runSpacing: 8,
                                children: (topic['subtopics'] as List<String>).map((s) => Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                  decoration: BoxDecoration(
                                    color: color.withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(color: color.withOpacity(0.3)),
                                  ),
                                  child: Text(s, style: AppTextStyles.caption.copyWith(color: color)),
                                )).toList(),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ],
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

class _RoadmapStat extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  const _RoadmapStat({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(value, style: TextStyle(color: color, fontSize: 24, fontWeight: FontWeight.bold)),
        Text(label, style: AppTextStyles.caption),
      ],
    );
  }
}
