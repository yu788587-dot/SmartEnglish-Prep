import { useState } from 'react'
import { Button, Popconfirm, Radio, Upload, Typography, message } from 'antd'
import { DownloadOutlined, FileTextOutlined, ImportOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { backupFileSchema } from '@/schemas/backup'
import { applyBackup, buildBackup, clearLearningData, downloadJson, downloadXlsx } from '@/utils/backup'
import './data.css'

type ImportStrategy = 'skip' | 'overwrite'

export default function DataPage() {
  const { t } = useTranslation()
  const [strategy, setStrategy] = useState<ImportStrategy>('skip')
  const [pasted, setPasted] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const [rawJson, setRawJson] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<string[] | null>(null)
  const [outcome, setOutcome] = useState<{ key: string; found: number; written: number; skipped: number }[] | null>(null)

  async function doImport() {
    setErrors(null)
    setOutcome(null)
    const raw = rawJson ?? pasted
    if (!raw || raw.trim().length === 0) {
      message.warning(t('data.import.noInput'))
      return
    }
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch (e) {
      setErrors([t('data.import.parseFailed', { reason: e instanceof Error ? e.message : String(e) })])
      return
    }
    const validated = backupFileSchema.safeParse(parsed)
    if (!validated.success) {
      setErrors(
        validated.error.issues.slice(0, 20).map((iss) => `${iss.path.join('.') || '(root)'}: ${iss.message}`),
      )
      return
    }
    setBusy(true)
    try {
      const result = await applyBackup(validated.data.data, strategy)
      setOutcome(result.perTable)
      message.success(t('data.import.done'))
    } finally {
      setBusy(false)
    }
  }

  async function exportJson() {
    const backup = await buildBackup()
    downloadJson(backup)
    setRawJson(JSON.stringify(backup, null, 2))
  }

  return (
    <div className="data-page">
      <Typography.Title level={2} style={{ fontFamily: 'var(--font-serif)' }}>
        {t('data.title')}
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ maxWidth: '56ch' }}>
        {t('data.subtitle')}
      </Typography.Paragraph>

      <div className="data-panel">
        <div className="data-panel-title">{t('data.export.title')}</div>
        <Typography.Paragraph type="secondary">{t('data.export.hint')}</Typography.Paragraph>
        <div className="data-actions">
          <Button type="primary" icon={<DownloadOutlined />} onClick={() => void exportJson()}>
            {t('data.export.json')}
          </Button>
          <Button icon={<FileTextOutlined />} onClick={() => void downloadXlsx()}>
            {t('data.export.xlsx')}
          </Button>
        </div>
        {rawJson && (
          <details className="data-preview">
            <summary>{t('data.export.preview')}</summary>
            <pre>{rawJson.slice(0, 20000)}</pre>
          </details>
        )}
      </div>

      <div className="data-panel">
        <div className="data-panel-title">{t('data.import.title')}</div>
        <Typography.Paragraph type="secondary">{t('data.import.hint')}</Typography.Paragraph>
        <div className="data-import-row">
          <Upload
            accept=".json,application/json"
            maxCount={1}
            beforeUpload={(file) => {
              setFileName(file.name)
              void file.text().then((text) => setRawJson(text))
              return false
            }}
          >
            <Button icon={<ImportOutlined />}>{t('data.import.chooseFile')}</Button>
          </Upload>
          {fileName && <Typography.Text type="secondary">{fileName}</Typography.Text>}
        </div>
        <textarea
          className="data-paste"
          value={pasted}
          onChange={(e) => {
            setPasted(e.target.value)
            setFileName(null)
            setRawJson(null)
          }}
          placeholder={t('data.import.pastePlaceholder')}
          rows={5}
        />
        <div className="data-import-row">
          <span className="data-strategy-label">{t('data.import.strategy')}:</span>
          <Radio.Group
            value={strategy}
            onChange={(e) => setStrategy(e.target.value as ImportStrategy)}
            optionType="button"
            buttonStyle="solid"
            options={[
              { value: 'skip', label: t('data.import.skip') },
              { value: 'overwrite', label: t('data.import.overwrite') },
            ]}
          />
          <Button type="primary" loading={busy} onClick={() => void doImport()}>
            {t('data.import.start')}
          </Button>
        </div>

        {errors && (
          <div className="data-errors">
            <div className="data-panel-title">{t('data.import.rejected')}</div>
            <ul>
              {errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        )}
        {outcome && (
          <div className="data-outcome">
            <div className="data-panel-title">{t('data.import.outcome')}</div>
            <table>
              <thead>
                <tr>
                  <th>{t('data.import.table')}</th>
                  <th>{t('data.import.found')}</th>
                  <th>{t('data.import.written')}</th>
                  <th>{t('data.import.skippedCol')}</th>
                </tr>
              </thead>
              <tbody>
                {outcome
                  .filter((r) => r.found > 0)
                  .map((r) => (
                    <tr key={r.key}>
                      <td>{t(`data.tables.${r.key}`)}</td>
                      <td>{r.found}</td>
                      <td>{r.written}</td>
                      <td>{r.skipped}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="data-panel data-danger">
        <div className="data-panel-title">{t('data.danger.title')}</div>
        <Typography.Paragraph type="secondary">{t('data.danger.hint')}</Typography.Paragraph>
        <Popconfirm
          title={t('data.danger.confirm')}
          okButtonProps={{ danger: true }}
          onConfirm={() => {
            void clearLearningData().then(() => message.success(t('data.danger.done')))
          }}
        >
          <Button danger>{t('data.danger.action')}</Button>
        </Popconfirm>
      </div>
    </div>
  )
}
