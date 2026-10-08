import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { login } from '../store/slices/authSlice'
import { AppDispatch, RootState } from '../store'
import { AlertCircle, GraduationCap, Mail, Lock, Eye, EyeOff, Zap, BookOpen, Code, Heart } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { loading } = useSelector((s: RootState) => s.auth)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const result = await dispatch(login({ email: email.trim(), password }))
    if (login.fulfilled.match(result)) {
      navigate('/dashboard', { replace: true })
    } else {
      const msg = (result.payload as string) || 'Login failed. Please try again.'
      setError(msg)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10" />
      <div className="absolute top-20 left-20 w-72 h-72 bg-primary/20 rounded-full blur-[100px]" />
      <div className="absolute bottom-20 right-20 w-72 h-72 bg-secondary/20 rounded-full blur-[100px]" />

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <GraduationCap size={34} className="text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold gradient-text">StudentOS</h1>
          <p className="text-dark-muted mt-1 text-sm">Your Academic Superpower</p>
        </div>

        {/* Feature pills */}
        <div className="flex justify-center gap-2 mb-6 flex-wrap">
          {[
            { icon: Zap, label: 'AI Tutor', color: 'text-yellow-400' },
            { icon: BookOpen, label: 'Academics', color: 'text-primary' },
            { icon: Code, label: 'DSA', color: 'text-secondary' },
            { icon: Heart, label: 'Wellness', color: 'text-rose-400' },
          ].map(({ icon: Icon, label, color }) => (
            <span key={label} className="flex items-center gap-1.5 text-xs bg-dark-card border border-dark-border px-3 py-1 rounded-full text-dark-muted">
              <Icon size={12} className={color} /> {label}
            </span>
          ))}
        </div>

        {/* Card */}
        <form onSubmit={handleSubmit} className="glass rounded-2xl p-8 space-y-5 border border-dark-border">
          <div>
            <h2 className="text-xl font-bold mb-1">Welcome back</h2>
            <p className="text-dark-muted text-sm">Sign in to continue to your OS</p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl text-sm flex items-start gap-2 leading-relaxed">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
              {error}
            </div>
          )}

          {/* Email */}
          <div>
            <label className="text-xs text-dark-muted mb-1.5 block font-medium">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted" size={17} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full bg-dark-lighter border border-dark-border rounded-xl py-3 pl-10 pr-4 text-white text-sm placeholder:text-dark-muted focus:outline-none focus:border-primary transition-colors"
                placeholder="you@college.edu"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="text-xs text-dark-muted mb-1.5 block font-medium">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted" size={17} />
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full bg-dark-lighter border border-dark-border rounded-xl py-3 pl-10 pr-10 text-white text-sm placeholder:text-dark-muted focus:outline-none focus:border-primary transition-colors"
                placeholder="Password"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-muted hover:text-white transition-colors"
              >
                {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {/* Sign In button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
          >
            {loading ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in...</>
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
  )
}
