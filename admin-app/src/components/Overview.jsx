import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { fa, faDate } from '../format.js'
import BarChart from './BarChart.jsx'

export default function Overview() {
  const [o, setO] = useState(null)
  const [m, setM] = useState(null)
  const [users, setUsers] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    api('/admin/overview').then(setO).catch((e) => setErr(e.message))
    api('/admin/metrics').then(setM).catch(() => setM(null))
    api('/admin/users').then((d) => setUsers(d.list)).catch(() => setUsers([]))
  }, [])

  if (err) return <div className="empty">{err}</div>
  if (!o) return <div className="cards">{[1, 2, 3, 4].map((i) => <div key={i} className="skel" />)}</div>

  const cards = [
    ['👥', 'کاربران', fa(o.users), '#e0e7ff'],
    ['👑', 'مشترکین فعال', fa(o.activeSubs), '#fef3c7'],
    ['📝', 'آزمون‌های برگزارشده', fa(o.attempts), '#d1fae5'],
    ['🎯', 'میانگین نمره', fa(o.avgScore) + '٪', '#e0f2fe'],
    ['💰', 'درآمد (تومان)', fa(Math.round((o.revenueRial || 0) / 10)), '#ede9fe'],
    ['🧾', 'سفارش موفق / در انتظار', `${fa(o.paidOrders)} / ${fa(o.pendingOrders)}`, '#ffe4e6'],
    ['❓', 'سوال در بانک', fa(o.questions), '#ccfbf1'],
    ['🧩', 'آزمون ساخته‌شده', fa(o.generated), '#f1f5f9'],
    ['💬', 'نظرها / اعلان‌ها', `${fa(o.feedback)} / ${fa(o.announcements)}`, '#f1f5f9'],
  ]

  const f = m?.funnel
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0)

  return (
    <>
      <div className="cards">
        {cards.map(([ic, label, val, bg]) => (
          <div className="stat" key={label}>
            <div className="ic" style={{ background: bg }}>{ic}</div>
            <b>{val}</b>
            <span>{label}</span>
          </div>
        ))}
      </div>

      {/* قیف تبدیل — ثبت‌نام → فعال‌شدن → اشتراک → پرداخت */}
      {f && (
        <>
          <div className="section-title">قیف تبدیل</div>
          <div className="panel" style={{ padding: 18, display: 'flex', gap: 10, alignItems: 'stretch', flexWrap: 'wrap' }}>
            {[
              ['ثبت‌نام', f.registered, '#e0e7ff', 100],
              ['حداقل یک آزمون', f.engaged, '#d1fae5', pct(f.engaged, f.registered)],
              ['اشتراک فعال', f.subscribed, '#fef3c7', pct(f.subscribed, f.registered)],
              ['پرداخت موفق', f.paying, '#ede9fe', pct(f.paying, f.registered)],
            ].map(([label, v, bg, p], i) => (
              <div key={label} style={{ flex: 1, minWidth: 130, display: 'flex', alignItems: 'center', gap: 10 }}>
                {i > 0 && <span style={{ color: '#cbd5e1', fontSize: 18 }}>←</span>}
                <div style={{ flex: 1 }}>
                  <div style={{ background: bg, borderRadius: 12, padding: '12px 14px' }}>
                    <b style={{ fontSize: 18 }}>{fa(v)}</b>
                    <div style={{ fontSize: 11, color: '#475569' }}>{label}</div>
                  </div>
                  <div style={{ height: 4, background: '#f1f5f9', borderRadius: 4, marginTop: 6, overflow: 'hidden' }}>
                    <div style={{ width: p + '%', height: '100%', background: 'var(--indigo)', borderRadius: 4 }} />
                  </div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3 }}>{fa(p)}٪ از ثبت‌نام‌ها</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* روند ۳۰ روز */}
      {m && (
        <>
          <div className="section-title">روند ۳۰ روز اخیر</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
            <div className="panel" style={{ padding: 16 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 10 }}>ثبت‌نام‌های روزانه</div>
              <BarChart data={m.signups} color="#4f46e5" />
            </div>
            <div className="panel" style={{ padding: 16 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 10 }}>آزمون‌های روزانه</div>
              <BarChart data={m.attempts} color="#059669" />
            </div>
            <div className="panel" style={{ padding: 16 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 10 }}>درآمد روزانه (تومان)</div>
              <BarChart data={m.revenue} color="#7c3aed" />
            </div>
          </div>
        </>
      )}

      <div className="section-title">آخرین کاربران ثبت‌نام‌شده</div>
      <div className="panel wrap-scroll">
        <table>
          <thead>
            <tr><th>نام</th><th>موبایل</th><th>اشتراک</th><th>آزمون</th><th>عضویت</th></tr>
          </thead>
          <tbody>
            {(users || []).slice(0, 6).map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td className="ltr">{u.phone}</td>
                <td>{u.subscription && u.subscription.until > Date.now()
                  ? <span className="pill ok">فعال تا {faDate(u.subscription.until)}</span>
                  : <span className="pill off">—</span>}</td>
                <td>{fa(u.exams)}</td>
                <td className="muted">{faDate(u.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
