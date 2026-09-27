import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AttendanceScreen extends StatefulWidget {
  const AttendanceScreen({super.key});

  @override
  State<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends State<AttendanceScreen>
    with TickerProviderStateMixin {
  late AnimationController _circleController;
  late Animation<double> _circleAnim;

  List<_SubjectAttendance> _subjects = [
    _SubjectAttendance(name: 'DSA', attended: 85, total: 100),
    _SubjectAttendance(name: 'DBMS', attended: 72, total: 90),
    _SubjectAttendance(name: 'OS', attended: 60, total: 80),
    _SubjectAttendance(name: 'CN', attended: 45, total: 70),
  ];

  String? _todaySubject = 'DSA';

  @override
  void initState() {
    super.initState();
    _circleController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    );
    _circleAnim = CurvedAnimation(
      parent: _circleController,
      curve: Curves.easeOutCubic,
    );
    _circleController.forward();
  }

  @override
  void dispose() {
    _circleController.dispose();
    super.dispose();
  }

  double get _overallAttendance {
    int totalAttended = _subjects.fold(0, (s, e) => s + e.attended);
    int totalClasses = _subjects.fold(0, (s, e) => s + e.total);
    return totalClasses == 0 ? 0 : (totalAttended / totalClasses * 100);
  }

  Color get _overallColor {
    final pct = _overallAttendance;
    if (pct >= 75) return const Color(0xFF00E676);
    if (pct >= 65) return const Color(0xFFFFB300);
    return const Color(0xFFFF5252);
  }

  void _markAttendance(bool attended) {
    setState(() {
      final idx = _subjects.indexWhere((s) => s.name == _todaySubject);
      if (idx != -1) {
        final s = _subjects[idx];
        _subjects[idx] = _SubjectAttendance(
          name: s.name,
          attended: attended ? s.attended + 1 : s.attended,
          total: s.total + 1,
        );
      }
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          attended
              ? '✅ Marked as Attended for $_todaySubject'
              : '❌ Marked as Missed for $_todaySubject',
          style: GoogleFonts.outfit(color: Colors.white),
        ),
        backgroundColor:
            attended ? const Color(0xFF00E676) : const Color(0xFFFF5252),
        duration: const Duration(seconds: 2),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0A0A0F),
      body: SafeArea(
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildHeader(),
              _buildCircularProgress(),
              _buildSubjectList(),
              _buildAIPredictionCard(),
              _buildTodayActions(),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
      child: Row(
        children: [
          GestureDetector(
            onTap: () => Navigator.pop(context),
            child: Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFF1A1A2E),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white12),
              ),
              child: const Icon(Icons.arrow_back_ios_new_rounded,
                  color: Colors.white70, size: 18),
            ),
          ),
          const SizedBox(width: 14),
          Text(
            'Attendance',
            style: GoogleFonts.outfit(
              fontSize: 22,
              fontWeight: FontWeight.w700,
              color: Colors.white,
            ),
          ),
          const Spacer(),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: _overallColor.withOpacity(0.15),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: _overallColor.withOpacity(0.4)),
            ),
            child: Text(
              '${_overallAttendance.toStringAsFixed(1)}% Overall',
              style: GoogleFonts.outfit(
                color: _overallColor,
                fontSize: 12,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCircularProgress() {
    final overall = _overallAttendance;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(24),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
          child: Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: const Color(0xFF1A1A2E),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: _overallColor.withOpacity(0.25)),
            ),
            child: Row(
              children: [
                // Circular indicator
                AnimatedBuilder(
                  animation: _circleAnim,
                  builder: (context, child) {
                    return SizedBox(
                      width: 110,
                      height: 110,
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          SizedBox(
                            width: 110,
                            height: 110,
                            child: CircularProgressIndicator(
                              value: _circleAnim.value * (overall / 100),
                              strokeWidth: 10,
                              backgroundColor: Colors.white10,
                              valueColor: AlwaysStoppedAnimation<Color>(
                                  _overallColor),
                              strokeCap: StrokeCap.round,
                            ),
                          ),
                          Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                '${(overall * _circleAnim.value).toStringAsFixed(0)}%',
                                style: GoogleFonts.outfit(
                                  fontSize: 24,
                                  fontWeight: FontWeight.w800,
                                  color: _overallColor,
                                ),
                              ),
                              Text(
                                'Overall',
                                style: GoogleFonts.outfit(
                                    color: Colors.white38, fontSize: 10),
                              ),
                            ],
                          ),
                        ],
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
                        overall >= 75
                            ? '🟢 Great Standing'
                            : overall >= 65
                                ? '🟡 Borderline'
                                : '🔴 Critical',
                        style: GoogleFonts.outfit(
                          color: _overallColor,
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Total Classes: ${_subjects.fold(0, (s, e) => s + e.total)}',
                        style: GoogleFonts.outfit(
                            color: Colors.white60, fontSize: 13),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Attended: ${_subjects.fold(0, (s, e) => s + e.attended)}',
                        style: GoogleFonts.outfit(
                            color: Colors.white60, fontSize: 13),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Required: 75% minimum',
                        style: GoogleFonts.outfit(
                            color: Colors.white38, fontSize: 12),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSubjectList() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Subject-wise Attendance',
            style: GoogleFonts.outfit(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 12),
          ..._subjects.asMap().entries.map((entry) =>
              _buildSubjectRow(entry.value, entry.key)),
        ],
      ),
    );
  }

  Widget _buildSubjectRow(_SubjectAttendance subject, int index) {
    final percentage = subject.attended / subject.total * 100;
    final Color color = percentage >= 75
        ? const Color(0xFF00E676)
        : percentage >= 65
            ? const Color(0xFFFFB300)
            : const Color(0xFFFF5252);
    final String status = percentage >= 75
        ? 'Safe'
        : percentage >= 65
            ? 'Warning'
            : 'Critical';

    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: Duration(milliseconds: 500 + index * 100),
      curve: Curves.easeOutCubic,
      builder: (context, value, child) => Transform.translate(
        offset: Offset(20 * (1 - value), 0),
        child: Opacity(opacity: value, child: child),
      ),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFF12121A),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withOpacity(0.2)),
        ),
        child: Column(
          children: [
            Row(
              children: [
                Text(
                  subject.name,
                  style: GoogleFonts.outfit(
                    color: Colors.white,
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const Spacer(),
                Text(
                  '${subject.attended}/${subject.total}',
                  style: GoogleFonts.outfit(
                      color: Colors.white54, fontSize: 12),
                ),
                const SizedBox(width: 10),
                Text(
                  '${percentage.toStringAsFixed(0)}%',
                  style: GoogleFonts.outfit(
                    color: color,
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(width: 10),
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: color.withOpacity(0.35)),
                  ),
                  child: Text(
                    status,
                    style: GoogleFonts.outfit(
                      color: color,
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: TweenAnimationBuilder<double>(
                tween: Tween(begin: 0, end: percentage / 100),
                duration: const Duration(milliseconds: 1000),
                curve: Curves.easeOutCubic,
                builder: (context, value, child) => LinearProgressIndicator(
                  value: value,
                  minHeight: 6,
                  backgroundColor: Colors.white10,
                  valueColor: AlwaysStoppedAnimation<Color>(color),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAIPredictionCard() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 12),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
          child: Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: const Color(0xFF6C63FF).withOpacity(0.1),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                  color: const Color(0xFF6C63FF).withOpacity(0.3)),
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
                          colors: [Color(0xFF6C63FF), Color(0xFFA855F7)],
                        ),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.auto_awesome_rounded,
                          color: Colors.white, size: 16),
                    ),
                    const SizedBox(width: 10),
                    Text(
                      'AI Attendance Prediction',
                      style: GoogleFonts.outfit(
                        color: Colors.white,
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                _buildPredictionItem(
                    '⚠️', 'CN', 'Critical! Attend next 5 classes to reach 75%',
                    const Color(0xFFFF5252)),
                const SizedBox(height: 8),
                _buildPredictionItem(
                    '✅', 'OS', 'You can miss 2 more classes and stay at 75%',
                    const Color(0xFF00E676)),
                const SizedBox(height: 8),
                _buildPredictionItem(
                    '💡', 'DBMS', 'Attend next 3 classes to reach 80% — great goal!',
                    const Color(0xFF00D4FF)),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildPredictionItem(
      String emoji, String subject, String message, Color color) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(emoji, style: const TextStyle(fontSize: 14)),
        const SizedBox(width: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
          decoration: BoxDecoration(
            color: color.withOpacity(0.15),
            borderRadius: BorderRadius.circular(6),
          ),
          child: Text(
            subject,
            style: GoogleFonts.outfit(
                color: color, fontSize: 11, fontWeight: FontWeight.w700),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            message,
            style: GoogleFonts.outfit(
                color: Colors.white70, fontSize: 12, height: 1.4),
          ),
        ),
      ],
    );
  }

  Widget _buildTodayActions() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            "Today's Class",
            style: GoogleFonts.outfit(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 12),
          // Subject selector
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
            decoration: BoxDecoration(
              color: const Color(0xFF1A1A2E),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.white12),
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                value: _todaySubject,
                dropdownColor: const Color(0xFF1A1A2E),
                style: GoogleFonts.outfit(color: Colors.white, fontSize: 14),
                isExpanded: true,
                icon: const Icon(Icons.expand_more_rounded,
                    color: Colors.white54),
                items: _subjects
                    .map((s) =>
                        DropdownMenuItem(value: s.name, child: Text(s.name)))
                    .toList(),
                onChanged: (val) => setState(() => _todaySubject = val),
              ),
            ),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: GestureDetector(
                  onTap: () => _markAttendance(true),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    decoration: BoxDecoration(
                      color: const Color(0xFF00E676).withOpacity(0.15),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                          color: const Color(0xFF00E676).withOpacity(0.4)),
                    ),
                    child: Center(
                      child: Text(
                        '✅ Attended',
                        style: GoogleFonts.outfit(
                          color: const Color(0xFF00E676),
                          fontWeight: FontWeight.w700,
                          fontSize: 15,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: GestureDetector(
                  onTap: () => _markAttendance(false),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFF5252).withOpacity(0.15),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                          color: const Color(0xFFFF5252).withOpacity(0.4)),
                    ),
                    child: Center(
                      child: Text(
                        '❌ Missed',
                        style: GoogleFonts.outfit(
                          color: const Color(0xFFFF5252),
                          fontWeight: FontWeight.w700,
                          fontSize: 15,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _SubjectAttendance {
  final String name;
  final int attended;
  final int total;

  const _SubjectAttendance({
    required this.name,
    required this.attended,
    required this.total,
  });
}
