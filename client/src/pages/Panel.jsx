import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowRight, Bell, ChevronDown, LifeBuoy, Mail, Megaphone, MessageSquare, Rocket, Send, Star,
} from 'lucide-react'
import { api } from '../lib/api.js'
import { UPCOMING } from '../lib/release.js'

const faDate = (ts) =>
  new Date(ts).toLocaleDateString('fa-IR', { day: 'numeric', month: 'long', year: 'numeric' })

// ─── راه‌های ارتباطی پشتیبانی — این مقادیر را با اطلاعات واقعی جایگزین کنید ───
const SUPPORT_CHANNELS = [
  { icon: MessageSquare, label: 'تلگرام', value: 'آیدی عددی: 8561413993', href: 'tg://openmessage?user_id=8561413993' },
  { icon: Mail, label: 'ایمیل', value: 'support@example.com', href: 'mailto:support@example.com' },
  { icon: LifeBuoy, label: 'پاسخگویی', value: 'همه‌روزه ۹ تا ۲۱', href: null },
]

const FAQ = [
  { q: 'نمره‌ی آزمون چطور محاسبه می‌شود؟', a: 'درصد پاسخ‌های درست از کل سوالات. هر پاسخ درست ۱۰ امتیاز هم به حساب شما اضافه می‌کند.' },
  { q: 'استریک روزانه چیست؟', a: 'اگر هر روز حداقل یک آزمون کامل کنید، شمارنده‌ی روزهای متوالی شما یکی افزایش می‌یابد. یک روز جا بماند، از اول شروع می‌شود.' },
  { q: 'اشتراک چه مزیتی دارد؟', a: 'کوییز روزانه، آزمون‌های تک‌درس و اولین آزمون جامع رایگان است؛ اشتراک دسترسی نامحدود به همه آزمون‌های جامع و آزمون‌ساز می‌دهد.' },
]

function Stars({ value, onChange, size = 'size-6' }) {
  return (
    <span className="flex items-center gap-1" dir="ltr">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(i)}
          className={onChange ? 'active:scale-90 transition-transform' : 'pointer-events-none'}
        >
          <Star
            className={`${size} ${i <= value ? 'fill-indigo-400 text-indigo-400' : 'text-slate-300'}`}
          />
        </button>
      ))}
    </span>
  )
}

