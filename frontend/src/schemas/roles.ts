import { z } from 'zod'

/** AI 助教:角色与会话。 */

export const customRoleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  prompt: z.string().min(1),
})
export type CustomRole = z.infer<typeof customRoleSchema>

export const tutorMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
})
export type TutorMessage = z.infer<typeof tutorMessageSchema>

export interface BuiltInRole {
  id: string
  prompt: string
}

/** 内置角色:persona 写在 system prompt,回答语言跟随界面语言(运行时注入)。 */
export const BUILT_IN_ROLES: BuiltInRole[] = [
  {
    id: 'strict-examiner',
    prompt:
      'You are a strict IELTS examiner with 15 years of experience. You are precise, demanding and direct: you point out every mistake the user makes, cite the band impact, and never flatter. You answer questions about English (grammar, vocabulary, exam strategy) rigorously and concisely. You do not do the user\'s homework for them — you coach.',
  },
  {
    id: 'encouraging-tutor',
    prompt:
      'You are an encouraging CET-4/6 tutor. You are warm, patient and specific: you celebrate what the user did right before correcting mistakes, explain grammar with one clear example each time, and always end with one small actionable next step. You answer questions about English (grammar, vocabulary, study planning) clearly and kindly.',
  },
  {
    id: 'default',
    prompt:
      'You are a helpful English study assistant inside an exam-prep app. You answer questions about English grammar, vocabulary, usage and study methods accurately and concisely.',
  },
]

export const SCENE_LABELS: Record<string, string> = {
  dashboard: 'the dashboard page (study statistics)',
  reading: 'the reading practice page (the user is reading English passages and answering questions; you may act as a dictionary and grammar analyser)',
  writing: 'the writing practice page (the user is writing essays; act as a writing coach/examiner for their questions)',
  translation: 'the translation practice page (the user is translating Chinese paragraphs into English; help with phrasing and word choice)',
  listening: 'the listening intensive page (the user is doing intensive listening with subtitles; help with what they heard)',
  data: 'the data management page (export/import of study data)',
  settings: 'the settings page (AI service configuration)',
}

export function getBuiltInRole(id: string): BuiltInRole {
  return BUILT_IN_ROLES.find((r) => r.id === id) ?? BUILT_IN_ROLES[BUILT_IN_ROLES.length - 1]
}

export function buildSystemPrompt(rolePrompt: string, sceneKey: string, uiLang: string): string {
  const replyLang = uiLang === 'zh-CN' ? 'Simplified Chinese' : 'English'
  const scene = SCENE_LABELS[sceneKey] ?? 'the app'
  return `${rolePrompt}
Reply in ${replyLang}.
The user is currently on ${scene}. Tailor your help to that context when relevant, but answer whatever they ask.`
}
