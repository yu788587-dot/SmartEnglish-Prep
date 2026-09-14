import { z } from 'zod'

/** 透视镜结构化结果:按选区类型判别。所有失败路径降级为纯文本,绝不渲染崩溃。 */

export const wordLensSchema = z.object({
  kind: z.literal('word'),
  word: z.string(),
  phonetic: z.string().optional(),
  senses: z
    .array(
      z.object({
        pos: z.string(), // n. / v. / adj. ...
        meaningZh: z.string(),
        meaningEn: z.string().optional(),
      }),
    )
    .min(1)
    .max(4),
  examples: z
    .array(z.object({ en: z.string(), zh: z.string() }))
    .max(3)
    .optional(),
  collocations: z.array(z.string()).max(4).optional(),
})

export const phraseLensSchema = z.object({
  kind: z.literal('phrase'),
  phrase: z.string(),
  translation: z.string(),
  meaning: z.string(),
  usage: z.string().optional(),
  examples: z
    .array(z.object({ en: z.string(), zh: z.string() }))
    .max(2)
    .optional(),
})

export const sentenceLensSchema = z.object({
  kind: z.literal('sentence'),
  translation: z.string(),
  skeleton: z.string(), // 主干结构一句话描述
  clauses: z
    .array(z.object({ text: z.string(), role: z.string(), zh: z.string() }))
    .max(6)
    .optional(),
  notes: z.array(z.string()).max(3).optional(),
})

export const lensResultSchema = z.discriminatedUnion('kind', [
  wordLensSchema,
  phraseLensSchema,
  sentenceLensSchema,
])

export type WordLens = z.infer<typeof wordLensSchema>
export type PhraseLens = z.infer<typeof phraseLensSchema>
export type SentenceLens = z.infer<typeof sentenceLensSchema>
export type LensResult = z.infer<typeof lensResultSchema>

export type LensMode = 'word' | 'phrase' | 'sentence'

/** 启发式选区分类:空格/连字符数为主。 */
export function classifySelection(text: string): LensMode {
  const t = text.trim()
  if (t.length <= 3 || (!t.includes(' ') && t.length < 24)) return 'word'
  if (t.split(/\s+/).length <= 4 && !/[.!?;:]$/.test(t)) return 'phrase'
  return 'sentence'
}
