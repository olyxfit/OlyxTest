// سطح‌بندی کاربر بر اساس مجموع XP (هر پاسخ درست = ۱۰ XP)
export const LEVELS = [
  { min: 0, title: 'تازه‌وارد', c: '#64748b' },
  { min: 100, title: 'مبتدی', c: '#0284c7' },
  { min: 300, title: 'پیگیر', c: '#0d9488' },
  { min: 600, title: 'جدی', c: '#16a34a' },
  { min: 1000, title: 'حرفه‌ای', c: '#4f46e5' },
  { min: 1800, title: 'خبره', c: '#7c3aed' },
  { min: 3000, title: 'استاد', c: '#d97706' },
  { min: 5000, title: 'قهرمان', c: '#ea580c' },
  { min: 8000, title: 'افسانه', c: '#e11d48' },
]

export function levelOf(points = 0) {
  const idx = LEVELS.reduce((i, l, j) => (points >= l.min ? j : i), 0)
  const level = LEVELS[idx]
  const next = LEVELS[idx + 1]
  const pct = next
    ? Math.min(100, Math.round(((points - level.min) / (next.min - level.min)) * 100))
    : 100
  return { idx, level, next, pct }
}
