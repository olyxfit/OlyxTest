import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ClipboardCheck, LineChart, ListChecks } from 'lucide-react'
import { useAuth } from '../lib/auth.jsx'

const FEATURES = [
  { icon: ListChecks, label: 'بانک سوالات واقعی' },
  { icon: ClipboardCheck, label: 'آزمون جامع و تک‌درس' },
  { icon: LineChart, label: 'پیگیری پیشرفت' },
]

// کلیپ‌های کوتاه ورزش و مطالعه — هر ۲.۵ ثانیه با کراس‌فید عوض می‌شوند
const CLIPS = [
  '/assets/welcome/clip-1.mp4',
  '/assets/welcome/clip-2.mp4',
  '/assets/welcome/clip-3.mp4',
  '/assets/welcome/clip-4.mp4',
  '/assets/welcome/clip-5.mp4',
  '/assets/welcome/clip-6.mp4',
]
const CLIP_MS = 2500

function VideoBackground() {
  const [active, setActive] = useState(0)
  const refs = useRef([])

  useEffect(() => {
    const timer = setInterval(() => setActive((a) => (a + 1) % CLIPS.length), CLIP_MS)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    refs.current.forEach((v, i) => {
      if (!v) return
      if (i === active) {
        v.currentTime = 0
        v.play().catch(() => {})
      } else {
        v.pause()
      }
    })
  }, [active])

  return (
    <div className="absolute inset-0 overflow-hidden bg-slate-950" aria-hidden="true">
      <img
        src="/assets/gym-bg-poster.webp"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
      />
      {CLIPS.map((src, i) => (
        <video
          key={src}
          ref={(el) => (refs.current[i] = el)}
          src={src}
          muted
          playsInline
          preload="auto"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
            i === active ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ))}
    </div>
  )
}

export default function Welcome() {
  const nav = useNavigate()
  const { user } = useAuth()

  return (
    <div className="min-h-dvh relative overflow-hidden bg-slate-950">
      <VideoBackground />
      {/* لایه تیره برای خوانایی متن */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/40 to-slate-950/95" />
      <div className="absolute inset-0 bg-[radial-gradient(70%_45%_at_50%_0%,rgba(0,200,253,0.18),transparent_70%)]" />

      <div className="relative z-10 min-h-dvh max-w-lg mx-auto flex flex-col items-center justify-between text-center px-6 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
        {/* لوگو الیکس */}
        <div className="relative grid place-items-center animate-pop">
          <div className="absolute inset-[-30%] rounded-full bg-[radial-gradient(circle,rgba(0,200,253,0.30),transparent_65%)] animate-pulse" />
          <img
            src="/assets/olyx-logo.svg"
            alt="Olyx"
            className="relative size-28 sm:size-32 drop-shadow-[0_10px_36px_rgba(0,200,253,0.55)] animate-float"
          />
        </div>

        {/* عنوان */}
        <div className="flex flex-col items-center gap-5 animate-pop" style={{ animationDelay: '80ms' }}>
          <h1 dir="ltr" className="text-4xl sm:text-5xl font-black tracking-tight text-white drop-shadow-[0_4px_30px_rgba(0,0,0,0.7)]">
            Olyx<span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-300">Test</span>
          </h1>
          <p className="max-w-sm text-slate-300 leading-7 text-sm sm:text-base">
            بانک کامل سوالات آزمون مربیگری بدنسازی و فیتنس — آزمون جامع و تک‌درس، پاسخ تشریحی هر سوال و تحلیل پیشرفت، همه در یک اپ.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {FEATURES.map((f) => (
              <span
                key={f.label}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/15 bg-white/10 backdrop-blur text-xs font-bold text-white"
              >
                <f.icon className="size-3.5 text-cyan-300" />
                {f.label}
              </span>
            ))}
          </div>
        </div>

        {/* دکمه شروع */}
        <div className="w-full space-y-3 animate-pop" style={{ animationDelay: '160ms' }}>
          <button
            onClick={() => nav(user ? '/' : '/auth')}
            className="w-full py-4 rounded-2xl font-extrabold text-base text-slate-950
              bg-gradient-to-l from-cyan-300 via-sky-400 to-blue-500
              shadow-[0_12px_40px_-8px_rgba(0,200,253,0.55)]
              hover:brightness-110 active:scale-[0.98] transition-all
              flex items-center justify-center gap-2"
          >
            {user ? 'ورود به اپلیکیشن' : 'شروع کنید'}
            <ArrowLeft className="size-5" strokeWidth={2.5} />
          </button>
          <p className="text-sm text-slate-300">آمادگی برای آزمون مربیگری درجه ۳ • پرورش اندام و فیتنس</p>
        </div>
      </div>
    </div>
  )
}
