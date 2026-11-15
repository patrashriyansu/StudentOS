import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Code2,
  HeartPulse,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react'

const features = [
  {
    icon: CalendarDays,
    title: 'Academic planning',
    description: 'Keep your timetable, attendance, exam schedule, SGPA and CGPA tools together.',
  },
  {
    icon: Code2,
    title: 'Coding practice',
    description: 'Track coding progress, build a DSA routine and stay consistent with daily challenges.',
  },
  {
    icon: Briefcase,
    title: 'Placement preparation',
    description: 'Organize resume work, interview practice and internship preparation in one place.',
  },
  {
    icon: Sparkles,
    title: 'AI study assistant',
    description: 'Get help understanding concepts, working through doubts and preparing for exams.',
  },
  {
    icon: HeartPulse,
    title: 'Student wellness',
    description: 'Build healthier routines with tools for mood, sleep, water and mindful breaks.',
  },
  {
    icon: TrendingUp,
    title: 'Everyday productivity',
    description: 'Bring tasks, goals, reminders, projects and personal progress into one workspace.',
  },
]

const steps = [
  {
    number: '01',
    title: 'Create your workspace',
    description: 'Sign up and set up your StudentOS account.',
  },
  {
    number: '02',
    title: 'Bring your student life together',
    description: 'Use the academic, coding, placement, wellness and productivity hubs.',
  },
  {
    number: '03',
    title: 'Review and keep improving',
    description: 'Check your progress and build a routine that works for you.',
  },
]

export default function Landing() {
  return (
    <main className="landing-page min-h-screen overflow-hidden bg-[#080d1c] text-white">
      <header className="relative z-10 border-b border-white/10 bg-[#080d1c]/85 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8 lg:px-10" aria-label="Main navigation">
          <Link to="/" className="flex items-center gap-2.5" aria-label="StudentOS home">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary shadow-lg shadow-primary/25">
              <BookOpen size={21} />
            </span>
            <span className="text-xl font-extrabold tracking-tight">Student<span className="text-[#8c83ff]">OS</span></span>
          </Link>

          <div className="hidden items-center gap-7 text-sm font-medium text-white/70 md:flex">
            <a href="#features" className="transition hover:text-white">Features</a>
            <a href="#how-it-works" className="transition hover:text-white">How it works</a>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/login" className="hidden rounded-xl px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white sm:inline-flex">
              Sign in
            </Link>
            <Link to="/register" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#11182d] shadow-lg shadow-white/10 transition hover:-translate-y-0.5 hover:bg-[#e9eaff]">
              Get started <ArrowRight size={16} />
            </Link>
          </div>
        </nav>
      </header>

      <section className="relative isolate">
        <div className="pointer-events-none absolute -left-44 -top-36 -z-10 h-[480px] w-[480px] rounded-full bg-primary/25 blur-[120px]" />
        <div className="pointer-events-none absolute right-[-8rem] top-24 -z-10 h-[420px] w-[420px] rounded-full bg-secondary/20 blur-[120px]" />
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-[1.08fr_0.92fr] lg:px-10 lg:py-28">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#8c83ff]/30 bg-[#6c63ff]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#b7b1ff]">
              <Sparkles size={14} /> Built for student life
            </div>
            <h1 className="max-w-3xl text-4xl font-black leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              Your student life.
              <span className="mt-2 block bg-gradient-to-r from-[#a69fff] via-[#b98aff] to-[#69dfff] bg-clip-text text-transparent">
                One organized workspace.
              </span>
            </h1>
            <p className="mt-7 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
              StudentOS brings academic planning, coding practice, placement preparation, AI study support, wellness and everyday productivity into one student workspace.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link to="/register" className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-secondary px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-primary/25 transition hover:-translate-y-0.5">
                Create your free account <ArrowRight size={17} />
              </Link>
              <Link to="/login" className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10">
                Sign in to StudentOS
              </Link>
            </div>
            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-400">
              <span className="inline-flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-400" /> One student workspace</span>
              <span className="inline-flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-400" /> Academic and career tools</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -inset-5 rounded-[2rem] bg-gradient-to-br from-primary/30 via-secondary/20 to-accent/20 blur-2xl" />
            <div className="relative rounded-[2rem] border border-white/15 bg-[#111a31]/90 p-5 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-7">
              <div className="flex items-center justify-between border-b border-white/10 pb-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">StudentOS workspace</p>
                  <h2 className="mt-1 text-xl font-bold">Your next step, clearer.</h2>
                </div>
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/20 text-[#b7b1ff]">
                  <Target size={22} />
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                {features.slice(0, 4).map(({ icon: Icon, title, description }) => (
                  <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-[#b9b3ff]">
                      <Icon size={18} />
                    </span>
                    <p className="text-sm font-bold text-white">{title}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.07] p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-300/10 text-emerald-300"><CheckCircle2 size={18} /></span>
                <div>
                  <p className="text-sm font-semibold text-emerald-100">One place to stay organized</p>
                  <p className="mt-0.5 text-xs text-slate-400">Plan, learn, build and review your progress.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="scroll-mt-20 border-y border-white/10 bg-white/[0.025]">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#aaa3ff]">One connected workspace</p>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">Tools for the parts of student life that matter.</h2>
            <p className="mt-4 leading-7 text-slate-400">Move between your studies, skills, career goals and daily routines without scattering your progress across multiple apps.</p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, description }) => (
              <article key={title} className="rounded-2xl border border-white/10 bg-[#111a31]/75 p-6 transition hover:-translate-y-1 hover:border-[#8c83ff]/40">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/25 to-secondary/20 text-[#b9b3ff]">
                  <Icon size={23} />
                </span>
                <h3 className="mt-5 text-lg font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-400">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-20">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#aaa3ff]">Get started</p>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">A simpler way to move forward.</h2>
              <p className="mt-4 leading-7 text-slate-400">Start with the tools you need today and build a more organized student routine over time.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {steps.map((step) => (
                <article key={step.number} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                  <p className="text-sm font-black tracking-[0.15em] text-[#a69fff]">{step.number}</p>
                  <h3 className="mt-4 font-bold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{step.description}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 pb-20 sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-7 rounded-[2rem] border border-[#9b92ff]/25 bg-gradient-to-r from-primary/20 via-secondary/15 to-accent/10 p-8 sm:p-10 lg:flex-row lg:items-center">
          <div>
            <p className="text-sm font-bold text-[#c4beff]">Make room for what matters</p>
            <h2 className="mt-2 max-w-2xl text-2xl font-extrabold sm:text-3xl">Bring your academic and personal goals into one workspace.</h2>
          </div>
          <Link to="/register" className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-[#11182d] transition hover:-translate-y-0.5">
            Get started <ArrowRight size={17} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 text-sm text-slate-500 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-10">
          <Link to="/" className="font-extrabold tracking-tight text-white">Student<span className="text-[#8c83ff]">OS</span></Link>
          <p>StudentOS — an academic, coding, career and productivity workspace for students.</p>
          <div className="flex gap-5 text-slate-300">
            <Link to="/login" className="transition hover:text-white">Sign in</Link>
            <Link to="/register" className="transition hover:text-white">Create account</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
