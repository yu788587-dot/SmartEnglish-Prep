import { Empty, Typography } from 'antd'
import { useTranslation } from 'react-i18next'

interface Props {
  moduleKey: string
}

export default function PlaceholderPage({ moduleKey }: Props) {
  const { t } = useTranslation()
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
      <Empty
        description={
          <>
            <Typography.Title level={3} style={{ marginBottom: 4 }}>
              {t(`nav.${moduleKey}`)} · {t('placeholder.title')}
            </Typography.Title>
            <Typography.Text type="secondary">{t('placeholder.comingSoon')}</Typography.Text>
          </>
        }
      />
    </div>
  )
}
