import { useEffect, useState } from 'react'
import { Button, Input, Modal, Select, Switch, Typography, message } from 'antd'
import { ThunderboltOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import type { Note } from '@/db/types'
import { enrichWord } from '@/api/word'
import { AiNotConfiguredError } from '@/api/ai-client'
import { saveWord } from '@/utils/words'
import i18n from '@/i18n'

interface Props {
  open: boolean
  /** 传入即为编辑,null 为新增 */
  initial: Note | null
  onClose: () => void
  onSaved: (note: Note, merged: boolean) => void
}

function clean(v: string): string | undefined {
  const s = v.trim()
  return s ? s : undefined
}

/** 新增 / 编辑单词。AI 补全一键填音标、释义、例句。 */
export default function WordFormModal({ open, initial, onClose, onSaved }: Props) {
  const { t } = useTranslation()
  const [word, setWord] = useState('')
  const [phonetic, setPhonetic] = useState('')
  const [pos, setPos] = useState('')
  const [meaning, setMeaning] = useState('')
  const [example, setExample] = useState('')
  const [exampleZh, setExampleZh] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [starred, setStarred] = useState(false)
  const [filling, setFilling] = useState(false)
  const [saving, setSaving] = useState(false)
  /** AI 返回的结构化结果,保存时一并入库;空表示本次未调用过 AI */
  const [pendingExplanation, setPendingExplanation] = useState<unknown>(undefined)
  const [raw, setRaw] = useState<string | null>(null)

  // 每次打开都按当前词条重置表单,避免残留上一次的输入
  useEffect(() => {
    if (!open) return
    setWord(initial?.word ?? '')
    setPhonetic(initial?.phonetic ?? '')
    setPos(initial?.pos ?? '')
    setMeaning(initial?.meaning ?? '')
    setExample(initial?.example ?? '')
    setExampleZh(initial?.exampleZh ?? '')
    setTags(initial?.tags ?? [])
    setStarred(initial?.starred ?? false)
    setPendingExplanation(undefined)
    setRaw(null)
    setFilling(false)
    setSaving(false)
  }, [open, initial])

  async function aiFill() {
    const term = word.trim()
    if (!term) {
      message.warning(t('words.form.wordRequired'))
      return
    }
    setFilling(true)
    try {
      const res = await enrichWord(term, i18n.language)
      if (res.ok) {
        const d = res.data
        if (d.word) setWord(d.word)
        setPhonetic(d.phonetic ?? '')
        setPos(d.senses[0]?.pos ?? '')
        setMeaning(
          d.senses.map((s) => (s.pos ? `${s.pos} ${s.meaningZh}` : s.meaningZh)).join('; '),
        )
        setExample(d.examples?.[0]?.en ?? '')
        setExampleZh(d.examples?.[0]?.zh ?? '')
        setPendingExplanation(d)
        message.success(t('words.form.filled'))
      } else {
        message.info(t('words.form.aiFailed'))
        setRaw(res.rawText)
      }
    } catch (e) {
      if (e instanceof AiNotConfiguredError) message.warning(t('words.form.needConfig'))
      else message.error(`${t('reading.lens.error')}: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setFilling(false)
    }
  }

  async function submit() {
    const term = word.trim()
    if (!term) {
      message.warning(t('words.form.wordRequired'))
      return
    }
    setSaving(true)
    try {
      const result = await saveWord({
        word: term,
        phonetic: clean(phonetic),
        pos: clean(pos),
        meaning: clean(meaning),
        example: clean(example),
        exampleZh: clean(exampleZh),
        tags,
        source: initial?.source ?? 'manual',
        aiExplanation: pendingExplanation ?? initial?.aiExplanation,
      })
      onSaved(result.note, result.merged)
    } catch (e) {
      message.error(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      title={initial ? t('words.form.editTitle') : t('words.form.title')}
      onCancel={onClose}
      footer={
        <div className="word-form-footer">
          <Button onClick={onClose}>{t('words.form.cancel')}</Button>
          <Button type="primary" loading={saving} onClick={() => void submit()}>
            {t('words.form.save')}
          </Button>
        </div>
      }
    >
      <div className="word-form">
        <label className="word-form-field">
          <span className="word-form-label">{t('words.form.word')}</span>
          <Input
            value={word}
            onChange={(e) => setWord(e.target.value)}
            placeholder={t('words.form.wordPlaceholder')}
          />
        </label>

        <div className="word-form-row">
          <label className="word-form-field">
            <span className="word-form-label">{t('words.form.phonetic')}</span>
            <Input value={phonetic} onChange={(e) => setPhonetic(e.target.value)} placeholder="ɪkˈspænd" />
          </label>
          <label className="word-form-field word-form-narrow">
            <span className="word-form-label">{t('words.form.pos')}</span>
            <Input value={pos} onChange={(e) => setPos(e.target.value)} placeholder="v." />
          </label>
        </div>

        <label className="word-form-field">
          <span className="word-form-label">{t('words.form.meaning')}</span>
          <Input.TextArea
            value={meaning}
            onChange={(e) => setMeaning(e.target.value)}
            rows={2}
            placeholder={t('words.form.meaningPlaceholder')}
          />
        </label>

        <label className="word-form-field">
          <span className="word-form-label">{t('words.form.example')}</span>
          <Input.TextArea
            value={example}
            onChange={(e) => setExample(e.target.value)}
            rows={2}
            placeholder={t('words.form.examplePlaceholder')}
          />
        </label>

        <label className="word-form-field">
          <span className="word-form-label">{t('words.form.exampleZh')}</span>
          <Input.TextArea
            value={exampleZh}
            onChange={(e) => setExampleZh(e.target.value)}
            rows={2}
            placeholder={t('words.form.exampleZhPlaceholder')}
          />
        </label>

        <label className="word-form-field">
          <span className="word-form-label">{t('words.form.tags')}</span>
          <Select
            mode="tags"
            value={tags}
            onChange={setTags}
            style={{ width: '100%' }}
            placeholder={t('words.form.tagsPlaceholder')}
            options={[]}
          />
        </label>

        <div className="word-form-switch">
          <span className="word-form-label">{t('words.form.starred')}</span>
          <Switch checked={starred} onChange={setStarred} />
        </div>

        <div className="word-form-ai">
          <Button icon={<ThunderboltOutlined />} loading={filling} onClick={() => void aiFill()}>
            {t('words.form.aiFill')}
          </Button>
        </div>

        {raw && (
          <div className="word-form-raw">
            <Typography.Text type="secondary">{t('words.form.aiFailed')}</Typography.Text>
            <pre>{raw}</pre>
          </div>
        )}
      </div>
    </Modal>
  )
}
