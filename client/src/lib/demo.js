// بک‌اند دموی مرورگر — وقتی سرور واقعی در دسترس نیست (مثل نسخه دیپلوی‌شده استاتیک)،
// همین ماژول همه اندپوینت‌های API را در مرورگر با localStorage شبیه‌سازی می‌کند.
// منطق آزمون از shared/exam-core.js خوانده می‌شود تا با سرور یکسان بماند.
import bank from '../../../server/bank.json' with { type: 'json' }
import release from '../../../server/release.json' with { type: 'json' }
import { createExamModel } from '../../../shared/exam-core.js'
import { FAKE_USERS, fakeLeaderboardAttempts, isTestUser } from '../../../shared/fake-leaderboard.js'

const model = createExamModel(bank)
const { sections, specializedSectionsFor, questions, exams, questionsForExam, generateExamQuestions, isSingleExam, effectiveSectionId, shapeExam } = model
const byId = new Map(questions.map((q) => [q.id, q]))

const DB_KEY = 'azmoon_demo_db'
const TOKEN_KEY = 'azmoon_token'
const BASE_DB = { users: [], sessions: [], attempts: [], generated: [], otps: [], announcements: [], feedback: [], orders: [] }

const load = () => {
  try {
    return { ...BASE_DB, ...JSON.parse(localStorage.getItem(DB_KEY) || '{}') }
  } catch {
    return { ...BASE_DB }
  }
}
const persist = (db) => localStorage.setItem(DB_KEY, JSON.stringify(db))

const uid = () =>
  (globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36))
const newToken = () => {
  const a = new Uint8Array(32)
  globalThis.crypto?.getRandomValues?.(a)
  return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('')
}

// ---------- کمکی‌های مشترک با سرور ----------
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
const normalizeCode = (raw) =>
  String(raw || '')
    .replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)))
    .replace(/\D/g, '')
    .trim()

const TEHRAN_OFFSET = 3.5 * 3600000
const DAY_MS = 86400000
const tehranDay = (ts) => Math.floor((ts + TEHRAN_OFFSET) / DAY_MS)
const pointsOf = (a) => a.correct * 10
const userPoints = (db, userId) =>
  db.attempts.reduce((s, a) => (a.userId === userId ? s + pointsOf(a) : s), 0)
const bumpStreak = (u, now) => {
  const d = tehranDay(now)
  const s = u.streak || { count: 0, lastDay: null }
  if (s.lastDay === d) return
  s.count = s.lastDay === d - 1 ? s.count + 1 : 1
  s.lastDay = d
  u.streak = s
}
const publicUser = (db, u) => ({
  id: u.id,
  name: u.name,
  phone: u.phone,
  subscription: u.subscription ?? null,
  points: userPoints(db, u.id),
  streak: u.streak?.count ?? 0,
  admin: !!u.admin,
  freeExamUsed: freeExamUsed(db, u),
})

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
    until: Math.max(Date.now(), u.subscription?.until ?? 0) + plan.months * 30 * 864e5,
  }
}
const adminRequired = (user) => {
  if (!user.admin) {
    const err = new Error('دسترسی فقط برای مدیر است')
    err.code = 'FORBIDDEN'
    throw err
  }
}
const DISCIPLINES = { bodybuilding: 'بدنسازی', fitness: 'فیتنس' }
const GENDER_TITLES = { men: 'آقایان', women: 'بانوان' }
const LEADERBOARD_DAYS = { day: 1, week: 7, month: 30, all: Infinity }
const OTP_TTL = 2 * 60 * 1000
const OTP_COOLDOWN = 60 * 1000

// اکانت مدیر دمو — مطابق سرور
const seedAdmin = (db) => {
  if (!db.users.some((u) => u.phone === '1111')) {
    db.users.push({ id: uid(), name: 'ادمین', phone: '1111', password: '1111', admin: true, createdAt: Date.now() })
  }
}

const findExam = (db, id, userId) =>
  exams.find((e) => e.id === id) || db.generated.find((e) => e.id === id && e.userId === userId)

