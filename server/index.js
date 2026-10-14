import express from 'express'
import crypto from 'node:crypto'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { getDb, save } from './db.js'
import * as bale from './bale.js'
import { sendVerificationSms } from './sms.js'
import { exams, sections, specializedSectionsFor, questions, questionsForExam, generateExamSlots, isSingleExam, effectiveSectionId, shapeExam } from './questions.js'
import { FAKE_USERS, fakeLeaderboardAttempts, isTestUser } from '../shared/fake-leaderboard.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3001

app.use(express.json())

// برای تشخیص دسترس‌پذیری API توسط کلاینت (حالت دمو در نبود سرور)
app.get('/api/health', (_, res) => res.json({ ok: true }))

// ---------- نسخه و به‌روزرسانی اپ ----------
// release.json آخرین نسخهٔ منتشرشده و لینک دانلود را نگه می‌دارد — با هر انتشار به‌روز شود
const releaseFile = path.join(__dirname, 'release.json')
app.get('/api/version', (_, res) => {
  try {
    res.json(JSON.parse(fs.readFileSync(releaseFile, 'utf8')))
  } catch {
    res.status(500).json({ error: 'اطلاعات نسخه در دسترس نیست' })
  }
})

// ---------- آمار عمومی لندینگ (بدون احراز هویت) ----------
app.get('/api/public-stats', (_, res) => {
  res.json({ users: getDb().users.filter((u) => !u.admin).length })
})

// ---------- CORS ----------
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})

// ---------- auth helpers ----------
const hashPassword = (password, salt = crypto.randomBytes(16).toString('hex')) => {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}
const verifyPassword = (password, stored) => {
  // کاربران OTP فیلد password ندارند — به‌جای کرش ۵۰۰، عدم تطابق برمی‌گردانیم
  if (typeof stored !== 'string' || !stored.includes(':')) return false
  try {
    const [salt, hash] = stored.split(':')
    const candidate = crypto.scryptSync(password, salt, 64)
    return crypto.timingSafeEqual(candidate, Buffer.from(hash, 'hex'))
  } catch {
    return false
  }
}
const newToken = () => crypto.randomBytes(32).toString('hex')

// ---------- امتیاز، استریک و رتبه‌بندی ----------
// روزهای تقویمی بر مبنای منطقهٔ زمانی تهران (UTC+3:30) محاسبه می‌شوند
const TEHRAN_OFFSET = 3.5 * 3600000
const DAY_MS = 86400000
const tehranDay = (ts) => Math.floor((ts + TEHRAN_OFFSET) / DAY_MS)
const pointsOf = (a) => a.correct * 10 // هر پاسخ درست = ۱۰ امتیاز

const userPoints = (userId) =>
  getDb().attempts.reduce((s, a) => (a.userId === userId ? s + pointsOf(a) : s), 0)

// استریک فقط یک‌بار در روز و هنگام تکمیل آزمون افزایش می‌یابد
const bumpStreak = (u, now) => {
  const d = tehranDay(now)
  const s = u.streak || { count: 0, lastDay: null }
  if (s.lastDay === d) return
  s.count = s.lastDay === d - 1 ? s.count + 1 : 1
  s.lastDay = d
  u.streak = s
}

// سشن‌ها ۳۰ روز عمر دارند و سشن‌های یتیم (کاربر حذف‌شده) پاک می‌شوند
const SESSION_TTL = 30 * 86400000
const pruneSessions = () => {
  const db = getDb()
  const now = Date.now()
  const before = db.sessions.length
  db.sessions = db.sessions.filter(
    (s) => now - (s.createdAt ?? now) < SESSION_TTL && db.users.some((u) => u.id === s.userId),
  )
  if (db.sessions.length !== before) save()
}
const newSession = (db, userId) => {
  const token = newToken()
  db.sessions.push({ token, userId, createdAt: Date.now() })
  return token
}

function auth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '')
  const session = getDb().sessions.find((s) => s.token === token)
  if (!session || (session.createdAt && Date.now() - session.createdAt > SESSION_TTL))
    return res.status(401).json({ error: 'احراز هویت نامعتبر است' })
  const user = getDb().users.find((u) => u.id === session.userId)
  if (!user) return res.status(401).json({ error: 'کاربر یافت نشد' })
  session.lastUsedAt = Date.now() // در حافظه؛ با save بعدی روی دیسک می‌نشیند
  req.user = user
  next()
}

const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  phone: u.phone,
  gender: u.gender ?? null,
  createdAt: u.createdAt,
  subscription: u.subscription ?? null,
  points: userPoints(u.id),
  streak: u.streak?.count ?? 0,
  admin: !!u.admin,
  freeExamUsed: freeExamUsed(u),
})

function adminOnly(req, res, next) {
  if (!req.user?.admin) return res.status(403).json({ error: 'دسترسی فقط برای مدیر است' })
  next()
}

// اکانت ثابت مدیر: ورود با ایدی ۱۱۱۱ و رمز ۱۱۱۱
{
  const db = getDb()
  const seed = db.users.find((u) => u.phone === '1111')
  if (!seed) {
    db.users.push({
      id: crypto.randomUUID(),
      name: 'ادمین',
      phone: '1111',
      // رمز مدیر از env — بدون ADMIN_PASSWORD مقدار پیش‌فرض ۱۱۱۱ است (قبل از انتشار تغییر دهید)
      password: hashPassword(process.env.ADMIN_PASSWORD || '1111'),
      admin: true,
      createdAt: Date.now(),
    })
    save()
  } else if (!seed.admin) {
    // فقط سید اصلی ادمین می‌شود؛ register با isValidPhone ساخت کاربر ۱۱۱۱ را ممنوع کرده
    seed.admin = true
    save()
  }
  pruneSessions()
}

// ---------- auth routes ----------
app.post('/api/register', (req, res) => {
  const { name, password } = req.body || {}
  const phone = normalizePhone(req.body?.phone)
  if (!name?.trim() || !phone || !password)
    return res.status(400).json({ error: 'نام، شماره موبایل و رمز عبور الزامی است' })
  if (!isValidPhone(phone))
    return res.status(400).json({ error: 'شماره موبایل نامعتبر است. مثال: 09123456789' })
  if (password.length < 4)
    return res.status(400).json({ error: 'رمز عبور باید حداقل ۴ کاراکتر باشد' })
  const db = getDb()
  if (db.users.some((u) => u.phone === phone))
    return res.status(409).json({ error: 'این شماره موبایل قبلاً ثبت‌نام کرده است' })

  const user = {
    id: crypto.randomUUID(),
    name: name.trim(),
    phone,
    password: hashPassword(password),
    createdAt: Date.now(),
  }
  db.users.push(user)
  const token = newSession(db, user.id)
  save()
  res.json({ token, user: publicUser(user) })
})

