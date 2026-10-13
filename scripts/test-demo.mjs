// تست headless بک‌اند دمو — شبیه‌سازی localStorage و اجرای کل جریان
const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
}

const { demoApi } = await import('../client/src/lib/demo.js')

const assert = (cond, msg) => {
  if (!cond) { console.error('FAIL:', msg); process.exit(1) }
  console.log('PASS:', msg)
}

// 1. OTP flow
const otp = await demoApi('/otp/request', { method: 'POST', body: { phone: '09121112233' } })
assert(otp.devCode && otp.isNewUser, `otp/request → devCode=${otp.devCode}, isNewUser=${otp.isNewUser}`)

const v = await demoApi('/otp/verify', { method: 'POST', body: { phone: '09121112233', code: otp.devCode, name: 'کاربر دمو' } })
assert(v.token && v.user?.name === 'کاربر دمو', 'otp/verify → token + user')
store.set('azmoon_token', v.token)

// 2. me
const me = await demoApi('/me')
assert(me.user.phone === '09121112233', 'me → user')

// 3. exams list — درجه ۳: جامع بدنسازی/فیتنس (تعداد سری‌ها به shuffle بانک بستگی دارد) + فدراسیون + تک‌درس تخصصی
const exams = await demoApi('/exams')
const comps = exams.filter((e) => e.type === 'comprehensive')
assert(comps.length >= 40 && exams.some((e) => e.id === 'fed1'), `exams → ${comps.length} جامع + فدراسیون`)
assert(exams.filter((e) => e.type === 'single').length === 14, 'singles → ۱۴ آزمون تک‌درس')
const bbm1 = exams.find((e) => e.id === 'bbm1')
const bbm2 = comps.find((e) => e.id !== 'bbm1')
const bbw1 = exams.find((e) => e.id === 'bbw1')
assert(bbm1 && bbm2 && bbw1, 'آزمون‌های جامع سری ۱ موجودند')
assert(bbm1.totalQuestions === 30, `bbm1 → ${bbm1.totalQuestions}q`)
assert(bbm1.sections.every((s) => s.count === 0 || s.group === 'bodybuilding'), 'bbm1 → فقط دروس تخصصی بدنسازی')
assert(bbm1.sections.filter((s) => s.count > 0).length === 6, 'bbm1 → ۶ بلوک درسی')
// درس جنسیتی: داوری فقط آقایان، فنی تخصصی فقط بانوان
assert(bbm1.sections.find((s) => s.id === 'bb-davari').count > 0, 'bbm1 → شامل داوری')
assert(bbm1.sections.find((s) => s.id === 'bb-tech').count === 0, 'bbm1 → بدون فنی تخصصی')
assert(bbw1.sections.find((s) => s.id === 'bb-tech').count > 0, 'bbw1 → شامل فنی تخصصی')
assert(bbw1.sections.find((s) => s.id === 'bb-davari').count === 0, 'bbw1 → بدون داوری')
assert(exams.every((e) => e.type !== 'single' || e.sectionId.startsWith('bb-') || e.sectionId.startsWith('fit-')), 'singles → فقط دروس تخصصی')
// پیول: قبل از اولین آزمون جامع، همهٔ جامع‌ها با اعتبار آزمون رایگان بازند
assert(bbm2.trial === true && bbm2.locked === false, 'bbm2 → آزمون رایگان (trial)')
assert(exams.find((e) => e.id === 's-bb-anatomy').trial === false, 'تک‌درس → همیشه رایگان (بدون trial)')

// 4. exam questions (no answers leaked) + ترتیب بلوکی برگهٔ فدراسیون
const qs = await demoApi('/exams/bbm1/questions')
assert(qs.length === bbm1.totalQuestions && !('answer' in qs[0]) && !('explanation' in qs[0]), `bbm1 questions → ${qs.length}, answers stripped`)
assert(new Set(qs.map((q) => q.id)).size === qs.length, 'bbm1 → بدون سوال تکراری')
const lessonOrder = ['bb-taghzie', 'bb-anatomy', 'bb-physio', 'bb-systems', 'bb-design', 'bb-davari']
const blocked = lessonOrder.every((sid, i) =>
  qs.slice(i * 5, i * 5 + 5).every((q) => q.topicIds.includes(sid)))
assert(blocked, 'bbm1 → سوالات بلوکی به ترتیب درس‌ها (۵ سوال از هر درس)')

