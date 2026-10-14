import { useEffect, useState } from 'react'
import { api, getToken } from '../api.js'
import { fa, faDate, faDT, PLANS, avaBg, levelOf } from '../format.js'
import UserDetail from './UserDetail.jsx'
import Icon from '../icons.jsx'

const WEEK = 7 * 864e5
// سگمنت‌های آمادهٔ CRM — فیلتر سمت کلاینت روی لیست کاربران
const SEGMENTS = [
  { id: 'all', label: 'همه', fn: () => true },
  { id: 'active', label: 'مشترکین فعال', fn: (u) => u.subscription?.until > Date.now() },
  { id: 'expired', label: 'منقضی‌شده', fn: (u) => u.subscription && u.subscription.until <= Date.now() },
  { id: 'free', label: 'بدون اشتراک', fn: (u) => !u.subscription && !u.admin },
  { id: 'inactive', label: 'غیرفعال +۷ روز', fn: (u) => !u.admin && (!u.lastAttemptAt || Date.now() - u.lastAttemptAt > WEEK) },
  { id: 'new', label: 'عضو جدید', fn: (u) => Date.now() - u.createdAt < WEEK },
]

// توپ وضعیت اشتراک به سبک Smartsheet: سبز فعال، زرد <۷روز مانده، قرمز منقضی، خاکستری بدون اشتراک، آبی مدیر
const subBall = (u) =>
  u.admin ? 'a'
    : !u.subscription ? 'n'
    : u.subscription.until <= Date.now() ? 'r'
    : u.subscription.until - Date.now() <= WEEK ? 'y'
    : 'g'
const BALL_LABEL = { g: 'اشتراک فعال', y: 'فعال — کمتر از ۷ روز مانده', r: 'منقضی', n: 'بدون اشتراک', a: 'مدیر' }
// لین‌های نمای کارت
const LANES = [
  ['g', 'فعال', '#2fae6a'],
  ['y', 'رو به اتمام', '#f0b429'],
  ['r', 'منقضی', '#e05252'],
  ['n', 'بدون اشتراک', '#c3cbd6'],
]

