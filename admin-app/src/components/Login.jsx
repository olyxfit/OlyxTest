import { useState } from 'react'
import Icon from '../icons.jsx'

export default function Login({ onLogin }) {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    setBusy(true)
    try {
      await onLogin(phone.trim(), password)
    } catch (x) {
      setErr(x.message || 'ورود ناموفق بود')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <div className="logo"><Icon n="shield" s={24} /></div>
        <h1>پنل مدیریت</h1>
        <p>آزمون مربیگری بدنسازی و فیتنس — ورود با حساب مدیر</p>
        <input
          className="field ltr"
          placeholder="نام کاربری"
          inputMode="text"
          autoComplete="username"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
        <input
          className="field ltr"
          type="password"
          placeholder="رمز عبور"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <div className="err">{err}</div>
        <button className="btn" disabled={busy}>{busy ? 'در حال ورود…' : 'ورود'}</button>
      </form>
    </div>
  )
}
