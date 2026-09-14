import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import enUS from 'antd/locale/en_US'
import App from './App'
import { paperTheme } from './theme/tokens'
import { useSettings } from './stores/settings'
import '@fontsource-variable/literata'
import './i18n'
import './index.css'

function Root() {
  const lang = useSettings((s) => s.lang)
  return (
    <ConfigProvider locale={lang === 'zh-CN' ? zhCN : enUS} theme={paperTheme}>
      <App />
    </ConfigProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)
