import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { ArrowRightOutlined } from '@ant-design/icons'
import { db } from '@/db'
import { ensureSeeded } from '@/db/seed'
import { useEffect } from 'react'
import './reading.css'

interface Row {
  id: string
  title: string
  level: string
  count: number
  best: number | null
}

export default function ReadingListPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  useEffect(() => {
    void ensureSeeded()
  }, [])

  const rows = useLiveQuery(async (): Promise<Row[]> => {
    const passages = await db.passages.where('module').equals('reading').toArray()
    const questions = await db.questions.toArray()
    const records = await db.practiceRecords.where('module').equals('reading').toArray()
    return passages
      .map((p) => {
        const qs = questions.filter((q) => q.passageId === p.id)
        const attempts = new Map<string, { correct: number; total: number }>()
        for (const r of records) {
          if (r.passageId !== p.id) continue
          const a = attempts.get(r.attemptId) ?? { correct: 0, total: 0 }
          a.total += 1
          if (r.isCorrect) a.correct += 1
          attempts.set(r.attemptId, a)
        }
        const best = attempts.size
          ? Math.max(...[...attempts.values()].map((a) => a.correct / a.total))
          : null
        return { id: p.id, title: p.title, level: p.level, count: qs.length, best }
      })
      .sort((a, b) => a.level.localeCompare(b.level) || a.title.localeCompare(b.title))
  }, [])

  const rowsFallback = useMemo(() => rows ?? [], [rows])

  return (
    <div className="reading-list">
      <Typography.Title level={2} style={{ fontFamily: 'var(--font-serif)' }}>
        {t('reading.list.title')}
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ maxWidth: '52ch' }}>
        {t('reading.list.subtitle')}
      </Typography.Paragraph>

      <div className="toc" role="list">
        {rowsFallback.map((row, i) => (
          <button
            key={row.id}
            type="button"
            role="listitem"
            className="toc-row"
            onClick={() => navigate(`/reading/${row.id}`)}
          >
            <span className="toc-num">{String(i + 1).padStart(2, '0')}</span>
            <span className="toc-title">{row.title}</span>
            <span className="toc-leader" aria-hidden />
            <span className="toc-meta">
              <span className="toc-level">{t(`reading.levels.${row.level}`)}</span>
              <span>
                {row.count} {t('reading.list.questions')}
              </span>
              {row.best !== null && (
                <span className="toc-best">
                  {t('reading.list.best')} {Math.round(row.best * 100)}%
                </span>
              )}
              <ArrowRightOutlined className="toc-arrow" />
            </span>
          </button>
        ))}
        {rowsFallback.length === 0 && (
          <Typography.Text type="secondary">{t('reading.list.empty')}</Typography.Text>
        )}
      </div>
    </div>
  )
}
