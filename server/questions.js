import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createExamModel } from '../shared/exam-core.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const bank = JSON.parse(fs.readFileSync(path.join(__dirname, 'bank.json'), 'utf8'))

// bank.json را اسکریپت scripts/build-bank.py از منابع سوالات می‌سازد.
// منطق آزمون در shared/exam-core.js است تا در بک‌اند دموی کلاینت هم استفاده شود.
const model = createExamModel(bank)

export const sectionGroups = model.sectionGroups
export const sections = model.sections
export const sectionsFor = model.sectionsFor
export const specializedSectionsFor = model.specializedSectionsFor
export const questions = model.questions
export const exams = model.exams
export const questionsForExam = model.questionsForExam
export const generateExamQuestions = model.generateExamQuestions
export const generateExamSlots = model.generateExamSlots
export const isSingleExam = model.isSingleExam
export const examGroup = model.examGroup
export const effectiveSectionId = model.effectiveSectionId
export const shapeExam = model.shapeExam
