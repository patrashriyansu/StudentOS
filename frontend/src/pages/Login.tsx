import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { AlertCircle, Eye, EyeOff, GraduationCap, Lock, Mail, Loader2, ArrowRight } from 'lucide-react'
import { login, loginWithGoogle } from '../store/slices/authSlice'
import { AppDispatch, RootState } from '../store'

type GoogleCredentialResponse = { credential?: string }
type GoogleIdentity = {
  initialize: (config: { client_id: string; callback: (response: GoogleCredentialResponse) => void }) => void
  renderButton: (element: HTMLElement, config: {
    type: 'standard'
    theme: 'outline'
    size: 'large'
    text: 'continue_with'
    shape: 'rectangular'
    logo_alignment: 'left'
    width: number
  }) => void
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdentity } }
  }
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim()

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})
  const [googleLoading, setGoogleLoading] = useState(false)
  const [googleReady, setGoogleReady] = useState(false)
  const googleButtonRef = useRef<HTMLDivElement>(null)

  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { loading } = useSelector((state: RootState) => state.auth)

  useEffect(() => {
    if (!googleClientId) return

    let active = true
    const renderGoogleButton = () => {
      const google = window.google
      const host = googleButtonRef.current
      if (!active || !google || !host) return

      google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async ({ credential }) => {
          if (!credential) {
            setError('Google did not return a sign-in credential. Please try again.')
            return
          }
          setError('')
          setGoogleLoading(true)
          const result = await dispatch(loginWithGoogle({ idToken: credential }))
          setGoogleLoading(false)
          if (loginWithGoogle.fulfilled.match(result)) {
            navigate('/dashboard', { replace: true })
          } else {
            setError((result.payload as string) || 'Google sign-in failed. Please try again.')
          }
        },
      })
      host.replaceChildren()
      google.accounts.id.renderButton(host, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: Math.max(240, Math.min(380, Math.floor(host.clientWidth || 360))),
      })
      setGoogleReady(true)
    }

    let script = document.querySelector<HTMLScriptElement>('script[data-google-identity="true"]')
    const onLoad = () => renderGoogleButton()
    const onError = () => setError('Google sign-in could not load. Check your connection and try again.')
    if (!script) {
      script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.dataset.googleIdentity = 'true'
      document.head.appendChild(script)
    }
    script.addEventListener('load', onLoad)
    script.addEventListener('error', onError)
    if (window.google) renderGoogleButton()

    return () => {
      active = false
      script?.removeEventListener('load', onLoad)
      script?.removeEventListener('error', onError)
    }
  }, [dispatch, navigate])

  const validateFields = () => {
    const errors: typeof fieldErrors = {}
    const normalizedEmail = email.trim()
    if (!normalizedEmail) errors.email = 'Email is required.'
    else if (!emailPattern.test(normalizedEmail)) errors.email = 'Enter a valid email address.'
    if (!password) errors.password = 'Password is required.'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (loading || googleLoading || !validateFields()) return
    setError('')
    const result = await dispatch(login({ email: email.trim(), password }))
    if (login.fulfilled.match(result)) {
      navigate('/dashboard', { replace: true })
    } else {
      setError((result.payload as string) || 'Login failed. Please check your email and password.')
    }
  }

  const isBusy = loading || googleLoading

  return (
    <main className="min-h-screen flex flex-col lg:flex-row bg-[#f6f7ff] text-[#111936]">
      <section className="relative z-10 flex w-full items-center justify-center px-5 py-9 sm:px-8 lg:min-h-screen lg:w-[46%] lg:px-10 xl:px-16">
        <div className="w-full max-w-[440px]">
          <Link to="/login" className="mb-9 inline-flex items-center gap-3" aria-label="StudentOS home">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#3357ef] to-[#7157f5] text-white shadow-lg shadow-blue-500/20">
              <GraduationCap size={25} />
            </span>
            <span className="text-[25px] font-extrabold tracking-tight text-[#101b42]">Student<span className="text-[#4165f5]">OS</span></span>
          </Link>

          <div className="mb-7">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#5268df]">Your student workspace</p>
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-[38px]">
              Sign in to your <span className="text-[#4165f5]">StudentOS</span>
            </h1>
            <p className="mt-3 max-w-md text-sm leading-6 text-slate-600">
              Keep academics, placements, coding, wellness and everyday productivity together in one place.
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="rounded-[26px] border border-white bg-white/95 p-6 shadow-[0_24px_70px_rgba(51,74,153,0.12)] sm:p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-[#101b42]">Welcome back</h2>
              <p className="mt-1 text-sm text-slate-500">Enter your account details to continue.</p>
            </div>

            {error && (
              <div role="alert" className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm leading-5 text-red-700">
                <AlertCircle size={17} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="mb-4">
              <label htmlFor="login-email" className="mb-2 block text-sm font-semibold text-slate-700">Email address</label>
              <div className={`flex items-center gap-3 rounded-xl border bg-white px-3.5 transition focus-within:border-[#5268ef] focus-within:ring-4 focus-within:ring-blue-100 ${fieldErrors.email ? 'border-red-300' : 'border-slate-200'}`}>
                <Mail size={18} className="shrink-0 text-slate-400" />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(event) => { setEmail(event.target.value); setFieldErrors((previous) => ({ ...previous, email: undefined })) }}
                  disabled={isBusy}
                  required
                  autoComplete="email"
                  placeholder="you@college.edu"
                  className="h-12 min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>
              {fieldErrors.email && <p className="mt-1.5 text-xs text-red-600">{fieldErrors.email}</p>}
            </div>

            <div className="mb-3">
              <label htmlFor="login-password" className="mb-2 block text-sm font-semibold text-slate-700">Password</label>
              <div className={`flex items-center gap-3 rounded-xl border bg-white px-3.5 transition focus-within:border-[#5268ef] focus-within:ring-4 focus-within:ring-blue-100 ${fieldErrors.password ? 'border-red-300' : 'border-slate-200'}`}>
                <Lock size={18} className="shrink-0 text-slate-400" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => { setPassword(event.target.value); setFieldErrors((previous) => ({ ...previous, password: undefined })) }}
                  disabled={isBusy}
                  required
                  autoComplete="current-password"
                  placeholder="Your password"
                  className="h-12 min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
                <button type="button" onClick={() => setShowPassword((value) => !value)} disabled={isBusy} aria-label={showPassword ? 'Hide password' : 'Show password'} className="p-1 text-slate-400 hover:text-slate-700">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {fieldErrors.password && <p className="mt-1.5 text-xs text-red-600">{fieldErrors.password}</p>}
            </div>

            <div className="mb-5 flex justify-end">
              <Link to="/forgot-password" className="text-sm font-semibold text-[#405fe8] hover:underline">Forgot password?</Link>
            </div>

            <button type="submit" disabled={isBusy} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#3158ed] to-[#654cf0] text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? <Loader2 size={18} className="animate-spin" /> : <>Sign in <ArrowRight size={18} /></>}
            </button>

            <div className="my-5 flex items-center gap-3 text-xs font-medium text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />
              OR CONTINUE WITH
              <span className="h-px flex-1 bg-slate-200" />
            </div>

            {googleClientId ? (
              <div className="relative min-h-11">
                <div ref={googleButtonRef} className="flex min-h-11 justify-center [&>div]:max-w-full" />
                {!googleReady && (
                  <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-500">
                    <Loader2 size={16} className="animate-spin" /> Loading Google sign-in…
                  </div>
                )}
                {googleLoading && <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-xl bg-white/90 text-sm font-medium text-slate-700"><Loader2 size={16} className="animate-spin" /> Signing in with Google…</div>}
              </div>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-center text-xs leading-5 text-amber-800">
                Google sign-in needs setup: add <code>VITE_GOOGLE_CLIENT_ID</code> in Vercel.
              </div>
            )}

            <p className="mt-6 text-center text-sm text-slate-500">
              New to StudentOS?{' '}
              <Link to="/register" className="font-bold text-[#405fe8] hover:underline">Create an account</Link>
            </p>
          </form>

          <p className="mt-6 text-center text-xs text-slate-400">© {new Date().getFullYear()} StudentOS · Your all-in-one student companion</p>
        </div>
      </section>

      <section className="relative hidden min-h-screen flex-1 overflow-hidden bg-[#e9edff] lg:block" aria-label="StudentOS features">
        <img
          src="/images/studentos-campus-hero.webp"
          alt="Student on campus with StudentOS academic, coding, placement, productivity, wellness and AI tools"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#f6f7ff]/10 via-transparent to-[#dfe6ff]/10" />
        <div className="absolute bottom-7 right-8 rounded-full border border-white/70 bg-white/70 px-4 py-2 text-xs font-semibold tracking-wide text-slate-600 shadow-sm backdrop-blur">
          Plan · Track · Learn · Prepare · Grow
        </div>
      </section>
    </main>
  )
}
