import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/widgets/glass_card.dart';
import '../../../core/widgets/stat_card.dart';
import '../../../core/widgets/section_header.dart';
import 'widgets/hero_twin_card.dart';
import 'widgets/task_item.dart';

// ── Mock data ─────────────────────────────────────────────────────────────────

class _Task {
  const _Task(this.title, this.tag, this.tagColor);
  final String title;
  final String tag;
  final Color tagColor;
}

class _Exam {
  const _Exam(this.subject, this.daysLeft, this.color);
  final String subject;
  final int daysLeft;
  final Color color;
}

class _Hub {
  const _Hub(this.title, this.emoji, this.color, this.route);
  final String title;
  final String emoji;
  final Color color;
  final String route;
}

final _mockTasks = const [
  _Task('Submit OS Assignment', 'CS', Color(0xFF6C63FF)),
  _Task('Solve 3 LeetCode', 'Coding', Color(0xFFFFB74D)),
  _Task('Attend DBMS Lecture', 'Lecture', Color(0xFF4FC3F7)),
  _Task('Water: 6 Glasses', 'Wellness', Color(0xFF81C784)),
  _Task('Review Resume', 'Career', Color(0xFFCE93D8)),
];

final _mockExams = const [
  _Exam('Operating Systems', 3, Color(0xFF6C63FF)),
  _Exam('DBMS', 7, Color(0xFF4FC3F7)),
];

final _mockHubs = const [
  _Hub('Study Hub', '📚', Color(0xFF4FC3F7), '/study-hub'),
  _Hub('Academic Hub', '🎓', Color(0xFF81C784), '/academic-hub'),
  _Hub('Coding Hub', '💻', Color(0xFFFFB74D), '/coding-hub'),
  _Hub('Placement Hub', '💼', Color(0xFFCE93D8), '/placement-hub'),
  _Hub('Wellness Hub', '🧘', Color(0xFFEF9A9A), '/wellness-hub'),
  _Hub('Finance Hub', '💰', Color(0xFF80CBC4), '/finance-hub'),
];