// 5. generate single + comprehensive (فقط تخصصی درجه ۳، با جنسیت)
const single = await demoApi('/exams/generate', { method: 'POST', body: { mode: 'single', sectionId: 'bb-anatomy', discipline: 'bodybuilding', gender: 'men' } })
assert(single.totalQuestions === 5, `generate single bb-anatomy → ${single.totalQuestions}q`)
const comp = await demoApi('/exams/generate', { method: 'POST', body: { mode: 'comprehensive', discipline: 'fitness', gender: 'women' } })
assert(comp.totalQuestions === 30, `generate comprehensive fitness بانوان → ${comp.totalQuestions}q`)
assert(comp.sections.find((s) => s.id === 'fit-tech').count > 0, 'fitness بانوان → شامل فنی تخصصی')
assert(comp.sections.find((s) => s.id === 'fit-davari').count === 0, 'fitness بانوان → بدون داوری')

// 5b. آزمون کتبی تخصصی — سوالات فقط از سرفصل‌های همان رشته و جنسیت
const writtenBB = await demoApi('/exams/generate', { method: 'POST', body: { mode: 'comprehensive', discipline: 'bodybuilding', gender: 'men' } })
assert(writtenBB.title === 'آزمون کتبی تخصصی بدنسازی آقایان' && writtenBB.totalQuestions === 30, `written BB → ${writtenBB.title} ${writtenBB.totalQuestions}q`)
assert(writtenBB.sections.every((s) => s.count === 0 || s.group === 'bodybuilding'), 'written BB → فقط دروس تخصصی بدنسازی')
assert(writtenBB.sections.find((s) => s.id === 'bb-davari').count > 0, 'written BB آقایان → شامل داوری')
let scopeErr = false
try { await demoApi('/exams/generate', { method: 'POST', body: { mode: 'comprehensive', discipline: 'general', gender: 'men' } }) } catch { scopeErr = true }
assert(scopeErr, 'discipline general → خطا')
let noGender = false
try { await demoApi('/exams/generate', { method: 'POST', body: { mode: 'comprehensive', discipline: 'bodybuilding' } }) } catch { noGender = true }
assert(noGender, 'بدون جنسیت → خطا')
let wrongSec = false
try { await demoApi('/exams/generate', { method: 'POST', body: { mode: 'single', sectionId: 'fit-tech', discipline: 'bodybuilding', gender: 'men' } }) } catch { wrongSec = true }
assert(wrongSec, 'single با درس رشته دیگر → خطا')
let wrongGenderSec = false
try { await demoApi('/exams/generate', { method: 'POST', body: { mode: 'single', sectionId: 'bb-davari', discipline: 'bodybuilding', gender: 'women' } }) } catch { wrongGenderSec = true }
assert(wrongGenderSec, 'داوری برای بانوان → خطا')

// 6. submit — answer all correctly
const gqs = await demoApi('/exams/bbm1/questions')
const answers = {}
for (const q of gqs) answers[q.id] = 0 // some right, some wrong — just exercise the path
const sub = await demoApi('/exams/bbm1/submit', { method: 'POST', body: { answers, timeSpent: 300, flags: [] } })
assert(sub.attempt.total === bbm1.totalQuestions && Array.isArray(sub.sectionStats) && sub.sectionStats.length > 0, `submit → total=${sub.attempt.total}, sectionStats=${sub.sectionStats.length}`)
assert(sub.pointsEarned === sub.attempt.correct * 10, `points=${sub.pointsEarned}, streak=${sub.streak}`)
// آزمون رایگان: پاسخ تشریحی قفل و ارسال نمی‌شود (پاسخ صحیح دیده می‌شود)
assert(sub.detail.every((d) => d.explanation === null && d.explanationLocked === true && typeof d.answer === 'number'), 'trial → پاسخ تشریحی قفل')

