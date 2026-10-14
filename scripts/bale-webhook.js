// Bale bot webhook management — replaces polling in production
//   node app/scripts/bale-webhook.js info              <- current webhook status
//   node app/scripts/bale-webhook.js set <domain>      <- register https://domain/api/bale/webhook?secret=...
//   node app/scripts/bale-webhook.js del               <- delete webhook (back to polling)
// Reads token and secret from app/server/.env; registration requires BALE_WEBHOOK_SECRET
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const serverDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'server')
try {
  process.loadEnvFile(path.join(serverDir, '.env'))
} catch {}

const { BALE_BOT_TOKEN, BALE_WEBHOOK_SECRET } = process.env
if (!BALE_BOT_TOKEN) {
  console.error('BALE_BOT_TOKEN در app/server/.env تنظیم نشده است')
  process.exit(1)
}
const API = `https://tapi.bale.ai/bot${BALE_BOT_TOKEN}`

const callApi = async (method, params = {}) => {
  const res = await fetch(`${API}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  const data = await res.json().catch(() => ({}))
  if (!data.ok) throw new Error(data.description || `Bale API error (${res.status})`)
  return data.result ?? data
}

const [cmd, arg] = process.argv.slice(2)

try {
  if (cmd === 'info') {
    console.log(JSON.stringify(await callApi('getWebhookInfo'), null, 2))
  } else if (cmd === 'set') {
    if (!arg) throw new Error('دامنه لازم است: node bale-webhook.js set api.example.com')
    if (!BALE_WEBHOOK_SECRET)
      throw new Error('اول BALE_WEBHOOK_SECRET را در app/server/.env بگذار — بدون آن اندپوینت همیشه 403 می‌دهد')
    const url = arg.includes('/api/bale/webhook')
      ? arg
      : `https://${arg.replace(/^https?:\/\//, '').replace(/\/$/, '')}/api/bale/webhook?secret=${BALE_WEBHOOK_SECRET}`
    console.log('ثبت وب‌هوک:', url.replace(BALE_WEBHOOK_SECRET, '***'))
    console.log(JSON.stringify(await callApi('setWebhook', {
      url,
      allowed_updates: ['message', 'pre_checkout_query'],
      drop_pending_updates: true,
    }), null, 2))
    console.log(JSON.stringify(await callApi('getWebhookInfo'), null, 2))
  } else if (cmd === 'del') {
    console.log(JSON.stringify(await callApi('deleteWebhook'), null, 2))
    console.log('وب‌هوک حذف شد — برای دریافت آپدیت‌ها BALE_POLLING=1 و سرور را ری‌استارت کن')
  } else {
    console.log('usage: node bale-webhook.js <info|set <domain>|del>')
    process.exit(1)
  }
} catch (e) {
  console.error('خطا:', e.message)
  process.exit(1)
}
