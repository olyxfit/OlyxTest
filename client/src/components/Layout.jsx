import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BarChart3, Bell, Home, Trophy, UserRound } from 'lucide-react'

const TABS = [
  { to: '/', label: 'خانه', icon: Home },
  { to: '/stats', label: 'آمار', icon: BarChart3 },
  { to: '/leaderboard', label: 'رتبه‌بندی', icon: Trophy },
  { to: '/profile', label: 'پروفایل', icon: UserRound },
]

export default function Layout() {
  const nav = useNavigate()
  const loc = useLocation()
  const inQuiz = loc.pathname.includes('/quiz')

  return (
    <div className="min-h-dvh relative overflow-x-hidden">
      <div className="relative z-10 min-h-dvh max-w-lg mx-auto flex flex-col">
        {!inQuiz && (
          <header className="sticky top-0 z-20 bg-white/60 backdrop-blur-2xl border-b border-white/50 shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_8px_24px_-16px_rgba(15,23,42,0.25)]">
            <div className="flex items-center justify-between px-4 h-15">
              <button onClick={() => nav('/')} className="flex items-center gap-2.5 group">
                <img
                  src="/assets/olyx-logo.svg"
                  alt="Olyx"
                  className="size-9 drop-shadow-[0_3px_10px_rgba(0,200,253,0.45)] transition-transform group-active:scale-95"
                />
                <span dir="ltr" className="font-extrabold text-base tracking-tight text-slate-800">Olyxtest.ai</span>
              </button>
              <button
                onClick={() => nav('/panel')}
                className="size-9 rounded-xl bg-white/60 border border-white/70 backdrop-blur grid place-items-center text-slate-600 shadow-sm hover:bg-white transition-colors active:scale-95"
                title="اطلاع‌رسانی و پشتیبانی"
              >
                <Bell className="size-4" />
              </button>
            </div>
          </header>
        )}
        <main className={`flex-1 flex flex-col ${inQuiz ? '' : 'pb-28'}`}>
          <Outlet />
        </main>

        {!inQuiz && (
          <nav className="fixed bottom-0 inset-x-0 z-30 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pointer-events-none">
            <div className="max-w-lg mx-auto pointer-events-auto grid grid-cols-4 gap-1 p-1.5 rounded-3xl bg-white/70 backdrop-blur-2xl border border-white/60 shadow-[0_1px_0_rgba(255,255,255,0.7)_inset,0_12px_36px_-10px_rgba(15,23,42,0.30)]">
              {TABS.map((t) => (
                <NavLink
                  key={t.to}
                  to={t.to}
                  end={t.to === '/'}
                  className={({ isActive }) =>
                    `flex flex-col items-center justify-center gap-1 py-2 rounded-2xl text-[10px] font-bold transition-all active:scale-95 ${
                      isActive
                        ? 'bg-gradient-to-b from-indigo-500 to-indigo-700 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-white/30 ring-inset'
                        : 'text-slate-500'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <t.icon className="size-5" strokeWidth={isActive ? 2.4 : 2} />
                      {t.label}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </nav>
        )}
      </div>
    </div>
  )
}
