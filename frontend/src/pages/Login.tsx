import { FormEvent, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import {
  AlertCircle, ArrowRight, Briefcase, CalendarDays, Code2, Eye, EyeOff,
  GraduationCap, HeartPulse, Loader2, Lock, Mail, Sparkles, TrendingUp,
} from 'lucide-react'
import { api } from '../services/api'
import { login, loginWithGoogle } from '../store/slices/authSlice'
import { AppDispatch } from '../store'

type GoogleCredentialResponse = { credential?: string }
type GoogleIdentity = {
  initialize: (config: {
    client_id: string
    callback: (response: GoogleCredentialResponse) => void
  }) => void
  renderButton: (element: HTMLElement, config: {
    type: 'icon'
    theme: 'outline'
    size: 'large'
    shape: 'square'
    logo_alignment: 'center'
  }) => void
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdentity } }
  }
}

type ProviderStatus = { google: boolean }

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim()
const defaultProviders: ProviderStatus = { google: false }


function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="h-7 w-7">
      <path fill="#FFC107" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.7c3.9-3.6 6-8.9 6-15Z" />
      <path fill="#4285F4" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.7-5.1c-1.8 1.2-4 2-6.8 2-5.2 0-9.6-3.5-11.2-8.2H5.9v5.2A20 20 0 0 0 24 44Z" />
      <path fill="#34A853" d="M12.8 27.8a12 12 0 0 1 0-7.6V15H5.9a20 20 0 0 0 0 18l6.9-5.2Z" />
      <path fill="#EA4335" d="M24 12c3 0 5.7 1 7.8 3.1l5.8-5.8A19.4 19.4 0 0 0 24 4 20 20 0 0 0 5.9 15l6.9 5.2C14.4 15.5 18.8 12 24 12Z" />
    </svg>
  )
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleReady, setGoogleReady] = useState(false)
  const [providers, setProviders] = useState<ProviderStatus>(defaultProviders)
  const googleButtonRef = useRef<HTMLDivElement>(null)
  const googleLoadingRef = useRef(false)
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()

  useEffect(() => {
    let active = true
    api.get('/auth/providers')
      .then(({ data }) => {
        if (active) setProviders({ google: Boolean(data?.google) })
      })
      .catch(() => {
        if (active) setProviders(defaultProviders)
      })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!googleClientId || !providers.google) return
    let active = true
    const renderGoogleButton = () => {
      const google = window.google
      const host = googleButtonRef.current
      if (!active || !google || !host) return
      google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async ({ credential }) => {
          if (googleLoadingRef.current) return
          if (!credential) {
            setError('Google did not return a sign-in credential. Please try again.')
            return
          }
          googleLoadingRef.current = true
          setError('')
          setLoading(true)
          try {
            const result = await dispatch(loginWithGoogle({ idToken: credential, rememberMe }))
            if (loginWithGoogle.fulfilled.match(result)) navigate('/dashboard', { replace: true })
            else setError((result.payload as string) || 'Google sign-in failed. Please try again.')
          } finally {
            googleLoadingRef.current = false
            setLoading(false)
          }
        },
      })
      host.replaceChildren()
      google.accounts.id.renderButton(host, {
        type: 'icon',
        theme: 'outline',
        size: 'large',
        shape: 'square',
        logo_alignment: 'center',
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
  }, [dispatch, navigate, providers.google, rememberMe])

  const handlePasswordLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (loading) return
    setError('')
    setLoading(true)
    try {
      const result = await dispatch(login({ email: email.trim(), password, rememberMe }))
      if (login.fulfilled.match(result)) navigate('/dashboard', { replace: true })
      else setError((result.payload as string) || 'Sign-in failed. Check your email and password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main id="home" className="relative min-h-screen overflow-hidden bg-[#f4f5ff] text-[#101943]">
      <div className="pointer-events-none absolute -left-40 -top-48 h-[560px] w-[760px] rounded-full bg-[#dfe3ff]/80 blur-3xl" />
      <div className="pointer-events-none absolute right-[16%] top-[18%] h-[520px] w-[520px] rounded-full bg-[#e7e4ff]/80 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-320px] left-[26%] h-[620px] w-[900px] rounded-full bg-[#fff0f3]/80 blur-3xl" />

      <header className="relative z-20 flex h-[78px] items-center justify-start border-b border-white/80 bg-white/55 px-5 backdrop-blur-xl sm:px-8 lg:px-[5.2%]">
        <Link to="/login" className="inline-flex items-center gap-2.5" aria-label="StudentOS home">
          <GraduationCap size={42} strokeWidth={2.1} className="text-[#111b48]" />
          <span className="text-[25px] font-extrabold tracking-tight text-[#101943]">
            Student<span className="text-[#3158ed]">OS</span>
          </span>
        </Link>
      </header>

      <div className="relative z-10 mx-auto grid min-h-[calc(100svh-78px)] max-w-[1780px] grid-cols-1 items-center gap-5 px-4 py-8 sm:px-8 lg:grid-cols-[minmax(450px,0.88fr)_minmax(0,1.35fr)] lg:gap-0 lg:px-[5.1%] lg:py-0">
        <section id="about" className="relative z-10 flex items-center justify-center lg:justify-start lg:py-8">
          <div id="login-form" className="w-full max-w-[560px] rounded-[30px] border border-white/95 bg-white/85 px-6 py-7 shadow-[0_24px_75px_rgba(77,83,165,0.16)] backdrop-blur-2xl sm:px-9 sm:py-9 xl:px-11 xl:py-10">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-[#e8edff] px-4 py-2 text-sm font-bold text-[#14265e]">
              <GraduationCap size={19} className="text-[#174be9]" />
              Welcome to Student<span className="text-[#3158ed]">OS</span>
            </div>
            <h1 className="max-w-[470px] text-[34px] font-extrabold leading-[1.12] tracking-tight text-[#101943] sm:text-[40px] xl:text-[43px]">
              Sign In to Your Student <span className="text-[#2453ed]">Workspace</span>
            </h1>
            <p className="mt-4 max-w-[450px] text-[15px] font-medium leading-6 text-[#26345f] sm:text-base">
              Manage your academics, placements, coding, wellness and more — all in one place.
            </p>

            {error && (
              <div role="alert" className="mt-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm leading-5 text-red-700">
                <AlertCircle size={17} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handlePasswordLogin} className="mt-7 space-y-3.5">
              <label className="relative block">
                <span className="sr-only">University email</span>
                <Mail size={21} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#17234d]" />
                <input id="login-email" type="email" autoComplete="username" required value={email}
                  onChange={(event) => setEmail(event.target.value)} placeholder="Enter your university email"
                  className="h-[56px] w-full rounded-xl border border-[#d6dced] bg-white/75 pl-14 pr-4 text-[15px] text-[#101943] outline-none transition placeholder:text-[#536080] focus:border-[#3158ed] focus:ring-2 focus:ring-[#3158ed]/15" />
              </label>

              <label className="relative block">
                <span className="sr-only">Password</span>
                <Lock size={21} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#17234d]" />
                <input type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password}
                  onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password"
                  className="h-[56px] w-full rounded-xl border border-[#d6dced] bg-white/75 pl-14 pr-12 text-[15px] text-[#101943] outline-none transition placeholder:text-[#536080] focus:border-[#3158ed] focus:ring-2 focus:ring-[#3158ed]/15" />
                <button type="button" onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#536080] hover:text-[#17234d]">
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </label>

              <div className="flex items-center justify-between gap-3 pt-1 text-sm">
                <label className="inline-flex cursor-pointer items-center gap-2 text-[#17234d]">
                  <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)}
                    className="h-[18px] w-[18px] rounded border-[#aeb9d2] accent-[#3158ed]" />
                  Remember me
                </label>
                <Link to="/forgot-password" className="font-semibold text-[#1745df] hover:underline">Forgot password?</Link>
              </div>

              <button type="submit" disabled={loading}
                className="mt-1 flex h-[54px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#3158ed] to-[#263bd7] text-base font-bold text-white shadow-lg shadow-blue-500/20 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-wait disabled:opacity-70">
                {loading ? <Loader2 size={19} className="animate-spin" /> : <>Sign In <ArrowRight size={19} /></>}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3 text-sm text-[#17234d]">
              <span className="h-px flex-1 bg-[#d9deef]" />
              <span>Or continue with</span>
              <span className="h-px flex-1 bg-[#d9deef]" />
            </div>

            <div className="flex items-center justify-center gap-3">
              <div className="relative flex h-[56px] w-[112px] items-center justify-center overflow-hidden rounded-2xl border border-[#dfe4f2] bg-white/80 shadow-sm">
                {providers.google && googleClientId ? (
                  <>
                    <div ref={googleButtonRef} className="absolute inset-0 flex items-center justify-center overflow-hidden" />
                    {!googleReady && <div className="pointer-events-none absolute inset-0 flex items-center justify-center"><GoogleMark /></div>}
                  </>
                ) : (
                  <button type="button" onClick={() => setError('Google sign-in is not configured yet.')} aria-label="Google sign-in unavailable" title="Google sign-in unavailable" className="flex h-full w-full items-center justify-center">
                    <GoogleMark />
                  </button>
                )}
              </div>

              
            </div>

            <p className="mt-5 text-center text-sm text-[#26345f]">
              New to StudentOS? <Link to="/register" className="font-bold text-[#1745df] hover:underline">Create an account</Link>
            </p>
          </div>
        </section>

        <section id="features" className="relative hidden min-h-[690px] items-end justify-center lg:flex lg:min-h-[calc(100svh-78px)]">
          <div className="pointer-events-none absolute left-[18%] top-[14%] h-[560px] w-[560px] rounded-full border-[7px] border-[#d9defa]/60" />
          <div className="pointer-events-none absolute left-[24%] top-[20%] h-[450px] w-[450px] rounded-full border border-white/90" />
          <div className="pointer-events-none absolute bottom-[4%] left-[20%] h-[220px] w-[540px] rounded-full bg-[#fff0e9]/60 blur-3xl" />

          <img src="/images/studentos-login-hero.webp" alt="Student holding a laptop"
            className="pointer-events-none relative z-[2] h-[82%] max-h-[820px] w-full object-contain object-bottom drop-shadow-[0_24px_36px_rgba(39,50,99,0.18)]" />

          <div className="absolute left-[31%] top-[5%] z-[4] rounded-[25px] border border-white/90 bg-white/75 px-5 py-4 shadow-[0_12px_30px_rgba(73,86,170,0.12)] backdrop-blur-xl">
            <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><CalendarDays size={29} /></span><div><p className="font-extrabold text-[#111d4b]">Academics</p><p className="text-xs text-[#536080]">Timetable · Attendance · SGPA</p></div></div>
          </div>
          <div className="absolute left-[2%] top-[20%] z-[4] rounded-[25px] border border-white/90 bg-white/75 px-5 py-4 shadow-[0_12px_30px_rgba(73,86,170,0.12)] backdrop-blur-xl">
            <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><Code2 size={29} /></span><div><p className="font-extrabold text-[#111d4b]">Coding</p><p className="text-xs text-[#536080]">LeetCode · Progress · Streak</p></div></div>
          </div>
          <div className="absolute right-[2%] top-[13%] z-[4] rounded-[25px] border border-white/90 bg-white/75 px-5 py-4 shadow-[0_12px_30px_rgba(73,86,170,0.12)] backdrop-blur-xl">
            <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><TrendingUp size={29} /></span><div><p className="font-extrabold text-[#111d4b]">Productivity</p><p className="text-xs text-[#536080]">Tasks · Notes · Goals</p></div></div>
          </div>
          <div className="absolute left-[-1%] top-[48%] z-[4] rounded-[25px] border border-white/90 bg-white/75 px-5 py-4 shadow-[0_12px_30px_rgba(73,86,170,0.12)] backdrop-blur-xl">
            <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-500"><Briefcase size={29} /></span><div><p className="font-extrabold text-[#111d4b]">Placements</p><p className="text-xs text-[#536080]">Applications · Interviews · Offers</p></div></div>
          </div>
          <div className="absolute right-[-1%] top-[40%] z-[4] rounded-[25px] border border-white/90 bg-white/75 px-5 py-4 shadow-[0_12px_30px_rgba(73,86,170,0.12)] backdrop-blur-xl">
            <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-500"><HeartPulse size={29} /></span><div><p className="font-extrabold text-[#111d4b]">Wellness</p><p className="text-xs text-[#536080]">Mood · Habits · Support</p></div></div>
          </div>
          <div className="absolute right-[1%] top-[63%] z-[4] rounded-[25px] border border-white/90 bg-white/75 px-5 py-4 shadow-[0_12px_30px_rgba(73,86,170,0.12)] backdrop-blur-xl">
            <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-500"><Sparkles size={29} /></span><div><p className="font-extrabold text-[#111d4b]">AI Tools</p><p className="text-xs text-[#536080]">Study · Resume · Prep</p></div></div>
          </div>
        </section>
      </div>
    </main>
  )
}
