import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class SgpaCalculatorScreen extends StatefulWidget {
  const SgpaCalculatorScreen({super.key});

  @override
  State<SgpaCalculatorScreen> createState() => _SgpaCalculatorScreenState();
}

class _SgpaCalculatorScreenState extends State<SgpaCalculatorScreen>
    with SingleTickerProviderStateMixin {
  final List<_SubjectRow> _subjects = [
    _SubjectRow(name: 'Mathematics', credits: 4, grade: 'A'),
    _SubjectRow(name: 'Data Structures', credits: 4, grade: 'S'),
  ];

  bool _showGradeTable = false;
  late AnimationController _sgpaController;
  late Animation<double> _sgpaAnim;
  double _displayedSgpa = 0;

  final Map<String, double> _gradePoints = {
    'S': 10.0,
    'A': 9.0,
    'B': 8.0,
    'C': 7.0,
    'D': 6.0,
    'E': 5.0,
    'F': 0.0,
  };

  double get _sgpa {
    double totalGradePoints = 0;
    int totalCredits = 0;
    for (final s in _subjects) {
      if (s.credits > 0) {
        totalGradePoints += (_gradePoints[s.grade] ?? 0) * s.credits;
        totalCredits += s.credits;
      }
    }
    if (totalCredits == 0) return 0;
    return totalGradePoints / totalCredits;
  }

  @override
  void initState() {
    super.initState();
    _sgpaController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _sgpaAnim = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _sgpaController, curve: Curves.easeOutCubic),
    );
    _sgpaController.forward();
    _displayedSgpa = _sgpa;
  }

  @override
  void dispose() {
    _sgpaController.dispose();
    super.dispose();
  }

  void _addSubject() {
    setState(() {
      _subjects.add(_SubjectRow(
        name: 'Subject ${_subjects.length + 1}',
        credits: 3,
        grade: 'B',
      ));
    });
    _animateSgpa();
  }

  void _removeSubject(int index) {
    setState(() => _subjects.removeAt(index));
    _animateSgpa();
  }

  void _animateSgpa() {
    final target = _sgpa;
    _sgpaController.reset();
    final start = _displayedSgpa;
    _sgpaAnim = Tween<double>(begin: start, end: target).animate(
      CurvedAnimation(parent: _sgpaController, curve: Curves.easeOutCubic),
    );
    _displayedSgpa = target;
    _sgpaController.forward();
  }

  Color get _sgpaColor {
    final s = _sgpa;
    if (s >= 8.5) return const Color(0xFF00E676);
    if (s >= 7.0) return const Color(0xFFFFB300);
    if (s >= 5.0) return const Color(0xFFFF8A65);
    return const Color(0xFFFF5252);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0A0A0F),
      floatingActionButton: Container(
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFF6C63FF), Color(0xFFA855F7)],
          ),
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF6C63FF).withOpacity(0.4),
              blurRadius: 16,
            ),
          ],
        ),
        child: FloatingActionButton(
          onPressed: _addSubject,
          backgroundColor: Colors.transparent,
          elevation: 0,
          child: const Icon(Icons.add_rounded, color: Colors.white, size: 28),
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            _buildHeader(),
            _buildSgpaDisplay(),
            Expanded(
              child: SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                padding:
                    const EdgeInsets.fromLTRB(16, 8, 16, 100),
                child: Column(
                  children: [
                    ..._subjects.asMap().entries.map(
                          (e) => _buildSubjectRow(e.value, e.key),
                        ),
                    const SizedBox(height: 16),
                    _buildGradeTable(),
                    const SizedBox(height: 16),
                    _buildCGPAImpactButton(),
                  ],
                ),
              ),
            ),
          ],
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
            'SGPA Calculator',
            style: GoogleFonts.outfit(
              fontSize: 22,
              fontWeight: FontWeight.w700,
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSgpaDisplay() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(24),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 24),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  _sgpaColor.withOpacity(0.15),
                  const Color(0xFF1A1A2E),
                ],
              ),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: _sgpaColor.withOpacity(0.3)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Your SGPA',
                      style: GoogleFonts.outfit(
                          color: Colors.white60, fontSize: 14),
                    ),
                    const SizedBox(height: 4),
                    AnimatedBuilder(
                      animation: _sgpaAnim,
                      builder: (context, child) {
                        final val = _sgpaAnim.value is double
                            ? _sgpaAnim.value
                            : _sgpa;
                        return Text(
                          val.toStringAsFixed(2),
                          style: GoogleFonts.outfit(
                            fontSize: 48,
                            fontWeight: FontWeight.w800,
                            color: _sgpaColor,
                          ),
                        );
                      },
                    ),
                    Text(
                      _sgpa >= 8.5
                          ? '🌟 Outstanding'
                          : _sgpa >= 7.0
                              ? '👍 Good'
                              : _sgpa >= 5.0
                                  ? '📚 Average'
                                  : '💪 Keep Going',
                      style: GoogleFonts.outfit(
                        color: _sgpaColor,
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      '${_subjects.length}',
                      style: GoogleFonts.outfit(
                        fontSize: 32,
                        fontWeight: FontWeight.w700,
                        color: Colors.white70,
                      ),
                    ),
                    Text(
                      'Subjects',
                      style: GoogleFonts.outfit(
                          color: Colors.white38, fontSize: 12),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '${_subjects.fold(0, (s, e) => s + e.credits)}',
                      style: GoogleFonts.outfit(
                        fontSize: 32,
                        fontWeight: FontWeight.w700,
                        color: Colors.white70,
                      ),
                    ),
                    Text(
                      'Credits',
                      style: GoogleFonts.outfit(
                          color: Colors.white38, fontSize: 12),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSubjectRow(_SubjectRow subject, int index) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF12121A),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white10),
      ),
      child: Column(
        children: [
          // Subject name row
          Row(
            children: [
              Expanded(
                child: Container(
                  decoration: BoxDecoration(
                    color: const Color(0xFF1A1A2E),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: Colors.white10),
                  ),
                  child: TextField(
                    controller: TextEditingController(text: subject.name)
                      ..selection = TextSelection.fromPosition(
                        TextPosition(offset: subject.name.length),
                      ),
                    style: GoogleFonts.outfit(
                        color: Colors.white, fontSize: 13),
                    decoration: InputDecoration(
                      hintText: 'Subject name',
                      hintStyle:
                          GoogleFonts.outfit(color: Colors.white30, fontSize: 13),
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 10),
                    ),
                    onChanged: (val) {
                      _subjects[index] = _SubjectRow(
                        name: val,
                        credits: subject.credits,
                        grade: subject.grade,
                      );
                    },
                  ),
                ),
              ),
              const SizedBox(width: 8),
              GestureDetector(
                onTap: () => _removeSubject(index),
                child: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFF5252).withOpacity(0.15),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.delete_outline_rounded,
                      color: Color(0xFFFF5252), size: 18),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              // Credits
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Credits',
                        style: GoogleFonts.outfit(
                            color: Colors.white38, fontSize: 11)),
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1A1A2E),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: Colors.white10),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<int>(
                          value: subject.credits,
                          dropdownColor: const Color(0xFF1A1A2E),
                          style: GoogleFonts.outfit(
                              color: Colors.white, fontSize: 13),
                          isExpanded: true,
                          icon: const Icon(Icons.expand_more_rounded,
                              color: Colors.white54, size: 18),
                          items: List.generate(5, (i) => i + 1)
                              .map((c) => DropdownMenuItem(
                                  value: c, child: Text('$c')))
                              .toList(),
                          onChanged: (val) {
                            setState(() {
                              _subjects[index] = _SubjectRow(
                                name: subject.name,
                                credits: val!,
                                grade: subject.grade,
                              );
                            });
                            _animateSgpa();
                          },
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              // Grade
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Grade',
                        style: GoogleFonts.outfit(
                            color: Colors.white38, fontSize: 11)),
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1A1A2E),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: Colors.white10),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: subject.grade,
                          dropdownColor: const Color(0xFF1A1A2E),
                          style: GoogleFonts.outfit(
                              color: Colors.white, fontSize: 13),
                          isExpanded: true,
                          icon: const Icon(Icons.expand_more_rounded,
                              color: Colors.white54, size: 18),
                          items: _gradePoints.keys
                              .map((g) =>
                                  DropdownMenuItem(value: g, child: Text(g)))
                              .toList(),
                          onChanged: (val) {
                            setState(() {
                              _subjects[index] = _SubjectRow(
                                name: subject.name,
                                credits: subject.credits,
                                grade: val!,
                              );
                            });
                            _animateSgpa();
                          },
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              // Grade points display
              Column(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Text('GP',
                      style: GoogleFonts.outfit(
                          color: Colors.white38, fontSize: 11)),
                  const SizedBox(height: 4),
                  Container(
                    width: 54,
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    decoration: BoxDecoration(
                      color: const Color(0xFF4FC3F7).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                          color: const Color(0xFF4FC3F7).withOpacity(0.3)),
                    ),
                    child: Center(
                      child: Text(
                        '${_gradePoints[subject.grade]?.toStringAsFixed(0) ?? 0}',
                        style: GoogleFonts.outfit(
                          color: const Color(0xFF4FC3F7),
                          fontWeight: FontWeight.w700,
                          fontSize: 14,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildGradeTable() {
    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 8, sigmaY: 8),
        child: Container(
          decoration: BoxDecoration(
            color: const Color(0xFF1A1A2E),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.white10),
          ),
          child: Column(
            children: [
              GestureDetector(
                onTap: () =>
                    setState(() => _showGradeTable = !_showGradeTable),
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Row(
                    children: [
                      const Icon(Icons.table_chart_rounded,
                          color: Color(0xFF4FC3F7), size: 18),
                      const SizedBox(width: 10),
                      Text(
                        'Grade Point Reference',
                        style: GoogleFonts.outfit(
                          color: Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const Spacer(),
                      AnimatedRotation(
                        turns: _showGradeTable ? 0.5 : 0,
                        duration: const Duration(milliseconds: 300),
                        child: const Icon(Icons.expand_more_rounded,
                            color: Colors.white54),
                      ),
                    ],
                  ),
                ),
              ),
              AnimatedSize(
                duration: const Duration(milliseconds: 300),
                curve: Curves.easeInOut,
                child: _showGradeTable
                    ? Column(
                        children: [
                          const Divider(color: Colors.white10, height: 1),
                          Padding(
                            padding: const EdgeInsets.all(14),
                            child: Table(
                              columnWidths: const {
                                0: FlexColumnWidth(1),
                                1: FlexColumnWidth(2),
                                2: FlexColumnWidth(2),
                              },
                              children: [
                                TableRow(
                                  decoration: const BoxDecoration(
                                      border: Border(
                                          bottom: BorderSide(
                                              color: Colors.white10))),
                                  children: ['Grade', 'Points', 'Range']
                                      .map((h) => Padding(
                                            padding: const EdgeInsets.only(
                                                bottom: 8),
                                            child: Text(h,
                                                style: GoogleFonts.outfit(
                                                    color: Colors.white54,
                                                    fontSize: 11,
                                                    fontWeight:
                                                        FontWeight.w700)),
                                          ))
                                      .toList(),
                                ),
                                ..._gradePoints.entries.map((e) => TableRow(
                                      children: [
                                        Padding(
                                          padding:
                                              const EdgeInsets.symmetric(
                                                  vertical: 6),
                                          child: Text(e.key,
                                              style: GoogleFonts.outfit(
                                                  color: Colors.white,
                                                  fontWeight:
                                                      FontWeight.w700,
                                                  fontSize: 13)),
                                        ),
                                        Padding(
                                          padding:
                                              const EdgeInsets.symmetric(
                                                  vertical: 6),
                                          child: Text(
                                              '${e.value.toStringAsFixed(1)}',
                                              style: GoogleFonts.outfit(
                                                  color:
                                                      const Color(0xFF4FC3F7),
                                                  fontSize: 13)),
                                        ),
                                        Padding(
                                          padding:
                                              const EdgeInsets.symmetric(
                                                  vertical: 6),
                                          child: Text(
                                            e.key == 'S'
                                                ? '90–100'
                                                : e.key == 'A'
                                                    ? '80–89'
                                                    : e.key == 'B'
                                                        ? '70–79'
                                                        : e.key == 'C'
                                                            ? '60–69'
                                                            : e.key == 'D'
                                                                ? '50–59'
                                                                : e.key == 'E'
                                                                    ? '40–49'
                                                                    : '< 40',
                                            style: GoogleFonts.outfit(
                                                color: Colors.white54,
                                                fontSize: 12),
                                          ),
                                        ),
                                      ],
                                    )),
                              ],
                            ),
                          ),
                        ],
                      )
                    : const SizedBox.shrink(),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCGPAImpactButton() {
    return GestureDetector(
      onTap: () => _showCGPAImpact(),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFF4FC3F7), Color(0xFF0288D1)],
          ),
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF4FC3F7).withOpacity(0.35),
              blurRadius: 16,
              spreadRadius: 2,
            ),
          ],
        ),
        child: Center(
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.trending_up_rounded,
                  color: Colors.white, size: 22),
              const SizedBox(width: 10),
              Text(
                'Calculate CGPA Impact',
                style: GoogleFonts.outfit(
                  color: Colors.white,
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showCGPAImpact() {
    final currentSgpa = _sgpa;
    final previousCgpa = 8.4;
    final semestersCompleted = 4;
    final newCgpa = ((previousCgpa * semestersCompleted) + currentSgpa) /
        (semestersCompleted + 1);

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        margin: const EdgeInsets.all(16),
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: const Color(0xFF12121A),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(
              color: const Color(0xFF4FC3F7).withOpacity(0.3)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'CGPA Impact Preview',
              style: GoogleFonts.outfit(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 16),
            _buildImpactRow(
                'Current SGPA', currentSgpa.toStringAsFixed(2), _sgpaColor),
            _buildImpactRow('Previous CGPA',
                previousCgpa.toStringAsFixed(2), Colors.white70),
            _buildImpactRow('Projected CGPA', newCgpa.toStringAsFixed(2),
                const Color(0xFF4FC3F7)),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFF4FC3F7).withOpacity(0.08),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                    color: const Color(0xFF4FC3F7).withOpacity(0.25)),
              ),
              child: Text(
                newCgpa > previousCgpa
                    ? '🎉 Great! This semester will boost your CGPA by ${(newCgpa - previousCgpa).toStringAsFixed(2)} points!'
                    : '📉 Your CGPA will decrease by ${(previousCgpa - newCgpa).toStringAsFixed(2)} points. Consider improving your grades.',
                style: GoogleFonts.outfit(
                    color: Colors.white70, fontSize: 13, height: 1.5),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildImpactRow(String label, String value, Color color) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label,
              style: GoogleFonts.outfit(color: Colors.white60, fontSize: 14)),
          Text(value,
              style: GoogleFonts.outfit(
                  color: color,
                  fontSize: 16,
                  fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }
}

class _SubjectRow {
  final String name;
  final int credits;
  final String grade;

  const _SubjectRow({
    required this.name,
    required this.credits,
    required this.grade,
  });
}
