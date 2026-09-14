import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Radio, Spin, Typography, message } from 'antd'
import { ArrowLeftOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { db, LOCAL_USER_ID, newId } from '@/db'
import { ensureSeeded } from '@/db/seed'
import type { Question } from '@/db/types'
import LensLayer, { type SelectionInfo } from './LensPanel'
import './reading.css'

interface ParagraphPart {
  label?: string
  text: string
}

function parseParagraphs(md: string): ParagraphPart[] {
  return md
    .split(/\n\s*\n/)
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((raw) => {
      const m = raw.match(/^\[([A-Z])\]\s*/)
      return m ? { label: m[1], text: raw.slice(m[0].length) } : { text: raw }
    })
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const TFNG_OPTIONS = ['TRUE', 'FALSE', 'NOT GIVEN'] as const

function isCorrectAnswer(q: Question, ans: string | undefined): boolean {
  return (ans ?? '').trim().toUpperCase() === q.answer.trim().toUpperCase()
}

export default function ReadingSessionPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { passageId = '' } = useParams()

  useEffect(() => {
    void ensureSeeded()
  }, [])

  const passage = useLiveQuery(() => db.passages.get(passageId), [passageId])
  const questions = useLiveQuery(
    async () =>
      (await db.questions.where('passageId').equals(passageId).toArray()).sort(
        (a, b) => a.order - b.order,
      ),
    [passageId],
  )

  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [attemptId, setAttemptId] = useState(() => newId())
  const [elapsed, setElapsed] = useState(0)
  const [lens, setLens] = useState<SelectionInfo | null>(null)

  const articleRef = useRef<HTMLElement | null>(null)
  const submittedRef = useRef(submitted)
  const elapsedRef = useRef(elapsed)
  submittedRef.current = submitted
  elapsedRef.current = elapsed

  const startedAtIso = useMemo(() => new Date().toISOString(), [attemptId])

  useEffect(() => {
    if (submitted) return
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(timer)
  }, [submitted, attemptId])

  // 未交卷离开:静默记录学习时长(≥5s 才算)
  useEffect(() => {
    return () => {
      if (submittedRef.current) return
      const duration = elapsedRef.current
      if (duration >= 5) {
        void db.studySessions.put({
          id: newId(),
          userId: LOCAL_USER_ID,
          module: 'reading',
          startAt: startedAtIso,
          durationS: duration,
        })
      }
    }
  }, [attemptId, startedAtIso])

  const paragraphs = useMemo(() => parseParagraphs(passage?.contentMd ?? ''), [passage?.contentMd])
  const answeredCount = questions ? questions.filter((q) => answers[q.id]).length : 0
  const correctCount = questions
    ? questions.filter((q) => isCorrectAnswer(q, answers[q.id])).length
    : 0

  // 连续同型题合并为一组,生成旁注栏的题型分组导航
  const groups = useMemo(() => {
    if (!questions) return []
    const g: { type: Question['type']; firstId: string; count: number }[] = []
    for (const q of questions) {
      const last = g[g.length - 1]
      if (last && last.type === q.type) last.count += 1
      else g.push({ type: q.type, firstId: q.id, count: 1 })
    }
    return g
  }, [questions])

  function scrollToGroup(firstId: string) {
    document.getElementById(`q-${firstId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function closeLens() {
    setLens(null)
  }

  function onMouseUp() {
    if (submitted) return
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      setLens(null)
      return
    }
    const range = sel.getRangeAt(0)
    if (!articleRef.current?.contains(range.commonAncestorContainer)) return
    const text = sel.toString().replace(/\s+/g, ' ').trim()
    if (!text || text.length > 400) return
    setLens({ text, rect: range.getBoundingClientRect() })
  }

  async function submit() {
    if (!questions) return
    const now = new Date().toISOString()
    await db.transaction(
      'rw',
      [db.practiceRecords, db.wrongQuestions, db.studySessions],
      async () => {
        for (const q of questions) {
          const ans = answers[q.id] ?? ''
          const correct = isCorrectAnswer(q, ans)
          const recId = newId()
          await db.practiceRecords.put({
            id: recId,
            userId: LOCAL_USER_ID,
            questionId: q.id,
            passageId,
            module: 'reading',
            attemptId,
            userAnswer: ans,
            isCorrect: correct,
            durationS: elapsed,
            createdAt: now,
          })
          if (!correct) {
            await db.wrongQuestions.put({
              id: newId(),
              userId: LOCAL_USER_ID,
              recordId: recId,
              questionId: q.id,
              reviewCount: 0,
              resolved: false,
            })
          }
        }
        await db.studySessions.put({
          id: newId(),
          userId: LOCAL_USER_ID,
          module: 'reading',
          startAt: startedAtIso,
          durationS: elapsed,
        })
      },
    )
    window.getSelection()?.removeAllRanges()
    setSubmitted(true)
    setLens(null)
    message.success(t('reading.session.submittedToast'))
  }

  function retake() {
    setAnswers({})
    setSubmitted(false)
    setElapsed(0)
    setAttemptId(newId())
    window.scrollTo({ top: 0 })
  }

  if (!passage || !questions) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
        <Spin />
      </div>
    )
  }

  const total = questions.length
  const percent = total ? Math.round((correctCount / total) * 100) : 0

  return (
    <div className="session">
      <header className="session-header">
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/reading')}>
          {t('reading.session.back')}
        </Button>
        <h1 className="session-title">{passage.title}</h1>
        <span className="session-timer">{formatTime(elapsed)}</span>
        {submitted ? (
          <Button onClick={retake}>{t('reading.session.retake')}</Button>
        ) : (
          <Button type="primary" onClick={() => void submit()} disabled={answeredCount === 0}>
            {t('reading.session.submit')}
          </Button>
        )}
      </header>

      <div className="session-body">
        <article
          ref={articleRef}
          className="reading-article"
          onMouseUp={onMouseUp}
          aria-label={passage.title}
        >
          {paragraphs.map((p, i) => (
            <p key={i}>
              {p.label && <span className="para-label">{p.label}</span>}
              {p.text}
            </p>
          ))}
          <p className="article-source">{passage.source}</p>
        </article>

        <aside className="session-side">
          <div className="side-meta">
            <div className="side-progress">
              <span>
                {t('reading.session.answered')}{' '}
                <strong>
                  {answeredCount}/{total}
                </strong>
              </span>
              <span className="side-points">{t('reading.session.points', { n: total })}</span>
            </div>
            <div className="side-progress-bar" aria-hidden>
              <span style={{ width: `${total ? (answeredCount / total) * 100 : 0}%` }} />
            </div>
            <div className="side-groups">
              {groups.map((g) => (
                <button key={g.type} type="button" onClick={() => scrollToGroup(g.firstId)}>
                  {t(`reading.qtype.${g.type}`)} ×{g.count}
                </button>
              ))}
            </div>
          </div>
          {submitted && (
            <div className="score-block">
              <span className="score-number">
                {correctCount}
                <span className="score-total">/{total}</span>
              </span>
              <span className="score-percent">{percent}%</span>
              <span className="score-label">{t('reading.session.score')}</span>
            </div>
          )}
          <ol className="q-list">
            {questions.map((q) => (
              <QuestionItem
                key={q.id}
                q={q}
                index={questions.indexOf(q) + 1}
                value={answers[q.id]}
                submitted={submitted}
                onChange={(v) => setAnswers((prev) => ({ ...prev, [q.id]: v }))}
              />
            ))}
          </ol>
        </aside>
      </div>

      <LensLayer selection={lens} onClose={closeLens} />
    </div>
  )
}

interface QuestionItemProps {
  q: Question
  index: number
  value: string | undefined
  submitted: boolean
  onChange: (value: string) => void
}

function QuestionItem({ q, index, value, submitted, onChange }: QuestionItemProps) {
  const { t } = useTranslation()
  const correct = isCorrectAnswer(q, value)
  const options: { key: string; text: string }[] =
    q.type === 'tfng'
      ? TFNG_OPTIONS.map((k) => ({ key: k, text: k }))
      : (q.options as { key: string; text: string }[])

  return (
    <li className={`q-item${submitted ? (correct ? ' is-correct' : ' is-wrong') : ''}`} id={`q-${q.id}`}>
      <div className="q-head">
        <span className="q-num">{index}</span>
        <span className="q-stem">{q.stem}</span>
        {submitted &&
          (correct ? (
            <CheckOutlined className="q-mark ok" aria-label="correct" />
          ) : (
            <CloseOutlined className="q-mark bad" aria-label="wrong" />
          ))}
      </div>
      <Radio.Group
        value={value}
        disabled={submitted}
        onChange={(e) => onChange(e.target.value)}
        className="q-options"
      >
        {options.map((opt) => (
          <Radio key={opt.key} value={opt.key}>
            {q.type === 'mcq' || q.type === 'match' ? `${opt.key}. ${opt.text}` : opt.text}
          </Radio>
        ))}
      </Radio.Group>
      {submitted && !correct && (
        <div className="q-review">
          <Typography.Text type="secondary">
            {t('reading.session.yourAnswer')}: {value ? value : '—'}
            {q.type !== 'tfng' ? '' : ''}
          </Typography.Text>
          <Typography.Text>
            {t('reading.session.correctAnswer')}: {q.answer}
          </Typography.Text>
          <Typography.Paragraph type="secondary" className="q-explanation">
            {q.explanation}
          </Typography.Paragraph>
        </div>
      )}
      {submitted && correct && q.explanation && (
        <Typography.Paragraph type="secondary" className="q-explanation">
          {q.explanation}
        </Typography.Paragraph>
      )}
    </li>
  )
}
