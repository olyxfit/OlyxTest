import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, Check, ChevronDown, ClipboardList, Crown, ListChecks, Target, TrendingUp } from 'lucide-react'
import { api } from '../lib/api.js'
import SectionIcon, { sectionGradient } from '../components/SectionIcon.jsx'

const toFa = (n) => (Number.isFinite(Number(n)) ? Number(n).toLocaleString('fa-IR') : '۰')
const faDate = (ts) => new Date(ts).toLocaleDateString('fa-IR', { day: 'numeric', month: 'long' })

const scoreColor = (p) =>
  p >= 70 ? 'bg-emerald-500' : p >= 50 ? 'bg-amber-500' : 'bg-rose-500'
const scoreText = (p) =>
  p >= 70 ? 'text-emerald-600' : p >= 50 ? 'text-amber-500' : 'text-rose-600'
const scoreBadge = (p) =>
  p >= 70
    ? 'bg-emerald-500/15 text-emerald-700 border border-emerald-500/30'
    : p >= 50
    ? 'bg-amber-500/15 text-amber-600 border border-amber-500/30'
    : 'bg-rose-500/15 text-rose-600 border border-rose-500/30'

function SubjectBar({ s }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="flex items-center gap-1.5 font-bold text-slate-700">
          <SectionIcon icon={s.icon} color={s.color} className="size-3.5" />
          {s.title}
        </span>
        <span className={`font-extrabold tabular-nums ${scoreText(s.percent)}`}>
          {toFa(s.correct)}/{toFa(s.total)} — {toFa(s.percent)}٪
        </span>
      </div>
      <div className="h-2 rounded-full bg-[#e6e8f0] overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-l ${sectionGradient(s.color)} transition-all duration-700`}
          style={{ width: `${s.percent}%` }}
        />
      </div>
    </div>
  )
}

