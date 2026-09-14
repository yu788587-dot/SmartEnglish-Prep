import { useEffect, useState } from 'react'
import { Button, Card, Form, Input, Select, Typography, message } from 'antd'
import { useTranslation } from 'react-i18next'
import i18n from '@/i18n'
import { db } from '@/db'
import { aiConfigSchema, type AiConfig, PROVIDER_PRESETS } from '@/schemas/ai-config'

const AI_SETTINGS_KEY = 'ai'

type PresetKey = keyof typeof PROVIDER_PRESETS | 'custom'

export default function SettingsPage() {
  const { t } = useTranslation()
  const [form] = Form.useForm<AiConfig>()
  const [preset, setPreset] = useState<PresetKey>('deepseek')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        const row = await db.settings.get(AI_SETTINGS_KEY)
        if (row) {
          const parsed = aiConfigSchema.safeParse(JSON.parse(row.value))
          if (parsed.success) {
            form.setFieldsValue(parsed.data)
            setPreset(matchPreset(parsed.data.baseUrl))
          }
        }
      } catch {
        message.error(t('settings.loadFailed'))
      } finally {
        setLoading(false)
      }
    })()
  }, [form, t])

  const applyPreset = (key: PresetKey) => {
    setPreset(key)
    if (key !== 'custom') {
      const p = PROVIDER_PRESETS[key]
      form.setFieldsValue({ baseUrl: p.baseUrl, model: p.model })
    }
  }

  const onFinish = async (values: AiConfig) => {
    const parsed = aiConfigSchema.parse(values)
    await db.settings.put({ key: AI_SETTINGS_KEY, value: JSON.stringify(parsed) })
    message.success(t('settings.saved'))
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <Card title={t('settings.ai')} style={{ marginBottom: 16 }}>
        <Typography.Paragraph type="secondary">{t('settings.aiHint')}</Typography.Paragraph>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          disabled={loading}
          initialValues={{ baseUrl: PROVIDER_PRESETS.deepseek.baseUrl, model: PROVIDER_PRESETS.deepseek.model }}
        >
          <Form.Item label={t('settings.preset')} style={{ marginBottom: 16 }}>
            <Select<PresetKey> value={preset} onChange={applyPreset} options={presetOptions()} />
          </Form.Item>
          <Form.Item
            name="baseUrl"
            label={t('settings.baseUrl')}
            rules={[{ required: true }, { type: 'url' }]}
          >
            <Input placeholder="https://api.deepseek.com" />
          </Form.Item>
          <Form.Item name="apiKey" label={t('settings.apiKey')} rules={[{ required: true }]}>
            <Input.Password placeholder="sk-..." autoComplete="off" />
          </Form.Item>
          <Form.Item name="model" label={t('settings.model')} rules={[{ required: true }]}>
            <Input placeholder="deepseek-chat" />
          </Form.Item>
          <Button type="primary" htmlType="submit">
            {t('settings.save')}
          </Button>
        </Form>
      </Card>

      <Card title={t('settings.general')}>
        <Typography.Text type="secondary">
          {t('settings.language')}:切换右上角语言下拉即可 / Switch via the language selector in the
          header.
        </Typography.Text>
      </Card>
    </div>
  )
}

function presetOptions() {
  const t = i18n.t.bind(i18n)
  return [
    { value: 'deepseek' as const, label: t('settings.presetDeepSeek') },
    { value: 'siliconflow' as const, label: t('settings.presetSiliconFlow') },
    { value: 'custom' as const, label: t('settings.presetCustom') },
  ]
}

function matchPreset(baseUrl: string): PresetKey {
  for (const [key, p] of Object.entries(PROVIDER_PRESETS) as [
    keyof typeof PROVIDER_PRESETS,
    (typeof PROVIDER_PRESETS)[keyof typeof PROVIDER_PRESETS],
  ][]) {
    if (p.baseUrl === baseUrl) return key
  }
  return 'custom'
}
