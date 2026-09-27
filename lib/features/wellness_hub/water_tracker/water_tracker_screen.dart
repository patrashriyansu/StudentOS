import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'dart:ui';
import 'dart:math' as math;

// ─── State ────────────────────────────────────────────────────────────────────

class WaterLog {
  final String time;
  final int glasses;
  const WaterLog({required this.time, required this.glasses});
}

class WaterState {
  final int currentGlasses;
  final int goalGlasses;
  final bool reminderEnabled;
  final List<WaterLog> todayLogs;
  const WaterState({
    this.currentGlasses = 5,
    this.goalGlasses = 8,
    this.reminderEnabled = true,
    required this.todayLogs,
  });
  WaterState copyWith({int? currentGlasses, int? goalGlasses, bool? reminderEnabled, List<WaterLog>? todayLogs}) {
    return WaterState(
      currentGlasses: currentGlasses ?? this.currentGlasses,
      goalGlasses: goalGlasses ?? this.goalGlasses,
      reminderEnabled: reminderEnabled ?? this.reminderEnabled,
      todayLogs: todayLogs ?? this.todayLogs,
    );
  }
}

class WaterNotifier extends StateNotifier<WaterState> {
  WaterNotifier()
      : super(WaterState(todayLogs: const [
          WaterLog(time: '8:00 AM', glasses: 1),
          WaterLog(time: '9:30 AM', glasses: 1),
          WaterLog(time: '11:00 AM', glasses: 1),
          WaterLog(time: '1:00 PM', glasses: 1),
          WaterLog(time: '3:30 PM', glasses: 1),
        ]));

  void addGlass() {
    if (state.currentGlasses >= state.goalGlasses) return;
    final now = TimeOfDay.now();
    final hour = now.hourOfPeriod == 0 ? 12 : now.hourOfPeriod;
    final period = now.period == DayPeriod.am ? 'AM' : 'PM';
    final timeStr = '$hour:${now.minute.toString().padLeft(2, '0')} $period';
    state = state.copyWith(
      currentGlasses: state.currentGlasses + 1,
      todayLogs: [...state.todayLogs, WaterLog(time: timeStr, glasses: 1)],
    );
  }

  void toggleReminder() => state = state.copyWith(reminderEnabled: !state.reminderEnabled);
}

final waterProvider = StateNotifierProvider<WaterNotifier, WaterState>((ref) => WaterNotifier());

// ─── Screen ───────────────────────────────────────────────────────────────────

class WaterTrackerScreen extends ConsumerStatefulWidget {
  const WaterTrackerScreen({super.key});
  @override
  ConsumerState<WaterTrackerScreen> createState() => _WaterTrackerScreenState();
}