app.post('/api/login', (req, res) => {
  const { password } = req.body || {}
  const phone = normalizePhone(req.body?.phone)
  const user = getDb().users.find((u) => u.phone === phone)
  if (!user || !verifyPassword(password || '', user.password))
    return res.status(401).json({ error: 'شماره موبایل یا رمز عبور اشتباه است' })
  const token = newSession(getDb(), user.id)
  save()
  res.json({ token, user: publicUser(user) })
})

app.get('/api/me', auth, (req, res) => res.json({ user: publicUser(req.user) }))

// ویرایش اطلاعات خود کاربر — نام و جنسیت (موبایل = هویت ورود است و تغییرش با ادمین است)
app.patch('/api/me', auth, (req, res) => {
  const u = req.user
  if (req.body?.name != null) {
    const name = String(req.body.name).trim()
    if (!name || name.length > 60) return res.status(400).json({ error: 'نام معتبر نیست' })
    u.name = name
  }
  if (req.body?.gender !== undefined) {
    if (!['men', 'women', null].includes(req.body.gender))
      return res.status(400).json({ error: 'جنسیت نامعتبر است' })
    u.gender = req.body.gender
  }
  save()
  res.json({ user: publicUser(u) })
})

app.post('/api/logout', auth, (req, res) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '')
  const db = getDb()
  db.sessions = db.sessions.filter((s) => s.token !== token)
  save()
  res.json({ ok: true })
})

// ---------- OTP auth ورود و ثبت‌نام با کد پیامکی ----------
const OTP_TTL = 2 * 60 * 1000 // اعتبار کد: ۲ دقیقه
const OTP_COOLDOWN = 60 * 1000 // فاصله مجاز بین درخواست‌ها: ۶۰ ثانیه
const OTP_MAX_ATTEMPTS = 5
const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹'
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩'

const normalizePhone = (raw) => {
  let s = String(raw || '')
    .replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)))
    .replace(/\D/g, '')
  if (s.startsWith('0098')) s = '0' + s.slice(4)
  else if (s.startsWith('98') && s.length === 12) s = '0' + s.slice(2)
  else if (s.startsWith('9') && s.length === 10) s = '0' + s
  return s
}
const isValidPhone = (p) => /^09\d{9}$/.test(p)
const hashOtp = (code, salt) =>
  crypto.createHash('sha256').update(`${salt}:${code}`).digest('hex')
const normalizeCode = (raw) =>
  String(raw || '')
    .replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)))
    .replace(/\D/g, '')
    .trim()

app.post('/api/otp/request', async (req, res) => {
  const phone = normalizePhone(req.body?.phone)
  if (!isValidPhone(phone))
    return res.status(400).json({ error: 'شماره موبایل نامعتبر است. مثال: 09123456789' })

  const db = getDb()
  const now = Date.now()
  db.otps = db.otps.filter((o) => now - o.createdAt <= OTP_TTL)
  const prev = db.otps.find((o) => o.phone === phone)
  if (prev && now - prev.createdAt < OTP_COOLDOWN) {
    const wait = Math.ceil((OTP_COOLDOWN - (now - prev.createdAt)) / 1000)
    return res.status(429).json({ error: `کد تایید قبلاً ارسال شده است. ${wait} ثانیه دیگر تلاش کنید`, retryAfter: wait })
  }

  const code = String(crypto.randomInt(0, 10000)).padStart(4, '0')
  const salt = crypto.randomBytes(8).toString('hex')
  db.otps = db.otps.filter((o) => o.phone !== phone)
  db.otps.push({ phone, code: `${salt}:${hashOtp(code, salt)}`, attempts: 0, createdAt: now })
  save()

  try {
    const result = await sendVerificationSms(phone, code)
    res.json({
      ok: true,
      isNewUser: !db.users.some((u) => u.phone === phone),
      expiresIn: OTP_TTL / 1000,
      // وقتی کانال پیامک فعال نیست (KAVENEGAR_API_KEY ست نشده)، کد در خود اپ نمایش داده می‌شود
      // تا ورود ممکن بماند؛ با فعال‌شدن پیامک این فیلد دیگر برنمی‌گردد
      ...(result.devCode ? { devCode: result.devCode } : {}),
    })
  } catch (err) {
    db.otps = db.otps.filter((o) => o.phone !== phone)
    save()
    console.error('SMS send failed:', err)
    res.status(502).json({ error: 'ارسال پیامک ناموفق بود. کمی بعد دوباره تلاش کنید' })
  }
})

app.post('/api/otp/verify', (req, res) => {
  const phone = normalizePhone(req.body?.phone)
  const code = normalizeCode(req.body?.code)
  const db = getDb()
  const otp = db.otps.find((o) => o.phone === phone)
  if (!otp)
    return res.status(400).json({ error: 'کدی برای این شماره ارسال نشده است. ابتدا درخواست کد دهید' })
  if (Date.now() - otp.createdAt > OTP_TTL) {
    db.otps = db.otps.filter((o) => o !== otp)
    save()
    return res.status(400).json({ error: 'کد تایید منقضی شده است. دوباره درخواست کنید', code: 'EXPIRED' })
  }

  const [salt, hash] = otp.code.split(':')
  const match = hashOtp(code, salt) === hash
  if (!match) {
    otp.attempts = (otp.attempts || 0) + 1
    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
      db.otps = db.otps.filter((o) => o !== otp)
      save()
      return res.status(400).json({ error: 'تعداد تلاش‌ها بیش از حد مجاز است. دوباره درخواست کد دهید', code: 'EXPIRED' })
    }
    save()
    return res.status(400).json({ error: 'کد وارد شده اشتباه است' })
  }

  let user = db.users.find((u) => u.phone === phone)
  if (!user) {
    const name = String(req.body?.name || '').trim()
    if (!name)
      return res.status(400).json({ error: 'نام و نام خانوادگی الزامی است', code: 'NAME_REQUIRED' })
    user = { id: crypto.randomUUID(), name, phone, createdAt: Date.now() }
    db.users.push(user)
  }
  db.otps = db.otps.filter((o) => o !== otp)

  const token = newSession(db, user.id)
  save()
  res.json({ token, user: publicUser(user) })
})

