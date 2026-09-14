import { useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { Spin, Typography } from 'antd'
import { ArrowRightOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { db } from '@/db'
import { ensureSeeded } from '@/db/seed'
import './translation.css'

export default function TranslationListPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  useEffect(() => {
    void ensureSeeded()
  }, [])

  const topics = useLiveQuery(() => db.translationTopics.toArray(), [])
  const exercises = useLiveQuery(
    async () =>
      (await db.translationExercises.toArray()).sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      ),
    [],
  )

  if (!topics || !exercises) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
        <Spin />
      </div>
    )
  }

  return (
    <div className="trans-page">
      <Typography.Title level={2} style={{ fontFamily: 'var(--font-serif)' }}>
        {t('translation.list.title')}
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ maxWidth: '52ch' }}>
        {t('translation.list.subtitle')}
      </Typography.Paragraph>

      <div>
        {topics.map((topic) => (
          <button
            key={topic.id}
            type="button"
            className="trans-row"
            onClick={() => navigate(`/translation/work/${topic.id}`)}
          >
            <span className="trans-row-title">{topic.title}</span>
            <span className="trans-leader" aria-hidden />
            <span className="trans-row-meta">
              <span>{topic.sourceText.slice(0, 18)}…</span>
              <ArrowRightOutlined className="trans-arrow" />
            </span>
          </button>
        ))}
      </div>

      {exercises.length > 0 && (
        <section style={{ marginTop: 40 }}>
          <div className="section-label">{t('translation.list.history')}</div>
          {exercises.map((e) => (
            <button
              key={e.id}
              type="button"
              className="trans-row"
              onClick={() => navigate(`/translation/work/${e.id}`)}
            >
              <span className="trans-row-title">{e.sourceText.slice(0, 32)}…</span>
              <span className="trans-row-meta">
                <span>{new Date(e.createdAt).toLocaleString()}</span>
                {e.aiFeedback != null && <span className="trans-row-band">{t('translation.list.graded')}</span>}
                <ArrowRightOutlined className="trans-arrow" />
              </span>
            </button>
          ))}
        </section>
      )}
    </div>
  )
}
