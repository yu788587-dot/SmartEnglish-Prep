import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UiLang = 'zh-CN' | 'en'

interface SettingsState {
  lang: UiLang
  setLang: (lang: UiLang) => void
}

/** 界面级设置(语言);学习数据一律存 Dexie,不走这里。 */
export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      lang: 'zh-CN',
      setLang: (lang) => set({ lang }),
    }),
    { name: 'sep.ui-settings' },
  ),
)