// ---------- subscription ----------
// priceRial به ریال است (بله مبالغ را ریال می‌گیرد)
const PLANS = {
  monthly: { title: 'اشتراک یک‌ماهه', months: 1, priceRial: 1_990_000 },
  quarterly: { title: 'اشتراک سه‌ماهه', months: 3, priceRial: 4_990_000 },
  yearly: { title: 'اشتراک سالانه', months: 12, priceRial: 14_990_000 },
}

const grantSubscription = (u, planId) => {
  const plan = PLANS[planId]
  u.subscription = {
    plan: planId,
    title: plan.title,
    // تمدید از پایان اشتراک فعلی اگر هنوز فعال است
    until: Math.max(Date.now(), u.subscription?.until ?? 0) + plan.months * 30 * 864e5,
  }
}

// شبیه‌سازی/اعطای دستی اشتراک — فقط مدیر (فروش دستی یا تست)؛ کاربر عادی باید از درگاه پرداخت کند
app.post('/api/subscribe', auth, adminOnly, (req, res) => {
  const plan = PLANS[req.body?.plan]
  if (!plan) return res.status(400).json({ error: 'پلن نامعتبر است' })
  const u = getDb().users.find((x) => x.id === req.user.id)
  grantSubscription(u, req.body.plan)
  save()
  res.json({ user: publicUser(u) })
})

// ---------- پرداخت بله (کیف پول) ----------
const ORDER_TTL = 30 * 60 * 1000 // سفارش در انتظار پرداخت نهایتاً ۳۰ دقیقه معتبر است
// سفارش‌های قدیمی بدون expiresAt با createdAt + TTL منقضی می‌شوند
const orderExpired = (o) => o.status === 'pending' && Date.now() > (o.expiresAt ?? o.createdAt + ORDER_TTL)

app.post('/api/payment/order', auth, async (req, res) => {
  const plan = PLANS[req.body?.plan]
  if (!plan) return res.status(400).json({ error: 'پلن نامعتبر است' })
  if (!bale.baleEnabled)
    return res.status(503).json({ error: 'درگاه پرداخت بله پیکربندی نشده است', code: 'PAYMENT_NOT_CONFIGURED' })

  const order = {
    id: `o-${crypto.randomUUID().slice(0, 8)}`,
    userId: req.user.id,
    plan: req.body.plan,
    amountRial: plan.priceRial,
    status: 'pending',
    createdAt: Date.now(),
    expiresAt: Date.now() + ORDER_TTL,
  }
  getDb().orders.push(order)
  save()

  try {
    const payUrl = await bale.payUrlFor(order.id)
    res.json({ orderId: order.id, payUrl, status: order.status })
  } catch (e) {
    console.error('Bale payUrl error:', e)
    res.status(502).json({ error: 'خطا در اتصال به درگاه پرداخت بله' })
  }
})

// وضعیت سفارش — کلاینت پس از پرداخت در بله این را پول می‌کند
app.get('/api/payment/order/:orderId', auth, (req, res) => {
  const order = getDb().orders.find((o) => o.id === req.params.orderId && o.userId === req.user.id)
  if (!order) return res.status(404).json({ error: 'سفارش یافت نشد' })
  if (orderExpired(order)) {
    order.status = 'expired'
    save()
  }
  res.json({ orderId: order.id, status: order.status, plan: order.plan, user: publicUser(req.user) })
})

const fulfillOrder = (order, payment) => {
  if (order.status === 'paid') return
  order.status = 'paid'
  order.paidAt = Date.now()
  order.chargeId = payment?.provider_payment_charge_id || payment?.telegram_payment_charge_id || null
  const u = getDb().users.find((x) => x.id === order.userId)
  if (u) grantSubscription(u, order.plan)
  save()
}

// پردازش آپدیت‌های بله (مشترک بین وب‌هوک و پولینگ)
async function handleBaleUpdate(update) {
  try {
    // تایید نهایی قبل از پرداخت — مهلت پاسخ ۱۰ ثانیه
    if (update.pre_checkout_query) {
      const q = update.pre_checkout_query
      const order = getDb().orders.find((o) => o.id === q.invoice_payload)
      const ok = order && order.status === 'pending' && !orderExpired(order) && q.total_amount === order.amountRial
      await bale.answerPreCheckoutQuery(q.id, !!ok, 'سفارش نامعتبر یا منقضی شده است')
      return
    }

    const msg = update.message
    if (!msg) return

    // پرداخت موفق — فعال‌سازی اشتراک؛ ارز و مبلغ هم دوباره با سفارش چک می‌شود
    if (msg.successful_payment) {
      const pay = msg.successful_payment
      const order = getDb().orders.find((o) => o.id === pay.invoice_payload)
      const valid =
        order && order.status === 'pending' && !orderExpired(order) &&
        (pay.currency == null || pay.currency === 'IRR') &&
        (pay.total_amount == null || pay.total_amount === order.amountRial)
      if (valid) {
        fulfillOrder(order, pay)
        await bale.sendMessage(msg.chat.id, 'پرداخت شما با موفقیت انجام شد. اشتراک فعال است — به اپلیکیشن برگردید.')
      } else {
        console.error('Bale successful_payment rejected:', pay.invoice_payload, pay.currency, pay.total_amount)
      }
      return
    }

    // ورود کاربر با لینک عمیق — ارسال صورتحساب به چت
    if (typeof msg.text === 'string' && msg.text.startsWith('/start pay_')) {
      const orderId = msg.text.slice('/start pay_'.length).trim().split(/\s/)[0]
      const order = getDb().orders.find((o) => o.id === orderId)
      if (!order || order.status !== 'pending' || orderExpired(order)) {
        await bale.sendMessage(msg.chat.id, 'سفارش نامعتبر است یا قبلاً پرداخت شده است.')
        return
      }
      const plan = PLANS[order.plan]
      await bale.sendInvoice({
        chatId: msg.chat.id,
        title: plan.title,
        description: `خرید ${plan.title} اپ آزمون مربیگری`,
        payload: order.id,
        amountRial: order.amountRial,
      })
    }
  } catch (e) {
    console.error('Bale update error:', e)
  }
}