// کارت عملکرد یک آزمون — جمع‌شونده؛ بازشدن = تفکیک درس همان آزمون
function ExamPerfCard({ a }) {
  const [open, setOpen] = useState(false)
  const subs = a.sectionStats ?? []
  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full p-4 flex items-center gap-3 text-right transition-colors"
      >
        <span className={`size-11 shrink-0 rounded-xl grid place-items-center text-sm font-extrabold ${scoreBadge(a.score)}`}>
          {toFa(a.score)}٪
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-bold truncate">{a.examTitle}</span>
          <span className="block text-[11px] text-slate-500 mt-0.5 truncate">
            {a.sectionTitle} • {toFa(a.correct)}/{toFa(a.total)} درست • {faDate(a.createdAt)}
          </span>
        </span>
        {subs.length > 0 && (
          <ChevronDown className={`size-4 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        )}
      </button>
      {open && subs.length > 0 && (
        <div className="px-4 pb-4 pt-3 space-y-3 border-t border-white/60 animate-pop">
          {subs.map((s) => (
            <SubjectBar key={s.sectionId} s={s} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function Stats() {
  const [stats, setStats] = useState(null)
  const [attempts, setAttempts] = useState([])
  const [locked, setLocked] = useState(false)
  const nav = useNavigate()

  useEffect(() => {
    api('/stats')
      .then(setStats)
      .catch((e) => {
        if (e.code === 'SUBSCRIPTION_REQUIRED' || e.message?.includes('اشتراک')) setLocked(true)
        else setStats({ exams: 0, questions: 0, correct: 0, avg: 0, best: 0, bySubject: [], trend: [] })
      })
    api('/attempts').then(setAttempts).catch(() => {})
  }, [])

  // آمار و سوابق ویژه مشترکین است
  if (locked)
    return (
      <div className="px-4 py-6">
        <div className="card p-8 text-center animate-pop">
          <span className="size-16 mx-auto rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 grid place-items-center shadow-lg shadow-amber-500/25">
            <Crown className="size-8 text-white" />
          </span>
          <h2 className="font-extrabold text-lg mt-4">آمار پیشرفت ویژه مشترکین است</h2>
          <p className="text-sm text-slate-500 leading-7 mt-2">
            تحلیل نقاط ضعف، روند نمرات و سوابق آزمون‌هایتان با اشتراک فعال در دسترس است.
          </p>
          <button onClick={() => nav('/subscription')} className="btn-primary w-full mt-5">
            مشاهده پلن‌های اشتراک
          </button>
        </div>
      </div>
    )

  if (!stats)
    return (
      <div className="px-4 py-6 space-y-3">
        <div className="skeleton h-24" />
        <div className="skeleton h-40" />
        <div className="skeleton h-40" />
      </div>
    )

  const totals = [
    { icon: ClipboardList, label: 'آزمون', value: stats.exams, tint: 'text-indigo-600 bg-indigo-500/10' },
    { icon: Check, label: 'پاسخ درست', value: stats.correct, tint: 'text-emerald-600 bg-emerald-500/10' },
    { icon: Target, label: 'میانگین', value: stats.avg, suffix: '٪', tint: 'text-sky-600 bg-sky-500/10' },
    { icon: TrendingUp, label: 'بهترین', value: stats.best, suffix: '٪', tint: 'text-amber-500 bg-amber-500/10' },
  ]
  const maxTrend = Math.max(...stats.trend.map((t) => t.score), 100)

  return (
    <div className="px-4 py-6 space-y-5 pb-10">
      {/* header */}
      <div className="flex items-center gap-3 animate-pop">
        <span className="size-11 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 grid place-items-center shadow-lg shadow-indigo-500/25">
          <BarChart3 className="size-5 text-white" />
        </span>
        <div>
          <h2 className="text-xl font-extrabold">آمار عملکرد</h2>
          <p className="on-photo text-xs mt-0.5">پیشرفت خودت را در طول زمان ببین</p>
        </div>
      </div>

      {/* totals */}
      <div className="grid grid-cols-4 gap-2 animate-pop">
        {totals.map((t) => (
          <div key={t.label} className="card p-3 text-center">
            <span className={`size-8 mx-auto rounded-lg grid place-items-center ${t.tint}`}>
              <t.icon className="size-4" />
            </span>
            <div className="text-sm font-extrabold mt-2 tabular-nums">{toFa(t.value)}{t.suffix || ''}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{t.label}</div>
          </div>
        ))}
      </div>

      {/* score trend */}
      <section className="card p-4 animate-pop">
        <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
          <TrendingUp className="size-4 text-indigo-600" /> روند نمرات
          <span className="text-[10px] font-normal text-slate-500">(۱۲ آزمون آخر)</span>
        </h3>
        {stats.trend.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">هنوز آزمونی نداده‌اید — اولین آزمون را بدهید تا روند ساخته شود.</p>
        ) : (
          <div className="flex items-end gap-1.5 h-32" dir="ltr">
            {stats.trend.map((t, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                <span className="text-[9px] font-bold text-slate-500 tabular-nums">{toFa(t.score)}</span>
                <div
                  className={`w-full rounded-t-md ${scoreColor(t.score)} transition-all duration-700`}
                  style={{ height: `${Math.max(6, (t.score / maxTrend) * 100)}%` }}
                />
              </div>
            ))}
          </div>
        )}
        {stats.trend.length > 0 && (
          <div className="flex items-center justify-center gap-3 mt-3 text-[10px] text-slate-500">
            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-emerald-500" /> ۷۰٪ و بالاتر</span>
            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-amber-500" /> ۵۰ تا ۷۰</span>
            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-rose-500" /> زیر ۵۰</span>
          </div>
        )}
      </section>

      {/* عملکرد به ازای هر آزمون — نه تجمیعی */}
      <section className="space-y-3 animate-pop">
        <h3 className="font-bold text-sm flex items-center gap-2 px-1">
          <ListChecks className="size-4 text-indigo-600" /> عملکرد به ازای هر آزمون
        </h3>
        {attempts.length === 0 ? (
          <p className="card p-6 text-xs text-slate-500 text-center">
            پس از چند آزمون، تفکیک درس‌های هر آزمون به‌صورت جداگانه اینجا نمایش داده می‌شود.
          </p>
        ) : (
          attempts.slice(0, 10).map((a) => <ExamPerfCard key={a.id} a={a} />)
        )}
      </section>
    </div>
  )
}
