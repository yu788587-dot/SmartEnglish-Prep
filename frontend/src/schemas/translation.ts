import { z } from 'zod'

/** 翻译批改结构化反馈;失败路径降级为纯文本。 */

export const translationIssueSchema = z.object({
  type: z.enum(['mistranslation', 'omission', 'addition', 'grammar', 'word-choice', 'style']),
  excerpt: z.string(), // 用户译文中的问题片段
  suggestion: z.string(),
  explanation: z.string(),
})
export type TranslationIssue = z.infer<typeof translationIssueSchema>

export const translationFeedbackSchema = z.object({
  overallPolished: z.string().min(1), // 整体优化译文
  comment: z.string().min(1), // 总评(界面语言)
  sentences: z
    .array(
      z.object({
        index: z.number(),
        user: z.string(), // 用户译文句(原文照抄)
        polished: z.string(), // 润色后
        referenceFragment: z.string().nullish(), // 参考译文对应片段
        issues: z.array(translationIssueSchema).max(4).default([]),
      }),
    )
    .min(1),
  vocabulary: z
    .array(
      z.object({
        from: z.string(),
        to: z.string(),
        gloss: z.string().optional(),
      }),
    )
    .max(6)
    .optional(),
})
export type TranslationFeedback = z.infer<typeof translationFeedbackSchema>
