# ModelCompare - 模型回答对比平台

一个支持单模型对话和多模型对比的交互式平台，帮助用户对比不同AI模型的回答效果。

## 功能特性

### 核心功能
- **单模型对话模式**：与单个AI模型进行连续对话
- **多模型对比模式**：同时对比 2-4 个模型的回答
- **流式响应**：AI回答逐字显示，提供更好的用户体验
- **系统提示词**：支持自定义系统提示词，可保存为模板
- **消息编辑**：支持修改和删除对话消息

### 模型管理
- 支持多种模型提供商：OpenAI、Anthropic、Google、智谱AI、阿里云、硅基流动等
- 支持自定义模型配置（Base URL、API Key、模型参数等）
- 模型参数可调：temperature、max_tokens、top_p
- 本地模型支持（通过 OpenAI 兼容接口）

### 界面特性
- Markdown 渲染支持（代码块、表格、列表等）
- 代码语法高亮
- 响应式设计
- 快捷键支持
- 消息复制、重新生成、修改、删除
- 侧边栏隐藏/展开

## 技术栈

- **框架**: React 18 + TypeScript
- **桌面应用**: Electron
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

### Electron 开发模式
```bash
npm run electron:dev
```

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
src/
├── components/
│   ├── chat/           # 聊天相关组件
│   ├── compare/        # 对比模式组件
│   ├── settings/       # 设置组件
│   └── common/         # 通用组件
├── hooks/              # 自定义 Hooks
├── stores/             # 状态管理 (Zustand)
├── types/              # TypeScript 类型定义
├── services/           # API 服务
├── utils/              # 工具函数
└── styles/             # 样式文件

electron/
├── main.cjs            # Electron 主进程
└── preload.cjs         # 预加载脚本
```

## 数据持久化

### Web 版本
所有数据均存储在浏览器 localStorage 中：
- 对话历史
- 模型配置（API Key 经过简单加密）
- 用户设置

### Electron 桌面应用
- 模型配置会同步保存到本地文件：`~/Library/Application Support/model-compare-platform/config/models.json`
- 对话历史和用户设置保存在 localStorage 中

## 注意事项

1. **API Key 安全**：API Key 存储在本地，仅经过简单的 XOR 加密。请勿在公共电脑上使用，也不要分享包含 API Key 的配置文件。

2. **CORS 限制**：由于浏览器安全限制，部分 API 可能需要配置 CORS 代理。

3. **流式响应**：流式响应使用 Server-Sent Events (SSE) 实现，需要 API 提供商支持。

## 许可证

MIT