export default function Panel() {
  const nav = useNavigate()

  const [searchParams] = useSearchParams()
  const initialTab = ['news', 'feedback', 'support'].includes(searchParams.get('tab'))
    ? searchParams.get('tab')
    : 'news'
  const [tab, setTab] = useState(initialTab)
  const [news, setNews] = useState(null)
  const [mine, setMine] = useState(null)

  // فرم نظر
  const [rating, setRating] = useState(0)
  const [text, setText] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [openFaq, setOpenFaq] = useState(-1)

  const loadNews = () => api('/announcements').then((d) => setNews(d.list)).catch(() => setNews([]))
  const loadMine = () => api('/feedback/mine').then((d) => setMine(d.list)).catch(() => setMine([]))

  useEffect(() => {
    if (tab === 'news') loadNews()
    if (tab === 'feedback') loadMine()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  const sendFeedback = async (e) => {
    e.preventDefault()
    setMsg('')
    setBusy(true)
    try {
      await api('/feedback', { method: 'POST', body: { rating, text } })
      setText('')
      setRating(0)
      setMsg('نظر شما ثبت شد — ممنون از همراهیتان!')
      loadMine()
    } catch (err) {
      setMsg(err.message)
    } finally {
      setBusy(false)
    }
  }

  const TABS = [
    { id: 'news', label: 'اعلان‌ها', icon: Megaphone },
    { id: 'feedback', label: 'نظر شما', icon: Star },
    { id: 'support', label: 'پشتیبانی', icon: LifeBuoy },
  ]

  return (
    <div className="px-4 py-6 space-y-5 pb-10">
      <button onClick={() => nav('/')} className="on-photo flex items-center gap-1.5 text-sm hover:text-slate-800">
        <ArrowRight className="size-4" /> بازگشت
      </button>

      {/* title */}
      <div className="flex items-center gap-3 animate-pop">
        <span className="size-11 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-800 grid place-items-center shadow-lg shadow-indigo-500/25">
          <Bell className="size-5 text-white" />
        </span>
        <div>
          <h2 className="text-xl font-extrabold">اطلاع‌رسانی و پشتیبانی</h2>
          <p className="on-photo text-xs mt-0.5">اخبار نسخه‌های بعدی، نظرات و راه‌های ارتباطی</p>
        </div>
      </div>

      {/* tabs */}
      <div className={`grid gap-2 card p-1.5`} style={{ gridTemplateColumns: `repeat(${TABS.length}, 1fr)` }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              tab === t.id
                ? 'bg-gradient-to-l from-indigo-800 to-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <t.icon className="size-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── اعلان‌ها ─── */}
      {tab === 'news' && (
        <div className="space-y-3">
          {/* نسخه‌ی بعدی چه می‌آید؟ */}
          <div className="card p-4 border-indigo-200 bg-gradient-to-l from-indigo-500/10 to-transparent animate-pop">
            <div className="font-bold text-sm flex items-center gap-2 text-indigo-700">
              <Rocket className="size-4" /> نسخه‌ی بعدی چه می‌آید؟
            </div>
            <ul className="mt-2.5 space-y-1.5">
              {UPCOMING.map((u) => (
                <li key={u} className="text-xs text-slate-600 flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-indigo-500 shrink-0" />
                  {u}
                </li>
              ))}
            </ul>
          </div>

          {!news ? (
            <div className="space-y-2.5">{[1, 2].map((i) => <div key={i} className="skeleton h-20" />)}</div>
          ) : news.length === 0 ? (
            <div className="card p-8 text-center text-sm text-slate-500 animate-pop">
              <Megaphone className="size-8 mx-auto text-slate-300 mb-3" />
              هنوز اعلانی منتشر نشده — به‌زودی خبرهای نسخه‌ی بعدی اینجا می‌رسد.
            </div>
          ) : (
            news.map((a, i) => (
              <article key={a.id} className="card p-4 animate-pop" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-bold text-sm">{a.title}</h3>
                  <span className="text-[10px] text-slate-400 shrink-0">{faDate(a.createdAt)}</span>
                </div>
                <p className="text-sm text-slate-500 leading-7 mt-2 whitespace-pre-wrap">{a.body}</p>
              </article>
            ))
          )}
        </div>
      )}

      {/* ─── نظر شما ─── */}
      {tab === 'feedback' && (
        <div className="space-y-3">
          <form onSubmit={sendFeedback} className="card p-4 space-y-4 animate-pop">
            <div>
              <div className="font-bold text-sm">به اپ چه امتیازی می‌دهید؟</div>
              <div className="mt-2.5 flex justify-center">
                <Stars value={rating} onChange={setRating} />
              </div>
            </div>
            <textarea
              className="input min-h-28 resize-y"
              placeholder="نظر، پیشنهاد یا انتقاد شما…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              required
              minLength={3}
            />
            {msg && (
              <div className={`text-xs font-bold rounded-xl px-3.5 py-2.5 ${
                msg.includes('ممنون')
                  ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                  : 'text-rose-600 bg-rose-50 border border-rose-200'
              }`}>
                {msg}
              </div>
            )}
            <button className="btn-primary flex items-center justify-center gap-2" disabled={busy || text.trim().length < 3}>
              <Send className="size-4" />
              ارسال نظر
            </button>
          </form>

          {mine?.length > 0 && (
            <div className="space-y-2.5">
              <div className="text-xs font-bold text-slate-500">نظرهای قبلی شما</div>
              {mine.map((f) => (
                <div key={f.id} className="card p-4">
                  <div className="flex items-center justify-between">
                    <Stars value={f.rating} size="size-4" />
                    <span className="text-[10px] text-slate-400">{faDate(f.createdAt)}</span>
                  </div>
                  <p className="text-sm text-slate-600 leading-7 mt-2">{f.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── پشتیبانی ─── */}
      {tab === 'support' && (
        <div className="space-y-3">
          <div className="card p-5 text-center animate-pop">
            <span className="size-14 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-800 grid place-items-center shadow-lg shadow-indigo-500/25">
              <LifeBuoy className="size-7 text-white" />
            </span>
            <h3 className="font-bold mt-3">در کنار شما هستیم</h3>
            <p className="text-xs text-slate-500 leading-6 mt-1.5">
              برای گزارش مشکل، سوال درباره‌ی سوالات یا درخواست فیچر جدید از راه‌های زیر با ما در تماس باشید.
            </p>
          </div>

          {SUPPORT_CHANNELS.map((c) => {
            const inner = (
              <>
                <span className="size-10 rounded-xl bg-indigo-50 border border-indigo-100 grid place-items-center text-indigo-600">
                  <c.icon className="size-5" />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-bold">{c.label}</span>
                  <span className="block text-xs text-slate-500 mt-0.5" dir="ltr" style={{ textAlign: 'right' }}>{c.value}</span>
                </span>
              </>
            )
            return c.href ? (
              <a key={c.label} href={c.href} target="_blank" rel="noreferrer"
                className="card p-4 flex items-center gap-3 hover:border-indigo-300 transition-all animate-pop">
                {inner}
              </a>
            ) : (
              <div key={c.label} className="card p-4 flex items-center gap-3 animate-pop">{inner}</div>
            )
          })}

          <div className="pt-1">
            <div className="text-xs font-bold text-slate-500 mb-2.5">سوالات پرتکرار</div>
            <div className="space-y-2.5">
              {FAQ.map((f, i) => (
                <div key={i} className="card overflow-hidden animate-pop" style={{ animationDelay: `${i * 50}ms` }}>
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
                    className="w-full p-4 flex items-center justify-between text-right"
                  >
                    <span className="text-sm font-bold">{f.q}</span>
                    <ChevronDown className={`size-4 text-slate-400 shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                  </button>
                  {openFaq === i && (
                    <p className="px-4 pb-4 text-sm text-slate-500 leading-7">{f.a}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
