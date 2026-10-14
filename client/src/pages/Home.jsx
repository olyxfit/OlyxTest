import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, ArrowRight, ChevronLeft, ClipboardList, Dumbbell, Lock, Target, Wand2, X } from 'lucide-react'
import { api } from '../lib/api.js'
import { useAuth } from '../lib/auth.jsx'
import SectionIcon, { sectionGradient } from '../components/SectionIcon.jsx'
import DailyQuiz from '../components/DailyQuiz.jsx'

const toFa = (n) => (Number.isFinite(Number(n)) ? Number(n).toLocaleString('fa-IR') : '۰')

export default function Home() {
  const [exams, setExams] = useState(null)
  const [stats, setStats] = useState(null)
  const [attempts, setAttempts] = useState([])
  const [builderOpen, setBuilderOpen] = useState(false)
  const [disc, setDisc] = useState(null) // 'bodybuilding' | 'fitness'
  const [gender, setGender] = useState(null) // 'men' | 'women'
  const [mode, setMode] = useState(null) // 'comprehensive' | 'single'
  const [sectionId, setSectionId] = useState(null)
  const [building, setBuilding] = useState(false)
  const { user, refresh } = useAuth()
  const nav = useNavigate()
  const subActive = !!user?.subscription && user.subscription.until > Date.now()
  const isAdmin = !!user?.admin
  const canSeeStats = subActive || isAdmin
  // آزمون رایگان امتحانی با ثبت اولین نتیجهٔ آزمون غیر تک‌درس مصرف می‌شود
  const freeExamUsed = user?.freeExamUsed || attempts.some((a) => a.section === 'all')
  const canBuild = canSeeStats || !freeExamUsed

  useEffect(() => {
    api('/exams').then(setExams).catch(() => setExams([]))
    refresh() // freeExamUsed/امتیاز پس از آزمون به‌روز شود
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // آمار و سوابق فقط برای مشترکین واکشی می‌شوند (در غیر این صورت سرور ۴۰۲ می‌دهد)
  useEffect(() => {
    if (!canSeeStats) return
    api('/stats').then(setStats).catch(() => {})
    api('/attempts').then(setAttempts).catch(() => {})
  }, [canSeeStats])

  const closeBuilder = () => {
    setBuilderOpen(false)
    setDisc(null)
    setGender(null)
    setMode(null)
    setSectionId(null)
  }

  const build = async () => {
    if (!disc || !gender || !mode || building) return
    if (mode === 'single' && !sectionId) return
    setBuilding(true)
    try {
      const exam = await api('/exams/generate', {
        method: 'POST',
        body: { mode, sectionId, discipline: disc, gender },
      })
      closeBuilder()
      nav(`/exam/${exam.id}`)
    } catch (e) {
      alert(e.message)
    } finally {
      setBuilding(false)
    }
  }

  const allSections = exams?.[0]?.sections ?? []
  const sectionTotals = new Map(
    (exams ?? []).filter((e) => e.type === 'single').map((e) => [e.sectionId, e.totalQuestions])
  )
  // دروس قابل انتخاب در حالت تک‌درس — ۵ درس مشترک + درس جنسیتی (داوری آقایان / فنی تخصصی بانوان)
  const pickableSections = disc && gender
    ? allSections.filter(
        (s) => s.group === disc && (!s.gender || s.gender === gender) && (sectionTotals.get(s.id) ?? 0) > 0
      )
    : []

  const discTitle = disc === 'bodybuilding' ? 'بدنسازی' : 'فیتنس'
  const genderTitle = gender === 'men' ? 'آقایان' : 'بانوان'

  // آزمون‌های آماده در خانه نمایش داده نمی‌شوند — کاربر فقط از آزمون‌ساز می‌سازد
  return (
    <div className="w-full px-4 py-5 sm:px-6 sm:py-7 space-y-4 pb-10">
      {/* greeting */}
      <section className="animate-pop">
        <h2 className="text-3xl font-extrabold">سلام {user?.name}</h2>
        <p className="on-photo text-base mt-1 font-medium">امروز هم یک قدم به قبولی نزدیک‌تر شو.</p>
      </section>

      {/* ساخت آزمون — مشترکین یا اولین آزمون رایگان */}
      <button
        onClick={() => (canBuild ? setBuilderOpen(true) : nav('/subscription'))}
        className="group relative w-full overflow-hidden rounded-3xl bg-gradient-to-l from-indigo-800 via-indigo-600 to-indigo-500 p-5 sm:p-6 text-right shadow-xl shadow-indigo-600/30 ring-1 ring-white/25 ring-inset transition-all hover:brightness-110 active:scale-[0.99] animate-pop"
      >
        {/* حلقه‌های تزئینی + واترمارک */}
        <div className="absolute -top-12 -left-12 size-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-14 right-8 size-28 rounded-full bg-white/10" />
        <Dumbbell className="absolute bottom-10 left-3 size-28 -rotate-12 text-white/[0.06] pointer-events-none" />

        <div className="relative flex items-start justify-between">
          <span className="size-14 rounded-2xl bg-white/15 ring-1 ring-white/30 ring-inset grid place-items-center shadow-lg shadow-indigo-900/30">
            <Wand2 className="size-7 text-white" />
          </span>
          {!canBuild && (
            <span className="flex items-center gap-1 rounded-full bg-black/25 px-3 py-1.5 text-xs font-bold text-amber-200 ring-1 ring-amber-300/40">
              <Lock className="size-3.5" /> ویژه مشترکین
            </span>
          )}
        </div>

        <div className="relative mt-4">
          <h3 className="text-xl font-extrabold text-white">ساخت آزمون</h3>
          <p className="text-sm text-indigo-100 mt-1.5 leading-6">
            {subActive || isAdmin
              ? 'آزمون کتبی تخصصی درجه ۳ • بدنسازی یا فیتنس'
              : freeExamUsed
                ? 'ویژه مشترکین — آزمون‌های تک‌درس و کوییز روزانه رایگان‌اند'
                : 'اولین آزمون جامع شما رایگان است • بدنسازی یا فیتنس'}
          </p>

          {/* ویژگی‌های آزمون */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {['۳۰ سوال', '۶ درس تخصصی', 'بدنسازی و فیتنس'].map((c) => (
              <span key={c} className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-indigo-50 ring-1 ring-white/20">
                {c}
              </span>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-4 flex items-center justify-between border-t border-white/15 pt-3.5">
            <span className="text-sm font-bold text-white">
              {canBuild ? 'شروع ساخت آزمون' : 'فعال‌سازی اشتراک'}
            </span>
            <span className="size-8 rounded-full bg-white/15 ring-1 ring-white/30 ring-inset grid place-items-center transition-transform group-hover:-translate-x-1">
              <ChevronLeft className="size-4 text-white" />
            </span>
          </div>
        </div>
      </button>

      {/* کوییز روزانه — رایگان برای همه */}
      <DailyQuiz />

      {/* آمار و سوابق — ویژه مشترکین */}
      {!canSeeStats && (
        <button
          onClick={() => nav('/subscription')}
          className="card w-full p-4 flex items-center gap-3 text-right animate-pop"
        >
          <span className="size-11 shrink-0 rounded-xl bg-amber-500/15 grid place-items-center">
            <Lock className="size-5 text-amber-600" />
          </span>
          <span className="flex-1">
            <span className="block text-sm font-bold">آمار پیشرفت و سوابق آزمون</span>
            <span className="block text-[11px] text-slate-500 mt-0.5">تحلیل نقاط ضعف، روند نمرات و نتایج قبلی — ویژه مشترکین</span>
          </span>
          <ChevronLeft className="size-4 text-slate-400" />
        </button>
      )}

      {/* weak subjects */}
      {stats?.bySubject?.length > 0 && (
        <section className="card p-4 space-y-3 animate-pop">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <Target className="size-4 text-indigo-600" /> نقاط ضعف من
            </h3>
            <button onClick={() => nav('/stats')} className="text-[11px] font-bold text-indigo-600">همه</button>
          </div>
          {[...stats.bySubject]
            .filter((s) => sectionTotals.has(s.sectionId))
            .sort((a, b) => a.percent - b.percent)
            .slice(0, 3)
            .map((s) => (
            <button key={s.sectionId} onClick={() => nav(`/exam/s-${s.sectionId}`)} className="w-full text-right">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="flex items-center gap-1.5 font-bold text-slate-700">
                  <SectionIcon icon={s.icon} color={s.color} className="size-3.5" />
                  {s.title}
                </span>
                <span className="font-extrabold tabular-nums text-slate-500">{toFa(s.percent)}٪</span>
              </div>
              <div className="h-2 rounded-full bg-[#e6e8f0] overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-l ${sectionGradient(s.color)} transition-all duration-700`}
                  style={{ width: `${s.percent}%` }}
                />
              </div>
            </button>
          ))}
        </section>
      )}

      {/* exam builder modal */}
      {builderOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => !building && closeBuilder()}
        >
          <div
            className="w-full max-w-md max-h-[90dvh] overflow-y-auto bg-white border border-[#e6e8f0] rounded-t-3xl sm:rounded-3xl p-5 pb-8 space-y-4 animate-pop shadow-2xl shadow-indigo-900/20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">ساخت آزمون</h3>
              <button
                onClick={closeBuilder}
                className="size-9 rounded-xl bg-[#f1f2f6] border border-[#e6e8f0] grid place-items-center text-slate-500"
              >
                <X className="size-4" />
              </button>
            </div>

            {!disc ? (
              <>
                <p className="text-xs text-slate-500 leading-6">
                  رشته آزمون کتبی درجه ۳ را انتخاب کنید:
                </p>
                {/* step 1 — discipline picker */}
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { id: 'bodybuilding', title: 'بدنسازی', desc: '۶ درس تخصصی بدنسازی — داوری برای آقایان، فنی تخصصی برای بانوان', icon: Dumbbell },
                    { id: 'fitness', title: 'فیتنس', desc: '۶ درس تخصصی فیتنس — داوری برای آقایان، فنی تخصصی برای بانوان', icon: Activity },
                  ].map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setDisc(d.id)}
                      className="card p-4 text-right transition-all active:scale-[0.98] hover:border-indigo-500/50"
                    >
                      <d.icon className="size-5 text-indigo-600" />
                      <div className="font-bold text-sm mt-2">{d.title}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5 leading-5">{d.desc}</div>
                    </button>
                  ))}
                </div>
              </>
            ) : !gender ? (
              <>
                <button
                  onClick={() => setDisc(null)}
                  className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-600"
                >
                  <ArrowRight className="size-3.5" /> بازگشت — آزمون کتبی تخصصی {discTitle}
                </button>

                {/* step 2 — gender picker: درس ششم آزمون به جنسیت بستگی دارد */}
                <p className="text-xs text-slate-500 leading-6">
                  درس ششم آزمون درجه ۳ برای آقایان «داوری» و برای بانوان «فنی تخصصی» است:
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'men', title: 'آقایان', desc: 'درس ششم: داوری', icon: Dumbbell },
                    { id: 'women', title: 'بانوان', desc: 'درس ششم: فنی تخصصی', icon: Activity },
                  ].map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setGender(g.id)}
                      className="card p-4 text-right transition-all active:scale-[0.98] hover:border-indigo-500/50"
                    >
                      <div className="font-bold text-sm mt-2">{g.title}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5 leading-5">{g.desc}</div>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={() => { setGender(null); setMode(null); setSectionId(null) }}
                  className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-600"
                >
                  <ArrowRight className="size-3.5" /> بازگشت — آزمون کتبی تخصصی {discTitle} {genderTitle}
                </button>

                {/* step 3 — mode picker */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'comprehensive', title: 'آزمون جامع', desc: '۳۰ سوال • ۵ سوال از هر درس', icon: ClipboardList },
                    { id: 'single', title: 'آزمون تک‌درس', desc: '۵ سوال • یک سرفصل', icon: Target },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => { setMode(m.id); if (m.id === 'comprehensive') setSectionId(null) }}
                      className={`card p-4 text-right transition-all active:scale-[0.98] ${
                        mode === m.id ? 'border-indigo-500 bg-indigo-500/10' : ''
                      }`}
                    >
                      <m.icon className={`size-5 ${mode === m.id ? 'text-indigo-600' : 'text-slate-500'}`} />
                      <div className="font-bold text-sm mt-2">{m.title}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{m.desc}</div>
                    </button>
                  ))}
                </div>

                {/* section picker for single mode — فقط سرفصل‌های تخصصی رشته */}
                {mode === 'single' && (
                  <div className="space-y-4">
                    <div>
                      <div className="text-[11px] font-extrabold text-slate-400 mb-2">
                        دروس تخصصی {discTitle} {genderTitle}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {pickableSections.map((sec) => (
                          <button
                            key={sec.id}
                            onClick={() => setSectionId(sec.id)}
                            className={`card p-3.5 flex items-center gap-2.5 transition-all active:scale-[0.98] ${
                              sectionId === sec.id ? 'border-indigo-500 bg-indigo-500/10' : ''
                            }`}
                          >
                            <span className={`size-9 shrink-0 rounded-lg bg-gradient-to-br ${sectionGradient(sec.color)} grid place-items-center`}>
                              <SectionIcon icon={sec.icon} color={sec.color} className="size-4 text-white" />
                            </span>
                            <span className="text-sm font-bold">{sec.title}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={build}
                  disabled={building || !mode || (mode === 'single' && !sectionId)}
                  className="btn-primary w-full !bg-indigo-500 hover:!bg-indigo-400 !shadow-indigo-500/20 disabled:opacity-40"
                >
                  {building ? 'در حال ساخت…' : 'بساز و شروع کن'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
