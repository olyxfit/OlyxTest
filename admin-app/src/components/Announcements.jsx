import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { fa, faDate } from '../format.js'
import Icon from '../icons.jsx'

export default function Announcements({ notify }) {
  const [list, setList] = useState(null)
  const [open, setOpen] = useState(false)
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
      setOpen(false)
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
      <div className="toolbar">
        <span className="tname"><span className="tsi" style={{ background: '#ef4444' }}><Icon n="mega" s={13} /></span> اعلان‌ها</span>
        <span className="tsub">برای همهٔ کاربران در تب «اعلان‌ها»ی اپ نمایش داده می‌شود</span>
        <span className="tspacer" />
        <button className="tbtn primary" onClick={() => setOpen((v) => !v)}>
          {open ? <><Icon n="x" s={13} /> بستن</> : <><Icon n="plus" s={13} /> اعلان جدید</>}
        </button>
      </div>

      <div className="page">
        {open && (
          <form className="form" onSubmit={post}>
            <h3>اعلان جدید</h3>
            <input className="field" placeholder="عنوان اعلان" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <textarea className="field" placeholder="متن اعلان…" value={body} onChange={(e) => setBody(e.target.value)} required />
            <button className="btn" style={{ width: 'auto', padding: '9px 28px' }} disabled={busy}>انتشار اعلان</button>
            <button type="button" className="mini" style={{ marginRight: 8 }} onClick={() => setOpen(false)}>انصراف</button>
          </form>
        )}

        <div className="sheet">
          {!list ? (
            <div style={{ padding: 14 }}><div className="skel" /></div>
          ) : (
            <div className="wrap-scroll">
              <table className="grid">
                <thead>
                  <tr><th className="rn"></th><th>عنوان</th><th>متن</th><th>تاریخ</th><th></th></tr>
                </thead>
                <tbody>
                  {list.length === 0 && <tr><td colSpan="5" className="empty">اعلانی منتشر نشده</td></tr>}
                  {list.map((a, i) => (
                    <tr key={a.id}>
                      <td className="rn">{fa(i + 1)}</td>
                      <td className="pri">{a.title}</td>
                      <td><div className="celltxt">{a.body}</div></td>
                      <td className="muted">{faDate(a.createdAt)}</td>
                      <td><button className="mini del" title="حذف اعلان" onClick={() => remove(a.id)}><Icon n="x" s={12} /></button></td>
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
