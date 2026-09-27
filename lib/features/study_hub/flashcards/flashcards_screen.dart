import 'dart:math';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class FlashcardsScreen extends StatefulWidget {
  const FlashcardsScreen({super.key});

  @override
  State<FlashcardsScreen> createState() => _FlashcardsScreenState();
}

class _FlashcardsScreenState extends State<FlashcardsScreen>
    with TickerProviderStateMixin {
  String _selectedDeck = 'DSA';
  int _currentIndex = 0;
  bool _isFlipped = false;
  int _mastered = 0;
  int _needReview = 0;

  late AnimationController _flipController;
  late AnimationController _swipeController;
  late Animation<double> _flipAnim;

  final Map<String, List<_FlashCard>> _decks = {
    'DSA': [
      _FlashCard(
        question: 'What is the time complexity of Merge Sort?',
        answer:
            'O(n log n) in all cases — best, average, and worst. It uses divide and conquer strategy, splitting the array and merging sorted halves.',
      ),
      _FlashCard(
        question: 'Define a Stack data structure.',
        answer:
            'A Stack is a LIFO (Last In First Out) linear data structure. Operations: push (insert), pop (remove), peek (top element). Applications: undo, browser history, function calls.',
      ),
      _FlashCard(
        question: 'What is Dynamic Programming?',
        answer:
            'A technique to solve problems by breaking them into overlapping subproblems and storing results (memoization/tabulation). Examples: Fibonacci, Knapsack, LCS.',
      ),
      _FlashCard(
        question: "What is Dijkstra's Algorithm used for?",
        answer:
            'Finding the shortest path from a source node to all other nodes in a weighted graph with non-negative edge weights. Time: O((V+E) log V) with a min-heap.',
      ),
      _FlashCard(
        question: 'What is the difference between BFS and DFS?',
        answer:
            'BFS uses a Queue, explores level by level, finds shortest path in unweighted graph. DFS uses a Stack (or recursion), explores depth-first, used in topological sort.',
      ),
    ],
    'DBMS': [
      _FlashCard(
        question: 'What is ACID in DBMS?',
        answer:
            'ACID stands for Atomicity (all or nothing), Consistency (valid state to valid state), Isolation (concurrent transactions independent), Durability (committed data persists).',
      ),
      _FlashCard(
        question: 'Explain 3NF (Third Normal Form).',
        answer:
            '3NF requires: table is in 2NF, and no non-prime attribute is transitively dependent on the primary key. Every non-key attribute must depend only on the primary key.',
      ),
      _FlashCard(
        question: 'What is a JOIN in SQL?',
        answer:
            'JOIN combines rows from 2+ tables based on a related column. Types: INNER JOIN (matching rows), LEFT JOIN (all left + matching right), RIGHT JOIN, FULL OUTER JOIN.',
      ),
    ],
    'OS': [
      _FlashCard(
        question: 'What is a Deadlock?',
        answer:
            'Deadlock is a state where a set of processes are blocked, each waiting for a resource held by another in the set. Conditions: Mutual Exclusion, Hold & Wait, No Preemption, Circular Wait.',
      ),
      _FlashCard(
        question: 'Explain Virtual Memory.',
        answer:
            'Virtual memory allows a process to use more memory than physically available by using disk space as an extension. Pages are swapped in/out using page replacement algorithms (LRU, FIFO).',
      ),
      _FlashCard(
        question: 'What is a Semaphore?',
        answer:
            'A semaphore is an integer variable used for process synchronization. Binary semaphore (0 or 1) acts as a mutex. Counting semaphore allows multiple access. Operations: wait (P) and signal (V).',
      ),
    ],
  };

  List<_FlashCard> get _currentDeck => _decks[_selectedDeck]!;

  @override
  void initState() {
    super.initState();
    _flipController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    );
    _swipeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
    _flipAnim = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _flipController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _flipController.dispose();
    _swipeController.dispose();
    super.dispose();
  }

  void _flipCard() {
    if (_isFlipped) {
      _flipController.reverse();
    } else {
      _flipController.forward();
    }
    setState(() => _isFlipped = !_isFlipped);
  }

  void _nextCard() {
    if (_currentIndex < _currentDeck.length - 1) {
      setState(() {
        _currentIndex++;
        _isFlipped = false;
      });
      _flipController.value = 0;
    }
  }

  void _prevCard() {
    if (_currentIndex > 0) {
      setState(() {
        _currentIndex--;
        _isFlipped = false;
      });
      _flipController.value = 0;
    }
  }

  void _markKnow() {
    setState(() => _mastered++);
    _nextCard();
  }

  void _markReview() {
    setState(() => _needReview++);
    _nextCard();
  }

  void _changeDeck(String deck) {
    setState(() {
      _selectedDeck = deck;
      _currentIndex = 0;
      _isFlipped = false;
      _mastered = 0;
      _needReview = 0;
    });
    _flipController.value = 0;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0A0A0F),
      body: SafeArea(
        child: Column(
          children: [
            _buildHeader(),
            _buildDeckSelector(),
            _buildProgressStats(),
            Expanded(
              child: GestureDetector(
                onHorizontalDragEnd: (details) {
                  if (details.primaryVelocity! < -300) _nextCard();
                  if (details.primaryVelocity! > 300) _prevCard();
                },
                child: _buildFlipCard(),
              ),
            ),
            _buildProgressDots(),
            _buildActionButtons(),
            const SizedBox(height: 20),
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
            'Flashcards',
            style: GoogleFonts.outfit(
              fontSize: 22,
              fontWeight: FontWeight.w700,
              color: Colors.white,
            ),
          ),
          const Spacer(),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: const Color(0xFFFFB300).withOpacity(0.15),
              borderRadius: BorderRadius.circular(10),
              border:
                  Border.all(color: const Color(0xFFFFB300).withOpacity(0.35)),
            ),
            child: Text(
              'Mastered: $_mastered/${_currentDeck.length}',
              style: GoogleFonts.outfit(
                color: const Color(0xFFFFB300),
                fontSize: 12,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDeckSelector() {
    return SizedBox(
      height: 44,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        children: _decks.keys.map((deck) {
          final selected = _selectedDeck == deck;
          return GestureDetector(
            onTap: () => _changeDeck(deck),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 250),
              margin: const EdgeInsets.only(right: 8),
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
              decoration: BoxDecoration(
                gradient: selected
                    ? const LinearGradient(
                        colors: [Color(0xFFFFB300), Color(0xFFF57C00)])
                    : null,
                color: selected ? null : const Color(0xFF1A1A2E),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                    color: selected
                        ? Colors.transparent
                        : Colors.white12),
                boxShadow: selected
                    ? [
                        BoxShadow(
                          color: const Color(0xFFFFB300).withOpacity(0.35),
                          blurRadius: 12,
                        )
                      ]
                    : [],
              ),
              child: Text(
                deck,
                style: GoogleFonts.outfit(
                  color: selected ? Colors.white : Colors.white54,
                  fontWeight:
                      selected ? FontWeight.w700 : FontWeight.w400,
                  fontSize: 13,
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildProgressStats() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      child: Row(
        children: [
          _buildStatChip('✅ Know', _mastered, const Color(0xFF00E676)),
          const SizedBox(width: 10),
          _buildStatChip('🔄 Review', _needReview, const Color(0xFFFF5252)),
          const Spacer(),
          Text(
            '${_currentIndex + 1} / ${_currentDeck.length}',
            style: GoogleFonts.outfit(color: Colors.white38, fontSize: 13),
          ),
        ],
      ),
    );
  }

  Widget _buildStatChip(String label, int count, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Text(
        '$label: $count',
        style: GoogleFonts.outfit(
            color: color, fontSize: 12, fontWeight: FontWeight.w600),
      ),
    );
  }

  Widget _buildFlipCard() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20),
        child: GestureDetector(
          onTap: _flipCard,
          child: AnimatedBuilder(
            animation: _flipAnim,
            builder: (context, child) {
              final angle = _flipAnim.value * pi;
              final isFrontVisible = angle < pi / 2;

              return Transform(
                transform: Matrix4.identity()
                  ..setEntry(3, 2, 0.001)
                  ..rotateY(angle),
                alignment: Alignment.center,
                child: isFrontVisible
                    ? _buildCardFace(isFront: true)
                    : Transform(
                        transform: Matrix4.identity()..rotateY(pi),
                        alignment: Alignment.center,
                        child: _buildCardFace(isFront: false),
                      ),
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _buildCardFace({required bool isFront}) {
    final card = _currentDeck[_currentIndex];
    return Container(
      width: double.infinity,
      height: 260,
      decoration: BoxDecoration(
        gradient: isFront
            ? const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Color(0xFF1A1A2E), Color(0xFF12121A)],
              )
            : const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Color(0xFF6C63FF), Color(0xFFA855F7)],
              ),
        borderRadius: BorderRadius.circular(26),
        border: Border.all(
          color: isFront
              ? const Color(0xFFFFB300).withOpacity(0.25)
              : Colors.white.withOpacity(0.2),
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: isFront
                ? const Color(0xFFFFB300).withOpacity(0.1)
                : const Color(0xFF6C63FF).withOpacity(0.4),
            blurRadius: 30,
            spreadRadius: 2,
          ),
        ],
      ),
      child: Stack(
        children: [
          // Decorative circles
          Positioned(
            top: -20,
            right: -20,
            child: Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withOpacity(0.04),
              ),
            ),
          ),
          Positioned(
            bottom: -30,
            left: -20,
            child: Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withOpacity(0.03),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    isFront ? '❓ Question' : '💡 Answer',
                    style: GoogleFonts.outfit(
                      color: Colors.white70,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  isFront ? card.question : card.answer,
                  style: GoogleFonts.outfit(
                    color: Colors.white,
                    fontSize: isFront ? 17 : 14,
                    fontWeight: isFront ? FontWeight.w600 : FontWeight.w400,
                    height: 1.5,
                  ),
                ),
                const Spacer(),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    Icon(
                      isFront
                          ? Icons.touch_app_rounded
                          : Icons.flip_rounded,
                      color: Colors.white38,
                      size: 16,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      isFront ? 'Tap to flip' : 'Tap to flip back',
                      style: GoogleFonts.outfit(
                          color: Colors.white38, fontSize: 11),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProgressDots() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: List.generate(_currentDeck.length, (index) {
          return AnimatedContainer(
            duration: const Duration(milliseconds: 300),
            margin: const EdgeInsets.symmetric(horizontal: 4),
            width: _currentIndex == index ? 20 : 8,
            height: 8,
            decoration: BoxDecoration(
              gradient: _currentIndex == index
                  ? const LinearGradient(
                      colors: [Color(0xFFFFB300), Color(0xFFF57C00)])
                  : null,
              color: _currentIndex == index ? null : Colors.white.withOpacity(0.2),
              borderRadius: BorderRadius.circular(4),
            ),
          );
        }),
      ),
    );
  }

  Widget _buildActionButtons() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Row(
        children: [
          IconButton(
            onPressed: _prevCard,
            icon: const Icon(Icons.chevron_left_rounded),
            color: Colors.white38,
            iconSize: 32,
          ),
          Expanded(
            child: GestureDetector(
              onTap: _markReview,
              child: Container(
                margin: const EdgeInsets.only(right: 8),
                padding: const EdgeInsets.symmetric(vertical: 14),
                decoration: BoxDecoration(
                  color: const Color(0xFFFF5252).withOpacity(0.15),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                      color: const Color(0xFFFF5252).withOpacity(0.4)),
                ),
                child: Center(
                  child: Text(
                    '🔄 Need Review',
                    style: GoogleFonts.outfit(
                      color: const Color(0xFFFF5252),
                      fontWeight: FontWeight.w700,
                      fontSize: 14,
                    ),
                  ),
                ),
              ),
            ),
          ),
          Expanded(
            child: GestureDetector(
              onTap: _markKnow,
              child: Container(
                margin: const EdgeInsets.only(left: 8),
                padding: const EdgeInsets.symmetric(vertical: 14),
                decoration: BoxDecoration(
                  color: const Color(0xFF00E676).withOpacity(0.15),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                      color: const Color(0xFF00E676).withOpacity(0.4)),
                ),
                child: Center(
                  child: Text(
                    '✅ I Know',
                    style: GoogleFonts.outfit(
                      color: const Color(0xFF00E676),
                      fontWeight: FontWeight.w700,
                      fontSize: 14,
                    ),
                  ),
                ),
              ),
            ),
          ),
          IconButton(
            onPressed: _nextCard,
            icon: const Icon(Icons.chevron_right_rounded),
            color: Colors.white38,
            iconSize: 32,
          ),
        ],
      ),
    );
  }
}

class _FlashCard {
  final String question;
  final String answer;

  const _FlashCard({required this.question, required this.answer});
}
