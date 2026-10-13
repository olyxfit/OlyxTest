import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Check, ChevronRight, ChevronLeft, Clock3, Flag, X } from 'lucide-react'
import { api } from '../lib/api.js'
import SectionIcon, { sectionSoft } from '../components/SectionIcon.jsx'

const toFa = (n) => (Number.isFinite(Number(n)) ? Number(n).toLocaleString('fa-IR') : '۰')
const LETTERS = ['الف', 'ب', 'ج', 'د']

export default function Quiz() {
  const { examId } = useParams()
  const nav = useNavigate()

  const [questions, setQuestions] = useState(null)
  const [exam, setExam] = useState(null)
  const [answers, setAnswers] = useState({})
  const [flags, setFlags] = useState({})
  const [index, setIndex] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(30 * 60)
  const [submitting, setSubmitting] = useState(false)
  const [locked, setLocked] = useState(false)
  const startRef = useRef(Date.now())

  useEffect(() => {
    Promise.all([api(`/exams/${examId}`), api(`/exams/${examId}/questions`)])
      .then(([ex, qs]) => {
        setExam(ex)
        setQuestions(qs)
        // تایمر بر اساس زمان اعلام‌شده آزمون است؛ در نبود آن ۶۰ ثانیه به ازای هر سوال
        setSecondsLeft(Math.max(60, (ex.timeMinutes || qs.length) * 60))
      })
      .catch((e) => {
        if (e.code === 'SUBSCRIPTION_REQUIRED' || e.message?.includes('اشتراک')) setLocked(true)
        else nav(`/exam/${examId}`)
      })
  }, [examId]) // eslint-disable-line react-hooks/exhaustive-deps

  const sectionMap = useMemo(() => {
    const m = {}
    for (const s of exam?.sections ?? []) m[s.id] = s
    return m
  }, [exam])

  // countdown
  useEffect(() => {
    if (!questions) return
    const t = setInterval(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearInterval(t)
  }, [questions])

  // auto-submit on timeout
  useEffect(() => {
    if (secondsLeft <= 0 && questions && !submitting) submit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft])

  const answered = useMemo(() => Object.keys(answers).length, [answers])

  const submit = async () => {
    if (submitting) return
    setSubmitting(true)
    try {
      const timeSpent = Math.round((Date.now() - startRef.current) / 1000)
      const data = await api(`/exams/${examId}/submit`, {
        method: 'POST',
        body: { answers, timeSpent, flags: Object.keys(flags).filter((id) => flags[id]) },
      })
      nav('/result', { state: data, replace: true })
    } catch (e) {
      alert(e.message)
      setSubmitting(false)
    }
  }

  if (locked) return <Navigate to="/subscription" replace />

  if (!questions)
    return (
      <div className="px-4 py-6 space-y-3">
        <div className="skeleton h-10" />
        <div className="skeleton h-40" />
        <div className="skeleton h-14" />
      </div>
    )

  const q = questions[index]
  const mm = Math.floor(secondsLeft / 60)
  const ss = secondsLeft % 60
  const progress = (index + 1) / questions.length
  const lowTime = secondsLeft < 60

  return (
    <div className="flex flex-col min-h-dvh">
      {/* top bar */}
      <div className="sticky top-0 z-20 bg-white/85 backdrop-blur-xl border-b border-[#e6e8f0] px-4 pt-3 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { if (confirm('از آزمون خارج می‌شوید؟ پاسخ‌ها ذخیره نمی‌شود.')) nav(`/exam/${examId}`) }}
              className="size-9 rounded-xl bg-[#f1f2f6] border border-[#e6e8f0] grid place-items-center text-slate-500"
            >
              <X className="size-4" />
            </button>
            <button
              onClick={() => setFlags((f) => ({ ...f, [q.id]: !f[q.id] }))}
              title="نشانه‌گذاری سوال"
              className={`size-9 rounded-xl border grid place-items-center transition-colors ${
                flags[q.id]
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : 'bg-[#f1f2f6] border-[#e6e8f0] text-slate-500'
              }`}
            >
              <Flag className="size-4" fill={flags[q.id] ? 'currentColor' : 'none'} />
            </button>
          </div>
          <div className={`flex items-center gap-1.5 font-bold tabular-nums ${lowTime ? 'text-rose-600 animate-pulse' : 'text-slate-700'}`}>
            <Clock3 className="size-4" />
            {toFa(mm)}:{toFa(String(ss).padStart(2, '0'))}
          </div>
          <div className="text-xs text-slate-500 font-bold">
            {toFa(index + 1)} از {toFa(questions.length)}
          </div>
        </div>
        {/* progress */}
        <div className="mt-3 h-2 rounded-full bg-[#e6e8f0] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-l from-lime-500 to-lime-400 transition-all duration-300"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      {/* question */}
      <div key={q.id} className="flex-1 px-4 py-6 animate-pop">
        {sectionMap[q.sectionId] && (
          <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border mb-3 ${sectionSoft(sectionMap[q.sectionId].color)}`}>
            <SectionIcon icon={sectionMap[q.sectionId].icon} color={sectionMap[q.sectionId].color} className="size-3.5" />
            {sectionMap[q.sectionId].title}
          </span>
        )}
        <h2 className="text-lg font-extrabold leading-8">{q.question}</h2>
        <div className="mt-6 space-y-3">
          {q.options.map((opt, i) => {
            const selected = answers[q.id] === i
            return (
              <button
                key={i}
                onClick={() => setAnswers((a) => ({ ...a, [q.id]: i }))}
                className={`w-full flex items-center gap-3 p-4 rounded-2xl border text-right transition-all active:scale-[0.99] ${
                  selected
                    ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10'
                    : 'border-[#e6e8f0] bg-white hover:border-indigo-300'
                }`}
              >
                <span
                  className={`size-9 shrink-0 rounded-xl grid place-items-center text-sm font-extrabold transition-colors ${
                    selected ? 'bg-indigo-600 text-white' : 'bg-[#f1f2f6] text-slate-500'
                  }`}
                >
                  {selected ? <Check className="size-4" /> : LETTERS[i]}
                </span>
                <span className={`leading-7 ${selected ? 'text-indigo-800' : 'text-slate-700'}`}>{opt}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* bottom nav */}
      <div className="sticky bottom-0 bg-white/85 backdrop-blur-xl border-t border-[#e6e8f0] px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className="size-12 rounded-xl bg-[#f1f2f6] border border-[#e6e8f0] grid place-items-center text-slate-700 disabled:opacity-30"
          >
            <ChevronRight className="size-5" />
          </button>
          {index < questions.length - 1 ? (
            <button onClick={() => setIndex((i) => i + 1)} className="btn-primary flex-1">
              سوال بعدی
            </button>
          ) : (
            <button onClick={submit} disabled={submitting} className="btn-primary flex-1 flex items-center justify-center gap-2 !bg-indigo-500 hover:!bg-indigo-400 !shadow-indigo-500/20">
              <Flag className="size-4" />
              {submitting ? 'در حال تصحیح…' : `پایان آزمون (${toFa(answered)}/${toFa(questions.length)})`}
            </button>
          )}
          <button
            onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}
            disabled={index === questions.length - 1}
            className="size-12 rounded-xl bg-[#f1f2f6] border border-[#e6e8f0] grid place-items-center text-slate-700 disabled:opacity-30"
          >
            <ChevronLeft className="size-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
