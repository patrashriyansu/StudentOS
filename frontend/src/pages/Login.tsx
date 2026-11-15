import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  AlertCircle, ArrowRight, Eye, EyeOff, GraduationCap, Lock, Mail, Loader2,
} from 'lucide-react'
import { login, loginWithGoogle } from '../store/slices/authSlice'
import { AppDispatch, RootState } from '../store'

type GoogleCredentialResponse = { credential?: string }
type GoogleIdentity = {
  initialize: (config: {
    client_id: string
    callback: (response: GoogleCredentialResponse) => void
  }) => void
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
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})
  const [googleLoading, setGoogleLoading] = useState(false)
  const [googleReady, setGoogleReady] = useState(false)

  const emailInputRef = useRef<HTMLInputElement>(null)
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
          const result = await dispatch(loginWithGoogle({ idToken: credential, rememberMe }))
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
        width: Math.max(240, Math.min(420, Math.floor(host.clientWidth || 360))),
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
  }, [dispatch, navigate, rememberMe])

  const focusEmail = () => {
    emailInputRef.current?.focus()
    document.getElementById('login-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

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
    const result = await dispatch(login({ email: email.trim(), password, rememberMe }))
    if (login.fulfilled.match(result)) {
      navigate('/dashboard', { replace: true })
    } else {
      setError((result.payload as string) || 'Login failed. Please check your email and password.')
    }
  }

  const isBusy = loading || googleLoading

  return (
    <main id="home" className="min-h-screen overflow-hidden bg-[#f5f6ff] text-[#101943]">
      <header className="relative z-20 flex h-[76px] items-center justify-between border-b border-white/70 bg-white/55 px-5 backdrop-blur-sm sm:px-8 lg:px-[5.2%]">
        <Link to="/login" className="inline-flex items-center gap-2.5" aria-label="StudentOS home">
          <span className="flex h-10 w-10 items-center justify-center text-[#111b48]">
            <GraduationCap size={38} strokeWidth={2.1} />
          </span>
          <span className="text-[25px] font-extrabold tracking-tight text-[#101943]">
            Student<span className="text-[#3158ed]">OS</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-9 text-[15px] font-semibold text-[#17224b] md:flex" aria-label="Main navigation">
          <a href="#home" className="border-b-2 border-[#3158ed] pb-1 text-[#1745df]">Home</a>
          <a href="#features" className="pb-1 transition hover:text-[#3158ed]">Features</a>
          <a href="#about" className="pb-1 transition hover:text-[#3158ed]">About</a>
          <button
            type="button"
            onClick={focusEmail}
            className="rounded-xl bg-gradient-to-r from-[#3158ed] to-[#263bd7] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition hover:-translate-y-0.5 hover:shadow-xl"
          >
            Get Started
          </button>
        </nav>

        <button
          type="button"
          onClick={focusEmail}
          className="rounded-xl bg-gradient-to-r from-[#3158ed] to-[#263bd7] px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/20 md:hidden"
        >
          Get Started
        </button>
      </header>

      <div className="relative grid min-h-[calc(100vh-76px)] grid-cols-1 lg:grid-cols-[minmax(430px,38%)_minmax(0,62%)]">
        <div className="pointer-events-none absolute -left-28 top-16 hidden h-[450px] w-[450px] rounded-full bg-[#dcdfff]/70 blur-3xl lg:block" />
        <div className="pointer-events-none absolute -bottom-24 left-[28%] hidden h-[360px] w-[360px] rounded-full bg-[#e9dcff]/70 blur-3xl lg:block" />

        <section className="relative z-10 flex items-center justify-center px-4 py-8 sm:px-8 lg:px-8 xl:px-12">
          <div id="login-form" className="w-full max-w-[540px] rounded-[30px] border border-white/90 bg-white/85 p-6 shadow-[0_24px_75px_rgba(77,83,165,0.13)] backdrop-blur-xl sm:p-8 xl:p-9">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-[#eaf0ff] px-4 py-2 text-xs font-bold text-[#13265f] sm:text-sm">
              <GraduationCap size={18} className="text-[#204be9]" />
              <span>Welcome to Student<span className="text-[#3158ed]">OS</span></span>
            </div>

            <div id="about" className="mb-7">
              <h1 className="text-[30px] font-extrabold leading-[1.12] tracking-tight text-[#101943] sm:text-[36px]">
                Sign In to Your<br />
                Student <span className="text-[#3158ed]">Workspace</span>
              </h1>
              <p className="mt-4 max-w-[420px] text-sm leading-6 text-[#3d486b] sm:text-[15px]">
                Manage your academics, placements, coding, wellness and more — all in one place.
              </p>
            </div>

            {error && (
              <div role="alert" className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm leading-5 text-red-700">
                <AlertCircle size={17} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div>
                <label htmlFor="login-email" className="sr-only">University email</label>
                <div className={`flex h-[54px] items-center gap-3 rounded-xl border bg-white/90 px-4 transition focus-within:border-[#4566e9] focus-within:ring-4 focus-within:ring-blue-100 ${fieldErrors.email ? 'border-red-300' : 'border-[#dce0ef]'}`}>
                  <Mail size={20} className="shrink-0 text-[#17234d]" />
                  <input
                    ref={emailInputRef}
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(event) => { setEmail(event.target.value); setFieldErrors((previous) => ({ ...previous, email: undefined })) }}
                    disabled={isBusy}
                    required
                    autoComplete="email"
                    placeholder="Enter your university email"
                    className="h-full min-w-0 flex-1 bg-transparent text-sm text-[#152044] outline-none placeholder:text-[#68728e]"
                  />
                </div>
                {fieldErrors.email && <p className="mt-1.5 text-xs text-red-600">{fieldErrors.email}</p>}
              </div>

              <div>
                <label htmlFor="login-password" className="sr-only">Password</label>
                <div className={`flex h-[54px] items-center gap-3 rounded-xl border bg-white/90 px-4 transition focus-within:border-[#4566e9] focus-within:ring-4 focus-within:ring-blue-100 ${fieldErrors.password ? 'border-red-300' : 'border-[#dce0ef]'}`}>
                  <Lock size={20} className="shrink-0 text-[#17234d]" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => { setPassword(event.target.value); setFieldErrors((previous) => ({ ...previous, password: undefined })) }}
                    disabled={isBusy}
                    required
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className="h-full min-w-0 flex-1 bg-transparent text-sm text-[#152044] outline-none placeholder:text-[#68728e]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    disabled={isBusy}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="p-1 text-[#4c587b] transition hover:text-[#152044]"
                  >
                    {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </div>
                {fieldErrors.password && <p className="mt-1.5 text-xs text-red-600">{fieldErrors.password}</p>}
              </div>

              <div className="flex items-center justify-between gap-3 pt-0.5 text-sm">
                <label className="flex cursor-pointer items-center gap-2 font-medium text-[#18234b]">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    disabled={isBusy}
                    className="h-[18px] w-[18px] rounded border-[#9aa5c3] accent-[#3158ed]"
                  />
                  Remember me
                </label>
                <Link to="/forgot-password" className="font-semibold text-[#1646e5] hover:underline">Forgot password?</Link>
              </div>

              <button
                type="submit"
                disabled={isBusy}
                className="mt-1 flex h-[54px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#3158ed] to-[#1b2ecb] text-base font-bold text-white shadow-[0_9px_22px_rgba(49,88,237,0.22)] transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? <Loader2 size={19} className="animate-spin" /> : <>Sign In <ArrowRight size={19} /></>}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3 text-sm text-[#17234d]">
              <span className="h-px flex-1 bg-[#d9deef]" />
              Or continue with
              <span className="h-px flex-1 bg-[#d9deef]" />
            </div>

            {googleClientId ? (
              <div className="relative min-h-[48px]">
                <div ref={googleButtonRef} className="flex min-h-[48px] w-full justify-center overflow-hidden rounded-xl [&>div]:max-w-full" />
                {!googleReady && (
                  <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-xl border border-[#d9deef] bg-white text-sm text-[#536080]">
                    <Loader2 size={16} className="animate-spin" /> Loading Google sign-in…
                  </div>
                )}
                {googleLoading && (
                  <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-xl bg-white/90 text-sm font-semibold text-[#24335f]">
                    <Loader2 size={16} className="animate-spin" /> Signing in with Google…
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-center text-xs leading-5 text-amber-800">
                Google sign-in will be available after <code>VITE_GOOGLE_CLIENT_ID</code> is configured in Vercel.
              </div>
            )}

            <p className="mt-6 text-center text-sm text-[#273354]">
              New to StudentOS?{' '}
              <Link to="/register" className="font-bold text-[#1646e5] hover:underline">Create an account</Link>
            </p>
          </div>
        </section>

        <section id="features" className="relative hidden min-h-[calc(100vh-76px)] overflow-hidden bg-[#eceeff] lg:block" aria-label="StudentOS platform features">
          <img
            src="/images/studentos-login-hero.webp"
            alt="Student on campus surrounded by StudentOS feature cards for academics, coding, placements, productivity, wellness and AI"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
        </section>
      </div>
    </main>
  )
}
