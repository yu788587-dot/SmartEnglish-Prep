import type { ChatMessage } from './ai-client'
import {
  classifySelection,
  lensResultSchema,
  type LensMode,
  type LensResult,
} from '@/schemas/lens'
import { gatewayChatJson } from './gateway'

function modeInstruction(mode: LensMode, selected: string, uiLang: string): string {
  const replyLang = uiLang === 'zh-CN' ? 'Simplified Chinese' : 'English'
  if (mode === 'word') {
    return `The user selected the WORD "${selected}" while reading an exam passage.
Return JSON: {"kind":"word","word":"...","phonetic":"IPA","senses":[{"pos":"n.","meaningZh":"...","meaningEn":"..."}],"examples":[{"en":"...","zh":"..."}],"collocations":["..."]}.
Rules: senses 1-4 entries ordered by relevance to THIS context; explanation in ${replyLang}; at most 3 examples; collocations max 4.`
  }
  if (mode === 'phrase') {
    return `The user selected the PHRASE "${selected}" while reading an exam passage.
Return JSON: {"kind":"phrase","phrase":"...","translation":"...","meaning":"...","usage":"...","examples":[{"en":"...","zh":"..."}]}.
Rules: explanation in ${replyLang}; usage max 2 sentences; at most 2 examples.`
  }
  return `The user selected the SENTENCE "${selected}" while reading an exam passage.
Return JSON: {"kind":"sentence","translation":"...","skeleton":"...","clauses":[{"text":"...","role":"...","zh":"..."}],"notes":["..."]}.
Rules: translation in ${replyLang}; skeleton = one sentence naming subject/verb/object structure in ${replyLang}; clauses = up to 6 (main clause first, then subordinate, each with role like "定语从句/relative clause" and its own translation); notes = max 3 exam-relevant grammar or vocabulary points in ${replyLang}.`
}

const SYSTEM_PROMPT = `You are the "Reading Lens", an English reading tutor inside an exam-prep app (IELTS / CET-4/6).
You receive a selection from an academic passage and reply with a SINGLE JSON object and nothing else.
Your JSON must be directly parseable: no markdown fences, no commentary before or after.`

/**
 * 透视镜主入口:选区 → 结构化解读。
 * JSON 校验失败重试一次;仍失败则降级返回原始文本(前端以纯文本渲染)。
 */
export async function lensLookup(
  selected: string,
  uiLang: string,
  signal?: AbortSignal,
): Promise<{ ok: true; result: LensResult } | { ok: false; rawText: string }> {
  const mode = classifySelection(selected)
  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: modeInstruction(mode, selected, uiLang) },
  ]
  const res = await gatewayChatJson(messages, lensResultSchema, { signal, temperature: 0.2 })
  if (res.ok) return { ok: true, result: res.data }
  return { ok: false, rawText: res.rawText }
}
