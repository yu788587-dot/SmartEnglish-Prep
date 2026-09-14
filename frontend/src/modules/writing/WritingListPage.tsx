import { useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { Spin, Typography } from 'antd'
import { ArrowRightOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { db } from '@/db'
import { ensureSeeded } from '@/db/seed'
import type { Topic } from '@/db/types'
import './writing.css'

const EXAM_ORDER: Topic['examType'][] = ['ielts_t2', 'cet4', 'cet6']

export default function WritingListPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  useEffect(() => {
    void ensureSeeded()
  }, [])

  const topics = useLiveQuery(() => db.topics.toArray(), [])
  const essays = useLiveQuery(
    async () => {
      const rows = await db.essays.toArray()
      const reviews = await db.essayReviews.toArray()
      return rows
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .map((e) => ({
          ...e,
          review: reviews
            .filter((r) => r.essayId === e.id)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0],
        }))
    },
    [],
  )

  const grouped = EXAM_ORDER.map((exam) => ({
    exam,
    items: (topics ?? []).filter((t) => t.examType === exam),
  })).filter((g) => g.items.length > 0)

  if (!topics || !essays) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
        <Spin />
      </div>
    )
  }

  return (
    <div className="writing-page">
      <Typography.Title level={2} style={{ fontFamily: 'var(--font-serif)' }}>
        {t('writing.list.title')}
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ maxWidth: '52ch' }}>
        {t('writing.list.subtitle')}
      </Typography.Paragraph>

      {grouped.map((g) => (
        <section key={g.exam}>
          <div className="writing-group-label">{t(`writing.exam.${g.exam}`)}</div>
          {g.items.map((topic) => (
            <button
              key={topic.id}
              type="button"
              className="writing-row"
              onClick={() => navigate(`/writing/write/${topic.id}`)}
            >
              <span className="writing-row-title">{topic.prompt}</span>
              <span className="writing-row-meta">
                {topic.category && <span>{topic.category}</span>}
                <ArrowRightOutlined className="writing-row-arrow" />
              </span>
            </button>
          ))}
        </section>
      ))}

      {essays.length > 0 && (
        <section style={{ marginTop: 40 }}>
          <div className="writing-group-label">{t('writing.list.myEssays')}</div>
          {essays.map((e) => (
            <button
              key={e.id}
              type="button"
              className="writing-row"
              onClick={() => navigate(`/writing/report/${e.id}`)}
            >
              <span className="writing-row-title">{e.prompt ?? e.content.slice(0, 80)}</span>
              <span className="writing-row-meta">
                <span>
                  {e.wordCount} {t('writing.list.words')}
                </span>
                <span>{new Date(e.updatedAt).toLocaleDateString()}</span>
                {e.review &&
                  !(e.review.feedback as { degraded?: boolean })?.degraded && (
                    <span className="writing-row-band">
                      {t('writing.list.reviewed')} {e.review.overall}
                    </span>
                  )}
                <ArrowRightOutlined className="writing-row-arrow" />
              </span>
            </button>
          ))}
        </section>
      )}

      {topics.length === 0 && (
        <Typography.Text type="secondary">{t('writing.list.empty')}</Typography.Text>
      )}
    </div>
  )
}