// وب‌هوک برای سرور عمومی: روی آدرس زیر با setWebhook ثبت شود و BALE_POLLING=0 گذاشته شود.
// بدون BALE_WEBHOOK_SECRET این مسیر همیشه بسته است تا successful_payment جعلی فعال‌سازی نکند.
app.post('/api/bale/webhook', (req, res) => {
  const secret = process.env.BALE_WEBHOOK_SECRET
  if (!secret || req.query.secret !== secret) return res.sendStatus(403)
  handleBaleUpdate(req.body)
  res.json({ ok: true })
})

// در حالت لوکال/بدون دامنه، آپدیت‌ها با پولینگ دریافت می‌شوند
if (bale.baleEnabled && process.env.BALE_POLLING !== '0') {
  startBalePollingWrapper()
}
function startBalePollingWrapper() {
  bale.startBalePolling(handleBaleUpdate, {
    getOffset: () => getDb().baleOffset || 0,
    setOffset: (o) => {
      getDb().baleOffset = o
      save()
    },
  })
}

// ---------- exam routes ----------
const findExam = (id, userId) =>
  exams.find((e) => e.id === id) ||
  getDb().generated.find((e) => e.id === id && e.userId === userId)

const generatedQuestionsFor = (exam) => {
  const map = new Map(questions.map((q) => [q.id, q]))
  return exam.questionIds.map((id) => map.get(id)).filter(Boolean)
}

const questionsForAny = (exam) =>
  exam.type === 'generated' ? generatedQuestionsFor(exam) : questionsForExam(exam)

// ---------- پیول (اشتراک) ----------
// رایگان: کوییز روزانه + آزمون تک‌درس آمادهٔ هر درس (s-*) + اولین آزمون جامع هر کاربر
// آزمون رایگان امتحانی با ثبت اولین نتیجهٔ آزمون غیر تک‌درس (section === 'all') مصرف می‌شود
// پولی: بقیهٔ آزمون‌های جامع، آزمون فدراسیون و آزمون‌ساز
const subActiveFor = (u) => !!u.subscription && u.subscription.until > Date.now()
const isFreeExam = (exam) => exam.type === 'single'
const freeExamUsed = (u) => getDb().attempts.some((a) => a.userId === u.id && a.section === 'all')
const isTrialExam = (exam, u) => !isFreeExam(exam) && !subActiveFor(u) && !u.admin && !freeExamUsed(u)
const examLocked = (exam, u) => !isFreeExam(exam) && !subActiveFor(u) && !u.admin && freeExamUsed(u)
const SUB_ERROR = { error: 'آزمون رایگان شما قبلاً استفاده شده است — برای ادامه، اشتراک لازم است', code: 'SUBSCRIPTION_REQUIRED' }

app.get('/api/exams', auth, (req, res) => {
  res.json(exams.map((exam) => ({ ...shapeExam(exam, questionsForExam(exam)), locked: examLocked(exam, req.user), trial: isTrialExam(exam, req.user) })))
})

// ساخت آزمون به قالب درجه ۳ فدراسیون — فعلاً فقط تخصصی بدنسازی و فیتنس
const DISCIPLINES = { bodybuilding: 'بدنسازی', fitness: 'فیتنس' }
const GENDER_TITLES = { men: 'آقایان', women: 'بانوان' }

app.post('/api/exams/generate', auth, (req, res) => {
  const { mode, sectionId, discipline, gender } = req.body || {}
  if (!['comprehensive', 'single'].includes(mode))
    return res.status(400).json({ error: 'نوع آزمون نامعتبر است' })
  const disc = DISCIPLINES[discipline]
  if (!disc) return res.status(400).json({ error: 'رشته نامعتبر است' })
  const gTitle = GENDER_TITLES[gender]
  if (!gTitle) return res.status(400).json({ error: 'جنسیت نامعتبر است' })
  if (!subActiveFor(req.user) && !req.user.admin && freeExamUsed(req.user))
    return res.status(402).json(SUB_ERROR)

  // درس‌های مجاز برای این آزمون — ۵ درس مشترک + درس جنسیتی (داوری آقایان / فنی تخصصی بانوان)
  const allowedSections = specializedSectionsFor(discipline, gender)

  const sec = sections.find((s) => s.id === sectionId)
  if (mode === 'single') {
    if (!sec) return res.status(400).json({ error: 'درس انتخاب‌شده نامعتبر است' })
    if (!allowedSections.some((s) => s.id === sectionId))
      return res.status(400).json({ error: 'این درس برای آزمون انتخاب‌شده نیست' })
  }

  const exam = {
    id: `g-${crypto.randomUUID().slice(0, 8)}`,
    type: 'generated',
    mode,
    discipline,
    gender,
    sectionId: mode === 'single' ? sec.id : undefined,
    title: mode === 'single' ? `آزمون ${sec.title} — ${disc} ${gTitle}` : `آزمون کتبی تخصصی ${disc} ${gTitle}`,
    description:
      mode === 'single'
        ? `۵ سوال تصادفی ${sec.title}، در قالب آزمون درجه ۳ ${disc} ${gTitle}`
        : `۳۰ سوال بلوکی از دروس تخصصی ${disc} (۵ سوال از هر درس)، در قالب آزمون کتبی درجه ۳ فدراسیون`,
    timeMinutes: mode === 'single' ? 10 : 33,
    ...(() => {
      const gen = generateExamSlots(mode, sectionId, discipline, gender)
      return {
        questionIds: gen.ids,
        // نقشهٔ سوال←درسِ بلوک؛ برای انتساب درست سوالات مشترک در آمار
        ...(gen.slots ? { slots: Object.fromEntries(gen.slots) } : {}),
      }
    })(),
    userId: req.user.id,
    createdAt: Date.now(),
  }
  if (!exam.questionIds.length)
    return res.status(400).json({ error: 'برای این درس هنوز سوالی ثبت نشده است' })
  getDb().generated.push(exam)
  save()
  res.json(shapeExam(exam, generatedQuestionsFor(exam)))
})

