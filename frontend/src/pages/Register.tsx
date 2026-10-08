import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { register as registerUser } from '../store/slices/authSlice'
import { AppDispatch, RootState } from '../store'
import { AlertCircle, GraduationCap, Mail, Lock, User, Eye, EyeOff } from 'lucide-react'

const roles = [
  { value: 'student', label: 'Student', desc: 'Pursuing degree' },
  { value: 'faculty', label: 'Faculty', desc: 'Teaching staff' },
  { value: 'recruiter', label: 'Recruiter', desc: 'Hiring talent' },
  { value: 'mentor', label: 'Mentor', desc: 'Guide students' },
]

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('student')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const dispatch = useDispatch<AppDispatch>()
  const { loading } = useSelector((s: RootState) => s.auth)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const result = await dispatch(registerUser({ email: email.trim(), password, name: name.trim(), role }))
    if (registerUser.fulfilled.match(result)) {
      navigate('/dashboard', { replace: true })
    } else {
      setError((result.payload as string) || 'Registration failed. Please try again.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10" />
      <div className="absolute top-20 right-20 w-72 h-72 bg-primary/20 rounded-full blur-[100px]" />
      <div className="absolute bottom-20 left-20 w-72 h-72 bg-secondary/20 rounded-full blur-[100px]" />
      <div className="relative z-10 w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4"><GraduationCap className="text-primary" size={48} /></div>
          <h1 className="text-3xl font-bold gradient-text">Create Account</h1>
          <p className="text-dark-muted mt-2">Join StudentOS today</p>
        </div>
        <form onSubmit={handleSubmit} className="glass rounded-2xl p-8 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl text-sm flex items-start gap-2 leading-relaxed">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
              {error}
            </div>
          )}
          <div>
            <label className="text-sm text-dark-muted mb-1.5 block">Full Name</label>
            <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted" size={18} /><input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full bg-dark-lighter border border-dark-border rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-dark-muted focus:outline-none focus:border-primary" placeholder="John Doe" /></div>
          </div>
          <div>
            <label className="text-sm text-dark-muted mb-1.5 block">Email</label>
            <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted" size={18} /><input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full bg-dark-lighter border border-dark-border rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-dark-muted focus:outline-none focus:border-primary" placeholder="you@college.edu" /></div>
          </div>
          <div>
            <label className="text-sm text-dark-muted mb-1.5 block">Password</label>
            <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted" size={18} /><input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required minLength={6} className="w-full bg-dark-lighter border border-dark-border rounded-xl py-3 pl-10 pr-10 text-white placeholder:text-dark-muted focus:outline-none focus:border-primary" /><button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-muted hover:text-white">{showPw ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
          </div>
          <div>
            <label className="text-sm text-dark-muted mb-1.5 block">I am a</label>
            <div className="grid grid-cols-2 gap-2">
              {roles.map(r => (
                <button key={r.value} type="button" onClick={() => setRole(r.value)} className={`p-3 rounded-xl border text-left transition-all ${role === r.value ? 'border-primary bg-primary/10' : 'border-dark-border bg-dark-lighter hover:border-primary/50'}`}>
                  <div className="text-sm font-medium">{r.label}</div>
                  <div className="text-xs text-dark-muted">{r.desc}</div>
                </button>
              ))}
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary-600 text-white font-medium py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating account...</> : 'Create Account'}
          </button>
          <p className="text-center text-sm text-dark-muted">Already have an account? <Link to="/login" className="text-primary hover:underline">Sign in</Link></p>
        </form>
      </div>
    </div>
  )
}
