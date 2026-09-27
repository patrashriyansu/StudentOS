import 'dart:math' as math;
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class LeetCodeTrackerScreen extends StatefulWidget {
  const LeetCodeTrackerScreen({super.key});

  @override
  State<LeetCodeTrackerScreen> createState() => _LeetCodeTrackerScreenState();
}

class _LeetCodeTrackerScreenState extends State<LeetCodeTrackerScreen>
    with TickerProviderStateMixin {
  late AnimationController _progressController;
  late AnimationController _fadeController;
  late Animation<double> _progressAnim;
  late Animation<double> _fadeAnim;

  static const Color _easy = Color(0xFF00E676);
  static const Color _medium = Color(0xFFFFB74D);
  static const Color _hard = Color(0xFFFF5252);
  static const Color _accent = Color(0xFFFFB74D);

  final List<_TopicProgress> _topics = [
    _TopicProgress('Arrays', 0.85, const Color(0xFF6C63FF)),
    _TopicProgress('Trees', 0.72, const Color(0xFF00D4FF)),
    _TopicProgress('Graphs', 0.45, const Color(0xFFFF5252)),
    _TopicProgress('Dynamic Programming', 0.38, const Color(0xFFFF5252)),
    _TopicProgress('Trie', 0.20, const Color(0xFFFF5252)),
  ];

  final List<_Recommendation> _recommendations = [
    _Recommendation(
        number: 200,
        title: 'Number of Islands',
        category: 'Graph',
        difficulty: 'Medium',
        difficultyColor: const Color(0xFFFFB74D)),
    _Recommendation(
        number: 994,
        title: 'Rotting Oranges',
        category: 'BFS',
        difficulty: 'Medium',
        difficultyColor: const Color(0xFFFFB74D)),
    _Recommendation(
        number: 133,
        title: 'Clone Graph',
        category: 'Graph',
        difficulty: 'Medium',
        difficultyColor: const Color(0xFFFFB74D)),
  ];

  // 7x7 mock heatmap data (0=none, 1=light, 2=medium, 3=high)
  final List<List<int>> _heatmap = [
    [0, 1, 2, 3, 2, 1, 0],
    [1, 2, 3, 3, 2, 2, 1],
    [0, 1, 1, 2, 3, 2, 1],
    [2, 2, 3, 3, 2, 1, 0],
    [1, 3, 3, 2, 1, 2, 3],
    [0, 1, 2, 3, 3, 2, 1],
    [2, 2, 1, 0, 1, 3, 2],
  ];

  @override
  void initState() {
    super.initState();
    _progressController = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 1400));
    _fadeController = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 700));

    _progressAnim = CurvedAnimation(
        parent: _progressController, curve: Curves.easeOutCubic);
    _fadeAnim =
        CurvedAnimation(parent: _fadeController, curve: Curves.easeOut);

    _fadeController.forward();
    Future.delayed(const Duration(milliseconds: 300),
        () { if (mounted) _progressController.forward(); });
  }

  @override
  void dispose() {
    _progressController.dispose();
    _fadeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0A0A0F),
      body: FadeTransition(
        opacity: _fadeAnim,
        child: CustomScrollView(
          physics: const BouncingScrollPhysics(),
          slivers: [
            _buildAppBar(context),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
                child: Column(
                  children: [
                    _buildProgressRing(),
                    const SizedBox(height: 20),
                    _buildStatBars(),
                    const SizedBox(height: 20),
                    _buildStreakCard(),
                    const SizedBox(height: 20),
                    _buildAIAnalysis(),
                    const SizedBox(height: 20),
                    _buildRecommendations(),
                    const SizedBox(height: 40),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAppBar(BuildContext context) {
    return SliverAppBar(
      backgroundColor: const Color(0xFF12121A),
      surfaceTintColor: Colors.transparent,
      leading: IconButton(
        onPressed: () => Navigator.of(context).pop(),
        icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white),
      ),
      title: Text(
        'LeetCode Tracker',
        style: GoogleFonts.outfit(
            fontSize: 20, fontWeight: FontWeight.w700, color: Colors.white),
      ),
      centerTitle: true,
      actions: [
        IconButton(
          onPressed: () {},
          icon: Icon(Icons.refresh_rounded, color: _accent),
        ),
      ],
      pinned: true,
    );
  }

  Widget _buildProgressRing() {
    return ClipRRect(
      borderRadius: BorderRadius.circular(24),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: const Color(0xFF1A1A2E),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: _accent.withOpacity(0.25), width: 1.2),
          ),
          child: Row(
            children: [
              AnimatedBuilder(
                animation: _progressAnim,
                builder: (context, _) {
                  return CustomPaint(
                    size: const Size(120, 120),
                    painter: _RingPainter(
                      progress: _progressAnim.value * (250 / 2000),
                      color: _accent,
                    ),
                    child: SizedBox(
                      width: 120,
                      height: 120,
                      child: Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              '${(250 * _progressAnim.value).toInt()}',
                              style: GoogleFonts.outfit(
                                fontSize: 26,
                                fontWeight: FontWeight.w800,
                                color: Colors.white,
                              ),
                            ),
                            Text(
                              '/ 2000',
                              style: GoogleFonts.outfit(
                                  fontSize: 11, color: Colors.white54),
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                },
              ),
              const SizedBox(width: 24),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Total Solved',
                      style: GoogleFonts.outfit(
                          fontSize: 13,
                          color: Colors.white54,
                          fontWeight: FontWeight.w500),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '250 Problems',
                      style: GoogleFonts.outfit(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 12),
                    _buildMiniStat('Rank', '#12,345', Icons.leaderboard_rounded),
                    const SizedBox(height: 8),
                    _buildMiniStat('Acceptance', '62.4%', Icons.check_circle_outline_rounded),
                    const SizedBox(height: 8),
                    _buildMiniStat('Submissions', '389', Icons.upload_rounded),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMiniStat(String label, String value, IconData icon) {
    return Row(
      children: [
        Icon(icon, size: 14, color: _accent),
        const SizedBox(width: 6),
        Text(label,
            style:
                GoogleFonts.outfit(fontSize: 11, color: Colors.white54)),
        const Spacer(),
        Text(value,
            style: GoogleFonts.outfit(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: Colors.white)),
      ],
    );
  }

  Widget _buildStatBars() {
    return ClipRRect(
      borderRadius: BorderRadius.circular(20),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: const Color(0xFF1A1A2E),
            borderRadius: BorderRadius.circular(20),
            border:
                Border.all(color: Colors.white.withOpacity(0.08), width: 1),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Difficulty Breakdown',
                style: GoogleFonts.outfit(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: Colors.white),
              ),
              const SizedBox(height: 16),
              _buildDifficultyBar('Easy', 150, 750, _easy),
              const SizedBox(height: 14),
              _buildDifficultyBar('Medium', 80, 600, _medium),
              const SizedBox(height: 14),
              _buildDifficultyBar('Hard', 20, 200, _hard),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDifficultyBar(
      String label, int solved, int total, Color color) {
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                      color: color, shape: BoxShape.circle),
                ),
                const SizedBox(width: 8),
                Text(label,
                    style: GoogleFonts.outfit(
                        fontSize: 13, color: Colors.white70)),
              ],
            ),
            Text(
              '$solved / $total',
              style: GoogleFonts.outfit(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: color),
            ),
          ],
        ),
        const SizedBox(height: 6),
        AnimatedBuilder(
          animation: _progressAnim,
          builder: (_, __) => ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
              value: _progressAnim.value * (solved / total),
              backgroundColor: color.withOpacity(0.12),
              valueColor: AlwaysStoppedAnimation<Color>(color),
              minHeight: 8,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildStreakCard() {
    return ClipRRect(
      borderRadius: BorderRadius.circular(20),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                const Color(0xFFFF6B35).withOpacity(0.15),
                const Color(0xFFFFB74D).withOpacity(0.08),
              ],
            ),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
                color: const Color(0xFFFF6B35).withOpacity(0.3), width: 1.2),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Text('🔥', style: TextStyle(fontSize: 28)),
                  const SizedBox(width: 12),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '45 Day Streak!',
                        style: GoogleFonts.outfit(
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                        ),
                      ),
                      Text(
                        'Keep it up! Don\'t break the chain.',
                        style: GoogleFonts.outfit(
                            fontSize: 12, color: Colors.white54),
                      ),
                    ],
                  ),
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFF6B35).withOpacity(0.2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      'Best: 60d',
                      style: GoogleFonts.outfit(
                          fontSize: 11,
                          color: const Color(0xFFFFB74D),
                          fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              Text(
                'Activity Heatmap',
                style: GoogleFonts.outfit(
                    fontSize: 12,
                    color: Colors.white54,
                    fontWeight: FontWeight.w500),
              ),
              const SizedBox(height: 10),
              _buildHeatmap(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeatmap() {
    const cellSize = 28.0;
    const gap = 4.0;
    final colors = [
      Colors.white10,
      const Color(0xFFFF6B35).withOpacity(0.35),
      const Color(0xFFFF6B35).withOpacity(0.65),
      const Color(0xFFFF6B35),
    ];
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: List.generate(7, (col) {
        return Column(
          children: List.generate(7, (row) {
            final intensity = _heatmap[row][col];
            return Container(
              width: cellSize,
              height: cellSize,
              margin: const EdgeInsets.only(bottom: gap),
              decoration: BoxDecoration(
                color: colors[intensity],
                borderRadius: BorderRadius.circular(6),
              ),
            );
          }),
        );
      }),
    );
  }

  Widget _buildAIAnalysis() {
    return ClipRRect(
      borderRadius: BorderRadius.circular(20),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                const Color(0xFF6C63FF).withOpacity(0.12),
                const Color(0xFFA855F7).withOpacity(0.06),
              ],
            ),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
                color: const Color(0xFF6C63FF).withOpacity(0.3), width: 1.2),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                          colors: [Color(0xFF6C63FF), Color(0xFFA855F7)]),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.auto_awesome_rounded,
                        color: Colors.white, size: 16),
                  ),
                  const SizedBox(width: 10),
                  Text(
                    'AI Analysis',
                    style: GoogleFonts.outfit(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: Colors.white),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: const Color(0xFFFF5252).withOpacity(0.12),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                      color: const Color(0xFFFF5252).withOpacity(0.25)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.warning_amber_rounded,
                        color: Color(0xFFFF5252), size: 16),
                    const SizedBox(width: 8),
                    Text(
                      'Weak Topics: Graphs, DP, Trie',
                      style: GoogleFonts.outfit(
                          fontSize: 12,
                          color: const Color(0xFFFF8A80),
                          fontWeight: FontWeight.w500),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              ...List.generate(_topics.length, (i) {
                final t = _topics[i];
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(t.name,
                              style: GoogleFonts.outfit(
                                  fontSize: 12, color: Colors.white70)),
                          Text(
                            '${(t.progress * 100).toInt()}%',
                            style: GoogleFonts.outfit(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: t.color),
                          ),
                        ],
                      ),
                      const SizedBox(height: 5),
                      AnimatedBuilder(
                        animation: _progressAnim,
                        builder: (_, __) => ClipRRect(
                          borderRadius: BorderRadius.circular(6),
                          child: LinearProgressIndicator(
                            value: _progressAnim.value * t.progress,
                            backgroundColor: t.color.withOpacity(0.12),
                            valueColor: AlwaysStoppedAnimation<Color>(t.color),
                            minHeight: 7,
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              }),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRecommendations() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(Icons.recommend_rounded,
                color: Color(0xFF00D4FF), size: 18),
            const SizedBox(width: 8),
            Text(
              'Smart Recommendations',
              style: GoogleFonts.outfit(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: Colors.white),
            ),
          ],
        ),
        const SizedBox(height: 12),
        ...List.generate(_recommendations.length, (i) {
          final r = _recommendations[i];
          return Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: _buildRecommendationCard(r),
          );
        }),
      ],
    );
  }

  Widget _buildRecommendationCard(_Recommendation r) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFF1A1A2E),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
                color: Colors.white.withOpacity(0.08), width: 1),
          ),
          child: Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: const Color(0xFF00D4FF).withOpacity(0.12),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                      color: const Color(0xFF00D4FF).withOpacity(0.3)),
                ),
                child: Center(
                  child: Text(
                    '${r.number}',
                    style: GoogleFonts.outfit(
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                      color: const Color(0xFF00D4FF),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      r.title,
                      style: GoogleFonts.outfit(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: Colors.white),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        _buildChip(r.category,
                            const Color(0xFF6C63FF)),
                        const SizedBox(width: 6),
                        _buildChip(
                            r.difficulty, r.difficultyColor),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 10),
              GestureDetector(
                onTap: () {},
                child: Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF6C63FF), Color(0xFFA855F7)],
                    ),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    'Solve',
                    style: GoogleFonts.outfit(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: Colors.white),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildChip(String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color.withOpacity(0.35)),
      ),
      child: Text(
        label,
        style: GoogleFonts.outfit(
            fontSize: 10, color: color, fontWeight: FontWeight.w600),
      ),
    );
  }
}

class _RingPainter extends CustomPainter {
  final double progress;
  final Color color;

  _RingPainter({required this.progress, required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = math.min(size.width, size.height) / 2 - 8;
    const strokeWidth = 10.0;

    final bgPaint = Paint()
      ..color = Colors.white10
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    final fgPaint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round
      ..maskFilter = MaskFilter.blur(BlurStyle.outer, 4);

    canvas.drawCircle(center, radius, bgPaint);
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      -math.pi / 2,
      2 * math.pi * progress,
      false,
      fgPaint,
    );
  }

  @override
  bool shouldRepaint(_RingPainter oldDelegate) =>
      oldDelegate.progress != progress;
}

class _TopicProgress {
  final String name;
  final double progress;
  final Color color;
  _TopicProgress(this.name, this.progress, this.color);
}

class _Recommendation {
  final int number;
  final String title;
  final String category;
  final String difficulty;
  final Color difficultyColor;

  _Recommendation({
    required this.number,
    required this.title,
    required this.category,
    required this.difficulty,
    required this.difficultyColor,
  });
}
