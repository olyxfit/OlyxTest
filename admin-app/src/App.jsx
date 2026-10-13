import { useEffect, useRef, useState } from 'react'
import { api, getToken, setToken, clearToken } from './api.js'
import Login from './components/Login.jsx'
import Overview from './components/Overview.jsx'
import Users from './components/Users.jsx'
import Orders from './components/Orders.jsx'
import Reviews from './components/Reviews.jsx'
import Announcements from './components/Announcements.jsx'

const NAV = [
  { id: 'dash', label: 'نمای کلی', icon: '◧', title: 'آمار کلی سامانه' },
  { id: 'users', label: 'کاربران', icon: '👥', title: 'مدیریت کاربران و اشتراک‌ها' },
  { id: 'orders', label: 'سفارش‌ها', icon: '🧾', title: 'سفارش‌ها و پرداخت‌ها' },
  { id: 'reviews', label: 'نظرها', icon: '⭐', title: 'نظرات کاربران' },
  { id: 'anns', label: 'اعلان‌ها', icon: '📢', title: 'مدیریت اعلان‌های اپ' },
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

  const nav = NAV.find((n) => n.id === tab)
  const pageProps = { notify }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          پنل مدیریت
          <small>OlyxTest — آزمون مربیگری</small>
        </div>
        {NAV.map((n) => (
          <button key={n.id} className={`nav-item ${tab === n.id ? 'on' : ''}`} onClick={() => setTab(n.id)}>
            <span>{n.icon}</span> {n.label}
          </button>
        ))}
        <div className="foot">
          <div className="who">{user.name} • <span className="ltr">{user.phone}</span></div>
          <button className="logout" onClick={logout}>خروج از حساب</button>
        </div>
      </aside>

      <main className="main">
        <div className="page-title">{nav.label}</div>
        <div className="page-sub">{nav.title}</div>
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
