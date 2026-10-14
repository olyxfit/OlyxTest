import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, AtSign, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { useAuth } from '../lib/auth.jsx'

// پس‌زمینه لندینگ — تصاویر لوکال باشگاه (داخل APK) با کراس‌فید آرام
const BG_IMAGES = ['/assets/bg/bg-2.jpg', '/assets/bg/bg-3.jpg', '/assets/bg/bg-1.jpg']

function ImageBackground() {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    BG_IMAGES.forEach((src) => {
      const img = new Image()
      img.src = src
    })
    const t = setInterval(() => setIdx((i) => (i + 1) % BG_IMAGES.length), 8000)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="fixed inset-0 overflow-hidden bg-slate-950" aria-hidden>
      {BG_IMAGES.map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          className={`absolute -inset-6 w-[calc(100%+3rem)] h-[calc(100%+3rem)] object-cover transition-opacity duration-[2000ms] ${
            i === idx ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ filter: 'saturate(0.85) contrast(1.05)' }}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/85 via-slate-950/55 to-indigo-950/90" />
      <div className="absolute inset-0 bg-[radial-gradient(80%_50%_at_50%_0%,rgba(99,102,241,0.18),transparent_70%)]" />
    </div>
  )
}

export default function Auth() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [signup, setSignup] = useState(false)
  const { login, register } = useAuth()
  const nav = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const id = username.replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).trim()
      // ثبت‌نام با نام کاربری تکراری سمت سرور به ورود تبدیل می‌شود (نام جدید هم اعمال می‌شود)
      if (signup) await register(name, id, password)
      else await login(id, password)
      nav('/', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-dvh relative">
      <ImageBackground />
      <div className="relative min-h-dvh max-w-lg mx-auto flex flex-col justify-center px-4 sm:px-6 py-8">
        <div className="bg-white/95 backdrop-blur-2xl rounded-[2rem] border border-white/70 shadow-[0_1px_0_rgba(255,255,255,0.8)_inset,0_24px_70px_-20px_rgba(2,6,23,0.8)] p-6 sm:p-8">
        {/* hero */}
        <div className="animate-pop text-center">
          <img
            src="/assets/olyx-logo.svg"
            alt="Olyx"
            className="size-16 mx-auto drop-shadow-[0_6px_22px_rgba(0,200,253,0.5)]"
          />
          <p dir="ltr" className="mt-3 text-lg font-black tracking-tight text-slate-800">
            Olyx<span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-cyan-400">Test</span>
          </p>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-800">
            آمادگی آزمون
            <br />
            <span className="text-indigo-600">مربیگری بدنسازی</span>
          </h1>
          <p className="mt-3 text-slate-500 leading-7">
            تمرین با بانک کامل سوالات تغذیه، تمرین، فیزیولوژی، طراحی تمرین، سیستم تمرینی و داوری — منطبق بر آزمون کتبی تخصصی مربیگری، با پاسخ تشریحی
          </p>
        </div>

        <form onSubmit={submit} className="mt-10 space-y-4 animate-pop" style={{ animationDelay: '60ms' }}>
          {signup && (
            <div className="relative">
              <User className="absolute right-4 top-1/2 -translate-y-1/2 size-5 text-slate-500" />
              <input
                className="input pr-12"
                placeholder="نام و نام خانوادگی"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}
          <div className="relative">
            <AtSign className="absolute right-4 top-1/2 -translate-y-1/2 size-5 text-slate-500" />
            <input
              className="input pr-12"
              placeholder="نام کاربری"
              dir="ltr"
              style={{ textAlign: 'right' }}
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus={!signup}
            />
          </div>
          <div className="relative">
            <Lock className="absolute right-4 top-1/2 -translate-y-1/2 size-5 text-slate-500" />
            <input
              className="input pr-12 pl-12"
              type={showPass ? 'text' : 'password'}
              placeholder="رمز عبور"
              autoComplete={signup ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPass ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
            </button>
          </div>

          {error && (
            <div className="text-sm text-rose-600 bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <button className="btn-primary flex items-center justify-center gap-2" disabled={busy}>
            {busy ? 'لطفاً صبر کنید…' : signup ? 'ثبت‌نام / ورود' : 'ورود'}
            {!busy && <ArrowLeft className="size-4" />}
          </button>

          <button
            type="button"
            onClick={() => { setSignup(!signup); setError('') }}
            className="w-full text-center text-sm text-indigo-600 hover:text-indigo-700"
          >
            {signup ? 'حساب دارید؟ ورود' : 'حساب ندارید؟ ثبت‌نام'}
          </button>
        </form>

        </div>

      <p className="absolute bottom-4 inset-x-0 text-center text-xs text-slate-300">
        آمادگی برای آزمون مربیگری درجه ۳ • پرورش اندام و فیتنس
      </p>
      </div>
    </div>
  )
}
