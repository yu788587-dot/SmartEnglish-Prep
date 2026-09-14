import type { ChatMessage } from './ai-client'
import { essayReviewDataSchema, type EssayReviewData } from '@/schemas/grading'
import { gatewayChatJson } from './gateway'

const IELTS_SYSTEM = `You are an IELTS Writing Task 2 examiner. Grade the essay strictly against the official band descriptors:
- TR (Task Response): fully addresses all parts; clear position; well-developed ideas.
- CC (Coherence & Cohesion): logical paragraphing; cohesive devices used naturally, not mechanically.
- LR (Lexical Resource): range and precision of vocabulary; awareness of collocation; rare errors.
- GRA (Grammatical Range & Accuracy): variety of structures; punctuation; error density and impact.
Scores are half-bands 0-9. Band 6 = "adequate"; band 7 = "sufficiently well developed, good range with only occasional errors". Most real scripts fall between 5.0 and 7.5 — do not inflate.
Reply with a SINGLE JSON object and nothing else.`

const CET_SYSTEM = `You are a CET-4/6 writing rater (15-point scale, band grading). Grade strictly in 5 bands:
- band 5 (13-15分): 切题,表达思想清楚,文字通顺、连贯,基本上无语言错误,仅有个别小错。
- band 4 (10-12分): 切题,表达思想清楚,文字连贯,但有少量语言错误。
- band 3 (7-9分): 基本切题,有些地方表达思想不够清楚,文字勉强连贯;语言错误相当多,其中有一些是严重错误。
- band 2 (4-6分): 基本切题,表达思想不清楚,连贯性差,有较多的严重语言错误。
- band 1 (1-3分): 条理不清,思路紊乱,语言支离破碎或大部分句子均有错误,且多数为严重错误。
Do not inflate; most real scripts fall in band 3-4. Reply with a SINGLE JSON object and nothing else.`

function userInstruction(
  examType: string,
  promptText: string,
  essay: string,
  uiLang: string,
): string {
  const replyLang = uiLang === 'zh-CN' ? 'Simplified Chinese' : 'English'
  const shape =
    examType === 'ielts_t2'
      ? '{"overall":6.5,"scores":{"TR":6,"CC":6.5,"LR":6,"GRA":6},"summary":"...","sentences":[{"index":1,"original":"...","issues":[{"type":"grammar","excerpt":"...","suggestion":"...","explanation":"..."}],"polished":"..."}],"vocabulary_upgrades":[{"from":"good","to":"beneficial"}]}'
      : '{"overall":11,"scores":{"band":4},"summary":"...","sentences":[{"index":1,"original":"...","issues":[{"type":"grammar","excerpt":"...","suggestion":"...","explanation":"..."}],"polished":"..."}],"vocabulary_upgrades":[{"from":"good","to":"beneficial"}]}'
  const overallNote =
    examType === 'ielts_t2'
      ? 'overall = mean of the four dimensions (half-band precision).'
      : 'overall = the 15-point scale score implied by the band.'
  return `Exam type: ${examType}.
Writing prompt:
"""
${promptText}
"""
Candidate essay:
"""
${essay}
"""
Return JSON exactly shaped like: ${shape}
Rules:
- ${overallNote}
- sentences: walk through the essay sentence by sentence in order (index 1..N); original must be the candidate's sentence verbatim; polished is your improved version; keep issues empty for clean sentences (polished may equal original).
- issues.type ∈ grammar | collocation | logic | word-choice | other; explanation and summary in ${replyLang}.
- vocabulary_upgrades: at most 5 concrete upgrades actually used in your polished sentences.
- No markdown fences, no commentary outside the JSON.`
}

/**
 * 作文批改主入口:题目 + 作文 → 结构化批改。
 * JSON 校验失败重试一次;仍失败则降级返回原始文本(报告页以纯文本渲染)。
 */
export async function gradeEssay(
  examType: string,
  promptText: string,
  essay: string,
  uiLang: string,
  signal?: AbortSignal,
): Promise<{ ok: true; data: EssayReviewData } | { ok: false; rawText: string }> {
  const messages: ChatMessage[] = [
    { role: 'system', content: examType.startsWith('ielts') ? IELTS_SYSTEM : CET_SYSTEM },
    { role: 'user', content: userInstruction(examType, promptText, essay, uiLang) },
  ]
  const res = await gatewayChatJson(messages, essayReviewDataSchema, {
    signal,
    temperature: 0.2,
  })
  if (res.ok) return { ok: true, data: res.data }
  return { ok: false, rawText: res.rawText }
}
