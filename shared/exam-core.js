// منطق مشترک آزمون فدراسیون — بدون وابستگی به Node؛
// هم در سرور (server/questions.js) و هم در بک‌اند دموی کلاینت استفاده می‌شود.
export function createExamModel(bank) {
  const faNum = (n) => Number(n).toLocaleString('fa-IR')
  const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5)

  // RNG قطعی (mulberry32) — آزمون‌های ازپیش‌ساخته باید بین ری‌استارت سرور و
  // بین بک‌اند واقعی/دمو ثابت بمانند تا نتیجه و سوابق کاربر معتبر بماند
  const mulberry32 = (seed) => () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const seededShuffle = (arr, rng) => [...arr].sort(() => rng() - 0.5)
  const EXAM_SEED = 0x4f4c5958 // 'OLYX'

  // ---------- رشته‌های آزمون فدراسیون ----------
  // فعلاً فقط آزمون کتبی تخصصی درجه ۳: بدنسازی و فیتنس
  const sectionGroups = [
    { id: 'bodybuilding', title: 'بدنسازی', subtitle: 'آزمون کتبی تخصصی درجه ۳' },
    { id: 'fitness', title: 'فیتنس', subtitle: 'آزمون کتبی تخصصی درجه ۳' },
  ]

  // ---------- درس‌های آزمون فدراسیون (۲۹ آیتم) ----------
  const sections = [
    // تئوری عمومی — ۱۵ آیتم (مشترک بدنسازی و فیتنس)
    { id: 'g-mabani', group: 'general', title: 'اصول و مبانی تربیت بدنی', icon: 'landmark', color: 'indigo' },
    { id: 'g-tahlil', group: 'general', title: 'تجزیه و تحلیل مهارت‌ها', icon: 'scan', color: 'sky' },
    { id: 'g-roshd', group: 'general', title: 'رشد و تکامل حرکتی', icon: 'sprout', color: 'emerald' },
    { id: 'g-anatomy', group: 'general', title: 'آناتومی انسان', icon: 'bone', color: 'rose' },
    { id: 'g-physio', group: 'general', title: 'فیزیولوژی انسان', icon: 'activity', color: 'sky' },
    { id: 'g-akhlaq', group: 'general', title: 'اخلاق مربیگری ورزشی', icon: 'shield', color: 'violet' },
    { id: 'g-ravan', group: 'general', title: 'روان‌شناسی ورزشی', icon: 'brain', color: 'pink' },
    { id: 'g-estehdadyabi', group: 'general', title: 'مبانی استعدادیابی ورزشی', icon: 'star', color: 'amber' },
    { id: 'g-amadegi', group: 'general', title: 'اصول و مبانی آمادگی جسمانی', icon: 'gauge', color: 'lime' },
    { id: 'g-barnamerizi', group: 'general', title: 'برنامه‌ریزی و طراحی تمرین', icon: 'clipboard', color: 'amber' },
    { id: 'g-komak', group: 'general', title: 'کمک‌های اولیه', icon: 'cross', color: 'red' },
    { id: 'g-asibshenasi', group: 'general', title: 'آسیب‌شناسی و ایمنی', icon: 'alert', color: 'orange' },
    { id: 'g-taghzie', group: 'general', title: 'تغذیه', icon: 'apple', color: 'emerald' },
    { id: 'g-naqsh', group: 'general', title: 'نقش مربی', icon: 'users', color: 'slate' },
    { id: 'g-hoquq', group: 'general', title: 'حقوق ورزشی', icon: 'scale', color: 'teal' },
    // تخصصی بدنسازی — ۵ درس مشترک + درس جنسیتی (داوری: آقایان / فنی تخصصی: بانوان)
    // ترتیب بلوک‌ها مطابق برگهٔ واقعی آزمون فدراسیون
    { id: 'bb-taghzie', group: 'bodybuilding', title: 'تغذیه و مکمل‌های غذایی', icon: 'apple', color: 'emerald' },
    { id: 'bb-anatomy', group: 'bodybuilding', title: 'آناتومی وزنه‌تمرینی', icon: 'bone', color: 'rose' },
    { id: 'bb-physio', group: 'bodybuilding', title: 'فیزیولوژی', icon: 'activity', color: 'sky' },
    { id: 'bb-systems', group: 'bodybuilding', title: 'سیستم‌های تمرین در بدنسازی', icon: 'repeat', color: 'violet' },
    { id: 'bb-design', group: 'bodybuilding', title: 'طراحی تمرین', icon: 'clipboard', color: 'amber' },
    { id: 'bb-davari', group: 'bodybuilding', gender: 'men', title: 'داوری', icon: 'flag', color: 'slate' },
    { id: 'bb-tech', group: 'bodybuilding', gender: 'women', title: 'فنی تخصصی (تکنیک صحیح حرکات)', icon: 'dumbbell', color: 'rose' },
    // تخصصی فیتنس — ۵ درس مشترک + درس جنسیتی (داوری: آقایان / فنی تخصصی: بانوان)
    { id: 'fit-taghzie', group: 'fitness', title: 'مبانی تغذیه و مکمل‌های ورزشی', icon: 'apple', color: 'emerald' },
    { id: 'fit-anatomy', group: 'fitness', title: 'آناتومی کاربردی', icon: 'bone', color: 'rose' },
    { id: 'fit-physio', group: 'fitness', title: 'فیزیولوژی ورزشی', icon: 'activity', color: 'sky' },
    { id: 'fit-systems', group: 'fitness', title: 'آموزش سیستم‌ها (سیستم‌های تمرینی)', icon: 'repeat', color: 'violet' },
    { id: 'fit-design', group: 'fitness', title: 'طراحی تمرین', icon: 'clipboard', color: 'amber' },
    { id: 'fit-davari', group: 'fitness', gender: 'men', title: 'داوری', icon: 'flag', color: 'slate' },
    { id: 'fit-tech', group: 'fitness', gender: 'women', title: 'فنی تخصصی (تکنیک صحیح حرکات)', icon: 'dumbbell', color: 'rose' },
  ]

  const GENDERS = { men: 'آقایان', women: 'بانوان' }
  const BB = sections.filter((s) => s.group === 'bodybuilding')
  const FIT = sections.filter((s) => s.group === 'fitness')

  // درس‌های هر آزمون درجه ۳: ۵ درس مشترک + درس جنسیتی (داوری آقایان / فنی تخصصی بانوان)
  // تئوری عمومی در آزمون تخصصی نقش ندارد
  const sectionsFor = (discipline, gender = 'men') => {
    const all = discipline === 'fitness' ? FIT : discipline === 'bodybuilding' ? BB : []
    return all.filter((s) => !s.gender || s.gender === gender)
  }

  const specializedSectionsFor = sectionsFor

  // ---------- بانک سوالات ----------
  // هر سوال می‌تواند به چند درس خدمت کند (محتوای مشترک عمومی/بدنسازی/فیتنس)؛
  // sectionId = درس اصلی (اولین درس) برای نمایش و آمار.
  const questions = bank.map((b, i) => {
    const topicIds = Array.isArray(b.topics) && b.topics.length ? b.topics : ['g-anatomy']
    return {
      id: `q${i + 1}`,
      sectionId: topicIds[0],
      topicIds,
      question: b.q,
      options: b.options,
      answer: b.answer,
      explanation: b.explanation,
      ...(b.fed ? { fed: b.fed } : {}),
    }
  })

  const byId = new Map(questions.map((q) => [q.id, q]))
  const pool = (sid) => questions.filter((q) => q.topicIds.includes(sid) && !q.fed)

  // نمونه‌گیری به قالب برگهٔ آزمون فدراسیون: سهم مساوی از هر درس و چینش بلوکی
  // به ترتیب درس‌ها؛ سوالات مشترک بین درس‌ها فقط یک‌بار می‌آیند (بدون تکرار)
  const sampleBlocked = (secs, total) => {
    const avail = secs.filter((s) => pool(s.id).length > 0)
    const per = Math.floor(total / avail.length)
    const rem = total - per * avail.length
    const seen = new Set()
    const blocks = avail.map((s, i) => {
      const want = per + (i < rem ? 1 : 0)
      const shuffled = shuffle(pool(s.id))
      const items = []
      for (const q of shuffled) {
        if (items.length >= want) break
        if (!seen.has(q.id)) {
          seen.add(q.id)
          items.push(q.id)
        }
      }
      return { shuffled, items }
    })
    // اگر درسی سوال کم آورد، از سوالات باقی‌ماندهٔ همان بلوک‌ها جبران می‌کنیم
    let have = blocks.reduce((n, b) => n + b.items.length, 0)
    for (const b of blocks) {
      for (const q of b.shuffled) {
        if (have >= total) break
        if (!seen.has(q.id)) {
          seen.add(q.id)
          b.items.push(q.id)
          have++
        }
      }
    }
    return blocks.flatMap((b) => b.items)
  }

  // ---------- تعریف آزمون‌ها ----------
  const exams = []
  const PER_LESSON_Q = 5 // ۵ سوال به‌ازای هر درس (۶ درس = ۳۰ سوال)
  const slotSection = new Map() // آزمون ← (سوال ← درسی که سوال در بلوک آن قرار گرفته)

  const buildMockExams = (discipline) => {
    const rng = mulberry32(EXAM_SEED + (discipline === 'fitness' ? 1 : 0))
    const used = new Set()
    const takeSlots = (secs) => {
      const taken = new Set()
      const slots = []
      for (const s of secs) {
        const picks = seededShuffle(pool(s.id), rng).filter((q) => !used.has(q.id) && !taken.has(q.id)).slice(0, PER_LESSON_Q)
        if (picks.length < PER_LESSON_Q) return null
        for (const q of picks) {
          taken.add(q.id)
          slots.push([q.id, s.id])
        }
      }
      taken.forEach((id) => used.add(id))
      return slots
    }
    const built = Object.fromEntries(Object.keys(GENDERS).map((g) => [g, []]))
    let open = Object.keys(GENDERS)
    while (open.length) {
      open = open.filter((gender) => {
        const slots = takeSlots(sectionsFor(discipline, gender))
        if (slots) built[gender].push(slots)
        return Boolean(slots)
      })
    }
    return built
  }

  // ---------- آزمون‌های جامع درجه ۳ (بدنسازی / فیتنس × آقایان / بانوان) ----------
  for (const g of sectionGroups) {
    const built = buildMockExams(g.id)
    for (const gender of Object.keys(GENDERS)) {
      built[gender].forEach((slots, i) => {
        const id = `${g.id === 'bodybuilding' ? 'bb' : 'fit'}${gender === 'men' ? 'm' : 'w'}${i + 1}`
        const list = slots.map(([qid]) => qid)
        slotSection.set(id, new Map(slots))
        exams.push({
          id,
          type: 'comprehensive',
          discipline: g.id,
          gender,
          series: i + 1,
          title: `آزمون جامع ${g.title} ${GENDERS[gender]} — سری ${faNum(i + 1)}`,
          description: `${faNum(list.length)} سوال از دروس تخصصی ${g.title} (${faNum(PER_LESSON_Q)} سوال از هر درس) — قالب آزمون کتبی درجه ۳ فدراسیون`,
          timeMinutes: Math.round(list.length * 1.1),
          questionIds: list,
        })
      })
    }
  }

  // آزمون آزمایشی فدراسیون — سوالات واقعی ادوار گذشته
  const fedQuestions = questions.filter((q) => q.fed)
  if (fedQuestions.length) {
    exams.push({
      id: 'fed1',
      type: 'federation',
      title: 'آزمون آزمایشی فدراسیون',
      description: `${faNum(fedQuestions.length)} سوال واقعی ادوار گذشته آزمون تئوری مربیگری`,
      timeMinutes: Math.round(fedQuestions.length * 1.1),
      questionIds: fedQuestions.map((q) => q.id),
    })
  }

  // آزمون‌های تک‌درس — کل سوالات هر درس تخصصی
  for (const s of [...BB, ...FIT]) {
    const n = pool(s.id).length
    if (!n) continue
    exams.push({
      id: `s-${s.id}`,
      type: 'single',
      sectionId: s.id,
      title: `آزمون ${s.title}`,
      description: `${faNum(n)} سوال کامل درس ${s.title}`,
      timeMinutes: Math.max(10, Math.round(n * 0.8)),
    })
  }

  // ---------- انتخاب سوالات ----------
  const questionsForExam = (exam) => {
    if (exam.questionIds) return exam.questionIds.map((id) => byId.get(id)).filter(Boolean)
    if (exam.type === 'federation') return questions.filter((q) => q.fed)
    if (exam.type === 'single') return pool(exam.sectionId)
    return []
  }

  // آزمون تصادفی به قالب درجه ۳ فدراسیون: تک‌درس = ۵ سوال،
  // جامع = ۶ درس × ۵ سوال = ۳۰ سوال بلوکی (درس ششم بسته به جنسیت: داوری/فنی تخصصی)
  const generateExamQuestions = (mode, sectionId, discipline, gender = 'men') => {
    if (mode === 'single') return shuffle(pool(sectionId)).slice(0, PER_LESSON_Q).map((q) => q.id)
    const secs = sectionsFor(discipline, gender)
    return sampleBlocked(secs, secs.length * PER_LESSON_Q)
  }

  // ---------- درسِ مؤثر و شکل‌دهی آزمون ----------
  const isSingleExam = (exam) =>
    exam.type === 'single' || (exam.type === 'generated' && exam.mode === 'single')

  // گروه آزمون: discipline برای آزمون‌های جامع/تولیدی درجه ۳
  const examGroup = (exam) =>
    ['bodybuilding', 'fitness'].includes(exam.discipline) ? exam.discipline : null

  // درسِ مؤثر هر سوال در یک آزمون: در آزمون تک‌درس همان درس؛ در آزمون‌های
  // رشته‌ای، درسِ همان گروه از بین درس‌های سوال (محتوای مشترک بین درس‌ها)
  const effectiveSectionId = (exam, q) => {
    if (isSingleExam(exam)) return exam.sectionId
    const slot = slotSection.get(exam.id)?.get(q.id)
    if (slot) return slot
    const group = examGroup(exam)
    if (group) {
      const t = q.topicIds.find((tid) => sections.some((s) => s.id === tid && s.group === group))
      if (t) return t
    }
    return q.sectionId
  }

  const shapeExam = (exam, eqs) => ({
    ...exam,
    sections: sections.map((sec) => ({
      ...sec,
      count: eqs.filter((q) => effectiveSectionId(exam, q) === sec.id).length,
    })),
    totalQuestions: eqs.length,
  })

  return {
    sectionGroups, sections, sectionsFor, specializedSectionsFor, GENDERS, questions, exams,
    questionsForExam, generateExamQuestions,
    isSingleExam, examGroup, effectiveSectionId, shapeExam,
  }
}
