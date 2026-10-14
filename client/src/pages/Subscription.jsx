import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Check, CloudOff, Crown, LifeBuoy, Loader2, Sparkles, Wallet } from 'lucide-react'
import { api, apiMode, openExternal } from '../lib/api.js'
import { useAuth } from '../lib/auth.jsx'

const toFaDate = (ts) => new Date(ts).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' })

const PLANS = [
  { id: 'monthly', title: 'یک‌ماهه', price: '۱۹۹ هزار تومان', sub: 'دسترسی کامل به همه آزمون‌ها' },
  { id: 'quarterly', title: 'سه‌ماهه', price: '۴۹۹ هزار تومان', sub: '۱۶٪ تخفیف نسبت به ماهانه', featured: true },
  { id: 'yearly', title: 'سالانه', price: '۱٫۴۹۹ میلیون تومان', sub: '۳۷٪ تخفیف نسبت به ماهانه' },
]

const BENEFITS = [
  'دسترسی نامحدود به همه آزمون‌های جامع و تک‌درس',
  'پاسخ تشریحی همه سوالات',
  'آزمون روزانه و رتبه‌بندی',
  'تحلیل پیشرفت و نقاط ضعف',
]

const POLL_MS = 2500
const POLL_TIMEOUT = 3 * 60 * 1000

// در اپلیکیشن بومی با هندلر سیستم باز می‌شود تا اپ بله اجرا شود
const openPayUrl = (url) => openExternal(url)