app.get('/api/exams/:examId', auth, (req, res) => {
  const exam = findExam(req.params.examId, req.user.id)
  if (!exam) return res.status(404).json({ error: 'آزمون یافت نشد' })
  res.json({ ...shapeExam(exam, questionsForAny(exam)), locked: examLocked(exam, req.user), trial: isTrialExam(exam, req.user) })
})

app.get('/api/exams/:examId/questions', auth, (req, res) => {
  const exam = findExam(req.params.examId, req.user.id)
  if (!exam) return res.status(404).json({ error: 'آزمون یافت نشد' })
  if (examLocked(exam, req.user)) return res.status(402).json(SUB_ERROR)
  const qs = questionsForAny(exam)
  // strip answers and explanations; sectionId بر اساس درسِ مؤثر در همین آزمون
  res.json(qs.map((q) => {
    const { answer, explanation, ...rest } = q
    return { ...rest, sectionId: effectiveSectionId(exam, q) }
  }))
})

app.post('/api/exams/:examId/submit', auth, (req, res) => {
  const exam = findExam(req.params.examId, req.user.id)
  if (!exam) return res.status(404).json({ error: 'آزمون یافت نشد' })
  if (examLocked(exam, req.user)) return res.status(402).json(SUB_ERROR)
  const { answers = {}, timeSpent = 0, flags = [] } = req.body || {}
  const section = isSingleExam(exam) ? exam.sectionId : 'all'
  const qs = questionsForAny(exam)
  // آزمون رایگان امتحانی: نتیجه و پاسخ صحیح دیده می‌شود ولی پاسخ تشریحی قفل است
  // (باید پیش از push شدن attempt محاسبه شود که freeExamUsed هنوز false است)
  const hideExplanations = isTrialExam(exam, req.user)

  let correct = 0
  const detail = qs.map((q) => {
    const chosen = answers[q.id] ?? null
    const ok = chosen === q.answer
    if (ok) correct++
    return {
      id: q.id,
      sectionId: effectiveSectionId(exam, q),
      question: q.question,
      options: q.options,
      chosen,
      answer: q.answer,
      explanation: hideExplanations ? null : q.explanation,
      explanationLocked: hideExplanations && !!q.explanation,
      correct: ok,
    }
  })
  // شمارش غلط/بی‌پاسخ فقط از روی سوالات همان آزمون — کلیدهای نامعتبر شمرده نمی‌شوند
  const wrong = detail.filter((d) => d.chosen !== null && !d.correct).length

  const attempt = {
    id: crypto.randomUUID(),
    userId: req.user.id,
    examId: exam.id,
    section,
    total: qs.length,
    correct,
    wrong,
    unanswered: detail.filter((d) => d.chosen === null).length,
    score: qs.length ? Math.round((correct / qs.length) * 100) : 0,
    timeSpent,
    flags: [...new Set(flags)].filter((id) => qs.some((q) => q.id === id)),
    // پاسخ‌های کاربر برای مرور بعدی نتیجه (داشبورد «آزمون‌های من») ذخیره می‌شود؛
    // trial می‌ماند تا پاسخ تشریحی آزمون رایگان در مرور هم قفل بماند
    answers: Object.fromEntries(detail.filter((d) => d.chosen !== null).map((d) => [d.id, d.chosen])),
    trial: hideExplanations,
    sectionStats: null, // بعداً پر می‌شود
    createdAt: Date.now(),
  }
  bumpStreak(req.user, attempt.createdAt)
  getDb().attempts.push(attempt)
  save()

  // نمره به تفکیک درس
  const sectionStats = sections
    .map((sec) => {
      const list = detail.filter((d) => d.sectionId === sec.id)
      if (!list.length) return null
      const ok = list.filter((d) => d.correct).length
      return {
        sectionId: sec.id,
        title: sec.title,
        icon: sec.icon,
        color: sec.color,
        total: list.length,
        correct: ok,
        percent: Math.round((ok / list.length) * 100),
      }
    })
    .filter(Boolean)
  attempt.sectionStats = sectionStats
  save() // پس از پر شدن sectionStats دوباره ذخیره شود تا در دیسک هم بماند

  res.json({ attempt, detail, sectionStats, pointsEarned: pointsOf(attempt), streak: req.user.streak.count })
})

// ---------- کوییز روزانه: ۱۰ سوال ترکیبی از دروس تخصصی بدنسازی/فیتنس (بدون تئوری عمومی) ----------
// پاسخ تشریحی برای غیرمشترک قفل است
app.get('/api/daily', auth, (req, res) => {
  const hideExplanations = !subActiveFor(req.user) && !req.user.admin
  const avail = sections.filter((s) => ['bodybuilding', 'fitness'].includes(s.group) && questions.some((q) => q.topicIds.includes(s.id)))
  const chosen = [...avail].sort(() => Math.random() - 0.5).slice(0, 10)
  const qs = chosen.map((sec) => {
    const poolQ = questions.filter((q) => q.topicIds.includes(sec.id))
    const q = poolQ[Math.floor(Math.random() * poolQ.length)]
    return {
      ...q,
      sectionId: sec.id,
      sectionTitle: sec.title,
      icon: sec.icon,
      color: sec.color,
      explanation: hideExplanations ? null : q.explanation,
      explanationLocked: hideExplanations && !!q.explanation,
    }
  })
  res.json(qs)
})

// ---------- آمار عملکرد کاربر — ویژه مشترکین ----------
const STATS_ERROR = { error: 'مشاهده آمار و سوابق آزمون نیاز به اشتراک فعال دارد', code: 'SUBSCRIPTION_REQUIRED' }

app.get('/api/stats', auth, (req, res) => {
  if (!subActiveFor(req.user) && !req.user.admin) return res.status(402).json(STATS_ERROR)
  const mine = getDb().attempts.filter((a) => a.userId === req.user.id)
  const agg = new Map()
  for (const a of mine) {
    for (const s of a.sectionStats ?? []) {
      const r = agg.get(s.sectionId) || { sectionId: s.sectionId, title: s.title, icon: s.icon, color: s.color, correct: 0, total: 0 }
      r.correct += s.correct
      r.total += s.total
      agg.set(s.sectionId, r)
    }
  }
  const bySubject = [...agg.values()]
    .map((r) => ({ ...r, percent: r.total ? Math.round((r.correct / r.total) * 100) : 0 }))
    .sort((x, y) => y.percent - x.percent)
  const trend = [...mine]
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(-12)
    .map((a) => ({ score: a.score, createdAt: a.createdAt }))
  res.json({
    exams: mine.length,
    questions: mine.reduce((s, a) => s + a.total, 0),
    correct: mine.reduce((s, a) => s + a.correct, 0),
    avg: mine.length ? Math.round(mine.reduce((s, a) => s + a.score, 0) / mine.length) : 0,
    best: mine.length ? Math.max(...mine.map((a) => a.score)) : 0,
    bySubject,
    trend,
  })
})

