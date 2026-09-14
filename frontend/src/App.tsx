import { lazy, Suspense, useMemo, useState } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Button, Drawer, Grid, Layout, Menu, Select, Spin } from 'antd'
import {
  BarChartOutlined,
  CustomerServiceOutlined,
  EditOutlined,
  MenuOutlined,
  ReadOutlined,
  SettingOutlined,
  TranslationOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useSettings, type UiLang } from './stores/settings'
import { SERIF_FONT } from './theme/tokens'

const { Sider, Header, Content } = Layout

const DashboardPage = lazy(() => import('@/components/PlaceholderPage'))
const ReadingListPage = lazy(() => import('@/modules/reading/ReadingListPage'))
const ReadingSessionPage = lazy(() => import('@/modules/reading/ReadingSessionPage'))
const WritingListPage = lazy(() => import('@/modules/writing/WritingListPage'))
const WritingEditorPage = lazy(() => import('@/modules/writing/WritingEditorPage'))
const WritingReportPage = lazy(() => import('@/modules/writing/WritingReportPage'))
const SettingsPage = lazy(() => import('@/modules/settings/SettingsPage'))

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

function currentNav(pathname: string): NavKey {
  const first = pathname.split('/')[1]
  return (NAV_KEYS as readonly string[]).includes(first) ? (first as NavKey) : 'dashboard'
}

function Shell({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const lang = useSettings((s) => s.lang)
  const setLang = useSettings((s) => s.setLang)
  const selected = currentNav(location.pathname)
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.md
  const [drawerOpen, setDrawerOpen] = useState(false)

  const menuItems = useMemo(
    () =>
      NAV_KEYS.map((key) => ({
        key,
        icon: NAV_ICONS[key],
        label: t(`nav.${key}`),
      })),
    [t],
  )

  const langSelect = (
    <Select<UiLang>
      value={lang}
      onChange={setLang}
      style={{ width: 120 }}
      options={[
        { value: 'zh-CN', label: '简体中文' },
        { value: 'en', label: 'English' },
      ]}
    />
  )

  const menu = (
    <Menu
      mode="inline"
      selectedKeys={[selected]}
      items={menuItems}
      onClick={({ key }) => {
        navigate(`/${key}`)
        setDrawerOpen(false)
      }}
      style={{ borderInlineEnd: 'none' }}
    />
  )

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {isMobile ? (
        <>
          <Header
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              paddingInline: 12,
              borderBottom: '1px solid #E9E2D5',
            }}
          >
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setDrawerOpen(true)}
              aria-label="menu"
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: SERIF_FONT,
                  fontWeight: 600,
                  fontSize: 16,
                  lineHeight: 1.2,
                  letterSpacing: '-0.01em',
                }}
              >
                {t('app.title')}
              </div>
            </div>
            {langSelect}
          </Header>
          <Drawer
            placement="left"
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            title={t('app.title')}
            width={240}
          >
            {menu}
          </Drawer>
        </>
      ) : (
        <Sider width={208} theme="light" style={{ borderRight: '1px solid #E9E2D5' }}>
          <div style={{ padding: '20px 16px 12px' }}>
            <div
              role="heading"
              aria-level={1}
              style={{
                fontFamily: SERIF_FONT,
                fontWeight: 600,
                fontSize: 20,
                lineHeight: 1.25,
                letterSpacing: '-0.01em',
              }}
            >
              {t('app.title')}
            </div>
            <div style={{ fontSize: 12, color: '#5d5347' }}>{t('app.tagline')}</div>
          </div>
          {menu}
        </Sider>
      )}
      <Layout>
        {!isMobile && (
          <Header
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              paddingInline: 24,
              borderBottom: '1px solid #E9E2D5',
            }}
          >
            {langSelect}
          </Header>
        )}
        <Content style={{ padding: isMobile ? 16 : 24, overflow: 'auto' }}>
          <Suspense
            fallback={
              <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
                <Spin />
              </div>
            }
          >
            {children}
          </Suspense>
        </Content>
      </Layout>
    </Layout>
  )
}

/** PlaceholderPage 需要 moduleKey;用路由参数适配 */
function PlaceholderWithKey({ moduleKey }: { moduleKey: string }) {
  const Page = DashboardPage
  return <Page moduleKey={moduleKey} />
}

export default function App() {
  return (
    <HashRouter>
      <Shell>
        <Routes>
          <Route path="/" element={<PlaceholderWithKey moduleKey="dashboard" />} />
          <Route path="/dashboard" element={<Navigate to="/" replace />} />
          <Route path="/reading" element={<ReadingListPage />} />
          <Route path="/reading/:passageId" element={<ReadingSessionPage />} />
          <Route path="/writing" element={<WritingListPage />} />
          <Route path="/writing/write/:topicId" element={<WritingEditorPage />} />
          <Route path="/writing/report/:essayId" element={<WritingReportPage />} />
          <Route path="/writing" element={<PlaceholderWithKey moduleKey="writing" />} />
          <Route path="/translation" element={<PlaceholderWithKey moduleKey="translation" />} />
          <Route path="/listening" element={<PlaceholderWithKey moduleKey="listening" />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Shell>
    </HashRouter>
  )
}
