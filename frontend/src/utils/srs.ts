/**
 * 单词本的间隔重复(SRS):熟悉度 0–5 档,每档一个复习间隔。
 * 档位语义——0 陌生 · 1 见过 · 2 模糊 · 3 记得 · 4 熟 · 5 已掌握(不再自动排队)。
 */

export const MASTERY_MAX = 5

/** 下标 = 答对后的新档位;单位分钟。 */
export const INTERVALS_MIN = [
  10,
  24 * 60,
  3 * 24 * 60,
  7 * 24 * 60,
  15 * 24 * 60,
  30 * 24 * 60,
]

/** 答错:熟悉度归零,10 分钟后重新排队。 */
const LAPSE_INTERVAL_MIN = 10

export interface GradeResult {
  mastery: number
  nextReviewAt: string
  lastReviewedAt: string
  reviewCount: number
}

function clamp(mastery: number): number {
  if (!Number.isFinite(mastery)) return 0
  return Math.min(MASTERY_MAX, Math.max(0, Math.round(mastery)))
}

/** 一次复习/听写判定后的档位与排期。传 now 便于测试与批量判定。 */
export function gradeWord(input: {
  mastery?: number
  reviewCount?: number
  correct: boolean
  now?: Date
}): GradeResult {
  const now = input.now ?? new Date()
  const prev = clamp(input.mastery ?? 0)
  const prevCount = input.reviewCount ?? 0

  const mastery = input.correct ? Math.min(MASTERY_MAX, prev + 1) : 0
  const minutes = input.correct ? INTERVALS_MIN[mastery] : LAPSE_INTERVAL_MIN

  return {
    mastery,
    lastReviewedAt: now.toISOString(),
    nextReviewAt: new Date(now.getTime() + minutes * 60_000).toISOString(),
    reviewCount: prevCount + 1,
  }
}

export function isMastered(mastery?: number): boolean {
  return clamp(mastery ?? 0) >= MASTERY_MAX
}

/**
 * 是否该复习了。已掌握的不排队;旧数据没有 nextReviewAt(视为新词)立即排队。
 * mastery 缺省时按 0 处理,已掌握判断由 mastery 负责,这里只看时间。
 */
export function isDue(note: { nextReviewAt?: string }, now: number = Date.now()): boolean {
  if (!note.nextReviewAt) return true
  const at = new Date(note.nextReviewAt).getTime()
  if (Number.isNaN(at)) return true
  return at <= now
}

/** 待复习 = 未掌握 且 已到期。 */
export function isPendingReview(note: { mastery?: number; nextReviewAt?: string }, now?: number): boolean {
  return !isMastered(note.mastery) && isDue(note, now)
}
