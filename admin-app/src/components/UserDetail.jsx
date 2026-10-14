import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { fa, faDate, faDT, PLANS, ORDER_STATUS, levelOf } from '../format.js'
import LineChart from './LineChart.jsx'
import Icon from '../icons.jsx'

// نمای ۳۶۰ درجهٔ کاربر — پروفایل، اشتراک، آمار، تلاش‌ها، سفارش‌ها، نظرها و یادداشت مدیر
export default function UserDetail({ userId, onBack, onChanged, notify }) {
  const [d, setD] = useState(null)
  const [note, setNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  const load = () =>
    api(`/admin/users/${userId}`).then((x) => {
      setD(x)
      setNote(x.user.note || '')
    }).catch((e) => { notify(e.message); onBack() })

  useEffect(() => { load() }, [userId])

  const saveNote = async () => {
    setSavingNote(true)
    try {
      await api(`/admin/users/${userId}/note`, { method: 'POST', body: { note } })
      notify('یادداشت ذخیره شد')
    } catch (e) { notify(e.message) } finally { setSavingNote(false) }
  }

  // ویرایش نام/موبایل و خروج اجباری
  const [editOpen, setEditOpen] = useState(false)
  const [eName, setEName] = useState('')
  const [ePhone, setEPhone] = useState('')
  const openEdit = () => { setEName(d.user.name || ''); setEPhone(d.user.phone || ''); setEditOpen(true) }
  const saveEdit = async (e) => {
    e.preventDefault()
    try {
      await api(`/admin/users/${userId}`, { method: 'PATCH', body: { name: eName, phone: ePhone } })
      notify('اطلاعات کاربر به‌روز شد')
      setEditOpen(false)
      load(); onChanged?.()
    } catch (x) { notify(x.message) }
  }
  const revokeSessions = async () => {
    if (!confirm('همهٔ نشست‌های این کاربر باطل شود؟ (از همهٔ دستگاه‌ها خارج می‌شود)')) return
    try {
      const r = await api(`/admin/users/${userId}/revoke-sessions`, { method: 'POST' })
      notify(`${fa(r.revoked)} نشست باطل شد`)
    } catch (e) { notify(e.message) }
  }
  const setOrderStatus = async (orderId, status) => {
    if (status === 'canceled' && !confirm('این سفارش لغو شود؟')) return
    if (status === 'paid' && !confirm('سفارش به‌عنوان «پرداخت‌شده» ثبت و اشتراک فعال شود؟ (فروش نقدی/دستی)')) return
    try {
      await api(`/admin/orders/${orderId}`, { method: 'PATCH', body: { status } })
      notify(status === 'paid' ? 'پرداخت ثبت و اشتراک فعال شد' : 'سفارش لغو شد')
      load(); onChanged?.()
    } catch (e) { notify(e.message) }
  }

  const grant = async (plan) => {
    try {
      await api(`/admin/users/${userId}/subscription`, { method: 'POST', body: { plan } })
      notify('اشتراک فعال شد')
      load(); onChanged?.()
    } catch (e) { notify(e.message) }
  }
  const revoke = async () => {
    if (!confirm('اشتراک این کاربر لغو شود؟')) return
    try {
      await api(`/admin/users/${userId}/subscription`, { method: 'DELETE' })
      notify('اشتراک لغو شد')
      load(); onChanged?.()
    } catch (e) { notify(e.message) }
  }

  // حذف کامل کاربر — پس از موفقیت به لیست برمی‌گردیم
  const removeUser = async () => {
    if (!confirm(`کاربر «${u.name}» برای همیشه حذف شود؟ حساب، نشست‌ها و سوابق آزمونش پاک می‌شود.`)) return
    try {
      await api(`/admin/users/${userId}`, { method: 'DELETE' })
      notify('کاربر حذف شد')
      onBack()
    } catch (e) { notify(e.message) }
  }

  if (!d) return <div className="skel" style={{ height: 200 }} />

  const { user: u, stats, attempts, orders, feedback } = d
  const lv = levelOf(u.points)
  const active = u.subscription && u.subscription.until > Date.now()

  return (
    <div>
      <button className="mini" onClick={onBack} style={{ marginBottom: 14 }}><Icon n="back" s={13} /> بازگشت به لیست</button>

      {/* کارت هویت */}
      <div className="panel" style={{ padding: 18, marginBottom: 14, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg,#1d2a45,#2f7cf6)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 22, fontWeight: 800 }}>
          {(u.name || '؟')[0]}
        </div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontWeight: 800, fontSize: 17 }}>{u.name} {u.admin && <span className="pill ok">مدیر</span>} <span className="pill" style={{ background: lv.level.c + '1f', color: lv.level.c }}>سطح {fa(lv.idx + 1)} · {lv.level.title}</span></div>
          <div className="muted ltr" style={{ marginTop: 2 }}>{u.phone}</div>
          <div className="muted" style={{ marginTop: 4 }}>
            عضویت: {faDate(u.createdAt)}
          </div>
        </div>
        <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
          {active
            ? <span className="pill ok">{u.subscription.title} — تا {faDate(u.subscription.until)}</span>
            : u.subscription
              ? <span className="pill expired">منقضی در {faDate(u.subscription.until)}</span>
              : <span className="pill off">بدون اشتراک</span>}
          {!u.admin && (
            <span style={{ display: 'flex', gap: 6 }}>
              <button className="mini" onClick={openEdit}><Icon n="edit" s={12} /> ویرایش</button>
              <button className="mini revoke" onClick={revokeSessions}><Icon n="logout" s={12} /> خروج اجباری</button>
              <button className="mini revoke" onClick={removeUser}><Icon n="trash" s={12} /> حذف کاربر</button>
            </span>
          )}
        </div>
      </div>

      {/* فرم ویرایش کاربر */}
      {editOpen && (
        <form className="form" onSubmit={saveEdit}>
          <h3>ویرایش کاربر</h3>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input className="field" style={{ flex: 1, minWidth: 160, margin: 0 }} value={eName} onChange={(e) => setEName(e.target.value)} placeholder="نام" required />
            <input className="field ltr" style={{ flex: 1, minWidth: 160, margin: 0 }} value={ePhone} onChange={(e) => setEPhone(e.target.value)} placeholder="شماره موبایل" />
            <button className="btn" style={{ width: 'auto', padding: '9px 24px' }}>ذخیره</button>
            <button type="button" className="mini" onClick={() => setEditOpen(false)}>انصراف</button>
          </div>
        </form>
      )}

      {/* آمار سریع */}
      <div className="cards" style={{ marginBottom: 14 }}>
        {[
          ['exam', 'آزمون', fa(stats.attempts)], ['target', 'میانگین', fa(stats.avgScore) + '٪'],
          ['trophy', 'بهترین نمره', fa(stats.bestScore) + '٪'], ['star', 'XP', fa(u.points)],
          ['fire', 'استریک', fa(u.streak)], ['timer', 'زمان آزمون (دقیقه)', fa(stats.totalTimeMin)],
          ['clock', 'آخرین فعالیت', stats.lastAttemptAt ? faDate(stats.lastAttemptAt) : '—'],
        ].map(([ic, l, v]) => (
          <div className="stat" key={l}><div className="ic" style={{ background: '#e8f0fe', color: '#1e66d8' }}><Icon n={ic} s={15} /></div><b>{v}</b><span>{l}</span></div>
        ))}
      </div>

      {/* منحنی پیشرفت نمرات — از قدیمی به جدید */}
      {attempts.length > 0 && (
        <div className="panel" style={{ padding: '10px 15px 12px', marginBottom: 14 }}>
          <div className="section-title" style={{ marginTop: 0, marginBottom: 6 }}>منحنی نمرات کاربر</div>
          <LineChart
            height={110}
            unit="٪"
            series={[{
              name: 'نمره',
              color: '#8b5cf6',
              data: [...attempts].reverse().map((a) => a.score),
              labels: [...attempts].reverse().map((a) => a.examTitle),
            }]}
          />
        </div>
      )}

      {/* مدیریت اشتراک */}
      {!u.admin && (
        <div className="form">
          <h3>مدیریت اشتراک</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {PLANS.map(([pid, label]) => (
              <button key={pid} className="mini" style={{ borderColor: '#aac7f8', color: '#1e66d8', padding: '8px 14px' }} onClick={() => grant(pid)}>
                + {label}
              </button>
            ))}
            {u.subscription && <button className="mini revoke" style={{ padding: '8px 14px' }} onClick={revoke}>لغو اشتراک</button>}
          </div>
        </div>
      )}

      {/* یادداشت مدیر */}
      <div className="form">
        <h3>یادداشت مدیر — فقط در همین پنل دیده می‌شود</h3>
        <textarea className="field" placeholder="مثلاً: با واتساپ پیگیری شد؛ مشکل پرداخت داشت…" value={note} onChange={(e) => setNote(e.target.value)} />
        <button className="btn" style={{ width: 'auto', padding: '9px 26px' }} onClick={saveNote} disabled={savingNote}>
          {savingNote ? '…' : 'ذخیره یادداشت'}
        </button>
      </div>

      {/* سوابق */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
        <div>
          <div className="section-title" style={{ marginTop: 0 }}>آزمون‌های اخیر</div>
          <div className="panel">
            {attempts.length === 0 && <div className="empty">آزمونی ثبت نشده</div>}
            {attempts.map((a) => (
              <div className="item" key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700 }}>{a.examTitle}</div>
                  <div className="muted">{faDate(a.createdAt)} • {fa(a.correct)}/{fa(a.total)} درست</div>
                </div>
                <span className={`pill ${a.score >= 70 ? 'paid' : a.score >= 40 ? 'pending' : 'failed'}`}>{fa(a.score)}٪</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="section-title" style={{ marginTop: 0 }}>سفارش‌ها</div>
          <div className="panel">
            {orders.length === 0 && <div className="empty">سفارشی ثبت نشده</div>}
            {orders.map((o) => {
              const [label, cls] = ORDER_STATUS[o.status] || [o.status, 'off']
              return (
                <div className="item" key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 700 }}>{o.planTitle} — {fa(Math.round((o.amountRial || 0) / 10))} تومان</div>
                    <div className="muted">{faDT(o.createdAt)}</div>
                  </div>
                  <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span className={`pill ${cls}`}>{label}</span>
                    {o.status === 'pending' && (
                      <>
                        <button className="mini" style={{ borderColor: '#a7f3d0', color: 'var(--ok)' }} onClick={() => setOrderStatus(o.id, 'paid')}><Icon n="check" s={12} /> ثبت پرداخت</button>
                        <button className="mini revoke" onClick={() => setOrderStatus(o.id, 'canceled')}>لغو</button>
                      </>
                    )}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="section-title">نظرهای کاربر</div>
          <div className="panel">
            {feedback.length === 0 && <div className="empty">نظری ثبت نشده</div>}
            {feedback.map((f) => (
              <div className="item" key={f.id}>
                <div className="item-head">
                  <span className="stars">{'★'.repeat(f.rating)}{'☆'.repeat(5 - f.rating)}</span>
                  <span className="muted">{faDate(f.createdAt)}</span>
                </div>
                <div className="item-body">{f.text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
