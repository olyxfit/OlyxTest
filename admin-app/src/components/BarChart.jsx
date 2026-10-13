// مینی‌چارت میله‌ای ۳۰ روزه — بدون کتابخانه، SVG خام
export default function BarChart({ data, color = '#4f46e5', height = 72 }) {
  if (!data?.length) return null
  const max = Math.max(1, ...data)
  const total = data.reduce((s, v) => s + v, 0)
  const w = 100 / data.length
  return (
    <div>
      <svg viewBox={`0 0 ${data.length * 10} ${height}`} preserveAspectRatio="none" style={{ width: '100%', height, display: 'block' }}>
        {data.map((v, i) => {
          const h = (v / max) * (height - 6)
          return (
            <rect
              key={i}
              x={i * 10 + 1}
              y={height - h}
              width={8}
              height={h}
              rx={2}
              fill={v ? color : '#e2e8f0'}
            >
              <title>{v}</title>
            </rect>
          )
        })}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginTop: 4 }}>
        <span>۳۰ روز اخیر</span>
        <b>مجموع: {total.toLocaleString('fa-IR')}</b>
      </div>
    </div>
  )
}
