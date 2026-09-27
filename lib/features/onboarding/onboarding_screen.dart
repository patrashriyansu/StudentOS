import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/widgets/gradient_button.dart';

class _OnboardingPage {
  final String emoji;
  final String title;
  final String subtitle;
  final List<Color> gradientColors;
  final List<_Feature> features;

  const _OnboardingPage({
    required this.emoji,
    required this.title,
    required this.subtitle,
    required this.gradientColors,
    required this.features,
  });
}

class _Feature {
  final IconData icon;
  final String label;
  const _Feature(this.icon, this.label);
}

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen>
    with TickerProviderStateMixin {
  final _pageController = PageController();
  int _currentPage = 0;

  late AnimationController _bgController;
  late AnimationController _contentController;
  late Animation<double> _contentFade;
  late Animation<Offset> _contentSlide;

  final List<_OnboardingPage> _pages = const [
    _OnboardingPage(
      emoji: '🎓',
      title: 'Master Your\nAcademics',
      subtitle:
          'Track attendance, CGPA, and exam schedules — all in one beautiful place.',
      gradientColors: [Color(0xFF6C63FF), Color(0xFF9B59B6)],
      features: [
        _Feature(Icons.bar_chart_rounded, 'CGPA Tracker'),
        _Feature(Icons.calendar_today_rounded, 'Exam Schedule'),
        _Feature(Icons.check_circle_outline, 'Attendance Log'),
      ],
    ),
    _OnboardingPage(
      emoji: '🤖',
      title: 'AI-Powered\nLearning',
      subtitle:
          'Summarize notes, generate quizzes, and get personalized study plans with AI.',
      gradientColors: [Color(0xFF00D4FF), Color(0xFF6C63FF)],
      features: [
        _Feature(Icons.auto_awesome_rounded, 'AI Summarizer'),
        _Feature(Icons.quiz_outlined, 'Smart Quizzes'),
        _Feature(Icons.psychology_outlined, 'Study Plans'),
      ],
    ),
    _OnboardingPage(
      emoji: '🚀',
      title: 'Ace Your\nPlacements',
      subtitle:
          'Crack interviews, track LeetCode progress, and find internships that match you.',
      gradientColors: [Color(0xFFA855F7), Color(0xFFEC4899)],
      features: [
        _Feature(Icons.code_rounded, 'LeetCode Tracker'),
        _Feature(Icons.business_center_outlined, 'Internship Finder'),
        _Feature(Icons.record_voice_over_outlined, 'Mock Interviews'),
      ],
    ),
  ];

  @override
  void initState() {
    super.initState();

    _bgController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );

    _contentController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    );

    _contentFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _contentController, curve: Curves.easeOut),
    );
    _contentSlide =
        Tween<Offset>(begin: const Offset(0, 0.1), end: Offset.zero).animate(
      CurvedAnimation(parent: _contentController, curve: Curves.easeOutCubic),
    );

    _contentController.forward();
  }

  @override
  void dispose() {
    _pageController.dispose();
    _bgController.dispose();
    _contentController.dispose();
    super.dispose();
  }

  void _goToPage(int page) {
    if (page < 0 || page >= _pages.length) return;
    _contentController.reverse().then((_) {
      setState(() => _currentPage = page);
      _pageController.animateToPage(
        page,
        duration: const Duration(milliseconds: 400),
        curve: Curves.easeInOutCubic,
      );
      _contentController.forward();
    });
  }

  void _next() {
    if (_currentPage < _pages.length - 1) {
      _goToPage(_currentPage + 1);
    } else {
      context.go('/dashboard');
    }
  }

  void _skip() => context.go('/dashboard');

  @override
  Widget build(BuildContext context) {
    final page = _pages[_currentPage];
    final size = MediaQuery.of(context).size;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: AnimatedContainer(
        duration: const Duration(milliseconds: 600),
        curve: Curves.easeInOutCubic,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              page.gradientColors[0].withOpacity(0.12),
              const Color(0xFF0A0A0F),
              page.gradientColors[1].withOpacity(0.08),
            ],
          ),
        ),
        child: Stack(
          children: [
            // Background decorative circles
            Positioned(
              top: -100,
              left: -60,
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 600),
                width: 300,
                height: 300,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      page.gradientColors[0].withOpacity(0.14),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
            ),
            Positioned(
              bottom: -80,
              right: -50,
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 600),
                width: 260,
                height: 260,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      page.gradientColors[1].withOpacity(0.14),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
            ),

            SafeArea(
              child: Column(
                children: [
                  // Skip button
                  Padding(
                    padding: const EdgeInsets.only(
                        top: 16, right: 24, left: 24),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        // Page counter badge
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(20),
                            color: AppColors.surface.withOpacity(0.6),
                            border: Border.all(
                              color: AppColors.textSecondary.withOpacity(0.2),
                            ),
                          ),
                          child: Text(
                            '${_currentPage + 1} / ${_pages.length}',
                            style: AppTextStyles.bodySmall.copyWith(
                              color: AppColors.textSecondary,
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        GestureDetector(
                          onTap: _skip,
                          child: Text(
                            'Skip',
                            style: AppTextStyles.bodyMedium.copyWith(
                              color: AppColors.textSecondary,
                              fontSize: 15,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 32),

                  // Page content via PageView (visual continuity)
                  Expanded(
                    child: PageView.builder(
                      controller: _pageController,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: _pages.length,
                      itemBuilder: (context, index) {
                        return _OnboardingPageWidget(
                          page: _pages[index],
                          contentFade: _contentFade,
                          contentSlide: _contentSlide,
                          size: size,
                        );
                      },
                    ),
                  ),

                  // Bottom section
                  Padding(
                    padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
                    child: Column(
                      children: [
                        // Dot indicators
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: List.generate(_pages.length, (i) {
                            final isActive = i == _currentPage;
                            return GestureDetector(
                              onTap: () => _goToPage(i),
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 350),
                                curve: Curves.easeOutCubic,
                                margin:
                                    const EdgeInsets.symmetric(horizontal: 4),
                                width: isActive ? 28 : 8,
                                height: 8,
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(8),
                                  gradient: isActive
                                      ? LinearGradient(
                                          colors: page.gradientColors,
                                        )
                                      : null,
                                  color: isActive
                                      ? null
                                      : AppColors.textSecondary.withOpacity(0.28),
                                  boxShadow: isActive
                                      ? [
                                          BoxShadow(
                                            color: page.gradientColors[0]
                                                .withOpacity(0.5),
                                            blurRadius: 8,
                                          ),
                                        ]
                                      : null,
                                ),
                              ),
                            );
                          }),
                        ),
                        const SizedBox(height: 28),

                        // Next / Get Started button
                        GradientButton(
                          text: _currentPage == _pages.length - 1
                              ? 'Get Started 🚀'
                              : 'Next →',
                          onTap: _next,
                        ),

                        const SizedBox(height: 16),

                        // Prev button (shown from page 2+)
                        if (_currentPage > 0)
                          GestureDetector(
                            onTap: () => _goToPage(_currentPage - 1),
                            child: Text(
                              '← Back',
                              style: AppTextStyles.bodySmall.copyWith(
                                color: AppColors.textSecondary,
                                fontSize: 14,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _OnboardingPageWidget extends StatelessWidget {
  final _OnboardingPage page;
  final Animation<double> contentFade;
  final Animation<Offset> contentSlide;
  final Size size;

  const _OnboardingPageWidget({
    required this.page,
    required this.contentFade,
    required this.contentSlide,
    required this.size,
  });

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: contentFade,
      child: SlideTransition(
        position: contentSlide,
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 28),
          child: Column(
            children: [
              // Emoji in gradient circle
              _EmojiCircle(
                emoji: page.emoji,
                gradientColors: page.gradientColors,
                size: size,
              ),
              const SizedBox(height: 36),

              // Title
              ShaderMask(
                shaderCallback: (bounds) => LinearGradient(
                  colors: page.gradientColors,
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ).createShader(bounds),
                child: Text(
                  page.title,
                  textAlign: TextAlign.center,
                  style: AppTextStyles.displayLarge.copyWith(
                    fontSize: 36,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                    height: 1.15,
                    letterSpacing: -0.5,
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Subtitle
              Text(
                page.subtitle,
                textAlign: TextAlign.center,
                style: AppTextStyles.bodyMedium.copyWith(
                  color: AppColors.textSecondary,
                  fontSize: 16,
                  height: 1.6,
                ),
              ),
              const SizedBox(height: 36),

              // Feature chips
              Wrap(
                spacing: 10,
                runSpacing: 10,
                alignment: WrapAlignment.center,
                children: page.features.map((f) {
                  return _FeatureChip(
                    icon: f.icon,
                    label: f.label,
                    gradientColors: page.gradientColors,
                  );
                }).toList(),
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}

class _EmojiCircle extends StatelessWidget {
  final String emoji;
  final List<Color> gradientColors;
  final Size size;

  const _EmojiCircle({
    required this.emoji,
    required this.gradientColors,
    required this.size,
  });

  @override
  Widget build(BuildContext context) {
    return Stack(
      alignment: Alignment.center,
      children: [
        // Outer glow ring
        Container(
          width: size.width * 0.55,
          height: size.width * 0.55,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: RadialGradient(
              colors: [
                gradientColors[0].withOpacity(0.15),
                Colors.transparent,
              ],
            ),
          ),
        ),
        // Inner gradient circle
        Container(
          width: size.width * 0.4,
          height: size.width * 0.4,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: gradientColors,
            ),
            boxShadow: [
              BoxShadow(
                color: gradientColors[0].withOpacity(0.45),
                blurRadius: 40,
                spreadRadius: 5,
              ),
            ],
          ),
          child: Center(
            child: Text(
              emoji,
              style: TextStyle(
                fontSize: size.width * 0.16,
                height: 1.0,
              ),
            ),
          ),
        ),
        // Decorative ring
        Container(
          width: size.width * 0.47,
          height: size.width * 0.47,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(
              color: gradientColors[0].withOpacity(0.25),
              width: 1.5,
            ),
          ),
        ),
      ],
    );
  }
}

class _FeatureChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final List<Color> gradientColors;

  const _FeatureChip({
    required this.icon,
    required this.label,
    required this.gradientColors,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(50),
        color: AppColors.surface.withOpacity(0.8),
        border: Border.all(
          color: gradientColors[0].withOpacity(0.25),
          width: 1.2,
        ),
        boxShadow: [
          BoxShadow(
            color: gradientColors[0].withOpacity(0.08),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          ShaderMask(
            shaderCallback: (bounds) => LinearGradient(
              colors: gradientColors,
            ).createShader(bounds),
            child: Icon(icon, size: 16, color: Colors.white),
          ),
          const SizedBox(width: 8),
          Text(
            label,
            style: AppTextStyles.bodySmall.copyWith(
              color: AppColors.textPrimary,
              fontSize: 13,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