export default function Subscription() {
  const { user, setUser } = useAuth()
  const nav = useNavigate()
  const [subscribing, setSubscribing] = useState(null)
  const [pending, setPending] = useState(null) // { orderId, payUrl }
  const [demo, setDemo] = useState(false)
  const pollRef = useRef(null)

  useEffect(() => {
    apiMode().then((m) => setDemo(m === 'demo')).catch(() => {})
  }, [])

  const sub = user?.subscription
  const subActive = sub && sub.until > Date.now()

  const stopPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = null
  }

  const startPolling = (orderId) => {
    stopPolling()
    const startedAt = Date.now()
    pollRef.current = setInterval(async () => {
      try {
        const s = await api(`/payment/order/${orderId}`)
        if (s.status === 'paid') {
          stopPolling()
          setPending(null)
          setUser(s.user)
        } else if (s.status === 'expired' || s.status === 'canceled') {
          stopPolling()
          setPending((p) => (p ? { ...p, failed: s.status } : p))
        } else if (Date.now() - startedAt > POLL_TIMEOUT) {
          stopPolling()
          setPending((p) => (p ? { ...p, timedOut: true } : p))
        }
      } catch { /* در تلاش بعدی دوباره چک می‌شود */ }
    }, POLL_MS)
  }

  // resume an open order + polling if the user left mid-payment
  useEffect(() => {
    api('/payment/pending')
      .then((d) => {
        if (d.order) {
          setPending({ orderId: d.order.orderId, payUrl: d.order.payUrl })
          startPolling(d.order.orderId)
        }
      })
      .catch(() => {})
    return stopPolling
  }, [])

  const subscribe = async (plan) => {
    if (subscribing || pending) return
    setSubscribing(plan.id)
    try {
      const d = await api('/payment/order', { method: 'POST', body: { plan: plan.id } })
      if (d.status === 'paid') {
        setUser((await api(`/payment/order/${d.orderId}`)).user)
        return
      }
      if (d.payUrl) openPayUrl(d.payUrl)
      setPending({ orderId: d.orderId, payUrl: d.payUrl })
      startPolling(d.orderId)
    } catch (e) {
      alert(e.message)
    } finally {
      setSubscribing(null)
    }
  }

  const cancelPending = () => {
    stopPolling()
    setPending(null)
  }

  return (
    <div className="px-4 py-6 space-y-6 pb-10">
      <button onClick={() => nav('/profile')} className="on-photo flex items-center gap-1.5 text-sm hover:text-slate-800">
        <ArrowRight className="size-4" /> بازگشت
      </button>

      {/* هشدار حالت دمو — خرید در این حالت واقعی نیست */}
      {demo && (
        <div className="card p-4 border-amber-500/30 bg-amber-500/10 flex items-start gap-3 animate-pop">
          <CloudOff className="size-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-6">
            اپ در <b>حالت نمایشی (آفلاین)</b> است — اتصال به سرور برقرار نشده و این اشتراک فقط برای امتحان روی همین دستگاه فعال می‌شود؛ پرداخت واقعی انجام نمی‌شود.
          </p>
        </div>
      )}

      {/* وضعیت فعلی */}
      {subActive && (
        <div className="card p-4 border-amber-500/30 bg-gradient-to-l from-amber-500/10 to-transparent flex items-center gap-3 animate-pop">
          <span className="size-11 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 grid place-items-center shadow-lg shadow-amber-500/30">
            <Crown className="size-5.5 text-[#0b0f14]" />
          </span>
          <div className="flex-1">
            <div className="font-bold">{sub.title} فعال است</div>
            <div className="text-xs text-slate-500 mt-0.5">دسترسی نامحدود تا {toFaDate(sub.until)}</div>
          </div>
        </div>
      )}

      {/* در انتظار پرداخت بله */}
      {pending && (
        <div className="card p-4 border-indigo-500/30 bg-gradient-to-l from-indigo-500/10 to-transparent space-y-3 animate-pop">
          <div className="flex items-center gap-3">
            <span className="size-11 rounded-xl bg-indigo-500/15 grid place-items-center shrink-0">
              <Loader2 className={`size-5.5 text-indigo-600 ${pending.timedOut || pending.failed ? '' : 'animate-spin'}`} />
            </span>
            <div className="flex-1">
              <div className="font-bold text-sm">
                {pending.failed === 'canceled'
                  ? 'سفارش لغو شد'
                  : pending.failed
                    ? 'سفارش منقضی شد'
                    : pending.timedOut
                      ? 'پرداخت هنوز ثبت نشده'
                      : 'در انتظار پرداخت در بله'}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {pending.failed === 'canceled'
                  ? 'این سفارش لغو شده است — برای خرید دوباره تلاش کنید.'
                  : pending.failed
                    ? 'مهلت پرداخت این سفارش تمام شده — دوباره برای خرید اقدام کنید.'
                    : pending.timedOut
                      ? 'اگر پرداخت را انجام داده‌اید کمی صبر کنید؛ در غیر این صورت انصراف بدهید و دوباره تلاش کنید.'
                      : 'صورتحساب در بازوی بله برایتان ارسال می‌شود؛ پس از پرداخت، اشتراک خودکار فعال می‌شود.'}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {pending.payUrl && (
              <button
                onClick={() => openPayUrl(pending.payUrl)}
                className="flex-1 rounded-xl bg-indigo-500 hover:bg-indigo-400 px-3 py-2 text-xs font-bold text-white transition-colors"
              >
                باز کردن بله
              </button>
            )}
            <button
              onClick={cancelPending}
              className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              انصراف
            </button>
          </div>
        </div>
      )}

      {/* مزایا */}
      <section className="card p-5 space-y-3 animate-pop" style={{ animationDelay: '60ms' }}>
        <h3 className="font-bold flex items-center gap-2">
          <Sparkles className="size-4.5 text-amber-500" /> مزایای اشتراک
        </h3>
        <ul className="space-y-2.5">
          {BENEFITS.map((b) => (
            <li key={b} className="flex items-center gap-2.5 text-sm text-slate-600">
              <span className="size-5 rounded-full bg-emerald-500/15 grid place-items-center shrink-0">
                <Check className="size-3 text-emerald-600" strokeWidth={3} />
              </span>
              {b}
            </li>
          ))}
        </ul>
      </section>

      {/* پلن‌ها */}
      <section className="space-y-3 animate-pop" style={{ animationDelay: '120ms' }}>
        <h3 className="font-bold">{subActive ? 'تمدید اشتراک' : 'انتخاب اشتراک'}</h3>
        {PLANS.map((p) => (
          <div
            key={p.id}
            className={`card p-4 flex items-center justify-between gap-3 ${
              p.featured ? 'border-amber-500/40 bg-gradient-to-l from-amber-500/10 to-transparent' : ''
            }`}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">{p.title}</span>
                {p.featured && (
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-500/15 rounded-full px-2 py-0.5">پیشنهاد ما</span>
                )}
              </div>
              <div className="text-xs text-slate-500 mt-1">{p.price} — {p.sub}</div>
            </div>
            <button
              onClick={() => subscribe(p)}
              disabled={!!subscribing || !!pending}
              className="shrink-0 flex items-center gap-1.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 px-3.5 py-2 text-xs font-bold text-white transition-colors disabled:opacity-40"
            >
              <Wallet className="size-3.5" />
              {subscribing === p.id ? '…' : subActive ? 'تمدید' : 'پرداخت با بله'}
            </button>
          </div>
        ))}
      </section>

      {/* پشتیبانی */}
      <a
        href="https://t.me/olyxfit_support"
        className="card p-4 flex items-center gap-3 hover:border-indigo-300 transition-colors animate-pop"
        style={{ animationDelay: '180ms' }}
      >
        <span className="size-10 rounded-xl bg-indigo-50 border border-indigo-100 grid place-items-center text-indigo-600">
          <LifeBuoy className="size-5" />
        </span>
        <span className="flex-1">
          <span className="block text-sm font-bold">مشکل در خرید یا سوالی دارید؟</span>
          <span className="block text-xs text-slate-500 mt-0.5">با پشتیبانی در تلگرام صحبت کنید</span>
        </span>
      </a>
    </div>
  )
}
