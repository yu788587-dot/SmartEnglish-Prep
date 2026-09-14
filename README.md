# SmartEnglish-Prep · 备考领航

<div align="left">

**AI-powered IELTS / CET-4/6 prep platform · AI 驱动的雅思与四六级备考平台**

Local-first · Works in browser & on Android (APK) · Bring your own LLM key

</div>

---

## ✨ Features / 功能

| Module / 模块 | Status | Description / 说明 |
| --- | --- | --- |
| Reading 阅读 | ✅ M1 | 题型练习 + “阅读透视镜”:选中单词/长句即得 AI 解释与翻译 |
| Writing 写作 | ✅ M2 | AI 批改:雅思 TR/CC/LR/GRA 四维评分,CET 档位评分,逐句高亮润色 |
| Data 数据管理 | 🔜 M3 | 错题本、学习时长统计、JSON/xlsx 导入导出(带校验与事务回滚) |
| Translation 翻译 | 🔜 M4 | 中英对照练习,AI 偏差高亮与表达优化 |
| Listening 听力 | 🔜 M5 | 倍速/AB 循环/逐句精听,字幕对照 |
| AI Tutor 助教 | 🔜 M6 | 场景化全局 AI 助教,可自定义角色(严厉考官/鼓励型老师) |

## 🏗 Architecture / 架构

**Local-first 本地优先**:练习数据存储在浏览器 IndexedDB(手机端为 SQLite),AI 调用直连 OpenAI 兼容接口(DeepSeek / SiliconFlow / Qwen / Kimi / Ollama…),无需服务器即可完整使用。

FastAPI 后端为**可选增强服务**:AI 代理(隐藏 key)、题库管理、服务端导入导出。

```
frontend/   React 18 + TypeScript + Vite + Ant Design 5 + Dexie + Zustand
backend/    FastAPI + SQLAlchemy + pandas (optional / 可选)
```

## 🚀 Quick Start / 快速开始

```bash
# Frontend 前端
cd frontend
npm install
npm run dev

# Backend 后端(可选 / optional)
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
```

在应用内 **设置页** 填入你的 API Key(base_url + key + model,支持任意 OpenAI 兼容服务)。

## 📖 Roadmap / 计划

MVP 按里程碑推进(M0–M8),详见 [docs/执行计划.md](docs/执行计划.md)。

## ⚖️ License / 许可

[MIT](LICENSE)。仓库内置题库为自创/公开许可材料;请勿向本仓库提交受版权保护的真题原文。

---

> English interface is available (zh-CN / en switchable in-app).
