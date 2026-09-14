import type { ThemeConfig } from 'antd'

/**
 * 沉浸纸感阅读风(DESIGN.md v1):
 * 暖白纸底 + 墨色文字 + 胡桃木主色;标题用衬线,正文用无衬线保证 UI 密度。
 */
export const SERIF_FONT =
  'Georgia, "Source Han Serif SC", "Noto Serif SC", "Songti SC", SimSun, serif'

export const paperTheme: ThemeConfig = {
  token: {
    colorPrimary: '#8A5A3B',
    colorInfo: '#8A5A3B',
    colorBgBase: '#F7F3EC',
    colorTextBase: '#2B2622',
    colorBorder: '#DCD3C4',
    colorBorderSecondary: '#E9E2D5',
    borderRadius: 6,
    fontFamily:
      '-apple-system, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif',
  },
  components: {
    Layout: {
      siderBg: '#F1EBE0',
      headerBg: '#F7F3EC',
      bodyBg: '#F7F3EC',
    },
    Menu: {
      itemBg: 'transparent',
      activeBarBorderWidth: 0,
    },
    Card: {
      colorBgContainer: '#FFFDF8',
    },
  },
}
