import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'dart:ui';
import 'dart:math';

// ─── State ────────────────────────────────────────────────────────────────────

class MoodEntry {
  final DateTime date;
  final int moodIndex; // 0=Great,1=Good,2=Okay,3=Sad,4=Angry
  final String? note;
  const MoodEntry({required this.date, required this.moodIndex, this.note});
}

class MoodState {
  final int? selectedMood;
  final String note;
  final List<MoodEntry> entries;
  const MoodState({this.selectedMood, this.note = '', required this.entries});
  MoodState copyWith({int? selectedMood, String? note, List<MoodEntry>? entries, bool clearMood = false}) {
    return MoodState(
      selectedMood: clearMood ? null : (selectedMood ?? this.selectedMood),
      note: note ?? this.note,
      entries: entries ?? this.entries,
    );
  }
}

class MoodNotifier extends StateNotifier<MoodState> {
  MoodNotifier() : super(MoodState(entries: _generateMockEntries()));

  static List<MoodEntry> _generateMockEntries() {
    final rand = Random(42);
    final now = DateTime.now();
    return List.generate(30, (i) {
      final day = now.subtract(Duration(days: 29 - i));
      return MoodEntry(date: day, moodIndex: rand.nextInt(5));
    });
  }

  void selectMood(int index) => state = state.copyWith(selectedMood: index);
  void updateNote(String note) => state = state.copyWith(note: note);
  void logMood() {
    if (state.selectedMood == null) return;
    final entry = MoodEntry(
      date: DateTime.now(),
      moodIndex: state.selectedMood!,
      note: state.note.isEmpty ? null : state.note,
    );
    state = state.copyWith(entries: [...state.entries, entry], note: '', clearMood: true);
  }
}

final moodProvider = StateNotifierProvider<MoodNotifier, MoodState>((ref) => MoodNotifier());

// ─── Screen ───────────────────────────────────────────────────────────────────

class MoodTrackerScreen extends ConsumerStatefulWidget {
  const MoodTrackerScreen({super.key});
  @override
  ConsumerState<MoodTrackerScreen> createState() => _MoodTrackerScreenState();
}

