import type { ChatMessage } from './ai-client'
import { translationFeedbackSchema, type TranslationFeedback } from '@/schemas/translation'
import { gatewayChatJson } from './gateway'

const SYSTEM = `You are a CET (College English Test) translation examiner. The candidate translated a Chinese paragraph into English. You receive the source text, the official reference translation, and the candidate's translation.
Compare sentence by sentence against the reference, but judge quality on meaning fidelity and natural English, not on matching the reference word for word.
Issue types: mistranslation (意思错误), omission (漏译), addition (增译), grammar, word-choice, style.
Reply with a SINGLE JSON object and nothing else.`

function userInstruction(
  sourceText: string,
  refTranslation: string,
  userTranslation: string,
  uiLang: string,
): string {
  const replyLang = uiLang === 'zh-CN' ? 'Simplified Chinese' : 'English'
  return `Source (Chinese):
"""
${sourceText}
"""
Reference translation:
"""
${refTranslation}
"""
Candidate translation:
"""
${userTranslation}
"""
Return JSON exactly shaped like: {"overallPolished":"...","comment":"...","sentences":[{"index":1,"user":"...","polished":"...","referenceFragment":"...","issues":[{"type":"mistranslation","excerpt":"...","suggestion":"...","explanation":"..."}]}],"vocabulary":[{"from":"...","to":"...","gloss":"..."}]}
Rules:
- sentences: walk the candidate translation sentence by sentence (index 1..N); user = candidate sentence verbatim; polished = your improved version; referenceFragment = the corresponding fragment of the reference translation (may be null).
- explanation, comment in ${replyLang}; comment 2-3 sentences covering meaning fidelity and language quality.
- vocabulary: at most 5 word/phrase upgrades drawn from your polished version; gloss in ${replyLang}.
- No markdown fences, no commentary outside the JSON.`
}

/** 翻译批改主入口;JSON 校验失败重试一次,仍失败降级为纯文本。 */
export async function gradeTranslation(
  sourceText: string,
  refTranslation: string,
  userTranslation: string,
  uiLang: string,
  signal?: AbortSignal,
): Promise<{ ok: true; data: TranslationFeedback } | { ok: false; rawText: string }> {
  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM },
    { role: 'user', content: userInstruction(sourceText, refTranslation, userTranslation, uiLang) },
  ]
  const res = await gatewayChatJson(messages, translationFeedbackSchema, {
    signal,
    temperature: 0.2,
  })
  if (res.ok) return { ok: true, data: res.data }
  return { ok: false, rawText: res.rawText }
}
