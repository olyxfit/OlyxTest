import { useState } from 'react'
import { fa } from '../format.js'

// منحنی خطی با سایهٔ زیر منحنی — چندسری، SVG خام بدون کتابخانه
const W = 320, PADX = 6
let uidSeq = 0

// Catmull-Rom → بزیه مکعبی: منحنی نرم از میان نقاط
const smooth = (pts) => {
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i]
    const p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)]
    d += ` C${(p1.x + (p2.x - p0.x) / 6).toFixed(1)},${(p1.y + (p2.y - p0.y) / 6).toFixed(1)}`
      + ` ${(p2.x - (p3.x - p1.x) / 6).toFixed(1)},${(p2.y - (p3.y - p1.y) / 6).toFixed(1)}`
      + ` ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`
  }
  return d
}

export default function LineChart({ series, height = 110, unit = '', area = true }) {
  const [uid] = useState(() => ++uidSeq)
  const list = (series || []).filter((s) => s.data?.length)
  if (!list.length) return null
  const n = Math.max(...list.map((s) => s.data.length))
  const max = Math.max(1, ...list.flatMap((s) => s.data))
  const X = (i) => PADX + (n === 1 ? (W - PADX * 2) / 2 : (i / (n - 1)) * (W - PADX * 2))
  const Y = (v) => height - 12 - (v / max) * (height - 32)
  const base = Y(0)

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" style={{ width: '100%', height, display: 'block' }}>
        <defs>
          {list.map((s, k) => (
            <linearGradient key={k} id={`lg${uid}-${k}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={s.color} stopOpacity=".3" />
              <stop offset="1" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
        {/* خطوط راهنمای افقی */}
        {[0.25, 0.5, 0.75, 1].map((g) => (
          <line key={g} x1={PADX} x2={W - PADX} y1={Y(max * g)} y2={Y(max * g)} stroke="#eef1f6" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        ))}
        <line x1={PADX} x2={W - PADX} y1={base} y2={base} stroke="#e2e6ec" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <text x={W - PADX - 2} y={Y(max) + 9} textAnchor="end" fontSize="8.5" fill="#b6bfcc">{fa(max)}{unit}</text>

        {list.map((s, k) => {
          const pts = s.data.map((v, i) => ({ x: X(i), y: Y(v) }))
          const d = smooth(pts)
          const last = pts[pts.length - 1]
          return (
            <g key={k}>
              {area && <path d={`${d} L${last.x.toFixed(1)},${base} L${pts[0].x.toFixed(1)},${base} Z`} fill={`url(#lg${uid}-${k})`} />}
              <path d={d} fill="none" stroke={s.color} strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              {pts.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="2.4" fill="#fff" stroke={s.color} strokeWidth="1.6">
                  <title>{(s.labels?.[i] ? s.labels[i] + ' — ' : '') + fa(s.data[i]) + unit}</title>
                </circle>
              ))}
            </g>
          )
        })}
      </svg>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 11, color: '#64748b', marginTop: 4 }}>
        {list.map((s, k) => (
          <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <i style={{ width: 9, height: 9, borderRadius: 3, background: s.color }} />
            {s.name}
            <b>{fa(s.data.reduce((a, b) => a + b, 0))}{unit}</b>
          </span>
        ))}
      </div>
    </div>
  )
}
