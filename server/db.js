import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.join(__dirname, 'data', 'db.json')
const AVATAR_DIR = path.join(__dirname, 'data', 'avatars')
const AVATAR_EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
const AVATAR_MIME = Object.fromEntries(Object.entries(AVATAR_EXT).map(([m, e]) => [e, m]))

try {
  process.loadEnvFile(path.join(__dirname, '.env'))
} catch {}

const base = () => ({ users: [], sessions: [], attempts: [], generated: [], announcements: [], feedback: [], orders: [], baleOffset: 0 })

let db = base()

// ---------- بک‌اند فایل (پیش‌فرض توسعه/تست) ----------
function loadFile() {
  try {
    db = { ...db, ...JSON.parse(fs.readFileSync(DB_PATH, 'utf-8')) }
  } catch {}
}

// نوشتن اتمیک: اول در فایل موقت، بعد rename — تا با قطعی/کرش، db خراب نشود
function saveFile() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
  const tmp = DB_PATH + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2))
  fs.renameSync(tmp, DB_PATH)
}

// ---------- بک‌اند Postgres (وقتی DATABASE_URL ست است) ----------
// همان سند JSON در یک ردیف jsonb نگه‌داری می‌شود؛ getDb()/save() بدون تغییر باقی می‌مانند
let pool = null
let writeQueue = Promise.resolve()

async function initPg() {
  const { default: pg } = await import('pg')
  pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_state (id smallint PRIMARY KEY, doc jsonb NOT NULL);
      CREATE TABLE IF NOT EXISTS avatars (user_id text PRIMARY KEY, mime text NOT NULL, data bytea NOT NULL, updated_at bigint NOT NULL)
    `)
  } catch (e) {
    console.error('Cannot connect to Postgres (DATABASE_URL):', e.message)
    process.exit(1)
  }

  const { rows } = await pool.query('SELECT doc FROM app_state WHERE id = 1')
  if (rows.length) {
    db = { ...db, ...rows[0].doc }
  } else {
    // مهاجرت یک‌باره از db.json اگر هست
    try {
      db = { ...db, ...JSON.parse(fs.readFileSync(DB_PATH, 'utf-8')) }
    } catch {}
    await pool.query('INSERT INTO app_state (id, doc) VALUES (1, $1::jsonb)', [JSON.stringify(db)])
  }

  // مهاجرت یک‌بارهٔ عکس‌های پروفایل از دیسک به جدول avatars
  try {
    for (const f of fs.readdirSync(AVATAR_DIR)) {
      const m = /^(.+)\.(jpg|png|webp)$/.exec(f)
      if (!m) continue
      await pool.query(
        'INSERT INTO avatars (user_id, mime, data, updated_at) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id) DO NOTHING',
        [m[1], AVATAR_MIME[m[2]], fs.readFileSync(path.join(AVATAR_DIR, f)), Date.now()],
      )
    }
  } catch {}

  // خروج تمیز: آخرین نوشتن‌ها فلاش و اتصال بسته شود
  for (const sig of ['SIGINT', 'SIGTERM']) {
    process.on(sig, async () => {
      try {
        await writeQueue
        await pool.end()
      } finally {
        process.exit(0)
      }
    })
  }
}

function savePg() {
  const doc = JSON.stringify(db)
  writeQueue = writeQueue.then(() =>
    pool.query('INSERT INTO app_state (id, doc) VALUES (1, $1::jsonb) ON CONFLICT (id) DO UPDATE SET doc = EXCLUDED.doc', [doc]),
  ).catch((e) => console.error('db save failed:', e.message))
}

// ---------- API عمومی ----------
export async function initDb() {
  if (process.env.DATABASE_URL) await initPg()
  else loadFile()
}

// نوشتن‌ها در Postgres صف‌بندی می‌شوند تا ترتیب حفظ شود؛ فراخواننده‌ها sync می‌مانند
export function save() {
  if (pool) savePg()
  else saveFile()
}

export function getDb() {
  return db
}

// خواندن مجدد سند از منبع ذخیره‌سازی — تا نوشته‌های پروسهٔ دیگر (مثلاً سفارشی که
// روی instance دیگری با Postgres مشترک ساخته شده) قبل از پاسخ به آپدیت بله دیده شود
export async function refreshDb() {
  if (pool) {
    await writeQueue.catch(() => {}) // اول نوشتن‌های معلق خودمان فلاش شود
    const { rows } = await pool.query('SELECT doc FROM app_state WHERE id = 1')
    if (rows.length) db = { ...base(), ...rows[0].doc }
  } else {
    loadFile()
  }
}

// ---------- عکس پروفایل ----------
// در Postgres ردیف avatars، در حالت فایل data/avatars/<userId>.<ext>
const avatarFileOf = (userId) => {
  try {
    const f = fs.readdirSync(AVATAR_DIR).find((x) => x.startsWith(`${userId}.`))
    return f ? path.join(AVATAR_DIR, f) : null
  } catch {
    return null
  }
}
const removeAvatarFile = (userId) => {
  const f = avatarFileOf(userId)
  if (f) fs.unlinkSync(f)
}

export async function putAvatar(userId, mime, buf) {
  if (pool) {
    await pool.query(
      'INSERT INTO avatars (user_id, mime, data, updated_at) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id) DO UPDATE SET mime = EXCLUDED.mime, data = EXCLUDED.data, updated_at = EXCLUDED.updated_at',
      [userId, mime, buf, Date.now()],
    )
    return
  }
  fs.mkdirSync(AVATAR_DIR, { recursive: true })
  removeAvatarFile(userId)
  fs.writeFileSync(path.join(AVATAR_DIR, `${userId}.${AVATAR_EXT[mime] || 'jpg'}`), buf)
}

export async function getAvatar(userId) {
  if (pool) {
    const { rows } = await pool.query('SELECT mime, data FROM avatars WHERE user_id = $1', [userId])
    return rows[0] || null
  }
  const file = avatarFileOf(userId)
  if (!file) return null
  const mime = AVATAR_MIME[path.extname(file).slice(1)] || 'image/jpeg'
  return { mime, data: fs.readFileSync(file) }
}

export async function removeAvatar(userId) {
  if (pool) {
    await pool.query('DELETE FROM avatars WHERE user_id = $1', [userId])
    return
  }
  removeAvatarFile(userId)
}
