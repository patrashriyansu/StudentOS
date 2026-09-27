import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../features/splash/splash_screen.dart';
import '../../features/auth/login_screen.dart';
import '../../features/auth/signup_screen.dart';
import '../../features/onboarding/onboarding_screen.dart';
import '../../features/dashboard/dashboard_screen.dart';
import '../../features/study_hub/study_hub_screen.dart';
import '../../features/study_hub/notes/notes_screen.dart';
import '../../features/study_hub/pdf_scanner/pdf_scanner_screen.dart';
import '../../features/study_hub/ai_summarizer/ai_summarizer_screen.dart';
import '../../features/study_hub/quiz_generator/quiz_generator_screen.dart';
import '../../features/study_hub/flashcards/flashcards_screen.dart';
import '../../features/academic_hub/academic_hub_screen.dart';
import '../../features/academic_hub/attendance/attendance_screen.dart';
import '../../features/academic_hub/sgpa_calculator/sgpa_calculator_screen.dart';
import '../../features/academic_hub/cgpa_predictor/cgpa_predictor_screen.dart';
import '../../features/academic_hub/exam_planner/exam_planner_screen.dart';
import '../../features/academic_hub/timetable/timetable_screen.dart';
import '../../features/coding_hub/coding_hub_screen.dart';
import '../../features/coding_hub/leetcode_tracker/leetcode_tracker_screen.dart';
import '../../features/coding_hub/daily_challenges/daily_challenges_screen.dart';
import '../../features/coding_hub/dsa_roadmap/dsa_roadmap_screen.dart';
import '../../features/coding_hub/contest_tracker/contest_tracker_screen.dart';
import '../../features/placement_hub/placement_hub_screen.dart';
import '../../features/placement_hub/resume_analyzer/resume_analyzer_screen.dart';
import '../../features/placement_hub/mock_interview/mock_interview_screen.dart';
import '../../features/placement_hub/ats_score/ats_score_screen.dart';
import '../../features/placement_hub/internship_finder/internship_finder_screen.dart';
import '../../features/wellness_hub/wellness_hub_screen.dart';
import '../../features/wellness_hub/mood_tracker/mood_tracker_screen.dart';
import '../../features/wellness_hub/sleep_tracker/sleep_tracker_screen.dart';
import '../../features/wellness_hub/water_tracker/water_tracker_screen.dart';
import '../../features/wellness_hub/meditation/meditation_screen.dart';
import '../../features/finance_hub/finance_hub_screen.dart';
import '../../features/finance_hub/expense_tracker/expense_tracker_screen.dart';
import '../../features/finance_hub/budget_planner/budget_planner_screen.dart';
import '../../features/finance_hub/savings_predictor/savings_predictor_screen.dart';
import '../../features/ai_assistant/ai_assistant_screen.dart';
import '../../features/notifications/notifications_screen.dart';
import '../../features/profile/profile_screen.dart';
import '../../features/profile/digital_twin_screen.dart';
import '../constants/app_constants.dart';

