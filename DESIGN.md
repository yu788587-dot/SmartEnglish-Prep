---
name: SmartEnglish-Prep
description: 本地优先的雅思/四六级备考工具 —— 暖白纸面、胡桃木单强调、Literata 衬线书页与"AI 透视镜"旁注的沉浸纸感阅读世界。
colors:
  paper: "#F7F3EC"
  paper-raised: "#FFFDF8"
  paper-sunken: "#F1EBE0"
  walnut: "#8A5A3B"
  walnut-deep: "#6E4429"
  ink: "#2B2622"
  ink-secondary: "#6B5D52"
  ink-tertiary: "#7E6F60"
  ink-soft: "#5D5347"
  ink-disabled: "#85745F"
  pill-selected: "#E9E0D0"
  pill-selected-label: "#5C3A22"
  hairline: "#E2D9C8"
  hairline-soft: "#E9E2D5"
  hairline-strong: "#DCD3C4"
  selection-wash: "rgba(138, 90, 59, 0.22)"
  scrollbar-thumb: "#CFC2AB"
  verdict-correct: "#4E7D4E"
  verdict-wrong: "#B04A33"
typography:
  display:
    fontFamily: "'Literata Variable', Georgia, 'Source Han Serif SC', 'Noto Serif SC', 'Songti SC', SimSun, serif"
    fontSize: "30px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "'Literata Variable', Georgia, 'Source Han Serif SC', 'Noto Serif SC', 'Songti SC', SimSun, serif"
    fontSize: "21px"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "-0.01em"
  title:
    fontFamily: "'Literata Variable', Georgia, 'Source Han Serif SC', 'Noto Serif SC', 'Songti SC', SimSun, serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  body:
    fontFamily: "'Literata Variable', Georgia, 'Source Han Serif SC', 'Noto Serif SC', 'Songti SC', SimSun, serif"
    fontSize: "17px"
    lineHeight: 1.9
  label:
    fontFamily: "-apple-system, 'Segoe UI', Roboto, 'PingFang SC', 'Microsoft YaHei', 'Helvetica Neue', Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.6
rounded:
  sm: "6px"
  md: "12px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.walnut}"
    textColor: "#FFFFFF"
    rounded: "{rounded.sm}"
    height: "32px"
    padding: "4px 15px"
  nav-item:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
  nav-item-selected:
    backgroundColor: "{colors.pill-selected}"
    textColor: "{colors.pill-selected-label}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
  toc-row:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    padding: "20px 4px"
  toc-row-hover:
    backgroundColor: "rgba(138, 90, 59, 0.05)"
  group-chip:
    backgroundColor: "transparent"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.pill}"
    padding: "3px 12px"
  lens-trigger:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.walnut-deep}"
    rounded: "{rounded.pill}"
    padding: "6px 14px"
  lens-panel:
    backgroundColor: "{colors.paper-raised}"
    rounded: "{rounded.md}"
    width: "380px"
  card:
    backgroundColor: "{colors.paper-raised}"
    rounded: "{rounded.sm}"
---

# Design System: SmartEnglish-Prep

## Overview

**Creative North Star: "沉浸纸感阅读风 —— 一场纸上精读"**

SmartEnglish-Prep 的界面是一间安静的纸上书房:阅读练习发生在排印精良的书页上,题目、计时与工具退居书页边缘(旁注栏)。PRODUCT.md 的视觉承诺钉定了这个世界——暖白纸底、衬线英文标题、阅读区如翻开的书。整套系统只有一种墨水:墨色文字落在暖纸上,胡桃木是唯一的强调色,它标记可点击、可前进、被选中的东西;它的稀有就是它的表达力。

密度服务于 30–90 分钟的长会话:正文栏 17px/1.9 衬线、65–75ch(建成值 68ch),行间留白慷慨;题目、进度、按钮等界面件用系统无衬线保持紧凑,不与文章争夺注意力。深度不用阴影表达——结构靠 1px 暖规线与纸色阶(Paper Sunken 侧栏 < Paper 页面 < Paper Raised 容器)分层;阴影只属于浮层。

