// ارسال کد تایید پیامکی
// پشتیبانی از کاوه‌نگار (https://kavenegar.com) — اکانت آزمایشی رایگان دارد
// و در حالت تست می‌توان به شماره‌ی مالک اکانت پیامک زد.
//
// متغیرهای محیطی:
//   KAVENEGAR_API_KEY   کلید API (بدون آن، حالت توسعه: کد فقط در لاگ چاپ می‌شود)
//   KAVENEGAR_TEMPLATE  نام قالب OTP تعریف‌شده در پنل کاوه‌نگار (اختیاری)
//                       اگر تنظیم شود از سرویس verify/lookup استفاده می‌شود؛
//                       در غیر این صورت با sms/send متن کامل ارسال می‌شود.
//   KAVENEGAR_SENDER    خط اختصاصی ارسال (اختیاری — فقط در مسیر sms/send اثر دارد)

const API_KEY = process.env.KAVENEGAR_API_KEY
const TEMPLATE = process.env.KAVENEGAR_TEMPLATE
const SENDER = process.env.KAVENEGAR_SENDER

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹'
const toFa = (s) => String(s).replace(/\d/g, (d) => FA_DIGITS[Number(d)])

// کد پیامکی با ارقام فارسی ارسال می‌شود (پیش‌فرض) — با متغیر محیطی SMS_FA_CODE=0 لاتین می‌شود
const faCodeEnabled = () =>
  !['0', 'false', 'no', 'off'].includes(String(process.env.SMS_FA_CODE ?? '').toLowerCase())

async function kavenegarLookup(phone, code) {
  const url =
    `https://api.kavenegar.com/v1/${API_KEY}/verify/lookup.json` +
    `?receptor=${encodeURIComponent(phone)}` +
    `&token=${encodeURIComponent(code)}` +
    `&template=${encodeURIComponent(TEMPLATE)}`
  const res = await fetch(url)
  const body = await res.json().catch(() => ({}))
  if (!res.ok || body?.return?.status !== 200) {
    throw new Error(body?.return?.message || `Kavenegar lookup failed: ${res.status}`)
  }
}

async function kavenegarSend(phone, code) {
  // نکته: در قالب‌های تاییدشده کاوه‌نگار (lookup) توکن باید لاتین بماند؛
  // ارقام فارسی فقط در مسیر ارسال متن کامل (sms/send) استفاده می‌شود.
  const codeText = faCodeEnabled() ? toFa(code) : code
  const message = `کد تایید ورود به اپلیکیشن آزمون مربیگری: ${codeText}`
  const url =
    `https://api.kavenegar.com/v1/${API_KEY}/sms/send.json` +
    `?receptor=${encodeURIComponent(phone)}` +
    `&message=${encodeURIComponent(message)}` +
    (SENDER ? `&sender=${encodeURIComponent(SENDER)}` : '')
  const res = await fetch(url)
  const body = await res.json().catch(() => ({}))
  if (!res.ok || body?.return?.status !== 200) {
    throw new Error(body?.return?.message || `Kavenegar send failed: ${res.status}`)
  }
}

// خروجی: { sent: true } یا { sent: false, devCode } در حالت توسعه
export async function sendVerificationSms(phone, code) {
  if (!API_KEY) {
    console.log(`[DEV] کد تایید برای ${phone}: ${code}`)
    return { sent: false, devCode: code }
  }
  if (TEMPLATE) await kavenegarLookup(phone, code)
  else await kavenegarSend(phone, code)
  return { sent: true }
}