app.get('/api/attempts', auth, (req, res) => {
  if (!subActiveFor(req.user) && !req.user.admin) return res.status(402).json(STATS_ERROR)
  const list = getDb()
    .attempts.filter((a) => a.userId === req.user.id)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 50)
    .map((a) => ({
      ...a,
      examTitle:
        exams.find((e) => e.id === a.examId)?.title ||
        getDb().generated.find((e) => e.id === a.examId)?.title ||
        'آزمون',
      sectionTitle:
        a.section === 'all' ? 'تمام بخش‌ها' : sections.find((s) => s.id === a.section)?.title,
    }))
  res.json(list)
})

// مرور یک تلاش قبلی — جزئیات هر سوال با پاسخ کاربر از روی بانک بازسازی می‌شود
app.get('/api/attempts/:attemptId', auth, (req, res) => {
  if (!subActiveFor(req.user) && !req.user.admin) return res.status(402).json(STATS_ERROR)
  const a = getDb().attempts.find((x) => x.id === req.params.attemptId && x.userId === req.user.id)
  if (!a) return res.status(404).json({ error: 'آزمون یافت نشد' })
  const exam = findExam(a.examId, req.user.id)
  if (!exam) return res.status(404).json({ error: 'آزمون این نتیجه دیگر در دسترس نیست' })
  const saved = a.answers || {}
  const hide = !!a.trial
  const detail = questionsForAny(exam).map((q) => {
    const chosen = saved[q.id] ?? null
    return {
      id: q.id,
      sectionId: effectiveSectionId(exam, q),
      question: q.question,
      options: q.options,
      chosen,
      answer: q.answer,
      explanation: hide ? null : q.explanation,
      explanationLocked: hide && !!q.explanation,
      correct: chosen === q.answer,
    }
  })
  const examTitle = exams.find((e) => e.id === a.examId)?.title || getDb().generated.find((e) => e.id === a.examId)?.title || 'آزمون'
  res.json({ attempt: { ...a, examTitle }, detail })
})

// ---------- رتبه‌بندی کاربران بر اساس امتیاز ----------
const LEADERBOARD_DAYS = { day: 1, week: 7, month: 30, all: Infinity }

app.get('/api/leaderboard', auth, (req, res) => {
  const days = LEADERBOARD_DAYS[req.query.period] ?? Infinity
  const today = tehranDay(Date.now())
  // کاربران واقعی + فیک در یک نقشه؛ حساب‌های تستی/ادمین/یتیم از جدول حذف می‌شوند
  const usersById = new Map([...getDb().users, ...FAKE_USERS].map((u) => [u.id, u]))
  const rows = new Map()
  for (const a of [...getDb().attempts, ...fakeLeaderboardAttempts()]) {
    if (isTestUser(usersById.get(a.userId))) continue
    if (Number.isFinite(days) && today - tehranDay(a.createdAt) >= days) continue
    const r = rows.get(a.userId) || { userId: a.userId, points: 0, exams: 0, best: 0 }
    r.points += pointsOf(a)
    r.exams++
    r.best = Math.max(r.best, a.score)
    rows.set(a.userId, r)
  }
  const list = [...rows.values()]
    .map((r) => ({ ...r, name: usersById.get(r.userId)?.name || 'کاربر' }))
    .sort((x, y) => y.points - x.points || y.best - x.best || x.userId.localeCompare(y.userId))
  const meIdx = list.findIndex((r) => r.userId === req.user.id)
  res.json({
    list: list.slice(0, 50).map((r, i) => ({ ...r, rank: i + 1 })),
    me: meIdx === -1 ? null : { ...list[meIdx], rank: meIdx + 1 },
  })
})

// ---------- اعلان‌ها (اطلاع‌رسانی به همه‌ی کاربران) ----------
app.get('/api/announcements', auth, (req, res) => {
  const list = [...getDb().announcements].sort((a, b) => b.createdAt - a.createdAt).slice(0, 30)
  res.json({ list })
})

app.post('/api/announcements', auth, adminOnly, (req, res) => {
  const title = String(req.body.title || '').trim()
  const body = String(req.body.body || '').trim()
  if (!title || !body) return res.status(400).json({ error: 'عنوان و متن اعلان الزامی است' })
  const a = { id: crypto.randomUUID(), title: title.slice(0, 120), body: body.slice(0, 2000), createdAt: Date.now() }
  getDb().announcements.push(a)
  save()
  res.json({ announcement: a })
})

app.delete('/api/announcements/:id', auth, adminOnly, (req, res) => {
  const db = getDb()
  const i = db.announcements.findIndex((a) => a.id === req.params.id)
  if (i === -1) return res.status(404).json({ error: 'اعلان یافت نشد' })
  db.announcements.splice(i, 1)
  save()
  res.json({ ok: true })
})

// ---------- نظرات کاربران ----------
app.post('/api/feedback', auth, (req, res) => {
  const text = String(req.body.text || '').trim()
  const rating = Math.min(5, Math.max(1, Number(req.body.rating) || 0))
  if (text.length < 3) return res.status(400).json({ error: 'متن نظر باید حداقل ۳ حرف باشد' })
  const f = {
    id: crypto.randomUUID(),
    userId: req.user.id,
    name: req.user.name,
    phone: req.user.phone,
    rating,
    text: text.slice(0, 1500),
    createdAt: Date.now(),
  }
  getDb().feedback.push(f)
  save()
  res.json({ feedback: f })
})

app.get('/api/feedback/mine', auth, (req, res) => {
  const list = getDb()
    .feedback.filter((f) => f.userId === req.user.id)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 20)
  res.json({ list })
})

app.get('/api/admin/feedback', auth, adminOnly, (req, res) => {
  const list = [...getDb().feedback].sort((a, b) => b.createdAt - a.createdAt).slice(0, 100)
  res.json({ list })
})

