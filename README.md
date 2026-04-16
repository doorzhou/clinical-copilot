# Clinical Copilot / 临床搭档

心理咨询师的 AI 工作台。不面向来访者，只服务咨询师本人。

## 它能做什么

- **多流派分析镜子** — 精神动力学、CBT、人本、家庭系统、叙事、躯体导向，根据个案材料选择最有启发的视角
- **个案管理** — 来访者档案、会话历史、附属文件，一站式管理
- **个案概念化辅助** — AI 辅助识别模式、整理主题、纵向追踪变化
- **督导辅助** — 觉察反移情、指出跨个案模式、提供思考框架
- **疗愈素材生成** — 基于个案情况定制练习、心理教育材料、体验性活动

## 技术栈

- Next.js 16 + React 19 + Tailwind CSS 4
- OpenAI 兼容 API（默认智谱 GLM-4-Plus，可切换其他模型）
- 本地文件存储，无需数据库

## 快速开始

```bash
git clone https://github.com/doorzhou/clinical-copilot.git
cd clinical-copilot
npm install
cp .env.example .env.local   # 填入你的 API Key
npm run dev
```

打开 http://localhost:3000

## 配置

复制 `.env.example` 为 `.env.local`，填入你的 API Key：

```env
ZHIPU_API_KEY=你的智谱API密钥
ZHIPU_MODEL=glm-4-plus          # 可选：glm-4-plus, glm-4, glm-4-long, glm-4-flash
```

API Key 也可以在应用内的设置面板中配置。

## 项目结构

```
src/
├── app/
│   ├── api/          # 后端路由（个案、对话、日历、配置）
│   ├── prompts/      # 系统提示词
│   └── page.tsx      # 入口
├── components/       # UI 组件（侧边栏、对话、文件浏览器、日历等）
└── lib/
    └── data.ts       # 数据层（文件读写）
```

## 设计原则

- **咨询师优先** — 工具辅助分析，不替代判断，最终决策权在咨询师
- **本地优先** — 数据存在本地，不上传云端，保护来访者隐私
- **单用户** — 当前版本为个人使用设计

## License

MIT
