import { useEffect, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, PartyPopper, Play, Sun, X } from 'lucide-react'
import { api } from '../lib/api.js'
import { useAuth } from '../lib/auth.jsx'
import SectionIcon, { sectionSoft } from './SectionIcon.jsx'
import ReviewCard from './ReviewCard.jsx'

const toFa = (n) => (Number.isFinite(Number(n)) ? Number(n).toLocaleString('fa-IR') : '۰')

const dayKey = () => {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

const storeKey = (userId) => `azmoon:daily:${userId || 'guest'}`

// کوییز امروز (انجام‌شده یا نیمه‌تمام) از حافظه دستگاه بازیابی می‌شود — تا فردا همان سوالات می‌مانند
function loadSaved(userId) {
  try {
    const s = JSON.parse(localStorage.getItem(storeKey(userId)) || 'null')
    return s?.day === dayKey() && Array.isArray(s.questions) ? s : null
  } catch {
    return null
  }
}

export default function DailyQuiz() {
  const { user } = useAuth()
  const [questions, setQuestions] = useState(null)
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [done, setDone] = useState(false)
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [ownerId, setOwnerId] = useState(null) // سوالات فعلی برای کدام کاربر بارگذاری شده‌اند

  // بازیابی کوییز امروز یا واکشی سوالات تازه
  useEffect(() => {
    setQuestions(null)
    setAnswers({})
    setIndex(0)
    setDone(false)
    setOpen(false)
    setOwnerId(null)
    const saved = loadSaved(user?.id)
    if (saved) {
      setQuestions(saved.questions)
      setAnswers(saved.answers ?? {})
      setIndex(Math.min(saved.index ?? 0, saved.questions.length - 1))
      setDone(!!saved.done)
      setOwnerId(user?.id ?? null)
    } else {
      api('/daily')
        .then((qs) => {
          setQuestions(qs)
          setOwnerId(user?.id ?? null)
        })
        .catch(() => {})
    }
    setLoaded(true)
  }, [user?.id])

  // پیشرفت همان لحظه ذخیره می‌شود — خروج از پاپ‌آپ = ادامه از همان سوال
  // فقط وقتی سوالات برای همین کاربر بارگذاری شده‌اند (حریم بین سوییچ اکانت)
  useEffect(() => {
    if (!loaded || !questions || ownerId !== (user?.id ?? null)) return
    try {
      localStorage.setItem(
        storeKey(user?.id),
        JSON.stringify({ day: dayKey(), questions, answers, index, done })
      )
    } catch { /* حافظه در دسترس نیست */ }
  }, [loaded, questions, answers, index, done, user?.id, ownerId])

  const answered = Object.keys(answers).length
  const score = questions ? questions.filter((qq) => answers[qq.id] === qq.answer).length : 0

  return (
    <>
      {/* کارت کوییز روزانه — کلیک = باز شدن پاپ‌آپ */}
      <button
        onClick={() => questions && setOpen(true)}
        className="card w-full p-4 flex items-center gap-3 text-right animate-pop"
      >
        <span className="size-11 shrink-0 rounded-xl bg-amber-500/15 grid place-items-center">
          <Sun className="size-5 text-amber-600" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-2 text-sm font-bold">
            کوییز روزانه
            {done && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-500/15 border border-emerald-500/30 rounded-full px-2 py-0.5">
                <Check className="size-3" strokeWidth={3} /> انجام شد
              </span>
            )}
          </span>
          <span className="block text-[11px] text-slate-500 mt-0.5">
            {!questions
              ? 'در حال آماده‌سازی سوالات امروز…'
              : done
                ? `${toFa(score)} از ${toFa(questions.length)} درست — برای مرور بزن`
                : answered > 0
                  ? `ادامه — ${toFa(answered)} از ${toFa(questions.length)} پاسخ داده شده`
                  : `${toFa(questions.length)} سوال امروز — یک‌بار در روز`}
          </span>
        </span>
        {done ? (
          <ChevronLeft className="size-4 text-slate-400 shrink-0" />
        ) : (
          <Play className="size-4 text-amber-600 fill-current shrink-0" />
        )}
      </button>

      {/* پاپ‌آپ کوییز */}
      {open && questions && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md max-h-[90dvh] overflow-y-auto bg-white border border-[#e6e8f0] rounded-t-3xl sm:rounded-3xl animate-pop shadow-2xl shadow-indigo-900/20"
            onClick={(e) => e.stopPropagation()}
          >
            {/* سربرگ مودال */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-white/90 backdrop-blur border-b border-[#e6e8f0]">
              <span className="flex items-center gap-2 text-sm font-bold">
                <span className="size-8 rounded-xl bg-amber-500/15 text-amber-600 grid place-items-center">
                  <Sun className="size-4" />
                </span>
                کوییز روزانه
              </span>
              <span className="flex items-center gap-2.5">
                <span className="text-[11px] text-slate-500">
                  {new Date().toLocaleDateString('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
                <button
                  onClick={() => setOpen(false)}
                  className="size-8 rounded-xl bg-[#f1f2f6] border border-[#e6e8f0] grid place-items-center text-slate-500"
                >
                  <X className="size-4" />
                </button>
              </span>
            </div>

            {done ? (
              <div className="p-4">
                {/* نتیجه */}
                <div className="text-center py-3">
                  <div
                    className={`size-20 mx-auto rounded-full grid place-items-center ring-8 ${
                      score >= 7
                        ? 'bg-emerald-500/10 text-emerald-600 ring-emerald-500/5'
                        : score >= 5
                        ? 'bg-amber-500/10 text-amber-500 ring-amber-500/5'
                        : 'bg-rose-500/10 text-rose-600 ring-rose-500/5'
                    }`}
                  >
                    <span className="text-2xl font-extrabold">{toFa(score)}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-2.5">از {toFa(questions.length)} سوال درست</div>
                  <div className="font-bold mt-1.5 flex items-center justify-center gap-1.5">
                    {score >= 7 ? (
                      <>
                        <PartyPopper className="size-4 text-emerald-600" /> آفرین! آمادهٔ آزمون اصلی هستی
                      </>
                    ) : score >= 5 ? (
                      'بد نبود؛ مرور کن بهتر می‌شوی'
                    ) : (
                      'بیشتر تمرین کن، نتیجه می‌گیری'
                    )}
                  </div>
                  <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 bg-white/60 border border-white/70 rounded-full px-3 py-1.5">
                    <Sun className="size-3.5 text-amber-500" />
                    کوییز بعدی فردا فعال می‌شود
                  </div>
                </div>

                {/* مرور پاسخ‌ها */}
                <div className="space-y-3">
                  {questions.map((qq, i) => (
                    <ReviewCard key={qq.id} q={qq} chosen={answers[qq.id]} index={i} delay={Math.min(i * 40, 400)} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {/* progress */}
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                  <span>سوال {toFa(index + 1)} از {toFa(questions.length)}</span>
                  <span>{toFa(answered)} پاسخ داده شده</span>
                </div>
                <div className="h-1.5 rounded-full bg-[#e3e7ef] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-l from-indigo-600 to-indigo-400 transition-all duration-300"
                    style={{ width: `${((index + 1) / questions.length) * 100}%` }}
                  />
                </div>

                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg border ${sectionSoft(questions[index].color)}`}>
                  <SectionIcon icon={questions[index].icon} color={questions[index].color} className="size-3" />
                  {questions[index].sectionTitle}
                </span>
                <p className="text-sm font-bold leading-7">{questions[index].question}</p>

                <div className="space-y-2">
                  {questions[index].options.map((opt, i) => {
                    const selected = answers[questions[index].id] === i
                    return (
                      <button
                        key={i}
                        onClick={() => setAnswers((a) => ({ ...a, [questions[index].id]: i }))}
                        className={`w-full text-right text-xs px-3 py-2.5 rounded-xl border flex items-center gap-2 transition-all active:scale-[0.99] ${
                          selected
                            ? 'border-indigo-500 bg-indigo-500/10 text-indigo-700 shadow-md shadow-indigo-500/10'
                            : 'border-[#dde2ec] bg-white/60 text-slate-700 hover:border-indigo-300'
                        }`}
                      >
                        <span className={`size-5 shrink-0 rounded-md grid place-items-center text-[10px] font-extrabold transition-colors ${
                          selected ? 'bg-indigo-600 text-white' : 'bg-[#f1f2f6] text-slate-500'
                        }`}>
                          {selected ? <Check className="size-3" /> : ['الف', 'ب', 'ج', 'د'][i]}
                        </span>
                        {opt}
                      </button>
                    )
                  })}
                </div>

                {/* nav */}
                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={() => setIndex((i) => Math.max(0, i - 1))}
                    disabled={index === 0}
                    className="size-11 rounded-xl bg-white/70 border border-[#e6e8f0] grid place-items-center text-slate-700 shadow-sm disabled:opacity-30"
                  >
                    <ChevronRight className="size-5" />
                  </button>
                  {index < questions.length - 1 ? (
                    <button onClick={() => setIndex((i) => i + 1)} className="btn-primary flex-1">
                      سوال بعدی
                    </button>
                  ) : (
                    <button onClick={() => setDone(true)} className="btn-primary flex-1 flex items-center justify-center gap-2">
                      <Check className="size-4" /> پایان و دیدن نتیجه
                    </button>
                  )}
                  <button
                    onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}
                    disabled={index === questions.length - 1}
                    className="size-11 rounded-xl bg-white/70 border border-[#e6e8f0] grid place-items-center text-slate-700 shadow-sm disabled:opacity-30"
                  >
                    <ChevronLeft className="size-5" />
                  </button>
                </div>
                <p className="text-center text-[10px] text-slate-400 pb-1">
                  پیشرفت ذخیره می‌شود — هر وقت برگردی از همین‌جا ادامه می‌دهی
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
