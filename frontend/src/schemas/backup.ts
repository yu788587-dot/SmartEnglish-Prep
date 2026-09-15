import { z } from 'zod'

/** 备份文件与各表记录的 Zod Schema(执行计划 6.2)。导入必须"先校验、后写入"。 */

export const SCHEMA_VERSION = 2

/** 可导入的备份版本。v2 起 notes 带音标/释义/SRS/墓碑;旧版归档仍须可读。 */
export const SUPPORTED_SCHEMA_VERSIONS = [1, SCHEMA_VERSION] as const
export const APP_ID = 'SmartEnglish-Prep'

const iso = z.string().min(1)
const idField = z.string().min(1)

export const passageSchema = z.object({
  id: idField,
  title: z.string(),
  module: z.string(),
  level: z.string(),
  contentMd: z.string(),
  source: z.string().nullish(),
  createdAt: iso,
})

export const questionSchema = z.object({
  id: idField,
  passageId: idField,
  type: z.string(),
  stem: z.string(),
  options: z.unknown(),
  answer: z.string(),
  explanation: z.string().nullish(),
  order: z.number(),
})

export const topicSchema = z.object({
  id: idField,
  examType: z.string(),
  prompt: z.string(),
  category: z.string().nullish(),
})

export const essaySchema = z.object({
  id: idField,
  userId: idField,
  topicId: z.string().nullish(),
  prompt: z.string().nullish(),
  content: z.string(),
  wordCount: z.number(),
  createdAt: iso,
  updatedAt: iso,
})

export const essayReviewSchema = z.object({
  id: idField,
  essayId: idField,
  model: z.string(),
  scores: z.unknown(),
  overall: z.number(),
  feedback: z.unknown(),
  summary: z.string().nullish(),
  createdAt: iso,
})

export const practiceRecordSchema = z.object({
  id: idField,
  userId: idField,
  questionId: idField,
  passageId: idField,
  module: z.string(),
  attemptId: z.string(),
  userAnswer: z.unknown(),
  isCorrect: z.boolean(),
  durationS: z.number(),
  createdAt: iso,
})

export const wrongQuestionSchema = z.object({
  id: idField,
  userId: idField,
  recordId: idField,
  questionId: idField,
  reviewCount: z.number(),
  nextReviewAt: z.string().nullish(),
  resolved: z.boolean(),
})

export const translationExerciseSchema = z.object({
  id: idField,
  userId: idField,
  sourceText: z.string(),
  refTranslation: z.string().nullish(),
  userTranslation: z.string(),
  aiFeedback: z.unknown().nullish(),
  createdAt: iso,
})

export const noteSchema = z.object({
  id: idField,
  userId: idField,
  word: z.string(),
  /** M9 起新增;v1 备份中没有这些键,故一律 nullish */
  phonetic: z.string().nullish(),
  meaning: z.string().nullish(),
  pos: z.string().nullish(),
  example: z.string().nullish(),
  exampleZh: z.string().nullish(),
  context: z.string().nullish(),
  aiExplanation: z.unknown().nullish(),
  tags: z.array(z.string()).nullish(),
  source: z.string().nullish(),
  starred: z.boolean().nullish(),
  mastery: z.number().nullish(),
  reviewCount: z.number().nullish(),
  lastReviewedAt: z.string().nullish(),
  nextReviewAt: z.string().nullish(),
  dictationWrong: z.number().nullish(),
  createdAt: iso,
  updatedAt: z.string().nullish(),
  deletedAt: z.string().nullish(),
})

export const dictationRecordSchema = z.object({
  id: idField,
  userId: idField,
  noteId: idField,
  attemptId: idField,
  userAnswer: z.string(),
  isCorrect: z.boolean(),
  createdAt: iso,
})

export const studySessionSchema = z.object({
  id: idField,
  userId: idField,
  module: z.string(),
  startAt: iso,
  durationS: z.number(),
})

export const aiConversationSchema = z.object({
  id: idField,
  userId: idField,
  roleMode: z.string(),
  messages: z.unknown(),
  updatedAt: iso,
})

export const settingSchema = z.object({
  key: z.string(),
  value: z.string(),
})

/** 备份文件结构(6.2)。AI 配置的 apiKey 导出时被抹除(隐私),导入时空值不覆盖本地。 */
export const backupFileSchema = z.object({
  app: z.literal(APP_ID),
  schemaVersion: z.union([z.literal(1), z.literal(SCHEMA_VERSION)]),
  exportedAt: iso,
  data: z.object({
    passages: z.array(passageSchema),
    questions: z.array(questionSchema),
    topics: z.array(topicSchema),
    essays: z.array(essaySchema),
    essayReviews: z.array(essayReviewSchema),
    practiceRecords: z.array(practiceRecordSchema),
    wrongQuestions: z.array(wrongQuestionSchema),
    translationExercises: z.array(translationExerciseSchema),
    notes: z.array(noteSchema),
    // v2 新增表:旧版备份里没有这个键,缺省为空数组以便继续导入
    dictationRecords: z.array(dictationRecordSchema).default([]),
    studySessions: z.array(studySessionSchema),
    aiConversations: z.array(aiConversationSchema),
    settings: z.array(settingSchema),
  }),
})

export type BackupFile = z.infer<typeof backupFileSchema>
export type BackupData = BackupFile['data']

export const BACKUP_TABLE_KEYS = [
  'passages',
  'questions',
  'topics',
  'essays',
  'essayReviews',
  'practiceRecords',
  'wrongQuestions',
  'translationExercises',
  'notes',
  'dictationRecords',
  'studySessions',
  'aiConversations',
  'settings',
] as const

export type BackupTableKey = (typeof BACKUP_TABLE_KEYS)[number]