// ── Dashboard Screen ──────────────────────────────────────────────────────────

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen>
    with TickerProviderStateMixin {
  late final AnimationController _headerController;
  late final Animation<double> _headerFade;
  late final Animation<Offset> _headerSlide;

  late final AnimationController _bodyController;
  late final Animation<double> _bodyFade;

  final ScrollController _scrollController = ScrollController();
  double _headerOpacity = 0.0;

  @override
  void initState() {
    super.initState();

    // Header entrance
    _headerController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 700),
    );
    _headerFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _headerController, curve: Curves.easeOut),
    );
    _headerSlide =
        Tween<Offset>(begin: const Offset(0, -0.3), end: Offset.zero).animate(
      CurvedAnimation(
          parent: _headerController, curve: Curves.easeOutCubic),
    );

    // Body entrance
    _bodyController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
    _bodyFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _bodyController, curve: Curves.easeOut),
    );

    _headerController.forward();
    Future.delayed(const Duration(milliseconds: 200), () {
      if (mounted) _bodyController.forward();
    });

    _scrollController.addListener(_onScroll);
  }

  void _onScroll() {
    final offset = _scrollController.offset;
    setState(() {
      _headerOpacity = (offset / 80).clamp(0.0, 1.0);
    });
  }

  @override
  void dispose() {
    _headerController.dispose();
    _bodyController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  String _greeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good Morning ☀️';
    if (hour < 17) return 'Good Afternoon 🌤️';
    if (hour < 21) return 'Good Evening 🌆';
    return 'Good Night 🌙';
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Stack(
        children: [
          // ── Background ambiance ────────────────────────────────────────────
          _buildBackground(size),

          // ── Scrollable body ────────────────────────────────────────────────
          SafeArea(
            bottom: false,
            child: Column(
              children: [
                // Fixed header
                _buildHeader(),

                // Scrollable content
                Expanded(
                  child: FadeTransition(
                    opacity: _bodyFade,
                    child: CustomScrollView(
                      controller: _scrollController,
                      physics: const BouncingScrollPhysics(),
                      slivers: [
                        SliverPadding(
                          padding: const EdgeInsets.fromLTRB(20, 4, 20, 120),
                          sliver: SliverList(
                            delegate: SliverChildListDelegate([
                              // 1. Hero card
                              const HeroTwinCard(),
                              const SizedBox(height: 24),

                              // 2. Quick stats 2×2 grid
                              _buildQuickStatsGrid(),
                              const SizedBox(height: 28),

                              // 3. Today's tasks
                              _buildTasksSection(),
                              const SizedBox(height: 28),

                              // 4. Upcoming exams
                              _buildExamsSection(),
                              const SizedBox(height: 28),

                              // 5. Hubs shortcut grid
                              _buildHubsSection(context),
                              const SizedBox(height: 28),

                              // 6. AI assistant quick access
                              _buildAiCard(context),
                            ]),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),

          // ── Scrolled header background blur ──────────────────────────────
          if (_headerOpacity > 0)
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              height: MediaQuery.of(context).padding.top + 80,
              child: Opacity(
                opacity: _headerOpacity,
                child: ClipRect(
                  child: BackdropFilter(
                    filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
                    child: Container(
                      color: AppColors.background.withOpacity(0.7),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  // ── Background ─────────────────────────────────────────────────────────────

  Widget _buildBackground(Size size) {
    return Stack(
      children: [
        Container(color: AppColors.background),
        // Top-left glow
        Positioned(
          top: -100,
          left: -60,
          child: Container(
            width: 300,
            height: 300,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: RadialGradient(
                colors: [
                  AppColors.primary.withOpacity(0.18),
                  Colors.transparent,
                ],
              ),
            ),
          ),
        ),
        // Top-right glow
        Positioned(
          top: 0,
          right: -80,
          child: Container(
            width: 250,
            height: 250,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: RadialGradient(
                colors: [
                  AppColors.secondary.withOpacity(0.12),
                  Colors.transparent,
                ],
              ),
            ),
          ),
        ),
        // Bottom glow
        Positioned(
          bottom: -80,
          right: 60,
          child: Container(
            width: 200,
            height: 200,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: RadialGradient(
                colors: [
                  AppColors.accent.withOpacity(0.08),
                  Colors.transparent,
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  // ── Header ─────────────────────────────────────────────────────────────────

  Widget _buildHeader() {
    return FadeTransition(
      opacity: _headerFade,
      child: SlideTransition(
        position: _headerSlide,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 14, 20, 12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // Left: greeting
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _greeting(),
                      style: AppTextStyles.bodyMedium.copyWith(
                        color: AppColors.textSecondary,
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 3),
                    ShaderMask(
                      shaderCallback: (bounds) =>
                          AppColors.gradientPrimary.createShader(bounds),
                      child: Text(
                        'Shriyansu 👋',
                        style: AppTextStyles.headingMedium.copyWith(
                          color: Colors.white,
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          letterSpacing: -0.5,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // Right: notification bell + avatar
              Row(
                children: [
                  _NotificationBell(
                    count: 3,
                    onTap: () {},
                  ),
                  const SizedBox(width: 12),
                  _AvatarCircle(
                    initials: 'S',
                    onTap: () {},
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ── Quick stats 2×2 grid ───────────────────────────────────────────────────

  Widget _buildQuickStatsGrid() {
    return GridView.count(
      crossAxisCount: 2,
      crossAxisSpacing: 14,
      mainAxisSpacing: 14,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      childAspectRatio: 1.55,
      children: [
        AnimatedStatCard(
          label: 'Attendance',
          value: '82%',
          subtitle: 'This semester',
          icon: Icons.calendar_today_rounded,
          color: AppColors.accent,
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              AppColors.accent.withOpacity(0.18),
              AppColors.card.withOpacity(0.6),
            ],
          ),
        ),
        AnimatedStatCard(
          label: 'Current CGPA',
          value: '8.5',
          subtitle: '/ 10.0 scale',
          icon: Icons.school_rounded,
          color: AppColors.accentGreen,
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              AppColors.accentGreen.withOpacity(0.18),
              AppColors.card.withOpacity(0.6),
            ],
          ),
        ),
        AnimatedStatCard(
          label: 'LeetCode Streak',
          value: '45',
          subtitle: 'Days in a row 🔥',
          icon: Icons.local_fire_department_rounded,
          color: AppColors.accentOrange,
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              AppColors.accentOrange.withOpacity(0.18),
              AppColors.card.withOpacity(0.6),
            ],
          ),
        ),
        AnimatedStatCard(
          label: 'Predicted CGPA',
          value: '9.0',
          subtitle: 'End of semester',
          icon: Icons.trending_up_rounded,
          color: AppColors.secondary,
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              AppColors.secondary.withOpacity(0.18),
              AppColors.card.withOpacity(0.6),
            ],
          ),
        ),
      ],
    );
  }

  // ── Today's tasks ──────────────────────────────────────────────────────────

  Widget _buildTasksSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SectionHeader(
          title: "Today's Tasks",
          actionText: 'See All',
          onAction: () {},
        ),
        const SizedBox(height: 14),
        GlassCard(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Column(
            children: List.generate(_mockTasks.length, (i) {
              final task = _mockTasks[i];
              return TaskItem(
                title: task.title,
                tag: task.tag,
                tagColor: task.tagColor,
                animationDelay: Duration(milliseconds: 80 * i),
              );
            }),
          ),
        ),
      ],
    );
  }

  // ── Upcoming exams ─────────────────────────────────────────────────────────

  Widget _buildExamsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SectionHeader(
          title: 'Upcoming Exams',
          actionText: 'View All',
          onAction: () {},
        ),
        const SizedBox(height: 14),
        SizedBox(
          height: 130,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: _mockExams.length,
            separatorBuilder: (_, __) => const SizedBox(width: 12),
            itemBuilder: (ctx, i) => _ExamCard(exam: _mockExams[i]),
          ),
        ),
      ],
    );
  }

  // ── Hubs grid ──────────────────────────────────────────────────────────────

  Widget _buildHubsSection(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionHeader(title: 'Quick Access Hubs'),
        const SizedBox(height: 14),
        GridView.count(
          crossAxisCount: 2,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          childAspectRatio: 1.7,
          children: _mockHubs
              .map((hub) => _HubCard(hub: hub, onTap: () => context.go(hub.route)))
              .toList(),
        ),
      ],
    );
  }

  // ── AI assistant quick access ──────────────────────────────────────────────

  Widget _buildAiCard(BuildContext context) {
    return GestureDetector(
      onTap: () => context.go('/ai-assistant'),
      child: Stack(
        children: [
          // Left gradient border glow
          Positioned(
            left: 0,
            top: 0,
            bottom: 0,
            child: Container(
              width: 3,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(4),
                gradient: AppColors.gradientPrimary,
                boxShadow: [
                  BoxShadow(
                    color: AppColors.primary.withOpacity(0.6),
                    blurRadius: 12,
                    spreadRadius: 2,
                  ),
                ],
              ),
            ),
          ),

          // Glass card
          GlassCard(
            padding: const EdgeInsets.fromLTRB(22, 18, 18, 18),
            gradient: LinearGradient(
              begin: Alignment.centerLeft,
              end: Alignment.centerRight,
              colors: [
                AppColors.primary.withOpacity(0.14),
                AppColors.card.withOpacity(0.55),
              ],
            ),
            borderColor: AppColors.primary.withOpacity(0.3),
            child: Row(
              children: [
                // Animated AI icon
                Container(
                  width: 46,
                  height: 46,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(14),
                    gradient: AppColors.gradientPrimary,
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primary.withOpacity(0.5),
                        blurRadius: 12,
                        spreadRadius: 0,
                      ),
                    ],
                  ),
                  child: const Center(
                    child: Text(
                      '✨',
                      style: TextStyle(fontSize: 22),
                    ),
                  ),
                ),
                const SizedBox(width: 14),

                // Text column
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Ask AI Copilot',
                        style: AppTextStyles.titleLarge.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Get instant help, summaries & study plans',
                        style: AppTextStyles.caption.copyWith(
                          color: AppColors.textSecondary,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),

                // Send icon
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(10),
                    color: AppColors.primary.withOpacity(0.2),
                    border: Border.all(
                      color: AppColors.primary.withOpacity(0.4),
                      width: 1,
                    ),
                  ),
                  child: const Icon(
                    Icons.send_rounded,
                    color: AppColors.primary,
                    size: 18,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── Notification Bell ──────────────────────────────────────────────────────

class _NotificationBell extends StatelessWidget {
  const _NotificationBell({required this.count, required this.onTap});
  final int count;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(13),
              color: AppColors.surface.withOpacity(0.8),
              border: Border.all(color: AppColors.border, width: 1),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.2),
                  blurRadius: 8,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: const Icon(
              Icons.notifications_outlined,
              color: AppColors.textSecondary,
              size: 20,
            ),
          ),
          if (count > 0)
            Positioned(
              top: -4,
              right: -4,
              child: Container(
                width: 18,
                height: 18,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: AppColors.gradientPrimary,
                ),
                child: Center(
                  child: Text(
                    '$count',
                    style: GoogleFonts.outfit(
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

// ── Avatar Circle ──────────────────────────────────────────────────────────

class _AvatarCircle extends StatelessWidget {
  const _AvatarCircle({required this.initials, required this.onTap});
  final String initials;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 42,
        height: 42,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: AppColors.gradientPrimary,
          boxShadow: [
            BoxShadow(
              color: AppColors.primary.withOpacity(0.4),
              blurRadius: 12,
              spreadRadius: 0,
            ),
          ],
          border: Border.all(
            color: Colors.white.withOpacity(0.15),
            width: 1.5,
          ),
        ),
        child: Center(
          child: Text(
            initials,
            style: GoogleFonts.outfit(
              fontSize: 17,
              fontWeight: FontWeight.w800,
              color: Colors.white,
            ),
          ),
        ),
      ),
    );
  }
}

// ── Exam Card ──────────────────────────────────────────────────────────────

class _ExamCard extends StatelessWidget {
  const _ExamCard({required this.exam});
  final _Exam exam;

  String get _urgencyLabel {
    if (exam.daysLeft <= 3) return '🔴 Urgent';
    if (exam.daysLeft <= 7) return '🟡 Soon';
    return '🟢 Upcoming';
  }

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(20),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          width: 200,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                exam.color.withOpacity(0.2),
                AppColors.card.withOpacity(0.65),
              ],
            ),
            border: Border.all(
              color: exam.color.withOpacity(0.35),
              width: 1,
            ),
            boxShadow: [
              BoxShadow(
                color: exam.color.withOpacity(0.15),
                blurRadius: 16,
                spreadRadius: 0,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // Color band + urgency label
              Row(
                children: [
                  Container(
                    width: 4,
                    height: 38,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(4),
                      color: exam.color,
                      boxShadow: [
                        BoxShadow(
                          color: exam.color.withOpacity(0.5),
                          blurRadius: 8,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          exam.subject,
                          style: AppTextStyles.titleMedium.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.w700,
                            fontSize: 14,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          _urgencyLabel,
                          style: AppTextStyles.caption.copyWith(
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),

              // Days countdown
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${exam.daysLeft}',
                        style: AppTextStyles.headingMedium.copyWith(
                          color: exam.color,
                          fontWeight: FontWeight.w800,
                          fontSize: 28,
                          height: 1.0,
                        ),
                      ),
                      Text(
                        'days left',
                        style: AppTextStyles.caption.copyWith(
                          color: Colors.white38,
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: exam.color.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: exam.color.withOpacity(0.3),
                        width: 1,
                      ),
                    ),
                    child: Icon(
                      Icons.menu_book_rounded,
                      color: exam.color,
                      size: 18,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Hub Card ───────────────────────────────────────────────────────────────

class _HubCard extends StatefulWidget {
  const _HubCard({required this.hub, required this.onTap});
  final _Hub hub;
  final VoidCallback onTap;

  @override
  State<_HubCard> createState() => _HubCardState();
}

class _HubCardState extends State<_HubCard>
    with SingleTickerProviderStateMixin {
  late final AnimationController _pressCtrl;
  late final Animation<double> _scale;
  bool _pressed = false;

  @override
  void initState() {
    super.initState();
    _pressCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 120),
      reverseDuration: const Duration(milliseconds: 250),
    );
    _scale = Tween<double>(begin: 1.0, end: 0.94).animate(
      CurvedAnimation(parent: _pressCtrl, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _pressCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _scale,
      builder: (ctx, child) => Transform.scale(
        scale: _scale.value,
        child: child,
      ),
      child: GestureDetector(
        onTapDown: (_) {
          setState(() => _pressed = true);
          _pressCtrl.forward();
        },
        onTapUp: (_) {
          setState(() => _pressed = false);
          _pressCtrl.reverse();
          widget.onTap();
        },
        onTapCancel: () {
          setState(() => _pressed = false);
          _pressCtrl.reverse();
        },
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                widget.hub.color.withOpacity(0.18),
                AppColors.card.withOpacity(_pressed ? 0.7 : 0.5),
              ],
            ),
            border: Border.all(
              color: widget.hub.color.withOpacity(_pressed ? 0.55 : 0.28),
              width: 1,
            ),
            boxShadow: _pressed
                ? [
                    BoxShadow(
                      color: widget.hub.color.withOpacity(0.35),
                      blurRadius: 20,
                      spreadRadius: 0,
                    ),
                  ]
                : [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.22),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
          ),
          child: Row(
            children: [
              // Emoji icon in colored box
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  color: widget.hub.color.withOpacity(0.18),
                  border: Border.all(
                    color: widget.hub.color.withOpacity(0.3),
                    width: 1,
                  ),
                ),
                child: Center(
                  child: Text(
                    widget.hub.emoji,
                    style: const TextStyle(fontSize: 20),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  widget.hub.title,
                  style: AppTextStyles.titleMedium.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                    fontSize: 13,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              Icon(
                Icons.chevron_right_rounded,
                color: widget.hub.color.withOpacity(0.7),
                size: 18,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
