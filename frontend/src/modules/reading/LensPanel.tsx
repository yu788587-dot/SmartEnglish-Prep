import { useEffect, useRef, useState } from 'react'
import { Button, Spin, Typography } from 'antd'
import { BookOutlined, CloseOutlined, EnvironmentOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { db, LOCAL_USER_ID, newId } from '@/db'
import { AiNotConfiguredError, loadAiConfig } from '@/api/ai-client'
import { lensLookup } from '@/api/lens'
import type { LensResult } from '@/schemas/lens'
import i18n from '@/i18n'

export interface SelectionInfo {
  text: string
  rect: DOMRect
}

type LensState =
  | { status: 'loading' }
  | { status: 'result'; result: LensResult }
  | { status: 'degraded'; rawText: string }
  | { status: 'error'; message: string }
  | { status: 'unconfigured' }

interface Props {
  selection: SelectionInfo | null
  onClose: () => void
}

/** 透视镜:选区锚定的浮层(触发按钮 → 解读面板)。签名交互,入场为唯一编排动效。 */
export default function LensLayer({ selection, onClose }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<LensState>({ status: 'loading' })
  const [saved, setSaved] = useState(false)
  const [runNonce, setRunNonce] = useState(0)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const runIdRef = useRef(0)

  useEffect(() => {
    setOpen(false)
    setState({ status: 'loading' })
    setSaved(false)
  }, [selection])

  useEffect(() => {
    if (!open) return
    const runId = ++runIdRef.current
    void (async () => {
      setState({ status: 'loading' })
      try {
        const config = await loadAiConfig()
        const res = await lensLookup(config, selection!.text, i18n.language)
        if (runIdRef.current !== runId) return
        setState(
          res.ok ? { status: 'result', result: res.result } : { status: 'degraded', rawText: res.rawText },
        )
      } catch (e) {
        if (runIdRef.current !== runId) return
        if (e instanceof AiNotConfiguredError) setState({ status: 'unconfigured' })
        else setState({ status: 'error', message: e instanceof Error ? e.message : String(e) })
      }
    })()
  }, [open, selection, runNonce])

  useEffect(() => {
    if (!selection) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    function onDown(e: MouseEvent) {
      const target = e.target as Node
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return
      onClose()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [selection, onClose])

  if (!selection) return null

  const { rect } = selection
  const PANEL_W = 380
  const left = Math.min(Math.max(16, rect.left), window.innerWidth - PANEL_W - 16)

  async function saveToNotes() {
    if (!selection) return
    const explanation = state.status === 'result' ? state.result : { raw: state.status === 'degraded' ? state.rawText : '' }
    await db.notes.put({
      id: newId(),
      userId: LOCAL_USER_ID,
      word: selection.text.slice(0, 80),
      aiExplanation: explanation,
      tags: ['reading'],
      createdAt: new Date().toISOString(),
    })
    setSaved(true)
  }

  const triggerButton = (
    <button
      ref={triggerRef}
      type="button"
      className="lens-trigger"
      style={{ left, top: rect.bottom + 8 }}
      onClick={() => setOpen(true)}
    >
      <BookOutlined />
      {t('reading.lens.trigger')}
    </button>
  )

  if (!open) return triggerButton

  return (
    <div
      ref={panelRef}
      className="lens-panel"
      role="dialog"
      aria-label={t('reading.lens.trigger')}
      style={{
        left,
        top: Math.min(rect.bottom + 8, window.innerHeight - 460),
        width: PANEL_W,
      }}
    >
      <div className="lens-panel-head">
        <span className="lens-panel-title">{t('reading.lens.trigger')}</span>
        <Button type="text" size="small" icon={<CloseOutlined />} onClick={onClose} aria-label="close" />
      </div>

      <div className="lens-panel-body">
        {state.status === 'loading' && (
          <div className="lens-loading">
            <Spin size="small" />
            <Typography.Text type="secondary">{t('reading.lens.loading')}</Typography.Text>
          </div>
        )}

        {state.status === 'unconfigured' && (
          <div className="lens-msg">
            <Typography.Text>{t('reading.lens.needConfig')}</Typography.Text>
            <Button size="small" icon={<EnvironmentOutlined />} onClick={() => navigate('/settings')}>
              {t('nav.settings')}
            </Button>
          </div>
        )}

        {state.status === 'error' && (
          <div className="lens-msg">
            <Typography.Text type="danger">
              {t('reading.lens.error')}: {state.message}
            </Typography.Text>
            <Button size="small" onClick={() => setRunNonce((n) => n + 1)}>
              {t('reading.lens.retry')}
            </Button>
          </div>
        )}

        {state.status === 'degraded' && (
          <>
            <Typography.Text type="secondary">{t('reading.lens.degraded')}</Typography.Text>
            <Typography.Paragraph className="lens-raw">{state.rawText}</Typography.Paragraph>
          </>
        )}

        {state.status === 'result' && <LensResultView result={state.result} />}

        {state.status === 'result' && (
          <div className="lens-actions">
            <Button size="small" type="primary" onClick={() => void saveToNotes()} disabled={saved}>
              {saved ? t('reading.lens.saved') : t('reading.lens.save')}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="lens-label">{children}</span>
}

function LensResultView({ result }: { result: LensResult }) {
  const { t } = useTranslation()
  if (result.kind === 'word') {
    return (
      <div>
        <div className="lens-word">
          <span className="lens-word-head">{result.word}</span>
          {result.phonetic && <span className="lens-phonetic">/{result.phonetic}/</span>}
        </div>
        <FieldLabel>{t('reading.lens.senses')}</FieldLabel>
        <ul className="lens-senses">
          {result.senses.map((s, i) => (
            <li key={i}>
              <em className="lens-pos">{s.pos}</em> {s.meaningZh}
              {s.meaningEn && <span className="lens-en"> — {s.meaningEn}</span>}
            </li>
          ))}
        </ul>
        {result.collocations && result.collocations.length > 0 && (
          <>
            <FieldLabel>{t('reading.lens.collocations')}</FieldLabel>
            <p className="lens-collocations">{result.collocations.join('  ·  ')}</p>
          </>
        )}
        {result.examples && result.examples.length > 0 && (
          <>
            <FieldLabel>{t('reading.lens.examples')}</FieldLabel>
            <ul className="lens-examples">
              {result.examples.map((ex, i) => (
                <li key={i}>
                  <span className="lens-en-sent">{ex.en}</span>
                  <span className="lens-zh-sent">{ex.zh}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    )
  }

  if (result.kind === 'phrase') {
    return (
      <div>
        <div className="lens-word">
          <span className="lens-word-head">{result.phrase}</span>
        </div>
        <p className="lens-translation">{result.translation}</p>
        <p className="lens-meaning">{result.meaning}</p>
        {result.usage && (
          <>
            <FieldLabel>{t('reading.lens.usage')}</FieldLabel>
            <p className="lens-meaning">{result.usage}</p>
          </>
        )}
        {result.examples && result.examples.length > 0 && (
          <>
            <FieldLabel>{t('reading.lens.examples')}</FieldLabel>
            <ul className="lens-examples">
              {result.examples.map((ex, i) => (
                <li key={i}>
                  <span className="lens-en-sent">{ex.en}</span>
                  <span className="lens-zh-sent">{ex.zh}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    )
  }

  return (
    <div>
      <FieldLabel>{t('reading.lens.translation')}</FieldLabel>
      <p className="lens-translation">{result.translation}</p>
      <FieldLabel>{t('reading.lens.skeleton')}</FieldLabel>
      <p className="lens-meaning">{result.skeleton}</p>
      {result.clauses && result.clauses.length > 0 && (
        <>
          <FieldLabel>{t('reading.lens.clauses')}</FieldLabel>
          <ul className="lens-clauses">
            {result.clauses.map((c, i) => (
              <li key={i}>
                <span className="lens-en-sent">{c.text}</span>
                <span className="lens-clause-role">{c.role}</span>
                <span className="lens-zh-sent">{c.zh}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {result.notes && result.notes.length > 0 && (
        <>
          <FieldLabel>{t('reading.lens.notes')}</FieldLabel>
          <ul className="lens-notes">
            {result.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