class _MoodTrackerScreenState extends ConsumerState<MoodTrackerScreen>
    with TickerProviderStateMixin {
  late AnimationController _pulseCtrl;
  late Animation<double> _pulseAnim;
  final _noteCtrl = TextEditingController();

  static const List<Map<String, dynamic>> _moods = [
    {'emoji': '😄', 'label': 'Great', 'color': Color(0xFF00E676)},
    {'emoji': '😊', 'label': 'Good', 'color': Color(0xFF69F0AE)},
    {'emoji': '😐', 'label': 'Okay', 'color': Color(0xFFFFEB3B)},
    {'emoji': '😔', 'label': 'Sad', 'color': Color(0xFFFF9800)},
    {'emoji': '😡', 'label': 'Angry', 'color': Color(0xFFFF5252)},
  ];

  @override
  void initState() {
    super.initState();
    _pulseCtrl = AnimationController(vsync: this, duration: const Duration(seconds: 2))
      ..repeat(reverse: true);
    _pulseAnim = Tween(begin: 0.95, end: 1.05).animate(
      CurvedAnimation(parent: _pulseCtrl, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _pulseCtrl.dispose();
    _noteCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(moodProvider);
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
            colors: [Color(0xFFEF9A9A), Color(0xFFA855F7)],
          ).createShader(b),
          child: Text('Mood Tracker',
              style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.w700, color: Colors.white)),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.info_outline, color: Colors.white54),
            onPressed: () {},
          ),
        ],
      ),
      body: CustomScrollView(
        physics: const BouncingScrollPhysics(),
        slivers: [
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                _buildMoodSelector(state),
                const SizedBox(height: 20),
                _buildSelectedMoodDisplay(state),
                const SizedBox(height: 20),
                _buildNoteField(),
                const SizedBox(height: 16),
                _buildLogButton(state),
                const SizedBox(height: 24),
                _buildMonthlyCalendar(state),
                const SizedBox(height: 20),
                _buildTrendsChart(state),
                const SizedBox(height: 20),
                _buildAIInsight(),
              ]),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMoodSelector(MoodState state) {
    return _GlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('How do you feel?',
              style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.white)),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: List.generate(_moods.length, (i) {
              final isSelected = state.selectedMood == i;
              final color = _moods[i]['color'] as Color;
              return GestureDetector(
                onTap: () => ref.read(moodProvider.notifier).selectMood(i),
                child: TweenAnimationBuilder<double>(
                  tween: Tween(begin: 1.0, end: isSelected ? 1.3 : 1.0),
                  duration: const Duration(milliseconds: 350),
                  curve: Curves.elasticOut,
                  builder: (_, scale, child) => Transform.scale(scale: scale, child: child),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 250),
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: isSelected ? color.withOpacity(0.18) : Colors.white.withOpacity(0.05),
                      border: Border.all(
                        color: isSelected ? color : Colors.transparent,
                        width: 2,
                      ),
                      boxShadow: isSelected
                          ? [BoxShadow(color: color.withOpacity(0.4), blurRadius: 12, spreadRadius: 2)]
                          : [],
                    ),
                    child: Column(
                      children: [
                        Text(_moods[i]['emoji'], style: const TextStyle(fontSize: 28)),
                        const SizedBox(height: 4),
                        Text(_moods[i]['label'],
                            style: GoogleFonts.outfit(
                              fontSize: 10,
                              color: isSelected ? color : Colors.white38,
                              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w400,
                            )),
                      ],
                    ),
                  ),
                ),
              );
            }),
          ),
        ],
      ),
    );
  }

  Widget _buildSelectedMoodDisplay(MoodState state) {
    if (state.selectedMood == null) {
      return const SizedBox.shrink();
    }
    final mood = _moods[state.selectedMood!];
    final color = mood['color'] as Color;
    return Center(
      child: ScaleTransition(
        scale: _pulseAnim,
        child: Container(
          width: 130,
          height: 130,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: RadialGradient(
              colors: [color.withOpacity(0.35), color.withOpacity(0.05)],
            ),
            border: Border.all(color: color.withOpacity(0.6), width: 3),
            boxShadow: [BoxShadow(color: color.withOpacity(0.4), blurRadius: 30, spreadRadius: 5)],
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(mood['emoji'], style: const TextStyle(fontSize: 48)),
              const SizedBox(height: 4),
              Text(mood['label'],
                  style: GoogleFonts.outfit(fontSize: 14, color: color, fontWeight: FontWeight.w700)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNoteField() {
    return _GlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Add a note (optional)',
              style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.white70)),
          const SizedBox(height: 12),
          TextField(
            controller: _noteCtrl,
            onChanged: (v) => ref.read(moodProvider.notifier).updateNote(v),
            style: GoogleFonts.outfit(color: Colors.white, fontSize: 14),
            maxLines: 3,
            decoration: InputDecoration(
              hintText: 'What\'s on your mind?',
              hintStyle: GoogleFonts.outfit(color: Colors.white38, fontSize: 14),
              filled: true,
              fillColor: Colors.white.withOpacity(0.05),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: Colors.white.withOpacity(0.1)),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: Colors.white.withOpacity(0.1)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFFEF9A9A), width: 1.5),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLogButton(MoodState state) {
    return GestureDetector(
      onTap: state.selectedMood != null
          ? () {
              ref.read(moodProvider.notifier).logMood();
              _noteCtrl.clear();
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Mood logged! 🎉', style: GoogleFonts.outfit()),
                  backgroundColor: const Color(0xFF00E676).withOpacity(0.8),
                  behavior: SnackBarBehavior.floating,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              );
            }
          : null,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        height: 56,
        decoration: BoxDecoration(
          gradient: state.selectedMood != null
              ? const LinearGradient(colors: [Color(0xFFEF9A9A), Color(0xFFA855F7)])
              : LinearGradient(colors: [Colors.white12, Colors.white.withOpacity(0.05)]),
          borderRadius: BorderRadius.circular(16),
          boxShadow: state.selectedMood != null
              ? [const BoxShadow(color: Color(0x55EF9A9A), blurRadius: 20, offset: Offset(0, 8))]
              : [],
        ),
        alignment: Alignment.center,
        child: Text(
          'Log Mood',
          style: GoogleFonts.outfit(
            fontSize: 16,
            fontWeight: FontWeight.w700,
            color: state.selectedMood != null ? Colors.white : Colors.white38,
          ),
        ),
      ),
    );
  }

  Widget _buildMonthlyCalendar(MoodState state) {
    final now = DateTime.now();
    final daysInMonth = DateTime(now.year, now.month + 1, 0).day;
    final firstWeekday = DateTime(now.year, now.month, 1).weekday % 7;

    final moodMap = <int, int>{};
    for (final e in state.entries) {
      if (e.date.year == now.year && e.date.month == now.month) {
        moodMap[e.date.day] = e.moodIndex;
      }
    }

    return _GlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Monthly Mood Calendar',
              style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.white)),
          const SizedBox(height: 4),
          Text('${_monthName(now.month)} ${now.year}',
              style: GoogleFonts.outfit(fontSize: 13, color: Colors.white54)),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: ['S', 'M', 'T', 'W', 'T', 'F', 'S']
                .map((d) => Text(d,
                    style: GoogleFonts.outfit(fontSize: 11, color: Colors.white38, fontWeight: FontWeight.w600)))
                .toList(),
          ),
          const SizedBox(height: 8),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 7,
              crossAxisSpacing: 4,
              mainAxisSpacing: 4,
              childAspectRatio: 1,
            ),
            itemCount: firstWeekday + daysInMonth,
            itemBuilder: (_, idx) {
              if (idx < firstWeekday) return const SizedBox.shrink();
              final day = idx - firstWeekday + 1;
              final moodIdx = moodMap[day];
              final color = moodIdx != null ? (_moods[moodIdx]['color'] as Color) : Colors.white12;
              return Container(
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: moodIdx != null ? color.withOpacity(0.6) : Colors.white.withOpacity(0.06),
                  border: day == now.day
                      ? Border.all(color: const Color(0xFFEF9A9A), width: 1.5)
                      : null,
                ),
                child: Center(
                  child: Text('$day',
                      style: GoogleFonts.outfit(
                        fontSize: 10,
                        color: moodIdx != null ? Colors.white : Colors.white38,
                        fontWeight: day == now.day ? FontWeight.w700 : FontWeight.w400,
                      )),
                ),
              );
            },
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 12,
            runSpacing: 6,
            children: _moods
                .map((m) => Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 10, height: 10,
                          decoration: BoxDecoration(shape: BoxShape.circle, color: m['color'] as Color),
                        ),
                        const SizedBox(width: 4),
                        Text(m['label'],
                            style: GoogleFonts.outfit(fontSize: 11, color: Colors.white54)),
                      ],
                    ))
                .toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildTrendsChart(MoodState state) {
    final now = DateTime.now();
    final last7 = List.generate(7, (i) {
      final day = now.subtract(Duration(days: 6 - i));
      final entry = state.entries.lastWhere(
        (e) => e.date.year == day.year && e.date.month == day.month && e.date.day == day.day,
        orElse: () => MoodEntry(date: day, moodIndex: -1),
      );
      return entry.moodIndex;
    });

    return _GlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('7-Day Mood Trends',
              style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.white)),
          const SizedBox(height: 16),
          SizedBox(
            height: 100,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: List.generate(7, (i) {
                final moodIdx = last7[i];
                final height = moodIdx < 0 ? 8.0 : ((4 - moodIdx) / 4) * 80 + 10;
                final color = moodIdx < 0
                    ? Colors.white12
                    : (_moods[moodIdx]['color'] as Color);
                final day = now.subtract(Duration(days: 6 - i));
                return Column(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    AnimatedContainer(
                      duration: Duration(milliseconds: 400 + i * 80),
                      curve: Curves.easeOut,
                      width: 28,
                      height: height,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: moodIdx < 0
                              ? [Colors.white12, Colors.white.withOpacity(0.03)]
                              : [color, color.withOpacity(0.4)],
                        ),
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      _dayAbbr(day.weekday),
                      style: GoogleFonts.outfit(fontSize: 10, color: Colors.white38),
                    ),
                  ],
                );
              }),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAIInsight() {
    return _GlassCard(
      gradient: LinearGradient(
        colors: [const Color(0xFFEF9A9A).withOpacity(0.08), const Color(0xFF6C63FF).withOpacity(0.05)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: const Color(0xFF6C63FF).withOpacity(0.15),
            ),
            child: const Text('🤖', style: TextStyle(fontSize: 22)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('AI Mood Insight',
                    style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.w700, color: const Color(0xFF6C63FF))),
                const SizedBox(height: 6),
                Text(
                  'You feel sad more on Mondays. Try planning something fun for Monday evenings to boost your mood!',
                  style: GoogleFonts.outfit(fontSize: 13, color: Colors.white70, height: 1.5),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _monthName(int m) {
    const names = ['', 'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    return names[m];
  }

  String _dayAbbr(int weekday) {
    const days = ['', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
    return days[weekday];
  }
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
