import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import {
  AlertCircle, BookOpen, Briefcase, Code2, GraduationCap,
  HeartPulse, Loader2, Sparkles, TrendingUp,
} from 'lucide-react'
import { loginWithGoogle } from '../store/slices/authSlice'
import { AppDispatch } from '../store'

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

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim()

const features = [
  { icon: BookOpen, label: 'Academics', detail: 'Timetable · Attendance · SGPA', color: 'bg-blue-50 text-blue-600' },
  { icon: Code2, label: 'Coding', detail: 'LeetCode · Progress · Streak', color: 'bg-violet-50 text-violet-600' },
  { icon: Briefcase, label: 'Placements', detail: 'Applications · Interviews · Offers', color: 'bg-orange-50 text-orange-600' },
  { icon: TrendingUp, label: 'Productivity', detail: 'Tasks · Notes · Goals', color: 'bg-emerald-50 text-emerald-600' },
  { icon: HeartPulse, label: 'Wellness', detail: 'Mood · Habits · Support', color: 'bg-rose-50 text-rose-600' },
  { icon: Sparkles, label: 'AI Tools', detail: 'Study · Resume · Prep', color: 'bg-purple-50 text-purple-600' },
]

export default function Login() {
  const [error, setError] = useState('')
  const [googleLoading, setGoogleLoading] = useState(false)
  const [googleReady, setGoogleReady] = useState(false)
  const googleButtonRef = useRef<HTMLDivElement>(null)
  const googleLoadingRef = useRef(false)
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()

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
          if (googleLoadingRef.current) return
          if (!credential) {
            setError('Google did not return a sign-in credential. Please try again.')
            return
          }
          googleLoadingRef.current = true
          setError('')
          setGoogleLoading(true)
          try {
            const result = await dispatch(loginWithGoogle({ idToken: credential }))
            if (loginWithGoogle.fulfilled.match(result)) {
              navigate('/dashboard', { replace: true })
            } else {
              setError((result.payload as string) || 'Google sign-in failed. Please try again.')
            }
          } finally {
            googleLoadingRef.current = false
            setGoogleLoading(false)
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
        width: Math.max(260, Math.min(420, Math.floor(host.clientWidth || 360))),
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

  const focusGoogle = () => {
    googleButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <main id="home" className="min-h-screen overflow-hidden bg-[#f4f5ff] text-[#101943]">
      <header className="relative z-20 flex h-[76px] items-center justify-between border-b border-white/70 bg-white/60 px-5 backdrop-blur-md sm:px-8 lg:px-[4%]">
        <Link to="/login" className="inline-flex items-center gap-2.5" aria-label="StudentOS home">
          <GraduationCap size={39} strokeWidth={2.1} className="text-[#111b48]" />
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
            onClick={focusGoogle}
            className="rounded-xl bg-gradient-to-r from-[#3158ed] to-[#263bd7] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition hover:-translate-y-0.5"
          >
            Get Started
          </button>
        </nav>
        <button
          type="button"
          onClick={focusGoogle}
          className="rounded-xl bg-gradient-to-r from-[#3158ed] to-[#263bd7] px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/20 md:hidden"
        >
          Get Started
        </button>
      </header>

      <div className="relative grid min-h-[calc(100vh-76px)] grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(430px,40%)]">
        <section id="features" className="relative min-h-[690px] overflow-hidden px-5 py-12 sm:px-9 lg:min-h-[calc(100vh-76px)] lg:px-10 xl:px-14">
          <div className="pointer-events-none absolute -left-24 top-12 h-80 w-80 rounded-full bg-[#d9e2ff]/70 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-[32%] h-80 w-80 rounded-full bg-[#e9dcff]/75 blur-3xl" />

          <div className="relative z-10 max-w-[610px]">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/65 px-4 py-2 text-sm font-semibold text-[#14265e] shadow-sm backdrop-blur">
              <GraduationCap size={19} className="text-[#174be9]" />
              Your All-in-One Student Companion
            </div>
            <h1 className="max-w-[590px] text-4xl font-extrabold leading-[1.12] tracking-tight text-[#101943] sm:text-[46px] xl:text-[50px]">
              Manage Your Academic &amp; Career Journey in <span className="text-[#2453ed]">One Place</span>
            </h1>
            <p className="mt-6 max-w-[490px] text-base font-medium leading-7 text-[#1a2854] sm:text-lg">
              Academics · Placements · Coding · Wellness · Productivity · AI Tools
            </p>
          </div>

          <div className="relative z-10 mt-9 grid max-w-[600px] grid-cols-2 gap-3 sm:grid-cols-3 lg:mt-12">
            {features.map(({ icon: Icon, label, detail, color }) => (
              <div key={label} className="rounded-2xl border border-white/90 bg-white/65 p-3 shadow-[0_8px_24px_rgba(73,86,170,0.09)] backdrop-blur-md">
                <span className={`mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl ${color}`}>
                  <Icon size={19} />
                </span>
                <p className="text-sm font-bold text-[#111d4b]">{label}</p>
                <p className="mt-0.5 text-[10px] leading-4 text-[#536080]">{detail}</p>
              </div>
            ))}
          </div>

          <div className="pointer-events-none absolute bottom-0 right-0 z-[5] hidden h-[48%] w-[48%] md:block lg:h-[62%] lg:w-[58%] xl:h-[68%] xl:w-[62%]">
            <img
              src="/images/studentos-login-hero.webp"
              alt="Student holding a laptop"
              aria-hidden="true"
              className="h-full w-full object-contain object-bottom drop-shadow-xl"
            />
          </div>
        </section>

        <section id="about" className="relative flex items-center justify-center bg-gradient-to-br from-[#e8eaff] via-[#f4f3ff] to-[#dfe3ff] px-4 py-10 sm:px-8 lg:px-7">
          <div className="pointer-events-none absolute inset-0 bg-white/10" />
          <div className="relative z-10 w-full max-w-[520px] rounded-[30px] border border-white/90 bg-white/85 px-6 py-9 shadow-[0_24px_75px_rgba(77,83,165,0.16)] backdrop-blur-xl sm:px-9 sm:py-10 xl:px-10">
            <div className="mb-4 flex justify-center">
              <GraduationCap size={48} strokeWidth={2} className="text-[#111b48]" />
            </div>
            <h2 className="text-center text-3xl font-extrabold tracking-tight text-[#101943] sm:text-[36px]">
              Welcome to Student<span className="text-[#3158ed]">OS</span>
            </h2>
            <p className="mt-3 text-center text-sm leading-6 text-[#3d486b] sm:text-base">
              Sign in to continue to your student dashboard
            </p>

            {error && (
              <div role="alert" className="mt-7 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm leading-5 text-red-700">
                <AlertCircle size={17} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="mt-8">
              {googleClientId ? (
                <div className="relative min-h-[54px]">
                  <div ref={googleButtonRef} className="flex min-h-[54px] w-full justify-center overflow-hidden rounded-xl [&>div]:max-w-full" />
                  {!googleReady && (
                    <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-xl border border-[#d9deef] bg-white text-sm text-[#536080]">
                      <Loader2 size={16} className="animate-spin" /> Loading Google sign-in…
                    </div>
                  )}
                  {googleLoading && (
                    <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-xl bg-white/90 text-sm font-semibold text-[#24335f]">
                      <Loader2 size={17} className="animate-spin" /> Signing in with Google…
                    </div>
                  )}
                </div>
              ) : (
                <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm leading-6 text-amber-800">
                  Google sign-in is not configured. Please contact the StudentOS administrator.
                </div>
              )}
            </div>

            <div className="mt-7 flex items-center gap-3 text-sm text-[#17234d]">
              <span className="h-px flex-1 bg-[#d9deef]" />
              <span>Secure Google authentication</span>
              <span className="h-px flex-1 bg-[#d9deef]" />
            </div>
            <p className="mt-6 text-center text-sm leading-6 text-[#526080]">
              New to StudentOS? Your student account will be created automatically when you continue with Google.
            </p>
            <p className="mt-5 text-center text-xs text-[#77809a]">
              By continuing, you agree to use StudentOS responsibly and keep your Google account secure.
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
