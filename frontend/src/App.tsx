import { useMemo, useState } from 'react'
import { Layout, Menu, Select, Typography } from 'antd'
import {
  BarChartOutlined,
  CustomerServiceOutlined,
  EditOutlined,
  ReadOutlined,
  SettingOutlined,
  TranslationOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useSettings, type UiLang } from './stores/settings'
import SettingsPage from './modules/settings/SettingsPage'
import PlaceholderPage from './components/PlaceholderPage'
import { SERIF_FONT } from './theme/tokens'

const { Sider, Header, Content } = Layout

const NAV_KEYS = ['dashboard', 'reading', 'writing', 'translation', 'listening', 'settings'] as const
type NavKey = (typeof NAV_KEYS)[number]

const NAV_ICONS: Record<NavKey, React.ReactNode> = {
  dashboard: <BarChartOutlined />,
  reading: <ReadOutlined />,
  writing: <EditOutlined />,
  translation: <TranslationOutlined />,
  listening: <CustomerServiceOutlined />,
  settings: <SettingOutlined />,
}

export default function App() {
  const { t } = useTranslation()
  const lang = useSettings((s) => s.lang)
  const setLang = useSettings((s) => s.setLang)
  const [selected, setSelected] = useState<NavKey>('dashboard')

  const menuItems = useMemo(
    () =>
      NAV_KEYS.map((key) => ({
        key,
        icon: NAV_ICONS[key],
        label: t(`nav.${key}`),
      })),
    [t],
  )

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={208} theme="light" style={{ borderRight: '1px solid #E9E2D5' }}>
        <div style={{ padding: '20px 16px 12px' }}>
          <Typography.Title level={4} style={{ margin: 0, fontFamily: SERIF_FONT }}>
            {t('app.title')}
          </Typography.Title>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {t('app.tagline')}
          </Typography.Text>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selected]}
          items={menuItems}
          onClick={({ key }) => setSelected(key as NavKey)}
          style={{ borderInlineEnd: 'none' }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            paddingInline: 24,
            borderBottom: '1px solid #E9E2D5',
          }}
        >
          <Select<UiLang>
            value={lang}
            onChange={setLang}
            style={{ width: 120 }}
            options={[
              { value: 'zh-CN', label: '简体中文' },
              { value: 'en', label: 'English' },
            ]}
          />
        </Header>
        <Content style={{ padding: 24, overflow: 'auto' }}>
          {selected === 'settings' ? <SettingsPage /> : <PlaceholderPage moduleKey={selected} />}
        </Content>
      </Layout>
    </Layout>
  )
}
