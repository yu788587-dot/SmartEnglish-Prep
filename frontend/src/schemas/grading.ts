import { z } from 'zod'

/** 写作批改结构化结果(执行计划 6.1);失败路径降级为纯文本,绝不渲染崩溃。 */

export const issueTypeSchema = z.enum(['grammar', 'collocation', 'logic', 'word-choice', 'other'])
export type IssueType = z.infer<typeof issueTypeSchema>

export const reviewIssueSchema = z.object({
  type: issueTypeSchema,
  excerpt: z.string(), // 原句中的问题片段
  suggestion: z.string(), // 修改建议(替换文本或描述)
  explanation: z.string(), // 中文/界面语言解释
})
export type ReviewIssue = z.infer<typeof reviewIssueSchema>

export const reviewSentenceSchema = z.object({
  index: z.number(),
  original: z.string(),
  issues: z.array(reviewIssueSchema).max(6).default([]),
  polished: z.string(), // 润色后的句子
})
export type ReviewSentence = z.infer<typeof reviewSentenceSchema>

/** 雅思:四维 0–9 半分制 */
export const ieltsScoresSchema = z.object({
  TR: z.number().min(0).max(9),
  CC: z.number().min(0).max(9),
  LR: z.number().min(0).max(9),
  GRA: z.number().min(0).max(9),
})
export type IeltsScores = z.infer<typeof ieltsScoresSchema>

/** CET:档位制 1–5 档(对应 15 分制评分档次) */
export const cetScoresSchema = z.object({
  band: z.number().min(1).max(5),
})
export type CetScores = z.infer<typeof cetScoresSchema>

export const essayReviewDataSchema = z.object({
  overall: z.number().min(0),
  scores: z.union([ieltsScoresSchema, cetScoresSchema]),
  summary: z.string().min(1),
  sentences: z.array(reviewSentenceSchema).min(1),
  vocabulary_upgrades: z
    .array(z.object({ from: z.string(), to: z.string() }))
    .max(8)
    .optional(),
})
export type EssayReviewData = z.infer<typeof essayReviewDataSchema>

export function isIeltsScores(s: unknown): s is IeltsScores {
  return typeof s === 'object' && s !== null && 'TR' in s
}

export function isCetScores(s: unknown): s is CetScores {
  return typeof s === 'object' && s !== null && 'band' in s
}

/** 各考试类型的最低词数(题目字数要求由 examType 推导,不存库) */
export const EXAM_MIN_WORDS: Record<string, number> = {
  ielts_t2: 250,
  ielts_t1: 150,
  cet4: 120,
  cet6: 150,
}

export const EXAM_TARGET_RANGE: Record<string, string> = {
  ielts_t2: '250–320',
  ielts_t1: '150–200',
  cet4: '120–180',
  cet6: '150–200',
}
