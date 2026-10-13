import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowRight, Bell, ChevronDown, ClipboardList, Crown, LayoutDashboard, LifeBuoy, Mail, Megaphone, MessageSquare,
  Rocket, Search, Send, ShieldCheck, ShoppingBag, Star, Trash2, Users, Wallet,
} from 'lucide-react'
import { api } from '../lib/api.js'
import { useAuth } from '../lib/auth.jsx'
import { UPCOMING } from '../lib/release.js'

const toFa = (n) => Number(n).toLocaleString('fa-IR')
const faDate = (ts) =>
  new Date(ts).toLocaleDateString('fa-IR', { day: 'numeric', month: 'long', year: 'numeric' })

// ─── راه‌های ارتباطی پشتیبانی — این مقادیر را با اطلاعات واقعی جایگزین کنید ───
const SUPPORT_CHANNELS = [
  { icon: MessageSquare, label: 'تلگرام', value: 'آیدی عددی: 8561413993', href: 'tg://openmessage?user_id=8561413993' },
  { icon: Mail, label: 'ایمیل', value: 'support@example.com', href: 'mailto:support@example.com' },
  { icon: LifeBuoy, label: 'پاسخگویی', value: 'همه‌روزه ۹ تا ۲۱', href: null },
]

const FAQ = [
  { q: 'نمره‌ی آزمون چطور محاسبه می‌شود؟', a: 'درصد پاسخ‌های درست از کل سوالات. هر پاسخ درست ۱۰ امتیاز هم به حساب شما اضافه می‌کند.' },
  { q: 'استریک روزانه چیست؟', a: 'اگر هر روز حداقل یک آزمون کامل کنید، شمارنده‌ی روزهای متوالی شما یکی افزایش می‌یابد. یک روز جا بماند، از اول شروع می‌شود.' },
  { q: 'اشتراک چه مزیتی دارد؟', a: 'کوییز روزانه، آزمون‌های تک‌درس و اولین آزمون جامع رایگان است؛ اشتراک دسترسی نامحدود به همه آزمون‌های جامع و آزمون‌ساز می‌دهد.' },
]

function Stars({ value, onChange, size = 'size-6' }) {
  return (
    <span className="flex items-center gap-1" dir="ltr">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(i)}
          className={onChange ? 'active:scale-90 transition-transform' : 'pointer-events-none'}
        >
          <Star
            className={`${size} ${i <= value ? 'fill-indigo-400 text-indigo-400' : 'text-slate-300'}`}
          />
        </button>
      ))}
    </span>
  )
}

