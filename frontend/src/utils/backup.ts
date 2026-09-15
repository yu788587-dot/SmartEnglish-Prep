import * as XLSX from 'xlsx'
import { db } from '@/db'
import type { Note } from '@/db/types'
import { APP_ID, BACKUP_TABLE_KEYS, SCHEMA_VERSION, type BackupData, type BackupFile } from '@/schemas/backup'

/** 导出:全表 → 备份对象。AI 配置的 apiKey 被抹除(隐私)。 */
export async function buildBackup(): Promise<BackupFile> {
  const [
    passages,
    questions,
    topics,
    essays,
    essayReviews,
    practiceRecords,
    wrongQuestions,
    translationExercises,
    notes,
    dictationRecords,
    studySessions,
    aiConversations,
    settings,
  ] = await Promise.all([
    db.passages.toArray(),
    db.questions.toArray(),
    db.topics.toArray(),
    db.essays.toArray(),
    db.essayReviews.toArray(),
    db.practiceRecords.toArray(),
    db.wrongQuestions.toArray(),
    db.translationExercises.toArray(),
    db.notes.toArray(),
    db.dictationRecords.toArray(),
    db.studySessions.toArray(),
    db.aiConversations.toArray(),
    db.settings.toArray(),
  ])
  // 隐私:apiKey 不出设备;导入端对空 apiKey 不覆盖本地
  const safeSettings = settings.map((s) =>
    s.key === 'ai'
      ? { ...s, value: JSON.stringify({ ...(JSON.parse(s.value) as Record<string, unknown>), apiKey: '' }) }
      : s,
  )
  return {
    app: APP_ID,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      passages,
      questions,
      topics,
      essays,
      essayReviews,
      practiceRecords,
      wrongQuestions,
      translationExercises,
      notes,
      dictationRecords,
      studySessions,
      aiConversations,
      settings: safeSettings,
    },
  }
}

export function downloadJson(backup: BackupFile): void {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  triggerDownload(blob, `smartenglish-prep-backup-${stamp()}.json`)
}

/** xlsx 为人读格式(单向导出):学习记录 / 错题 / 作文 / 生词 / 学习时长 各一张表。 */
export async function downloadXlsx(): Promise<void> {
  const backup = await buildBackup()
  const d = backup.data
  const wb = XLSX.utils.book_new()

  const attemptScore = new Map<string, { correct: number; total: number }>()
  for (const r of d.practiceRecords) {
    const a = attemptScore.get(r.attemptId) ?? { correct: 0, total: 0 }
    a.total += 1
    if (r.isCorrect) a.correct += 1
    attemptScore.set(r.attemptId, a)
  }
  const questionById = new Map(d.questions.map((q) => [q.id, q]))
  const recordById = new Map(d.practiceRecords.map((r) => [r.id, r]))

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      d.practiceRecords.map((r) => ({
        时间: r.createdAt,
        模块: r.module,
        题目: questionById.get(r.questionId)?.stem ?? r.questionId,
        你的答案: JSON.stringify(r.userAnswer),
        是否正确: r.isCorrect ? '✓' : '✗',
        本次得分: attemptScore.get(r.attemptId)
          ? `${attemptScore.get(r.attemptId)!.correct}/${attemptScore.get(r.attemptId)!.total}`
          : '',
      })),
    ),
    '练习记录',
  )
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      d.wrongQuestions.map((w) => ({
        记录时间: recordById.get(w.recordId)?.createdAt ?? '',
        题目: questionById.get(w.questionId)?.stem ?? w.questionId,
        已掌握: w.resolved ? '✓' : '',
        重刷次数: w.reviewCount,
      })),
    ),
    '错题本',
  )
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      d.essays.map((e) => {
        const review = d.essayReviews
          .filter((r) => r.essayId === e.id)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
        return {
          更新: e.updatedAt,
          题目: e.prompt?.slice(0, 60) ?? e.topicId ?? '',
          词数: e.wordCount,
          批改总分: review?.overall ?? '',
          模型: review?.model ?? '',
        }
      }),
    ),
    '作文',
  )
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      d.notes
        .filter((n) => !n.deletedAt)
        .map((n) => ({
          创建: n.createdAt,
          词条: n.word,
          音标: n.phonetic ?? '',
          释义: n.meaning ?? '',
          熟悉度: `${n.mastery ?? 0}/5`,
          复习次数: n.reviewCount ?? 0,
          听写错误: n.dictationWrong ?? 0,
          标签: (n.tags ?? []).join(', '),
          来源: n.source ?? '',
          释义摘要: typeof n.aiExplanation === 'object' && n.aiExplanation ? JSON.stringify(n.aiExplanation).slice(0, 200) : '',
        })),
    ),
    '生词本',
  )
  const noteById = new Map(d.notes.map((n) => [n.id, n]))
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      d.dictationRecords.map((r) => ({
        时间: new Date(r.createdAt).toLocaleString(),
        词条: noteById.get(r.noteId)?.word ?? r.noteId,
        你的拼写: r.userAnswer,
        结果: r.isCorrect ? '✓' : '✗',
      })),
    ),
    '听写记录',
  )
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      d.studySessions.map((s) => ({
        开始: s.startAt,
        模块: s.module,
        时长秒: s.durationS,
      })),
    ),
    '学习时长',
  )
  XLSX.writeFile(wb, `smartenglish-prep-${stamp()}.xlsx`)
}

