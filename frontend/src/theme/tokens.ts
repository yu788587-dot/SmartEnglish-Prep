import type { ThemeConfig } from 'antd'

/**
 * 沉浸纸感阅读风(DESIGN.md v1):
 * 暖白纸底 + 墨色文字 + 胡桃木单强调;标题用衬线,正文用无衬线保证 UI 密度。
 * 次级文字一律从纸/墨色相取色(finish review:禁止中性灰)。
 */
export const SERIF_FONT =
  "'Literata Variable', Georgia, 'Source Han Serif SC', 'Noto Serif SC', 'Songti SC', SimSun, serif"

export const paperTheme: ThemeConfig = {
  token: {
    colorPrimary: '#8A5A3B',
    colorInfo: '#8A5A3B',
    // 成功态同样走胡桃木家族,维持单强调色世界(finish review finding 2)
    colorSuccess: '#6E4429',
    colorBgBase: '#F7F3EC',
    colorBgContainer: '#FFFDF8',
    colorTextBase: '#2B2622',
    colorTextSecondary: '#6B5D52',
    colorTextTertiary: '#7E6F60',
    colorBorder: '#DCD3C4',
    colorBorderSecondary: '#E9E2D5',
    // 禁用态保持可感知(finish review finding 9):约 3:1 而非 1.65:1
    colorTextDisabled: '#85745F',
    colorBgTextHover: 'rgba(138, 90, 59, 0.06)',
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
      itemSelectedBg: '#E9E0D0',
      itemSelectedColor: '#5C3A22',
      itemHoverBg: 'rgba(138, 90, 59, 0.06)',
      activeBarBorderWidth: 0,
    },
    Button: {
      // 禁用色由全局 colorTextDisabled 承担
    },
    Card: {
      colorBgContainer: '#FFFDF8',
    },
    Message: {
      contentBg: '#FFFDF8',
    },
  },
}
