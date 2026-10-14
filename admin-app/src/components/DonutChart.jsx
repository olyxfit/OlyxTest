import { fa } from '../format.js'

// دونات‌چارت SVG با راهنمای کناری — سهم هر دسته از کل
export default function DonutChart({ items, size = 108 }) {
  const list = items || []
  const total = list.reduce((s, i) => s + i.value, 0)
  const R = 40, C = 2 * Math.PI * R
  let acc = 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
      <svg viewBox="0 0 100 100" style={{ width: size, height: size, flex: 'none' }}>
        <circle cx="50" cy="50" r={R} fill="none" stroke="#eef1f6" strokeWidth="15" />
        {total > 0 && list.map((it, i) => {
          const len = (it.value / total) * C
          const off = acc
          acc += len
          return it.value > 0 && (
            <circle key={i} cx="50" cy="50" r={R} fill="none" stroke={it.color} strokeWidth="15"
              strokeDasharray={`${Math.max(0, len - 0.8)} ${C - Math.max(0, len - 0.8)}`}
              strokeDashoffset={-off} transform="rotate(-90 50 50)">
              <title>{it.label}: {fa(it.value)}</title>
            </circle>
          )
        })}
        <text x="50" y="47" textAnchor="middle" fontSize="15" fontWeight="800" fill="#232d3d">{fa(total)}</text>
        <text x="50" y="61" textAnchor="middle" fontSize="8" fill="#96a0b1">مجموع</text>
      </svg>
      <div style={{ flex: 1, minWidth: 120, display: 'flex', flexDirection: 'column', gap: 7 }}>
        {list.map((it) => (
          <div key={it.label} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5 }}>
            <i style={{ width: 9, height: 9, borderRadius: 3, background: it.color, flex: 'none' }} />
            <span style={{ flex: 1, color: '#4a5468' }}>{it.label}</span>
            <b>{fa(it.value)}</b>
            <span className="muted" style={{ minWidth: 30, textAlign: 'end' }}>{total ? fa(Math.round((it.value / total) * 100)) : 0}٪</span>
          </div>
        ))}
      </div>
    </div>
  )
}
