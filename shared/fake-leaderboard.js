// کاربران فیک رتبه‌بندی — تا جدول همیشه پر و رقابتی دیده شود.
// خروجی قطعی (deterministic) است: همان seed برای همهٔ کاربران نتیجهٔ یکسان می‌دهد.
// هم در سرور (server/index.js) و هم در بک‌اند دموی کلاینت (lib/demo.js) استفاده می‌شود.

const FAKE_NAMES = [
  'امیررضا محمدی', 'سارا حسینی', 'محمد کریمی', 'نگار صادقی',
  'علی نادری', 'فاطمه رستمی', 'حسین قاسمی', 'مریم احمدی',
  'رضا جلالی', 'زهرا موسوی', 'بهرام عزیزی', 'نرگس شریفی',
  'پویا فرهادی', 'الهه مرادی',
]

export const FAKE_USERS = FAKE_NAMES.map((name, i) => ({ id: `fake-${i + 1}`, name }))

// ژنراتور شبه‌تصادفی mulberry32 — ترتیب و امتیاز رقبای فیک برای همه یکسان
function mulberry32(seed) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const DAY = 86400000

// تلاش‌های فیک در ۶۰ روز اخیر + چند تلاش امروز، تا همهٔ دوره‌های
// رتبه‌بندی (روز/هفته/ماه/کل) پر باشند. ساختار با فیلدهای pointsOf سازگار است.
export function fakeLeaderboardAttempts(now = Date.now()) {
  const rnd = mulberry32(14040703)
  const attempts = []
  for (const u of FAKE_USERS) {
    const n = 4 + Math.floor(rnd() * 7) // ۴ تا ۱۰ تلاش در دو ماه گذشته
    for (let i = 0; i < n; i++) {
      const correct = 8 + Math.floor(rnd() * 20)
      attempts.push({
        userId: u.id,
        correct,
        total: 30,
        score: Math.round((correct / 30) * 100),
        createdAt: now - Math.floor(rnd() * 60) * DAY - Math.floor(rnd() * DAY),
      })
    }
    if (rnd() < 0.6) { // بیش از نیمی از کاربران امروز هم فعال بوده‌اند
      const correct = 10 + Math.floor(rnd() * 18)
      attempts.push({
        userId: u.id,
        correct,
        total: 30,
        score: Math.round((correct / 30) * 100),
        createdAt: now - Math.floor(rnd() * 12) * 3600000,
      })
    }
  }
  return attempts
}

// کاربرانی که نباید در رتبه‌بندی دیده شوند: ادمین‌ها و حساب‌های تستی/بی‌نام
const TEST_NAME = /^(t|test|admin|تست|ادمین|کاربر)$/i
export const isTestUser = (u) => !u || !!u.admin || TEST_NAME.test(String(u.name || '').trim())
