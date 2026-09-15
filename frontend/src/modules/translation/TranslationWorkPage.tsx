import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Spin, Typography, message } from 'antd'
import { ArrowLeftOutlined, BookOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { db, LOCAL_USER_ID, newId } from '@/db'
import { ensureSeeded } from '@/db/seed'
import { AiNotConfiguredError } from '@/api/ai-client'
import { gradeTranslation } from '@/api/translation'
import {
  translationFeedbackSchema,
  type TranslationFeedback,
} from '@/schemas/translation'
import { saveWord } from '@/utils/words'
import i18n from '@/i18n'
import './translation.css'

type FeedbackState =
  | { status: 'result'; data: TranslationFeedback }
  | { status: 'degraded'; raw: string }
  | null

export default function TranslationWorkPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id = '' } = useParams()

  useEffect(() => {
    void ensureSeeded()
  }, [])

  const topic = useLiveQuery(() => db.translationTopics.get(id), [id])
  const exercise = useLiveQuery(() => db.translationExercises.get(id), [id])

  const [draft, setDraft] = useState('')
  const [draftTouched, setDraftTouched] = useState(false)
  const [grading, setGrading] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackState>(null)
  const resultRef = useRef<HTMLDivElement | null>(null)
  const mountedAt = useMemo(() => new Date().toISOString(), [])

  // 路由参数变化时重置状态(同一路由模式不重挂载,残留状态会吞掉新练习的回填)
  useEffect(() => {
    setDraft('')
    setDraftTouched(false)
    setFeedback(null)
  }, [id])

  // 进入页面:草稿来自历史练习(若 id 是练习记录),否则空白
  useEffect(() => {
    if (exercise && !draftTouched) {
      setDraft(exercise.userTranslation)
      if (exercise.aiFeedback) {
        const parsed = translationFeedbackSchema.safeParse(exercise.aiFeedback)
        if (parsed.success) setFeedback({ status: 'result', data: parsed.data })
        else setFeedback({ status: 'degraded', raw: JSON.stringify(exercise.aiFeedback, null, 2) })
      }
    }
  }, [exercise, draftTouched])

  // 未离开即记录学习时长
  useEffect(() => {
    return () => {
      const duration = Math.round((Date.now() - new Date(mountedAt).getTime()) / 1000)
      if (duration >= 5) {
        void db.studySessions.put({
          id: newId(),
          userId: LOCAL_USER_ID,
          module: 'translation',
          startAt: mountedAt,
          durationS: duration,
        })
      }
    }
  }, [mountedAt])

  const sourceText = topic?.sourceText ?? exercise?.sourceText ?? ''
  const refTranslation = topic?.refTranslation ?? exercise?.refTranslation ?? ''

  async function submit() {
    const text = draft.trim()
    if (text.length < 10) {
      message.warning(t('translation.work.tooShort'))
      return
    }
    setGrading(true)
    try {
      const res = await gradeTranslation(sourceText, refTranslation, text, i18n.language)
      const now = new Date().toISOString()
      const recordId = newId()
      if (res.ok) {
        await db.translationExercises.put({
          id: recordId,
          userId: LOCAL_USER_ID,
          sourceText,
          refTranslation,
          userTranslation: text,
          aiFeedback: res.data,
          createdAt: now,
        })
        setFeedback({ status: 'result', data: res.data })
      } else {
        await db.translationExercises.put({
          id: recordId,
          userId: LOCAL_USER_ID,
          sourceText,
          refTranslation,
          userTranslation: text,
          aiFeedback: { degraded: true, raw: res.rawText },
          createdAt: now,
        })
        setFeedback({ status: 'degraded', raw: res.rawText })
        message.info(t('translation.work.degradedNote'))
      }
      setTimeout(
        () => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
        100,
      )
    } catch (e) {
      if (e instanceof AiNotConfiguredError) message.warning(t('translation.work.needConfig'))
      else message.error(`${t('reading.lens.error')}: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setGrading(false)
    }
  }

  if (!topic && !exercise) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
        <Spin />
      </div>
    )
  }

  const title = topic?.title ?? t('translation.work.historyTitle')

  return (
    <div className="trans-work">
      <header className="trans-header">
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/translation')}>
          {t('translation.work.back')}
        </Button>
        <h1 className="trans-title">{title}</h1>
        <Button type="primary" loading={grading} onClick={() => void submit()}>
          {grading ? t('translation.work.grading') : t('translation.work.submit')}
        </Button>
      </header>

      <div className="section-label">{t('translation.work.sourceLabel')}</div>
      <p className="trans-source">{sourceText}</p>

      <div className="section-label">{t('translation.work.draftLabel')}</div>
      <textarea
        className="trans-draft"
        value={draft}
        onChange={(e) => {
          setDraftTouched(true)
          setDraft(e.target.value)
        }}
        placeholder={t('translation.work.placeholder')}
        spellCheck={false}
      />

      <div ref={resultRef}>
        {feedback?.status === 'degraded' && (
          <>
            <Typography.Text type="secondary">{t('translation.report.degraded')}</Typography.Text>
            <div className="report-raw">{feedback.raw}</div>
          </>
        )}
        {feedback?.status === 'result' && (
          <TranslationResult feedback={feedback.data} refTranslation={refTranslation} />
        )}
      </div>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="section-label">{children}</div>
}

function TranslationResult({
  feedback,
  refTranslation,
}: {
  feedback: TranslationFeedback
  refTranslation: string
}) {
  const { t } = useTranslation()
  const [savedVocab, setSavedVocab] = useState<Record<string, true>>({})

  async function saveVocab(word: string, gloss?: string) {
    try {
      const { merged } = await saveWord({
        word,
        meaning: gloss,
        source: 'translation',
        tags: ['translation'],
      })
      setSavedVocab((prev) => ({ ...prev, [word.toLowerCase()]: true }))
      message.success(merged ? t('words.mergedToast') : t('words.savedToast'))
    } catch (e) {
      message.error(e instanceof Error ? e.message : String(e))
    }
  }

  function renderMarked(original: string, issues: TranslationFeedback['sentences'][number]['issues']) {
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

  return (
    <div>
      <Label>{t('translation.result.comment')}</Label>
      <p className="trans-comment">{feedback.comment}</p>

      <Label>{t('translation.result.overall')}</Label>
      <div className="trans-polished-block">{feedback.overallPolished}</div>

      <Label>{t('translation.result.sentences')}</Label>
      {feedback.sentences.map((s) => (
        <div className="sentence-block" key={s.index}>
          <p className="sentence-original">{renderMarked(s.user, s.issues)}</p>
          {s.issues.length > 0 && (
            <div className="issue-list">
              {s.issues.map((iss, i) => (
                <span className="issue-item" key={i}>
                  <span className="issue-tag">{t(`translation.issues.${iss.type}`)}</span>
                  <span>
                    <span className="issue-excerpt">{iss.excerpt}</span> → {iss.suggestion}
                    <span style={{ color: 'var(--ink-tertiary)' }}> · {iss.explanation}</span>
                  </span>
                </span>
              ))}
            </div>
          )}
          {s.polished !== s.user && (
            <div className="sentence-polished">
              <span className="polished-label">{t('translation.report.polished')}</span>
              {s.polished}
              {s.referenceFragment && (
                <span className="polished-ref">
                  {t('translation.result.reference')}: {s.referenceFragment}
                </span>
              )}
            </div>
          )}
        </div>
      ))}

      <div className="section-label">{t('translation.result.referenceFull')}</div>
      <div className="trans-ref-block">{refTranslation}</div>

      {feedback.vocabulary && feedback.vocabulary.length > 0 && (
        <>
          <Label>{t('translation.report.vocab')}</Label>
          <div className="vocab-chips">
            {feedback.vocabulary.map((v, i) => (
              <span className="vocab-chip" key={i}>
                {v.from}
                <small>→</small>
                {v.to}
                {v.gloss && <small>({v.gloss})</small>}
                <Button
                  type="text"
                  size="small"
                  icon={<BookOutlined />}
                  disabled={savedVocab[v.to.toLowerCase()]}
                  onClick={() => void saveVocab(v.to, v.gloss)}
                  aria-label={t('words.save')}
                />
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