// پیول دمو — مطابق سرور: تک‌درس‌های آماده، کوییز روزانه و اولین آزمون جامع رایگان؛ بقیه نیازمند اشتراک
const subActive = (u) => !!u.subscription && u.subscription.until > Date.now()
const isFreeExam = (exam) => exam.type === 'single'
const freeExamUsed = (db, u) => db.attempts.some((a) => a.userId === u.id && a.section === 'all')
const isTrialExam = (db, exam, u) => !isFreeExam(exam) && !subActive(u) && !u.admin && !freeExamUsed(db, u)
const examLocked = (db, exam, u) => !isFreeExam(exam) && !subActive(u) && !u.admin && freeExamUsed(db, u)
const subRequired = (msg = 'آزمون رایگان شما قبلاً استفاده شده است — برای ادامه، اشتراک لازم است') => {
  const err = new Error(msg)
  err.code = 'SUBSCRIPTION_REQUIRED'
  throw err
}

const questionsForAny = (exam) => questionsForExam(exam)

// ---------- هندلر اندپوینت‌ها ----------
const handlers = {
  'POST /register': (db, body) => {
    const { name, phone, password } = body || {}
    if (!name?.trim() || !phone?.trim() || !password)
      throw new Error('نام، شماره موبایل و رمز عبور الزامی است')
    if (password.length < 4) throw new Error('رمز عبور باید حداقل ۴ کاراکتر باشد')
    if (db.users.some((u) => u.phone === phone.trim()))
      throw new Error('این شماره موبایل قبلاً ثبت‌نام کرده است')
    const user = { id: uid(), name: name.trim(), phone: phone.trim(), password, createdAt: Date.now() }
    db.users.push(user)
    const token = newToken()
    db.sessions.push({ token, userId: user.id })
    return { token, user: publicUser(db, user) }
  },

  'POST /login': (db, body) => {
    const user = db.users.find((u) => u.phone === body?.phone?.trim())
    if (!user || user.password !== body?.password)
      throw new Error('شماره موبایل یا رمز عبور اشتباه است')
    const token = newToken()
    db.sessions.push({ token, userId: user.id })
    return { token, user: publicUser(db, user) }
  },

  'POST /logout': (db, _body, token) => {
    db.sessions = db.sessions.filter((s) => s.token !== token)
    return { ok: true }
  },

  'POST /otp/request': (db, body) => {
    const phone = normalizePhone(body?.phone)
    if (!isValidPhone(phone)) throw new Error('شماره موبایل نامعتبر است. مثال: 09123456789')
    const now = Date.now()
    db.otps = db.otps.filter((o) => now - o.createdAt <= OTP_TTL)
    const prev = db.otps.find((o) => o.phone === phone)
    if (prev && now - prev.createdAt < OTP_COOLDOWN) {
      const wait = Math.ceil((OTP_COOLDOWN - (now - prev.createdAt)) / 1000)
      throw new Error(`کد تایید قبلاً ارسال شده است. ${wait} ثانیه دیگر تلاش کنید`)
    }
    const code = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
    db.otps = db.otps.filter((o) => o.phone !== phone)
    db.otps.push({ phone, code, createdAt: now })
    // در دمو پیامکی ارسال نمی‌شود؛ کد مستقیم نمایش داده می‌شود (devCode)
    return { ok: true, isNewUser: !db.users.some((u) => u.phone === phone), expiresIn: OTP_TTL / 1000, devCode: code }
  },

  'POST /otp/verify': (db, body) => {
    const phone = normalizePhone(body?.phone)
    const code = normalizeCode(body?.code)
    const otp = db.otps.find((o) => o.phone === phone)
    if (!otp) throw new Error('کدی برای این شماره ارسال نشده است. ابتدا درخواست کد دهید')
    if (Date.now() - otp.createdAt > OTP_TTL) {
      db.otps = db.otps.filter((o) => o !== otp)
      throw new Error('کد تایید منقضی شده است. دوباره درخواست کنید')
    }
    if (otp.code !== code) throw new Error('کد وارد شده اشتباه است')
    let user = db.users.find((u) => u.phone === phone)
    if (!user) {
      const name = String(body?.name || '').trim()
      if (!name) {
        const err = new Error('نام و نام خانوادگی الزامی است')
        err.code = 'NAME_REQUIRED'
        throw err
      }
      user = { id: uid(), name, phone, createdAt: Date.now() }
      db.users.push(user)
    }
    db.otps = db.otps.filter((o) => o !== otp)
    const token = newToken()
    db.sessions.push({ token, userId: user.id })
    return { token, user: publicUser(db, user) }
  },

  'GET /me': (db, _body, user) => ({ user: publicUser(db, user) }),

  'GET /version': () => release,

  'POST /subscribe': (db, body, user) => {
    adminRequired(user)
    const plan = PLANS[body?.plan]
    if (!plan) throw new Error('پلن نامعتبر است')
    grantSubscription(user, body.plan)
    return { user: publicUser(db, user) }
  },

  // در حالت دمو پرداخت واقعی وجود ندارد — سفارش بلافاصله paid می‌شود
  'POST /payment/order': (db, body, user) => {
    const plan = PLANS[body?.plan]
    if (!plan) throw new Error('پلن نامعتبر است')
    const order = { id: `o-${uid().slice(0, 8)}`, userId: user.id, plan: body.plan, amountRial: plan.priceRial, status: 'paid', createdAt: Date.now() }
    db.orders.push(order)
    grantSubscription(user, body.plan)
    return { orderId: order.id, payUrl: null, status: order.status }
  },

  'GET /exams': (db, _body, user) =>
    exams.map((exam) => ({ ...shapeExam(exam, questionsForExam(exam)), locked: examLocked(db, exam, user), trial: isTrialExam(db, exam, user) })),

  'POST /exams/generate': (db, body, user) => {
    const { mode, sectionId, discipline, gender } = body || {}
    if (!['comprehensive', 'single'].includes(mode)) throw new Error('نوع آزمون نامعتبر است')
    const disc = DISCIPLINES[discipline]
    if (!disc) throw new Error('رشته نامعتبر است')
    const gTitle = GENDER_TITLES[gender]
    if (!gTitle) throw new Error('جنسیت نامعتبر است')
    if (!subActive(user) && !user.admin && freeExamUsed(db, user)) subRequired()

    // درس‌های مجاز برای این آزمون — ۵ درس مشترک + درس جنسیتی (داوری آقایان / فنی تخصصی بانوان)
    const allowedSections = specializedSectionsFor(discipline, gender)

    const sec = sections.find((s) => s.id === sectionId)
    if (mode === 'single') {
      if (!sec) throw new Error('درس انتخاب‌شده نامعتبر است')
      if (!allowedSections.some((s) => s.id === sectionId))
        throw new Error('این درس برای آزمون انتخاب‌شده نیست')
    }
    const exam = {
      id: `g-${uid().slice(0, 8)}`,
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
      questionIds: generateExamQuestions(mode, sectionId, discipline, gender),
      userId: user.id,
      createdAt: Date.now(),
    }
    if (!exam.questionIds.length) throw new Error('برای این درس هنوز سوالی ثبت نشده است')
    db.generated.push(exam)
    return shapeExam(exam, questionsForAny(exam))
  },

  'GET /daily': (db, _body, user) => {
    // فقط دروس تخصصی بدنسازی/فیتنس — تئوری عمومی در کوییز روزانه نیست
    // پاسخ تشریحی برای غیرمشترک قفل است
    const hideExplanations = !subActive(user) && !user.admin
    const avail = sections.filter((s) => ['bodybuilding', 'fitness'].includes(s.group) && questions.some((q) => q.topicIds.includes(s.id)))
    const chosen = [...avail].sort(() => Math.random() - 0.5).slice(0, 10)
    return chosen.map((sec) => {
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
  },

  'GET /stats': (db, _body, user) => {
    if (!subActive(user) && !user.admin) subRequired('مشاهده آمار و سوابق آزمون نیاز به اشتراک فعال دارد')
    const mine = db.attempts.filter((a) => a.userId === user.id)
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
    return {
      exams: mine.length,
      questions: mine.reduce((s, a) => s + a.total, 0),
      correct: mine.reduce((s, a) => s + a.correct, 0),
      avg: mine.length ? Math.round(mine.reduce((s, a) => s + a.score, 0) / mine.length) : 0,
      best: mine.length ? Math.max(...mine.map((a) => a.score)) : 0,
      bySubject,
      trend,
    }
  },

  'GET /attempts': (db, _body, user) => {
    if (!subActive(user) && !user.admin) subRequired('مشاهده آمار و سوابق آزمون نیاز به اشتراک فعال دارد')
    return db.attempts
      .filter((a) => a.userId === user.id)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 50)
      .map((a) => ({
        ...a,
        examTitle: exams.find((e) => e.id === a.examId)?.title || db.generated.find((e) => e.id === a.examId)?.title || 'آزمون',
        sectionTitle: a.section === 'all' ? 'تمام بخش‌ها' : sections.find((s) => s.id === a.section)?.title,
      }))
  },

  'GET /leaderboard': (db, _body, user, ctx) => {
    const days = LEADERBOARD_DAYS[ctx.query.get('period')] ?? Infinity
    const today = tehranDay(Date.now())
    const usersById = new Map([...db.users, ...FAKE_USERS].map((u) => [u.id, u]))
    const rows = new Map()
    for (const a of [...db.attempts, ...fakeLeaderboardAttempts()]) {
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
    const meIdx = list.findIndex((r) => r.userId === user.id)
    return {
      list: list.slice(0, 50).map((r, i) => ({ ...r, rank: i + 1 })),
      me: meIdx === -1 ? null : { ...list[meIdx], rank: meIdx + 1 },
    }
  },

  'GET /announcements': (db) => ({ list: [...db.announcements].sort((a, b) => b.createdAt - a.createdAt).slice(0, 30) }),

  'POST /announcements': (db, body, user) => {
    if (!user.admin) throw new Error('دسترسی فقط برای مدیر است')
    const title = String(body?.title || '').trim()
    const text = String(body?.body || '').trim()
    if (!title || !text) throw new Error('عنوان و متن اعلان الزامی است')
    const a = { id: uid(), title: title.slice(0, 120), body: text.slice(0, 2000), createdAt: Date.now() }
    db.announcements.push(a)
    return { announcement: a }
  },

  'POST /feedback': (db, body, user) => {
    const text = String(body?.text || '').trim()
    const rating = Math.min(5, Math.max(1, Number(body?.rating) || 0))
    if (text.length < 3) throw new Error('متن نظر باید حداقل ۳ حرف باشد')
    const f = { id: uid(), userId: user.id, name: user.name, phone: user.phone, rating, text: text.slice(0, 1500), createdAt: Date.now() }
    db.feedback.push(f)
    return { feedback: f }
  },

  'GET /feedback/mine': (db, _body, user) => ({
    list: db.feedback.filter((f) => f.userId === user.id).sort((a, b) => b.createdAt - a.createdAt).slice(0, 20),
  }),

  'GET /admin/feedback': (db, _body, user) => {
    adminRequired(user)
    return { list: [...db.feedback].sort((a, b) => b.createdAt - a.createdAt).slice(0, 100) }
  },

  // ---------- داشبرد مدیریتی ----------
  'GET /admin/overview': (db, _body, user) => {
    adminRequired(user)
    const real = db.users.filter((u) => !u.admin)
    const paid = db.orders.filter((o) => o.status === 'paid')
    return {
      users: real.length,
      activeSubs: real.filter(subActive).length,
      attempts: db.attempts.length,
      questions: questions.length,
      avgScore: db.attempts.length ? Math.round(db.attempts.reduce((s, a) => s + a.score, 0) / db.attempts.length) : 0,
      generated: db.generated.length,
      paidOrders: paid.length,
      pendingOrders: db.orders.filter((o) => o.status === 'pending').length,
      revenueRial: paid.reduce((s, o) => s + (o.amountRial || 0), 0),
      feedback: db.feedback.length,
      announcements: db.announcements.length,
    }
  },

  'GET /admin/users': (db, _body, user) => {
    adminRequired(user)
    return {
      list: [...db.users]
        .sort((a, b) => b.createdAt - a.createdAt)
        .map((u) => {
          const at = db.attempts.filter((a) => a.userId === u.id)
          return {
            id: u.id,
            name: u.name,
            phone: u.phone,
            admin: !!u.admin,
            subscription: u.subscription ?? null,
            points: userPoints(db, u.id),
            streak: u.streak?.count ?? 0,
            exams: at.length,
            lastAttemptAt: at.length ? Math.max(...at.map((a) => a.createdAt)) : null,
            createdAt: u.createdAt,
          }
        }),
    }
  },

  'GET /admin/orders': (db, _body, user) => {
    adminRequired(user)
    return {
      list: [...db.orders]
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 100)
        .map((o) => ({
          ...o,
          planTitle: PLANS[o.plan]?.title || o.plan,
          userName: db.users.find((u) => u.id === o.userId)?.name || '—',
          userPhone: db.users.find((u) => u.id === o.userId)?.phone || '',
        })),
    }
  },
}

const dynamic = {
  // GET /exams/:id و /exams/:id/questions و POST /exams/:id/submit
  'GET /exams/_': (db, _body, user, ctx) => {
    const exam = findExam(db, ctx.seg[0], user.id)
    if (!exam) throw new Error('آزمون یافت نشد')
    return { ...shapeExam(exam, questionsForAny(exam)), locked: examLocked(db, exam, user), trial: isTrialExam(db, exam, user) }
  },
  'GET /exams/_/questions': (db, _body, user, ctx) => {
    const exam = findExam(db, ctx.seg[0], user.id)
    if (!exam) throw new Error('آزمون یافت نشد')
    if (examLocked(db, exam, user)) subRequired()
    return questionsForAny(exam).map((q) => {
      const { answer, explanation, ...rest } = q
      return { ...rest, sectionId: effectiveSectionId(exam, q) }
    })
  },
  'POST /exams/_/submit': (db, body, user, ctx) => {
    const exam = findExam(db, ctx.seg[0], user.id)
    if (!exam) throw new Error('آزمون یافت نشد')
    if (examLocked(db, exam, user)) subRequired()
    const { answers = {}, timeSpent = 0, flags = [] } = body || {}
    const section = isSingleExam(exam) ? exam.sectionId : 'all'
    const qs = questionsForAny(exam)
    // آزمون رایگان امتحانی: پاسخ تشریحی قفل است (پیش از push شدن attempt محاسبه شود)
    const hideExplanations = isTrialExam(db, exam, user)
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
    const attempt = {
      id: uid(),
      userId: user.id,
      examId: exam.id,
      section,
      total: qs.length,
      correct,
      wrong: detail.filter((d) => d.chosen !== null && !d.correct).length,
      unanswered: detail.filter((d) => d.chosen === null).length,
      score: qs.length ? Math.round((correct / qs.length) * 100) : 0,
      timeSpent,
      flags: [...new Set(flags)].filter((id) => qs.some((q) => q.id === id)),
      answers: Object.fromEntries(detail.filter((d) => d.chosen !== null).map((d) => [d.id, d.chosen])),
      trial: hideExplanations,
      sectionStats: null,
      createdAt: Date.now(),
    }
    bumpStreak(user, attempt.createdAt)
    db.attempts.push(attempt)
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
    return { attempt, detail, sectionStats, pointsEarned: pointsOf(attempt), streak: user.streak.count }
  },
  'GET /payment/order/_': (db, _body, user, ctx) => {
    const order = db.orders.find((o) => o.id === ctx.seg[1] && o.userId === user.id)
    if (!order) throw new Error('سفارش یافت نشد')
    return { orderId: order.id, status: order.status, plan: order.plan, user: publicUser(db, user) }
  },
  'DELETE /announcements/_': (db, _body, user, ctx) => {
    if (!user.admin) throw new Error('دسترسی فقط برای مدیر است')
    const i = db.announcements.findIndex((a) => a.id === ctx.seg[0])
    if (i === -1) throw new Error('اعلان یافت نشد')
    db.announcements.splice(i, 1)
    return { ok: true }
  },
  'DELETE /admin/feedback/_': (db, _body, user, ctx) => {
    adminRequired(user)
    // seg = ['feedback', '<id>']
    const i = db.feedback.findIndex((f) => f.id === ctx.seg[1])
    if (i === -1) throw new Error('نظر یافت نشد')
    db.feedback.splice(i, 1)
    return { ok: true }
  },

  'POST /admin/users/_/subscription': (db, body, user, ctx) => {
    adminRequired(user)
    // seg = ['users', '<id>', 'subscription']
    const plan = PLANS[body?.plan]
    if (!plan) throw new Error('پلن نامعتبر است')
    const u = db.users.find((x) => x.id === ctx.seg[1])
    if (!u) throw new Error('کاربر یافت نشد')
    grantSubscription(u, body.plan)
    return { user: publicUser(db, u) }
  },

  'DELETE /admin/users/_/subscription': (db, _body, user, ctx) => {
    adminRequired(user)
    const u = db.users.find((x) => x.id === ctx.seg[1])
    if (!u) throw new Error('کاربر یافت نشد')
    u.subscription = null
    return { user: publicUser(db, u) }
  },

  // مرور یک تلاش قبلی — همان منطق سرور
  'GET /attempts/_': (db, _body, user, ctx) => {
    if (!subActive(user) && !user.admin) subRequired('مشاهده آمار و سوابق آزمون نیاز به اشتراک فعال دارد')
    const a = db.attempts.find((x) => x.id === ctx.seg[0] && x.userId === user.id)
    if (!a) throw new Error('آزمون یافت نشد')
    const exam = findExam(db, a.examId, user.id)
    if (!exam) throw new Error('آزمون این نتیجه دیگر در دسترس نیست')
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
    const examTitle = exams.find((e) => e.id === a.examId)?.title || db.generated.find((e) => e.id === a.examId)?.title || 'آزمون'
    return { attempt: { ...a, examTitle }, detail }
  },
}

// ---------- ورودی اصلی — هم‌امضا با api() ----------
export async function demoApi(path, { method = 'GET', body } = {}) {
  const db = load()
  seedAdmin(db)
  const token = localStorage.getItem(TOKEN_KEY)
  const session = db.sessions.find((s) => s.token === token)
  const user = session ? db.users.find((u) => u.id === session.userId) : null

  const needsAuth = !['/otp/request', '/otp/verify', '/register', '/login', '/version'].includes(path)
  if (needsAuth && !user) {
    persist(db)
    throw new Error('احراز هویت نامعتبر است')
  }

  const [pathOnly, queryStr] = path.split('?')
  const query = new URLSearchParams(queryStr || '')
  const parts = pathOnly.split('/').filter(Boolean)
  const m = method.toUpperCase()
  const ctx = { seg: parts.slice(1), query }

  // مسیرهای ثابت
  const staticKey = `${m} /${parts.join('/')}`
  if (handlers[staticKey]) {
    const result = handlers[staticKey](db, body, user, ctx)
    persist(db)
    return result
  }

  // مسیرهای پویا: /exams/:id، /exams/:id/questions، /exams/:id/submit، حذف اعلان/نظر
  const dynKey =
    parts[0] === 'exams' && parts.length === 2 ? `${m} /exams/_`
    : parts[0] === 'exams' && parts.length === 3 && parts[2] === 'questions' ? 'GET /exams/_/questions'
    : parts[0] === 'exams' && parts.length === 3 && parts[2] === 'submit' ? 'POST /exams/_/submit'
    : parts[0] === 'announcements' && parts.length === 2 ? 'DELETE /announcements/_'
    : parts[0] === 'payment' && parts[1] === 'order' && parts.length === 3 ? 'GET /payment/order/_'
    : parts[0] === 'admin' && parts[1] === 'feedback' && parts.length === 3 ? 'DELETE /admin/feedback/_'
    : parts[0] === 'admin' && parts[1] === 'users' && parts.length === 4 && parts[3] === 'subscription' ? `${m} /admin/users/_/subscription`
    : parts[0] === 'attempts' && parts.length === 2 ? 'GET /attempts/_'
    : null

  if (dynKey && dynamic[dynKey]) {
    const result = dynamic[dynKey](db, body, user, ctx)
    persist(db)
    return result
  }

  persist(db)
  throw new Error('مسیر یافت نشد (دمو)')
}
