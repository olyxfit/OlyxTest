// نسخهٔ فعلی اپ — هنگام بیلد از client/package.json داخل باندل تزریق می‌شود (vite.config.js)
/* global __APP_VERSION__ */
export const APP_VERSION = typeof __APP_VERSION__ === 'undefined' ? '0.0.0' : __APP_VERSION__

// مقایسهٔ نسخه‌های نقطه‌ای (۱٫۱۰٫۰ > ۱٫۹٫۰) — خروجی مثبت یعنی a جدیدتر است
export function compareVersions(a, b) {
  const pa = String(a).split('.').map(Number)
  const pb = String(b).split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0)
    if (d) return d
  }
  return 0
}

// ─── فیچرهای نسخه‌ی بعدی — فقط آیتم‌های مایل‌ستون بعدی (M1) از app/ROADMAP.md؛ با هر نسخه به‌روز کنید ───
export const UPCOMING = [
  'رتبه‌بندی کاربران (لیدربرد) بر اساس امتیاز',
  'بررسی و تمرین مجدد سوالاتی که غلط زده‌اید',
]
