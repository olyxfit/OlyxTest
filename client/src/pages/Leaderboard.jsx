import { useEffect, useState } from 'react'
import { Crown, Trophy } from 'lucide-react'
import { api } from '../lib/api.js'
import { useAuth } from '../lib/auth.jsx'

const toFa = (n) => (Number.isFinite(Number(n)) ? Number(n).toLocaleString('fa-IR') : '۰')

const PERIODS = [
  { id: 'day', label: 'امروز' },
  { id: 'week', label: '۷ روز' },
  { id: 'month', label: '۳۰ روز' },
  { id: 'all', label: 'کل' },
]

const rankBadge = (rank) =>
  rank === 1
    ? 'bg-gradient-to-br from-amber-300 to-amber-500 text-[#0b0f14] shadow-lg shadow-amber-500/30'
    : rank === 2
    ? 'bg-gradient-to-br from-slate-200 to-slate-400 text-[#0b0f14]'
    : rank === 3
    ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white'
    : 'bg-[#f1f2f6] border border-[#e6e8f0] text-slate-500'

export default function Leaderboard() {
  const [period, setPeriod] = useState('week')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    setLoading(true)
    api(`/leaderboard?period=${period}`)
      .then(setData)
      .catch(() => setData({ list: [], me: null }))
      .finally(() => setLoading(false))
  }, [period])

  const top = data?.list ?? []

  return (
    <div className="px-4 py-6 space-y-5 pb-10">
      {/* title + my rank */}
      <div className="flex items-center gap-3 animate-pop">
        <span className="size-11 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 grid place-items-center shadow-lg shadow-amber-500/25">
          <Trophy className="size-5 text-[#0b0f14]" />
        </span>
        <div>
          <h2 className="text-xl font-extrabold">جدول امتیازات</h2>
          <p className="on-photo text-xs mt-0.5">هر پاسخ درست = {toFa(10)} امتیاز</p>
        </div>
      </div>

      {data?.me ? (
        <div className="card p-4 flex items-center justify-between border-amber-500/30 bg-gradient-to-l from-amber-500/10 to-transparent animate-pop">
          <span className="flex items-center gap-3">
            <Crown className="size-5 text-amber-500" />
            <span>
              <span className="block text-sm font-bold">رتبهٔ شما</span>
              <span className="block text-[11px] text-slate-500 mt-0.5">
                {toFa(data.me.exams)} آزمون • بهترین {toFa(data.me.best)}٪
              </span>
            </span>
          </span>
          <span className="text-left">
            <span className="block text-xl font-extrabold text-amber-600">#{toFa(data.me.rank)}</span>
            <span className="block text-[11px] text-slate-500">{toFa(data.me.points)} امتیاز</span>
          </span>
        </div>
      ) : (
        !loading && (
          <div className="card p-4 text-sm text-slate-500 leading-6 animate-pop">
            در این بازه هنوز امتیازی ندارید — یک آزمون بدهید و وارد جدول شوید!
          </div>
        )
      )}

      {/* period tabs */}
      <div className="grid grid-cols-4 gap-2 card p-1.5">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className={`py-2 rounded-xl text-xs font-bold transition-all ${
              period === p.id
                ? 'bg-gradient-to-l from-indigo-800 to-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                : 'text-slate-500 hover:text-slate-600'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* list */}
      {loading ? (
        <div className="space-y-2.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-14" />
          ))}
        </div>
      ) : top.length === 0 ? (
        <div className="card p-8 text-center text-sm text-slate-500">
          هنوز کسی در این بازه امتیازی نگرفته است — نفر اول شما باشید!
        </div>
      ) : (
        <div className="space-y-2.5">
          {top.map((r, i) => {
            const isMe = r.userId === user?.id
            return (
              <div
                key={r.userId}
                className={`card px-4 py-3 flex items-center gap-3 animate-pop ${
                  isMe ? 'border-indigo-500/60 bg-indigo-500/10' : ''
                }`}
                style={{ animationDelay: `${Math.min(i * 40, 400)}ms` }}
              >
                <span className={`size-9 shrink-0 rounded-xl grid place-items-center text-sm font-extrabold ${rankBadge(r.rank)}`}>
                  {toFa(r.rank)}
                </span>
                <span className="size-9 shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 grid place-items-center text-sm font-extrabold text-white">
                  {r.name?.[0] || '؟'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate">
                    {r.name}
                    {isMe && <span className="text-indigo-600 text-[11px] font-normal"> (شما)</span>}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {toFa(r.exams)} آزمون • بهترین {toFa(r.best)}٪
                  </div>
                </div>
                <div className="shrink-0 text-left">
                  <div className="text-sm font-extrabold text-amber-600">{toFa(r.points)}</div>
                  <div className="text-[10px] text-slate-500">امتیاز</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
