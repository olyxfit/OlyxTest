import { useEffect, useMemo, useState } from 'react'
import { api } from '../api.js'
import { fa, faDT, ORDER_STATUS, avaBg } from '../format.js'
import BarChart from './BarChart.jsx'
import LineChart from './LineChart.jsx'
import DonutChart from './DonutChart.jsx'
import Icon from '../icons.jsx'

// لین‌های نمای کارت بر اساس وضعیت سفارش
const LANES = [
  ['pending', '#f0b429'], ['paid', '#2fae6a'], ['expired', '#e05252'],
  ['canceled', '#c3cbd6'], ['failed', '#e05252'],
]
const toman = (o) => Math.round((o.amountRial || 0) / 10)
const PLAN_COLORS = ['#2f7cf6', '#8b5cf6', '#1fa564', '#f0a818', '#ec4899', '#0ea5e9']
const norm = (s) => String(s || '')
  .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
  .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))

export default function Finance({ notify }) {
  const [orders, setOrders] = useState(null)
  const [m, setM] = useState(null)
  const [view, setView] = useState('grid')
  const [q, setQ] = useState('')

  const load = () => api('/admin/orders').then((d) => setOrders(d.list)).catch(() => setOrders([]))
  useEffect(() => {
    load()
    api('/admin/metrics').then(setM).catch(() => setM(null))
  }, [])

  // ثبت فروش نقدی/دستی یا لغو سفارش معلق — همان اکشن‌های CRM
  const setStatus = async (o, status) => {
    if (status === 'paid' && !confirm(`سفارش «${o.userName}» پرداخت‌شده ثبت و اشتراک فعال شود؟`)) return
    if (status === 'canceled' && !confirm('این سفارش لغو شود؟')) return
    try {
      await api(`/admin/orders/${o.id}`, { method: 'PATCH', body: { status } })
      notify(status === 'paid' ? 'پرداخت ثبت و اشتراک فعال شد' : 'سفارش لغو شد')
      load()
    } catch (e) { notify(e.message) }
  }

  const rep = useMemo(() => {
    const all = orders || []
    const paid = all.filter((o) => o.status === 'paid')
    const pend = all.filter((o) => o.status === 'pending')
    const done = all.filter((o) => o.status !== 'pending')
    const sum = (arr) => arr.reduce((s, o) => s + toman(o), 0)
    const byPlan = {}
    for (const o of paid) {
      const k = o.planTitle || o.plan
      byPlan[k] = byPlan[k] || { n: 0, v: 0 }
      byPlan[k].n++
      byPlan[k].v += toman(o)
    }
    // گروه‌بندی بر اساس ماه شمسی — کلید مرتب‌پذیر «۱۴۰۴/۰۷»
    const keyFmt = new Intl.DateTimeFormat('fa-IR-u-nu-latn', { year: 'numeric', month: '2-digit' })
    const lblFmt = new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: 'long' })
    const byMonth = {}
    for (const o of paid) {
      const d = new Date(o.createdAt)
      const key = keyFmt.format(d)
      byMonth[key] = byMonth[key] || { key, label: lblFmt.format(d), n: 0, v: 0 }
      byMonth[key].n++
      byMonth[key].v += toman(o)
    }
    return {
      total: sum(paid),
      avg: paid.length ? Math.round(sum(paid) / paid.length) : 0,
      pendSum: sum(pend),
      pendN: pend.length,
      conv: done.length ? Math.round((paid.length / done.length) * 100) : 0,
      plans: Object.entries(byPlan).sort((a, b) => b[1].v - a[1].v),
      months: Object.values(byMonth).sort((a, b) => (a.key < b.key ? 1 : -1)),
    }
  }, [orders])

  const qq = norm(q)
  const list = (orders || []).filter((o) =>
    !qq || norm(o.userName).includes(qq) || norm(o.userPhone).includes(qq) || norm(o.chargeId).includes(qq))

  const kpis = [
    ['money', 'درآمد کل (تومان)', fa(rep.total), '#dcf3e7', '#157347'],
    ['trend', 'درآمد ۳۰ روز (تومان)', m ? fa(m.revenue.reduce((a, b) => a + b, 0)) : '—', '#e8f0fe', '#1e66d8'],
    ['receipt', 'میانگین مبلغ سفارش', fa(rep.avg), '#ede9fe', '#6d28d9'],
    ['hourglass', 'مبلغ معلق / در انتظار', `${fa(rep.pendSum)} — ${fa(rep.pendN)} سفارش`, '#fdf0d3', '#a3740a'],
    ['checkC', 'نرخ موفقیت پرداخت', fa(rep.conv) + '٪', '#e0f2fe', '#0369a1'],
  ]

  const acts = (o) => o.status === 'pending' && (
    <span className="kacts">
      <button className="mini" style={{ borderColor: '#b2e3bd', color: '#157347' }} onClick={(e) => { e.stopPropagation(); setStatus(o, 'paid') }}>ثبت پرداخت</button>
      <button className="mini revoke" onClick={(e) => { e.stopPropagation(); setStatus(o, 'canceled') }}>لغو</button>
    </span>
  )

  return (
    <>
      <div className="toolbar">
        <span className="tname"><span className="tsi" style={{ background: '#1fa564' }}><Icon n="money" s={13} /></span> مدیریت مالی</span>
        <span className="vswitch">
          <button className={view === 'grid' ? 'on' : ''} onClick={() => setView('grid')}><Icon n="table" s={12} /> گرید</button>
          <button className={view === 'card' ? 'on' : ''} onClick={() => setView('card')}><Icon n="cards" s={12} /> کارت</button>
        </span>
        <span className="tspacer" />
        <span className="searchbox">
          <input placeholder="جست‌وجوی کاربر یا شناسه تراکنش…" value={q} onChange={(e) => setQ(e.target.value)} />
          <span className="si"><Icon n="search" s={13} /></span>
        </span>
      </div>

      <div className="page">
        {!orders ? (
          <div className="dash">{[1, 2, 3, 4].map((i) => <div key={i} className="skel" />)}</div>
        ) : (
          <>
            {/* ویجت‌های مالی */}
            <div className="dash">
              {kpis.map(([ic, label, val, bg, fg]) => (
                <div className="widget metric" key={label}>
                  <div className="wbody">
                    <div className="mic" style={{ background: bg, color: fg }}><Icon n={ic} s={17} /></div>
                    <div><b className="num">{val}</b><span className="mlab">{label}</span></div>
                  </div>
                </div>
              ))}
            </div>

            <div className="wgrid">
              {m && (
                <div className="widget">
                  <div className="whead"><span className="wi"><Icon n="trend" s={13} /></span> منحنی درآمد روزانه — ۳۰ روز اخیر (تومان)</div>
                  <div className="wbody"><LineChart unit=" تومان" series={[{ name: 'درآمد', data: m.revenue, color: '#1fa564' }]} /></div>
                </div>
              )}
              {m && (
                <div className="widget">
                  <div className="whead"><span className="wi"><Icon n="chart" s={13} /></span> سفارش‌های روزانه</div>
                  <div className="wbody"><BarChart data={m.ordersPerDay} color="#2f7cf6" /></div>
                </div>
              )}
              <div className="widget">
                <div className="whead"><span className="wi"><Icon n="pie" s={13} /></span> سهم هر پلن از درآمد</div>
                <div className="wbody">
                  {rep.plans.length === 0 && <div className="empty" style={{ padding: '20px 0' }}>فروشی ثبت نشده</div>}
                  {rep.plans.length > 0 && (
                    <DonutChart items={rep.plans.map(([title, p], i) => ({
                      label: `${title} (${fa(p.n)} سفارش)`, value: p.v, color: PLAN_COLORS[i % PLAN_COLORS.length],
                    }))} />
                  )}
                </div>
              </div>
              <div className="widget">
                <div className="whead"><span className="wi"><Icon n="calendar" s={13} /></span> خلاصهٔ ماهانه</div>
                <table className="grid">
                  <thead><tr><th>ماه</th><th>سفارش موفق</th><th>درآمد (تومان)</th></tr></thead>
                  <tbody>
                    {rep.months.length === 0 && <tr><td colSpan="3" className="empty">—</td></tr>}
                    {rep.months.map((mm) => (
                      <tr key={mm.key}><td className="pri">{mm.label}</td><td>{fa(mm.n)}</td><td>{fa(mm.v)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* دفتر تراکنش‌ها */}
            <div className="sheet mt">
              <div className="fbar">
                <span className="fl"><Icon n="receipt" s={12} /> تراکنش‌ها</span>
                <span className="muted">{fa(list.length)} رکورد</span>
              </div>
              {view === 'grid' ? (
                <div className="wrap-scroll">
                  <table className="grid">
                    <thead>
                      <tr><th className="rn"></th><th>کاربر</th><th>پلن</th><th>مبلغ (تومان)</th><th>وضعیت</th><th>تاریخ</th><th>شناسه تراکنش</th><th>عملیات</th></tr>
                    </thead>
                    <tbody>
                      {list.length === 0 && <tr><td colSpan="8" className="empty">تراکنشی پیدا نشد</td></tr>}
                      {list.map((o, i) => {
                        const [label, cls] = ORDER_STATUS[o.status] || [o.status, 'off']
                        return (
                          <tr key={o.id}>
                            <td className="rn">{fa(i + 1)}</td>
                            <td className="pri">
                              <span className="ava" style={{ background: avaBg(o.userName) }}>{(o.userName || '؟')[0]}</span>
                              {o.userName}
                              <div className="muted ltr" style={{ marginInlineStart: 31 }}>{o.userPhone}</div>
                            </td>
                            <td>{o.planTitle}</td>
                            <td>{fa(toman(o))}</td>
                            <td><span className={`pill ${cls}`}>{label}</span></td>
                            <td className="muted">{faDT(o.createdAt)}</td>
                            <td className="muted ltr" style={{ fontSize: 10.5 }}>{o.chargeId || '—'}</td>
                            <td>{acts(o)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="board">
                  {LANES.map(([status, kc]) => {
                    const [label, cls] = ORDER_STATUS[status]
                    const items = list.filter((o) => o.status === status)
                    return (
                      <div className="lane" key={status}>
                        <div className="lane-h"><span className={`pill ${cls}`}>{label}</span><span className="cnt">{fa(items.length)}</span></div>
                        {items.length === 0 && <div className="none">موردی نیست</div>}
                        {items.map((o) => (
                          <div className="kcard" key={o.id} style={{ '--kc': kc }}>
                            <div className="kn">
                              <span className="ava" style={{ background: avaBg(o.userName) }}>{(o.userName || '؟')[0]}</span>
                              {o.userName}
                            </div>
                            <div className="ks"><span className="ltr">{o.userPhone}</span><span>{fa(toman(o))} تومان</span></div>
                            <div className="ks"><span>{o.planTitle}</span><span>{faDT(o.createdAt)}</span></div>
                            {acts(o)}
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}