export default function Panel() {
  const { user } = useAuth()
  const nav = useNavigate()
  const isAdmin = !!user?.admin

  const [searchParams] = useSearchParams()
  const initialTab = ['news', 'feedback', 'support'].includes(searchParams.get('tab'))
    ? searchParams.get('tab')
    : 'news'
  const [tab, setTab] = useState(initialTab)
  const [news, setNews] = useState(null)
  const [mine, setMine] = useState(null)
  const [allFeedback, setAllFeedback] = useState(null)

  // داشبرد مدیریتی
  const [adminTab, setAdminTab] = useState('dash') // dash | users | orders | reviews
  const [overview, setOverview] = useState(null)
  const [adminUsers, setAdminUsers] = useState(null)
  const [adminOrders, setAdminOrders] = useState(null)
  const [userQuery, setUserQuery] = useState('')
  const [expandedUser, setExpandedUser] = useState(null)
  const [subBusy, setSubBusy] = useState(false)

  // اعلان جدید (ادمین)
  const [aTitle, setATitle] = useState('')
  const [aBody, setABody] = useState('')
  // فرم نظر
  const [rating, setRating] = useState(0)
  const [text, setText] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [openFaq, setOpenFaq] = useState(-1)

  const loadNews = () => api('/announcements').then((d) => setNews(d.list)).catch(() => setNews([]))
  const loadMine = () => api('/feedback/mine').then((d) => setMine(d.list)).catch(() => setMine([]))
  const loadAll = () => api('/admin/feedback').then((d) => setAllFeedback(d.list)).catch(() => setAllFeedback([]))
  const loadOverview = () => api('/admin/overview').then(setOverview).catch(() => setOverview({}))
  const loadUsers = () => api('/admin/users').then((d) => setAdminUsers(d.list)).catch(() => setAdminUsers([]))
  const loadOrders = () => api('/admin/orders').then((d) => setAdminOrders(d.list)).catch(() => setAdminOrders([]))

  useEffect(() => {
    if (tab === 'news') loadNews()
    if (tab === 'feedback') loadMine()
    if (tab === 'admin' && isAdmin) {
      loadAll()
      loadOverview()
      loadUsers()
      loadOrders()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  // اعطا یا حذف اشتراک کاربر — از داشبرد مدیریتی
  const setSub = async (userId, plan) => {
    if (subBusy) return
    setSubBusy(true)
    try {
      if (plan) await api(`/admin/users/${userId}/subscription`, { method: 'POST', body: { plan } })
      else await api(`/admin/users/${userId}/subscription`, { method: 'DELETE' })
      loadUsers()
      loadOverview()
    } catch (e) {
      alert(e.message)
    } finally {
      setSubBusy(false)
    }
  }

  const postAnnouncement = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      await api('/announcements', { method: 'POST', body: { title: aTitle, body: aBody } })
      setATitle('')
      setABody('')
      loadNews()
    } catch (err) {
      alert(err.message)
    } finally {
      setBusy(false)
    }
  }

  const removeAnnouncement = async (id) => {
    await api(`/announcements/${id}`, { method: 'DELETE' }).catch(() => {})
    loadNews()
  }

  const sendFeedback = async (e) => {
    e.preventDefault()
    setMsg('')
    setBusy(true)
    try {
      await api('/feedback', { method: 'POST', body: { rating, text } })
      setText('')
      setRating(0)
      setMsg('نظر شما ثبت شد — ممنون از همراهیتان!')
      loadMine()
    } catch (err) {
      setMsg(err.message)
    } finally {
      setBusy(false)
    }
  }

  const removeFeedback = async (id) => {
    await api(`/admin/feedback/${id}`, { method: 'DELETE' }).catch(() => {})
    loadAll()
  }

  const TABS = [
    { id: 'news', label: 'اعلان‌ها', icon: Megaphone },
    { id: 'feedback', label: 'نظر شما', icon: Star },
    { id: 'support', label: 'پشتیبانی', icon: LifeBuoy },
    ...(isAdmin ? [{ id: 'admin', label: 'مدیریت', icon: ShieldCheck }] : []),
  ]

  return (
    <div className="px-4 py-6 space-y-5 pb-10">
      <button onClick={() => nav('/')} className="on-photo flex items-center gap-1.5 text-sm hover:text-slate-800">
        <ArrowRight className="size-4" /> بازگشت
      </button>

      {/* title */}
      <div className="flex items-center gap-3 animate-pop">
        <span className="size-11 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-800 grid place-items-center shadow-lg shadow-indigo-500/25">
          <Bell className="size-5 text-white" />
        </span>
        <div>
          <h2 className="text-xl font-extrabold">اطلاع‌رسانی و پشتیبانی</h2>
          <p className="on-photo text-xs mt-0.5">اخبار نسخه‌های بعدی، نظرات و راه‌های ارتباطی</p>
        </div>
      </div>

      {/* tabs */}
      <div className={`grid gap-2 card p-1.5`} style={{ gridTemplateColumns: `repeat(${TABS.length}, 1fr)` }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              tab === t.id
                ? 'bg-gradient-to-l from-indigo-800 to-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <t.icon className="size-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── اعلان‌ها ─── */}
      {tab === 'news' && (
        <div className="space-y-3">
          {/* نسخه‌ی بعدی چه می‌آید؟ */}
          <div className="card p-4 border-indigo-200 bg-gradient-to-l from-indigo-500/10 to-transparent animate-pop">
            <div className="font-bold text-sm flex items-center gap-2 text-indigo-700">
              <Rocket className="size-4" /> نسخه‌ی بعدی چه می‌آید؟
            </div>
            <ul className="mt-2.5 space-y-1.5">
              {UPCOMING.map((u) => (
                <li key={u} className="text-xs text-slate-600 flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-indigo-500 shrink-0" />
                  {u}
                </li>
              ))}
            </ul>
          </div>

          {isAdmin && (
            <form onSubmit={postAnnouncement} className="card p-4 space-y-3 border-indigo-200 animate-pop">
              <div className="text-sm font-bold flex items-center gap-2 text-indigo-700">
                <ShieldCheck className="size-4" /> اعلان جدید (مدیر)
              </div>
              <input
                className="input"
                placeholder="عنوان — مثلاً: نسخه‌ی ۲ در راه است"
                value={aTitle}
                onChange={(e) => setATitle(e.target.value)}
                required
              />
              <textarea
                className="input min-h-24 resize-y"
                placeholder="متن اعلان برای همه‌ی کاربران…"
                value={aBody}
                onChange={(e) => setABody(e.target.value)}
                required
              />
              <button className="btn-primary" disabled={busy}>
                انتشار اعلان
              </button>
            </form>
          )}

          {!news ? (
            <div className="space-y-2.5">{[1, 2].map((i) => <div key={i} className="skeleton h-20" />)}</div>
          ) : news.length === 0 ? (
            <div className="card p-8 text-center text-sm text-slate-500 animate-pop">
              <Megaphone className="size-8 mx-auto text-slate-300 mb-3" />
              هنوز اعلانی منتشر نشده — به‌زودی خبرهای نسخه‌ی بعدی اینجا می‌رسد.
            </div>
          ) : (
            news.map((a, i) => (
              <article key={a.id} className="card p-4 animate-pop" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-bold text-sm">{a.title}</h3>
                  <span className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-slate-400">{faDate(a.createdAt)}</span>
                    {isAdmin && (
                      <button
                        onClick={() => removeAnnouncement(a.id)}
                        className="text-slate-300 hover:text-rose-500 transition-colors"
                        title="حذف اعلان"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </span>
                </div>
                <p className="text-sm text-slate-500 leading-7 mt-2 whitespace-pre-wrap">{a.body}</p>
              </article>
            ))
          )}
        </div>
      )}

      {/* ─── نظر شما ─── */}
      {tab === 'feedback' && (
        <div className="space-y-3">
          <form onSubmit={sendFeedback} className="card p-4 space-y-4 animate-pop">
            <div>
              <div className="font-bold text-sm">به اپ چه امتیازی می‌دهید؟</div>
              <div className="mt-2.5 flex justify-center">
                <Stars value={rating} onChange={setRating} />
              </div>
            </div>
            <textarea
              className="input min-h-28 resize-y"
              placeholder="نظر، پیشنهاد یا انتقاد شما…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              required
              minLength={3}
            />
            {msg && (
              <div className={`text-xs font-bold rounded-xl px-3.5 py-2.5 ${
                msg.includes('ممنون')
                  ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                  : 'text-rose-600 bg-rose-50 border border-rose-200'
              }`}>
                {msg}
              </div>
            )}
            <button className="btn-primary flex items-center justify-center gap-2" disabled={busy || text.trim().length < 3}>
              <Send className="size-4" />
              ارسال نظر
            </button>
          </form>

          {mine?.length > 0 && (
            <div className="space-y-2.5">
              <div className="text-xs font-bold text-slate-500">نظرهای قبلی شما</div>
              {mine.map((f) => (
                <div key={f.id} className="card p-4">
                  <div className="flex items-center justify-between">
                    <Stars value={f.rating} size="size-4" />
                    <span className="text-[10px] text-slate-400">{faDate(f.createdAt)}</span>
                  </div>
                  <p className="text-sm text-slate-600 leading-7 mt-2">{f.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── پشتیبانی ─── */}
      {tab === 'support' && (
        <div className="space-y-3">
          <div className="card p-5 text-center animate-pop">
            <span className="size-14 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-800 grid place-items-center shadow-lg shadow-indigo-500/25">
              <LifeBuoy className="size-7 text-white" />
            </span>
            <h3 className="font-bold mt-3">در کنار شما هستیم</h3>
            <p className="text-xs text-slate-500 leading-6 mt-1.5">
              برای گزارش مشکل، سوال درباره‌ی سوالات یا درخواست فیچر جدید از راه‌های زیر با ما در تماس باشید.
            </p>
          </div>

          {SUPPORT_CHANNELS.map((c) => {
            const inner = (
              <>
                <span className="size-10 rounded-xl bg-indigo-50 border border-indigo-100 grid place-items-center text-indigo-600">
                  <c.icon className="size-5" />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-bold">{c.label}</span>
                  <span className="block text-xs text-slate-500 mt-0.5" dir="ltr" style={{ textAlign: 'right' }}>{c.value}</span>
                </span>
              </>
            )
            return c.href ? (
              <a key={c.label} href={c.href} target="_blank" rel="noreferrer"
                className="card p-4 flex items-center gap-3 hover:border-indigo-300 transition-all animate-pop">
                {inner}
              </a>
            ) : (
              <div key={c.label} className="card p-4 flex items-center gap-3 animate-pop">{inner}</div>
            )
          })}

          <div className="pt-1">
            <div className="text-xs font-bold text-slate-500 mb-2.5">سوالات پرتکرار</div>
            <div className="space-y-2.5">
              {FAQ.map((f, i) => (
                <div key={i} className="card overflow-hidden animate-pop" style={{ animationDelay: `${i * 50}ms` }}>
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
                    className="w-full p-4 flex items-center justify-between text-right"
                  >
                    <span className="text-sm font-bold">{f.q}</span>
                    <ChevronDown className={`size-4 text-slate-400 shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                  </button>
                  {openFaq === i && (
                    <p className="px-4 pb-4 text-sm text-slate-500 leading-7">{f.a}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── مدیریت (ادمین) ─── */}
      {tab === 'admin' && isAdmin && (
        <div className="space-y-3">
          {/* زیرتب‌های داشبرد */}
          <div className="grid grid-cols-4 gap-1.5 card p-1.5">
            {[
              { id: 'dash', label: 'نمای کلی', icon: LayoutDashboard },
              { id: 'users', label: 'کاربران', icon: Users },
              { id: 'orders', label: 'سفارش‌ها', icon: ShoppingBag },
              { id: 'reviews', label: 'نظرها', icon: Star },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setAdminTab(t.id)}
                className={`py-2 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1 ${
                  adminTab === t.id
                    ? 'bg-gradient-to-l from-violet-700 to-violet-500 text-white shadow-lg shadow-violet-500/20'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <t.icon className="size-3.5" />
                {t.label}
              </button>
            ))}
          </div>

          {/* نمای کلی */}
          {adminTab === 'dash' && (
            !overview ? (
              <div className="grid grid-cols-2 gap-2.5">{[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-20" />)}</div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { label: 'کاربران', value: overview.users, icon: Users, tint: 'text-indigo-600 bg-indigo-500/10' },
                  { label: 'مشترکین فعال', value: overview.activeSubs, icon: Crown, tint: 'text-amber-600 bg-amber-500/10' },
                  { label: 'آزمون‌های برگزارشده', value: overview.attempts, icon: ClipboardList, tint: 'text-emerald-600 bg-emerald-500/10' },
                  { label: 'میانگین نمره', value: `${toFa(overview.avgScore ?? 0)}٪`, icon: Star, tint: 'text-sky-600 bg-sky-500/10' },
                  { label: 'درآمد (تومان)', value: toFa(Math.round((overview.revenueRial ?? 0) / 10)), icon: Wallet, tint: 'text-violet-600 bg-violet-500/10' },
                  { label: 'سفارش موفق / در انتظار', value: `${toFa(overview.paidOrders ?? 0)} / ${toFa(overview.pendingOrders ?? 0)}`, icon: ShoppingBag, tint: 'text-rose-600 bg-rose-500/10' },
                  { label: 'سوال در بانک', value: overview.questions, icon: MessageSquare, tint: 'text-teal-600 bg-teal-500/10' },
                  { label: 'نظرها / اعلان‌ها', value: `${toFa(overview.feedback ?? 0)} / ${toFa(overview.announcements ?? 0)}`, icon: Megaphone, tint: 'text-slate-600 bg-slate-500/10' },
                ].map((c) => (
                  <div key={c.label} className="card p-3.5 animate-pop">
                    <span className={`size-8 rounded-lg grid place-items-center ${c.tint}`}>
                      <c.icon className="size-4" />
                    </span>
                    <div className="text-base font-extrabold mt-2 tabular-nums">{typeof c.value === 'string' ? c.value : toFa(c.value ?? 0)}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{c.label}</div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* کاربران */}
          {adminTab === 'users' && (
            <div className="space-y-2.5">
              <div className="relative">
                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <input
                  className="input !py-2.5 pr-10 text-xs"
                  placeholder="جست‌وجوی نام یا شماره…"
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                />
              </div>
              {!adminUsers ? (
                <div className="space-y-2.5">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-16" />)}</div>
              ) : (
                adminUsers
                  .filter((u) => !userQuery || u.name?.includes(userQuery) || u.phone?.includes(userQuery))
                  .map((u) => {
                    const active = u.subscription && u.subscription.until > Date.now()
                    const open = expandedUser === u.id
                    return (
                      <div key={u.id} className="card overflow-hidden animate-pop">
                        <button onClick={() => setExpandedUser(open ? null : u.id)} className="w-full p-3.5 flex items-center gap-3 text-right">
                          <span className="size-9 shrink-0 rounded-xl bg-indigo-500/10 text-indigo-600 grid place-items-center text-xs font-extrabold">
                            {u.name?.[0] || <Users className="size-4" />}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="flex items-center gap-1.5 text-sm font-bold truncate">
                              {u.name}
                              {u.admin && <span className="text-[9px] font-bold text-violet-600 bg-violet-500/10 border border-violet-500/30 rounded-full px-1.5 py-0.5">مدیر</span>}
                              {active && <Crown className="size-3.5 text-amber-500" />}
                            </span>
                            <span className="block text-[10px] text-slate-400 mt-0.5" dir="ltr" style={{ textAlign: 'right' }}>
                              {u.phone}
                            </span>
                          </span>
                          <span className="text-left shrink-0">
                            <span className="block text-[10px] font-bold text-slate-500">{toFa(u.exams)} آزمون</span>
                            <span className="block text-[9px] text-slate-400 mt-0.5">{toFa(u.points)} امتیاز</span>
                          </span>
                        </button>
                        {open && (
                          <div className="px-3.5 pb-3.5 pt-2 border-t border-[#e6e8f0] space-y-2.5 animate-pop">
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500">
                              <span>عضویت: {faDate(u.createdAt)}</span>
                              <span>آخرین آزمون: {u.lastAttemptAt ? faDate(u.lastAttemptAt) : '—'}</span>
                              <span>استریک: {toFa(u.streak)}</span>
                              <span className={active ? 'text-emerald-600 font-bold' : ''}>
                                اشتراک: {active ? `${u.subscription.title} تا ${faDate(u.subscription.until)}` : 'ندارد'}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {[['monthly', '۱ ماهه'], ['quarterly', '۳ ماهه'], ['yearly', '۱ ساله']].map(([pid, label]) => (
                                <button
                                  key={pid}
                                  disabled={subBusy}
                                  onClick={() => setSub(u.id, pid)}
                                  className="text-[10px] font-bold rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 px-2.5 py-1.5 hover:bg-emerald-500/20 transition-colors disabled:opacity-40"
                                >
                                  +{label}
                                </button>
                              ))}
                              {u.subscription && (
                                <button
                                  disabled={subBusy}
                                  onClick={() => setSub(u.id, null)}
                                  className="text-[10px] font-bold rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 px-2.5 py-1.5 hover:bg-rose-500/20 transition-colors disabled:opacity-40"
                                >
                                  حذف اشتراک
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })
              )}
            </div>
          )}

          {/* سفارش‌ها */}
          {adminTab === 'orders' && (
            !adminOrders ? (
              <div className="space-y-2.5">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-16" />)}</div>
            ) : adminOrders.length === 0 ? (
              <div className="card p-8 text-center text-sm text-slate-500">هنوز سفارشی ثبت نشده است.</div>
            ) : (
              adminOrders.map((o) => (
                <div key={o.id} className="card p-3.5 flex items-center gap-3 animate-pop">
                  <span className={`size-9 shrink-0 rounded-xl grid place-items-center ${
                    o.status === 'paid' ? 'bg-emerald-500/10 text-emerald-600' : o.status === 'pending' ? 'bg-amber-500/10 text-amber-600' : 'bg-slate-500/10 text-slate-500'
                  }`}>
                    <ShoppingBag className="size-4" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-bold">{o.planTitle} — {o.userName}</span>
                    <span className="block text-[10px] text-slate-400 mt-0.5" dir="ltr" style={{ textAlign: 'right' }}>
                      {o.userPhone} • {o.id}
                    </span>
                  </span>
                  <span className="text-left shrink-0">
                    <span className="block text-[11px] font-extrabold tabular-nums">{toFa(Math.round((o.amountRial ?? 0) / 10))} تومان</span>
                    <span className={`block text-[9px] font-bold mt-0.5 ${
                      o.status === 'paid' ? 'text-emerald-600' : o.status === 'pending' ? 'text-amber-600' : 'text-slate-500'
                    }`}>
                      {o.status === 'paid' ? 'پرداخت‌شده' : o.status === 'pending' ? 'در انتظار' : o.status === 'expired' ? 'منقضی' : o.status} • {faDate(o.createdAt)}
                    </span>
                  </span>
                </div>
              ))
            )
          )}

          {/* نظرها */}
          {adminTab === 'reviews' && (
            <div className="space-y-3">
              <div className="card p-3.5 flex items-center gap-2.5 border-indigo-200 bg-indigo-50/60 animate-pop">
                <ShieldCheck className="size-5 text-indigo-600" />
                <span className="text-xs font-bold text-indigo-700">
                  نظرهای کاربران — {toFa(allFeedback?.length ?? 0)} مورد
                </span>
              </div>
              {!allFeedback ? (
                <div className="space-y-2.5">{[1, 2].map((i) => <div key={i} className="skeleton h-20" />)}</div>
              ) : allFeedback.length === 0 ? (
                <div className="card p-8 text-center text-sm text-slate-500">هنوز نظری ثبت نشده است.</div>
              ) : (
                allFeedback.map((f, i) => (
                  <div key={f.id} className="card p-4 animate-pop" style={{ animationDelay: `${i * 40}ms` }}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-bold">{f.name}</div>
                      <span className="flex items-center gap-2">
                        <Stars value={f.rating} size="size-3.5" />
                        <button
                          onClick={() => removeFeedback(f.id)}
                          className="text-slate-300 hover:text-rose-500 transition-colors"
                          title="حذف نظر"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1" dir="ltr" style={{ textAlign: 'right' }}>
                      {f.phone} • {faDate(f.createdAt)}
                    </div>
                    <p className="text-sm text-slate-600 leading-7 mt-2">{f.text}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
