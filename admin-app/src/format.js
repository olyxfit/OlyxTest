export const fa = (n) => Number(n ?? 0).toLocaleString('fa-IR')
export const faDate = (ts) =>
  ts ? new Date(ts).toLocaleDateString('fa-IR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'
export const faDT = (ts) =>
  ts ? new Date(ts).toLocaleString('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }) : '—'

export const PLANS = [
  ['monthly', '۱ ماهه'],
  ['quarterly', '۳ ماهه'],
  ['yearly', '۱۲ ماهه'],
]

export const ORDER_STATUS = {
  pending: ['در انتظار', 'pending'],
  paid: ['پرداخت‌شده', 'paid'],
  expired: ['منقضی', 'expired'],
  canceled: ['لغوشده', 'canceled'],
  failed: ['ناموفق', 'failed'],
}

// رنگ آواتار بر اساس نام — مثل آواتارهای رنگی Smartsheet
const AVA = ['#2f7cf6', '#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6']
export const avaBg = (name = '') => AVA[[...String(name)].reduce((s, c) => s + c.charCodeAt(0), 0) % AVA.length]

// سطح‌بندی کاربر بر اساس مجموع XP — همان جدول کلاینت (client/src/lib/levels.js)
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
export const levelOf = (points = 0) => {
  const idx = LEVELS.reduce((i, l, j) => (points >= l.min ? j : i), 0)
  return { idx, level: LEVELS[idx] }
}
