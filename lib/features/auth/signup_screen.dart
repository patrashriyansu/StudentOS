import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/widgets/gradient_button.dart';

class SignupScreen extends StatefulWidget {
  const SignupScreen({super.key});

  @override
  State<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends State<SignupScreen>
    with TickerProviderStateMixin {
  final _pageController = PageController();
  int _currentStep = 0;
  bool _isLoading = false;

  // Step 1 controllers
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;

  // Step 2 controllers
  final _collegeController = TextEditingController();
  final _branchController = TextEditingController();
  int _selectedSemester = 1;

  // Step 3
  final List<String> _allInterests = [
    '📚 Study',
    '💻 Coding',
    '🏢 Placement',
    '🧘 Wellness',
    '🎯 CGPA',
    '🔬 Research',
    '🎨 Design',
    '📊 Data Science',
  ];
  final Set<String> _selectedInterests = {};

  final _step1Key = GlobalKey<FormState>();
  final _step2Key = GlobalKey<FormState>();

  late AnimationController _progressController;
  late Animation<double> _progressAnim;

  @override
  void initState() {
    super.initState();
    _progressController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    );
    _progressAnim =
        Tween<double>(begin: 0.0, end: 1 / 3).animate(
      CurvedAnimation(parent: _progressController, curve: Curves.easeOutCubic),
    );
    _progressController.forward();
  }

  @override
  void dispose() {
    _pageController.dispose();
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _collegeController.dispose();
    _branchController.dispose();
    _progressController.dispose();
    super.dispose();
  }

  void _animateProgress(int step) {
    _progressAnim = Tween<double>(
      begin: _progressAnim.value,
      end: (step + 1) / 3,
    ).animate(
      CurvedAnimation(parent: _progressController, curve: Curves.easeOutCubic),
    );
    _progressController
      ..reset()
      ..forward();
  }

  void _nextStep() {
    if (_currentStep == 0) {
      if (!(_step1Key.currentState?.validate() ?? false)) return;
    } else if (_currentStep == 1) {
      if (!(_step2Key.currentState?.validate() ?? false)) return;
    } else {
      _handleCreateAccount();
      return;
    }
    final next = _currentStep + 1;
    setState(() => _currentStep = next);
    _animateProgress(next);
    _pageController.animateToPage(
      next,
      duration: const Duration(milliseconds: 400),
      curve: Curves.easeInOutCubic,
    );
  }

  void _prevStep() {
    if (_currentStep == 0) {
      context.go('/login');
      return;
    }
    final prev = _currentStep - 1;
    setState(() => _currentStep = prev);
    _animateProgress(prev);
    _pageController.animateToPage(
      prev,
      duration: const Duration(milliseconds: 400),
      curve: Curves.easeInOutCubic,
    );
  }

