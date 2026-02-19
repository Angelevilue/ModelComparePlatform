# ModelCompare - 模型回答对比平台

一个支持单模型对话和多模型对比的交互式平台，帮助用户对比不同AI模型的回答效果。支持Web端和Electron桌面端，实现多端数据同步。

## 功能特性

### 核心功能
- **单模型对话模式**：与单个AI模型进行连续对话
- **多模型对比模式**：同时对比 2-4 个模型的回答
- **流式响应**：AI回答逐字显示，提供更好的用户体验
- **系统提示词**：支持自定义系统提示词，可保存为模板
- **消息编辑**：支持修改和删除对话消息
- **取消生成**：生成过程中可随时点击停止按钮取消生成

### 模型管理
- 支持多种模型提供商：OpenAI、Anthropic、Google、智谱AI、阿里云、硅基流动等
- 支持自定义模型配置（Base URL、API Key、模型参数等）
- 模型参数可调：temperature、max_tokens、top_p
- 本地模型支持（通过 OpenAI 兼容接口）
- 配置数据同步：Web端和桌面端共享同一配置文件

### 界面特性
- Markdown 渲染支持（代码块、表格、列表等）
- 代码语法高亮
- 响应式设计
- 快捷键支持
- 消息复制、重新生成、修改、删除
- 侧边栏隐藏/展开
- 输入框智能聚焦：生成完成后自动聚焦输入框

## 技术栈

- **框架**: React 18 + TypeScript
- **桌面应用**: Electron
- **后端服务**: Express + Node.js
- **构建工具**: Vite
- **样式**: TailwindCSS
- **状态管理**: Zustand
- **Markdown渲染**: react-markdown + remark-gfm
- **代码高亮**: react-syntax-highlighter
- **图标**: lucide-react

## 快速开始

### 安装依赖
```bash
npm install
```

### Web 开发模式
```bash
npm run dev
```

### 后端 + Web 开发模式（推荐）
```bash
npm run dev:all
```
这会同时启动后端API服务(3001端口)和前端开发服务器(5186端口)

### Electron 桌面开发模式
```bash
npm run electron:dev
```
这会同时启动后端服务、前端服务器和Electron桌面应用

### 构建
```bash
# 构建 Web 版本
npm run build

# 构建 Electron 桌面应用
npm run electron:build:mac   # macOS
npm run electron:build:win   # Windows
```

## 使用说明

### 1. 配置模型
1. 点击侧边栏的"设置"按钮
2. 在"模型配置"标签页中添加你的模型
3. 输入模型名称、API Key 和 Base URL
4. 支持的提供商包括：OpenAI、Anthropic、Google、智谱AI、阿里云、硅基流动、自定义

### 2. 单模型对话
1. 点击"新对话"按钮
2. 选择要使用的模型
3. 输入系统提示词（可选）
4. 开始对话

### 3. 模型对比
1. 点击"模型对比"按钮
2. 选择 2-4 个要对比的模型
3. 输入系统提示词（可选，可为每个模型单独设置）
4. 输入问题，所有模型将同时回答

### 4. 消息操作
- **修改消息**：点击用户消息下方的修改按钮，可以重新编辑问题并重新生成回答
- **删除消息**：点击用户消息下方的删除按钮，删除该问题及对应的回答
- **取消生成**：生成过程中点击红色"停止"按钮可取消当前生成

### 5. 侧边栏操作
- 点击侧边栏顶部的隐藏按钮可以收起侧边栏
- 点击左侧边缘的展开按钮可以展开侧边栏

### 快捷键
- `Ctrl/Cmd + Enter`: 发送消息
- `Ctrl/Cmd + Shift + Enter`: 换行
- `Ctrl/Cmd + N`: 新建对话
- `Esc`: 取消生成 / 关闭弹窗

## 项目结构

