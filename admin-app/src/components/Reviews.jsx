import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { fa, faDate, avaBg } from '../format.js'
import Icon from '../icons.jsx'

export default function Reviews({ notify }) {
  const [list, setList] = useState(null)

  const load = () => api('/admin/feedback').then((d) => setList(d.list)).catch(() => setList([]))
  useEffect(() => { load() }, [])

  const remove = async (id) => {
    if (!confirm('این نظر حذف شود؟')) return
    try {
      await api(`/admin/feedback/${id}`, { method: 'DELETE' })
      notify('نظر حذف شد')
      load()
    } catch (e) { notify(e.message) }
  }

  return (
    <>
      <div className="toolbar">
        <span className="tname"><span className="tsi" style={{ background: '#f0a818' }}><Icon n="star" s={13} /></span> نظرها</span>
        {list && <span className="tsub">{fa(list.length)} نظر ثبت‌شده</span>}
      </div>

      <div className="page">
        <div className="sheet">
          {!list ? (
            <div style={{ padding: 14 }}>{[1, 2].map((i) => <div key={i} className="skel" style={{ marginBottom: 8 }} />)}</div>
          ) : (
            <div className="wrap-scroll">
              <table className="grid">
                <thead>
                  <tr><th className="rn"></th><th>کاربر</th><th>امتیاز</th><th>متن نظر</th><th>تاریخ</th><th></th></tr>
                </thead>
                <tbody>
                  {list.length === 0 && <tr><td colSpan="6" className="empty">نظری ثبت نشده</td></tr>}
                  {list.map((f, i) => (
                    <tr key={f.id}>
                      <td className="rn">{fa(i + 1)}</td>
                      <td className="pri">
                        <span className="ava" style={{ background: avaBg(f.name) }}>{(f.name || '؟')[0]}</span>
                        {f.name}
                        <div className="muted ltr">{f.phone}</div>
                      </td>
                      <td><span className="stars">{f.rating >= 1 && f.rating <= 5 ? '★'.repeat(f.rating) + '☆'.repeat(5 - f.rating) : '—'}</span></td>
                      <td><div className="celltxt">{f.text}</div></td>
                      <td className="muted">{faDate(f.createdAt)}</td>
                      <td><button className="mini del" title="حذف نظر" onClick={() => remove(f.id)}><Icon n="x" s={12} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
