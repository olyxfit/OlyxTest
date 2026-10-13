import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { fa, faDT, ORDER_STATUS } from '../format.js'

export default function Orders() {
  const [list, setList] = useState(null)

  useEffect(() => {
    api('/admin/orders').then((d) => setList(d.list)).catch(() => setList([]))
  }, [])

  if (!list) return <div className="panel"><div style={{ padding: 16 }}>{[1, 2].map((i) => <div key={i} className="skel" style={{ marginBottom: 8 }} />)}</div></div>

  return (
    <div className="panel wrap-scroll">
      <table>
        <thead>
          <tr><th>کاربر</th><th>پلن</th><th>مبلغ (تومان)</th><th>وضعیت</th><th>تاریخ</th><th>شناسه تراکنش</th></tr>
        </thead>
        <tbody>
          {list.length === 0 && <tr><td colSpan="6" className="empty">سفارشی ثبت نشده</td></tr>}
          {list.map((o) => {
            const [label, cls] = ORDER_STATUS[o.status] || [o.status, 'off']
            return (
              <tr key={o.id}>
                <td>
                  {o.userName}
                  <div className="muted ltr">{o.userPhone}</div>
                </td>
                <td>{o.planTitle}</td>
                <td>{fa(Math.round((o.amountRial || 0) / 10))}</td>
                <td><span className={`pill ${cls}`}>{label}</span></td>
                <td className="muted">{faDT(o.createdAt)}</td>
                <td className="muted ltr" style={{ fontSize: 10.5 }}>{o.chargeId || '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
