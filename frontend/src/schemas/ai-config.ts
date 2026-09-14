import { z } from 'zod'

export const aiConfigSchema = z.object({
  baseUrl: z.string().url(),
  apiKey: z.string().min(1),
  model: z.string().min(1),
})

export type AiConfig = z.infer<typeof aiConfigSchema>

/** 常用服务商预设;均为 OpenAI 兼容协议,浏览器直连。 */
export const PROVIDER_PRESETS = {
  deepseek: {
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
  },
  siliconflow: {
    baseUrl: 'https://api.siliconflow.cn/v1',
    model: 'deepseek-ai/DeepSeek-V3',
  },
} as const