/**
 * 兼容 v1 备份:回填 M9 新增字段,保证新旧记录在读取侧同构。
 * 墓碑(deletedAt)原样保留——换设备时已删词条不能再复活。
 */
function normalizeNote(row: unknown): Note {
  const n = row as Note
  return {
    ...n,
    phonetic: n.phonetic ?? undefined,
    meaning: n.meaning ?? undefined,
    pos: n.pos ?? undefined,
    example: n.example ?? undefined,
    exampleZh: n.exampleZh ?? undefined,
    context: n.context ?? undefined,
    source: n.source ?? 'manual',
    starred: n.starred ?? false,
    mastery: n.mastery ?? 0,
    reviewCount: n.reviewCount ?? 0,
    dictationWrong: n.dictationWrong ?? 0,
    updatedAt: n.updatedAt ?? n.createdAt,
    deletedAt: n.deletedAt ?? undefined,
  }
}

function stamp(): string {
  return new Date().toISOString().slice(0, 10)
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export interface ImportOutcome {
  perTable: { key: string; found: number; written: number; skipped: number }[]
}

/**
 * 导入:校验已由调用方完成(backupFileSchema),此处按策略事务写入。
 * 覆盖(overwrite)与跳过(skip,同 id 保留本地)二选一;apiKey 为空的 AI 配置不覆盖。
 */
export async function applyBackup(
  data: BackupData,
  strategy: 'overwrite' | 'skip',
): Promise<ImportOutcome> {
  const outcome: ImportOutcome = { perTable: [] }
  const stores = {
    passages: db.passages,
    questions: db.questions,
    topics: db.topics,
    essays: db.essays,
    essayReviews: db.essayReviews,
    practiceRecords: db.practiceRecords,
    wrongQuestions: db.wrongQuestions,
    translationExercises: db.translationExercises,
    notes: db.notes,
    dictationRecords: db.dictationRecords,
    studySessions: db.studySessions,
    aiConversations: db.aiConversations,
    settings: db.settings,
  } as const

  await db.transaction('rw', Object.values(stores), async () => {
    for (const key of BACKUP_TABLE_KEYS) {
      const store = stores[key]
      const rows = data[key] as { id?: string; key?: string }[]
      let written = 0
      let skipped = 0
      for (const row of rows) {
        const pk = 'key' in row && store === stores.settings ? (row.key as string) : (row.id as string)
        if (strategy === 'skip' && (await store.get(pk)) !== undefined) {
          skipped += 1
          continue
        }
        if (key === 'settings' && pk === 'ai') {
          const parsed = JSON.parse((row as { value: string }).value) as Record<string, unknown>
          if (!parsed.apiKey) {
            skipped += 1
            continue
          }
        }
        await store.put((key === 'notes' ? normalizeNote(row) : row) as never)
        written += 1
      }
      outcome.perTable.push({ key, found: rows.length, written, skipped })
    }
  })
  return outcome
}

/** 清空学习数据(保留种子题库;设置与 AI 配置保留)。 */
export async function clearLearningData(): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.essays,
      db.essayReviews,
      db.practiceRecords,
      db.wrongQuestions,
      db.translationExercises,
      db.notes,
      db.dictationRecords,
      db.studySessions,
      db.aiConversations,
    ],
    async () => {
      await Promise.all([
        db.essays.clear(),
        db.essayReviews.clear(),
        db.practiceRecords.clear(),
        db.wrongQuestions.clear(),
        db.translationExercises.clear(),
      db.notes.clear(),
      db.dictationRecords.clear(),
      db.studySessions.clear(),
        db.aiConversations.clear(),
      ])
    },
  )
}
