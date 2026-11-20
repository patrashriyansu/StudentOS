import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { register as registerUser } from '../store/slices/authSlice'
import { AppDispatch, RootState } from '../store'
import {
  AlertCircle, GraduationCap, Mail, Lock, User, Eye, EyeOff,
  BookOpen, CheckCircle, ShieldCheck, Briefcase,
} from 'lucide-react'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const roles = [
  { value: 'student', label: 'Student', desc: 'Pursuing a degree', icon: BookOpen },
  { value: 'recruiter', label: 'Recruiter', desc: 'Hiring talent', icon: Briefcase },
  { value: 'mentor', label: 'Mentor', desc: 'Guiding students', icon: ShieldCheck },
]

/** Returns a 0–4 strength score and label */
function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: '' }
  let score = 0
  if (pw.length >= 8) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[a-z]/.test(pw)) score++
  if (/\d/.test(pw)) score++
  if (/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(pw)) score++
  if (score <= 2) return { score, label: 'Weak', color: 'bg-red-500' }
  if (score === 3) return { score, label: 'Fair', color: 'bg-amber-500' }
  if (score === 4) return { score, label: 'Good', color: 'bg-emerald-400' }
  return { score, label: 'Strong', color: 'bg-emerald-500' }
}

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [registrationNumber, setRegistrationNumber] = useState('')
  const [section, setSection] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState('student')
  const [showPw, setShowPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const dispatch = useDispatch<AppDispatch>()
  const { loading } = useSelector((s: RootState) => s.auth)
  const navigate = useNavigate()

  const strength = getPasswordStrength(password)

  const clearFieldError = (field: string) =>
    setFieldErrors((prev) => { const n = { ...prev }; delete n[field]; return n })

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = 'Full name is required.'
    if (role === 'student' && !registrationNumber.trim()) errs.registrationNumber = 'Registration number is required.'
    if (role === 'student' && !section.trim()) errs.section = 'Section is required.'
    const trimmedEmail = email.trim()
    if (!trimmedEmail) errs.email = 'Email is required.'
    else if (!emailPattern.test(trimmedEmail)) errs.email = 'Enter a valid email address.'
    if (!password) errs.password = 'Password is required.'
    else if (password.length < 8) errs.password = 'Password must be at least 8 characters.'
    else if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password) || !/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password)) {
      errs.password = 'Include uppercase, lowercase, a number, and a special character.'
    }
    if (!confirmPassword) errs.confirmPassword = 'Please confirm your password.'
    else if (password !== confirmPassword) errs.confirmPassword = 'Passwords do not match.'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setError('')
    if (!validate()) return
    const trimmedEmail = email.trim()
    const trimmedName = name.trim()
    const result = await dispatch(registerUser({ email: trimmedEmail, password, name: trimmedName, role, registration_number: role === 'student' ? registrationNumber.trim().toUpperCase() : undefined, section: role === 'student' ? section.trim().toUpperCase() : undefined }))
    if (registerUser.fulfilled.match(result)) {
      navigate('/dashboard', { replace: true })
    } else {
      setError((result.payload as string) || 'Registration failed. Please check your details and try again.')
    }
  }

  return (
    <div className="register-page min-h-screen flex overflow-hidden">
      <div className="register-background" aria-hidden="true" />
      {/* ── LEFT PANEL — Branding ── */}
      <div className="register-visual hidden lg:flex lg:w-[42%] relative flex-col justify-between p-12 overflow-hidden">
        <div className="register-visual-backdrop absolute inset-0" />
        <div className="absolute top-[-80px] left-[-80px] w-[420px] h-[420px] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute bottom-[-60px] right-[-40px] w-[360px] h-[360px] rounded-full bg-secondary/25 blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(108,99,255,0.6) 39px, rgba(108,99,255,0.6) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(108,99,255,0.6) 39px, rgba(108,99,255,0.6) 40px)',
          }}
        />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/30">
              <GraduationCap size={26} className="text-white" />
            </div>
            <span className="text-2xl font-extrabold gradient-text">StudentOS</span>
          </div>
        </div>

        <div className="relative z-10 flex-1 flex flex-col justify-center py-10">
          <h2 className="text-4xl font-extrabold leading-tight mb-4 text-white">
            Join thousands of<br />
            <span className="gradient-text">students thriving</span><br />
            with StudentOS.
          </h2>
          <p className="text-base text-slate-400 max-w-xs leading-relaxed mb-10">
            Create your free account and get instant access to all academic tools in one dashboard.
          </p>

          <div className="space-y-3 max-w-xs">
            {[
              { icon: CheckCircle, text: 'Track attendance across all subjects', color: '#6C63FF' },
              { icon: CheckCircle, text: 'AI-powered quiz & flashcard generator', color: '#10B981' },
              { icon: CheckCircle, text: 'DSA practice tracker with 300+ topics', color: '#A855F7' },
              { icon: CheckCircle, text: 'Pomodoro timer with XP rewards', color: '#F59E0B' },
              { icon: CheckCircle, text: 'Community & placement preparation', color: '#00D4FF' },
            ].map(({ icon: Icon, text, color }) => (
              <div key={text} className="flex items-start gap-2.5">
                <Icon size={15} style={{ color }} className="shrink-0 mt-0.5" />
                <span className="text-sm text-slate-400">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-xs text-slate-600">© {new Date().getFullYear()} StudentOS. Your academic superpower.</p>
        </div>
      </div>

      {/* ── RIGHT PANEL — Registration Form ── */}
      <div className="register-form-panel flex-1 flex items-start justify-center relative overflow-y-auto py-8 px-4">
        <div className="absolute inset-0 lg:hidden bg-gradient-to-br from-primary/10 via-transparent to-secondary/10" />
        <div className="absolute top-20 right-10 w-52 h-52 bg-primary/15 rounded-full blur-[80px] lg:hidden" />

        <div className="relative z-10 w-full max-w-md py-6">
          {/* Mobile logo */}
          <div className="text-center mb-6 lg:hidden">
            <div className="flex justify-center mb-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/30">
                <GraduationCap size={26} className="text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-extrabold gradient-text">StudentOS</h1>
          </div>

          <form
            onSubmit={handleSubmit}
            noValidate
            className="register-card border rounded-2xl p-7 shadow-2xl space-y-4"
          >
            <div>
              <h2 className="text-xl font-bold text-white">Create your account</h2>
              <p className="text-dark-muted text-sm mt-0.5">Free forever. No credit card required.</p>
            </div>

            {/* Auth error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl text-sm flex items-start gap-2 leading-relaxed">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
                {error}
              </div>
            )}

            {/* Full Name */}
            <div>
              <label htmlFor="reg-name" className="text-xs text-dark-muted mb-1.5 block font-medium">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted" size={16} />
                <input
                  id="reg-name"
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); clearFieldError('name') }}
                  disabled={loading}
                  required
                  autoComplete="name"
                  className={`w-full bg-dark-lighter border rounded-xl py-2.5 pl-9 pr-4 text-white text-sm placeholder:text-dark-muted focus:outline-none focus:ring-1 transition-colors ${
                    fieldErrors.name ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/30' : 'border-dark-border focus:border-primary focus:ring-primary/30'
                  }`}
                  placeholder="John Doe"
                />
              </div>
              {fieldErrors.name && <p className="text-xs text-red-400 mt-1 flex items-center gap-1"><AlertCircle size={11} />{fieldErrors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="reg-email" className="text-xs text-dark-muted mb-1.5 block font-medium">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted" size={16} />
                <input
                  id="reg-email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); clearFieldError('email') }}
                  disabled={loading}
                  required
                  autoComplete="email"
                  className={`w-full bg-dark-lighter border rounded-xl py-2.5 pl-9 pr-4 text-white text-sm placeholder:text-dark-muted focus:outline-none focus:ring-1 transition-colors ${
                    fieldErrors.email ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/30' : 'border-dark-border focus:border-primary focus:ring-primary/30'
                  }`}
                  placeholder="you@college.edu"
                />
              </div>
              {fieldErrors.email && <p className="text-xs text-red-400 mt-1 flex items-center gap-1"><AlertCircle size={11} />{fieldErrors.email}</p>}
            </div>

            {role === 'student' && (
              <>
                <div>
                  <label htmlFor="reg-registration-number" className="text-xs text-dark-muted mb-1.5 block font-medium">College Registration Number</label>
                  <input id="reg-registration-number" value={registrationNumber} onChange={(e) => { setRegistrationNumber(e.target.value); clearFieldError('registrationNumber') }} disabled={loading} required className={`w-full bg-dark-lighter border rounded-xl py-2.5 px-4 text-white text-sm ${fieldErrors.registrationNumber ? 'border-red-500/60' : 'border-dark-border'}`} placeholder="Enter your official registration number" />
                  {fieldErrors.registrationNumber && <p className="text-xs text-red-400 mt-1">{fieldErrors.registrationNumber}</p>}
                </div>
                <div>
                  <label htmlFor="reg-section" className="text-xs text-dark-muted mb-1.5 block font-medium">Section</label>
                  <input id="reg-section" value={section} onChange={(e) => { setSection(e.target.value); clearFieldError('section') }} disabled={loading} required className={`w-full bg-dark-lighter border rounded-xl py-2.5 px-4 text-white text-sm ${fieldErrors.section ? 'border-red-500/60' : 'border-dark-border'}`} placeholder="Example: CSE-A" />
                  {fieldErrors.section && <p className="text-xs text-red-400 mt-1">{fieldErrors.section}</p>}
                </div>
              </>
            )}

            {/* Password */}
            <div>
              <label htmlFor="reg-password" className="text-xs text-dark-muted mb-1.5 block font-medium">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted" size={16} />
                <input
                  id="reg-password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); clearFieldError('password') }}
                  disabled={loading}
                  required
                  autoComplete="new-password"
                  className={`w-full bg-dark-lighter border rounded-xl py-2.5 pl-9 pr-10 text-white text-sm placeholder:text-dark-muted focus:outline-none focus:ring-1 transition-colors ${
                    fieldErrors.password ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/30' : 'border-dark-border focus:border-primary focus:ring-primary/30'
                  }`}
                  placeholder="Min. 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  disabled={loading}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-muted hover:text-white transition-colors p-1"
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {/* Strength bar */}
              {password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`flex-1 h-1 rounded-full transition-all ${
                          i <= strength.score ? strength.color : 'bg-dark-lighter'
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs font-medium ${
                    strength.score <= 2 ? 'text-red-400' : strength.score === 3 ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    {strength.label}
                  </p>
                </div>
              )}
              {fieldErrors.password && <p className="text-xs text-red-400 mt-1 flex items-center gap-1"><AlertCircle size={11} />{fieldErrors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="reg-confirm-password" className="text-xs text-dark-muted mb-1.5 block font-medium">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted" size={16} />
                <input
                  id="reg-confirm-password"
                  type={showConfirmPw ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); clearFieldError('confirmPassword') }}
                  disabled={loading}
                  required
                  autoComplete="new-password"
                  className={`w-full bg-dark-lighter border rounded-xl py-2.5 pl-9 pr-10 text-white text-sm placeholder:text-dark-muted focus:outline-none focus:ring-1 transition-colors ${
                    fieldErrors.confirmPassword ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/30' : 'border-dark-border focus:border-primary focus:ring-primary/30'
                  }`}
                  placeholder="Repeat your password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw(!showConfirmPw)}
                  disabled={loading}
                  aria-label={showConfirmPw ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-muted hover:text-white transition-colors p-1"
                >
                  {showConfirmPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {fieldErrors.confirmPassword && <p className="text-xs text-red-400 mt-1 flex items-center gap-1"><AlertCircle size={11} />{fieldErrors.confirmPassword}</p>}
            </div>

            {/* Role selector */}
            <div>
              <label className="text-xs text-dark-muted mb-2 block font-medium">I am a</label>
              <div className="grid grid-cols-2 gap-2">
                {roles.map(({ value, label, desc, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRole(value)}
                    disabled={loading}
                    className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                      role === value
                        ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                        : 'border-dark-border bg-dark-lighter hover:border-primary/40'
                    }`}
                  >
                    <Icon size={15} className={role === value ? 'text-primary shrink-0 mt-0.5' : 'text-dark-muted shrink-0 mt-0.5'} />
                    <div>
                      <div className="text-sm font-medium text-white">{label}</div>
                      <div className="text-xs text-dark-muted">{desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-primary/25"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </button>

            <p className="text-center text-sm text-dark-muted">
              Already have an account?{' '}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
