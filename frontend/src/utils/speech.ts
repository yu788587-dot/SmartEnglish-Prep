/**
 * 系统语音合成(Web Speech API)封装 —— 单词听写的发音来源。
 *
 * 刻意不引第三方依赖:桌面浏览器用系统语音,Android WebView 自带 Google TTS,
 * 装好英语语音包后完全离线可用,符合项目「本地优先」原则。
 */

export interface SpeakOptions {
  /** BCP-47 语言标签,如 en-GB / en-US;雅思默认英音 */
  lang?: string
  /** 指定语音;为 null 时按 lang 自动挑一个 */
  voice?: SpeechSynthesisVoice | null
  /** 语速 0.1–2,听写默认偏慢 */
  rate?: number
  /** 连续朗读次数 */
  times?: number
}

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

let cachedVoices: SpeechSynthesisVoice[] = []

/**
 * 语音列表是异步填充的 —— 首次 getVoices() 常返回空数组(Chrome / WebView 都这样),
 * 因此监听 voiceschanged 补齐并缓存结果。
 */
export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!isSpeechSupported()) return Promise.resolve([])
  if (cachedVoices.length > 0) return Promise.resolve(cachedVoices)

  const synth = window.speechSynthesis
  return new Promise((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      synth.removeEventListener('voiceschanged', finish)
      cachedVoices = synth.getVoices()
      resolve(cachedVoices)
    }
    const immediate = synth.getVoices()
    if (immediate.length > 0) {
      cachedVoices = immediate
      resolve(immediate)
      return
    }
    synth.addEventListener('voiceschanged', finish)
    // 兜底:WebView 已装语音时可能永不触发 voiceschanged,超时再取一次
    window.setTimeout(finish, 1200)
  })
}

export function listEnglishVoices(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  return voices.filter((v) => v.lang.toLowerCase().startsWith('en'))
}

/** 精确匹配 lang,退一步匹配主语言(如 en-GB → 任意 en-*)。 */
export function pickVoice(
  voices: SpeechSynthesisVoice[],
  lang: string,
): SpeechSynthesisVoice | null {
  const target = lang.toLowerCase()
  return (
    voices.find((v) => v.lang.toLowerCase().replace('_', '-') === target) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(target.slice(0, 2))) ??
    null
  )
}

/** 停止朗读。离开听写页或组件卸载时必须调用,否则会继续念下去。 */
export function cancelSpeech(): void {
  if (isSpeechSupported()) window.speechSynthesis.cancel()
}

/**
 * 朗读一个词条。resolve(true) 表示正常读完;
 * resolve(false) 表示出错或超时 —— 多数情况是系统缺英语语音包,调用方可据此提示用户。
 *
 * 注意:iOS/Chrome 首次 speak() 必须发生在用户手势里,因此「开始听写」按钮要作为首次入口。
 */
export function speakWord(word: string, options: SpeakOptions = {}): Promise<boolean> {
  if (!isSpeechSupported()) return Promise.resolve(false)

  const { lang = 'en-GB', voice = null, rate = 0.85, times = 1 } = options
  const synth = window.speechSynthesis
  const total = Math.max(1, Math.min(5, Math.round(times)))

  synth.cancel()

  return new Promise((resolve) => {
    let index = 0
    let settled = false
    let timer: number | undefined

    const finish = (ok: boolean) => {
      if (settled) return
      settled = true
      if (timer !== undefined) window.clearTimeout(timer)
      resolve(ok)
    }

    const speakOne = () => {
      if (settled) return
      const utterance = new SpeechSynthesisUtterance(word)
      utterance.lang = lang
      utterance.rate = rate
      if (voice) utterance.voice = voice

      utterance.onend = () => {
        index += 1
        if (index >= total) finish(true)
        else speakOne()
      }
      utterance.onerror = () => finish(false)

      // 兜底:部分 WebView 在缺语音时既不触发 onend 也不触发 onerror
      if (timer !== undefined) window.clearTimeout(timer)
      timer = window.setTimeout(() => finish(false), word.length * 500 + 6000)

      synth.speak(utterance)
    }

    speakOne()
  })
}
