import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { Button, Checkbox, Input, Progress, Select, Slider, Spin, Typography, message } from 'antd'
import { ArrowLeftOutlined, SoundOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { db, LOCAL_USER_ID, newId } from '@/db'
import type { Note } from '@/db/types'
import { gradeWord, isPendingReview } from '@/utils/srs'
import { updatedAtOf } from '@/utils/words'
import {
  cancelSpeech,
  isSpeechSupported,
  listEnglishVoices,
  loadVoices,
  pickVoice,
  speakWord,
} from '@/utils/speech'
import '../data/data.css'
import './dictation.css'

type Scope = 'due' | 'starred' | 'wrong' | 'all'
type Hint = 'meaning' | 'initial' | 'none'
type Phase = 'setup' | 'run'

const MAX_QUESTIONS = 50

/** 拼写比较:忽略大小写与首尾空格,连字符 / 多空格归一为一个空格。 */
function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/[\s-]+/g, ' ')
}

function maskInitial(word: string): string {
  const parts = word.trim().split(/\s+/)
  return parts.map((p) => `${p[0] ?? ''}${'·'.repeat(Math.max(0, p.length - 1))}`).join(' ')
}

function fmtDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return m > 0 ? `${m} min ${s} s` : `${s} s`
}

export default function DictationPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const notes = useLiveQuery(() => db.notes.toArray(), [])

  const [scope, setScope] = useState<Scope>('due')
  const [count, setCount] = useState(10)
  const [lang, setLang] = useState('en-GB')
  const [rate, setRate] = useState(0.85)
  const [times, setTimes] = useState(2)
  const [hint, setHint] = useState<Hint>('meaning')
  const [shuffle, setShuffle] = useState(true)

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const voicesRef = useRef<SpeechSynthesisVoice[]>([])
  const [voiceUri, setVoiceUri] = useState('')

  const [phase, setPhase] = useState<Phase>('setup')
  const [queue, setQueue] = useState<Note[]>([])
  const [index, setIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [checked, setChecked] = useState<{ correct: boolean } | null>(null)
  const [attemptId, setAttemptId] = useState('')
  const [durationS, setDurationS] = useState(0)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const startedAtRef = useRef('')

  // 语音列表异步就绪(首次 getVoices() 常为空),取到后填充可选语音
  useEffect(() => {
    void loadVoices().then((v) => {
      const english = listEnglishVoices(v)
      voicesRef.current = english
      setVoices(english)
    })
  }, [])

  // 离开听写页必须停掉朗读,否则会一路念到后台
  useEffect(() => cancelSpeech, [])

  const candidates = useMemo(() => {
    const alive = (notes ?? []).filter((n) => !n.deletedAt)
    if (scope === 'due') return alive.filter((n) => isPendingReview(n))
    if (scope === 'starred') return alive.filter((n) => n.starred)
    if (scope === 'wrong') return alive.filter((n) => (n.dictationWrong ?? 0) > 0)
    return alive
  }, [notes, scope])

  const sessionRecords = useLiveQuery(
    async () =>
      attemptId ? db.dictationRecords.where('attemptId').equals(attemptId).toArray() : [],
    [attemptId],
  )

  const current = queue[index] as Note | undefined
  const total = queue.length
  const finished = phase === 'run' && index >= total && total > 0
  const correctCount = (sessionRecords ?? []).filter((r) => r.isCorrect).length
  const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0

  /** 用户手动指定的语音优先,否则按当前口音自动挑一个。 */
  function currentVoice(): SpeechSynthesisVoice | null {
    return voices.find((v) => v.voiceURI === voiceUri) ?? pickVoice(voicesRef.current, lang)
  }

  async function speak(note: Note): Promise<void> {
    const ok = await speakWord(note.word, { lang, rate, times, voice: currentVoice() })
    if (!ok) message.warning(t('dictation.noVoice'))
  }

  // 切到下一题自动朗读;第 1 题由「开始听写」按钮同步触发(iOS 要求首次在手势内调用)
  useEffect(() => {
    if (phase !== 'run' || index === 0) return
    if (index >= total) return
    void speak(queue[index])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, index, total])

  function start(list: Note[]) {
    const picked = shuffle ? [...list].sort(() => Math.random() - 0.5) : [...list]
    const next = picked.slice(0, Math.min(count, MAX_QUESTIONS))
    if (next.length === 0) return
    setQueue(next)
    setIndex(0)
    setAnswer('')
    setChecked(null)
    setAttemptId(newId())
    const now = new Date().toISOString()
    startedAtRef.current = now
    setDurationS(0)
    setPhase('run')
    void speak(next[0])
  }

  async function check() {
    const note = current
    if (!note) return
    const typed = answer.trim()
    if (!typed) {
      message.warning(t('dictation.needAnswer'))
      return
    }
    const correct = normalize(typed) === normalize(note.word)
    const result = gradeWord({ mastery: note.mastery, reviewCount: note.reviewCount, correct })
    const now = result.lastReviewedAt

    await db.transaction('rw', [db.notes, db.dictationRecords], async () => {
      await db.notes.update(note.id, {
        mastery: result.mastery,
        nextReviewAt: result.nextReviewAt,
        lastReviewedAt: result.lastReviewedAt,
        reviewCount: result.reviewCount,
        dictationWrong: (note.dictationWrong ?? 0) + (correct ? 0 : 1),
        updatedAt: now,
      })
      await db.dictationRecords.put({
        id: newId(),
        userId: LOCAL_USER_ID,
        noteId: note.id,
        attemptId,
        userAnswer: typed,
        isCorrect: correct,
        createdAt: now,
      })
    })

    setChecked({ correct })
    if (correct)
      void speakWord(note.word, {
        lang,
        rate: Math.min(1.2, rate + 0.1),
        voice: currentVoice(),
      })
  }

  /** 「只练错词」取词池:按最近更新倒序,刚从单词本改过的词排前面。 */
  function wrongNotes(): Note[] {
    return (sessionRecords ?? [])
      .filter((r) => !r.isCorrect)
      .map((r) => (notes ?? []).find((n) => n.id === r.noteId))
      .filter((n): n is Note => Boolean(n))
      .sort((a, b) => updatedAtOf(b).localeCompare(updatedAtOf(a)))
  }

  function next() {
    setChecked(null)
    setAnswer('')
    if (index + 1 >= total) {
      // 结算:此刻定格本轮用时,之后不再随渲染变化
      const secs = Math.round(
        (Date.now() - new Date(startedAtRef.current).getTime()) / 1000,
      )
      setDurationS(Math.max(0, secs))
    }
    setIndex(index + 1)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  if (!notes) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
        <Spin />
      </div>
    )
  }

  return (
    <div className="dictation-page">
      <Typography.Title level={2} style={{ fontFamily: 'var(--font-serif)' }}>
        {t('dictation.title')}
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ maxWidth: '52ch' }}>
        {t('dictation.subtitle')}
      </Typography.Paragraph>

      {!isSpeechSupported() && (
        <Typography.Paragraph type="warning" style={{ maxWidth: '52ch' }}>
          {t('dictation.unsupported')}
        </Typography.Paragraph>
      )}

      {/* ————— 设置 ————— */}
      {phase === 'setup' && (
        <div className="dictation-setup">
          <div className="dictation-field">
            <span className="dictation-field-label">{t('dictation.setup.scope')}</span>
            <Select
              value={scope}
              onChange={(v) => setScope(v as Scope)}
              style={{ width: 220 }}
              options={[
                { value: 'due', label: t('dictation.setup.scopeDue') },
                { value: 'starred', label: t('dictation.setup.scopeStarred') },
                { value: 'wrong', label: t('dictation.setup.scopeWrong') },
                { value: 'all', label: t('dictation.setup.scopeAll') },
              ]}
            />
            <span className="dictation-field-hint">
              {t('dictation.setup.available', { n: candidates.length })}
            </span>
          </div>

          <div className="dictation-field">
            <span className="dictation-field-label">{t('dictation.setup.count')}</span>
            <Slider
              min={5}
              max={MAX_QUESTIONS}
              step={5}
              value={count}
              onChange={setCount}
              style={{ width: 200 }}
            />
            <span className="dictation-field-hint">{count}</span>
          </div>

          <div className="dictation-field">
            <span className="dictation-field-label">{t('dictation.setup.shuffle')}</span>
            <Checkbox checked={shuffle} onChange={(e) => setShuffle(e.target.checked)} />
          </div>

          <div className="dictation-field">
            <span className="dictation-field-label">{t('dictation.setup.accent')}</span>
            <Select
              value={lang}
              onChange={setLang}
              style={{ width: 220 }}
              options={[
                { value: 'en-GB', label: t('dictation.setup.accentGB') },
                { value: 'en-US', label: t('dictation.setup.accentUS') },
            ]}
            />
          </div>

          <div className="dictation-field">
            <span className="dictation-field-label">{t('dictation.setup.voice')}</span>
            <Select
              allowClear
              value={voiceUri || undefined}
              onChange={(v) => setVoiceUri(v ?? '')}
              style={{ width: 260 }}
              placeholder={t('dictation.setup.voiceAuto')}
              options={voices.map((v) => ({ value: v.voiceURI, label: `${v.name} · ${v.lang}` }))}
            />
          </div>

          <div className="dictation-field">
            <span className="dictation-field-label">{t('dictation.setup.rate')}</span>
            <Slider
              min={0.5}
              max={1.2}
              step={0.05}
              value={rate}
              onChange={setRate}
              style={{ width: 200 }}
            />
            <span className="dictation-field-hint">{rate.toFixed(2)}×</span>
          </div>

          <div className="dictation-field">
            <span className="dictation-field-label">{t('dictation.setup.times')}</span>
            <Slider
              min={1}
              max={4}
              step={1}
              value={times}
              onChange={setTimes}
              style={{ width: 200 }}
            />
            <span className="dictation-field-hint">{times}×</span>
          </div>

          <div className="dictation-field">
            <span className="dictation-field-label">{t('dictation.setup.hint')}</span>
            <Select
              value={hint}
              onChange={(v) => setHint(v as Hint)}
              style={{ width: 220 }}
              options={[
                { value: 'meaning', label: t('dictation.setup.hintMeaning') },
                { value: 'initial', label: t('dictation.setup.hintInitial') },
                { value: 'none', label: t('dictation.setup.hintNone') },
              ]}
            />
          </div>

          <div className="dictation-start">
            <Button
              type="primary"
              icon={<SoundOutlined />}
              disabled={candidates.length === 0}
              onClick={() => start(candidates)}
            >
              {t('dictation.setup.start')}
            </Button>
          </div>

          {candidates.length === 0 && (
            <Typography.Paragraph type="secondary" style={{ marginTop: 16 }}>
              {t('dictation.empty')}
            </Typography.Paragraph>
          )}
        </div>
      )}

      {/* ————— 作答 ————— */}
      {phase === 'run' && !finished && current && (
        <>
          <div className="dictation-progress">
            <Progress
              percent={Math.round((index / total) * 100)}
              format={() => `${index} / ${total}`}
            />
          </div>

          <div className="dictation-player">
            <button
              type="button"
              className="dictation-player-btn"
              onClick={() => void speak(current)}
              aria-label={t('dictation.run.replay')}
            >
              <SoundOutlined />
            </button>
            <span className="dictation-field-hint">{t('dictation.run.replay')}</span>
          </div>

          <div className="dictation-hint">
            {hint === 'meaning' && (current.meaning || '—')}
            {hint === 'initial' &&
              `${maskInitial(current.word)} (${current.word.trim().length})`}
          </div>

          <div className="dictation-input">
            <Input.TextArea
              ref={inputRef}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onPressEnter={(e) => {
                if (e.shiftKey) return
                e.preventDefault()
                if (checked) next()
                else void check()
              }}
              placeholder={t('dictation.run.placeholder')}
              rows={2}
              autoFocus
              spellCheck={false}
            />
          </div>

          <div className="dictation-actions">
            {!checked ? (
              <Button type="primary" onClick={() => void check()}>
                {t('dictation.run.submit')}
              </Button>
            ) : (
              <Button type="primary" onClick={next}>
                {index + 1 >= total ? t('dictation.run.finish') : t('dictation.run.next')}
              </Button>
            )}
            <Button icon={<ArrowLeftOutlined />} onClick={() => setPhase('setup')}>
              {t('dictation.run.exit')}
            </Button>
          </div>

          {checked && (
            <div className={`dictation-verdict ${checked.correct ? 'is-correct' : 'is-wrong'}`} role="status">
              <div className="dictation-verdict-head">
                <span className="dictation-verdict-term">{current.word}</span>
                {current.phonetic && <span className="word-phonetic">/{current.phonetic}/</span>}
                <span className={`dictation-verdict-mark ${checked.correct ? 'is-correct' : 'is-wrong'}`}>
                  {checked.correct ? t('dictation.run.correct') : t('dictation.run.wrong')}
                </span>
              </div>
              {current.meaning && <div className="word-meaning">{current.meaning}</div>}
              {!checked.correct && (
                <div className="dictation-typed">
                  {t('dictation.run.yourAnswer')}: {answer.trim()}
                </div>
              )}
              {current.example && <div className="dictation-example">{current.example}</div>}
            </div>
          )}
        </>
      )}

      {/* ————— 结算 ————— */}
      {finished && (
        <div className="dictation-result">
          <div className="dictation-score">
            <span className="dictation-score-number">{accuracy}%</span>
            <span className="dictation-score-scale">{t('dictation.result.accuracy')}</span>
          </div>

          <div className="dictation-field">
            <span className="dictation-field-label">{t('dictation.result.count')}</span>
            <span className="dictation-field-hint">
              {correctCount} / {total}
            </span>
          </div>
          <div className="dictation-field">
            <span className="dictation-field-label">{t('dictation.result.duration')}</span>
            <span className="dictation-field-hint">{fmtDuration(durationS)}</span>
          </div>

          {correctCount < total && (
            <>
              <div className="section-label">{t('dictation.result.wrongList')}</div>
              {(sessionRecords ?? [])
                .filter((r) => !r.isCorrect)
                .map((r) => (
                  <div className="dictation-row" key={r.id}>
                    <span className="dictation-row-term">
                      {notes.find((n) => n.id === r.noteId)?.word ?? r.noteId}
                    </span>
                    <span className="dictation-row-answer">{r.userAnswer}</span>
                  </div>
                ))}
            </>
          )}

          <div className="dictation-actions">
            {correctCount < total && (
              <Button onClick={() => start(wrongNotes())}>
                {t('dictation.result.againWrong')}
              </Button>
            )}
            <Button onClick={() => start(candidates)}>{t('dictation.result.again')}</Button>
            <Button type="primary" onClick={() => navigate('/words')}>
              {t('dictation.result.back')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