class _WaterTrackerScreenState extends ConsumerState<WaterTrackerScreen>
    with TickerProviderStateMixin {
  late AnimationController _waveCtrl;
  late Animation<double> _waveAnim;

  final List<int> _weeklyData = [4, 6, 8, 5, 7, 6, 5];

  @override
  void initState() {
    super.initState();
    _waveCtrl = AnimationController(vsync: this, duration: const Duration(seconds: 3))
      ..repeat();
    _waveAnim = Tween(begin: 0.0, end: 2 * math.pi).animate(_waveCtrl);
  }

  @override
  void dispose() {
    _waveCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(waterProvider);
    final progress = state.currentGlasses / state.goalGlasses;
    return Scaffold(
      backgroundColor: const Color(0xFF0A0A0F),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0A0A0F),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_rounded, color: Colors.white),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: ShaderMask(
          shaderCallback: (b) => const LinearGradient(
            colors: [Color(0xFF4FC3F7), Color(0xFF00D4FF)],
          ).createShader(b),
          child: Text('Water Tracker',
              style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.w700, color: Colors.white)),
        ),
      ),
      body: CustomScrollView(
        physics: const BouncingScrollPhysics(),
        slivers: [
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                _buildWaterVisual(state, progress),
                const SizedBox(height: 20),
                _buildGlassIcons(state),
                const SizedBox(height: 20),
                _buildAddGlassButton(state),
                const SizedBox(height: 20),
                _buildDailyLog(state),
                const SizedBox(height: 20),
                _buildWeeklyChart(),
                const SizedBox(height: 20),
                _buildReminderToggle(state),
              ]),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildWaterVisual(WaterState state, double progress) {
    return Center(
      child: Container(
        width: 200,
        height: 220,
        margin: const EdgeInsets.symmetric(vertical: 8),
        child: Stack(
          alignment: Alignment.center,
          children: [
            // outer ring
            Container(
              width: 200,
              height: 200,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: const Color(0xFF4FC3F7).withOpacity(0.3), width: 3),
              ),
            ),
            // animated water fill
            AnimatedBuilder(
              animation: _waveAnim,
              builder: (_, __) {
                return ClipOval(
                  child: SizedBox(
                    width: 194,
                    height: 194,
                    child: CustomPaint(
                      painter: _WavePainter(progress: progress, wavePhase: _waveAnim.value),
                    ),
                  ),
                );
              },
            ),
            // text overlay
            Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  '${state.currentGlasses}',
                  style: GoogleFonts.outfit(
                    fontSize: 52,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                  ),
                ),
                Text(
                  'of ${state.goalGlasses} glasses',
                  style: GoogleFonts.outfit(fontSize: 14, color: Colors.white70),
                ),
                const SizedBox(height: 4),
                Text(
                  '${(progress * 100).toInt()}% of daily goal',
                  style: GoogleFonts.outfit(fontSize: 12, color: const Color(0xFF4FC3F7)),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildGlassIcons(WaterState state) {
    return _GlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Daily Progress',
              style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.white)),
          const SizedBox(height: 14),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: List.generate(state.goalGlasses, (i) {
              final isFilled = i < state.currentGlasses;
              return TweenAnimationBuilder<double>(
                tween: Tween(begin: 0.8, end: isFilled ? 1.0 : 0.8),
                duration: Duration(milliseconds: 300 + i * 50),
                curve: Curves.elasticOut,
                builder: (_, scale, child) => Transform.scale(scale: scale, child: child),
                child: Container(
                  width: 32,
                  height: 42,
                  decoration: BoxDecoration(
                    color: isFilled
                        ? const Color(0xFF4FC3F7).withOpacity(0.15)
                        : Colors.white.withOpacity(0.05),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: isFilled ? const Color(0xFF4FC3F7) : Colors.white24,
                      width: 1.5,
                    ),
                  ),
                  child: Icon(
                    isFilled ? Icons.water_drop : Icons.water_drop_outlined,
                    color: isFilled ? const Color(0xFF4FC3F7) : Colors.white24,
                    size: 20,
                  ),
                ),
              );
            }),
          ),
        ],
      ),
    );
  }

  Widget _buildAddGlassButton(WaterState state) {
    final reached = state.currentGlasses >= state.goalGlasses;
    return GestureDetector(
      onTap: reached ? null : () => ref.read(waterProvider.notifier).addGlass(),
      child: Container(
        height: 60,
        decoration: BoxDecoration(
          gradient: reached
              ? LinearGradient(colors: [Colors.white12, Colors.white.withOpacity(0.05)])
              : const LinearGradient(colors: [Color(0xFF4FC3F7), Color(0xFF00D4FF)]),
          borderRadius: BorderRadius.circular(18),
          boxShadow: reached ? [] : [const BoxShadow(color: Color(0x554FC3F7), blurRadius: 20, offset: Offset(0, 8))],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.add_circle_outline, color: Colors.white, size: 24),
            const SizedBox(width: 10),
            Text(
              reached ? '🎉 Daily Goal Reached!' : '+1 Glass',
              style: GoogleFonts.outfit(
                fontSize: 17,
                fontWeight: FontWeight.w700,
                color: Colors.white,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDailyLog(WaterState state) {
    return _GlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Today\'s Log',
              style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.white)),
          const SizedBox(height: 12),
          ...state.todayLogs.reversed.map((log) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: const Color(0xFF4FC3F7).withOpacity(0.12),
                      ),
                      child: const Icon(Icons.water_drop, color: Color(0xFF4FC3F7), size: 16),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      '${log.glasses} glass',
                      style: GoogleFonts.outfit(fontSize: 14, color: Colors.white, fontWeight: FontWeight.w500),
                    ),
                    const Spacer(),
                    Text(
                      log.time,
                      style: GoogleFonts.outfit(fontSize: 13, color: Colors.white54),
                    ),
                  ],
                ),
              )),
        ],
      ),
    );
  }

  Widget _buildWeeklyChart() {
    final days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return _GlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Weekly Progress',
              style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.white)),
          const SizedBox(height: 16),
          SizedBox(
            height: 100,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: List.generate(7, (i) {
                final val = _weeklyData[i];
                final heightFrac = val / 8.0;
                final color = val >= 8 ? const Color(0xFF00E676) : const Color(0xFF4FC3F7);
                return Column(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    Text('$val', style: GoogleFonts.outfit(fontSize: 10, color: Colors.white54)),
                    const SizedBox(height: 4),
                    AnimatedContainer(
                      duration: Duration(milliseconds: 400 + i * 70),
                      curve: Curves.easeOut,
                      width: 28,
                      height: heightFrac * 72,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [color, color.withOpacity(0.4)],
                        ),
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(days[i], style: GoogleFonts.outfit(fontSize: 10, color: Colors.white38)),
                  ],
                );
              }),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildReminderToggle(WaterState state) {
    return _GlassCard(
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: const Color(0xFF4FC3F7).withOpacity(0.12),
            ),
            child: const Icon(Icons.notifications_rounded, color: Color(0xFF4FC3F7), size: 22),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Hydration Reminders',
                    style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.w600, color: Colors.white)),
                Text('Remind me every 2 hours',
                    style: GoogleFonts.outfit(fontSize: 12, color: Colors.white54)),
              ],
            ),
          ),
          Switch(
            value: state.reminderEnabled,
            onChanged: (_) => ref.read(waterProvider.notifier).toggleReminder(),
            activeColor: const Color(0xFF4FC3F7),
            activeTrackColor: const Color(0xFF4FC3F7).withOpacity(0.3),
            inactiveThumbColor: Colors.white38,
            inactiveTrackColor: Colors.white12,
          ),
        ],
      ),
    );
  }
}

