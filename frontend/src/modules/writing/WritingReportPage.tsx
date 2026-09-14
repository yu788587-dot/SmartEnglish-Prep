import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Spin, Typography, message } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { db, newId } from '@/db'
import type { ReviewIssue } from '@/schemas/grading'
import {
  essayReviewDataSchema,
  isCetScores,
  isIeltsScores,
  type EssayReviewData,
} from '@/schemas/grading'
import { AiNotConfiguredError, loadAiConfig } from '@/api/ai-client'
import { gradeEssay } from '@/api/grading'
import i18n from '@/i18n'
import './writing.css'

/** 把问题片段在原句中标记出来;重叠区间按顺序合并,避免嵌套替换。 */
function renderMarked(original: string, issues: ReviewIssue[]) {
  const ranges: Array<{ start: number; end: number }> = []
  for (const issue of issues) {
    if (!issue.excerpt) continue
    const idx = original.indexOf(issue.excerpt)
    if (idx >= 0) ranges.push({ start: idx, end: idx + issue.excerpt.length })
  }
  ranges.sort((a, b) => a.start - b.start)
  const merged: Array<{ start: number; end: number }> = []
  for (const r of ranges) {
    const last = merged[merged.length - 1]
    if (last && r.start < last.end) continue
    merged.push(r)
  }
  if (merged.length === 0) return original
  const parts: React.ReactNode[] = []
  let cursor = 0
  merged.forEach((r, i) => {
    if (r.start > cursor) parts.push(original.slice(cursor, r.start))
    parts.push(
      <span className="issue-mark" key={i}>
        {original.slice(r.start, r.end)}
      </span>,
    )
    cursor = r.end
  })
  if (cursor < original.length) parts.push(original.slice(cursor))
  return parts
}

