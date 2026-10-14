import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Crown, ClipboardList, ChevronLeft, LifeBuoy, Rocket, BadgeCheck, Download, ShieldCheck, X, Pencil, Flame, Sparkles, Trophy, Medal, Smartphone, CalendarDays, Target, Camera, Loader2, Trash2 } from 'lucide-react'
import { api, apiUrl, openExternal } from '../lib/api.js'
import { useAuth } from '../lib/auth.jsx'
import { APP_VERSION, compareVersions, UPCOMING } from '../lib/release.js'
import { levelOf } from '../lib/levels.js'
import AvatarEditor from '../components/AvatarEditor.jsx'

const toFa = (n) => (Number.isFinite(Number(n)) ? Number(n).toLocaleString('fa-IR') : '۰')
const toFaDate = (ts) => new Date(ts).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' })

export default function Profile() {
  const { user, logout, updateProfile, updateAvatar, removeAvatar, refresh } = useAuth()
  const nav = useNavigate()
  const [lb, setLb] = useState(null)
  const [release, setRelease] = useState(undefined) // undefined = در حال بارگذاری، null = خطا
  const [updateOpen, setUpdateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editBusy, setEditBusy] = useState(false)
  const [editError, setEditError] = useState('')
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [avatarError, setAvatarError] = useState('')
  const [editorSrc, setEditorSrc] = useState(null) // object URL عکس انتخابی در ویرایشگر
  const fileRef = useRef(null)

  useEffect(() => {
    api('/version').then(setRelease).catch(() => setRelease(null))
    api('/leaderboard?period=all').then(setLb).catch(() => {})
    refresh() // امتیاز/استریک/تعداد آزمون پس از آزمون به‌روز شود
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const sub = user?.subscription
  const subActive = sub && sub.until > Date.now()

  const points = user?.points ?? 0
  const { idx: lvlIdx, level, next: nextLevel, pct: lvlPct } = levelOf(points)

  const updateAvailable = !!release && compareVersions(release.version, APP_VERSION) > 0
  const updateUrl = release?.url ? apiUrl(release.url) : null

  // در اپ بومی با هندلر سیستم باز می‌شود تا دانلود در مرورگر انجام شود
  const openUpdate = () => updateUrl && openExternal(updateUrl)

  const openEdit = () => {
    setEditName(user?.name || '')
    setEditPhone(user?.phone || '')
    setEditError('')
    setEditOpen(true)
  }

  // انتخاب فایل فقط ویرایشگر را باز می‌کند؛ آپلود پس از تایید کراپ انجام می‌شود
  const onPickAvatar = (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // انتخاب دوبارهٔ همان فایل هم change بدهد
    if (!file || avatarBusy) return
    if (!file.type.startsWith('image/')) {
      setAvatarError('فقط فایل تصویری قابل قبول است')
      return
    }
    setAvatarError('')
    setEditorSrc(URL.createObjectURL(file))
  }

  const closeEditor = () => {
    if (editorSrc) URL.revokeObjectURL(editorSrc)
    setEditorSrc(null)
  }

  const onEditorConfirm = async (dataUrl) => {
    if (avatarBusy) return
    setAvatarBusy(true)
    setAvatarError('')
    try {
      await updateAvatar(dataUrl)
      closeEditor()
    } catch (err) {
      setAvatarError(err.message)
      closeEditor()
    } finally {
      setAvatarBusy(false)
    }
  }

  const onRemoveAvatar = async () => {
    if (avatarBusy) return
    setAvatarBusy(true)
    setEditError('')
    try {
      await removeAvatar()
    } catch (err) {
      setEditError(err.message)
    } finally {
      setAvatarBusy(false)
    }
  }

  const saveProfile = async () => {
    const name = editName.trim()
    const phone = editPhone.trim()
    if (!name || editBusy) return
    if (!/^09\d{9}$/.test(phone)) {
      setEditError('شماره موبایل نامعتبر است. مثال: 09123456789')
      return
    }
    setEditBusy(true)
    setEditError('')
    try {
      await updateProfile({ name, phone })
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
            className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-2 text-xs font-bold text-white ring-1 ring-white/30 backdrop-blur transition-colors hover:bg-white/25"
          >
            <Pencil className="size-3.5" /> ویرایش
          </button>
          {subActive && (
            <span className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-amber-400/20 px-3 py-1.5 text-xs font-bold text-amber-200 ring-1 ring-amber-300/50">
              <Crown className="size-3.5" /> {sub.title}
            </span>
          )}
        </div>
        <div className="px-5 pb-5">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickAvatar} />
          <button
            onClick={() => fileRef.current?.click()}
            title="تغییر عکس پروفایل"
            className="relative z-10 -mt-9 grid size-20 place-items-center overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-3xl font-extrabold text-white ring-4 ring-white shadow-lg shadow-indigo-500/30 active:scale-95 transition-transform"
          >
            {user?.avatar ? (
              <img src={apiUrl(user.avatar)} alt={user?.name || ''} className="size-full object-cover" />
            ) : (
              user?.name?.[0] || <User className="size-8" />
            )}
            <span className="absolute inset-x-0 bottom-0 grid place-items-center bg-black/45 py-1">
              {avatarBusy ? <Loader2 className="size-3.5 animate-spin" /> : <Camera className="size-3.5" />}
            </span>
          </button>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xl font-extrabold leading-7">{user?.name}</span>
            <span
              className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold"
              style={{ background: `${level.c}1a`, color: level.c, boxShadow: `inset 0 0 0 1px ${level.c}4d` }}
            >
              <Medal className="size-3.5" /> سطح {toFa(lvlIdx + 1)} • {level.title}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <Smartphone className="size-3.5" /> <span dir="ltr">{user?.phone}</span>
            </span>
            {user?.createdAt && (
              <span className="flex items-center gap-1.5">
                <CalendarDays className="size-3.5" /> عضو از {toFaDate(user.createdAt)}
              </span>
            )}
          </div>
          {avatarError && <div className="mt-2 text-xs font-bold text-rose-600">{avatarError}</div>}

          {/* پیشرفت تا سطح بعد */}
          <div className="mt-4 rounded-2xl border border-indigo-500/15 bg-indigo-500/5 p-3.5">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="flex items-center gap-1.5 font-bold text-slate-600">
                <Sparkles className="size-4 text-amber-500" /> {toFa(points)} <span dir="ltr">XP</span>
              </span>
              <span className="text-slate-500">
                {nextLevel ? `${toFa(nextLevel.min - points)} XP تا «${nextLevel.title}»` : 'بالاترین سطح رسیده‌ای'}
              </span>
            </div>
            <div className="mt-2 h-2 rounded-full border border-indigo-500/10 bg-white overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-l from-indigo-600 to-sky-400 transition-all duration-700"
                style={{ width: `${lvlPct}%` }}
              />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2">
            {[
              { icon: Trophy, label: 'رتبه', value: lb?.me ? `#${toFa(lb.me.rank)}` : '—', cls: 'border-violet-500/20 bg-violet-500/5 text-violet-600' },
              { icon: Target, label: 'بهترین نمره', value: lb?.me ? `${toFa(lb.me.best)}٪` : '—', cls: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-600' },
              { icon: Flame, label: 'روز متوالی', value: toFa(user?.streak ?? 0), cls: 'border-orange-500/20 bg-orange-500/5 text-orange-600' },
              { icon: ClipboardList, label: 'آزمون', value: toFa(user?.exams ?? 0), cls: 'border-indigo-500/20 bg-indigo-500/5 text-indigo-600' },
            ].map((s) => (
              <div key={s.label} className={`rounded-xl border py-3 text-center ${s.cls}`}>
                <div className="flex items-center justify-center gap-1.5 text-base font-extrabold">
                  <s.icon className="size-4" /> {s.value}
                </div>
                <div className="mt-1 text-xs text-slate-500">{s.label}</div>
              </div>
            ))}
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

            <div className="relative">
              <Smartphone className="absolute right-4 top-1/2 -translate-y-1/2 size-5 text-slate-500" />
              <input
                className="input pr-12 text-left"
                dir="ltr"
                inputMode="numeric"
                placeholder="09123456789"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                maxLength={11}
              />
            </div>

            {user?.avatar && (
              <button
                type="button"
                onClick={onRemoveAvatar}
                disabled={avatarBusy}
                className="flex items-center gap-1.5 text-xs font-bold text-rose-600 disabled:opacity-50"
              >
                {avatarBusy ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                حذف عکس پروفایل
              </button>
            )}

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

      {/* ویرایشگر عکس — کراپ/جابه‌جایی/زوم قبل از آپلود */}
      {editorSrc && (
        <AvatarEditor src={editorSrc} busy={avatarBusy} onCancel={closeEditor} onConfirm={onEditorConfirm} />
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
