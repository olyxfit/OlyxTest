import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, Clock3, ClipboardList, Crown, Gift, Layers, Lock, Play, Lightbulb } from 'lucide-react'
import { api } from '../lib/api.js'
import { sectionGradient } from '../components/SectionIcon.jsx'

const toFa = (n) => (Number.isFinite(Number(n)) ? Number(n).toLocaleString('fa-IR') : '۰')

export default function ExamDetail() {
  const { examId } = useParams()
  const [exam, setExam] = useState(null)
  const nav = useNavigate()

  useEffect(() => {
    api(`/exams/${examId}`).then(setExam)
  }, [examId])

  if (!exam)
    return (
      <div className="px-4 py-6 space-y-3">
        <div className="skeleton h-24" />
        <div className="skeleton h-20" />
        <div className="skeleton h-20" />
      </div>
    )

  const isSingle = exam.type === 'single' || (exam.type === 'generated' && exam.mode === 'single')
  const sec = isSingle ? exam.sections.find((s) => s.id === exam.sectionId) : null

  return (
    <div className="px-4 py-6 space-y-6 pb-10">
      <button onClick={() => nav('/')} className="on-photo flex items-center gap-1.5 text-sm hover:text-slate-800">
        <ArrowRight className="size-4" /> بازگشت
      </button>

      {/* exam header */}
      <div className="card p-5 animate-pop bg-gradient-to-br from-indigo-50 to-white">
        <h2 className="text-xl font-extrabold">{exam.title}</h2>
        <p className="text-sm text-slate-500 mt-1.5 leading-6">{exam.description}</p>
        <div className="flex items-center gap-4 mt-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5"><ClipboardList className="size-4" /> {toFa(exam.totalQuestions)} سوال</span>
          <span className="flex items-center gap-1.5"><Clock3 className="size-4" /> {toFa(exam.timeMinutes)} دقیقه</span>
          {exam.locked && (
            <span className="flex items-center gap-1.5 text-amber-600 font-bold"><Lock className="size-4" /> ویژه مشترکین</span>
          )}
          {exam.trial && (
            <span className="flex items-center gap-1.5 text-emerald-600 font-bold"><Gift className="size-4" /> آزمون رایگان</span>
          )}
        </div>
      </div>

      {/* start CTA */}
      {exam.locked ? (
        <button
          onClick={() => nav('/subscription')}
          className="w-full p-4 rounded-2xl text-white font-bold flex items-center justify-between shadow-xl bg-gradient-to-l from-amber-500 to-amber-600 shadow-amber-500/20 active:scale-[0.99] transition-all animate-pop"
          style={{ animationDelay: '60ms' }}
        >
          <span className="flex items-center gap-3">
            <span className="size-11 rounded-xl bg-white/15 grid place-items-center">
              <Crown className="size-5" />
            </span>
            <span className="text-right">
              <span className="block">برای این آزمون اشتراک لازم است</span>
              <span className="block text-xs font-normal text-white/70 mt-0.5">مشاهده پلن‌ها و فعال‌سازی</span>
            </span>
          </span>
          <Play className="size-5 fill-current" />
        </button>
      ) : (
      <button
        onClick={() => nav(`/exam/${examId}/quiz`)}
        className={`w-full p-4 rounded-2xl text-white font-bold flex items-center justify-between shadow-xl active:scale-[0.99] transition-all animate-pop ${
          isSingle && sec
            ? `bg-gradient-to-l ${sectionGradient(sec.color)} shadow-lg`
            : 'bg-gradient-to-l from-indigo-500 to-indigo-600 shadow-indigo-500/20'
        }`}
        style={{ animationDelay: '60ms' }}
      >
        <span className="flex items-center gap-3">
          <span className="size-11 rounded-xl bg-white/15 grid place-items-center">
            <Layers className="size-5" />
          </span>
          <span className="text-right">
            <span className="block">{isSingle ? `شروع ${exam.title}` : 'شروع آزمون جامع'}</span>
            <span className="block text-xs font-normal text-white/70 mt-0.5">
              {isSingle ? `${toFa(exam.totalQuestions)} سوال اختصاصی این درس` : `همه ${toFa(exam.totalQuestions)} سوال از ${toFa(exam.sections.filter((s) => s.count > 0).length)} درس`}
            </span>
          </span>
        </span>
        <Play className="size-5 fill-current" />
      </button>
      )}

      {exam.trial && (
        <div className="flex items-start gap-2.5 text-xs text-emerald-700 card p-3.5 border-emerald-500/30 bg-emerald-500/5 animate-pop" style={{ animationDelay: '80ms' }}>
          <Gift className="size-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>این <b>اولین آزمون جامع</b> شماست و رایگان است — پس از این آزمون، بقیهٔ آزمون‌های جامع نیازمند اشتراک‌اند.</span>
        </div>
      )}

      <div className="flex items-start gap-2.5 text-xs text-slate-500 card p-3.5 animate-pop" style={{ animationDelay: '90ms' }}>
        <Lightbulb className="size-4 text-amber-500 shrink-0 mt-0.5" />
        <span>در پایان آزمون، <b className="text-amber-500">پاسخ تشریحی</b> هر سوال به همراه پاسخ صحیح نمایش داده می‌شود.</span>
      </div>

    </div>
  )
}
