import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.join(__dirname, 'data', 'db.json')

function load() {
  const base = { users: [], sessions: [], attempts: [], generated: [], otps: [], announcements: [], feedback: [], orders: [], baleOffset: 0 }
  try {
    return { ...base, ...JSON.parse(fs.readFileSync(DB_PATH, 'utf-8')) }
  } catch {
    return base
  }
}

let db = load()

// نوشتن اتمیک: اول در فایل موقت، بعد rename — تا با قطعی/کرش، db خراب نشود
export function save() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
  const tmp = DB_PATH + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2))
  fs.renameSync(tmp, DB_PATH)
}

export function getDb() {
  return db
}
