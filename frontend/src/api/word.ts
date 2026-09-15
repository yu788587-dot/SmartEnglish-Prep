import type { ChatMessage } from './ai-client'
import { wordLensSchema, type WordLens } from '@/schemas/lens'
import { gatewayChatJson } from './gateway'

/**
 * 单词本「AI 补全」:给一个裸词,换回音标 / 释义 / 例句 / 搭配。
 * 复用 M1 透视镜的 wordLensSchema,前端字段与阅读存词路径完全一致。
 */

const SYSTEM_PROMPT = `You are a vocabulary assistant inside an English exam-prep app (IELTS / CET-4/6).
You receive a single English word the user wants to memorize.
Reply with a SINGLE JSON object and nothing else: no markdown fences, no commentary before or after.`

function userInstruction(word: string, uiLang: string): string {
  const replyLang = uiLang === 'zh-CN' ? 'Simplified Chinese' : 'English'
  return `The user wants to add the WORD "${word}" to a vocabulary notebook.
Return JSON exactly shaped like:
{"kind":"word","word":"<headword>","phonetic":"<IPA without slashes>","senses":[{"pos":"n.","meaningZh":"...","meaningEn":"..."}],"examples":[{"en":"...","zh":"..."}],"collocations":["..."]}

Rules:
- "word" = the dictionary headword, normalised to lowercase unless it is a proper noun.
- "phonetic" = IPA WITHOUT the enclosing slashes.
- "senses": 1-3 entries ordered by usefulness for IELTS / CET-4/6; meaningZh in ${replyLang}, meaningEn optional.
- "examples": exactly ONE short, exam-register example sentence with a ${replyLang} translation.
- "collocations": at most 3.
- No markdown fences, no commentary outside the JSON.`
}

/** JSON 校验失败重试一次;仍失败降级返回原始文本,由前端以纯文本呈现。 */
export async function enrichWord(
  word: string,
  uiLang: string,
  signal?: AbortSignal,
): Promise<{ ok: true; data: WordLens } | { ok: false; rawText: string }> {
  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userInstruction(word, uiLang) },
  ]
  const res = await gatewayChatJson(messages, wordLensSchema, { signal, temperature: 0.2 })
  if (res.ok) return { ok: true, data: res.data }
  return { ok: false, rawText: res.rawText }
}