export default function WritingReportPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { essayId = '' } = useParams()

  const essay = useLiveQuery(() => db.essays.get(essayId), [essayId])
  const review = useLiveQuery(
    async () => {
      const rows = await db.essayReviews.where('essayId').equals(essayId).toArray()
      return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
    },
    [essayId],
  )
  const topic = useLiveQuery(
    async () => (essay?.topicId ? db.topics.get(essay.topicId) : undefined),
    [essay?.topicId],
  )

  const [regrading, setRegrading] = useState(false)

  const feedback = useMemo<
    { degraded: false; data: EssayReviewData } | { degraded: true; raw: string } | null
  >(() => {
    if (!review) return null
    const parsed = essayReviewDataSchema.safeParse(review.feedback)
    if (parsed.success) return { degraded: false, data: parsed.data }
    const f = review.feedback as { degraded?: boolean; raw?: string }
    if (f?.degraded) return { degraded: true, raw: f.raw ?? '' }
    return { degraded: true, raw: JSON.stringify(review.feedback, null, 2) }
  }, [review])

  async function regrade() {
    if (!essay) return
    setRegrading(true)
    try {
      const config = await loadAiConfig()
      const examType = topic?.examType ?? 'ielts_t2'
      const promptText = topic?.prompt ?? essay.prompt ?? ''
      const res = await gradeEssay(config, examType, promptText, essay.content, i18n.language)
      const now = new Date().toISOString()
      if (res.ok) {
        await db.essayReviews.put({
          id: newId(),
          essayId: essay.id,
          model: config.model,
          scores: res.data.scores,
          overall: res.data.overall,
          feedback: res.data,
          summary: res.data.summary,
          createdAt: now,
        })
        message.success(t('writing.report.regraded'))
      } else {
        await db.essayReviews.put({
          id: newId(),
          essayId: essay.id,
          model: config.model,
          scores: {},
          overall: 0,
          feedback: { degraded: true, raw: res.rawText },
          summary: '',
          createdAt: now,
        })
        message.info(t('writing.editor.degradedNote'))
      }
    } catch (e) {
      if (e instanceof AiNotConfiguredError) message.warning(t('writing.editor.needConfig'))
      else message.error(`${t('reading.lens.error')}: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setRegrading(false)
    }
  }

  if (!essay) {
    return (
      <div className="report-loading">
        <Spin />
      </div>
    )
  }

  const examType = topic?.examType ?? 'ielts_t2'
  const reviewData: EssayReviewData | null = feedback && !feedback.degraded ? feedback.data : null
  const ielts = reviewData && isIeltsScores(reviewData.scores) ? reviewData.scores : null
  const cet = reviewData && isCetScores(reviewData.scores) ? reviewData.scores : null

  return (
    <div className="report-page">
      <header className="report-header">
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/writing')}>
          {t('writing.report.back')}
        </Button>
        <h1 className="report-title">
          {topic?.category ?? t(`writing.exam.${examType}`)} · {t('writing.report.title')}
        </h1>
        <span className="report-meta">
          {essay.wordCount} {t('writing.list.words')} · {new Date(essay.updatedAt).toLocaleDateString()}
        </span>
        <Button size="small" onClick={() => navigate(`/writing/write/${essay.topicId ?? ''}`)}>
          {t('writing.report.viewEssay')}
        </Button>
        <Button size="small" type="primary" loading={regrading} onClick={() => void regrade()}>
          {t('writing.report.regrade')}
        </Button>
      </header>

      {!review && (
        <Typography.Paragraph type="secondary" style={{ marginTop: 24 }}>
          {t('writing.report.noReview')}
        </Typography.Paragraph>
      )}

      {review && feedback?.degraded && (
        <>
          <Typography.Text type="secondary">{t('writing.report.degraded')}</Typography.Text>
          <div className="report-raw">{feedback.raw}</div>
        </>
      )}

      {review && reviewData && (
        <>
          <div className="score-overall">
            <span className="score-overall-number">{reviewData.overall}</span>
            <span className="score-overall-scale">
              {isIeltsScores(reviewData.scores) ? '/ 9' : '/ 15'}
            </span>
            <span className="score-overall-label">{t('writing.report.overall')}</span>
            <span className="report-meta">
              {review.model} · {new Date(review.createdAt).toLocaleString()}
            </span>
          </div>

          {ielts && (
            <div className="dim-rows">
              {(['TR', 'CC', 'LR', 'GRA'] as const).map((dim) => (
                <div className="dim-row" key={dim}>
                  <span className="dim-name">
                    {t(`writing.dims.${dim}`)}
                    <small>{dim}</small>
                  </span>
                  <span className="dim-bar">
                    <span style={{ width: `${(ielts[dim] / 9) * 100}%` }} />
                  </span>
                  <span className="dim-value">{ielts[dim]}</span>
                </div>
              ))}
            </div>
          )}

          {cet && (
            <div style={{ padding: '16px 0', borderBottom: '1px solid var(--hairline)' }}>
              <span className="cet-band-badge">
                {t('writing.report.band')} {cet.band} ·{' '}
                {t(`writing.bandDesc.${Math.round(cet.band)}`)}
              </span>
            </div>
          )}

          <div className="report-section-label">{t('writing.report.summary')}</div>
          <p className="report-summary">{reviewData.summary}</p>

          <div className="report-section-label">{t('writing.report.sentences')}</div>
          {reviewData.sentences.map((s) => (
            <div className="sentence-block" key={s.index}>
              <p className="sentence-original">{renderMarked(s.original, s.issues)}</p>
              {s.issues.length > 0 && (
                <div className="issue-list">
                  {s.issues.map((iss, i) => (
                    <span className="issue-item" key={i}>
                      <span className="issue-tag">{t(`writing.issues.${iss.type}`)}</span>
                      <span>
                        <span className="issue-excerpt">{iss.excerpt}</span> → {iss.suggestion}
                        <span style={{ color: 'var(--ink-tertiary)' }}> · {iss.explanation}</span>
                      </span>
                    </span>
                  ))}
                </div>
              )}
              {s.polished !== s.original && (
                <div className="sentence-polished">
                  <span className="polished-label">{t('writing.report.polished')}</span>
                  {s.polished}
                </div>
              )}
            </div>
          ))}

          {reviewData.vocabulary_upgrades && reviewData.vocabulary_upgrades.length > 0 && (
            <>
              <div className="report-section-label">{t('writing.report.vocab')}</div>
              <div className="vocab-chips">
                {reviewData.vocabulary_upgrades.map((v, i) => (
                  <span className="vocab-chip" key={i}>
                    {v.from}
                    <small>→</small>
                    {v.to}
                  </span>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
