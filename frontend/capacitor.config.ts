import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.smartenglish.prep',
  appName: 'SmartEnglish-Prep',
  webDir: 'dist',
  // 本地优先:WebView 内加载打包资源;AI 直连外部 https API(Ollama http 场景见 AndroidManifest usesCleartextTraffic)
  android: {
    allowMixedContent: true,
  },
}

export default config