app.delete('/api/admin/feedback/:id', auth, adminOnly, (req, res) => {
  const db = getDb()
  const i = db.feedback.findIndex((f) => f.id === req.params.id)
  if (i === -1) return res.status(404).json({ error: 'نظر یافت نشد' })
  db.feedback.splice(i, 1)
  save()
  res.json({ ok: true })
})

// ---------- داشبرد مدیریتی ----------
app.get('/api/admin/overview', auth, adminOnly, (req, res) => {
  const db = getDb()
  const real = db.users.filter((u) => !u.admin)
  const realIds = new Set(real.map((u) => u.id))
  const paid = db.orders.filter((o) => o.status === 'paid')
  // آمار تلاش‌ها/آزمون‌های ساخته‌شده فقط برای کاربران واقعی — تست‌های خود مدیر شمرده نمی‌شوند
  const realAttempts = db.attempts.filter((a) => realIds.has(a.userId))
  res.json({
    users: real.length,
    activeSubs: real.filter(subActiveFor).length,
    attempts: realAttempts.length,
    questions: questions.length,
    avgScore: realAttempts.length ? Math.round(realAttempts.reduce((s, a) => s + a.score, 0) / realAttempts.length) : 0,
    generated: db.generated.filter((g) => realIds.has(g.userId) || realIds.has(g.createdBy)).length,
    paidOrders: paid.length,
    pendingOrders: db.orders.filter((o) => o.status === 'pending').length,
    revenueRial: paid.reduce((s, o) => s + o.amountRial, 0),
    feedback: db.feedback.length,
    announcements: db.announcements.length,
  })
})

app.get('/api/admin/users', auth, adminOnly, (req, res) => {
  const db = getDb()
  const mine = (u) => db.attempts.filter((a) => a.userId === u.id)
  res.json({
    list: [...db.users]
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((u) => {
        const at = mine(u)
        return {
          id: u.id,
          name: u.name,
          phone: u.phone,
          admin: !!u.admin,
          subscription: u.subscription ?? null,
          points: userPoints(u.id),
          streak: u.streak?.count ?? 0,
          exams: at.length,
          lastAttemptAt: at.length ? Math.max(...at.map((a) => a.createdAt)) : null,
          createdAt: u.createdAt,
        }
      }),
  })
})

// اعطا/تمدید اشتراک دستی توسط مدیر (فروش حضوری یا هدیه)
app.post('/api/admin/users/:id/subscription', auth, adminOnly, (req, res) => {
  const plan = PLANS[req.body?.plan]
  if (!plan) return res.status(400).json({ error: 'پلن نامعتبر است' })
  const u = getDb().users.find((x) => x.id === req.params.id)
  if (!u) return res.status(404).json({ error: 'کاربر یافت نشد' })
  grantSubscription(u, req.body.plan)
  save()
  res.json({ user: publicUser(u) })
})

app.delete('/api/admin/users/:id/subscription', auth, adminOnly, (req, res) => {
  const u = getDb().users.find((x) => x.id === req.params.id)
  if (!u) return res.status(404).json({ error: 'کاربر یافت نشد' })
  u.subscription = null
  save()
  res.json({ user: publicUser(u) })
})

app.get('/api/admin/orders', auth, adminOnly, (req, res) => {
  const db = getDb()
  // سفارش‌های معلق منقضی در نمایش واقعی می‌شوند
  let dirty = false
  for (const o of db.orders) if (orderExpired(o)) { o.status = 'expired'; dirty = true }
  if (dirty) save()
  const nameOf = (id) => db.users.find((u) => u.id === id)?.name || '—'
  const phoneOf = (id) => db.users.find((u) => u.id === id)?.phone || ''
  res.json({
    list: [...db.orders]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 100)
      .map((o) => ({
        ...o,
        planTitle: PLANS[o.plan]?.title || o.plan,
        userName: nameOf(o.userId),
        userPhone: phoneOf(o.userId),
      })),
  })
})

// ---------- CRM: نمای ۳۶۰ درجهٔ کاربر، یادداشت، متریک‌ها و خروجی ----------
const examTitleOf = (examId) =>
  exams.find((e) => e.id === examId)?.title || getDb().generated.find((e) => e.id === examId)?.title || examId

// جزئیات کامل یک کاربر برای صفحهٔ CRM: پروفایل، اشتراک، آمار، تلاش‌ها، سفارش‌ها، نظرها
app.get('/api/admin/users/:id', auth, adminOnly, (req, res) => {
  const db = getDb()
  const u = db.users.find((x) => x.id === req.params.id)
  if (!u) return res.status(404).json({ error: 'کاربر یافت نشد' })
  const ats = db.attempts.filter((a) => a.userId === u.id).sort((a, b) => b.createdAt - a.createdAt)
  res.json({
    user: { ...publicUser(u), createdAt: u.createdAt, gender: u.gender ?? null, note: u.note ?? '' },
    stats: {
      attempts: ats.length,
      avgScore: ats.length ? Math.round(ats.reduce((s, a) => s + a.score, 0) / ats.length) : 0,
      bestScore: ats.length ? Math.max(...ats.map((a) => a.score)) : 0,
      totalTimeMin: Math.round(ats.reduce((s, a) => s + (a.timeSpent || 0), 0) / 60),
      lastAttemptAt: ats[0]?.createdAt ?? null,
    },
    attempts: ats.slice(0, 30).map((a) => ({
      id: a.id, examId: a.examId, examTitle: examTitleOf(a.examId),
      score: a.score, correct: a.correct, total: a.total, timeSpent: a.timeSpent, createdAt: a.createdAt,
    })),
    orders: db.orders.filter((o) => o.userId === u.id).sort((a, b) => b.createdAt - a.createdAt)
      .map((o) => ({ ...o, planTitle: PLANS[o.plan]?.title || o.plan })),
    feedback: db.feedback.filter((f) => f.userId === u.id).sort((a, b) => b.createdAt - a.createdAt),
  })
})

// یادداشت مدیر روی کاربر — متن کوتاه، فقط در CRM دیده می‌شود
app.post('/api/admin/users/:id/note', auth, adminOnly, (req, res) => {
  const u = getDb().users.find((x) => x.id === req.params.id)
  if (!u) return res.status(404).json({ error: 'کاربر یافت نشد' })
  u.note = String(req.body?.note ?? '').slice(0, 2000)
  save()
  res.json({ ok: true, note: u.note })
})

