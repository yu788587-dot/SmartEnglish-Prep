import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button, Checkbox, Input, Popconfirm, Select, Spin, Tag, Typography, message } from 'antd'
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SoundOutlined,
  StarFilled,
  StarOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { db } from '@/db'
import type { Note } from '@/db/types'
import { deleteWord, updateWord, updatedAtOf } from '@/utils/words'
import { gradeWord, isMastered, isPendingReview } from '@/utils/srs'
import { cancelSpeech, listEnglishVoices, loadVoices, pickVoice, speakWord } from '@/utils/speech'
import WordFormModal from './WordFormModal'
import '../data/data.css'
import './words.css'

type SortKey = 'recent' | 'alpha'

const SOURCES = ['all', 'reading', 'writing', 'translation', 'manual'] as const

function MasteryDots({ mastery }: { mastery: number }) {
  return (
    <span className="mastery" aria-label={`${mastery}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`mastery-dot${i <= mastery ? ' is-on' : ''}`} />
      ))}
    </span>
  )
}

export default function WordsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const [query, setQuery] = useState('')
  const [source, setSource] = useState<string>('all')
  const [tags, setTags] = useState<string[]>([])
  const [onlyDue, setOnlyDue] = useState(false)
  const [sort, setSort] = useState<SortKey>('recent')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Note | null>(null)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])

  const notes = useLiveQuery(() => db.notes.toArray(), [])

  useEffect(() => {
    void loadVoices().then((v) => setVoices(listEnglishVoices(v)))
  }, [])

  // 离开单词本时停掉朗读,避免继续念到后台
  useEffect(() => cancelSpeech, [])

  // 仪表盘的「待复习」跳进来时带上 ?due=1;同一路由内跳转也要生效,故跟随 URL 同步
  const dueParam = params.get('due') === '1'
  useEffect(() => {
    setOnlyDue(dueParam)
  }, [dueParam])

  const alive = useMemo(() => (notes ?? []).filter((n) => !n.deletedAt), [notes])

  const allTags = useMemo(
    () => [...new Set(alive.flatMap((n) => n.tags ?? []))].sort((a, b) => a.localeCompare(b)),
    [alive],
  )

  const stats = useMemo(
    () => ({
      total: alive.length,
      due: alive.filter((n) => isPendingReview(n)).length,
      mastered: alive.filter((n) => isMastered(n.mastery)).length,
    }),
    [alive],
  )

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = alive
    if (source !== 'all') list = list.filter((n) => (n.source ?? 'manual') === source)
    if (tags.length > 0) list = list.filter((n) => tags.every((tg) => (n.tags ?? []).includes(tg)))
    if (q) {
      list = list.filter(
        (n) =>
          n.word.toLowerCase().includes(q) ||
          (n.meaning ?? '').toLowerCase().includes(q) ||
          (n.example ?? '').toLowerCase().includes(q),
      )
    }
    if (onlyDue) list = list.filter((n) => isPendingReview(n))
    return [...list].sort((a, b) =>
      sort === 'alpha' ? a.word.localeCompare(b.word) : updatedAtOf(b).localeCompare(updatedAtOf(a)),
    )
  }, [alive, query, source, tags, onlyDue, sort])

  async function grade(note: Note, correct: boolean) {
    const result = gradeWord({ mastery: note.mastery, reviewCount: note.reviewCount, correct })
    await updateWord(note.id, {
      mastery: result.mastery,
      nextReviewAt: result.nextReviewAt,
      lastReviewedAt: result.lastReviewedAt,
      reviewCount: result.reviewCount,
    })
    message.success(correct ? t('words.knownToast') : t('words.forgotToast'))
  }

  async function remove(note: Note) {
    await deleteWord(note.id)
    message.success(t('words.deletedToast'))
  }

  function onSaved(_note: Note, merged: boolean) {
    setOpen(false)
    message.success(merged ? t('words.mergedToast') : t('words.savedToast'))
  }

  if (!notes) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
        <Spin />
      </div>
    )
  }

  return (
    <div className="words-page">
      <Typography.Title level={2} style={{ fontFamily: 'var(--font-serif)' }}>
        {t('words.title')}
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ maxWidth: '52ch' }}>
        {t('words.subtitle')}
      </Typography.Paragraph>

      <div className="words-toolbar">
        <Input.Search
          className="words-search"
          allowClear
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('words.searchPlaceholder')}
        />
        <Select
          value={source}
          onChange={setSource}
          style={{ width: 150 }}
          options={SOURCES.map((s) => ({ value: s, label: t(`words.source.${s}`) }))}
        />
        <Select
          className="words-filter-tags"
          mode="multiple"
          allowClear
          value={tags}
          onChange={setTags}
          placeholder={t('words.tags')}
          options={allTags.map((tg) => ({ value: tg, label: tg }))}
        />
        <Checkbox checked={onlyDue} onChange={(e) => setOnlyDue(e.target.checked)}>
          {t('words.onlyDue')}
        </Checkbox>
        <Select
          value={sort}
          onChange={(v) => setSort(v as SortKey)}
          style={{ width: 140 }}
          options={[
            { value: 'recent', label: t('words.sort.recent') },
            { value: 'alpha', label: t('words.sort.alpha') },
          ]}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); setOpen(true) }}>
          {t('words.add')}
        </Button>
        <Button icon={<SoundOutlined />} onClick={() => navigate('/dictation')}>
          {t('words.dictation')}
        </Button>
      </div>

      <div className="ledger">
        <div className="ledger-row">
          <span className="ledger-label">{t('words.stats.total')}</span>
          <span className="ledger-dots" aria-hidden />
          <span className="ledger-value">{stats.total}</span>
        </div>
        <div className="ledger-row">
          <span className="ledger-label">
            <Button type="link" size="small" style={{ padding: 0 }} onClick={() => navigate('/words?due=1')}>
              {t('words.stats.due')}
            </Button>
          </span>
          <span className="ledger-dots" aria-hidden />
          <span className="ledger-value">{stats.due}</span>
        </div>
        <div className="ledger-row">
          <span className="ledger-label">{t('words.stats.mastered')}</span>
          <span className="ledger-dots" aria-hidden />
          <span className="ledger-value">{stats.mastered}</span>
        </div>
      </div>

      <div className="section-label">{t('words.listLabel')} · {rows.length}</div>

      {rows.length === 0 && (
        <div className="words-empty">
          <Typography.Text type="secondary">
            {alive.length === 0 ? t('words.empty') : t('words.noMatch')}
          </Typography.Text>
        </div>
      )}

      {rows.map((n) => {
        const mastered = isMastered(n.mastery)
        return (
          <div className={`word-row${mastered ? ' is-mastered' : ''}`} key={n.id}>
            <div className="word-main">
              <div className="word-head">
                <span className="word-term">{n.word}</span>
                {n.phonetic && <span className="word-phonetic">/{n.phonetic}/</span>}
                {n.pos && <span className="word-pos">{n.pos}</span>}
              </div>
              {n.meaning && <div className="word-meaning">{n.meaning}</div>}
              {n.example && <div className="word-example">{n.example}</div>}
              {n.exampleZh && <div className="word-example">{n.exampleZh}</div>}
              <div className="word-meta">
                <span className="word-source">{t(`words.source.${n.source ?? 'manual'}`)}</span>
                {(n.tags ?? []).map((tg) => (
                  <Tag key={tg} bordered={false}>
                    {tg}
                  </Tag>
                ))}
              </div>
            </div>
            <div className="word-side">
              <MasteryDots mastery={n.mastery ?? 0} />
              <div className="word-actions">
                <Button
                  size="small"
                  icon={<SoundOutlined />}
                  onClick={() =>
                    void speakWord(n.word, { lang: 'en-GB', rate: 0.85, voice: pickVoice(voices, 'en-GB') })
                  }
                  aria-label={t('words.pronounce')}
                />
                <Button
                  size="small"
                  icon={n.starred ? <StarFilled /> : <StarOutlined />}
                  onClick={() => void updateWord(n.id, { starred: !n.starred })}
                  aria-label={t('words.star')}
                />
                <Button size="small" onClick={() => void grade(n, true)} disabled={mastered}>
                  {t('words.known')}
                </Button>
                <Button size="small" onClick={() => void grade(n, false)}>
                  {t('words.forgot')}
                </Button>
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => { setEditing(n); setOpen(true) }}
                  aria-label={t('words.edit')}
                />
                <Popconfirm
                  title={t('words.deleteConfirm')}
                  okButtonProps={{ danger: true }}
                  onConfirm={() => void remove(n)}
                >
                  <Button size="small" danger icon={<DeleteOutlined />} aria-label={t('words.delete')} />
                </Popconfirm>
              </div>
            </div>
          </div>
        )
      })}

      <WordFormModal open={open} initial={editing} onClose={() => setOpen(false)} onSaved={onSaved} />
    </div>
  )
}
