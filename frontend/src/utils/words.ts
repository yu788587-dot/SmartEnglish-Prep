import { db, LOCAL_USER_ID, newId } from '@/db'
import type { Note } from '@/db/types'

/** 词条的规范化比较键:忽略大小写与首尾空白,用于去重与查重。 */
export function wordKey(word: string): string {
  return word.trim().toLowerCase()
}

/** 排序与增量比较用的时间戳:旧记录没有 updatedAt,一律回落到 createdAt。 */
export function updatedAtOf(note: Pick<Note, 'updatedAt' | 'createdAt'>): string {
  return note.updatedAt ?? note.createdAt
}

export interface WordInput {
  word: string
  phonetic?: string
  meaning?: string
  pos?: string
  example?: string
  exampleZh?: string
  context?: string
  source?: string
  tags?: string[]
  aiExplanation?: unknown
}

function clean(v: string | undefined): string | undefined {
  const s = v?.trim()
  return s ? s : undefined
}

/**
 * 存入单词本。
 *
 * 同名词条(忽略大小写)走合并而非新建:已人工填写的字段不被覆盖,
 * 只补齐缺失项——这样「阅读存词」不会冲掉用户在单词本里改过的释义。
 * 已删除的词条再次存入等同于主动恢复(清掉墓碑)。
 */
export async function saveWord(input: WordInput): Promise<{ note: Note; merged: boolean }> {
  const word = clean(input.word)?.slice(0, 80)
  if (!word) throw new Error('word is required')

  const now = new Date().toISOString()
  const key = wordKey(word)
  const existing = await db.notes
    .filter((n) => n.userId === LOCAL_USER_ID && wordKey(n.word) === key)
    .first()

  if (existing) {
    const merged: Note = {
      ...existing,
    phonetic: existing.phonetic ?? clean(input.phonetic),
    meaning: existing.meaning ?? clean(input.meaning),
    pos: existing.pos ?? clean(input.pos),
    example: existing.example ?? clean(input.example),
    exampleZh: existing.exampleZh ?? clean(input.exampleZh),
    context: existing.context ?? clean(input.context),
      aiExplanation: existing.aiExplanation ?? input.aiExplanation,
      tags: input.tags?.length ? input.tags : existing.tags,
      deletedAt: undefined,
      updatedAt: now,
    }
    await db.notes.put(merged)
    return { note: merged, merged: true }
  }

  const note: Note = {
    id: newId(),
    userId: LOCAL_USER_ID,
    word,
    phonetic: clean(input.phonetic),
    meaning: clean(input.meaning),
    pos: clean(input.pos),
    example: clean(input.example),
    exampleZh: clean(input.exampleZh),
    context: clean(input.context),
    aiExplanation: input.aiExplanation,
    tags: input.tags ?? [],
    source: input.source ?? 'manual',
    starred: false,
    mastery: 0,
    reviewCount: 0,
    dictationWrong: 0,
    createdAt: now,
    updatedAt: now,
  }
  await db.notes.put(note)
  return { note, merged: false }
}

/** 软删除:保留墓碑,避免跨设备导入时被复活。 */
export async function deleteWord(id: string): Promise<void> {
  await db.notes.update(id, { deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
}

export async function updateWord(id: string, patch: Partial<Note>): Promise<void> {
  await db.notes.update(id, { ...patch, updatedAt: new Date().toISOString() })
}
