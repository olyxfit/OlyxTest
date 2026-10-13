import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, ArrowRight, ChevronDown, ChevronLeft, ClipboardList, Dumbbell, Flag, Lock, Target, Wand2, X } from 'lucide-react'
import { api } from '../lib/api.js'
import { useAuth } from '../lib/auth.jsx'
import SectionIcon, { sectionGradient } from '../components/SectionIcon.jsx'
import DailyQuiz from '../components/DailyQuiz.jsx'

const toFa = (n) => Number(n).toLocaleString('fa-IR')

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
  const [openGroup, setOpenGroup] = useState(null) // آکاردئون گروه‌های آزمون جامع
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

  // آزمون‌های آماده — جامع‌ها به تفکیک رشته×جنسیت، آزمون فدراسیون و تک‌درس‌ها
  const DISC_TITLES = { bodybuilding: 'بدنسازی', fitness: 'فیتنس' }
  const G_TITLES = { men: 'آقایان', women: 'بانوان' }
  const compGroups = ['bodybuilding/men', 'bodybuilding/women', 'fitness/men', 'fitness/women']
    .map((key) => {
      const [d, g] = key.split('/')
      return { key, d, g, list: (exams ?? []).filter((e) => e.type === 'comprehensive' && e.discipline === d && e.gender === g) }
    })
    .filter((x) => x.list.length > 0)
  const fedExams = (exams ?? []).filter((e) => e.type === 'federation')
  const singleExams = (exams ?? []).filter((e) => e.type === 'single')

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
        className="w-full p-4 flex items-center gap-3 text-right rounded-2xl bg-gradient-to-l from-indigo-800 via-indigo-600 to-indigo-500 shadow-lg shadow-indigo-600/30 ring-1 ring-white/25 ring-inset transition-all hover:brightness-110 active:scale-[0.99] animate-pop"
      >
        <span className="size-11 shrink-0 rounded-xl bg-white/15 ring-1 ring-white/30 ring-inset grid place-items-center">
          <Wand2 className="size-5 text-white" />
        </span>
        <span className="flex-1">
          <span className="block text-sm font-bold text-white flex items-center gap-1.5">
            ساخت آزمون
            {!canBuild && <Lock className="size-3.5 text-amber-300" />}
          </span>
          <span className="block text-[11px] text-indigo-100 mt-0.5">
            {subActive || isAdmin
              ? 'آزمون کتبی تخصصی درجه ۳ • بدنسازی یا فیتنس'
              : freeExamUsed
                ? 'ویژه مشترکین — آزمون‌های تک‌درس و کوییز روزانه رایگان‌اند'
                : 'اولین آزمون جامع شما رایگان است • بدنسازی یا فیتنس'}
          </span>
        </span>
        <ChevronLeft className="size-4 text-indigo-200" />
      </button>

      {/* کوییز روزانه — رایگان برای همه */}
      <DailyQuiz />

      {/* آزمون‌های آماده */}
      {exams && (fedExams.length > 0 || compGroups.length > 0 || singleExams.length > 0) && (
        <section className="space-y-3 animate-pop">
          <h3 className="font-bold text-sm px-1 flex items-center gap-2">
            <ClipboardList className="size-4 text-indigo-600" /> آزمون‌های آماده
          </h3>

          {/* آزمون فدراسیون — سوالات واقعی ادوار گذشته */}
          {fedExams.map((e) => (
            <button
              key={e.id}
              onClick={() => nav(`/exam/${e.id}`)}
              className="card w-full p-4 flex items-center gap-3 text-right border-rose-200 bg-gradient-to-l from-rose-500/10 to-transparent hover:border-rose-400 transition-colors"
            >
              <span className="size-11 shrink-0 rounded-xl bg-gradient-to-br from-rose-500 to-rose-700 grid place-items-center shadow-lg shadow-rose-500/25">
                <Flag className="size-5 text-white" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-2 text-sm font-bold">
                  {e.title}
                  {e.locked && <Lock className="size-3.5 text-amber-500" />}
                  {e.trial && <span className="text-[9px] font-bold text-emerald-600 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-1.5 py-0.5">رایگان</span>}
                </span>
                <span className="block text-[11px] text-slate-500 mt-0.5 truncate">{e.description}</span>
              </span>
              <ChevronLeft className="size-4 text-slate-400 shrink-0" />
            </button>
          ))}

          {/* آزمون‌های جامع — آکاردئون به تفکیک رشته و جنسیت */}
          {compGroups.map((grp) => (
            <div key={grp.key} className="card overflow-hidden">
              <button
                onClick={() => setOpenGroup(openGroup === grp.key ? null : grp.key)}
                className="w-full p-4 flex items-center justify-between text-right"
              >
                <span className="text-sm font-bold">آزمون جامع {DISC_TITLES[grp.d]} {G_TITLES[grp.g]}</span>
                <span className="flex items-center gap-2 text-[11px] text-slate-500">
                  {toFa(grp.list.length)} سری
                  <ChevronDown className={`size-4 transition-transform ${openGroup === grp.key ? 'rotate-180' : ''}`} />
                </span>
              </button>
              {openGroup === grp.key && (
                <div className="divide-y divide-[#e6e8f0] border-t border-[#e6e8f0]">
                  {grp.list.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => nav(`/exam/${e.id}`)}
                      className="w-full px-4 py-3 flex items-center justify-between text-right hover:bg-slate-50 transition-colors"
                    >
                      <span className="flex items-center gap-2 text-xs font-bold">
                        سری {toFa(e.series)}
                        {e.locked && <Lock className="size-3.5 text-amber-500" />}
                        {e.trial && <span className="text-[9px] font-bold text-emerald-600 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-1.5 py-0.5">رایگان</span>}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-slate-400">
                        {toFa(e.totalQuestions)} سوال • {toFa(e.timeMinutes)} دقیقه
                        <ChevronLeft className="size-3" />
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* آزمون‌های تک‌درس — رایگان برای همه */}
          {singleExams.length > 0 && (
            <div className="card p-4">
              <div className="text-sm font-bold mb-3 flex items-center justify-between">
                آزمون‌های تک‌درس
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-2 py-0.5">رایگان</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {singleExams.map((e) => {
                  const sec = e.sections.find((s) => s.id === e.sectionId)
                  return (
                    <button
                      key={e.id}
                      onClick={() => nav(`/exam/${e.id}`)}
                      className="flex items-center gap-2 p-2.5 rounded-xl border border-[#e6e8f0] text-right hover:border-indigo-300 transition-colors"
                    >
                      <span className={`size-8 shrink-0 rounded-lg bg-gradient-to-br ${sectionGradient(sec?.color)} grid place-items-center`}>
                        <SectionIcon icon={sec?.icon} color={sec?.color} className="size-4 text-white" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[11px] font-bold truncate">{sec?.title || e.title}</span>
                        <span className="block text-[9px] text-slate-400">{toFa(e.totalQuestions)} سوال</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </section>
      )}

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

      {/* recent attempts */}
      {attempts.length > 0 && (
        <section className="card overflow-hidden animate-pop">
          <div className="px-4 py-3 text-sm font-semibold border-b border-[#e6e8f0]">آخرین نتایج</div>
          <div className="divide-y divide-[#e6e8f0]">
            {attempts.slice(0, 3).map((a) => (
              <div key={a.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="text-sm font-bold">{a.sectionTitle}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {a.examTitle} • {new Date(a.createdAt).toLocaleDateString('fa-IR')}
                  </div>
                </div>
                <span
                  className={`text-sm font-extrabold px-2.5 py-1 rounded-lg ${
                    a.score >= 70
                      ? 'text-emerald-600 bg-emerald-500/10'
                      : a.score >= 50
                      ? 'text-amber-500 bg-amber-500/10'
                      : 'text-rose-600 bg-rose-500/10'
                  }`}
                >
                  {toFa(a.score)}٪
                </span>
              </div>
            ))}
          </div>
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
