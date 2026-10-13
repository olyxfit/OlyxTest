import { Check, X, Minus, Flag, Lightbulb, Lock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import SectionIcon, { sectionSoft } from './SectionIcon.jsx'

const toFa = (n) => Number(n).toLocaleString('fa-IR')
export const LETTERS = ['الف', 'ب', 'ج', 'د', 'ه', 'و']

// وضعیت هر سوال — رنگ‌بندی متمایز برای درست / نادرست / بی‌پاسخ
const STATUS = {
  correct: {
    label: 'پاسخ درست',
    icon: Check,
    badge: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
    bar: 'bg-gradient-to-l from-emerald-400 to-emerald-600',
    num: 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-sm shadow-emerald-500/40',
  },
  wrong: {
    label: 'پاسخ نادرست',
    icon: X,
    badge: 'bg-rose-500/15 text-rose-700 border-rose-500/30',
    bar: 'bg-gradient-to-l from-rose-400 to-rose-600',
    num: 'bg-gradient-to-br from-rose-400 to-rose-600 text-white shadow-sm shadow-rose-500/40',
  },
  skipped: {
    label: 'بی‌پاسخ',
    icon: Minus,
    badge: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
    bar: 'bg-gradient-to-l from-amber-400 to-amber-600',
    num: 'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-sm shadow-amber-500/40',
  },
}

export default function ReviewCard({ q, chosen, index, flagged = false, delay = 0 }) {
  const nav = useNavigate()
  const status = chosen === q.answer ? 'correct' : chosen == null ? 'skipped' : 'wrong'
  const s = STATUS[status]
  const StatusIcon = s.icon

  return (
    <div className="card overflow-hidden animate-pop" style={{ animationDelay: `${delay}ms` }}>
      {/* نوار رنگی وضعیت */}
      <div className={`h-1 ${s.bar}`} />
      <div className="p-4">
        {/* سربرگ: شماره + وضعیت + درس + نشانه */}
        <div className="flex items-center gap-2 flex-wrap mb-2.5">
          <span className={`size-6 shrink-0 rounded-lg grid place-items-center text-[11px] font-extrabold ${s.num}`}>
            {toFa(index + 1)}
          </span>
          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg border ${s.badge}`}>
            <StatusIcon className="size-3" strokeWidth={3} />
            {s.label}
          </span>
          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg border ${sectionSoft(q.color)}`}>
            <SectionIcon icon={q.icon} color={q.color} className="size-3" />
            {q.sectionTitle}
          </span>
          {flagged && <Flag className="size-3.5 text-indigo-600 mr-auto shrink-0" fill="currentColor" />}
        </div>

        <p className="text-sm font-bold leading-7 text-slate-800">{q.question}</p>

        {/* گزینه‌ها */}
        <div className="mt-3 space-y-2">
          {q.options.map((opt, i) => {
            const isAnswer = i === q.answer
            const isChosen = i === chosen
            return (
              <div
                key={i}
                className={`text-xs px-3 py-2.5 rounded-xl border flex items-center gap-2.5 ${
                  isAnswer
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-800'
                    : isChosen
                    ? 'bg-rose-500/10 border-rose-500/40 text-rose-800'
                    : 'bg-white/50 border-slate-200/80 text-slate-500'
                }`}
              >
                <span
                  className={`size-6 shrink-0 rounded-lg grid place-items-center text-[10px] font-extrabold ${
                    isAnswer
                      ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/40'
                      : isChosen
                      ? 'bg-rose-500 text-white shadow-sm shadow-rose-500/40'
                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                  }`}
                >
                  {isAnswer ? <Check className="size-3.5" strokeWidth={3} /> : isChosen ? <X className="size-3.5" strokeWidth={3} /> : LETTERS[i]}
                </span>
                <span className="flex-1 leading-6">{opt}</span>
                {isAnswer && (
                  <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 border border-emerald-500/25">
                    پاسخ صحیح
                  </span>
                )}
                {isChosen && !isAnswer && (
                  <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-rose-500/15 text-rose-700 border border-rose-500/25">
                    پاسخ شما
                  </span>
                )}
              </div>
            )
          })}
        </div>

        {/* پاسخ تشریحی — در آزمون رایگان قفل و مات نمایش داده می‌شود */}
        {q.explanationLocked ? (
          <button
            onClick={() => nav('/subscription')}
            className="mt-3 w-full relative overflow-hidden rounded-xl border border-amber-500/25 bg-gradient-to-l from-amber-500/10 to-amber-400/5 text-right"
          >
            <div className="flex items-start gap-2 text-xs leading-6 text-slate-700 p-3 blur-[5px] select-none" aria-hidden="true">
              <Lightbulb className="size-4 text-amber-500 shrink-0 mt-0.5" fill="currentColor" />
              <span>
                <b className="text-amber-600">پاسخ تشریحی: </b>
                این بخش توضیح کامل پاسخ سوال را در بر می‌گیرد و برای درک بهتر مطلب طراحی شده است.
              </span>
            </div>
            <span className="absolute inset-0 grid place-items-center">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-amber-700 bg-white/85 backdrop-blur border border-amber-500/40 rounded-full px-3.5 py-1.5 shadow-sm">
                <Lock className="size-3.5" /> پاسخ تشریحی ویژه مشترکین است
              </span>
            </span>
          </button>
        ) : q.explanation && (
          <div className="mt-3 flex items-start gap-2 text-xs leading-6 text-slate-700 bg-gradient-to-l from-amber-500/10 to-amber-400/5 border border-amber-500/25 rounded-xl p-3">
            <Lightbulb className="size-4 text-amber-500 shrink-0 mt-0.5" fill="currentColor" />
            <span>
              <b className="text-amber-600">پاسخ تشریحی: </b>
              {q.explanation}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
