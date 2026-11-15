import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowLeft, CheckCircle2, GraduationCap, KeyRound, Lock, Mail } from 'lucide-react'
import { api } from '../services/api'
import { getFriendlyApiError } from '../services/errors'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [step, setStep] = useState<'email' | 'reset'>('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const navigate = useNavigate()

  const requestCode = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setNotice('')
    setLoading(true)
    try {
      await api.post('/auth/send-otp', { email: email.trim(), purpose: 'password_reset' })
      setStep('reset')
      setNotice('A recovery code was sent if an account exists for that email address.')
    } catch (err: unknown) {
      setError(getFriendlyApiError(err, 'We could not send a recovery code. Please try again later.'))
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setNotice('')
    if (password !== confirmPassword) {
      setError('The passwords do not match.')
      return
    }
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the six-digit recovery code.')
      return
    }
    const hasRequiredSpecial = [...password].some((character) => '!@#$%^&*()_+-=[]{}|;:,.<>?'.includes(character))
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password) || !hasRequiredSpecial) {
      setError('Use at least 8 characters with uppercase, lowercase, a number and a special character.')
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/reset-password', {
        email: email.trim(),
        code,
        new_password: password,
      })
      navigate('/login', { replace: true, state: { passwordReset: true } })
    } catch (err: unknown) {
      setError(getFriendlyApiError(err, 'Password reset failed. Check the code and try again.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <GraduationCap size={26} className="text-white" />
          </div>
          <span className="text-2xl font-extrabold gradient-text">StudentOS</span>
        </div>
        <div className="bg-[#111122] border border-white/[0.07] rounded-2xl p-8 shadow-2xl shadow-black/50">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white">Reset your password</h1>
            <p className="text-sm text-dark-muted mt-2">
              {step === 'email' ? 'Enter the email address linked to your account.' : 'Enter the six-digit code and choose a new password.'}
            </p>
          </div>

          {error && (
            <div role="alert" className="mb-5 bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl text-sm flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}
          {notice && (
            <div role="status" className="mb-5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-xl text-sm flex items-start gap-2">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5" /> {notice}
            </div>
          )}

          {step === 'email' ? (
            <form onSubmit={requestCode} className="space-y-5">
              <label className="block">
                <span className="text-xs text-dark-muted mb-1.5 block font-medium">Email address</span>
                <span className="relative block">
                  <Mail size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted" />
                  <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-dark-lighter border border-dark-border rounded-xl py-3 pl-10 pr-4 text-white text-sm focus:outline-none focus:border-primary"
                    placeholder="you@college.edu" />
                </span>
              </label>
              <button disabled={loading} className="w-full bg-gradient-to-r from-primary to-secondary text-white font-semibold py-3 rounded-xl disabled:opacity-50">
                {loading ? 'Sending code…' : 'Send recovery code'}
              </button>
            </form>
          ) : (
            <form onSubmit={resetPassword} className="space-y-4">
              <div className="text-xs text-dark-muted">Recovery email: <span className="text-white">{email}</span></div>
              <label className="block">
                <span className="text-xs text-dark-muted mb-1.5 block font-medium">Six-digit code</span>
                <span className="relative block">
                  <KeyRound size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted" />
                  <input type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full bg-dark-lighter border border-dark-border rounded-xl py-3 pl-10 pr-4 text-white text-sm tracking-[0.25em] focus:outline-none focus:border-primary"
                    placeholder="000000" />
                </span>
              </label>
              <label className="block">
                <span className="text-xs text-dark-muted mb-1.5 block font-medium">New password</span>
                <span className="relative block">
                  <Lock size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted" />
                  <input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-dark-lighter border border-dark-border rounded-xl py-3 pl-10 pr-4 text-white text-sm focus:outline-none focus:border-primary"
                    placeholder="At least 8 characters" />
                </span>
              </label>
              <label className="block">
                <span className="text-xs text-dark-muted mb-1.5 block font-medium">Confirm new password</span>
                <input type="password" autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-dark-lighter border border-dark-border rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-primary"
                  placeholder="Re-enter your password" />
              </label>
              <button disabled={loading} className="w-full bg-gradient-to-r from-primary to-secondary text-white font-semibold py-3 rounded-xl disabled:opacity-50">
                {loading ? 'Resetting…' : 'Reset password'}
              </button>
              <button type="button" onClick={() => { setStep('email'); setCode(''); setNotice('') }} className="w-full text-sm text-dark-muted hover:text-white">
                Send a new code
              </button>
            </form>
          )}

          <Link to="/login" className="mt-6 flex items-center justify-center gap-2 text-sm text-primary hover:underline">
            <ArrowLeft size={15} /> Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
