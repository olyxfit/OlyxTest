import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Crown, ClipboardList, ChevronLeft, LifeBuoy, Lock, Rocket, BadgeCheck, Download, ShieldCheck, X, Pencil, Flame, Sparkles } from 'lucide-react'
import { api, apiUrl, openExternal } from '../lib/api.js'
import { useAuth } from '../lib/auth.jsx'
import { APP_VERSION, compareVersions, UPCOMING } from '../lib/release.js'

const toFa = (n) => (Number.isFinite(Number(n)) ? Number(n).toLocaleString('fa-IR') : '۰')
const toFaDate = (ts) => new Date(ts).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' })

export default function Profile() {
  const { user, logout, updateProfile } = useAuth()
  const nav = useNavigate()
  const [attempts, setAttempts] = useState(null)
  const [release, setRelease] = useState(undefined) // undefined = در حال بارگذاری، null = خطا
  const [updateOpen, setUpdateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editGender, setEditGender] = useState(null) // 'men' | 'women' | null
  const [editBusy, setEditBusy] = useState(false)
  const [editError, setEditError] = useState('')

  useEffect(() => {
    api('/attempts')
      .then(setAttempts)
      .catch((e) => setAttempts(e.code === 'SUBSCRIPTION_REQUIRED' || e.message?.includes('اشتراک') ? 'locked' : []))
    api('/version').then(setRelease).catch(() => setRelease(null))
  }, [])

  const sub = user?.subscription
  const subActive = sub && sub.until > Date.now()

  const updateAvailable = !!release && compareVersions(release.version, APP_VERSION) > 0
  const updateUrl = release?.url ? apiUrl(release.url) : null

  // در اپ بومی با هندلر سیستم باز می‌شود تا دانلود در مرورگر انجام شود
  const openUpdate = () => updateUrl && openExternal(updateUrl)

  const openEdit = () => {
    setEditName(user?.name || '')
    setEditGender(user?.gender ?? null)
    setEditError('')
    setEditOpen(true)
  }

  const saveProfile = async () => {
    const name = editName.trim()
    if (!name || editBusy) return
    setEditBusy(true)
    setEditError('')
    try {
      await updateProfile({ name, gender: editGender })
      setEditOpen(false)
    } catch (e) {
      setEditError(e.message)
    } finally {
      setEditBusy(false)
    }
  }

  return (
    <div className="px-4 py-6 space-y-6 pb-10">
      {/* identity */}
      <section className="card overflow-hidden animate-pop">
        <div className="relative h-24 overflow-hidden bg-gradient-to-l from-indigo-800 via-indigo-600 to-sky-500">
          <div className="absolute -top-10 -left-10 size-32 rounded-full bg-white/10" />
          <div className="absolute -bottom-9 right-1/4 size-20 rounded-full bg-white/10" />
          <button
            onClick={openEdit}
            className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-bold text-white ring-1 ring-white/30 backdrop-blur transition-colors hover:bg-white/25"
          >
            <Pencil className="size-3" /> ویرایش
          </button>
          {subActive && (
            <span className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-amber-400/20 px-2.5 py-1 text-[11px] font-bold text-amber-200 ring-1 ring-amber-300/50">
              <Crown className="size-3" /> {sub.title}
            </span>
          )}
        </div>
        <div className="px-5 pb-5">
          <span className="relative z-10 -mt-9 grid size-20 place-items-center rounded-3xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-3xl font-extrabold text-white ring-4 ring-white shadow-lg shadow-indigo-500/30">
            {user?.name?.[0] || <User className="size-8" />}
          </span>
          <div className="mt-3 text-lg font-extrabold leading-7">{user?.name}</div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
            <span dir="ltr">{user?.phone}</span>
            {user?.gender && <span>{user.gender === 'men' ? 'آقا' : 'بانو'}</span>}
            {user?.createdAt && <span>عضو از {toFaDate(user.createdAt)}</span>}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 py-2.5 text-center">
              <div className="flex items-center justify-center gap-1 text-sm font-extrabold text-amber-600">
                <Sparkles className="size-3.5" /> {toFa(user?.points ?? 0)}
              </div>
              <div className="mt-0.5 text-[10px] text-slate-500">امتیاز</div>
            </div>
            <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 py-2.5 text-center">
              <div className="flex items-center justify-center gap-1 text-sm font-extrabold text-orange-600">
                <Flame className="size-3.5" /> {toFa(user?.streak ?? 0)}
              </div>
              <div className="mt-0.5 text-[10px] text-slate-500">روز متوالی</div>
            </div>
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 py-2.5 text-center">
              <div className="flex items-center justify-center gap-1 text-sm font-extrabold text-indigo-600">
                <ClipboardList className="size-3.5" /> {Array.isArray(attempts) ? toFa(attempts.length) : '—'}
              </div>
              <div className="mt-0.5 text-[10px] text-slate-500">آزمون</div>
            </div>
          </div>
        </div>
      </section>

      {/* گزینه‌ها */}
      <section className="space-y-3 animate-pop">
        <button
          onClick={() => nav('/subscription')}
          className="card w-full p-4 flex items-center gap-3 hover:border-amber-500/40 transition-colors text-right"
        >
          <span className="size-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 grid place-items-center shadow-lg shadow-amber-500/25">
            <Crown className="size-5 text-[#0b0f14]" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm">اشتراک</div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {subActive ? `${sub.title} — تا ${toFaDate(sub.until)}` : 'خرید یا تمدید اشتراک'}
            </div>
          </div>
          <ChevronLeft className="size-4.5 text-slate-400 shrink-0" />
        </button>

        <button
          onClick={() => nav('/panel?tab=support')}
          className="card w-full p-4 flex items-center gap-3 hover:border-indigo-500/40 transition-colors text-right"
        >
          <span className="size-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 grid place-items-center shadow-lg shadow-indigo-500/25">
            <LifeBuoy className="size-5 text-white" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm">پشتیبانی</div>
            <div className="text-[11px] text-slate-500 mt-0.5">گفتگو در تلگرام و سوالات پرتکرار</div>
          </div>
          <ChevronLeft className="size-4.5 text-slate-400 shrink-0" />
        </button>

        <button
          onClick={() => setUpdateOpen(true)}
          className="card w-full p-4 flex items-center gap-3 hover:border-indigo-500/40 transition-colors text-right"
        >
          <span className="size-10 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 grid place-items-center shadow-lg shadow-sky-500/25">
            <Rocket className="size-5 text-white" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm">به‌روزرسانی و نسخه‌های بعدی</div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              نسخهٔ فعلی <span dir="ltr">v{APP_VERSION}</span>
              {updateAvailable ? ' — نسخهٔ جدید موجود است' : ''}
            </div>
          </div>
          <ChevronLeft className="size-4.5 text-slate-400 shrink-0" />
        </button>

        {user?.admin && (
          <button
            onClick={() => openExternal(apiUrl('/admin'))}
            className="card w-full p-4 flex items-center gap-3 hover:border-violet-500/40 transition-colors text-right border-violet-200 bg-violet-50/50"
          >
            <span className="size-10 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 grid place-items-center shadow-lg shadow-violet-500/25">
              <ShieldCheck className="size-5 text-white" />
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm">پنل مدیریت (وب)</div>
              <div className="text-[11px] text-slate-500 mt-0.5">باز شدن داشبرد جداگانه — کاربران، سفارش‌ها و آمار</div>
            </div>
            <ChevronLeft className="size-4.5 text-slate-400 shrink-0" />
          </button>
        )}
      </section>

      {/* exam history */}
      <section className="space-y-3 animate-pop">
        <div className="flex items-center justify-between">
          <h3 className="font-bold flex items-center gap-2">
            <ClipboardList className="size-4.5 text-emerald-600" /> آزمون‌های من
          </h3>
          {Array.isArray(attempts) && (
            <span className="text-[11px] text-slate-500">{toFa(attempts.length)} آزمون</span>
          )}
        </div>
        {!attempts ? (
          <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="skeleton h-16" />)}</div>
        ) : attempts === 'locked' ? (
          <button
            onClick={() => nav('/subscription')}
            className="card w-full p-4 flex items-center gap-3 text-right"
          >
            <span className="size-10 shrink-0 rounded-xl bg-amber-500/15 grid place-items-center">
              <Lock className="size-4.5 text-amber-600" />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-bold">سوابق آزمون ویژه مشترکین است</span>
              <span className="block text-[11px] text-slate-500 mt-0.5">با اشتراک، نتایج همهٔ آزمون‌هایتان اینجا می‌ماند</span>
            </span>
            <ChevronLeft className="size-4 text-slate-400 shrink-0" />
          </button>
        ) : attempts.length === 0 ? (
          <div className="card p-6 text-center text-sm text-slate-500">
            هنوز آزمونی نداده‌اید — از صفحهٔ خانه یک آزمون بسازید.
          </div>
        ) : (
          <div className="space-y-2.5">
            {attempts.map((a) => (
              <button
                key={a.id}
                onClick={() => nav(`/result/${a.id}`)}
                className="card w-full p-3.5 flex items-center justify-between gap-3 text-right hover:border-indigo-300 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate">{a.examTitle}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {a.sectionTitle} • {toFa(a.correct)}/{toFa(a.total)} درست • {toFaDate(a.createdAt)}
                  </div>
                </div>
                <span
                  className={`shrink-0 text-xs font-bold rounded-full px-2.5 py-1 ${
                    a.score >= 70
                      ? 'text-emerald-600 bg-emerald-500/10'
                      : a.score >= 50
                      ? 'text-amber-500 bg-amber-500/10'
                      : 'text-rose-600 bg-rose-500/10'
                  }`}
                >
                  {toFa(a.score)}٪
                </span>
                <ChevronLeft className="size-4 text-slate-400 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </section>

      <button
        onClick={logout}
        className="w-full card p-3.5 text-sm font-bold text-rose-600 hover:border-rose-500/40 transition-colors"
      >
        خروج از حساب
      </button>

      {/* پاپ‌آپ ویرایش اطلاعات */}
      {editOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => !editBusy && setEditOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white border border-[#e6e8f0] rounded-t-3xl sm:rounded-3xl p-5 pb-8 space-y-4 animate-pop shadow-2xl shadow-indigo-900/20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2">
                <Pencil className="size-4.5 text-indigo-600" /> ویرایش اطلاعات
              </h3>
              <button
                onClick={() => setEditOpen(false)}
                className="size-9 rounded-xl bg-[#f1f2f6] border border-[#e6e8f0] grid place-items-center text-slate-500"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="relative">
              <User className="absolute right-4 top-1/2 -translate-y-1/2 size-5 text-slate-500" />
              <input
                className="input pr-12"
                placeholder="نام و نام خانوادگی"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={60}
                autoFocus
              />
            </div>

            <div>
              <div className="text-[11px] font-bold text-slate-400 mb-2">جنسیت (اختیاری)</div>
              <div className="grid grid-cols-2 gap-2">
                {[{ id: 'men', title: 'آقا' }, { id: 'women', title: 'بانو' }].map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setEditGender(editGender === g.id ? null : g.id)}
                    className={`card p-3 text-sm font-bold transition-all active:scale-[0.98] ${
                      editGender === g.id ? 'border-indigo-500 bg-indigo-500/10 text-indigo-700' : 'text-slate-600'
                    }`}
                  >
                    {g.title}
                  </button>
                ))}
              </div>
            </div>

            {editError && (
              <div className="text-sm text-rose-600 bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3">
                {editError}
              </div>
            )}

            <button onClick={saveProfile} disabled={editBusy || !editName.trim()} className="btn-primary">
              {editBusy ? 'در حال ذخیره…' : 'ذخیره تغییرات'}
            </button>
          </div>
        </div>
      )}

      {/* پاپ‌آپ به‌روزرسانی و نسخه‌های بعدی */}
      {updateOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setUpdateOpen(false)}
        >
          <div
            className="w-full max-w-md max-h-[85dvh] overflow-y-auto bg-white border border-[#e6e8f0] rounded-t-3xl sm:rounded-3xl p-5 pb-8 space-y-4 animate-pop shadow-2xl shadow-indigo-900/20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2">
                <Rocket className="size-4.5 text-indigo-600" /> به‌روزرسانی
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400" dir="ltr">v{APP_VERSION}</span>
                <button
                  onClick={() => setUpdateOpen(false)}
                  className="size-9 rounded-xl bg-[#f1f2f6] border border-[#e6e8f0] grid place-items-center text-slate-500"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {release === undefined ? (
              <div className="skeleton h-12" />
            ) : (
              <div
                className={`flex items-center gap-3 rounded-2xl border p-3 ${
                  updateAvailable
                    ? 'border-indigo-500/30 bg-indigo-500/5'
                    : 'border-emerald-500/30 bg-emerald-500/5'
                }`}
              >
                <span
                  className={`size-9 rounded-xl grid place-items-center shrink-0 ${
                    updateAvailable ? 'bg-indigo-500/15 text-indigo-600' : 'bg-emerald-500/15 text-emerald-600'
                  }`}
                >
                  {updateAvailable ? <Download className="size-4.5" /> : <BadgeCheck className="size-4.5" />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold">
                    {updateAvailable ? (
                      <>نسخهٔ <span dir="ltr">{release.version}</span> منتشر شده</>
                    ) : release === null ? (
                      'وضعیت نسخه نامشخص است'
                    ) : (
                      'اپلیکیشن به‌روز است'
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {updateAvailable
                      ? 'برای دریافت جدیدترین امکانات، نسخهٔ جدید را نصب کنید'
                      : release === null
                      ? 'ارتباط با سرور برقرار نشد — بعداً دوباره بررسی کنید'
                      : 'آخرین نسخهٔ منتشرشده را استفاده می‌کنید'}
                  </div>
                </div>
                {updateAvailable && updateUrl && (
                  <button
                    onClick={openUpdate}
                    className="shrink-0 rounded-xl bg-indigo-500 hover:bg-indigo-400 px-3 py-2 text-[11px] font-bold text-white transition-colors active:scale-95"
                  >
                    به‌روزرسانی
                  </button>
                )}
              </div>
            )}

            <div className="space-y-2">
              <div className="text-[11px] font-bold text-slate-400">به‌زودی در نسخه‌های بعدی</div>
              <ul className="space-y-1.5">
                {UPCOMING.map((u) => (
                  <li key={u} className="flex items-center gap-2 text-[13px] text-slate-600">
                    <span className="size-1.5 rounded-full bg-indigo-400 shrink-0" />
                    {u}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
