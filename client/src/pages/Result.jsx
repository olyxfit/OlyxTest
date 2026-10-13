import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Check, Flame, Home, Minus, RotateCcw, Sparkles, Trophy, X } from 'lucide-react'
import { api } from '../lib/api.js'
import SectionIcon, { sectionGradient } from '../components/SectionIcon.jsx'
import ReviewCard from '../components/ReviewCard.jsx'

const toFa = (n) => Number(n).toLocaleString('fa-IR')

function ScoreRing({ score }) {
  const r = 70
  const circ = 2 * Math.PI * r
  const off = circ * (1 - score / 100)
  const color = score >= 70 ? '#16a34a' : score >= 50 ? '#d97706' : '#e11d48'
  return (
    <div className="relative size-44 mx-auto">
      <svg viewBox="0 0 160 160" className="size-full -rotate-90">
        <circle cx="80" cy="80" r={r} fill="none" stroke="#e6e8f0" strokeWidth="12" />
        <circle
          cx="80" cy="80" r={r} fill="none" stroke={color} strokeWidth="12"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ}
          className="ring-anim"
          style={{ '--dash': off, strokeDashoffset: off }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="text-4xl font-extrabold" style={{ color }}>{toFa(score)}٪</div>
          <div className="text-xs text-slate-500 mt-1">نمره نهایی</div>
        </div>
      </div>
    </div>
  )
}

const FILTERS = [
  { id: 'all', label: 'همه' },
  { id: 'correct', label: 'درست' },
  { id: 'wrong', label: 'غلط' },
  { id: 'skipped', label: 'بی‌پاسخ' },
  { id: 'flagged', label: 'نشانه‌گذاری‌شده' },
]

export default function Result() {
  const { state } = useLocation()
  const { attemptId } = useParams()
  const nav = useNavigate()
  const [filter, setFilter] = useState('all')
  const [data, setData] = useState(state ?? null)
  const [error, setError] = useState(null)

  // مرور نتیجهٔ قبلی از تاریخچه — وقتی مستقیم با /result/:id آمده‌ایم
  useEffect(() => {
    if (state || !attemptId) return
    api(`/attempts/${attemptId}`)
      .then((d) => setData({ attempt: d.attempt, detail: d.detail }))
      .catch((e) => setError(e.message))
  }, [attemptId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <div className="p-6 text-center text-slate-500">{error}</div>
  if (!data) return <div className="px-4 py-6 space-y-3"><div className="skeleton h-44" /><div className="skeleton h-40" /></div>

  const { attempt, detail, pointsEarned, streak } = data
  const sectionStats = attempt.sectionStats ?? data.sectionStats ?? []
  const flags = attempt.flags ?? []
  const passed = attempt.score >= 70
  // بج درس روی کارت مرور — detail فقط sectionId دارد؛ عنوان/آیکون/رنگ از sectionStats یا سکشن‌های آزمون
  const secInfo = new Map(sectionStats.map((s) => [s.sectionId, s]))
  const enriched = detail.map((d) => ({ ...d, ...(secInfo.get(d.sectionId) || {}) }))

  const countOf = (id) =>
    id === 'all'
      ? detail.length
      : id === 'correct'
      ? detail.filter((d) => d.correct).length
      : id === 'wrong'
      ? detail.filter((d) => !d.correct && d.chosen !== null).length
      : id === 'skipped'
      ? detail.filter((d) => d.chosen === null).length
      : flags.length
  const filtered = enriched
    .map((d, i) => ({ d, i }))
    .filter(({ d }) => {
      if (filter === 'correct') return d.correct
      if (filter === 'wrong') return !d.correct && d.chosen !== null
      if (filter === 'skipped') return d.chosen === null
      if (filter === 'flagged') return flags.includes(d.id)
      return true
    })

  return (
    <div className="px-4 py-8 space-y-6 pb-12">
      <div className="text-center animate-pop">
        <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold mb-5 ${
          passed ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-600 border border-rose-500/30'
        }`}>
          <Trophy className="size-4" />
          {passed ? 'قبول شدید! 🎉' : 'نیاز به تمرین بیشتر'}
        </div>
        <ScoreRing score={attempt.score} />
        <div className="grid grid-cols-3 gap-3 mt-6">
          <div className="card p-3">
            <div className="flex items-center justify-center gap-1 text-emerald-600 text-xl font-extrabold">
              <Check className="size-4" /> {toFa(attempt.correct)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">درست</div>
          </div>
          <div className="card p-3">
            <div className="flex items-center justify-center gap-1 text-rose-600 text-xl font-extrabold">
              <X className="size-4" /> {toFa(attempt.wrong)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">غلط</div>
          </div>
          <div className="card p-3">
            <div className="flex items-center justify-center gap-1 text-slate-500 text-xl font-extrabold">
              <Minus className="size-4" /> {toFa(attempt.unanswered)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">بی‌پاسخ</div>
          </div>
        </div>
      </div>

      {(pointsEarned != null || streak != null) && (
        <div className="flex items-center justify-center gap-3 text-xs font-extrabold animate-pop">
          {pointsEarned != null && (
            <span className="flex items-center gap-1.5 text-amber-600 bg-amber-500/10 border border-amber-500/30 rounded-full px-3.5 py-1.5">
              <Sparkles className="size-3.5" /> +{toFa(pointsEarned)} امتیاز
            </span>
          )}
          {streak > 0 && (
            <span className="flex items-center gap-1.5 text-orange-600 bg-orange-500/10 border border-orange-500/30 rounded-full px-3.5 py-1.5">
              <Flame className="size-3.5" /> {toFa(streak)} روز متوالی
            </span>
          )}
        </div>
      )}

      {/* عملکرد به تفکیک درس */}
      {sectionStats.length > 0 && (
        <section className="card p-4 space-y-3.5 animate-pop">
          <h3 className="font-bold text-sm">عملکرد به تفکیک درس</h3>
          {sectionStats.map((s) => (
            <div key={s.sectionId}>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="flex items-center gap-1.5 font-bold text-slate-700">
                  <SectionIcon icon={s.icon} color={s.color} className="size-3.5" />
                  {s.title}
                </span>
                <span
                  className={`font-extrabold tabular-nums ${
                    s.percent >= 70 ? 'text-emerald-600' : s.percent >= 50 ? 'text-amber-500' : 'text-rose-600'
                  }`}
                >
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
          ))}
        </section>
      )}

      <div className="flex gap-3">
        <button onClick={() => nav('/')} className="btn-primary flex items-center justify-center gap-2">
          <Home className="size-4" /> بازگشت به خانه
        </button>
        <button onClick={() => nav(`/exam/${attempt.examId}`)} className="btn-ghost flex items-center justify-center gap-2">
          <RotateCcw className="size-4" /> آزمون مجدد
        </button>
      </div>

      {/* review */}
      <section>
        <h3 className="font-bold text-lg mb-3">بررسی پاسخ‌ها</h3>
        {/* فیلترها */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${
                filter === f.id
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'bg-white/70 backdrop-blur border-[#dde2ec] text-slate-500 hover:border-indigo-300'
              }`}
            >
              {f.label} ({toFa(countOf(f.id))})
            </button>
          ))}
        </div>
        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="card p-6 text-center text-sm text-slate-500">سوالی در این دسته نیست.</div>
          )}
          {filtered.map(({ d, i }) => (
            <ReviewCard
              key={d.id}
              q={d}
              chosen={d.chosen}
              index={i}
              flagged={flags.includes(d.id)}
              delay={Math.min(i * 40, 400)}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
