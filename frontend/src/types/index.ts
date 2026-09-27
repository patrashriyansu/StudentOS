export interface User {
  id: number; email: string; name: string; role: string; avatar?: string; xp_points: number; level: number; streak_days: number; created_at: string;
}
export interface AuthState { user: User | null; token: string | null; refreshToken: string | null; isAuthenticated: boolean; loading: boolean; }
export interface Subject { id: number; name: string; code?: string; faculty?: string; total_classes: number; attended_classes: number; credits: number; semester?: number; attendance: number; }
export interface TimetableEntry { id: number; day_of_week: number; subject_name: string; faculty: string; room: string; start_time: string; end_time: string; }
export interface Assignment { id: number; title: string; description?: string; subject: string; due_date: string; status: string; grade?: string; }
export interface Note { id: number; title: string; content: string; subject?: string; summary?: string; tags?: string[]; created_at: string; updated_at: string; }
export interface Exam { id: number; subject: string; exam_type: string; date: string; syllabus?: string; completed: boolean; score?: number; }
export interface Application { id: number; company: string; role: string; status: string; application_date: string; deadline?: string; salary?: string; notes?: string; round: number; }
export interface CodingProfile { leetcode_username?: string; codeforces_username?: string; codechef_username?: string; total_problems_solved: number; total_contests: number; current_streak: number; max_streak: number; rating: number; }
export interface WellnessEntry { id: number; type: string; value: number; date: string; notes?: string; }
export interface NotificationItem { id: number; title: string; message: string; type: string; read: boolean; created_at: string; }