明确的拒绝(均有判例):拒绝"考题软件把文章塞进表单页"的品类默认;拒绝中性灰文字/边框(次级文字一律从纸/墨色相取色,finish review 判例);拒绝第二种强调色(成功态也走胡桃木家族);拒绝常态阴影卡片。浏览器原生面(选区、滚动条、焦点环、插入符)是世界的一部分,同样入册。

**Key Characteristics:**
- 暖白纸面 + 墨色文字 + 胡桃木单强调;成功与定评色的使用边界有判例(见 Colors)。
- 'Literata Variable' 衬线(npm 自托管)承载标题与文章正文,CJK 衬线兜底;控件一律系统无衬线。
- 细规线代替卡片与阴影;纸色阶表达深度;阴影仅存在于透视镜浮层。
- 书页式版式:书眉行 + 68ch 主栏 + 400px 旁注栏;≤960px 单栏堆叠。
- 签名交互"AI 透视镜":选中文本唤起浮层;其入场(180–200ms cubic-bezier(0.16,1,0.3,1))是页面唯一的编排动效。
- 浏览器原生面入册:选区 rgba(138,90,59,0.22)、细滚动条 #CFC2AB、胡桃木焦点环、胡桃木插入符。

令牌的规范来源:`frontend/src/theme/tokens.ts`(Ant Design 5 ThemeConfig)与 `frontend/src/modules/reading/reading.css`(页面级 CSS 变量与浏览器原生面主题)。

## Colors

一切颜色都从"纸与墨"里取,胡桃木是纸页上唯一的墨水颜色。