```
ModelComparePlatform/
├── src/                          # 前端源代码
│   ├── components/               # React 组件
│   │   ├── chat/                 # 聊天相关组件
│   │   │   ├── ChatContainer.tsx    # 聊天容器（含取消生成逻辑）
│   │   │   ├── ChatInput.tsx        # 输入框组件（含停止按钮）
│   │   │   ├── MessageBubble.tsx    # 消息气泡（含编辑/删除）
│   │   │   ├── MessageList.tsx      # 消息列表
│   │   │   ├── ModelSelector.tsx    # 模型选择器
│   │   │   ├── FileAttachment.tsx   # 文件附件
│   │   │   └── AgentConfigButton.tsx # 智能体配置
│   │   ├── compare/              # 对比模式组件
│   │   │   ├── CompareContainer.tsx # 对比容器
│   │   │   └── ComparePanel.tsx     # 对比面板
│   │   ├── settings/             # 设置组件
│   │   │   ├── SettingsModal.tsx    # 设置弹窗
│   │   │   ├── ModelConfigForm.tsx  # 模型配置表单
│   │   │   └── SystemPromptEditor.tsx # 系统提示词编辑器
│   │   └── common/               # 通用组件
│   │       ├── Button.tsx
│   │       ├── Modal.tsx
│   │       ├── Toast.tsx
│   │       └── Loading.tsx
│   ├── stores/                   # 状态管理
│   │   ├── chatStore.ts          # 对话状态
│   │   ├── modelStore.ts         # 模型状态（含同步逻辑）
│   │   └── settingsStore.ts      # 设置状态
│   ├── services/                 # API 服务
│   │   ├── api.ts                # 后端 API 服务
│   │   ├── streaming.ts          # 流式生成管理
│   │   └── openai.ts             # OpenAI API 封装
│   ├── types/                    # TypeScript 类型
│   │   ├── chat.ts               # 对话相关类型
│   │   ├── model.ts              # 模型相关类型
│   │   └── index.ts              # 类型导出
│   ├── utils/                    # 工具函数
│   │   ├── helpers.ts            # 通用工具
│   │   └── storage.ts            # 本地存储工具
│   ├── styles/                   # 样式文件
│   │   └── index.css
│   ├── App.tsx                   # 应用根组件
│   ├── main.tsx                  # 应用入口
│   └── electron.d.ts             # Electron 类型定义
├── electron/                     # Electron 桌面应用
│   ├── main.cjs                  # 主进程
│   └── preload.cjs               # 预加载脚本
├── config/                       # 配置文件目录（gitignored）
│   └── models.json               # 模型配置文件
├── server.cjs                    # Express 后端服务
├── package.json                  # 项目配置
├── vite.config.ts                # Vite 配置
├── tailwind.config.js            # TailwindCSS 配置
├── tsconfig.json                 # TypeScript 配置
└── README.md                     # 项目说明
```

## 数据持久化

### 配置同步机制
项目采用三层数据存储策略：

1. **后端 API 服务**（优先级最高）
   - 启动后端服务后，所有模型配置通过 API 同步
   - 配置文件位置：`项目目录/config/models.json`
   - 桌面端和 Web 端共享同一配置文件

2. **Electron 本地文件**（备用）
   - 当后端不可用时，桌面端直接读写本地文件
   - 文件位置：`项目目录/config/models.json`

3. **浏览器 localStorage**（降级）
   - 当后端和本地文件都不可用时使用
   - 存储对话历史、用户设置等

### 启动方式与数据同步

**Web 单独模式** (`npm run dev`):
- 仅使用 localStorage
- 数据不与其他端同步

**后端 + Web 模式** (`npm run dev:all`):
- 模型配置通过后端 API 同步到 `config/models.json`
- Web 端和桌面端共享配置

**桌面端模式** (`npm run electron:dev`):
- 自动启动后端服务
- 支持本地文件直接读写
- 完整的配置同步能力

## 注意事项

1. **API Key 安全**：API Key 存储在本地配置文件中，仅经过简单的 XOR 加密。请勿在公共电脑上使用，也不要分享包含 API Key 的配置文件。

2. **CORS 限制**：由于浏览器安全限制，部分 API 可能需要配置 CORS 代理。

3. **流式响应**：流式响应使用 Server-Sent Events (SSE) 实现，需要 API 提供商支持。

4. **端口占用**：
   - 后端服务默认使用 3001 端口
   - 前端开发服务器默认使用 5186 端口
   - 如端口被占用，请关闭占用程序或修改配置

## 许可证

MIT
