import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { faDate } from '../format.js'

export default function Announcements({ notify }) {
  const [list, setList] = useState(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)

  const load = () => api('/announcements').then((d) => setList(d.list)).catch(() => setList([]))
  useEffect(() => { load() }, [])

  const post = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      await api('/announcements', { method: 'POST', body: { title, body } })
      setTitle('')
      setBody('')
      notify('اعلان منتشر شد')
      load()
    } catch (x) { notify(x.message) } finally { setBusy(false) }
  }

  const remove = async (id) => {
    if (!confirm('این اعلان حذف شود؟')) return
    try {
      await api(`/announcements/${id}`, { method: 'DELETE' })
      notify('اعلان حذف شد')
      load()
    } catch (e) { notify(e.message) }
  }

  return (
    <>
      <form className="form" onSubmit={post}>
        <h3>اعلان جدید — برای همهٔ کاربران در تب «اعلان‌ها» نمایش داده می‌شود</h3>
        <input className="field" placeholder="عنوان اعلان" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <textarea className="field" placeholder="متن اعلان…" value={body} onChange={(e) => setBody(e.target.value)} required />
        <button className="btn" style={{ width: 'auto', padding: '10px 30px' }} disabled={busy}>انتشار اعلان</button>
      </form>

      <div className="panel">
        {!list ? (
          <div style={{ padding: 16 }}><div className="skel" /></div>
        ) : list.length === 0 ? (
          <div className="empty">اعلانی منتشر نشده</div>
        ) : list.map((a) => (
          <div className="item" key={a.id}>
            <div className="item-head">
              <b style={{ fontSize: 13.5 }}>{a.title}</b>
              <span>
                <span className="muted">{faDate(a.createdAt)}</span>
                <button className="mini del" title="حذف اعلان" onClick={() => remove(a.id)}>✕</button>
              </span>
            </div>
            <div className="item-body">{a.body}</div>
          </div>
        ))}
      </div>
    </>
  )
}
