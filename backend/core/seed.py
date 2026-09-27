"""
Seed data — runs once on startup if the DB is empty.
Creates a demo student account with realistic academic data.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from backend.core.database import async_session
from backend.core.security import hash_password
from datetime import date, datetime, timezone, timedelta
import random


async def seed_data():
    async with async_session() as db:
        try:
            from backend.users.models import User, UserProfile, Notification
            result = await db.execute(select(func.count(User.id)))
            count = result.scalar()
            if count > 0:
                return  # Already seeded

            # ── Demo User ──────────────────────────────────────────────────────
            user = User(
                email="demo@studentos.app",
                password_hash=hash_password("demo1234"),
                name="Arjun Sharma",
                role="student",
                xp_points=1250,
                level=3,
                streak_days=12,
                is_verified=True,
            )
            db.add(user)
            await db.flush()

            profile = UserProfile(
                user_id=user.id,
                bio="CS Engineering student passionate about AI and full-stack development.",
                department="Computer Science",
                year=3,
                college="IIT Delhi",
                github_url="https://github.com/arjunsharma",
                linkedin_url="https://linkedin.com/in/arjunsharma",
                skills=["Python", "JavaScript", "React", "FastAPI", "SQL", "Data Structures"],
                interests=["Machine Learning", "Web Development", "Competitive Programming"],
            )
            db.add(profile)

            # ── Subjects ───────────────────────────────────────────────────────
            from backend.academics.models import Subject, Timetable, Assignment, Exam, StudySession, Grade, Note
            from datetime import time as dt_time

            subjects_data = [
                {"name": "Data Structures & Algorithms", "code": "CS301", "faculty": "Dr. Rajesh Sharma", "total_classes": 38, "attended_classes": 35, "credits": 4, "semester": 5},
                {"name": "Database Management Systems", "code": "CS302", "faculty": "Prof. Anita Verma", "total_classes": 32, "attended_classes": 28, "credits": 3, "semester": 5},
                {"name": "Computer Networks", "code": "CS303", "faculty": "Dr. Suresh Patel", "total_classes": 30, "attended_classes": 22, "credits": 3, "semester": 5},
                {"name": "Operating Systems", "code": "CS304", "faculty": "Prof. Meera Gupta", "total_classes": 34, "attended_classes": 30, "credits": 3, "semester": 5},
                {"name": "Machine Learning", "code": "CS501", "faculty": "Dr. Kavita Singh", "total_classes": 28, "attended_classes": 26, "credits": 4, "semester": 5},
                {"name": "Software Engineering", "code": "CS401", "faculty": "Prof. Rajan Kumar", "total_classes": 25, "attended_classes": 24, "credits": 3, "semester": 5},
            ]
            subject_objs = []
            for sd in subjects_data:
                s = Subject(user_id=user.id, **sd)
                db.add(s)
                subject_objs.append(s)
            await db.flush()

            # ── Timetable ──────────────────────────────────────────────────────
            timetable_entries = [
                (0, "Data Structures & Algorithms", "Dr. Sharma", "LH-101", "09:00", "10:00"),
                (0, "Database Management Systems", "Prof. Verma", "LH-102", "10:00", "11:00"),
                (0, "Machine Learning", "Dr. Singh", "LH-205", "11:00", "12:00"),
                (1, "Computer Networks", "Dr. Patel", "LH-103", "09:00", "10:00"),
                (1, "Operating Systems", "Prof. Gupta", "LH-201", "10:00", "11:00"),
                (1, "Software Engineering", "Prof. Kumar", "LH-301", "11:00", "12:00"),
                (2, "DSA Lab", "Dr. Sharma", "Lab-1", "09:00", "11:00"),
                (2, "DBMS Lab", "Prof. Verma", "Lab-2", "11:00", "13:00"),
                (3, "Data Structures & Algorithms", "Dr. Sharma", "LH-101", "09:00", "10:00"),
                (3, "Machine Learning", "Dr. Singh", "LH-205", "10:00", "11:00"),
                (4, "Computer Networks", "Dr. Patel", "LH-103", "09:00", "10:00"),
                (4, "Operating Systems", "Prof. Gupta", "LH-201", "10:00", "11:00"),
                (4, "Software Engineering", "Prof. Kumar", "LH-301", "11:00", "12:00"),
            ]
            for day, subj, fac, room, start, end in timetable_entries:
                t = Timetable(user_id=user.id, day_of_week=day, subject_name=subj, faculty=fac, room=room,
                              start_time=dt_time.fromisoformat(start), end_time=dt_time.fromisoformat(end))
                db.add(t)

            # ── Assignments ────────────────────────────────────────────────────
            today = date.today()
            assignments_data = [
                ("AVL Tree Implementation", "Implement AVL tree with insert, delete, and search operations.", "Data Structures & Algorithms", (today + timedelta(days=5)).isoformat(), "pending"),
                ("SQL Query Optimization Lab", "Write optimized queries for the provided dataset.", "Database Management Systems", (today + timedelta(days=2)).isoformat(), "submitted"),
                ("Network Topology Design", "Design a topology for a 500-node campus network.", "Computer Networks", (today + timedelta(days=8)).isoformat(), "pending"),
                ("Neural Network from Scratch", "Implement backpropagation without using ML libraries.", "Machine Learning", (today + timedelta(days=12)).isoformat(), "pending"),
                ("Process Scheduling Simulator", "Build a simulator for FCFS, SJF, and Round Robin.", "Operating Systems", (today - timedelta(days=1)).isoformat(), "submitted"),
            ]
            for title, desc, subj, due, status in assignments_data:
                a = Assignment(user_id=user.id, title=title, description=desc, subject=subj,
                               due_date=datetime.fromisoformat(due), status=status)
                db.add(a)

            # ── Exams ──────────────────────────────────────────────────────────
            exams_data = [
                ("Data Structures & Algorithms", "Mid-semester", today + timedelta(days=14)),
                ("Database Management Systems", "Mid-semester", today + timedelta(days=16)),
                ("Computer Networks", "Mid-semester", today + timedelta(days=18)),
                ("Machine Learning", "Quiz 2", today + timedelta(days=7)),
                ("Operating Systems", "Mid-semester", today + timedelta(days=21)),
            ]
            for subj, etype, exam_date in exams_data:
                e = Exam(user_id=user.id, subject=subj, exam_type=etype,
                         date=datetime.combine(exam_date, dt_time(9, 0)), syllabus="Full syllabus")
                db.add(e)

            # ── Grades (previous semesters) ────────────────────────────────────
            from backend.academics.models import Grade
            semester_grades = [
                (1, "Engineering Mathematics I", 4, 8.0, "A"),
                (1, "Basic Electronics", 3, 7.5, "B+"),
                (1, "Programming Fundamentals", 4, 9.0, "A+"),
                (2, "Data Structures", 4, 8.5, "A"),
                (2, "Engineering Mathematics II", 4, 7.0, "B"),
                (3, "Algorithms", 4, 8.0, "A"),
                (3, "Computer Organization", 3, 7.5, "B+"),
                (4, "DBMS", 3, 9.0, "A+"),
                (4, "Operating Systems", 3, 8.0, "A"),
            ]
            for sem, subj, cred, gp, grade in semester_grades:
                g = Grade(user_id=user.id, semester=sem, subject=subj, credits=cred, grade_point=gp, grade=grade)
                db.add(g)

            # ── Notes ─────────────────────────────────────────────────────────
            notes_data = [
                ("AVL Trees - Complete Notes", "# AVL Trees\n\nAn AVL tree is a self-balancing BST where the heights of left and right subtrees differ by at most 1.\n\n## Rotations\n- **Right Rotation (LL Case)**\n- **Left Rotation (RR Case)**\n- **Left-Right Rotation (LR Case)**\n- **Right-Left Rotation (RL Case)**\n\n## Key Properties\n- Height: O(log n)\n- Insert/Delete/Search: O(log n)", "Data Structures & Algorithms", ["trees", "avl", "rotations"]),
                ("SQL Joins & Normalization", "# Database Joins\n\n## Types of Joins\n- INNER JOIN\n- LEFT JOIN\n- RIGHT JOIN\n- FULL OUTER JOIN\n\n## Normalization\n- 1NF: Atomic values\n- 2NF: No partial dependencies\n- 3NF: No transitive dependencies\n- BCNF: Boyce-Codd Normal Form", "Database Management Systems", ["sql", "joins", "normalization"]),
                ("OSI Model Layers", "# OSI Reference Model\n\n7 layers from bottom to top:\n1. Physical\n2. Data Link\n3. Network\n4. Transport\n5. Session\n6. Presentation\n7. Application\n\nMnemonic: Please Do Not Throw Sausage Pizza Away", "Computer Networks", ["osi", "networking", "layers"]),
            ]
            for title, content, subj, tags in notes_data:
                n = Note(user_id=user.id, title=title, content=content, subject=subj, tags=tags)
                db.add(n)

            # ── Coding Profile ─────────────────────────────────────────────────
            from backend.coding.models import CodingProfile, DSAProgress
            cp = CodingProfile(user_id=user.id, leetcode_username="arjun_sharma", codeforces_username="arjun_cf",
                               total_problems_solved=187, total_contests=18, current_streak=12, max_streak=45, rating=1642)
            db.add(cp)

            dsa_topics = [
                ("Arrays", 50, 42), ("Strings", 40, 35), ("Linked Lists", 30, 28),
                ("Stack & Queue", 25, 22), ("Trees", 45, 38), ("Graphs", 50, 30),
                ("Dynamic Programming", 60, 35), ("Binary Search", 30, 27),
                ("Recursion & Backtracking", 35, 25), ("Heap", 20, 14),
                ("Tries", 15, 8), ("Greedy", 30, 20),
            ]
            for topic, total, solved in dsa_topics:
                dp = DSAProgress(user_id=user.id, topic=topic, total_problems=total, solved_problems=solved,
                                 difficulty_breakdown={"easy": solved//3, "medium": solved//2, "hard": solved//6})
                db.add(dp)

            # ── Finance Seed ───────────────────────────────────────────────────
            from backend.finance.models import Expense, Budget, SavingsGoal
            expense_seed = [
                (450, "food", "Canteen lunch", today - timedelta(days=0)),
                (200, "transport", "Auto to college", today - timedelta(days=1)),
                (1500, "books", "DSA textbook", today - timedelta(days=3)),
                (800, "entertainment", "Movie + dinner", today - timedelta(days=5)),
                (350, "food", "Breakfast + snacks", today - timedelta(days=6)),
                (2000, "shopping", "Clothes", today - timedelta(days=8)),
                (500, "subscriptions", "Spotify + Netflix", today - timedelta(days=10)),
                (1200, "food", "Weekly groceries", today - timedelta(days=12)),
            ]
            for amount, cat, desc, exp_date in expense_seed:
                e = Expense(user_id=user.id, amount=amount, category=cat, description=desc, date=exp_date, payment_method="upi")
                db.add(e)

            budgets_seed = [("food", 5000), ("transport", 1500), ("entertainment", 2000), ("books", 3000), ("shopping", 2500), ("subscriptions", 1000)]
            for cat, limit in budgets_seed:
                b = Budget(user_id=user.id, category=cat, monthly_limit=limit, month=today.month, year=today.year)
                db.add(b)

            sg = SavingsGoal(user_id=user.id, title="Laptop Upgrade", target_amount=60000, current_amount=18000, deadline=date(today.year + 1, 3, 31))
            db.add(sg)

            # ── Wellness Seed ─────────────────────────────────────────────────
            from backend.wellness.models import MoodLog, SleepLog, WaterLog
            for i in range(7):
                d = today - timedelta(days=i)
                db.add(MoodLog(user_id=user.id, mood_score=random.randint(3, 5), date=d, note=""))
                db.add(SleepLog(user_id=user.id, hours=round(random.uniform(6.0, 8.5), 1), quality=random.randint(3, 5), date=d))
                db.add(WaterLog(user_id=user.id, glasses=random.randint(5, 9), goal=8, date=d))

            # ── Productivity Seed ─────────────────────────────────────────────
            from backend.productivity.models import Task, Habit, HabitLog
            tasks_seed = [
                ("Complete AVL Tree Assignment", "academic", "high", today + timedelta(days=5)),
                ("Solve 5 LeetCode problems", "coding", "high", today + timedelta(days=1)),
                ("Update resume with new projects", "placement", "medium", today + timedelta(days=7)),
                ("Read ML chapter 8-10", "academic", "medium", today + timedelta(days=3)),
                ("Set up portfolio website", "personal", "low", today + timedelta(days=14)),
            ]
            for title, cat, priority, due in tasks_seed:
                t = Task(user_id=user.id, title=title, category=cat, priority=priority,
                         due_date=datetime.combine(due, dt_time(23, 59)))
                db.add(t)

            habits_seed = [
                ("Daily LeetCode", "Solve at least 1 problem", "#6C63FF"),
                ("Morning Study (2 hrs)", "Study before breakfast", "#10B981"),
                ("Exercise 30 min", "Walk or gym", "#F43F5E"),
                ("Drink 8 glasses of water", "Stay hydrated", "#00D4FF"),
                ("Read tech news", "Stay updated with tech", "#F59E0B"),
            ]
            for name, desc, color in habits_seed:
                h = Habit(user_id=user.id, name=name, description=desc, color=color, current_streak=random.randint(1, 15), max_streak=random.randint(10, 30))
                db.add(h)

            # ── Notifications ──────────────────────────────────────────────────
            notifs = [
                ("Welcome to StudentOS! 🎓", "Your academic super-app is ready. Explore all features!", "success"),
                ("⚠️ Attendance Alert", "Computer Networks attendance is at 73.3%. Attend all upcoming classes.", "warning"),
                ("📚 Exam Reminder", "Machine Learning Quiz 2 is in 7 days. Start your revision!", "info"),
                ("🏆 Achievement Unlocked!", "You earned the '12-Day Streak' badge. Keep it up!", "success"),
                ("📝 Assignment Due Soon", "AVL Tree Implementation is due in 5 days.", "warning"),
            ]
            for title, msg, ntype in notifs:
                n = Notification(user_id=user.id, title=title, message=msg, notification_type=ntype)
                db.add(n)

            await db.commit()
            print("[OK] StudentOS seed data created -- Login: demo@studentos.app / demo1234")
        except Exception as e:
            await db.rollback()
            print(f"[WARN] Seed data skipped: {e}")
