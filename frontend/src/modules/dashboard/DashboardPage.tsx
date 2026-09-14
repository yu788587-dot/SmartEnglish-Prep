import { useEffect, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { Button, Typography } from 'antd'
import { CheckOutlined, RedoOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { db } from '@/db'
import { ensureSeeded } from '@/db/seed'
// 账本样式与数据页共用(ledger / week strip / wrong book 都在 ledger 样式表)
import '../data/data.css'

function fmtDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.round((totalSeconds % 3600) / 60)
  return h > 0 ? `${h} h ${m} min` : `${m} min`
}

function dayKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10)
}

export default function DashboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  useEffect(() => {
    void ensureSeeded()
  }, [])

  const records = useLiveQuery(() => db.practiceRecords.toArray(), [])
  const reviews = useLiveQuery(() => db.essayReviews.toArray(), [])
  const notes = useLiveQuery(() => db.notes.toArray(), [])
  const sessions = useLiveQuery(() => db.studySessions.toArray(), [])
  const wrongs = useLiveQuery(
    async () => {
      const rows = await db.wrongQuestions.toArray()
      const questions = await db.questions.toArray()
      const records = await db.practiceRecords.toArray()
      const qById = new Map(questions.map((q) => [q.id, q]))
      const recById = new Map(records.map((r) => [r.id, r]))
      return rows
        .map((w) => ({
          ...w,
          question: qById.get(w.questionId),
          record: recById.get(w.recordId),
        }))
        .sort(
          (a, b) =>
            Number(a.resolved) - Number(b.resolved) ||
            (b.record?.createdAt ?? '').localeCompare(a.record?.createdAt ?? ''),
        )
    },
    [],
  )

  const stats = useMemo(() => {
    // 阅读正确率:每次交卷的正确率取平均
    const attempts = new Map<string, { correct: number; total: number }>()
    for (const r of records ?? []) {
      if (r.module !== 'reading') continue
      const a = attempts.get(r.attemptId) ?? { correct: 0, total: 0 }
      a.total += 1
      if (r.isCorrect) a.correct += 1
      attempts.set(r.attemptId, a)
    }
    const attemptValues = [...attempts.values()].map((a) => a.correct / a.total)
    const readingAccuracy =
      attemptValues.length > 0
        ? Math.round((attemptValues.reduce((s, v) => s + v, 0) / attemptValues.length) * 100)
        : null

    const graded = (reviews ?? []).filter(
      (r) => r.overall > 0 && !(r.feedback as { degraded?: boolean })?.degraded,
    )
    const writingAvg =
      graded.length > 0
        ? Math.round((graded.reduce((s, r) => s + r.overall, 0) / graded.length) * 10) / 10
        : null

    const totalSeconds = (sessions ?? []).reduce((s, x) => s + x.durationS, 0)

    // 最近 7 天每日时长(秒)
    const days: { key: string; label: string; seconds: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      days.push({ key, label: t(`dashboard.weekday.${d.getDay()}`), seconds: 0 })
    }
    const dayIndex = new Map(days.map((d, i) => [d.key, i]))
    for (const s of sessions ?? []) {
      const idx = dayIndex.get(dayKey(s.startAt))
      if (idx !== undefined) days[idx].seconds += s.durationS
    }
    return { readingAccuracy, writingAvg, noteCount: notes?.length ?? 0, totalSeconds, days }
  }, [records, reviews, notes, sessions, t])

  const maxSeconds = Math.max(60, ...stats.days.map((d) => d.seconds))
  const todayKey = new Date().toISOString().slice(0, 10)
  const openWrongs = (wrongs ?? []).filter((w) => !w.resolved)

  async function resolveWrong(id: string) {
    await db.wrongQuestions.update(id, { resolved: true })
  }

  async function retryWrong(questionId: string, passageId: string) {
    // 重刷 = 回到该文章精读页重新作答;同时销账本条
    const wrong = (wrongs ?? []).find((w) => w.questionId === questionId && !w.resolved)
    if (wrong) await db.wrongQuestions.update(wrong.id, { resolved: true })
    navigate(`/reading/${passageId}`)
  }

  return (
    <div className="dash-page">
      <Typography.Title level={2} style={{ fontFamily: 'var(--font-serif)' }}>
        {t('dashboard.title')}
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ maxWidth: '52ch' }}>
        {t('dashboard.subtitle')}
      </Typography.Paragraph>

      <div className="ledger">
        <div className="ledger-row">
          <span className="ledger-label">{t('dashboard.readingAccuracy')}</span>
          <span className="ledger-dots" aria-hidden />
          <span className="ledger-value">
            {stats.readingAccuracy !== null ? `${stats.readingAccuracy}%` : '—'}
          </span>
        </div>
        <div className="ledger-row">
          <span className="ledger-label">{t('dashboard.writingAvg')}</span>
          <span className="ledger-dots" aria-hidden />
          <span className="ledger-value">
            {stats.writingAvg !== null ? `${stats.writingAvg} / 9` : '—'}
          </span>
        </div>
        <div className="ledger-row">
          <span className="ledger-label">{t('dashboard.noteCount')}</span>
          <span className="ledger-dots" aria-hidden />
          <span className="ledger-value">{stats.noteCount}</span>
        </div>
        <div className="ledger-row">
          <span className="ledger-label">{t('dashboard.totalTime')}</span>
          <span className="ledger-dots" aria-hidden />
          <span className="ledger-value">{fmtDuration(stats.totalSeconds)}</span>
        </div>
      </div>

      <div className="section-label">{t('dashboard.last7')}</div>
      <div className="week-strip">
        {stats.days.map((d) => {
          const scale = Math.max(0.04, d.seconds / maxSeconds)
          return (
            <div className="week-col" key={d.key}>
              <span className="week-track">
                <span
                  className={`week-fill${d.key === todayKey ? ' is-today' : ''}`}
                  style={{ transform: `scaleY(${scale})` }}
                  title={`${d.key}: ${fmtDuration(d.seconds)}`}
                />
              </span>
              <span className="week-min">{Math.round(d.seconds / 60)}</span>
              <span className="week-label">{d.label}</span>
            </div>
          )
        })}
      </div>

      <div className="section-label">
        {t('dashboard.wrongBook')} · {openWrongs.length}
      </div>
      {(wrongs ?? []).length === 0 && (
        <Typography.Text type="secondary">{t('wrongbook.empty')}</Typography.Text>
      )}
      {(wrongs ?? []).map((w) => (
        <div className={`wrong-row${w.resolved ? ' is-resolved' : ''}`} key={w.id}>
          <div className="wrong-main">
            <span className="wrong-stem">{w.question?.stem ?? w.questionId}</span>
            {!w.resolved && w.question && (
              <span className="wrong-answers">
                <Typography.Text type="secondary">
                  {t('reading.session.yourAnswer')}:{' '}
                  {w.record?.userAnswer != null ? String(w.record.userAnswer) : '—'}
                </Typography.Text>
                <Typography.Text>
                  {t('reading.session.correctAnswer')}: {w.question.answer}
                </Typography.Text>
                {w.question.explanation && (
                  <Typography.Text type="secondary" className="wrong-explain">
                    {w.question.explanation}
                  </Typography.Text>
                )}
              </span>
            )}
          </div>
          <div className="wrong-actions">
            {!w.resolved && (
              <>
                <Button
                  size="small"
                  icon={<RedoOutlined />}
                  onClick={() => void retryWrong(w.questionId, w.question?.passageId ?? '')}
                >
                  {t('wrongbook.retry')}
                </Button>
                <Button size="small" onClick={() => void resolveWrong(w.id)}>
                  {t('wrongbook.resolve')}
                </Button>
              </>
            )}
            {w.resolved && <CheckOutlined className="wrong-resolved-mark" aria-label="resolved" />}
          </div>
        </div>
      ))}
      {(wrongs ?? []).length > 0 && (
        <Typography.Text type="secondary" className="wrong-hint">
          {t('wrongbook.hint', { n: openWrongs.length })}
        </Typography.Text>
      )}
    </div>
  )
}