// 6b. آزمون رایگان مصرف شد — بقیهٔ جامع‌ها و آزمون‌ساز قفل، تک‌درس‌ها رایگان
const examsAfter = await demoApi('/exams')
assert(examsAfter.find((e) => e.id === 'bbm2').locked === true, 'پس از آزمون رایگان → bbm2 قفل')
assert(examsAfter.find((e) => e.id === 's-bb-anatomy').locked === false, 'تک‌درس → همچنان رایگان')
let qErr = false
try { await demoApi('/exams/bbm2/questions') } catch (e) { qErr = e.code === 'SUBSCRIPTION_REQUIRED' }
assert(qErr, 'سوالات آزمون قفل → SUBSCRIPTION_REQUIRED')
let genErr = false
try { await demoApi('/exams/generate', { method: 'POST', body: { mode: 'comprehensive', discipline: 'bodybuilding', gender: 'men' } }) } catch (e) { genErr = e.code === 'SUBSCRIPTION_REQUIRED' }
assert(genErr, 'آزمون‌ساز پس از آزمون رایگان → SUBSCRIPTION_REQUIRED')
const meAfter = await demoApi('/me')
assert(meAfter.user.freeExamUsed === true, '/me → freeExamUsed=true پس از آزمون جامع')

// 6c. آمار و سوابق ویژه مشترکین است
let statsErr = false
try { await demoApi('/stats') } catch (e) { statsErr = e.code === 'SUBSCRIPTION_REQUIRED' }
assert(statsErr, 'stats قبل از اشتراک → SUBSCRIPTION_REQUIRED')
let attErr = false
try { await demoApi('/attempts') } catch (e) { attErr = e.code === 'SUBSCRIPTION_REQUIRED' }
assert(attErr, 'attempts قبل از اشتراک → SUBSCRIPTION_REQUIRED')
const dailyFree = await demoApi('/daily')
assert(dailyFree.every((q) => q.explanation === null && q.explanationLocked === true), 'daily قبل از اشتراک → تشریحی قفل')
// /subscribe فقط برای ادمین است — مسیر واقعی کاربر = سفارش پرداخت (در دمو بلافاصله فعال می‌شود)
const ord = await demoApi('/payment/order', { method: 'POST', body: { plan: 'monthly' } })
assert(ord.orderId && ord.status === 'paid', 'payment/order → سفارش paid')

// 7. stats + attempts + leaderboard + daily
const st = await demoApi('/stats')
assert(st.exams === 1 && st.bySubject.length > 0, `stats → exams=${st.exams}, bySubject=${st.bySubject.length}`)
const at = await demoApi('/attempts')
assert(at.length === 1 && at[0].examTitle, 'attempts → 1 with examTitle')
const lb = await demoApi('/leaderboard?period=all')
assert(lb.list.length >= 1, `leaderboard → ${lb.list.length} rows`)
assert(lb.list.some((r) => r.userId.startsWith('fake-')), 'leaderboard → کاربران فیک حاضرند')
assert(!lb.list.some((r) => /^(t|test|admin|تست|ادمین|کاربر)$/i.test(r.name)), 'leaderboard → بدون نام تستی')
assert(lb.me && lb.me.userId === me.user.id, 'leaderboard → رتبه کاربر جاری محاسبه می‌شود')
const lbDay = await demoApi('/leaderboard?period=day')
assert(lbDay.list.length >= 1, `leaderboard روزانه → ${lbDay.list.length} rows`)
const daily = await demoApi('/daily')
assert(daily.length === 10 && daily[0].sectionTitle, `daily → ${daily.length} questions`)
assert(daily.every((q) => q.sectionId.startsWith('bb-') || q.sectionId.startsWith('fit-')), 'daily → فقط دروس تخصصی بدنسازی/فیتنس')
assert(daily.every((q) => q.explanation && !q.explanationLocked), 'daily بعد از اشتراک → تشریحی باز')

// 8. announcements + feedback + admin
await demoApi('/feedback', { method: 'POST', body: { rating: 5, text: 'عالی بود' } })
const mine = await demoApi('/feedback/mine')
assert(mine.list.length === 1, 'feedback/mine → 1')
const ann = await demoApi('/announcements')
assert(ann.list.length === 0, 'announcements → empty (non-admin)')
// admin flow
store.set('azmoon_token', null)
const adm = await demoApi('/login', { method: 'POST', body: { phone: '1111', password: '1111' } })
assert(adm.user.admin === true, 'admin login 1111/1111')
store.set('azmoon_token', adm.token)
await demoApi('/announcements', { method: 'POST', body: { title: 'خوش آمدید', body: 'نسخه دمو فعال است' } })
const ann2 = await demoApi('/announcements')
assert(ann2.list.length === 1, 'admin announcement posted')

// 9. auth guard
store.set('azmoon_token', 'bad-token')
let threw = false
try { await demoApi('/stats') } catch { threw = true }
assert(threw, 'invalid token rejected')

console.log('\nALL DEMO TESTS PASSED')
