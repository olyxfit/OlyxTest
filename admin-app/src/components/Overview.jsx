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
  if (!o) return <div className="page"><div className="dash">{[1, 2, 3, 4].map((i) => <div key={i} className="skel" />)}</div></div>

  const cards = [
    ['👥', 'کاربران', fa(o.users), '#e8f0fe'],
    ['👑', 'مشترکین فعال', fa(o.activeSubs), '#fdf0d3'],
    ['📝', 'آزمون‌های برگزارشده', fa(o.attempts), '#dcf3e7'],
    ['🎯', 'میانگین نمره', fa(o.avgScore) + '٪', '#e0f2fe'],
    ['💰', 'درآمد (تومان)', fa(Math.round((o.revenueRial || 0) / 10)), '#ede9fe'],
    ['🧾', 'سفارش موفق / در انتظار', `${fa(o.paidOrders)} / ${fa(o.pendingOrders)}`, '#fdeaea'],
    ['❓', 'سوال در بانک', fa(o.questions), '#ccfbf1'],
    ['🧩', 'آزمون ساخته‌شده', fa(o.generated), '#eef1f6'],
    ['💬', 'نظرها / اعلان‌ها', `${fa(o.feedback)} / ${fa(o.announcements)}`, '#eef1f6'],
  ]

  const f = m?.funnel
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0)

  return (
    <>
      <div className="toolbar">
        <span className="tname"><span className="tsi">📊</span> داشبورد</span>
        <span className="tsub">نمای کلی سامانه — متریک‌ها، قیف تبدیل و روند ۳۰ روز اخیر</span>
      </div>

      <div className="page">
        {/* ویجت‌های متریک */}
        <div className="dash">
          {cards.map(([ic, label, val, bg]) => (
            <div className="widget metric" key={label}>
              <div className="wbody">
                <div className="mic" style={{ background: bg }}>{ic}</div>
                <div><b className="num">{val}</b><span className="mlab">{label}</span></div>
              </div>
            </div>
          ))}
        </div>

        {/* قیف تبدیل — ثبت‌نام → فعال‌شدن → اشتراک → پرداخت */}
        {f && (
          <div className="widget" style={{ marginTop: 12 }}>
            <div className="whead"><span className="wi">▽</span> قیف تبدیل</div>
            <div className="wbody" style={{ display: 'flex', gap: 10, alignItems: 'stretch', flexWrap: 'wrap' }}>
              {[
                ['ثبت‌نام', f.registered, '#e8f0fe', 100],
                ['حداقل یک آزمون', f.engaged, '#dcf3e7', pct(f.engaged, f.registered)],
                ['اشتراک فعال', f.subscribed, '#fdf0d3', pct(f.subscribed, f.registered)],
                ['پرداخت موفق', f.paying, '#ede9fe', pct(f.paying, f.registered)],
              ].map(([label, v, bg, p], i) => (
                <div key={label} style={{ flex: 1, minWidth: 130, display: 'flex', alignItems: 'center', gap: 10 }}>
                  {i > 0 && <span style={{ color: '#b6bfcc', fontSize: 18 }}>←</span>}
                  <div style={{ flex: 1 }}>
                    <div style={{ background: bg, borderRadius: 9, padding: '12px 14px' }}>
                      <b style={{ fontSize: 18 }}>{fa(v)}</b>
                      <div style={{ fontSize: 11, color: '#4a5468' }}>{label}</div>
                    </div>
                    <div style={{ height: 4, background: '#eef1f6', borderRadius: 4, marginTop: 6, overflow: 'hidden' }}>
                      <div style={{ width: p + '%', height: '100%', background: 'var(--blue)', borderRadius: 4 }} />
                    </div>
                    <div style={{ fontSize: 10, color: '#96a0b1', marginTop: 3 }}>{fa(p)}٪ از ثبت‌نام‌ها</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* روند ۳۰ روز — ویجت‌های نمودار */}
        {m && (
          <div className="wgrid">
            <div className="widget">
              <div className="whead"><span className="wi">▲</span> ثبت‌نام‌های روزانه</div>
              <div className="wbody"><BarChart data={m.signups} color="#2f7cf6" /></div>
            </div>
            <div className="widget">
              <div className="whead"><span className="wi">▲</span> آزمون‌های روزانه</div>
              <div className="wbody"><BarChart data={m.attempts} color="#1fa564" /></div>
            </div>
            <div className="widget">
              <div className="whead"><span className="wi">▲</span> درآمد روزانه (تومان)</div>
              <div className="wbody"><BarChart data={m.revenue} color="#7c3aed" /></div>
            </div>
          </div>
        )}

        {/* ویجت گزارش — آخرین کاربران */}
        <div className="widget" style={{ marginTop: 12 }}>
          <div className="whead"><span className="wi">▦</span> آخرین کاربران ثبت‌نام‌شده</div>
          <div className="wrap-scroll" style={{ maxHeight: 320 }}>
            <table className="grid">
              <thead>
                <tr><th className="rn"></th><th>نام</th><th>موبایل</th><th>اشتراک</th><th>آزمون</th><th>عضویت</th></tr>
              </thead>
              <tbody>
                {(users || []).slice(0, 6).map((u, i) => (
                  <tr key={u.id}>
                    <td className="rn">{fa(i + 1)}</td>
                    <td className="pri">{u.name}</td>
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
        </div>
      </div>
    </>
  )
}
