/** 与 docs/执行计划.md 第 3 节 ER 图同构;字段注释略,详见执行计划。 */

export type Module = 'reading' | 'writing' | 'translation' | 'listening'

export interface Passage {
  id: string
  title: string
  module: Module
  level: string
  contentMd: string
  source?: string
  createdAt: string // ISO datetime
}

export type QuestionType = 'mcq' | 'tfng' | 'match' | 'gap'

export interface Question {
  id: string
  passageId: string
  type: QuestionType
  stem: string
  options: unknown // { key: string; text: string }[] 或匹配对,按题型解析
  answer: string
  explanation?: string
  order: number
}

export type ExamType = 'ielts_t2' | 'ielts_t1' | 'cet4' | 'cet6'

export interface Topic {
  id: string
  examType: ExamType
  prompt: string
  category?: string
}

export interface Essay {
  id: string
  userId: string
  topicId?: string
  prompt?: string
  content: string
  wordCount: number
  createdAt: string
  updatedAt: string
}

export interface EssayReview {
  id: string
  essayId: string
  model: string
  /** 雅思: {TR,CC,LR,GRA}; CET: {band, notes} */
  scores: unknown
  overall: number
  /** 逐句结构化反馈,见执行计划 6.1 */
  feedback: unknown
  summary?: string
  createdAt: string
}

export interface PracticeRecord {
  id: string
  userId: string
  questionId: string
  passageId: string
  module: Module
  /** 一次交卷产生的所有记录共享同一 attemptId,用于统计每次得分 */
  attemptId: string
  userAnswer: unknown
  isCorrect: boolean
  durationS: number
  createdAt: string
}

export interface WrongQuestion {
  id: string
  userId: string
  recordId: string
  questionId: string
  reviewCount: number
  nextReviewAt?: string
  resolved: boolean
}

export interface ListeningCue {
  start: number | null // 秒;纯文本字幕未钉起点时为 null
  end: number | null
  text: string
}

export interface ListeningMaterial {
  id: string
  userId: string
  title: string
  audioName: string
  audioBlob: Blob // 仅存本地设备;体积原因不进 JSON 备份
  durationS: number | null
  cues: ListeningCue[]
  createdAt: string
}

export interface TranslationTopic {
  id: string
  title: string
  sourceText: string
  refTranslation: string
}

export interface TranslationExercise {
  id: string
  userId: string
  sourceText: string
  refTranslation?: string
  userTranslation: string
  aiFeedback?: unknown
  createdAt: string
}

export interface Note {
  id: string
  userId: string
  word: string
  context?: string
  aiExplanation?: unknown
  tags?: string[]
  createdAt: string
}

export interface StudySession {
  id: string
  userId: string
  module: Module
  startAt: string
  durationS: number
}

export type RoleMode = string // 'strict-examiner' | 'encouraging-tutor' | 自定义

export interface AiConversation {
  id: string
  userId: string
  roleMode: RoleMode
  messages: unknown // { role, content }[]
  updatedAt: string
}

export interface Setting {
  key: string
  value: string // JSON 字符串
}
