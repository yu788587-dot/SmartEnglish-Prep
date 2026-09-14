import Dexie, { type EntityTable } from 'dexie'
import type {
  AiConversation,
  Essay,
  EssayReview,
  Passage,
  PracticeRecord,
  Question,
  Setting,
  StudySession,
  Topic,
  TranslationExercise,
  Note,
  WrongQuestion,
} from './types'

/**
 * 本地优先数据库(Web: IndexedDB / APK: Capacitor SQLite,见 M8 adapter)。
 * 主键统一为 UUID 字符串,便于导出/导入与后端同构。
 */
export const db = new Dexie('SmartEnglishPrep') as Dexie & {
  passages: EntityTable<Passage, 'id'>
  questions: EntityTable<Question, 'id'>
  topics: EntityTable<Topic, 'id'>
  essays: EntityTable<Essay, 'id'>
  essayReviews: EntityTable<EssayReview, 'id'>
  practiceRecords: EntityTable<PracticeRecord, 'id'>
  wrongQuestions: EntityTable<WrongQuestion, 'id'>
  translationExercises: EntityTable<TranslationExercise, 'id'>
  notes: EntityTable<Note, 'id'>
  studySessions: EntityTable<StudySession, 'id'>
  aiConversations: EntityTable<AiConversation, 'id'>
  settings: EntityTable<Setting, 'key'>
}

db.version(1).stores({
  // 索引仅声明用于查询的字段;主键 id 不需要显式声明
  passages: 'id, module, level, createdAt',
  questions: 'id, passageId, type',
  topics: 'id, examType, category',
  essays: 'id, userId, topicId, createdAt',
  essayReviews: 'id, essayId, createdAt',
  practiceRecords: 'id, userId, questionId, passageId, module, isCorrect, createdAt',
  wrongQuestions: 'id, recordId, questionId, nextReviewAt, resolved',
  translationExercises: 'id, userId, createdAt',
  notes: 'id, userId, word, createdAt',
  studySessions: 'id, userId, module, startAt',
  aiConversations: 'id, userId, roleMode, updatedAt',
  settings: 'key',
})

/** 单用户模式下的固定 user_id,为多用户扩展预留。 */
export const LOCAL_USER_ID = 'local'

export function newId(): string {
  return crypto.randomUUID()
}
