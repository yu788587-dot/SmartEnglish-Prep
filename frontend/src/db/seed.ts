import readingSeeds from '@/seeds/reading-seeds.json'
import writingSeeds from '@/seeds/writing-topics.json'
import { db, newId } from './index'
import type { Passage, Question, Topic } from './types'

/**
 * 内置题库幂等播种:按固定 seed id 判断,已有则跳过(不覆盖用户可能的修改)。
 * 全部放进一个事务;失败即整体回滚,与导入导出的健壮性约定一致。
 */
export async function ensureSeeded(): Promise<void> {
  const now = new Date().toISOString()
  await db.transaction('rw', [db.passages, db.questions, db.topics], async () => {
    for (const p of readingSeeds.passages) {
      if (await db.passages.get(p.id)) continue
      const passage: Passage = {
        id: p.id,
        title: p.title,
        module: 'reading',
        level: p.level,
        contentMd: p.contentMd,
        source: p.source,
        createdAt: now,
      }
      await db.passages.put(passage)
    }
    for (const q of readingSeeds.questions) {
      if (await db.questions.get(q.id)) continue
      const question: Question = {
        id: q.id,
        passageId: q.passageId,
        type: q.type as Question['type'],
        stem: q.stem,
        options: q.options,
        answer: q.answer,
        explanation: q.explanation,
        order: q.order,
      }
      await db.questions.put(question)
    }
    for (const t of writingSeeds.topics) {
      if (await db.topics.get(t.id)) continue
      const topic: Topic = {
        id: t.id,
        examType: t.examType as Topic['examType'],
        prompt: t.prompt,
        category: t.category,
      }
      await db.topics.put(topic)
    }
  })
}

/** 空生词库等场景无需种子;此函数只服务题库。 */
export function makeAttemptId(): string {
  return newId()
}
