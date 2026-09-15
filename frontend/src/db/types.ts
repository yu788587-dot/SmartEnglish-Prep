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
  /** 音标(IPA,不含斜杠);优先取 AI 透视镜结果 */
  phonetic?: string
  /** 简明中文释义;取自 AI 结果的首个义项,可手改 */
  meaning?: string
  /** 词性,如 n. / v. / adj. */
  pos?: string
  /** 例句(英文) */
  example?: string
  /** 例句译文 */
  exampleZh?: string
  context?: string
  aiExplanation?: unknown
  tags?: string[]
  /** 来源模块:reading / writing / translation / manual */
  source?: string
  /** 星标:优先进入复习与听写队列 */
  starred?: boolean
  /** SRS 档位 0–5;0 = 陌生,5 = 已掌握 */
  mastery?: number
  reviewCount?: number
  lastReviewedAt?: string
  nextReviewAt?: string
  /** 听写累计错误次数,用于「常错词」排序 */
  dictationWrong?: number
  createdAt: string
  /** 增量合并依据;旧记录缺失时一律回落到 createdAt */
  updatedAt?: string
  /** 软删除墓碑:跨设备导入时不会「复活」已删词条 */
  deletedAt?: string
}

export interface StudySession {
  id: string
  userId: string
  module: Module
  startAt: string
  durationS: number
}

export interface DictationRecord {
  id: string
  userId: string
  /** → notes.id,听写的词条 */
  noteId: string
  /** 一次听写产生的所有记录共享同一 attemptId,用于统计本次正确率 */
  attemptId: string
  userAnswer: string
  isCorrect: boolean
  createdAt: string
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
