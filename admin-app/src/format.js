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
