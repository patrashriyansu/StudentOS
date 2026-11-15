import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { login } from '../store/slices/authSlice'
import { AppDispatch, RootState } from '../store'
import {
  AlertCircle, GraduationCap, Mail, Lock, Eye, EyeOff,
  BookOpen, Code, Heart, Timer, Briefcase, Bot, CheckCircle,
} from 'lucide-react'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const features = [
  { icon: BookOpen, label: 'Academics', desc: 'Track attendance, grades & assignments', color: '#6C63FF' },
  { icon: Bot, label: 'AI Tutor', desc: 'Generate quizzes, summaries & flashcards', color: '#10B981' },
  { icon: Code, label: 'Coding & DSA', desc: 'Monitor LeetCode, Codeforces progress', color: '#A855F7' },
  { icon: Heart, label: 'Wellness', desc: 'Mood, sleep & water tracking', color: '#F43F5E' },
  { icon: Timer, label: 'Productivity', desc: 'Tasks, habits & Pomodoro timer', color: '#F59E0B' },
  { icon: Briefcase, label: 'Placements', desc: 'Resume ATS, mock interviews & prep', color: '#00D4FF' },
]

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { loading } = useSelector((s: RootState) => s.auth)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})

  const validateFields = () => {
    const errs: typeof fieldErrors = {}
    const trimmedEmail = email.trim()
    if (!trimmedEmail) errs.email = 'Email is required.'
    else if (!emailPattern.test(trimmedEmail)) errs.email = 'Enter a valid email address.'
    if (!password) errs.password = 'Password is required.'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setError('')
    if (!validateFields()) return
    const trimmedEmail = email.trim()
    const result = await dispatch(login({ email: trimmedEmail, password }))
    if (login.fulfilled.match(result)) {
      navigate('/dashboard', { replace: true })
    } else {
      const msg = (result.payload as string) || 'Login failed. Please try again.'
      setError(msg)
    }
  }

  return (
    <div className="min-h-screen flex bg-dark overflow-hidden">
      {/* ── LEFT PANEL — Branding ── */}
      <div className="hidden lg:flex lg:w-[55%] relative flex-col justify-between p-12 overflow-hidden">
        {/* Deep navy-to-indigo gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#06061a] via-[#0d0d2b] to-[#120828]" />

        {/* Ambient glow orbs */}
        <div className="absolute top-[-80px] left-[-80px] w-[420px] h-[420px] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute bottom-[-60px] right-[-40px] w-[380px] h-[380px] rounded-full bg-secondary/25 blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[140px]" />

        {/* Subtle grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(108,99,255,0.6) 39px, rgba(108,99,255,0.6) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(108,99,255,0.6) 39px, rgba(108,99,255,0.6) 40px)',
          }}
        />

        {/* Content — relative so it sits above the absolute layers */}
        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/30">
              <GraduationCap size={26} className="text-white" />
            </div>
            <span className="text-2xl font-extrabold gradient-text">StudentOS</span>
          </div>
        </div>

        <div className="relative z-10 flex-1 flex flex-col justify-center py-10">
          {/* Hero text */}
          <h2 className="text-4xl xl:text-5xl font-extrabold leading-tight mb-4 text-white">
            Your academic life,<br />
            <span className="gradient-text">in one place.</span>
          </h2>
          <p className="text-base text-slate-400 max-w-sm leading-relaxed mb-10">
            Learn smarter, stay organized, and make progress toward your goals with StudentOS.
          </p>

          {/* Feature highlights */}
          <div className="grid grid-cols-1 gap-3 max-w-sm">
            {features.map(({ icon: Icon, label, desc, color }) => (
              <div
                key={label}
                className="flex items-center gap-3.5 p-3 rounded-xl border border-white/5 bg-white/[0.03] backdrop-blur-sm"
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${color}22` }}
                >
                  <Icon size={17} style={{ color }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{label}</p>
                  <p className="text-xs text-slate-500">{desc}</p>
                </div>
                <CheckCircle size={14} className="ml-auto shrink-0 text-slate-600" />
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-xs text-slate-600">© {new Date().getFullYear()} StudentOS. Built for students, by students.</p>
        </div>
      </div>

      {/* ── RIGHT PANEL — Login Form ── */}
      <div className="flex-1 flex items-center justify-center relative overflow-y-auto py-8 px-4">
        {/* Mobile background */}
        <div className="absolute inset-0 lg:hidden bg-gradient-to-br from-primary/10 via-transparent to-secondary/10" />
        <div className="absolute top-20 left-20 w-60 h-60 bg-primary/15 rounded-full blur-[80px] lg:hidden" />
        <div className="absolute bottom-20 right-20 w-60 h-60 bg-secondary/15 rounded-full blur-[80px] lg:hidden" />

        {/* Right panel subtle bg for desktop */}
        <div className="absolute inset-0 hidden lg:block bg-[#090914]" />

        <div className="relative z-10 w-full max-w-md">
          {/* Mobile logo */}
          <div className="text-center mb-8 lg:hidden">
            <div className="flex justify-center mb-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/30">
                <GraduationCap size={30} className="text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-extrabold gradient-text">StudentOS</h1>
            <p className="text-dark-muted mt-1 text-sm">Your Academic Superpower</p>
          </div>

          {/* Card */}
          <form
            onSubmit={handleSubmit}
            noValidate
            className="bg-[#111122] border border-white/[0.07] rounded-2xl p-8 shadow-2xl shadow-black/50 space-y-5"
          >
            <div>
              <h2 className="text-xl font-bold mb-1 text-white">Welcome back</h2>
              <p className="text-dark-muted text-sm">Sign in to continue to your OS</p>
            </div>

            {/* Auth error banner */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl text-sm flex items-start gap-2 leading-relaxed">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
                {error}
              </div>
            )}

            {/* Email field */}
            <div>
              <label htmlFor="login-email" className="text-xs text-dark-muted mb-1.5 block font-medium">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted" size={17} />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }))
                  }}
                  disabled={loading}
                  required
                  autoComplete="email"
                  className={`w-full bg-dark-lighter border rounded-xl py-3 pl-10 pr-4 text-white text-sm placeholder:text-dark-muted focus:outline-none focus:ring-1 transition-colors ${
                    fieldErrors.email
                      ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/30'
                      : 'border-dark-border focus:border-primary focus:ring-primary/30'
                  }`}
                  placeholder="you@college.edu"
                />
              </div>
              {fieldErrors.email && (
                <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                  <AlertCircle size={12} /> {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Password field */}
            <div>
              <label htmlFor="login-password" className="text-xs text-dark-muted mb-1.5 block font-medium">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted" size={17} />
                <input
                  id="login-password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }))
                  }}
                  disabled={loading}
                  required
                  autoComplete="current-password"
                  className={`w-full bg-dark-lighter border rounded-xl py-3 pl-10 pr-11 text-white text-sm placeholder:text-dark-muted focus:outline-none focus:ring-1 transition-colors ${
                    fieldErrors.password
                      ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/30'
                      : 'border-dark-border focus:border-primary focus:ring-primary/30'
                  }`}
                  placeholder="Your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  disabled={loading}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-muted hover:text-white transition-colors p-1"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                  <AlertCircle size={12} /> {fieldErrors.password}
                </p>
              )}
            </div>

            {/* Sign In button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-primary/25 mt-1"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In to StudentOS'
              )}
            </button>

            <p className="text-center text-sm text-dark-muted pt-1">
              Don&apos;t have an account?{' '}
              <Link to="/register" className="text-primary hover:underline font-medium">
                Create one free
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