final GoRouter appRouter = GoRouter(
  initialLocation: AppConstants.splash,
  debugLogDiagnostics: true,
  routes: [
    GoRoute(path: AppConstants.splash, builder: (_, __) => const SplashScreen()),
    GoRoute(path: AppConstants.login, builder: (_, __) => const LoginScreen()),
    GoRoute(path: AppConstants.signup, builder: (_, __) => const SignupScreen()),
    GoRoute(path: AppConstants.onboarding, builder: (_, __) => const OnboardingScreen()),
    GoRoute(path: AppConstants.dashboard, builder: (_, __) => const DashboardScreen()),

    // ── Study Hub ──────────────────────────────────────────────────────────
    GoRoute(path: AppConstants.studyHub, builder: (_, __) => const StudyHubScreen()),
    GoRoute(path: AppConstants.notes, builder: (_, __) => const NotesScreen()),
    GoRoute(path: AppConstants.pdfScanner, builder: (_, __) => const PdfScannerScreen()),
    GoRoute(path: AppConstants.aiSummarizer, builder: (_, __) => const AiSummarizerScreen()),
    GoRoute(path: AppConstants.quizGenerator, builder: (_, __) => const QuizGeneratorScreen()),
    GoRoute(path: AppConstants.flashcards, builder: (_, __) => const FlashcardsScreen()),

    // ── Academic Hub ────────────────────────────────────────────────────────
    GoRoute(path: AppConstants.academicHub, builder: (_, __) => const AcademicHubScreen()),
    GoRoute(path: AppConstants.attendance, builder: (_, __) => const AttendanceScreen()),
    GoRoute(path: AppConstants.sgpaCalculator, builder: (_, __) => const SgpaCalculatorScreen()),
    GoRoute(path: AppConstants.cgpaPredictor, builder: (_, __) => const CgpaPredictorScreen()),
    GoRoute(path: AppConstants.examPlanner, builder: (_, __) => const ExamPlannerScreen()),
    GoRoute(path: AppConstants.timetable, builder: (_, __) => const TimetableScreen()),

    // ── Coding Hub ──────────────────────────────────────────────────────────
    GoRoute(path: AppConstants.codingHub, builder: (_, __) => const CodingHubScreen()),
    GoRoute(path: AppConstants.leetcodeTracker, builder: (_, __) => const LeetCodeTrackerScreen()),
    GoRoute(path: AppConstants.dailyChallenges, builder: (_, __) => const DailyChallengesScreen()),
    GoRoute(path: AppConstants.dsaRoadmap, builder: (_, __) => const DsaRoadmapScreen()),
    GoRoute(path: AppConstants.contestTracker, builder: (_, __) => const ContestTrackerScreen()),

    // ── Placement Hub ───────────────────────────────────────────────────────
    GoRoute(path: AppConstants.placementHub, builder: (_, __) => const PlacementHubScreen()),
    GoRoute(path: AppConstants.resumeAnalyzer, builder: (_, __) => const ResumeAnalyzerScreen()),
    GoRoute(path: AppConstants.mockInterview, builder: (_, __) => const MockInterviewScreen()),
    GoRoute(path: AppConstants.atsScore, builder: (_, __) => const AtsScoreScreen()),
    GoRoute(path: AppConstants.internshipFinder, builder: (_, __) => const InternshipFinderScreen()),

    // ── Wellness Hub ────────────────────────────────────────────────────────
    GoRoute(path: AppConstants.wellnessHub, builder: (_, __) => const WellnessHubScreen()),
    GoRoute(path: AppConstants.moodTracker, builder: (_, __) => const MoodTrackerScreen()),
    GoRoute(path: AppConstants.sleepTracker, builder: (_, __) => const SleepTrackerScreen()),
    GoRoute(path: AppConstants.waterTracker, builder: (_, __) => const WaterTrackerScreen()),
    GoRoute(path: AppConstants.meditation, builder: (_, __) => const MeditationScreen()),

    // ── Finance Hub ─────────────────────────────────────────────────────────
    GoRoute(path: AppConstants.financeHub, builder: (_, __) => const FinanceHubScreen()),
    GoRoute(path: AppConstants.expenseTracker, builder: (_, __) => const ExpenseTrackerScreen()),
    GoRoute(path: AppConstants.budgetPlanner, builder: (_, __) => const BudgetPlannerScreen()),
    GoRoute(path: AppConstants.savingsPredictor, builder: (_, __) => const SavingsPredictorScreen()),

    // ── AI & Others ─────────────────────────────────────────────────────────
    GoRoute(path: AppConstants.aiAssistant, builder: (_, __) => const AiAssistantScreen()),
    GoRoute(path: AppConstants.notificationsRoute, builder: (_, __) => const NotificationsScreen()),
    GoRoute(path: AppConstants.profile, builder: (_, __) => const ProfileScreen()),
    GoRoute(path: AppConstants.digitalTwin, builder: (_, __) => const DigitalTwinScreen()),
  ],
  errorBuilder: (context, state) => Scaffold(
    backgroundColor: const Color(0xFF0A0A0F),
    body: Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, color: Color(0xFFFF5252), size: 64),
          const SizedBox(height: 16),
          const Text('Page not found',
              style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          TextButton(
            onPressed: () => context.go(AppConstants.dashboard),
            child: const Text('Go Home', style: TextStyle(color: Color(0xFF6C63FF))),
          ),
        ],
      ),
    ),
  ),
);
