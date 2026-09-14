import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { Button, Input, Typography, Upload, message } from 'antd'
import { ArrowRightOutlined, ImportOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { db, LOCAL_USER_ID, newId } from '@/db'
import { parsePlainLines, parseSrt } from '@/utils/srt'
import type { ListeningCue } from '@/db/types'
import './listening.css'

function parseSubtitleInput(input: string): ListeningCue[] | null {
  const text = input.trim()
  if (!text) return null
  if (text.includes('-->')) {
    const cues = parseSrt(text)
    return cues.length > 0
      ? cues.map((c) => ({ start: c.start, end: c.end, text: c.text }))
      : null
  }
  const lines = parsePlainLines(text)
  return lines.length > 0 ? lines.map((l) => ({ start: l.start, end: null, text: l.text })) : null
}

export default function ListeningListPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const materials = useLiveQuery(
    async () =>
      (await db.listeningMaterials.toArray()).sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      ),
    [],
  )

  const [title, setTitle] = useState('')
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [subtitleText, setSubtitleText] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!audioFile) {
      message.warning(t('listening.import.needAudio'))
      return
    }
    if (!title.trim()) {
      message.warning(t('listening.import.needTitle'))
      return
    }
    const cues = parseSubtitleInput(subtitleText)
    if (!cues) {
      message.warning(t('listening.import.needSubtitle'))
      return
    }
    setSaving(true)
    try {
      await db.listeningMaterials.put({
        id: newId(),
        userId: LOCAL_USER_ID,
        title: title.trim(),
        audioName: audioFile.name,
        audioBlob: audioFile,
        durationS: null,
        cues,
        createdAt: new Date().toISOString(),
      })
      setTitle('')
      setSubtitleText('')
      setAudioFile(null)
      message.success(t('listening.import.saved'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="listen-page">
      <Typography.Title level={2} style={{ fontFamily: 'var(--font-serif)' }}>
        {t('listening.list.title')}
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ maxWidth: '56ch' }}>
        {t('listening.list.subtitle')}
      </Typography.Paragraph>

      <div className="listen-import">
        <div className="data-panel-title">{t('listening.import.title')}</div>
        <Input
          placeholder={t('listening.import.titlePlaceholder')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ marginBottom: 12 }}
        />
        <Upload
          maxCount={1}
          accept="audio/*"
          beforeUpload={(file) => {
            setAudioFile(file)
            if (!title.trim()) setTitle(file.name.replace(/\.[^.]+$/, ''))
            return false
          }}
          onRemove={() => setAudioFile(null)}
        >
          <Button icon={<ImportOutlined />}>{t('listening.import.chooseAudio')}</Button>
        </Upload>
        {audioFile && (
          <Typography.Text type="secondary" style={{ marginLeft: 12 }}>
            {audioFile.name}
          </Typography.Text>
        )}
        <Typography.Paragraph type="secondary" style={{ margin: '12px 0 8px' }}>
          {t('listening.import.subtitleHint')}
        </Typography.Paragraph>
        <textarea
          className="listen-srt-paste"
          value={subtitleText}
          onChange={(e) => setSubtitleText(e.target.value)}
          placeholder={t('listening.import.subtitlePlaceholder')}
          rows={5}
        />
        <Button
          type="primary"
          loading={saving}
          onClick={() => void save()}
          style={{ marginTop: 12 }}
        >
          {t('listening.import.save')}
        </Button>
      </div>

      {materials && materials.length > 0 && (
        <section style={{ marginTop: 32 }}>
          <div className="section-label">{t('listening.list.materials')}</div>
          {materials.map((m) => (
            <button
              key={m.id}
              type="button"
              className="listen-row"
              onClick={() => navigate(`/listening/work/${m.id}`)}
            >
              <span className="listen-row-title">{m.title}</span>
              <span className="listen-leader" aria-hidden />
              <span className="listen-row-meta">
                <span>
                  {m.cues.length} {t('listening.list.cues')}
                </span>
                <span>{new Date(m.createdAt).toLocaleDateString()}</span>
                <ArrowRightOutlined className="listen-arrow" />
              </span>
            </button>
          ))}
        </section>
      )}
      {materials && materials.length === 0 && (
        <Typography.Text type="secondary">{t('listening.list.empty')}</Typography.Text>
      )}
    </div>
  )
}
