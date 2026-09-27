import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';

/// A single task row with an animated checkbox, strike-through text animation,
/// and a category chip tag.
///
/// When tapped, the checkbox fills with a gradient, a strike-through line
/// slides across the task text, and the row dims gently — all in ~300 ms.
class TaskItem extends StatefulWidget {
  const TaskItem({
    super.key,
    required this.title,
    required this.tag,
    required this.tagColor,
    this.initiallyDone = false,
    this.animationDelay = Duration.zero,
  });

  final String title;
  final String tag;
  final Color tagColor;
  final bool initiallyDone;

  /// Stagger delay so successive tasks slide in one by one.
  final Duration animationDelay;

  @override
  State<TaskItem> createState() => _TaskItemState();
}

class _TaskItemState extends State<TaskItem>
    with TickerProviderStateMixin {
  late bool _isDone;
  late final AnimationController _controller;
  late final Animation<double> _checkAnim;
  late final Animation<double> _strikeAnim;
  late final Animation<double> _dimAnim;

  // Entrance animation state
  late final AnimationController _entranceController;
  late final Animation<double> _entranceFade;
  late final Animation<Offset> _entranceSlide;

  @override
  void initState() {
    super.initState();
    _isDone = widget.initiallyDone;

    // Check/strikethrough animation
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 320),
    );
    _checkAnim = CurvedAnimation(parent: _controller, curve: Curves.easeOut);
    _strikeAnim = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.2, 1.0, curve: Curves.easeOut),
      ),
    );
    _dimAnim = Tween<double>(begin: 1.0, end: 0.5).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOut),
    );

    if (_isDone) _controller.value = 1.0;

    // Entrance stagger animation
    _entranceController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 450),
    );
    _entranceFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _entranceController, curve: Curves.easeOut),
    );
    _entranceSlide =
        Tween<Offset>(begin: const Offset(-0.08, 0), end: Offset.zero).animate(
      CurvedAnimation(
          parent: _entranceController, curve: Curves.easeOutCubic),
    );

    Future.delayed(widget.animationDelay, () {
      if (mounted) _entranceController.forward();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    _entranceController.dispose();
    super.dispose();
  }

  void _toggle() {
    setState(() => _isDone = !_isDone);
    if (_isDone) {
      _controller.forward();
    } else {
      _controller.reverse();
    }
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _entranceFade,
      child: SlideTransition(
        position: _entranceSlide,
        child: GestureDetector(
          onTap: _toggle,
          behavior: HitTestBehavior.opaque,
          child: AnimatedBuilder(
            animation: _controller,
            builder: (context, _) {
              return Opacity(
                opacity: _dimAnim.value,
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 6),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      // Animated checkbox
                      _AnimatedCheckbox(
                        isDone: _isDone,
                        progress: _checkAnim.value,
                      ),
                      const SizedBox(width: 12),

                      // Task text with strikethrough
                      Expanded(
                        child: Stack(
                          alignment: Alignment.centerLeft,
                          children: [
                            Text(
                              widget.title,
                              style: AppTextStyles.bodyMedium.copyWith(
                                color: Colors.white.withOpacity(0.9),
                                fontWeight: FontWeight.w500,
                                fontSize: 14,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            // Strike-through line
                            if (_strikeAnim.value > 0)
                              LayoutBuilder(
                                builder: (ctx, constraints) {
                                  return Container(
                                    width: constraints.maxWidth * _strikeAnim.value,
                                    height: 1.5,
                                    color: AppColors.primary.withOpacity(0.7),
                                  );
                                },
                              ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 10),

                      // Category tag chip
                      _TagChip(
                        label: widget.tag,
                        color: widget.tagColor,
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}

// ── Animated checkbox ───────────────────────────────────────────────────────

class _AnimatedCheckbox extends StatelessWidget {
  const _AnimatedCheckbox({
    required this.isDone,
    required this.progress,
  });

  final bool isDone;
  final double progress;

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      width: 24,
      height: 24,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(7),
        gradient: isDone
            ? AppColors.gradientPrimary
            : null,
        color: isDone ? null : Colors.transparent,
        border: Border.all(
          color: isDone
              ? Colors.transparent
              : AppColors.borderLight,
          width: 1.5,
        ),
        boxShadow: isDone
            ? [
                BoxShadow(
                  color: AppColors.primary.withOpacity(0.45),
                  blurRadius: 8,
                  spreadRadius: 0,
                )
              ]
            : null,
      ),
      child: isDone
          ? const Center(
              child: Icon(
                Icons.check_rounded,
                color: Colors.white,
                size: 14,
              ),
            )
          : null,
    );
  }
}

// ── Category tag chip ───────────────────────────────────────────────────────

class _TagChip extends StatelessWidget {
  const _TagChip({required this.label, required this.color});
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        color: color.withOpacity(0.12),
        border: Border.all(color: color.withOpacity(0.35), width: 1),
      ),
      child: Text(
        label,
        style: AppTextStyles.caption.copyWith(
          color: color,
          fontWeight: FontWeight.w600,
          fontSize: 10,
        ),
      ),
    );
  }
}