  Future<void> _handleCreateAccount() async {
    setState(() => _isLoading = true);
    await Future.delayed(const Duration(milliseconds: 1400));
    if (mounted) {
      setState(() => _isLoading = false);
      context.go('/onboarding');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Stack(
        children: [
          // Background gradient
          Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Color(0xFF1A1A2E), Color(0xFF0A0A0F)],
              ),
            ),
          ),
          // Top violet glow
          Positioned(
            top: -60,
            right: -40,
            child: Container(
              width: 220,
              height: 220,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    AppColors.secondary.withOpacity(0.18),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),
          SafeArea(
            child: Column(
              children: [
                // Top bar
                Padding(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                  child: Row(
                    children: [
                      _BackButton(onTap: _prevStep),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _stepTitle(_currentStep),
                              style: AppTextStyles.headingMedium.copyWith(
                                fontSize: 20,
                                fontWeight: FontWeight.w700,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'Step ${_currentStep + 1} of 3',
                              style: AppTextStyles.bodySmall.copyWith(
                                color: AppColors.textSecondary,
                                fontSize: 13,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

                // Progress bar
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: AnimatedBuilder(
                    animation: _progressAnim,
                    builder: (context, child) {
                      return Container(
                        height: 6,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(8),
                          color: AppColors.surface,
                        ),
                        child: FractionallySizedBox(
                          widthFactor: _progressAnim.value,
                          alignment: Alignment.centerLeft,
                          child: Container(
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(8),
                              gradient: const LinearGradient(
                                colors: [
                                  AppColors.primary,
                                  AppColors.secondary
                                ],
                              ),
                              boxShadow: [
                                BoxShadow(
                                  color: AppColors.primary.withOpacity(0.5),
                                  blurRadius: 8,
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 8),

                // Step dots
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(3, (i) {
                    final isActive = i == _currentStep;
                    final isDone = i < _currentStep;
                    return AnimatedContainer(
                      duration: const Duration(milliseconds: 300),
                      margin: const EdgeInsets.symmetric(horizontal: 4),
                      width: isActive ? 24 : 8,
                      height: 8,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(8),
                        gradient: (isActive || isDone)
                            ? const LinearGradient(
                                colors: [
                                  AppColors.primary,
                                  AppColors.secondary
                                ],
                              )
                            : null,
                        color: (isActive || isDone)
                            ? null
                            : AppColors.textSecondary.withOpacity(0.25),
                      ),
                    );
                  }),
                ),
                const SizedBox(height: 24),

                // Pages
                Expanded(
                  child: PageView(
                    controller: _pageController,
                    physics: const NeverScrollableScrollPhysics(),
                    children: [
                      _Step1(
                        formKey: _step1Key,
                        nameController: _nameController,
                        emailController: _emailController,
                        passwordController: _passwordController,
                        obscurePassword: _obscurePassword,
                        onTogglePassword: () =>
                            setState(() => _obscurePassword = !_obscurePassword),
                      ),
                      _Step2(
                        formKey: _step2Key,
                        collegeController: _collegeController,
                        branchController: _branchController,
                        selectedSemester: _selectedSemester,
                        onSemesterChanged: (v) =>
                            setState(() => _selectedSemester = v ?? 1),
                      ),
                      _Step3(
                        allInterests: _allInterests,
                        selectedInterests: _selectedInterests,
                        onToggle: (interest) {
                          setState(() {
                            if (_selectedInterests.contains(interest)) {
                              _selectedInterests.remove(interest);
                            } else {
                              _selectedInterests.add(interest);
                            }
                          });
                        },
                      ),
                    ],
                  ),
                ),

                // Bottom button
                Padding(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
                  child: GradientButton(
                    text: _currentStep == 2 ? 'Create Account 🚀' : 'Next →',
                    isLoading: _isLoading,
                    onTap: _nextStep,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _stepTitle(int step) {
    switch (step) {
      case 0:
        return 'Create Account';
      case 1:
        return 'Your College';
      case 2:
        return 'Your Interests';
      default:
        return '';
    }
  }
}

// ─────────────────────────────────────────
// Step 1: Name, Email, Password
// ─────────────────────────────────────────
class _Step1 extends StatelessWidget {
  final GlobalKey<FormState> formKey;
  final TextEditingController nameController;
  final TextEditingController emailController;
  final TextEditingController passwordController;
  final bool obscurePassword;
  final VoidCallback onTogglePassword;

  const _Step1({
    required this.formKey,
    required this.nameController,
    required this.emailController,
    required this.passwordController,
    required this.obscurePassword,
    required this.onTogglePassword,
  });

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Form(
        key: formKey,
        child: Column(
          children: [
            _SignupField(
              controller: nameController,
              label: 'Full Name',
              hint: 'John Doe',
              icon: Icons.person_outline_rounded,
              validator: (v) =>
                  (v == null || v.trim().isEmpty) ? 'Name is required' : null,
            ),
            const SizedBox(height: 16),
            _SignupField(
              controller: emailController,
              label: 'Email Address',
              hint: 'you@college.edu',
              icon: Icons.email_outlined,
              keyboardType: TextInputType.emailAddress,
              validator: (v) {
                if (v == null || v.trim().isEmpty) return 'Email is required';
                if (!RegExp(r'^[^@]+@[^@]+\.[^@]+').hasMatch(v.trim())) {
                  return 'Enter a valid email';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),
            _SignupField(
              controller: passwordController,
              label: 'Password',
              hint: 'Min. 6 characters',
              icon: Icons.lock_outline_rounded,
              obscureText: obscurePassword,
              suffixIcon: IconButton(
                icon: Icon(
                  obscurePassword
                      ? Icons.visibility_off_outlined
                      : Icons.visibility_outlined,
                  color: AppColors.textSecondary,
                  size: 20,
                ),
                onPressed: onTogglePassword,
              ),
              validator: (v) {
                if (v == null || v.isEmpty) return 'Password is required';
                if (v.length < 6) return 'At least 6 characters required';
                return null;
              },
            ),
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(14),
                color: AppColors.primary.withOpacity(0.08),
                border: Border.all(
                  color: AppColors.primary.withOpacity(0.2),
                ),
              ),
              child: Row(
                children: [
                  const Icon(Icons.shield_outlined,
                      color: AppColors.accent, size: 20),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Your data is encrypted and secure. We never share your info.',
                      style: AppTextStyles.bodySmall.copyWith(
                        color: AppColors.textSecondary,
                        fontSize: 12,
                      ),
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

// ─────────────────────────────────────────
// Step 2: College, Branch, Semester
// ─────────────────────────────────────────
class _Step2 extends StatelessWidget {
  final GlobalKey<FormState> formKey;
  final TextEditingController collegeController;
  final TextEditingController branchController;
  final int selectedSemester;
  final ValueChanged<int?> onSemesterChanged;

  const _Step2({
    required this.formKey,
    required this.collegeController,
    required this.branchController,
    required this.selectedSemester,
    required this.onSemesterChanged,
  });

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Form(
        key: formKey,
        child: Column(
          children: [
            _SignupField(
              controller: collegeController,
              label: 'College Name',
              hint: 'e.g. IIT Bombay',
              icon: Icons.school_outlined,
              validator: (v) => (v == null || v.trim().isEmpty)
                  ? 'College name is required'
                  : null,
            ),
            const SizedBox(height: 16),
            _SignupField(
              controller: branchController,
              label: 'Branch / Major',
              hint: 'e.g. Computer Science',
              icon: Icons.developer_board_outlined,
              validator: (v) =>
                  (v == null || v.trim().isEmpty) ? 'Branch is required' : null,
            ),
            const SizedBox(height: 16),

            // Semester Dropdown
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Current Semester',
                  style: AppTextStyles.bodySmall.copyWith(
                    color: AppColors.textSecondary,
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(16),
                    color: AppColors.surface.withOpacity(0.7),
                    border: Border.all(
                      color: AppColors.primary.withOpacity(0.18),
                      width: 1.2,
                    ),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<int>(
                      value: selectedSemester,
                      isExpanded: true,
                      dropdownColor: AppColors.card,
                      icon: const Icon(Icons.keyboard_arrow_down_rounded,
                          color: AppColors.textSecondary),
                      style: AppTextStyles.bodyMedium.copyWith(
                        color: AppColors.textPrimary,
                        fontSize: 15,
                      ),
                      onChanged: onSemesterChanged,
                      items: List.generate(8, (i) {
                        final sem = i + 1;
                        return DropdownMenuItem(
                          value: sem,
                          child: Text('Semester $sem'),
                        );
                      }),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            _InfoCard(
              icon: Icons.auto_graph_rounded,
              text:
                  'We\'ll personalize your dashboard based on your academic profile.',
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────
// Step 3: Interests
// ─────────────────────────────────────────
class _Step3 extends StatelessWidget {
  final List<String> allInterests;
  final Set<String> selectedInterests;
  final ValueChanged<String> onToggle;

  const _Step3({
    required this.allInterests,
    required this.selectedInterests,
    required this.onToggle,
  });

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'What are you interested in?',
            style: AppTextStyles.headingMedium.copyWith(
              color: AppColors.textPrimary,
              fontSize: 18,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Select all that apply — we\'ll customize your experience.',
            style: AppTextStyles.bodySmall.copyWith(
              color: AppColors.textSecondary,
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 24),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: allInterests.map((interest) {
              final isSelected = selectedInterests.contains(interest);
              return GestureDetector(
                onTap: () => onToggle(interest),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 250),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 18,
                    vertical: 12,
                  ),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(50),
                    gradient: isSelected
                        ? const LinearGradient(
                            colors: [AppColors.primary, AppColors.secondary],
                          )
                        : null,
                    color: isSelected ? null : AppColors.surface,
                    border: Border.all(
                      color: isSelected
                          ? Colors.transparent
                          : AppColors.textSecondary.withOpacity(0.22),
                      width: 1.2,
                    ),
                    boxShadow: isSelected
                        ? [
                            BoxShadow(
                              color: AppColors.primary.withOpacity(0.35),
                              blurRadius: 12,
                              offset: const Offset(0, 4),
                            ),
                          ]
                        : null,
                  ),
                  child: Text(
                    interest,
                    style: AppTextStyles.bodyMedium.copyWith(
                      color: isSelected
                          ? Colors.white
                          : AppColors.textSecondary,
                      fontWeight: isSelected
                          ? FontWeight.w600
                          : FontWeight.w400,
                      fontSize: 14,
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 28),
          if (selectedInterests.isEmpty)
            _InfoCard(
              icon: Icons.touch_app_outlined,
              text: 'Select at least one interest to personalize your feed.',
            ),
          if (selectedInterests.isNotEmpty)
            _InfoCard(
              icon: Icons.check_circle_outline_rounded,
              text:
                  '${selectedInterests.length} interest${selectedInterests.length > 1 ? "s" : ""} selected. You\'re all set!',
              isSuccess: true,
            ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────
// Shared Widgets
// ─────────────────────────────────────────
class _SignupField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final String hint;
  final IconData icon;
  final bool obscureText;
  final Widget? suffixIcon;
  final TextInputType? keyboardType;
  final String? Function(String?)? validator;

  const _SignupField({
    required this.controller,
    required this.label,
    required this.hint,
    required this.icon,
    this.obscureText = false,
    this.suffixIcon,
    this.keyboardType,
    this.validator,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: AppTextStyles.bodySmall.copyWith(
            color: AppColors.textSecondary,
            fontSize: 13,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            color: AppColors.surface.withOpacity(0.7),
            border: Border.all(
              color: AppColors.primary.withOpacity(0.18),
              width: 1.2,
            ),
          ),
          child: TextFormField(
            controller: controller,
            obscureText: obscureText,
            keyboardType: keyboardType,
            validator: validator,
            style: AppTextStyles.bodyMedium.copyWith(
              color: AppColors.textPrimary,
              fontSize: 15,
            ),
            decoration: InputDecoration(
              hintText: hint,
              hintStyle: AppTextStyles.bodyMedium.copyWith(
                color: AppColors.textSecondary.withOpacity(0.5),
                fontSize: 15,
              ),
              prefixIcon: Icon(icon,
                  color: AppColors.textSecondary.withOpacity(0.7), size: 20),
              suffixIcon: suffixIcon,
              border: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(
                vertical: 16,
                horizontal: 4,
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _BackButton extends StatelessWidget {
  final VoidCallback onTap;
  const _BackButton({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 42,
        height: 42,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          color: AppColors.surface,
          border: Border.all(
            color: AppColors.textSecondary.withOpacity(0.2),
          ),
        ),
        child: const Icon(
          Icons.arrow_back_ios_new_rounded,
          size: 16,
          color: AppColors.textPrimary,
        ),
      ),
    );
  }
}

class _InfoCard extends StatelessWidget {
  final IconData icon;
  final String text;
  final bool isSuccess;

  const _InfoCard({
    required this.icon,
    required this.text,
    this.isSuccess = false,
  });

  @override
  Widget build(BuildContext context) {
    final color = isSuccess ? AppColors.accentGreen : AppColors.accent;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        color: color.withOpacity(0.08),
        border: Border.all(color: color.withOpacity(0.22)),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              text,
              style: AppTextStyles.bodySmall.copyWith(
                color: AppColors.textSecondary,
                fontSize: 12,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
