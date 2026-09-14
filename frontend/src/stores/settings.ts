import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UiLang = 'zh-CN' | 'en'
export type AiMode = 'local' | 'server'

interface SettingsState {
  lang: UiLang
  aiMode: AiMode
  serverBaseUrl: string
  setLang: (lang: UiLang) => void
  setAiMode: (mode: AiMode) => void
  setServerBaseUrl: (url: string) => void
}

/** 界面级设置(语言/AI 模式);学习数据一律存 Dexie,不走这里。 */
export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      lang: 'zh-CN',
      aiMode: 'local',
      serverBaseUrl: 'http://localhost:8000',
      setLang: (lang) => set({ lang }),
      setAiMode: (aiMode) => set({ aiMode }),
      setServerBaseUrl: (serverBaseUrl) => set({ serverBaseUrl }),
    }),
    { name: 'sep.ui-settings' },
  ),
)