export default function Users({ notify }) {
  const [users, setUsers] = useState(null)
  const [q, setQ] = useState('')
  const [seg, setSeg] = useState('all')
  const [view, setView] = useState('grid')
  const [detailId, setDetailId] = useState(null)
  const [addOpen, setAddOpen] = useState(false)
  const [nName, setNName] = useState('')
  const [nPhone, setNPhone] = useState('')
  const [nPass, setNPass] = useState('')

  // ساخت دستی کاربر — شمارهٔ تکراری کاربر موجود را برمی‌گرداند و حساب جدید نمی‌سازد
  const addUser = async (e) => {
    e.preventDefault()
    try {
      const r = await api('/admin/users', { method: 'POST', body: { name: nName, phone: nPhone, password: nPass || undefined } })
      notify(r.existed ? 'این شماره قبلاً ثبت شده — کاربر موجود باز شد' : 'کاربر جدید ساخته شد')
      setAddOpen(false)
      setNName(''); setNPhone(''); setNPass('')
      load()
      if (!r.existed) setDetailId(r.user.id)
    } catch (x) { notify(x.message) }
  }

  const load = () => api('/admin/users').then((d) => setUsers(d.list)).catch(() => setUsers([]))
  useEffect(() => { load() }, [])

  const grant = async (e, userId, plan) => {
    e.stopPropagation()
    try {
      await api(`/admin/users/${userId}/subscription`, { method: 'POST', body: { plan } })
      notify('اشتراک فعال شد')
      load()
    } catch (x) { notify(x.message) }
  }

  const revoke = async (e, userId) => {
    e.stopPropagation()
    if (!confirm('اشتراک این کاربر لغو شود؟')) return
    try {
      await api(`/admin/users/${userId}/subscription`, { method: 'DELETE' })
      notify('اشتراک لغو شد')
      load()
    } catch (x) { notify(x.message) }
  }

  // حذف کامل کاربر — حساب و سوابق آزمونش پاک می‌شود؛ سفارش‌ها برای حسابداری می‌مانند
  const removeUser = async (e, userId) => {
    e.stopPropagation()
    if (!confirm('این کاربر برای همیشه حذف شود؟ حساب، نشست‌ها و سوابق آزمونش پاک می‌شود.')) return
    try {
      await api(`/admin/users/${userId}`, { method: 'DELETE' })
      notify('کاربر حذف شد')
      load()
    } catch (x) { notify(x.message) }
  }

  // دانلود CSV با هدر Authorization — لینک مستقیم توکن را نمی‌فرستد
  const exportCsv = async () => {
    const r = await fetch('/api/admin/export/users.csv', { headers: { authorization: 'Bearer ' + getToken() } })
    if (!r.ok) return notify('خطا در خروجی گرفتن')
    const url = URL.createObjectURL(await r.blob())
    const a = document.createElement('a')
    a.href = url
    a.download = 'users.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (detailId) {
    return <UserDetail userId={detailId} onBack={() => { setDetailId(null); load() }} onChanged={load} notify={notify} />
  }
  if (!users) {
    return (
      <>
        <Toolbar q={q} setQ={setQ} view={view} setView={setView} exportCsv={exportCsv} addOpen={addOpen} setAddOpen={setAddOpen} />
        <div className="page"><div className="sheet"><div style={{ padding: 14 }}>{[1, 2, 3].map((i) => <div key={i} className="skel" style={{ marginBottom: 8 }} />)}</div></div></div>
      </>
    )
  }

  // جست‌وجو: ارقام فارسی/عربی هم با دادهٔ لاتین مچ می‌شوند
  const norm = (s) => String(s || '')
    .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
  const qq = norm(q)
  const segFn = SEGMENTS.find((s) => s.id === seg).fn
  const list = users.filter(segFn).filter((u) => !qq || norm(u.name).includes(qq) || norm(u.phone).includes(qq))
  const countOf = (id) => users.filter(SEGMENTS.find((s) => s.id === id).fn).length
  const lanes = [...LANES]
  if (list.some((u) => u.admin)) lanes.push(['a', 'مدیران', '#2f7cf6'])

  return (
    <>
      <Toolbar q={q} setQ={setQ} view={view} setView={setView} exportCsv={exportCsv} addOpen={addOpen} setAddOpen={setAddOpen} />

      <div className="page">
        {/* فرم ساخت کاربر جدید — ثبت‌نام حضوری/دستی توسط مدیر */}
        {addOpen && (
          <form className="form" onSubmit={addUser}>
            <h3>کاربر جدید</h3>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input className="field" style={{ flex: 1, minWidth: 150, margin: 0 }} value={nName} onChange={(e) => setNName(e.target.value)} placeholder="نام و نام خانوادگی" required />
              <input className="field ltr" style={{ flex: 1, minWidth: 140, margin: 0 }} value={nPhone} onChange={(e) => setNPhone(e.target.value)} placeholder="نام کاربری" required />
              <input className="field ltr" style={{ flex: 1, minWidth: 130, margin: 0 }} value={nPass} onChange={(e) => setNPass(e.target.value)} placeholder="رمز (اختیاری)" />
              <button className="btn" style={{ width: 'auto', padding: '9px 24px' }}>ساخت کاربر</button>
              <button type="button" className="mini" onClick={() => setAddOpen(false)}>انصراف</button>
            </div>
            <div className="muted" style={{ marginTop: 6 }}>بدون رمز، کاربر نمی‌تواند وارد شود. اگر نام کاربری تکراری باشد، همان کاربر موجود باز می‌شود.</div>
          </form>
        )}
        <div className="sheet">
          {/* نوار فیلتر داخل شیت — مثل فیلتر Smartsheet */}
          <div className="fbar">
            <span className="fl"><Icon n="filter" s={12} /> فیلتر:</span>
            {SEGMENTS.map((s) => (
              <button key={s.id} className={`tbtn chip ${seg === s.id ? 'on' : ''}`} onClick={() => setSeg(s.id)}>
                {s.label} <i>{fa(countOf(s.id))}</i>
              </button>
            ))}
          </div>

          {view === 'grid' ? (
            <div className="wrap-scroll">
              <table className="grid">
                <thead>
                  <tr>
                    <th className="rn"></th>
                    <th>نام</th><th>نام کاربری</th><th title="وضعیت اشتراک"></th><th>اشتراک</th>
                    <th dir="ltr">XP</th><th>استریک</th><th>آزمون</th><th>آخرین فعالیت</th><th>عضویت</th><th>عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {list.length === 0 && <tr><td colSpan="11" className="empty">کاربری در این سگمنت نیست</td></tr>}
                  {list.map((u, i) => {
                    const active = u.subscription && u.subscription.until > Date.now()
                    const b = subBall(u)
                    const lv = levelOf(u.points)
                    return (
                      <tr key={u.id} className="rowlink" onClick={() => setDetailId(u.id)} title="نمای کامل کاربر">
                        <td className="rn">{fa(i + 1)}</td>
                        <td className="pri">
                          <span className="ava" style={{ background: avaBg(u.name) }}>{(u.name || '؟')[0]}</span>
                          {u.name}{' '}
                          {u.admin && <span className="pill ok">مدیر</span>}
                        </td>
                        <td className="ltr">{u.phone}</td>
                        <td><span className={`ball ${b}`} title={BALL_LABEL[b]} /></td>
                        <td>
                          {active
                            ? <span className="pill ok">{u.subscription.title} • تا {faDate(u.subscription.until)}</span>
                            : u.subscription
                              ? <span className="pill expired">منقضی {faDate(u.subscription.until)}</span>
                              : <span className="pill off">—</span>}
                        </td>
                        <td>
                          {fa(u.points)}
                          <div className="muted" style={{ fontSize: 10, fontWeight: 800, color: lv.level.c }}>
                            سطح {fa(lv.idx + 1)} · {lv.level.title}
                          </div>
                        </td>
                        <td>{fa(u.streak)}</td>
                        <td>{fa(u.exams)}</td>
                        <td className="muted">{faDT(u.lastAttemptAt)}</td>
                        <td className="muted">{faDate(u.createdAt)}</td>
                        <td>
                          {!u.admin && (
                            <>
                              <select
                                className="plan"
                                defaultValue=""
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => { if (e.target.value) grant(e, u.id, e.target.value); e.target.value = '' }}
                              >
                                <option value="">اعطای اشتراک…</option>
                                {PLANS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                              </select>
                              {u.subscription && (
                                <button className="mini revoke" style={{ marginRight: 6 }} onClick={(e) => revoke(e, u.id)}>لغو</button>
                              )}
                              <button className="mini del" title="حذف کاربر" onClick={(e) => removeUser(e, u.id)}><Icon n="trash" s={12} /></button>
                            </>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* نمای کارت — لین بر اساس وضعیت اشتراک */
            <div className="board">
              {lanes.map(([laneId, label, kc]) => {
                const items = list.filter((u) => subBall(u) === laneId)
                return (
                  <div className="lane" key={laneId}>
                    <div className="lane-h"><span>{label}</span><span className="cnt">{fa(items.length)}</span></div>
                    {items.length === 0 && <div className="none">موردی نیست</div>}
                    {items.map((u) => {
                      const active = u.subscription && u.subscription.until > Date.now()
                      const lv = levelOf(u.points)
                      return (
                        <div className="kcard link" key={u.id} style={{ '--kc': kc }} onClick={() => setDetailId(u.id)}>
                          <div className="kn"><span className="ava" style={{ background: avaBg(u.name) }}>{(u.name || '؟')[0]}</span>{u.name} {u.admin && <span className="pill ok">مدیر</span>}</div>
                          <div className="ks"><span className="ltr">{u.phone}</span><span>{fa(u.exams)} آزمون</span></div>
                          <div className="ks">
                            <span>{active ? `تا ${faDate(u.subscription.until)}` : u.subscription ? 'منقضی' : 'بدون اشتراک'}</span>
                            <span>{fa(u.points)} <span dir="ltr">XP</span></span>
                            <span style={{ color: lv.level.c, fontWeight: 800 }}>{lv.level.title}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function Toolbar({ q, setQ, view, setView, exportCsv, addOpen, setAddOpen }) {
  return (
    <div className="toolbar">
      <span className="tname"><span className="tsi" style={{ background: '#2f7cf6' }}><Icon n="users" s={13} /></span> کاربران</span>
      <span className="vswitch">
        <button className={view === 'grid' ? 'on' : ''} onClick={() => setView('grid')}><Icon n="table" s={12} /> گرید</button>
        <button className={view === 'card' ? 'on' : ''} onClick={() => setView('card')}><Icon n="cards" s={12} /> کارت</button>
      </span>
      <span className="tspacer" />
      <button className={`tbtn ${addOpen ? 'primary' : ''}`} onClick={() => setAddOpen((v) => !v)}><Icon n="plus" s={13} /> کاربر جدید</button>
      <span className="searchbox">
        <input placeholder="جست‌وجوی نام یا نام کاربری…" value={q} onChange={(e) => setQ(e.target.value)} />
        <span className="si"><Icon n="search" s={13} /></span>
      </span>
      <button className="tbtn" onClick={exportCsv}><Icon n="download" s={13} /> خروجی CSV</button>
    </div>
  )
}
