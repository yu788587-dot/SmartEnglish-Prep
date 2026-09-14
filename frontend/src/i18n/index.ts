import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import zhCN from './locales/zh-CN.json'
import en from './locales/en.json'

export const LANG_KEY = 'sep.ui-settings'

function detectLang(): 'zh-CN' | 'en' {
  try {
    const raw = localStorage.getItem(LANG_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      const lang = parsed?.state?.lang
      if (lang === 'zh-CN' || lang === 'en') return lang
    }
  } catch {
    // fall through to navigator detection
  }
  return navigator.language.startsWith('zh') ? 'zh-CN' : 'en'
}

void i18n.use(initReactI18next).init({
  resources: {
    'zh-CN': { translation: zhCN },
    en: { translation: en },
  },
  lng: detectLang(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export default i18n