### Primary
- **胡桃木 Walnut** (#8A5A3B):唯一强调色。主按钮、焦点环(2px outline)、进度条填充、文本插入符、透视镜触发钮边框,以及悬停水洗 rgba(138,90,59,0.05–0.06) 的基色。用于"可前进"之处——按下它会推进任务。
- **胡桃木深 Walnut Deep** (#6E4429):强调的"小字印刷"声部,兼成功色(toast 图标,实测 ~8.2:1)。folio 数字、段落标签 [A][B]、题型芯片悬停、透视镜栏目标签与词头重音、层级徽记都用它——强调缩小到 13–15px 时加深以保对比。

### Tertiary
- **定评绿 Verdict Green** (#4E7D4E) / **定评赭红 Verdict Rust** (#B04A33):仅出现在交卷后的判分态——对错图标与题项左侧 5% 透明渐变水洗。日常界面永不出现,以维持单强调世界。

### Neutral
- **暖纸 Paper** (#F7F3EC):全局底色(body、header、内容区)。
- **纸面浮层 Paper Raised** (#FFFDF8):容器、设置页 Card、Message/Toast 底、透视镜面板——比 Paper 亮半档,是"浮在纸上"的表面。
- **纸边 Paper Sunken** (#F1EBE0):应用侧栏(Sider)底色,比页面暗半档,衬托内容区。
- **墨 Ink** (#2B2622):正文与标题文字。
- **淡墨 Secondary** (#6B5D52) / **浅墨 Tertiary** (#7E6F60):Ant Design 次级/三级文字;从纸墨色相取色。
- **柔墨 Soft Ink** (#5D5347):页面级 CSS 的次级文字(folio 行 meta、计时器、来源注)。
- **灰墨 Disabled** (#85745F):禁用文字,故意保持可感知(实测 ~3.4–3.9:1)。
- **选中原纸 Pill Selected** (#E9E0D0) 与 **选中标签 Pill Label** (#5C3A22):侧栏导航选中项的纸片与标签色(实测 7.47:1)。
- **暖规线家族**:Hairline (#E2D9C8,reading 页面主规线)、Hairline Soft (#E9E2D5,应用 chrome 边框)、Hairline Strong (#DCD3C4,输入框边)。
- **选区水洗 Selection Wash** (rgba(138, 90, 59, 0.22)):全局 ::selection 底色——选中文本这个动作本身就在预告透视镜。
- **纸轴 Scrollbar Thumb** (#CFC2AB):全局细滚动条(scrollbar-width thin;webkit 10px,thumb 圆角 5px、透明内缩 2px)。

### Named Rules
**单强调法则 (The One Accent Rule).** 胡桃木家族(#8A5A3B / #6E4429)是唯一的强调色;成功态也走胡桃木深。绿/红只属于交卷后的定评瞬间,日常界面永不出现。
**禁冷灰法则 (The No-Cold-Gray Rule).** 任何文字、边框、底色不得使用中性灰——次级与禁用一律从纸/墨色相取色(finish review 判例:禁止中性灰)。
**可感知禁用法则 (The Perceivable Disabled Rule).** 禁用是状态,不是消失:禁用文字保持 ~3.4–3.9:1 的可读度(#85745F),不用 Ant Design 默认的 ~1.65:1 淡灰。

## Typography

**Display Font:** 'Literata Variable'(npm 自托管 @fontsource-variable/literata;回退 Georgia → 'Source Han Serif SC' / 'Noto Serif SC' / 'Songti SC' / SimSun → serif)
**Body Font:** 同上——阅读的声音就是衬线
**Label/UI Font:** 系统无衬线栈(-apple-system, 'Segoe UI', Roboto, 'PingFang SC', 'Microsoft YaHei', 'Helvetica Neue', Arial, sans-serif)

**Character:** Literata 的书卷气同时稳住中英混排的备考文本,是世界的"阅读声音";控件与旁注用安静的系统无衬线,是"操作的手"。文字是书,操作是手,两者永不混岗。

### Hierarchy
- **Display**(600, 30px, 1.25, -0.01em):页面标题(题库页"阅读题库")。
- **Headline**(400, 21px, 1.4, -0.01em):书目行 TOC 标题(文章名)。
- **Title**(600, 20px, 1.25, -0.01em):书眉行文章题与应用字标;窄屏降至 16px 并两行截断。
- **Body**(400, 17px, 1.9):文章正文,最大 68ch(约束 65–75ch);窄屏 16px。段落标签 [A][B](0.78em,+0.08em 字距,胡桃木深)浮在段首。
- **Label**(400, 13px, 1.6):meta、进度行、复习行;小标签 11–12.5px(透视镜栏目标签 11px 全大写 +0.08em 字距)。得分是"大衬线数字":44px/1.0(tabular)配 22px/15px 旁注——数字是排版,不是图表。

### Named Rules
**衬线声音、无衬线之手法则 (The Serif Voice, Sans Hands Rule).** 衬线只给标题、文章正文、folio 数字、得分与透视镜词头;所有控件、meta、表单标签用系统无衬线。混用即出戏。
**计数数字法则 (The Counting Numerals Rule).** 凡是要对齐读数的数字(计时、已答 x/y、最佳 %、得分)一律 tabular-nums。

## Layout

应用壳:桌面为 208px 固定左侧栏(Paper Sunken 底,右缘 1px Hairline Soft)+ 顶部细条(右对齐语言切换,下缘 1px 规线);内容区 padding 24px(移动 16px)。移动端(<768px,antd Grid md)切换为顶栏(汉堡按钮 + 16px 衬线字标 + 语言切换)与 240px 左抽屉导航。界面文案 zh-CN / en 双语。

题库页(目录页):max-width 860px 居中;衬线页题 + 次级副题(≤52ch);TOC 行 = 两位 folio 数字(衬线 15px,胡桃木深,如 01)+ 21px 衬线书名 + 点线引导符(1px dotted)+ 右侧 meta(级别 / 题数 / 最佳 %,13px,不换行)+ 箭头;行间 1px 规线,无卡片。folio 数字是书目的内容顺序(功能),不是装饰编号。

精读页:max-width 1240px。书眉行 sticky(返回文字钮 + 20px 衬线文章题 + tabular 计时 + 主按钮 提交/重做),下缘 1px 规线,Paper 底。主体双栏 grid:主栏 minmax(0,1fr) 文章(68ch,17px/1.9,段距 1.35em;文末来源注 12px 无衬线、上缘规线)+ 400px 旁注栏,栏距 40px。旁注栏 sticky top 72px,max-height calc(100vh - 96px) 自滚,左缘 1px 规线;头部 meta(已答 x/y + 分值 + 2px 进度条 + 题型分组芯片);交卷后插入得分块;题项列表以 1px 规线分节,复习行(你的答案/正确答案/解析)挂在题下,解析块上缘点规线。

响应式:≤960px 单栏堆叠(文章在上),旁注栏取消 sticky、左规线改上规线,文章 16px,文章题两行截断。

间距节奏:4/8 基准(xs 4 / sm 8 / md 16 / lg 24 / xl 40);组件内部偶用 10/12/14px 过渡值,不另立档位。

### Named Rules
**旁注法则 (The Marginalia Rule).** 文章是主栏(68ch);题目、进度与工具住进 400px 旁注栏,以 1px 规线与书页分隔,永不反客为主。

## Elevation & Depth

这是一个平的系统:页面靠纸色阶与 1px 规线分层,不靠阴影。深度阶梯:Paper Sunken 侧栏(#F1EBE0)< Paper 页面(#F7F3EC)< Paper Raised 容器/浮层(#FFFDF8)。常态下任何元素都没有阴影;全站仅有的两个阴影值都属于透视镜浮层(z-index 1000)——它们是"浮起的纸",不是"抬起的卡片"。

### Shadow Vocabulary
- **透镜触发钮** (`box-shadow: 0 6px 18px rgba(43, 38, 34, 0.14)`):选区旁浮出的胶囊触发钮。
- **透镜面板** (`box-shadow: 0 18px 48px rgba(43, 38, 34, 0.18)`):380px 解读面板,墨色柔影撑起浮层。

### Named Rules
**平页法则 (The Flat Page Rule).** 静止的页面没有阴影;结构用规线,层级用纸色阶。阴影只允许出现在 z-1000 的透视镜浮层上。

## Shapes

圆角三档:控件 6px(antd 全局 borderRadius——按钮、输入、Select、Card);透视镜面板 12px;胶囊 999px(透视镜触发钮、题型分组芯片)。滚动条 thumb 圆角 5px、两侧透明内缩 2px。焦点环是形状的一部分:2px 胡桃木 outline、offset 2px、2px 圆角——键盘可达性有统一的可见声部;输入符文字段插入符为胡桃木深。

版式的形不是盒子:书页靠 1px 暖规线(#E2D9C8 系)分节;TOC 用点线引导符(1px dotted)把书名与 meta 连成一行;解析块上缘点规线;透视镜从句列表用左规线悬挂。直线与点线是这个世界唯一的"边框装饰"。

## Components

### Buttons
- **Shape:** 轻圆角(6px),高 32px。
- **Primary:** 胡桃木底(#8A5A3B)+ 白字,padding 4px 15px——书页上唯一实心的墨水块(提交、保存、设置入口)。
- **Hover / Focus:** 悬停加深至胡桃木深;透镜触发钮悬停反转为胡桃木底 + 纸色字(#FDF9F2);focus-visible 统一 2px 胡桃木环(offset 2px)。文字按钮(返回、关闭)无底色。
- **Disabled:** 灰墨(#85745F)文字,保持可感知(~3.4–3.9:1),如未答题时的提交。
- **语义色:** antd colorSuccess 映射 #6E4429(toast/成功图标),Message 为 Paper Raised 纸片——语义色不引入新色相。

### Chips
- **题型分组芯片:** 胶囊(999px),1px 暖规线边,12.5px 无衬线,柔墨(#5D5347);悬停转胡桃木(字 #6E4429 / 边 #8A5A3B);点击平滑滚动到题目分组。
- **导航选中片:** 侧栏菜单选中项为纸片(#E9E0D0)+ 深标签(#5C3A22),无 active bar。

### Cards / Containers
- **Corner Style:** 6px。
- **Background:** Paper Raised(#FFFDF8)。
- **Shadow Strategy:** 无(见 Elevation & Depth)。
- **Border:** 无边框;设置页 Card 直接坐在纸上,reading 页面不用容器——规线分节。
- **Internal Padding:** Card 24px(antd 默认)。

### Inputs / Fields
- **Style:** Paper Raised 底(#FFFDF8),1px Hairline Strong 边(#DCD3C4),6px 圆角,高 32px;设置页为垂直表单(标签上、件下)。
- **Focus:** 边框转胡桃木 + 柔和胡桃木光环;插入符胡桃木深(#6E4429)。
- **Error / Disabled:** antd 语义校验(必填 / URL);保存中表单整体禁用。

### Navigation
桌面:208px 纸边侧栏——衬线 20px 字标 "SmartEnglish-Prep" + 12px 柔墨副标,inline 菜单(透明底);选中 = 纸片(#E9E0D0 / #5C3A22),悬停 = 胡桃木水洗 rgba(138,90,59,0.06),无 active bar。移动:顶栏汉堡 + 240px 抽屉。顶条仅右对齐语言切换(Select 120px)。

### Signature: 书目 TOC 列表(题库页)
纸质目录页,不是卡片网格:两位 folio 数字(衬线,胡桃木深)是书目的真实顺序——由纸感世界挣得的编号,别处不得模仿;点线引导符(1px dotted,#C9BDA6)把书名与 meta(级别 / 题数 / 最佳 %)拉成一行;整行可点,悬停 5% 胡桃木水洗、箭头右移 3px 并转胡桃木。

### Signature: AI 透视镜(签名交互)
选中正文文字(≤400 字符)即浮现胶囊触发钮;展开为 380px Paper Raised 面板(12px 圆角、墨色柔影):衬线小标题"AI 解读" + 11px 全大写栏目标签 + 三种结构化视图——词(24px 衬线词头 + 音标 + 词义/搭配/例句)、短语(译文 + 释义 + 用法)、句(译文 + 骨架 + 从句左规线列表 + 笔记)。降级与恢复态是一等公民:未配置给出"去设置"的路径,出错可重试,校验失败降级渲染纯文本(lens-raw)不崩。入场 180ms(触发钮)/ 200ms(面板)cubic-bezier(0.16,1,0.3,1),translateY(4px)+ scale(0.97)→1,transform-origin top left;Esc 与点击外部关闭。

### Signature: 稿纸编辑器(写作页,M2)
一页排印的稿纸,不是表单:题目引言坐在 Paper Raised 圆角块(衬线 16px/1.8);正文 textarea 无边框透明底,直接坐在纸上(衬线 17px/1.9,与阅读正文同律),自动增高(整页滚动,无内部滚动条、无 resize 握把);书眉行 = 返回 + 分类题名 + 实时字数(tabular-nums,达最低词数转胡桃木深)+ 唯一实心主钮"交卷批改";停笔 1 秒自动保存,左下 12px 三级墨标注"已自动保存"。无工具栏、无字数弹窗、无 Modal——写作时只有稿纸与题目。

### Signature: 朱批报告(写作报告页,M2)
总分是书页边上的大衬线数字(56px,雅思 /9、CET /15),旁注 model 与时间(13px 柔墨);雅思四维是 150px 名称行 + 4px 胡桃木进度条(Track Hairline Soft #E9E2D5)+ 22px 衬线分值的连续规线行;CET 用 1px 胡桃木边档位徽章(衬线)。逐句点评:原句衬线 16px,问题片段以胡桃木水洗 rgba(138,90,59,0.14) + 1px 胡桃木下划线标记;问题行 = 1px 规线胶囊标签(语法/搭配/逻辑/用词)+ "原文片段 → 建议 · 解释";润色句坐在 Paper Raised 块、1px 胡桃木左边线、11px 全大写"润色"栏目标签;词汇升级为 1px 胡桃木边胶囊(衬线,箭头三级墨)。重批与降级(纯文本纸片)是一等公民。

### Named Rules
**单次编排法则 (The One Orchestrated Moment Rule).** 透视镜入场是页面唯一的编排动效;其余一切过渡都是 160–240ms 的状态反馈(悬停 160ms、进度条 240ms)。

**变形动画法则 (Transform, Never Layout).** 数值驱动的视觉变化(7 日条带、进度条)只动 transform 与 opacity,绝不动 width/height/margin——布局属性动画是检测器判例(data.css week-bar,M3 改为固定轨道 + scaleY,bottom 原点)。

**Token 全局法则 (The World Token Rule).** 设计 token(:root 变量)与浏览器原生面主题只住在全局 index.css——任何惰性模块(路由级 chunk)都无权私有世界变量;M2 判例:写作页曾因 :root 定义在 reading.css 而丢掉全部变量(胡桃木条隐形、衬线回退)。

**状态随路由复位法则 (Route-State Reset).** 同一路由模式承载不同实体(如 /translation/work/:id)时,id 变化不重挂载组件——必须在 id 变化时显式复位草稿、标记与反馈状态;M4 判例:draftTouched 残留吞掉了历史练习的回填。

**大字随听法则 (The Now-Sentence Rule).** 听力面的一切层级由"当前句"决定:当前句 21px 衬线居中,前后句压为上下文,字幕目录做索引——控件可以多,焦点只能有一个(M5)。

## Do's and Don'ts

### Do:
- **Do** 让文章栏保持 65–75ch(建成值 68ch)、衬线 17px/1.9——这是世界的地基,其他一切为它让路。
- **Do** 用 1px 暖规线(#E2D9C8 系)分节;结构是连续的书页,不是卡片拼盘。
- **Do** 主题化浏览器原生面:::selection rgba(138,90,59,0.22)、细滚动条(#CFC2AB)、focus-visible 2px 胡桃木环(offset 2px)、插入符 #6E4429。
- **Do** 让正文文字 ≥4.5:1;次级/禁用文字从纸墨色相取色(实测台账见 Open Items)。
- **Do** 给要读数的数字上 tabular-nums(计时、已答、得分、最佳 %)。
- **Do** 为透视镜的每个状态(加载 / 未配置 / 错误 / 降级)写可执行的恢复文案,像设计成功态一样认真。

### Don't:
- **Don't** 引入中性灰——文字、边框、底色一律取暖纸墨色相。
- **Don't** 使用第二种强调色——成功态走胡桃木深(#6E4429);绿/红只属于交卷后的定评瞬间。
- **Don't** 给静止页面加阴影,或把内容装进阴影卡片——阴影只属于透视镜浮层。
- **Don't** 在透视镜之外使用编排式入场动画——其他过渡保持 160–240ms 状态反馈。
- **Don't** 把 01/02/03 式编号用作章节装饰——folio 数字只在书目 TOC 里,且永远带点线引导符与真实顺序。
- **Don't** 让表达妨碍任务——精读页是 Operate 模式,装饰不得挪动题目、计时与提交的优先级。

## Open Items

Finish review 对照度台账(实测):题库副题 5.39:1;来源注(provenance note)5.58:1;导航选中 7.47:1;界面家具文字 6.2–17.6:1;禁用 ~3.4–3.9:1;toast 成功 token ~8.2:1(token 验证,无光栅证据)。

遗留问题(向前携带):
1. ~~旁注栏题型分组芯片存在重复标签~~ 已在 M2 消歧:芯片标签改为题型 + 题号区间("单选 1" / "判断 2–3" / "单选 4")。
2. 移动端滚动条需要一次干净截图验证。

证据集:`.impeccable/review/{desktop-library.png, desktop.png, mobile.png, lens-open.png, desktop-editor.png, desktop-report.png}`。
