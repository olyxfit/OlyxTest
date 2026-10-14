import { useEffect, useRef, useState } from 'react'
import { api, getToken, setToken, clearToken } from './api.js'
import Login from './components/Login.jsx'
import Overview from './components/Overview.jsx'
import Users from './components/Users.jsx'
import Orders from './components/Orders.jsx'
import Reviews from './components/Reviews.jsx'
import Announcements from './components/Announcements.jsx'

// هر بخش = یک «شیت» باز در استایل Smartsheet
const NAV = [
  { id: 'dash', label: 'داشبورد', icon: '📊' },
  { id: 'users', label: 'کاربران', icon: '👥' },
  { id: 'orders', label: 'سفارش‌ها', icon: '🧾' },
  { id: 'reviews', label: 'نظرها', icon: '⭐' },
  { id: 'anns', label: 'اعلان‌ها', icon: '�' },
]

export default function App() {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(!!getToken())
  const [tab, setTab] = useState('dash')
  const [toast, setToast] = useState(null)
  const notifyId = useRef(0)

  const notify = (msg) => {
    // فقط آخرین توست زنده می‌ماند تا پیام‌های پشت سر هم همدیگر را زود نبندند
    const id = ++notifyId.current
    setToast(msg)
    setTimeout(() => { if (notifyId.current === id) setToast(null) }, 2600)
  }

  // نشست قبلی: با /me اعتبار توکن چک می‌شود
  useEffect(() => {
    if (!getToken()) return
    api('/me')
      .then((d) => (d.user?.admin ? setUser(d.user) : clearToken()))
      .catch(() => clearToken())
      .finally(() => setChecking(false))
  }, [])

  const onLogin = async (phone, password) => {
    const d = await api('/login', { method: 'POST', body: { phone, password } })
    if (!d.user?.admin) throw new Error('این حساب دسترسی مدیریت ندارد')
    setToken(d.token)
    setUser(d.user)
  }

  const logout = async () => {
    try { await api('/logout', { method: 'POST' }) } catch { /* نشست هر طور بود پاک می‌شود */ }
    clearToken()
    setUser(null)
  }

  if (checking) return <div className="login-page"><div className="skel" style={{ width: 200, height: 60 }} /></div>
  if (!user) return <Login onLogin={onLogin} />

  const pageProps = { notify }

  return (
    <div className="shell">
      <header className="topbar">
        <span className="tb-logo">▦</span>
        <span className="tb-title">پنل مدیریت OlyxTest</span>
        <span className="tb-sub">آزمون مربیگری بدنسازی و فیتنس</span>
        <span className="tb-spacer" />
        <span className="tb-user">
          <span className="tb-avatar">{(user.name || '؟')[0]}</span>
          <span className="nm">{user.name} • <span className="ltr">{user.phone}</span></span>
        </span>
        <button className="tb-logout" onClick={logout}>خروج</button>
      </header>

      <nav className="tabstrip">
        {NAV.map((n) => (
          <button key={n.id} className={`stab ${tab === n.id ? 'on' : ''}`} onClick={() => setTab(n.id)}>
            <span className="si">{n.icon}</span>{n.label}
          </button>
        ))}
      </nav>

      <main className="workspace">
        {tab === 'dash' && <Overview {...pageProps} />}
        {tab === 'users' && <Users {...pageProps} />}
        {tab === 'orders' && <Orders {...pageProps} />}
        {tab === 'reviews' && <Reviews {...pageProps} />}
        {tab === 'anns' && <Announcements {...pageProps} />}
      </main>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
