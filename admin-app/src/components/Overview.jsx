import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { fa, faDate } from '../format.js'
import BarChart from './BarChart.jsx'
import LineChart from './LineChart.jsx'
import DonutChart from './DonutChart.jsx'
import Icon from '../icons.jsx'

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
    ['users', 'کاربران', fa(o.users), '#e8f0fe', '#1e66d8'],
    ['crown', 'مشترکین فعال', fa(o.activeSubs), '#fdf0d3', '#a3740a'],
    ['exam', 'آزمون‌های برگزارشده', fa(o.attempts), '#dcf3e7', '#157347'],
    ['target', 'میانگین نمره', fa(o.avgScore) + '٪', '#e0f2fe', '#0369a1'],
    ['money', 'درآمد (تومان)', fa(Math.round((o.revenueRial || 0) / 10)), '#ede9fe', '#6d28d9'],
    ['receipt', 'سفارش موفق / در انتظار', `${fa(o.paidOrders)} / ${fa(o.pendingOrders)}`, '#fdeaea', '#c03a3a'],
    ['help', 'سوال در بانک', fa(o.questions), '#ccfbf1', '#0f766e'],
    ['layers', 'آزمون ساخته‌شده', fa(o.generated), '#eef1f6', '#54637a'],
    ['message', 'نظرها / اعلان‌ها', `${fa(o.feedback)} / ${fa(o.announcements)}`, '#eef1f6', '#54637a'],
  ]

  const f = m?.funnel
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0)

  return (
    <>
      <div className="toolbar">
        <span className="tname"><span className="tsi" style={{ background: '#8b5cf6' }}><Icon n="dashboard" s={13} /></span> داشبورد</span>
        <span className="tsub">نمای کلی سامانه — متریک‌ها، قیف تبدیل و روند ۳۰ روز اخیر</span>
      </div>

      <div className="page">
        {/* ویجت‌های متریک */}
        <div className="dash">
          {cards.map(([ic, label, val, bg, fg]) => (
            <div className="widget metric" key={label}>
              <div className="wbody">
                <div className="mic" style={{ background: bg, color: fg }}><Icon n={ic} s={17} /></div>
                <div><b className="num">{val}</b><span className="mlab">{label}</span></div>
              </div>
            </div>
          ))}
        </div>

        {/* قیف تبدیل — ثبت‌نام → فعال‌شدن → اشتراک → پرداخت */}
        {f && (
          <div className="widget" style={{ marginTop: 12 }}>
            <div className="whead"><span className="wi"><Icon n="funnel" s={13} /></span> قیف تبدیل</div>
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

        {/* منحنی روند ۳۰ روز — چندسری */}
        {m && (
          <div className="widget" style={{ marginTop: 12 }}>
            <div className="whead"><span className="wi"><Icon n="trend" s={13} /></span> منحنی روند ۳۰ روز اخیر</div>
            <div className="wbody">
              <LineChart series={[
                { name: 'ثبت‌نام', data: m.signups, color: '#2f7cf6' },
                { name: 'آزمون', data: m.attempts, color: '#1fa564' },
                { name: 'کاربران فعال روزانه', data: m.dau || [], color: '#e8862e' },
              ]} />
            </div>
          </div>
        )}

        {/* روند ۳۰ روز — ویجت‌های نمودار */}
        {m && (
          <div className="wgrid">
            <div className="widget">
              <div className="whead"><span className="wi"><Icon n="chart" s={13} /></span> ثبت‌نام‌های روزانه</div>
              <div className="wbody"><BarChart data={m.signups} color="#2f7cf6" /></div>
            </div>
            <div className="widget">
              <div className="whead"><span className="wi"><Icon n="chart" s={13} /></span> آزمون‌های روزانه</div>
              <div className="wbody"><BarChart data={m.attempts} color="#1fa564" /></div>
            </div>
            <div className="widget">
              <div className="whead"><span className="wi"><Icon n="chart" s={13} /></span> درآمد روزانه (تومان)</div>
              <div className="wbody"><BarChart data={m.revenue} color="#7c3aed" /></div>
            </div>
          </div>
        )}

        {/* توزیع‌ها — دونات و نمودارهای افقی */}
        {m && (
          <div className="wgrid">
            <div className="widget">
              <div className="whead"><span className="wi"><Icon n="pie" s={13} /></span> وضعیت اشتراک کاربران</div>
              <div className="wbody">
                <DonutChart items={[
                  { label: 'فعال', value: m.subSplit?.active || 0, color: '#2fae6a' },
                  { label: 'منقضی', value: m.subSplit?.expired || 0, color: '#e05252' },
                  { label: 'بدون اشتراک', value: m.subSplit?.none || 0, color: '#c3cbd6' },
                ]} />
              </div>
            </div>
            <div className="widget">
              <div className="whead"><span className="wi"><Icon n="target" s={13} /></span> توزیع نمرات آزمون‌ها</div>
              <div className="wbody"><ScoreDist dist={m.scoreDist || []} /></div>
            </div>
            <div className="widget">
              <div className="whead"><span className="wi"><Icon n="exam" s={13} /></span> پرتکرارترین آزمون‌ها</div>
              <div className="wbody">
                {(m.topExams || []).length === 0 && <div className="empty" style={{ padding: '20px 0' }}>آزمونی برگزار نشده</div>}
                <HBars items={(m.topExams || []).map((t) => ({ label: t.title, value: t.n, color: '#2f7cf6' }))} />
              </div>
            </div>
          </div>
        )}

        {/* ویجت گزارش — آخرین کاربران */}
        <div className="widget" style={{ marginTop: 12 }}>
          <div className="whead"><span className="wi"><Icon n="table" s={13} /></span> آخرین کاربران ثبت‌نام‌شده</div>
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

// نوارهای افقی با درصد — برای لیست‌های رتبه‌بندی‌شده
function HBars({ items }) {
  const total = items.reduce((s, i) => s + i.value, 0)
  const max = Math.max(1, ...items.map((i) => i.value))
  return items.map((it) => (
    <div key={it.label} style={{ marginBottom: 11 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12, marginBottom: 5 }}>
        <b style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.label}</b>
        <span className="muted" style={{ flex: 'none' }}>{fa(it.value)} • {total ? fa(Math.round((it.value / total) * 100)) : 0}٪</span>
      </div>
      <div style={{ height: 8, background: '#eef1f6', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{ width: (it.value / max) * 100 + '%', height: '100%', background: it.color, borderRadius: 6 }} />
      </div>
    </div>
  ))
}

// توزیع نمرات در چهار بازه — از قرمز (ضعیف) به سبز (عالی)
const SCORE_BUCKETS = [
  ['کمتر از ۴۰٪', '#e05252'], ['۴۰ تا ۵۹٪', '#f0b429'], ['۶۰ تا ۷۹٪', '#2f7cf6'], ['۸۰٪ و بیشتر', '#2fae6a'],
]
function ScoreDist({ dist }) {
  const items = SCORE_BUCKETS.map(([label, color], i) => ({ label, color, value: dist[i] || 0 }))
  if (!items.some((i) => i.value)) return <div className="empty" style={{ padding: '20px 0' }}>آزمونی برگزار نشده</div>
  return <HBars items={items} />
}
