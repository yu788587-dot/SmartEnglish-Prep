# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

用户选定(2026-09-15):前端 React 18 + TypeScript + Vite + Ant Design 5 + Dexie(IndexedDB)+ Zustand;后端 FastAPI + SQLAlchemy(可选增强服务,本地优先架构下非必需)。移动端于 M8 用 Capacitor 打包 APK(WebView,不改变 web 设计语言)。

## Users

主要用户:开发者本人 —— 一名同时备考雅思(IELTS)与大学英语四六级(CET-4/6)的中国学生。使用场景:日常自学(阅读刷题、写作练习、翻译对照、听力精听),长时间单次会话(30–90 分钟),桌面浏览器与手机(APK)双端。无多租户/公开运营场景。

## Product Purpose

SmartEnglish-Prep 把"练习 → AI 即时反馈 → 结构化数据留存"做成闭环:阅读(透视镜逐词/逐句解释)、写作(按雅思 TR/CC/LR/GRA 或 CET 档位 AI 批改,逐句高亮润色)、翻译(AI 偏差高亮)、听力(精听与字幕对照),外加错题本、学习时长统计与可校验的数据导入导出。成功标准:用户能长期坚持在单一平台完成备考练习,且数据随时可迁移、永不锁定。

## Positioning

本地优先 + 自带 Key(BYOK)的备考工具:全部练习数据存用户设备(IndexedDB/SQLite),AI 直连用户自选的 OpenAI 兼容服务(内置 DeepSeek / SiliconFlow 预设),无账号、无服务器、无数据上传;导出文件(JSON 权威格式 + xlsx 人读格式)即完整学习档案。这是"在线平台"类竞品(闭源、订阅、数据上云)无法诚实复制的组合,并以 MIT 开源。

## Operating Context

- 单用户本地运行:浏览器(PWA 可安装)或 Android APK;无需登录。
- AI 渠道:用户自己的 API Key(DeepSeek、SiliconFlow 已确认可用),在设置页配置 base_url/key/model。
- 数据迁移场景:换设备/重装浏览器时通过导出文件恢复全部进度。
- 开发节奏:按里程碑 M0–M8 推进(docs/执行计划.md),每里程碑可独立验收。

## Capabilities and Constraints

已确认能力:阅读题型(mcq/tfng/段落匹配)、AI 透视镜、写作批改(JSON 结构化反馈)、翻译对照、错题本、学习统计、JSON+xlsx 导入导出(事务式校验)、AI 助教(场景化角色)。
硬约束:
- AI 输出必须经 Zod/Pydantic 校验,失败重试一次后降级为纯文本,不允许渲染崩溃。
- 导入必须"先校验后写入",失败整体回滚;导出 JSON 带 schemaVersion。
- 版权:仓库内置题库仅限自创/公开许可材料;真题原文不进开源仓库(用户本地导入使用)。
- 单用户架构但所有表带 user_id(默认 'local'),多用户是未来扩展方向。
- 中英双语界面(zh-CN / en)。
明确未决事实:听力自动转写(ASR)的技术选型(sherpa-onnx 本地 vs 云端)留待 M5 决定。

## Brand Commitments

- 名称:**SmartEnglish-Prep**(用户 2026-09-15 明确拍板沿用,具有约束力;中文别称"备考领航"仅用于展示层副标题)。
- 声音:学习工具的清晰、鼓励性语气;错误提示给出可执行的下一步。
- 视觉约束(用户拍板):沉浸纸感阅读风 —— 暖白纸底、衬线英文标题、阅读区如翻开的书;具体世界规范由 DESIGN.md(视觉世界确立时)承载。

## Evidence on Hand

- docs/执行计划.md:完整里程碑计划、ER 图、JSON Schema 示例、参考开源项目清单。
- 无真实用户数据/截图/证明素材;未来工作中不得虚构用户见证、评分对比或下载量数据。

## Product Principles

1. **本地优先**:数据与 AI 调用默认发生在用户设备上;任何功能不得因缺少服务器而不可用。
2. **练习闭环优先于功能数量**:每个模块的终点都是结构化数据(记录/笔记/批改),可统计、可迁移。
3. **AI 是可验证的**:结构化输出、强校验、优雅降级;绝不把模型输出当可信输入直接渲染。
4. **数据可携是第一特性**:导出/导入与练习功能同等对待,始终可用、始终可校验。
5. **少而精**:宁可功能少但每个做到位,不堆砌半成品模块。
