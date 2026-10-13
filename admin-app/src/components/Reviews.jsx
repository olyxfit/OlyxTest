import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { faDate } from '../format.js'

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

  if (!list) return <div className="panel"><div style={{ padding: 16 }}>{[1, 2].map((i) => <div key={i} className="skel" style={{ marginBottom: 8 }} />)}</div></div>

  return (
    <div className="panel">
      {list.length === 0 && <div className="empty">نظری ثبت نشده</div>}
      {list.map((f) => (
        <div className="item" key={f.id}>
          <div className="item-head">
            <span>
              <b style={{ fontSize: 13 }}>{f.name}</b>{' '}
              <span className="muted ltr">{f.phone}</span>
            </span>
            <span className="stars">{f.rating >= 1 && f.rating <= 5 ? '★'.repeat(f.rating) + '☆'.repeat(5 - f.rating) : '—'}</span>
            <span className="muted">{faDate(f.createdAt)}</span>
            <button className="mini del" title="حذف نظر" onClick={() => remove(f.id)}>✕</button>
          </div>
          <div className="item-body">{f.text}</div>
        </div>
      ))}
    </div>
  )
}
