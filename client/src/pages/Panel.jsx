import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowRight, ChevronDown, LifeBuoy, Mail, Megaphone, MessageSquare, Pencil, Send, Star, Trash2, X,
} from 'lucide-react'
import { api } from '../lib/api.js'

const faDate = (ts) =>
  new Date(ts).toLocaleDateString('fa-IR', { day: 'numeric', month: 'long', year: 'numeric' })

const SUPPORT_CHANNELS = [
  { icon: MessageSquare, label: 'تلگرام', value: '@olyxfit_support', href: 'https://t.me/olyxfit_support' },
  { icon: Mail, label: 'ایمیل', value: 'olyx.fit@gmail.com', href: 'mailto:olyx.fit@gmail.com' },
  { icon: LifeBuoy, label: 'پاسخگویی', value: 'همه‌روزه ۹ تا ۲۱', href: null },
]

const FAQ = [
  { q: 'نمره‌ی آزمون چطور محاسبه می‌شود؟', a: 'درصد پاسخ‌های درست از کل سوالات. هر پاسخ درست ۱۰ XP هم به حساب شما اضافه می‌کند.' },
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
  const [mine, setMine] = useState(null)
  const [news, setNews] = useState(null)

  // فرم نظر
  const [rating, setRating] = useState(0)
  const [text, setText] = useState('')
  const [editing, setEditing] = useState(null)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [openFaq, setOpenFaq] = useState(-1)

  const loadMine = () => api('/feedback/mine').then((d) => setMine(d.list)).catch(() => setMine([]))
  const loadNews = () => api('/announcements').then((d) => setNews(d.list)).catch(() => setNews([]))

  useEffect(() => {
    if (tab === 'feedback') loadMine()
    if (tab === 'news') loadNews()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  const sendFeedback = async (e) => {
    e.preventDefault()
    setMsg('')
    setBusy(true)
    try {
      if (editing) {
        await api(`/feedback/${editing.id}`, { method: 'PUT', body: { rating, text } })
        setMsg('نظر شما ویرایش شد')
      } else {
        await api('/feedback', { method: 'POST', body: { rating, text } })
        setMsg('نظر شما ثبت شد — ممنون از همراهیتان!')
      }
      setText('')
      setRating(0)
      setEditing(null)
      loadMine()
    } catch (err) {
      setMsg(err.message)
    } finally {
      setBusy(false)
    }
  }

  const startEdit = (f) => {
    setEditing(f)
    setRating(f.rating)
    setText(f.text)
    setMsg('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelEdit = () => {
    setEditing(null)
    setText('')
    setRating(0)
    setMsg('')
  }

  const removeFeedback = async (f) => {
    if (!window.confirm('این نظر حذف شود؟')) return
    try {
      await api(`/feedback/${f.id}`, { method: 'DELETE' })
      if (editing?.id === f.id) cancelEdit()
      loadMine()
    } catch (err) {
      setMsg(err.message)
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
          <LifeBuoy className="size-5 text-white" />
        </span>
        <div>
          <h2 className="text-xl font-extrabold">نظرات و پشتیبانی</h2>
          <p className="on-photo text-xs mt-0.5">نظر شما درباره‌ی اپ و راه‌های ارتباطی با ما</p>
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
        <div className="space-y-2.5">
          {!news ? (
            <div className="card p-4 space-y-3"><div className="skeleton h-10" /><div className="skeleton h-10" /></div>
          ) : news.length === 0 ? (
            <p className="card p-6 text-xs text-slate-500 text-center animate-pop">فعلاً اعلانی منتشر نشده است.</p>
          ) : (
            news.map((a, i) => (
              <div key={a.id} className="card p-4 animate-pop" style={{ animationDelay: `${Math.min(i * 50, 300)}ms` }}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold flex items-center gap-1.5">
                    <Megaphone className="size-4 text-indigo-600" /> {a.title}
                  </span>
                  <span className="text-[10px] text-slate-400 shrink-0">{faDate(a.createdAt)}</span>
                </div>
                <p className="text-sm text-slate-600 leading-7 mt-2 whitespace-pre-line">{a.body}</p>
              </div>
            ))
          )}
        </div>
      )}

      {/* ─── نظر شما ─── */}
      {tab === 'feedback' && (
        <div className="space-y-3">
          <form onSubmit={sendFeedback} className="card p-4 space-y-4 animate-pop">
            {editing && (
              <div className="flex items-center justify-between rounded-xl bg-indigo-50 border border-indigo-100 px-3.5 py-2.5 text-xs font-bold text-indigo-700">
                در حال ویرایش نظر قبلی
                <button type="button" onClick={cancelEdit} className="flex items-center gap-1 text-indigo-400 hover:text-indigo-600">
                  <X className="size-3.5" /> انصراف
                </button>
              </div>
            )}
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
                msg.includes('ممنون') || msg.includes('ویرایش شد')
                  ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                  : 'text-rose-600 bg-rose-50 border border-rose-200'
              }`}>
                {msg}
              </div>
            )}
            <button className="btn-primary flex items-center justify-center gap-2" disabled={busy || text.trim().length < 3}>
              <Send className="size-4" />
              {editing ? 'ویرایش نظر' : 'ارسال نظر'}
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
                  <div className="flex gap-1.5 mt-3 pt-2.5 border-t border-slate-100">
                    <button
                      onClick={() => startEdit(f)}
                      className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 px-2.5 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                    >
                      <Pencil className="size-3.5" /> ویرایش
                    </button>
                    <button
                      onClick={() => removeFeedback(f)}
                      className="flex items-center gap-1 text-[11px] font-bold text-rose-500 hover:text-rose-700 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="size-3.5" /> حذف
                    </button>
                  </div>
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