// ویرایش اطلاعات کاربر (نام/موبایل) — برای اصلاح توسط مدیر
app.patch('/api/admin/users/:id', auth, adminOnly, (req, res) => {
  const db = getDb()
  const u = db.users.find((x) => x.id === req.params.id)
  if (!u) return res.status(404).json({ error: 'کاربر یافت نشد' })
  if (req.body?.name != null) {
    const name = String(req.body.name).trim()
    if (!name) return res.status(400).json({ error: 'نام نمی‌تواند خالی باشد' })
    u.name = name
  }
  if (req.body?.phone != null && !u.admin) {
    const phone = normalizePhone(req.body.phone)
    if (!isValidPhone(phone)) return res.status(400).json({ error: 'شماره موبایل نامعتبر است' })
    if (db.users.some((x) => x.id !== u.id && x.phone === phone))
      return res.status(409).json({ error: 'این شماره برای کاربر دیگری ثبت شده است' })
    u.phone = phone
  }
  save()
  res.json({ user: publicUser(u) })
})

// ابطال همهٔ نشست‌های کاربر — خروج اجباری (مثلاً وقتی اکانت مشکوک است)
app.post('/api/admin/users/:id/revoke-sessions', auth, adminOnly, (req, res) => {
  const db = getDb()
  const u = db.users.find((x) => x.id === req.params.id)
  if (!u) return res.status(404).json({ error: 'کاربر یافت نشد' })
  const n = db.sessions.length
  db.sessions = db.sessions.filter((s) => s.userId !== u.id)
  save()
  res.json({ ok: true, revoked: n - db.sessions.length })
})

// تغییر وضعیت سفارش — ثبت فروش نقدی (paid) یا لغو سفارش معلق
app.patch('/api/admin/orders/:id', auth, adminOnly, async (req, res) => {
  const order = getDb().orders.find((o) => o.id === req.params.id)
  if (!order) return res.status(404).json({ error: 'سفارش یافت نشد' })
  const status = req.body?.status
  if (status === 'paid') {
    if (order.status !== 'paid') fulfillOrder(order, { provider_payment_charge_id: 'manual-admin' })
  } else if (status === 'canceled') {
    if (order.status !== 'pending') return res.status(400).json({ error: 'فقط سفارش در انتظار قابل لغو است' })
    order.status = 'canceled'
    save()
  } else {
    return res.status(400).json({ error: 'وضعیت نامعتبر — paid یا canceled' })
  }
  res.json({ order })
})

// متریک‌های ۳۰ روز اخیر: ثبت‌نام/آزمون/درآمد روزانه + قیف تبدیل — برای چارت‌های داشبرد
app.get('/api/admin/metrics', auth, adminOnly, (req, res) => {
  const db = getDb()
  const days = 30
  const today = tehranDay(Date.now())
  const bucket = () => Array.from({ length: days }, (_, i) => ({ day: today - days + 1 + i, v: 0 }))
  const signups = bucket(), attempts = bucket(), revenue = bucket(), ordersDay = bucket()
  const push = (arr, ts, v = 1) => {
    const d = tehranDay(ts)
    const i = d - (today - days + 1)
    if (i >= 0 && i < days) arr[i].v += v
  }
  for (const u of db.users) if (!u.admin) push(signups, u.createdAt)
  for (const a of db.attempts) push(attempts, a.createdAt)
  for (const o of db.orders) {
    push(ordersDay, o.createdAt)
    if (o.status === 'paid') push(revenue, o.createdAt, o.amountRial)
  }
  const real = db.users.filter((u) => !u.admin)
  const engaged = real.filter((u) => db.attempts.some((a) => a.userId === u.id))
  res.json({
    days: signups.map((b) => b.day),
    signups: signups.map((b) => b.v),
    attempts: attempts.map((b) => b.v),
    revenue: revenue.map((b) => Math.round(b.v / 10)), // تومان
    ordersPerDay: ordersDay.map((b) => b.v),
    funnel: {
      registered: real.length,
      engaged: engaged.length,
      subscribed: real.filter(subActiveFor).length,
      paying: real.filter((u) => db.orders.some((o) => o.userId === u.id && o.status === 'paid')).length,
    },
  })
})

// خروجی CSV کاربران — برای تحلیل خارجی/بکاپ ارتباطات
app.get('/api/admin/export/users.csv', auth, adminOnly, (req, res) => {
  const db = getDb()
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const rows = [['id', 'name', 'phone', 'plan', 'sub_until', 'active_sub', 'points', 'streak', 'exams', 'last_attempt', 'created_at', 'note'].join(',')]
  for (const u of db.users.filter((x) => !x.admin)) {
    const ats = db.attempts.filter((a) => a.userId === u.id)
    rows.push([
      u.id, esc(u.name), u.phone, u.subscription?.plan ?? '', u.subscription?.until ?? '',
      subActiveFor(u) ? 1 : 0, userPoints(u.id), u.streak?.count ?? 0, ats.length,
      ats.length ? Math.max(...ats.map((a) => a.createdAt)) : '', u.createdAt, esc(u.note ?? ''),
    ].join(','))
  }
  res.setHeader('content-type', 'text/csv; charset=utf-8')
  res.setHeader('content-disposition', 'attachment; filename="users.csv"')
  res.send('﻿' + rows.join('\n')) // BOM برای خوانایی در اکسل
})

// ---------- پنل مدیریت مستقل — جدا از اپ، در مرورگر روی /admin ----------
const adminDir = path.join(__dirname, '..', 'admin')
if (fs.existsSync(adminDir)) {
  app.use('/admin', express.static(adminDir))
}

// ---------- landing page + APK download ----------
const pub = path.join(__dirname, '..', 'publish')
if (fs.existsSync(pub)) {
  app.use('/landing', express.static(pub))
}

// ---------- serve client build in production ----------
const dist = path.join(__dirname, '..', 'client', 'dist')
if (fs.existsSync(dist)) {
  app.use(express.static(dist))
  app.get(/^(?!\/api).*/, (_, res) => res.sendFile(path.join(dist, 'index.html')))
}

app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`))
