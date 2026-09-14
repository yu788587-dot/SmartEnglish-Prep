import { z } from 'zod'
import { db } from '@/db'
import { aiConfigSchema, type AiConfig } from '@/schemas/ai-config'

export type { AiConfig }

const AI_SETTINGS_KEY = 'ai'

/** AI 未配置或配置损坏:引导用户去设置页。 */
export class AiNotConfiguredError extends Error {
  constructor(message = 'AI service is not configured') {
    super(message)
    this.name = 'AiNotConfiguredError'
  }
}

export async function loadAiConfig(): Promise<AiConfig> {
  const row = await db.settings.get(AI_SETTINGS_KEY)
  if (!row) throw new AiNotConfiguredError()
  const parsed = aiConfigSchema.safeParse(JSON.parse(row.value))
  if (!parsed.success) throw new AiNotConfiguredError()
  return parsed.data
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatOptions {
  /** 要求 JSON mode(response_format: json_object) */
  json?: boolean
  temperature?: number
  signal?: AbortSignal
}

export class AiRequestError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message)
    this.name = 'AiRequestError'
  }
}

/** OpenAI 兼容 /chat/completions,非流式。 */
export async function chat(
  config: AiConfig,
  messages: ChatMessage[],
  opts: ChatOptions = {},
): Promise<string> {
  const res = await fetch(`${config.baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: opts.temperature ?? 0.3,
      ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
    }),
    signal: opts.signal,
  })
  if (!res.ok) {
    throw new AiRequestError(`AI request failed with HTTP ${res.status}`, res.status)
  }
  const data: unknown = await res.json()
  const content = (data as { choices?: { message?: { content?: unknown } }[] })?.choices?.[0]
    ?.message?.content
  if (typeof content !== 'string') {
    throw new AiRequestError('AI response has no message content')
  }
  return content
}

/**
 * JSON mode + Zod 校验 + 失败重试一次 + 降级。
 * 成功:{ ok: true, data };两次都失败:{ ok: false, rawText } —— 调用方以纯文本展示,不允许崩溃。
 */
export async function chatJson<T>(
  config: AiConfig,
  messages: ChatMessage[],
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  opts: ChatOptions = {},
): Promise<{ ok: true; data: T } | { ok: false; rawText: string }> {
  let lastRaw = ''
  for (let attempt = 0; attempt < 2; attempt++) {
    const text = await chat(config, messages, { ...opts, json: true })
    lastRaw = text
    try {
      const stripped = text
        .replace(/^\s*```(?:json)?\s*/, '')
        .replace(/\s*```\s*$/, '')
        .trim()
      return { ok: true, data: schema.parse(JSON.parse(stripped)) }
    } catch {
      // 解析或校验失败:重试一次
    }
  }
  return { ok: false, rawText: lastRaw }
}

/** 流式对话(SSE);返回完整文本。供降级展示与后续助教使用。 */
export async function chatStream(
  config: AiConfig,
  messages: ChatMessage[],
  onDelta: (delta: string) => void,
  opts: ChatOptions = {},
): Promise<string> {
  const res = await fetch(`${config.baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: opts.temperature ?? 0.3,
      stream: true,
    }),
    signal: opts.signal,
  })
  if (!res.ok || !res.body) {
    throw new AiRequestError(`AI request failed with HTTP ${res.status}`, res.status)
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let full = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const payload = trimmed.slice(5).trim()
      if (payload === '[DONE]') continue
      try {
        const delta =
          (JSON.parse(payload) as { choices?: { delta?: { content?: string } }[] })
            ?.choices?.[0]?.delta?.content ?? ''
        if (delta) {
          full += delta
          onDelta(delta)
        }
      } catch {
        // 忽略不完整的 SSE 片段
      }
    }
  }
  return full
}
