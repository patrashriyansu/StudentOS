import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { googleLogin, login } from '../store/slices/authSlice'
import { AppDispatch, RootState } from '../store'
import { AlertCircle, GraduationCap, Mail, Lock, Eye, EyeOff } from 'lucide-react'

const emailPattern = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

type GoogleCredentialResponse = { credential: string }
type GoogleButtonOptions = {
  theme?: 'outline' | 'filled_blue' | 'filled_black'
  size?: 'large' | 'medium' | 'small'
  shape?: 'rectangular' | 'pill' | 'circle' | 'square'
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
  width?: number
  logo_alignment?: 'left' | 'center'
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string
            auto_select?: boolean
            callback: (response: GoogleCredentialResponse) => void
          }) => void
          renderButton: (element: HTMLElement, options: GoogleButtonOptions) => void
        }
      }
    }
  }
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [googleError, setGoogleError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})
  const googleButtonRef = useRef<HTMLDivElement>(null)
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { loading } = useSelector((state: RootState) => state.auth)

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return
    let mounted = true
    let script = document.querySelector<HTMLScriptElement>('script[data-studentos-google="true"]')

    const onGoogleCredential = async (response: GoogleCredentialResponse) => {
      if (!mounted) return
      if (!response.credential) {
        setError('Google did not return an identity token. Please try again.')
        return
      }
      setError('')
      const result = await dispatch(googleLogin(response.credential))
      if (googleLogin.fulfilled.match(result)) {
        navigate('/dashboard', { replace: true })
      } else {
        setError((result.payload as string) || 'Google sign-in failed. Please try again.')
      }
    }

    const initializeGoogle = () => {
      const googleId = window.google?.accounts.id
      if (!mounted || !googleId || !googleButtonRef.current) return
      googleId.initialize({
        client_id: GOOGLE_CLIENT_ID,
        auto_select: false,
        callback: onGoogleCredential,
      })
      googleButtonRef.current.innerHTML = ''
      googleId.renderButton(googleButtonRef.current, {
        theme: 'outline',
        size: 'large',
        shape: 'rectangular',
        text: 'continue_with',
        logo_alignment: 'left',
        width: Math.max(220, Math.floor(googleButtonRef.current.clientWidth)),
      })
    }

    const onScriptError = () => {
      if (mounted) setGoogleError('Google sign-in could not load. Check your connection and retry.')
    }

    if (window.google?.accounts.id) {
      initializeGoogle()
    } else {
      if (!script) {
        script = document.createElement('script')
        script.src = 'https://accounts.google.com/gsi/client'
        script.async = true
        script.defer = true
        script.dataset.studentosGoogle = 'true'
      }
      script.addEventListener('load', initializeGoogle, { once: true })
      script.addEventListener('error', onScriptError, { once: true })
      if (!script.isConnected) document.head.appendChild(script)
    }

    return () => {
      mounted = false
      script?.removeEventListener('load', initializeGoogle)
      script?.removeEventListener('error', onScriptError)
    }
  }, [dispatch, navigate])

  const validate = () => {
    const next: typeof fieldErrors = {}
    if (!email.trim()) next.email = 'Email is required.'
    else if (!emailPattern.test(email.trim())) next.email = 'Enter a valid email address.'
    if (!password) next.password = 'Password is required.'
    setFieldErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (loading || !validate()) return
    setError('')
    const result = await dispatch(login({ email: email.trim(), password }))
    if (login.fulfilled.match(result)) {
      navigate('/dashboard', { replace: true })
    } else {
      setError((result.payload as string) || 'Login failed. Please check your email and password.')
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f6ff] text-[#15204b] lg:grid lg:grid-cols-2">
      <section className="relative flex min-h-screen flex-col overflow-hidden px-5 py-6 sm:px-8 lg:px-12 xl:px-16">
        <div className="pointer-events-none absolute -left-28 -top-28 h-80 w-80 rounded-full bg-indigo-200/50 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-blue-100/80 blur-3xl" />

        <header className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2945df] text-white shadow-lg shadow-blue-900/15">
              <GraduationCap size={23} />
            </span>
            <span className="text-2xl font-extrabold tracking-tight text-[#111c4b]">Student<span className="text-[#3455f4]">OS</span></span>
          </div>
          <span className="hidden text-[10px] font-bold tracking-[0.16em] text-slate-500 sm:block">YOUR ALL-IN-ONE STUDENT COMPANION</span>
        </header>

        <div className="relative z-10 mx-auto flex w-full max-w-[460px] flex-1 flex-col justify-center py-8">
          <div className="mb-5 lg:hidden">
            <img src="/login-student-hero.webp" alt="StudentOS student workspace illustration" className="h-44 w-full rounded-2xl object-cover object-center shadow-md" />
          </div>

          <form onSubmit={handleSubmit} noValidate className="rounded-[28px] border border-white bg-white/90 p-6 shadow-[0_24px_80px_rgba(42,55,135,0.13)] backdrop-blur-xl sm:p-8">
            <div className="mb-6">
              <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">
                <GraduationCap size={14} /> Welcome back to StudentOS
              </span>
              <h1 className="text-3xl font-extrabold tracking-tight text-[#111b49] sm:text-[34px]">Sign in to your student workspace</h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">Manage academics, placements, coding, wellness and more — all in one place.</p>
            </div>

            {error && <div role="alert" className="mb-5 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm leading-relaxed text-rose-700"><AlertCircle size={16} className="mt-0.5 shrink-0" />{error}</div>}

            <div className="space-y-4">
              <div>
                <label htmlFor="login-email" className="mb-1.5 block text-sm font-semibold text-slate-800">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(event) => { setEmail(event.target.value); if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined })) }}
                    disabled={loading}
                    required
                    autoComplete="email"
                    aria-invalid={Boolean(fieldErrors.email)}
                    className={`w-full rounded-xl border bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 ${fieldErrors.email ? 'border-rose-400' : 'border-slate-200'}`}
                    placeholder="you@college.edu"
                  />
                </div>
                {fieldErrors.email && <p className="mt-1.5 text-xs text-rose-600">{fieldErrors.email}</p>}
              </div>

              <div>
                <label htmlFor="login-password" className="mb-1.5 block text-sm font-semibold text-slate-800">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => { setPassword(event.target.value); if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined })) }}
                    disabled={loading}
                    required
                    autoComplete="current-password"
                    aria-invalid={Boolean(fieldErrors.password)}
                    className={`w-full rounded-xl border bg-white py-3 pl-11 pr-12 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 ${fieldErrors.password ? 'border-rose-400' : 'border-slate-200'}`}
                    placeholder="Enter your password"
                  />
                  <button type="button" onClick={() => setShowPassword((value) => !value)} disabled={loading} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-700">
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                {fieldErrors.password && <p className="mt-1.5 text-xs text-rose-600">{fieldErrors.password}</p>}
              </div>

              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-sm font-semibold text-indigo-700 hover:text-indigo-900 hover:underline">Forgot password?</Link>
              </div>

              <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#3154eb] to-[#6539e8] py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60">
                {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : null}
                {loading ? 'Signing in…' : 'Sign in to StudentOS'}
              </button>
            </div>

            <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />or continue with<span className="h-px flex-1 bg-slate-200" />
            </div>

            {GOOGLE_CLIENT_ID ? (
              <div>
                <div ref={googleButtonRef} className="flex min-h-[44px] w-full justify-center" />
                {googleError && <p role="alert" className="mt-2 text-center text-xs text-rose-600">{googleError}</p>}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-center">
                <p className="text-sm font-semibold text-slate-700">Google sign-in</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">Add the same Google OAuth Client ID to the frontend and backend environment to enable this button.</p>
              </div>
            )}

            <p className="mt-6 text-center text-sm text-slate-600">New to StudentOS? <Link to="/register" className="font-bold text-indigo-700 hover:underline">Create an account</Link></p>
          </form>
        </div>

        <footer className="relative z-10 pb-1 text-center text-xs text-slate-400">© {new Date().getFullYear()} StudentOS · Plan, track, learn, prepare and grow.</footer>
      </section>

      <aside className="relative hidden min-h-screen overflow-hidden bg-[#e8eaff] lg:block">
        <img src="/login-student-hero.webp" alt="Student using a laptop with StudentOS learning and student-life tools" className="absolute inset-0 h-full w-full object-cover object-center" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-indigo-950/15 via-transparent to-white/10" />
        <div className="absolute bottom-8 left-8 right-8 rounded-2xl border border-white/70 bg-white/80 p-5 shadow-lg shadow-indigo-900/10 backdrop-blur-md">
          <p className="text-lg font-extrabold text-[#15204b]">Your student journey, connected.</p>
          <p className="mt-1 text-xs font-semibold text-slate-600">Academics · Placements · Coding · Productivity · Wellness · AI Copilot</p>
        </div>
      </aside>
    </main>
  )
}
