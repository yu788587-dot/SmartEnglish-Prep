import { z } from 'zod'
import { useSettings } from '@/stores/settings'
import {
  chat as directChat,
  chatStream as directChatStream,
  loadAiConfig,
  type ChatMessage,
  type ChatOptions,
} from './ai-client'

export class ServerUpstreamError extends Error {
  /** 服务器可达但其 upstream 未配置/出错(503/502)——不回落,如实上报 */
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = 'ServerUpstreamError'
  }
}

export class ServerUnavailable extends Error {
  /** 后端不可达(网络/未启动)——自动回落本地模式 */
  constructor(message = 'Server unreachable') {
    super(message)
    this.name = 'ServerUnavailable'
  }
}

async function serverChat(
  baseUrl: string,
  messages: ChatMessage[],
  opts: ChatOptions = {},
): Promise<string> {
  let res: Response
  try {
    res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        json_mode: opts.json ?? false,
        stream: false,
      }),
      signal: opts.signal,
    })
  } catch {
    throw new ServerUnavailable()
  }
  if (res.status === 503 || res.status === 502) {
    const detail = (await res.json().catch(() => null)) as { detail?: string } | null
    throw new ServerUpstreamError(detail?.detail ?? `Server upstream error (${res.status})`, res.status)
  }
  if (!res.ok) throw new ServerUnavailable(`Server returned HTTP ${res.status}`)
  const data = (await res.json()) as { content?: unknown }
  if (typeof data.content !== 'string') throw new ServerUnavailable('Server response has no content')
  return data.content
}

/**
 * AI 网关:统一入口,按设置在"本地直连"与"服务器代理"之间路由。
 * 服务器不可达时自动回落本地直连;本地也未配置则抛 AiNotConfiguredError。
 */
export async function gatewayChat(
  messages: ChatMessage[],
  opts: ChatOptions = {},
): Promise<string> {
  const { aiMode, serverBaseUrl } = useSettings.getState()
  if (aiMode === 'server' && serverBaseUrl) {
    try {
      return await serverChat(serverBaseUrl, messages, opts)
    } catch (e) {
      if (!(e instanceof ServerUnavailable)) throw e
      // 后端不可达 → 回落本地(可能抛 AiNotConfiguredError)
      const cfg = await loadAiConfig()
      return directChat(cfg, messages, opts)
    }
  }
  const cfg = await loadAiConfig()
  return directChat(cfg, messages, opts)
}

/** JSON 请求 + Zod 校验 + 失败重试一次 + 降级(契约同 ai-client.chatJson)。 */
export async function gatewayChatJson<T>(
  messages: ChatMessage[],
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  opts: ChatOptions = {},
): Promise<{ ok: true; data: T } | { ok: false; rawText: string }> {
  let lastRaw = ''
  for (let attempt = 0; attempt < 2; attempt++) {
    const text = await gatewayChat(messages, { ...opts, json: true })
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

/**
 * 流式:本地模式真流式;服务器模式 M7 以整段返回模拟(单次 delta)。
 * 后端不可达时回落本地流式。
 */
export async function gatewayChatStream(
  messages: ChatMessage[],
  onDelta: (delta: string) => void,
  opts: ChatOptions = {},
): Promise<string> {
  const { aiMode, serverBaseUrl } = useSettings.getState()
  if (aiMode === 'server' && serverBaseUrl) {
    try {
      const full = await serverChat(serverBaseUrl, messages, opts)
      onDelta(full)
      return full
    } catch (e) {
      if (!(e instanceof ServerUnavailable)) throw e
      const cfg = await loadAiConfig()
      return directChatStream(cfg, messages, onDelta, opts)
    }
  }
  const cfg = await loadAiConfig()
  return directChatStream(cfg, messages, onDelta, opts)
}
