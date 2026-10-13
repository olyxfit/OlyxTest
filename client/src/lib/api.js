import { Capacitor } from '@capacitor/core'

const TOKEN_KEY = 'azmoon_token'
const BASE = import.meta.env.VITE_API_URL || ''

// مبنای کامل URLهای سمت سرور (برای لینک‌هایی مثل دانلود نسخهٔ جدید)
export const apiUrl = (path) => new URL(path, BASE || window.location.origin).href

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

// باز کردن لینک بیرونی (بله، تلگرام، دانلود نسخهٔ جدید) — در اپ بومی با هندلر سیستم.
// از رجیستری پلاگین‌ها خوانده می‌شود تا بدون ایمپورت سخت کار کند؛ اگر @capacitor/app-launcher
// نصب و sync شود، خودبه‌خود از آن استفاده می‌شود وگرنه به window.open برمی‌گردد.
export const openExternal = async (url) => {
  const Launcher = Capacitor.Plugins?.AppLauncher
  if (Capacitor.isNativePlatform() && Launcher?.openUrl) {
    try {
      return await Launcher.openUrl({ url })
    } catch { /* به fallback می‌رویم */ }
  }
  window.open(url, '_blank')
}

// تشخیص یک‌بارهٔ دسترس‌پذیری سرور: اگر API زنده نبود، بک‌اند دموی مرورگر فعال می‌شود
let mode = null
async function resolveMode() {
  if (mode) return mode
  try {
    const res = await fetch(`${BASE}/api/health`)
    const data = await res.json().catch(() => null)
    mode = data?.ok ? 'live' : 'demo'
  } catch {
    mode = 'demo'
  }
  return mode
}

export async function api(path, { method = 'GET', body } = {}) {
  if ((await resolveMode()) === 'demo') {
    const { demoApi } = await import('./demo.js')
    return demoApi(path, { method, body })
  }
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    // نشست منقضی/نامعتبر — فقط وقتی توکنی همراه درخواست بوده (نه لاگینِ ناموفق)
    if (res.status === 401 && getToken()) {
      clearToken()
      if (!['/auth', '/welcome'].includes(window.location.pathname)) {
        window.location.assign('/welcome')
      }
    }
    const err = new Error(data.error || 'خطای سرور')
    err.code = data.code
    err.status = res.status
    throw err
  }
  return data
}