// ─── Wave Painter ─────────────────────────────────────────────────────────────

class _WavePainter extends CustomPainter {
  final double progress;
  final double wavePhase;
  _WavePainter({required this.progress, required this.wavePhase});

  @override
  void paint(Canvas canvas, Size size) {
    final waterHeight = size.height * (1 - progress);
    final paint = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [
          const Color(0xFF4FC3F7).withOpacity(0.8),
          const Color(0xFF00D4FF).withOpacity(0.6),
        ],
      ).createShader(Rect.fromLTWH(0, 0, size.width, size.height));

    final path = Path();
    path.moveTo(0, waterHeight);
    for (double x = 0; x <= size.width; x++) {
      final y = waterHeight +
          math.sin((x / size.width * 2 * math.pi) + wavePhase) * 8 +
          math.sin((x / size.width * 3 * math.pi) + wavePhase * 1.3) * 4;
      path.lineTo(x, y);
    }
    path.lineTo(size.width, size.height);
    path.lineTo(0, size.height);
    path.close();
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(_WavePainter old) => true;
}

// ─── Shared Glass Card ────────────────────────────────────────────────────────

class _GlassCard extends StatelessWidget {
  final Widget child;
  final Gradient? gradient;
  const _GlassCard({required this.child, this.gradient});

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(20),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: gradient,
            color: gradient == null ? Colors.white.withOpacity(0.06) : null,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Colors.white.withOpacity(0.1)),
          ),
          child: child,
        ),
      ),
    );
  }
}
