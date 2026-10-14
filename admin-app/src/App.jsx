import { useEffect, useRef, useState } from 'react'
import { api, getToken, setToken, clearToken } from './api.js'
import Login from './components/Login.jsx'
import Overview from './components/Overview.jsx'
import Users from './components/Users.jsx'
import Finance from './components/Finance.jsx'
import Reviews from './components/Reviews.jsx'
import Announcements from './components/Announcements.jsx'
import Icon from './icons.jsx'

// ناوبری سایدبار — بخش‌ها زیر گروه‌های موضوعی دسته‌بندی شده‌اند؛
// c رنگ کاشی آیکون و لبهٔ آیتم فعال است
const NAV = [
  {
    g: 'گزارش و تحلیل',
    items: [{ id: 'dash', label: 'داشبورد', icon: 'dashboard', c: '#8b5cf6' }],
  },
  {
    g: 'مدیریت',
    items: [
      { id: 'users', label: 'کاربران', icon: 'users', c: '#2f7cf6' },
      { id: 'finance', label: 'مدیریت مالی', icon: 'money', c: '#1fa564' },
    ],
  },
  {
    g: 'ارتباط با کاربران',
    items: [
      { id: 'reviews', label: 'نظرها', icon: 'star', c: '#f0a818' },
      { id: 'anns', label: 'اعلان‌ها', icon: 'mega', c: '#ef4444' },
    ],
  },
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
      <aside className="sidebar">
        <div className="sb-brand">
          <span className="tb-logo"><Icon n="dashboard" s={15} /></span>
          <span className="sb-titles">
            <b>پنل مدیریت OlyxTest</b>
            <small>آزمون مربیگری بدنسازی و فیتنس</small>
          </span>
        </div>

        <nav className="sb-nav">
          {NAV.map((grp) => (
            <div className="sb-group" key={grp.g}>
              <div className="sb-glabel">{grp.g}</div>
              {grp.items.map((n) => (
                <button key={n.id} className={`snav ${tab === n.id ? 'on' : ''}`} style={{ '--tc': n.c }} onClick={() => setTab(n.id)}>
                  <span className="si" style={{ background: n.c }}><Icon n={n.icon} s={11} /></span>{n.label}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sb-foot">
          <span className="tb-user">
            <span className="tb-avatar">{(user.name || '؟')[0]}</span>
            <span className="nm">{user.name} • <span className="ltr">{user.phone}</span></span>
          </span>
          <a className="tb-applink" href="/" title="باز کردن اپ"><Icon n="phone" s={13} /> اپ</a>
          <button className="tb-logout" onClick={logout}><Icon n="logout" s={13} /> خروج</button>
        </div>
      </aside>

      <main className="workspace">
        {tab === 'dash' && <Overview {...pageProps} />}
        {tab === 'users' && <Users {...pageProps} />}
        {tab === 'finance' && <Finance {...pageProps} />}
        {tab === 'reviews' && <Reviews {...pageProps} />}
        {tab === 'anns' && <Announcements {...pageProps} />}
      </main>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
