import { useEffect, useState } from 'react'
import { api, getToken } from '../api.js'
import { fa, faDate, faDT, PLANS } from '../format.js'
import UserDetail from './UserDetail.jsx'

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

export default function Users({ notify }) {
  const [users, setUsers] = useState(null)
  const [q, setQ] = useState('')
  const [seg, setSeg] = useState('all')
  const [detailId, setDetailId] = useState(null)

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
  if (!users) return <div className="panel"><div style={{ padding: 16 }}>{[1, 2, 3].map((i) => <div key={i} className="skel" style={{ marginBottom: 8 }} />)}</div></div>

  // جست‌وجو: ارقام فارسی/عربی هم با دادهٔ لاتین مچ می‌شوند
  const norm = (s) => String(s || '')
    .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
  const qq = norm(q)
  const segFn = SEGMENTS.find((s) => s.id === seg).fn
  const list = users.filter(segFn).filter((u) => !qq || norm(u.name).includes(qq) || norm(u.phone).includes(qq))
  const countOf = (id) => users.filter(SEGMENTS.find((s) => s.id === id).fn).length

  return (
    <>
      {/* سگمنت‌ها */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {SEGMENTS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSeg(s.id)}
            className="mini"
            style={seg === s.id
              ? { background: 'var(--indigo)', color: '#fff', borderColor: 'var(--indigo)', padding: '7px 14px' }
              : { padding: '7px 14px' }}
          >
            {s.label} <span style={{ opacity: .75 }}>({fa(countOf(s.id))})</span>
          </button>
        ))}
        <button className="mini" onClick={exportCsv} style={{ marginRight: 'auto', borderColor: '#a7f3d0', color: 'var(--ok)', padding: '7px 14px' }}>
          ⬇ خروجی CSV
        </button>
      </div>

      <div className="search">
        <input className="field" placeholder="جست‌وجوی نام یا شماره موبایل…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="panel wrap-scroll">
        <table>
          <thead>
            <tr>
              <th>نام</th><th>موبایل</th><th>اشتراک</th><th>امتیاز</th><th>استریک</th>
              <th>آزمون</th><th>آخرین فعالیت</th><th>عضویت</th><th>عملیات</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan="9" className="empty">کاربری در این سگمنت نیست</td></tr>}
            {list.map((u) => {
              const active = u.subscription && u.subscription.until > Date.now()
              return (
                <tr key={u.id} onClick={() => setDetailId(u.id)} style={{ cursor: 'pointer' }} title="نمای کامل کاربر">
                  <td>
                    {u.name}{' '}
                    {u.admin && <span className="pill ok">مدیر</span>}
                  </td>
                  <td className="ltr">{u.phone}</td>
                  <td>
                    {active
                      ? <span className="pill ok">{u.subscription.title} • تا {faDate(u.subscription.until)}</span>
                      : u.subscription
                        ? <span className="pill expired">منقضی {faDate(u.subscription.until)}</span>
                        : <span className="pill off">—</span>}
                  </td>
                  <td>{fa(u.points)}</td>
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
                      </>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
