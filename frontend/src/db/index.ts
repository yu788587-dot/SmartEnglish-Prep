import Dexie, { type EntityTable } from 'dexie'
import type {
  AiConversation,
  DictationRecord,
  Essay,
  EssayReview,
  ListeningMaterial,
  Passage,
  PracticeRecord,
  Question,
  Setting,
  StudySession,
  Topic,
  TranslationExercise,
  TranslationTopic,
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
  translationTopics: EntityTable<TranslationTopic, 'id'>
  essays: EntityTable<Essay, 'id'>
  essayReviews: EntityTable<EssayReview, 'id'>
  practiceRecords: EntityTable<PracticeRecord, 'id'>
  wrongQuestions: EntityTable<WrongQuestion, 'id'>
  translationExercises: EntityTable<TranslationExercise, 'id'>
  notes: EntityTable<Note, 'id'>
  studySessions: EntityTable<StudySession, 'id'>
  aiConversations: EntityTable<AiConversation, 'id'>
  settings: EntityTable<Setting, 'key'>
  listeningMaterials: EntityTable<ListeningMaterial, 'id'>
  dictationRecords: EntityTable<DictationRecord, 'id'>
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

// v2:翻译话题种子表(M4)
db.version(2).stores({
  passages: 'id, module, level, createdAt',
  questions: 'id, passageId, type',
  topics: 'id, examType, category',
  translationTopics: 'id',
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

// v3:听力素材表(M5,音频 Blob 仅存本地)
db.version(3).stores({
  passages: 'id, module, level, createdAt',
  questions: 'id, passageId, type',
  topics: 'id, examType, category',
  translationTopics: 'id',
  essays: 'id, userId, topicId, createdAt',
  essayReviews: 'id, essayId, createdAt',
  practiceRecords: 'id, userId, questionId, passageId, module, isCorrect, createdAt',
  wrongQuestions: 'id, recordId, questionId, nextReviewAt, resolved',
  translationExercises: 'id, userId, createdAt',
  notes: 'id, userId, word, createdAt',
  studySessions: 'id, userId, module, startAt',
  aiConversations: 'id, userId, roleMode, updatedAt',
  settings: 'key',
  listeningMaterials: 'id, userId, createdAt',
})

// v4: 单词本扩展字段(M9:音标/释义/SRS/墓碑)
db.version(4).stores({
  passages: 'id, module, level, createdAt',
  questions: 'id, passageId, type',
  topics: 'id, examType, category',
  translationTopics: 'id',
  essays: 'id, userId, topicId, createdAt',
  essayReviews: 'id, essayId, createdAt',
  practiceRecords: 'id, userId, questionId, passageId, module, isCorrect, createdAt',
  wrongQuestions: 'id, recordId, questionId, nextReviewAt, resolved',
  translationExercises: 'id, userId, createdAt',
  notes: 'id, userId, word, createdAt, updatedAt, nextReviewAt, starred, deletedAt',
  studySessions: 'id, userId, module, startAt',
  aiConversations: 'id, userId, roleMode, updatedAt',
  settings: 'key',
  listeningMaterials: 'id, userId, createdAt',
})

// v5: 听写记录表(M10)
db.version(5).stores({
  passages: 'id, module, level, createdAt',
  questions: 'id, passageId, type',
  topics: 'id, examType, category',
  translationTopics: 'id',
  essays: 'id, userId, topicId, createdAt',
  essayReviews: 'id, essayId, createdAt',
  practiceRecords: 'id, userId, questionId, passageId, module, isCorrect, createdAt',
  wrongQuestions: 'id, recordId, questionId, nextReviewAt, resolved',
  translationExercises: 'id, userId, createdAt',
  notes: 'id, userId, word, createdAt, updatedAt, nextReviewAt, starred, deletedAt',
  studySessions: 'id, userId, module, startAt',
  aiConversations: 'id, userId, roleMode, updatedAt',
  settings: 'key',
  listeningMaterials: 'id, userId, createdAt',
  dictationRecords: 'id, userId, noteId, attemptId, isCorrect, createdAt',
})

/** 单用户模式下的固定 user_id,为多用户扩展预留。 */
export const LOCAL_USER_ID = 'local'

export function newId(): string {
  return crypto.randomUUID()
}
