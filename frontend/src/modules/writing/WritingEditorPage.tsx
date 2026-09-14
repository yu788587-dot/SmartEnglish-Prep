import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Spin, message } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { db, LOCAL_USER_ID, newId } from '@/db'
import { ensureSeeded } from '@/db/seed'
import { AiNotConfiguredError } from '@/api/ai-client'
import { gradeEssay } from '@/api/grading'
import { useSettings } from '@/stores/settings'
import { EXAM_MIN_WORDS, EXAM_TARGET_RANGE } from '@/schemas/grading'
import i18n from '@/i18n'
import './writing.css'

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

export default function WritingEditorPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { topicId = '' } = useParams()

  useEffect(() => {
    void ensureSeeded()
  }, [])

  const topic = useLiveQuery(() => db.topics.get(topicId), [topicId])
  const draft = useLiveQuery(
    async () => {
      const rows = await db.essays.where('topicId').equals(topicId).toArray()
      return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
    },
    [topicId],
  )

  const [content, setContent] = useState('')
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [grading, setGrading] = useState(false)
  const essayIdRef = useRef<string | null>(null)
  const dirtyRef = useRef(false)
  const editorRef = useRef<HTMLTextAreaElement | null>(null)
  const mountedAt = useMemo(() => new Date().toISOString(), [])

  // 稿纸自动增高:整页滚动,不出内部滚动条
  useEffect(() => {
    const ta = editorRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${ta.scrollHeight}px`
  }, [content])

  // 既有草稿回填:仅在用户尚未输入时覆盖,避免清掉正在写的内容
  useEffect(() => {
    if (draft && !dirtyRef.current) {
      essayIdRef.current = draft.id
      setContent(draft.content)
      setSavedAt(draft.updatedAt)
    }
  }, [draft])

  // 未写作离开:静默记录学习时长(≥5s)
  useEffect(() => {
    return () => {
      const duration = Math.round((Date.now() - new Date(mountedAt).getTime()) / 1000)
      if (duration >= 5) {
        void db.studySessions.put({
          id: newId(),
          userId: LOCAL_USER_ID,
          module: 'writing',
          startAt: mountedAt,
          durationS: duration,
        })
      }
    }
  }, [mountedAt])

  const save = useCallback(
    async (text: string) => {
      if (text.trim().length === 0) return
      const now = new Date().toISOString()
      let id = essayIdRef.current
      if (!id) {
        id = newId()
        essayIdRef.current = id
      }
      await db.essays.put({
        id,
        userId: LOCAL_USER_ID,
        topicId: topicId || undefined,
        prompt: topic?.prompt,
        content: text,
        wordCount: countWords(text),
        createdAt: now,
        updatedAt: now,
      })
      setSavedAt(now)
    },
    [topicId, topic?.prompt],
  )

  // 自动保存:停止输入 1 秒后落库
  useEffect(() => {
    if (!dirtyRef.current) return
    const timer = setTimeout(() => void save(content), 1000)
    return () => clearTimeout(timer)
  }, [content, save])

  async function submit() {
    if (!topic || !content) return
    const text = content.trim()
    if (countWords(text) < 20) {
      message.warning(t('writing.editor.tooShort'))
      return
    }
    await save(text)
    setGrading(true)
    try {
      const res = await gradeEssay(topic.examType, topic.prompt, text, i18n.language)
      const now = new Date().toISOString()
      const reviewId = newId()
      const modelLabel = useSettings.getState().aiMode === 'server' ? 'server-proxy' : 'local-direct'
      if (res.ok) {
        await db.essayReviews.put({
          id: reviewId,
          essayId: essayIdRef.current!,
          model: modelLabel,
          scores: res.data.scores,
          overall: res.data.overall,
          feedback: res.data,
          summary: res.data.summary,
          createdAt: now,
        })
      } else {
        await db.essayReviews.put({
          id: reviewId,
          essayId: essayIdRef.current!,
          model: modelLabel,
          scores: {},
          overall: 0,
          feedback: { degraded: true, raw: res.rawText },
          summary: '',
          createdAt: now,
        })
        message.info(t('writing.editor.degradedNote'))
      }
      navigate(`/writing/report/${essayIdRef.current}`)
    } catch (e) {
      if (e instanceof AiNotConfiguredError) {
        message.warning(t('writing.editor.needConfig'))
      } else {
        message.error(`${t('reading.lens.error')}: ${e instanceof Error ? e.message : String(e)}`)
      }
    } finally {
      setGrading(false)
    }
  }

  if (!topic) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
        <Spin />
      </div>
    )
  }

  const words = content ? countWords(content) : 0
  const minWords = EXAM_MIN_WORDS[topic.examType] ?? 120

  return (
    <div className="editor-page">
      <header className="editor-header">
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/writing')}>
          {t('writing.editor.back')}
        </Button>
        <h1 className="editor-title">{topic.category ?? t(`writing.exam.${topic.examType}`)}</h1>
        <span className={`editor-wordcount${words >= minWords ? ' ok' : ''}`}>
          {words} / {EXAM_TARGET_RANGE[topic.examType] ?? `${minWords}+`} {t('writing.editor.words')}
        </span>
        <Button type="primary" loading={grading} onClick={() => void submit()}>
          {grading ? t('writing.editor.grading') : t('writing.editor.submit')}
        </Button>
      </header>

      <div className="editor-prompt">{topic.prompt}</div>

      <textarea
        ref={editorRef}
        className="essay-editor"
        value={content}
        onChange={(e) => {
          dirtyRef.current = true
          setContent(e.target.value)
        }}
        placeholder={t('writing.editor.placeholder')}
        spellCheck={false}
      />
      {savedAt && (
        <div className="editor-saved-at">
          {t('writing.editor.saved')} {new Date(savedAt).toLocaleTimeString()}
        </div>
      )}
    </div>
  )
}
