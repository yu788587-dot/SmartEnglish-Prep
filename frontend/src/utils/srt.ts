/** 字幕解析:SRT 与纯文本(每行一句,起点由用户播放中钉入)。 */

export interface Cue {
  start: number // 秒
  end: number // 秒
  text: string
}

function timecodeToSeconds(tc: string): number | null {
  const m = tc.trim().match(/^(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})$/)
  if (!m) return null
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) + Number(m[4]) / 10 ** m[4].length
}

/** 解析 SRT;忽略无法解析的块。 */
export function parseSrt(input: string): Cue[] {
  const blocks = input.replace(/\r/g, "").split(/\n\s*\n/)
  const cues: Cue[] = []
  for (const block of blocks) {
    const lines = block.split("\n").filter((l) => l.trim().length > 0)
    const tcLine = lines.find((l) => l.includes("-->"))
    if (!tcLine) continue
    const [a, b] = tcLine.split("-->")
    const start = timecodeToSeconds(a)
    const end = timecodeToSeconds(b)
    const textLines = lines.filter((l) => l !== tcLine && !/^\d+$/.test(l.trim()))
    const text = textLines.join("\n").trim()
    if (start === null || end === null || !text) continue
    cues.push({ start, end: Math.max(end, start + 0.5), text })
  }
  return cues.sort((x, y) => x.start - y.start)
}

/**
 * 纯文本字幕:每行一句。若第一行形如 "0:05 句子" 则读取钉入的起点;
 * 无时间前缀的行,起点由用户在播放中钉入(初始 null 表示未钉)。
 */
export interface PlainCue {
  text: string
  start: number | null
}

export function parsePlainLines(input: string): PlainCue[] {
  return input
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const m = line.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s+(.*)$/)
      if (m) {
        const start = m[3]
          ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3])
          : Number(m[1]) * 60 + Number(m[2])
        return { text: m[4], start }
      }
      return { text: line, start: null }
    })
}
