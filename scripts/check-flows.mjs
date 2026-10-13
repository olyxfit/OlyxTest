// چک سرتاسری فلوهای اپ — «ایجنت» تست API + اینواریانت‌های بانک سوال
// اجرا:  node app/scripts/check-flows.mjs
// کارها: بکاپ db.json ← اجرای سرور روی پورت موقت با env پاک (بدون کاوه‌نگار/بله)
//        ← تست همهٔ فلوها ← kill و restore db.json
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const APP = path.join(__dirname, '..')
const DB = path.join(APP, 'server', 'data', 'db.json')
const PORT = 3517
const BASE = `http://localhost:${PORT}/api`

const { sections, sectionsFor, questions, exams, questionsForExam, generateExamQuestions, shapeExam } =
  await import(path.join(APP, 'server', 'questions.js'))

// ---------- گزارش ----------
const results = []
const check = (name, cond, extra = '') =>
  results.push({ name, ok: !!cond, extra: cond ? '' : String(extra).slice(0, 300) })
const section = (t) => results.push({ header: t })

const req = async (method, p, { token, body } = {}) => {
  const res = await fetch(BASE + p, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  return { status: res.status, data: await res.json().catch(() => ({})) }
}

const ansMap = new Map(questions.map((q) => [q.id, q.answer]))
const answersFor = (qs, correct = true) =>
  Object.fromEntries(qs.map((q) => [q.id, correct ? ansMap.get(q.id) : (ansMap.get(q.id) + 1) % q.options.length]))

// ---------- اینواریانت‌های بانک و مدل آزمون ----------
section('اینواریانت‌های بانک و مدل آزمون')
{
  check('همهٔ سوالات حداقل یک topic دارند', questions.every((q) => q.topicIds.length > 0))
  check('آیدی سوالات یکتاست', new Set(questions.map((q) => q.id)).size === questions.length)
  check('answer در بازهٔ options است', questions.every((q) => Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length))

  const comp = exams.filter((e) => e.type === 'comprehensive')
  const byDisc = { bodybuilding: [], fitness: [] }
  for (const e of comp) {
    const qs = questionsForExam(e)
    const allowed = sectionsFor(e.discipline, e.gender)
    const shaped = shapeExam(e, qs)
    const counts = Object.fromEntries(shaped.sections.map((s) => [s.id, s.count]))
    const allowedIds = new Set(allowed.map((s) => s.id))
    check(`${e.id}: ۳۰ سوال یکتا`, qs.length === 30 && new Set(qs.map((q) => q.id)).size === 30, `n=${qs.length}`)
    check(
      `${e.id}: دقیقاً ۵ سوال از هر ۶ درس مجاز`,
      allowed.every((s) => counts[s.id] === 5) && shaped.sections.every((s) => allowedIds.has(s.id) || s.count === 0),
      JSON.stringify(allowed.map((s) => [s.id, counts[s.id] ?? 0])),
    )
    byDisc[e.discipline].push(e)
  }
  // عدم اشتراک سوال بین آزمون‌های هم‌رشته (بدنسازی↔فیتنس مجاز)
  for (const [disc, list] of Object.entries(byDisc)) {
    const seen = new Map()
    let dup = null
    for (const e of list) for (const id of e.questionIds) {
      if (seen.has(id)) dup = `${seen.get(id)} ↔ ${e.id} (${id})`
      seen.set(id, e.id)
    }
    check(`${disc}: بدون سوال مشترک بین آزمون‌های هم‌رشته`, !dup, dup || '')
  }
  // درس جنسیتی
  for (const e of comp) {
    const ids = new Set(e.questionIds)
    const qsecs = new Set(questions.filter((q) => ids.has(q.id)).flatMap((q) => q.topicIds))
    const male = e.gender === 'men'
    check(`${e.id}: درس جنسیتی ${e.gender}`, male ? !sectionsFor(e.discipline, 'women').some((s) => s.gender === 'women' && qsecs.has(s.id)) : true)
  }
  // تک‌درس‌ها
  for (const s of [...sectionsFor('bodybuilding', 'men'), ...sectionsFor('bodybuilding', 'women'), ...sectionsFor('fitness', 'men'), ...sectionsFor('fitness', 'women')]) {
    const ex = exams.find((e) => e.id === `s-${s.id}`)
    if (questions.filter((q) => q.topicIds.includes(s.id) && !q.fed).length)
      check(`s-${s.id}: آزمون تک‌درس موجود و پر`, !!ex && questionsForExam(ex).length > 0)
  }
  check('fed1 موجود با سوال واقعی', exams.some((e) => e.id === 'fed1') && questionsForExam(exams.find((e) => e.id === 'fed1')).length > 0)
  check('همهٔ questionIds معتبرند', exams.every((e) => !e.questionIds || e.questionIds.every((id) => ansMap.has(id))))

  // تولید تصادفی
  for (const d of ['bodybuilding', 'fitness']) for (const g of ['men', 'women']) {
    const ids = generateExamQuestions('comprehensive', null, d, g)
    check(`generate ${d}/${g}: ۳۰ سوال یکتا`, ids.length === 30 && new Set(ids).size === 30, `n=${ids.length}`)
  }
  const singleIds = generateExamQuestions('single', 'bb-systems', 'bodybuilding', 'men')
  check('generate single: ۵ سوال', singleIds.length === 5 && new Set(singleIds).size === 5, `n=${singleIds.length}`)
}

// ---------- اجرای سرور موقت ----------
section('اجرای سرور')
const dbBak = DB + '.flowbak'
const hadDb = fs.existsSync(DB)
if (hadDb) fs.copyFileSync(DB, dbBak)

const env = { PATH: process.env.PATH, HOME: process.env.HOME, PORT: String(PORT), BALE_POLLING: '0', NODE_ENV: 'test' }
let srv
const startServer = async () => {
  srv = spawn('node', [path.join(APP, 'server', 'index.js')], { env, stdio: ['ignore', 'pipe', 'inherit'] })
  srv.stdout.on('data', (d) => process.env.VERBOSE && process.stderr.write(d))
  for (let i = 0; i < 50; i++) {
    await new Promise((r) => setTimeout(r, 200))
    if (await fetch(BASE + '/health').then((r) => r.ok).catch(() => false)) return true
  }
  return false
}
const serverUp = await startServer()
let preIds // برای چک پایداری آزمون‌های ازپیش‌ساخته بین ری‌استارت

const restore = () => {
  try { srv.kill('SIGKILL') } catch {}
  if (hadDb) fs.copyFileSync(dbBak, DB)
  else if (fs.existsSync(DB)) fs.unlinkSync(DB)
  if (fs.existsSync(dbBak)) fs.unlinkSync(dbBak)
}

try {
  check('سرور بالا آمد (/api/health)', serverUp)
  if (!serverUp) throw new Error('server did not start')

  // ---------- فلوهای عمومی ----------
  section('فلوهای عمومی')
  {
    const v = await req('GET', '/version')
    check('/api/version → فیلدهای نسخه', v.status === 200 && v.data.version, JSON.stringify(v.data))
    const ps = await req('GET', '/public-stats')
    check('/api/public-stats → users:number', ps.status === 200 && typeof ps.data.users === 'number')
  }

  // ---------- احراز هویت ----------
  section('احراز هویت (رمز)')
  const phone = '0912' + String(Math.floor(Math.random() * 9e6)).padStart(7, '0')
  let token, userId
  {
    let r = await req('POST', '/register', { body: { name: 'تست فلو', phone, password: '1234' } })
    check('register → token+user', r.status === 200 && r.data.token && r.data.user?.phone === phone, JSON.stringify(r.data))
    token = r.data.token
    userId = r.data.user?.id
    r = await req('POST', '/register', { body: { name: 'x', phone, password: '1234' } })
    check('register تکراری → 409', r.status === 409, `status=${r.status}`)
    r = await req('POST', '/register', { body: { name: 'x', phone: '09120000001', password: '12' } })
    check('register رمز کوتاه → 400', r.status === 400, `status=${r.status}`)
    r = await req('POST', '/login', { body: { phone, password: 'wrong' } })
    check('login اشتباه → 401', r.status === 401, `status=${r.status}`)
    r = await req('POST', '/login', { body: { phone, password: '1234' } })
    check('login درست → token', r.status === 200 && !!r.data.token)
    r = await req('GET', '/me', { token })
    check('/api/me → user', r.status === 200 && r.data.user?.id, JSON.stringify(r.data))
    r = await req('GET', '/me', { token: 'bad-token' })
    check('/api/me توکن بد → 401', r.status === 401)
  }

  section('احراز هویت (OTP)')
  {
    let r = await req('POST', '/otp/request', { body: { phone: '123' } })
    check('otp/request شماره بد → 400', r.status === 400)
    const otpPhone = '0913' + String(Math.floor(Math.random() * 9e6)).padStart(7, '0')
    r = await req('POST', '/otp/request', { body: { phone: otpPhone } })
    check('otp/request → devCode + isNewUser', r.status === 200 && r.data.devCode && r.data.isNewUser === true, JSON.stringify(r.data))
    const code = r.data.devCode
    r = await req('POST', '/otp/request', { body: { phone: otpPhone } })
    check('otp/request دوباره → 429 cooldown', r.status === 429 && r.data.retryAfter > 0, `status=${r.status}`)
    r = await req('POST', '/otp/verify', { body: { phone: otpPhone, code: code === '0000' ? '9999' : '0000' } })
    check('otp/verify کد غلط → 400', r.status === 400, `status=${r.status}`)
    r = await req('POST', '/otp/verify', { body: { phone: otpPhone, code } })
    check('otp/verify بدون نام → NAME_REQUIRED', r.status === 400 && r.data.code === 'NAME_REQUIRED', JSON.stringify(r.data))
    r = await req('POST', '/otp/verify', { body: { phone: otpPhone, code, name: 'کاربر اوتی‌پی' } })
    check('otp/verify → token (ثبت‌نام)', r.status === 200 && !!r.data.token, JSON.stringify(r.data))
    // ورود دوبارهٔ همان کاربر با OTP
    r = await req('POST', '/otp/request', { body: { phone: '۰۹۱۳' + otpPhone.slice(4) } }) // ارقام فارسی
    check('otp/request با ارقام فارسی نرمال می‌شود', r.status === 200 && !!r.data.devCode, `status=${r.status}`)
    if (r.status === 200) {
      const v = await req('POST', '/otp/verify', { body: { phone: otpPhone, code: r.data.devCode } })
      check('otp/verify ورود کاربر موجود بدون نام', v.status === 200 && !!v.data.token)
    }
  }

  // ---------- فهرست آزمون و پیول ----------
  section('فهرست آزمون‌ها و پیول')
  {
    const r = await req('GET', '/exams', { token })
    check('/api/exams → لیست غیرخالی با totalQuestions', r.status === 200 && r.data.length > 0 && r.data.every((e) => e.totalQuestions > 0))
    const bb = r.data.find((e) => e.id === 'bbm1')
    check('bbm1 trial (اولین آزمون جامع رایگان)', bb && bb.trial === true && bb.locked === false, JSON.stringify(bb && { t: bb.trial, l: bb.locked }))
    const s = r.data.find((e) => e.id === 's-bb-taghzie')
    check('s-bb-taghzie رایگان (تک‌درس)', s && s.locked === false)
  }

  // ---------- سوالات بدون جواب ----------
  section('سرو سوالات')
  {
    const r = await req('GET', '/exams/bbm1/questions', { token })
    check('questions: ۳۰ سوال', r.status === 200 && r.data.length === 30, `n=${r.data?.length} status=${r.status}`)
    check('questions: بدون answer/explanation لو رفته', r.data.every?.((q) => !('answer' in q) && !('explanation' in q)))
    check('questions: sectionId مؤثر از دروس bb', r.data.every?.((q) => q.sectionId?.startsWith('bb-') || q.sectionId?.startsWith('g-')))
    const fed = await req('GET', '/exams/fed1/questions', { token })
    check('fed1 questions سرو می‌شود', fed.status === 200 && fed.data.length > 0, `status=${fed.status}`)
  }

  // ---------- سابمیت ----------
  section('سابمیت آزمون')
  {
    // اول تک‌درس — نباید آزمون رایگان جامع را مصرف کند
    const singleExam = exams.find((e) => e.id === 's-bb-taghzie')
    const sqs = questionsForExam(singleExam)
    let r = await req('POST', `/exams/${singleExam.id}/submit`, { token, body: { answers: answersFor(sqs), timeSpent: 60, flags: [sqs[0].id, 'bogus-id'] } })
    check('submit تک‌درس → attempt با score=۱۰۰', r.status === 200 && r.data.attempt?.score === 100 && r.data.attempt?.correct === sqs.length, JSON.stringify(r.data.attempt || r.data))
    check('submit: flags غیرمعتبر فیلتر شد', r.data.attempt?.flags?.length === 1)
    check('submit: پاسخ‌ها در attempt ذخیره شد (مرور بعدی)', r.data.attempt?.answers && Object.keys(r.data.attempt.answers).length === sqs.length)
    const firstAttemptId = r.data.attempt?.id
    r = await req('GET', '/exams', { token })
    check('بعد از تک‌درس، جامع هنوز trial است', r.data.find((e) => e.id === 'bbm1')?.trial === true)

    // سابمیت همه‌درست روی آزمون تولیدی — questionIds آن در db ذخیره و پایدار است
    // (آزمون‌های ازپیش‌ساخته در هر بوت با Math.random بازسازی می‌شوند — تست جدا دارد)
    r = await req('POST', '/exams/generate', { token, body: { mode: 'comprehensive', discipline: 'bodybuilding', gender: 'men' } })
    const gen = r.data
    check('generate جامع قبل از مصرف رایگان → مجاز', r.status === 200 && gen.questionIds?.length === 30, `status=${r.status}`)
    const gqs = gen.questionIds.map((id) => questions.find((q) => q.id === id)).filter(Boolean)
    r = await req('POST', `/exams/${gen.id}/submit`, { token, body: { answers: answersFor(gqs), timeSpent: 1000 } })
    const a = r.data.attempt
    check('submit جامع → ۳۰/۳۰ صحیح', r.status === 200 && a?.correct === 30 && a?.score === 100, JSON.stringify(a))
    check('sectionStats جمعش = ۳۰ و ۶ درس', r.data.sectionStats?.length === 6 && r.data.sectionStats.reduce((s, x) => s + x.total, 0) === 30, JSON.stringify(r.data.sectionStats?.map((x) => x.total)))
    check('pointsEarned = ۳۰۰ و streak=۱', r.data.pointsEarned === 300 && r.data.streak === 1, `p=${r.data.pointsEarned} s=${r.data.streak}`)
    check('آزمون trial: پاسخ تشریحی قفل است', r.data.detail?.some((d) => d.explanationLocked) || r.data.detail?.every((d) => d.explanation === null), 'no locked explanations')

    // قفل بعدی
    r = await req('GET', '/exams/bbm2/questions', { token })
    check('آزمون جامع دوم → 402 پیول', r.status === 402 && r.data.code === 'SUBSCRIPTION_REQUIRED', `status=${r.status}`)
    r = await req('POST', '/exams/bbm2/submit', { token, body: { answers: {} } })
    check('submit آزمون قفل → 402', r.status === 402)
    r = await req('GET', '/exams/s-fit-systems/questions', { token })
    check('تک‌درس فیتنس هنوز باز است', r.status === 200, `status=${r.status}`)

    // ورودی معیوب: کلید سوال نامعتبر نباید به‌عنوان «غلط» شمرده شود
    const bb1fresh = await req('POST', '/exams/s-bb-anatomy/submit', { token, body: { answers: { 'nonexistent-q': 0 }, timeSpent: 5 } })
    const at = bb1fresh.data.attempt
    check(
      'submit با qid نامعتبر: wrong=0 و unanswered=total',
      at && at.wrong === 0 && at.unanswered === at.total,
      JSON.stringify(at && { c: at.correct, w: at.wrong, u: at.unanswered, t: at.total }),
    )

    // برای چک پایداری آزمون‌های ازپیش‌ساخته بین ری‌استارت سرور (بخش پایانی)
    preIds = (await req('GET', '/exams', { token })).data.find((e) => e.id === 'bbm1')?.questionIds

    // پاسخ همه‌غلط → score=0
    const s2 = exams.find((e) => e.id === 's-bb-physio')
    const q2 = questionsForExam(s2)
    const r2 = await req('POST', '/exams/s-bb-physio/submit', { token, body: { answers: answersFor(q2, false), timeSpent: 10 } })
    check('submit همه‌غلط → score=0', r2.status === 200 && r2.data.attempt?.score === 0 && r2.data.attempt?.wrong === q2.length, JSON.stringify(r2.data.attempt))
  }

  // ---------- آزمون‌ساز ----------
  section('آزمون‌ساز (generate)')
  let adminToken
  {
    let r = await req('POST', '/exams/generate', { token, body: { mode: 'comprehensive', discipline: 'fitness', gender: 'men' } })
    check('generate جامع بعد از مصرف رایگان → 402', r.status === 402, `status=${r.status}`)

    // subscribe فقط برای مدیر است — کاربر عادی 403 می‌گیرد
    r = await req('POST', '/subscribe', { token, body: { plan: 'monthly' } })
    check('/api/subscribe کاربر عادی → 403', r.status === 403, `status=${r.status}`)

    // اعطای اشتراک از داشبرد مدیریتی به کاربر تست
    const adm = await req('POST', '/login', { body: { phone: '1111', password: '1111' } })
    adminToken = adm.data.token
    check('لاگین ادمین', adm.status === 200 && adm.data.user?.admin === true)
    r = await req('POST', `/admin/users/${userId}/subscription`, { token: adminToken, body: { plan: 'monthly' } })
    check('admin grant subscription → فعال', r.status === 200 && r.data.user?.subscription?.until > Date.now(), JSON.stringify(r.data))
    const me = await req('GET', '/me', { token })
    check('me → اشتراک کاربر فعال شد', me.data.user?.subscription?.until > Date.now())

    for (const d of ['bodybuilding', 'fitness']) for (const g of ['men', 'women']) {
      r = await req('POST', '/exams/generate', { token, body: { mode: 'comprehensive', discipline: d, gender: g } })
      const e = r.data
      const ok = r.status === 200 && e.totalQuestions === 30 && e.sections.filter((s) => s.count === 5).length === 6
      check(`generate جامع ${d}/${g} → ۳۰=۶×۵`, ok, `status=${r.status} n=${e.totalQuestions}`)
      if (r.status === 200) {
        const qq = await req('GET', `/exams/${e.id}/questions`, { token })
        check(`  questions ${e.id}: بدون جواب، sectionId درست`, qq.status === 200 && qq.data.length === 30 && qq.data.every((q) => !('answer' in q)))
      }
    }
    r = await req('POST', '/exams/generate', { token, body: { mode: 'single', sectionId: 'fit-systems', discipline: 'fitness', gender: 'women' } })
    check('generate تک‌درس → ۵ سوال', r.status === 200 && r.data.totalQuestions === 5, `n=${r.data?.totalQuestions}`)
    r = await req('POST', '/exams/generate', { token, body: { mode: 'single', sectionId: 'fit-tech', discipline: 'fitness', gender: 'men' } })
    check('generate درس جنسیتی نامطابق → 400', r.status === 400, `status=${r.status}`)
    r = await req('POST', '/exams/generate', { token, body: { mode: 'comprehensive', discipline: 'karate', gender: 'men' } })
    check('generate رشته نامعتبر → 400', r.status === 400)
    r = await req('GET', '/exams/g-nonexistent', { token })
    check('آزمون ناموجود → 404', r.status === 404)

    // حریم خصوصی: آزمون تولیدی کاربر دیگر نباید دیده شود
    const other = await req('POST', '/exams/generate', { token, body: { mode: 'single', sectionId: 'bb-design', discipline: 'bodybuilding', gender: 'men' } })
    const reg2 = await req('POST', '/register', { body: { name: 'کاربر دیگر', phone: '0915' + String(Math.floor(Math.random() * 9e6)).padStart(7, '0'), password: '1234' } })
    r = await req('GET', `/exams/${other.data.id}`, { token: reg2.data.token })
    check('آزمون تولیدی کاربر دیگر → 404', r.status === 404, `status=${r.status}`)
  }

  // ---------- کوییز روزانه ----------
  section('کوییز روزانه')
  {
    const r = await req('GET', '/daily', { token })
    check('/api/daily → ۱۰ سوال', r.status === 200 && r.data.length === 10, `n=${r.data?.length}`)
    check('daily: از دروس bb/fit است', r.data.every?.((q) => /^(bb|fit)-/.test(q.sectionId)), JSON.stringify(r.data?.map?.((q) => q.sectionId)))
    check('daily: سوال + options + answer برای تصحیح محلی', r.data.every?.((q) => q.question && Array.isArray(q.options) && Number.isInteger(q.answer)), 'answer missing?')
  }

  // ---------- آمار و لیدربرد ----------
  section('آمار، تلاش‌ها، لیدربرد')
  {
    let r = await req('GET', '/stats', { token })
    check('/api/stats بعد از اشتراک → 200 با bySubject', r.status === 200 && Array.isArray(r.data.bySubject) && r.data.exams >= 3, JSON.stringify({ s: r.status, e: r.data.exams }))
    check('stats: trend حداکثر ۱۲ نقطه', !r.data.trend || r.data.trend.length <= 12)
    r = await req('GET', '/attempts', { token })
    check('/api/attempts → دارای examTitle', r.status === 200 && r.data.length >= 3 && r.data.every((a) => a.examTitle), `n=${r.data?.length}`)

    // مرور تلاش قبلی — پاسخ‌های ذخیره‌شده برمی‌گردد
    const attId = r.data.find((a) => a.answers && Object.keys(a.answers).length)?.id
    const det = await req('GET', `/attempts/${attId}`, { token })
    check(
      'GET /attempts/:id → detail با پاسخ‌های کاربر',
      det.status === 200 && det.data.detail?.length > 0 && det.data.detail.every((d) => 'chosen' in d && 'answer' in d) && det.data.detail.some((d) => d.chosen !== null),
      `status=${det.status}`,
    )
    for (const p of ['day', 'week', 'month', 'all']) {
      r = await req('GET', `/leaderboard?period=${p}`, { token })
      check(`/api/leaderboard?period=${p} → list+me`, r.status === 200 && Array.isArray(r.data.list) && r.data.me?.rank >= 1, `status=${r.status} me=${JSON.stringify(r.data.me)}`)
    }
  }

  // ---------- کاربر بدون اشتراک: پیول آمار ----------
  section('پیول آمار برای غیرمشترک')
  {
    const p2 = '0914' + String(Math.floor(Math.random() * 9e6)).padStart(7, '0')
    const reg = await req('POST', '/register', { body: { name: 'غیرمشترک', phone: p2, password: '1234' } })
    const t2 = reg.data.token
    const r = await req('GET', '/stats', { token: t2 })
    check('/api/stats غیرمشترک → 402', r.status === 402 && r.data.code === 'SUBSCRIPTION_REQUIRED', `status=${r.status}`)
    const r2 = await req('GET', '/attempts', { token: t2 })
    check('/api/attempts غیرمشترک → 402', r2.status === 402)
    const d = await req('GET', '/daily', { token: t2 })
    check('daily غیرمشترک → توضیح قفل', d.status === 200 && d.data.some((q) => q.explanationLocked || q.explanation === null))
  }

  // ---------- پرداخت بله ----------
  // توجه: bale.js خودش server/.env را loadEnvFile می‌کند؛ پاک‌سازی env پروسه کافی نیست
  section('پرداخت بله')
  {
    const r = await req('POST', '/payment/order', { token, body: { plan: 'monthly' } })
    if (r.status === 503) {
      check('/api/payment/order بدون پیکربندی → 503', r.data.code === 'PAYMENT_NOT_CONFIGURED')
    } else {
      check('/api/payment/order → orderId + لینک ble.ir', r.status === 200 && /^o-/.test(r.data.orderId) && /ble\.ir\/.+start=pay_/.test(r.data.payUrl || ''), `status=${r.status} ${JSON.stringify(r.data)}`)
      if (r.status === 200) {
        const st = await req('GET', `/payment/order/${r.data.orderId}`, { token })
        check('وضعیت سفارش → pending', st.status === 200 && st.data.status === 'pending', JSON.stringify(st.data))
      }
    }
    const r2 = await req('POST', '/payment/order', { token, body: { plan: 'bad-plan' } })
    check('پلن نامعتبر → 400', r2.status === 400)
    const r3 = await req('GET', '/payment/order/o-nothere', { token })
    check('سفارش ناموجود → 404', r3.status === 404)
    // وب‌هوک بدون سکرت پیکربندی‌شده همیشه بسته است — successful_payment جعلی اثر ندارد
    const wh = await req('POST', '/bale/webhook', { body: { message: { chat: { id: 1 }, successful_payment: { invoice_payload: 'o-x' } } } })
    check('وب‌هوک بدون سکرت → 403', wh.status === 403, `status=${wh.status}`)
  }

  // ---------- اعلان‌ها و نظرات (ادمین) ----------
  section('اعلان‌ها و نظرات')
  {
    const at = adminToken
    let r = await req('POST', '/announcements', { token, body: { title: 'x', body: 'y' } })
    check('POST اعلان با کاربر عادی → 403', r.status === 403, `status=${r.status}`)
    r = await req('POST', '/announcements', { token: at, body: { title: 'اعلان تستی', body: 'متن تست' } })
    check('POST اعلان با ادمین → 200', r.status === 200 && r.data.announcement?.id, JSON.stringify(r.data))
    const annId = r.data.announcement?.id
    r = await req('GET', '/announcements', { token })
    check('GET اعلان‌ها شامل اعلان جدید', r.status === 200 && r.data.list?.some((a) => a.id === annId))
    r = await req('DELETE', `/announcements/${annId}`, { token: at })
    check('DELETE اعلان → ok', r.status === 200)

    r = await req('POST', '/feedback', { token, body: { text: 'اپ خوبه', rating: 5 } })
    check('POST feedback → ok', r.status === 200 && r.data.feedback?.id)
    const fid = r.data.feedback?.id
    r = await req('POST', '/feedback', { token, body: { text: 'xy' } })
    check('feedback کوتاه → 400', r.status === 400)
    r = await req('GET', '/feedback/mine', { token })
    check('feedback/mine شامل نظر', r.status === 200 && r.data.list?.some((f) => f.id === fid))
    r = await req('GET', '/admin/feedback', { token })
    check('admin/feedback با کاربر عادی → 403', r.status === 403)
    r = await req('GET', '/admin/feedback', { token: at })
    check('admin/feedback با ادمین → 200', r.status === 200 && r.data.list?.some((f) => f.id === fid))
    r = await req('DELETE', `/admin/feedback/${fid}`, { token: at })
    check('DELETE feedback → ok', r.status === 200)

    // ---------- داشبرد مدیریتی و CRM ----------
    r = await req('GET', '/admin/overview', { token: at })
    check('/admin/overview → شمارنده‌ها', r.status === 200 && r.data.users >= 1 && 'revenueRial' in r.data && 'attempts' in r.data, JSON.stringify(r.data))
    r = await req('GET', '/admin/users', { token: at })
    check('/admin/users → لیست با subscription/points', r.status === 200 && r.data.list?.length >= 2 && r.data.list.some((u) => u.id === userId && u.subscription), `n=${r.data?.list?.length}`)
    r = await req('GET', '/admin/orders', { token: at })
    check('/admin/orders → لیست با planTitle/userName', r.status === 200 && Array.isArray(r.data.list) && (r.data.list.length === 0 || 'planTitle' in r.data.list[0]))
    r = await req('GET', '/admin/users', { token })
    check('/admin/users کاربر عادی → 403', r.status === 403)

    // ---------- CRM ----------
    r = await req('GET', `/admin/users/${userId}`, { token: at })
    check('/admin/users/:id → نمای ۳۶۰° با stats/attempts', r.status === 200 && r.data.stats && Array.isArray(r.data.attempts) && 'orders' in r.data, `status=${r.status}`)
    r = await req('POST', `/admin/users/${userId}/note`, { token: at, body: { note: 'یادداشت تست CRM' } })
    check('note ذخیره شد', r.status === 200 && r.data.note === 'یادداشت تست CRM')
    const ud = await req('GET', `/admin/users/${userId}`, { token: at })
    check('note در جزئیات کاربر برمی‌گردد', ud.data.user?.note === 'یادداشت تست CRM')
    r = await req('PATCH', `/admin/users/${userId}`, { token: at, body: { name: 'تست فلو ۲' } })
    check('PATCH user → نام تغییر کرد', r.status === 200 && r.data.user?.name === 'تست فلو ۲')
    r = await req('PATCH', `/admin/users/${userId}`, { token: at, body: { phone: '1111' } })
    check('PATCH phone نامعتبر → 400', r.status === 400)
    r = await req('GET', '/admin/metrics', { token: at })
    check('/admin/metrics → funnel + سری ۳۰ روزه', r.status === 200 && r.data.funnel && r.data.signups?.length === 30, `status=${r.status}`)
    const csv = await fetch(`${BASE}/admin/export/users.csv`, { headers: { authorization: `Bearer ${at}` } })
    check('export users.csv → 200 CSV', csv.status === 200 && (csv.headers.get('content-type') || '').includes('text/csv'))
    const csvBody = await csv.text()
    check('CSV شامل ردیف کاربر تست', csvBody.includes('تست فلو'))
    // لغو سفارش معلق از پنل
    const ord = await req('POST', '/payment/order', { token, body: { plan: 'yearly' } })
    if (ord.status === 200 && ord.data.orderId) {
      const oc = await req('PATCH', `/admin/orders/${ord.data.orderId}`, { token: at, body: { status: 'canceled' } })
      check('PATCH order → canceled', oc.status === 200 && oc.data.order?.status === 'canceled')
    }
    // ثبت‌نام با شماره نامعتبر/ادمینی ممنوع است
    r = await req('POST', '/register', { body: { name: 'x', phone: '1111', password: '9999' } })
    check('register با ۱۱۱۱ → 400 (ارتقای دسترسی مسدود)', r.status === 400, `status=${r.status}`)
    r = await req('POST', '/register', { body: { name: 'x', phone: '0912', password: '9999' } })
    check('register شماره ناقص → 400', r.status === 400)
    // حذف اشتراک کاربر تست برای تمیزکاری مرحلهٔ بعد
    r = await req('DELETE', `/admin/users/${userId}/subscription`, { token: at })
    check('admin revoke subscription → ok', r.status === 200 && r.data.user?.subscription === null, JSON.stringify(r.data.user?.subscription))
    // برگرداندن اشتراک برای تست‌های پایانی
    await req('POST', `/admin/users/${userId}/subscription`, { token: at, body: { plan: 'monthly' } })
    // ابطال نشست‌ها — توکن کاربر تست بعد از این دیگر کار نمی‌کند؛ دوباره لاگین می‌کنیم
    const rv = await req('POST', `/admin/users/${userId}/revoke-sessions`, { token: at })
    check('revoke-sessions → ok', rv.status === 200)
    const me2 = await req('GET', '/me', { token })
    check('توکن باطل‌شده → 401', me2.status === 401)
    const relog = await req('POST', '/login', { body: { phone, password: '1234' } })
    token = relog.data.token
    check('لاگین مجدد کاربر تست', relog.status === 200 && !!token)
  }

  // ---------- پایداری آزمون‌های ازپیش‌ساخته بین ری‌استارت ----------
  section('پایداری آزمون‌ها بین ری‌استارت سرور')
  {
    srv.kill('SIGKILL')
    await new Promise((r) => setTimeout(r, 400))
    const up = await startServer()
    check('سرور دوباره بالا آمد', up)
    const after = (await req('GET', '/exams', { token })).data.find((e) => e.id === 'bbm1')?.questionIds
    check(
      'bbm1 بعد از ری‌استارت همان سوالات را دارد',
      up && JSON.stringify(preIds) === JSON.stringify(after),
      `قبل: ${preIds?.slice(0, 3)} — بعد: ${after?.slice(0, 3)}`,
    )
  }

  // ---------- خروج ----------
  section('خروج')
  {
    let r = await req('POST', '/logout', { token })
    check('logout → ok', r.status === 200)
    r = await req('GET', '/me', { token })
    check('me بعد از logout → 401', r.status === 401)
  }
} catch (e) {
  results.push({ name: 'اجرای اسکریپت', ok: false, extra: e.stack || String(e) })
} finally {
  restore()
}

// ---------- گزارش ----------
let fails = 0
for (const r of results) {
  if (r.header) { console.log(`\n■ ${r.header}`); continue }
  if (!r.ok) fails++
  console.log(` ${r.ok ? '✓' : '✗ FAIL'} ${r.name}${r.extra ? `  →  ${r.extra}` : ''}`)
}
console.log(`\n${'='.repeat(50)}\n${results.filter((r) => r.ok).length} موفق / ${fails} ناموفق`)
process.exit(fails ? 1 : 0)
