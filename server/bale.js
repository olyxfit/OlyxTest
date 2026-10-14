// کلاینت API بازوی بله + دریافت آپدیت‌های پرداخت
// مستندات: https://docs.bale.ai — مبنا: https://tapi.bale.ai/bot<token>/<method>
import path from 'node:path'
import { fileURLToPath } from 'node:url'

try {
  process.loadEnvFile(path.join(path.dirname(fileURLToPath(import.meta.url)), '.env'))
} catch {}

const BOT_TOKEN = process.env.BALE_BOT_TOKEN || ''
const PROVIDER_TOKEN = process.env.BALE_PROVIDER_TOKEN || 'WALLET-TEST-1111111111111111'
const API_BASE = `https://tapi.bale.ai/bot${BOT_TOKEN}`

export const baleEnabled = !!BOT_TOKEN

let botUsername = process.env.BALE_BOT_USERNAME || ''

const callApi = async (method, params = {}) => {
  const res = await fetch(`${API_BASE}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  const data = await res.json().catch(() => ({}))
  if (!data.ok) throw new Error(data.description || `Bale API error (${res.status})`)
  return data.result
}

export const getBotUsername = async () => {
  if (botUsername) return botUsername
  const me = await callApi('getMe')
  botUsername = me.username
  return botUsername
}

// لینک عمیق برای ورود کاربر به بازو و دریافت صورتحساب همان سفارش
export const payUrlFor = async (orderId) =>
  `https://ble.ir/${await getBotUsername()}?start=pay_${orderId}`

// ارسال صورتحساب کیف‌پولی به چت کاربر — مبلغ به ریال
export const sendInvoice = ({ chatId, title, description, payload, amountRial }) =>
  callApi('sendInvoice', {
    chat_id: chatId,
    title,
    description,
    payload,
    provider_token: PROVIDER_TOKEN,
    currency: 'IRR',
    prices: [{ label: title, amount: amountRial }],
  })

export const answerPreCheckoutQuery = (id, ok, errorMessage) =>
  callApi('answerPreCheckoutQuery', {
    pre_checkout_query_id: id,
    ok,
    ...(ok ? {} : { error_message: errorMessage || 'خطا در پردازش سفارش' }),
  })

export const getWebhookInfo = () => callApi('getWebhookInfo')

export const inquireTransaction = (transactionId) =>
  callApi('inquireTransaction', { transaction_id: transactionId })

export const sendMessage = (chatId, text) =>
  callApi('sendMessage', { chat_id: chatId, text }).catch(() => {})

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// دریافت آپدیت‌ها با long-polling — برای سرور لوکال/بدون دامنه عمومی مناسب است.
// در پروداکشن به‌جای آن می‌توان وب‌هوک را با متد setWebhook روی /api/bale/webhook تنظیم کرد
// و BALE_POLLING=0 گذاشت.
export function startBalePolling(handleUpdate, { getOffset, setOffset }) {
  if (!baleEnabled) return
  let offset = getOffset()
  ;(async function loop() {
    for (;;) {
      try {
        const updates = await callApi('getUpdates', { offset, timeout: 25 })
        for (const u of updates) {
          offset = u.update_id + 1
          setOffset(offset)
          await handleUpdate(u)
        }
      } catch (e) {
        console.error('Bale polling error:', e.message)
        await sleep(3000)
      }
    }
  })()
}
