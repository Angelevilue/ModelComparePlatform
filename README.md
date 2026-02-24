# ModelCompare - AI Model Answer Comparison Platform

An interactive platform supporting single-model chat and multi-model comparison, helping users compare responses from different AI models. Supports Web and Electron desktop clients with multi-end data synchronization.

## Features

### Core Features
- **Single Model Chat Mode**: Continuous conversation with a single AI model
- **Multi-Model Comparison Mode**: Compare responses from 2-4 models simultaneously
- **Streaming Responses**: AI answers appear word-by-word for better UX
- **System Prompts**: Custom system prompts with template saving support
- **Message Editing**: Edit and delete conversation messages
- **Cancel Generation**: Stop generation mid-process at any time
- **Conversation Sharing**: Generate shareable links to share conversations
- **Context Limitation**: Automatically limited to last 10 conversation rounds to reduce token usage
- **Agent Mode**: When search tool is selected, model autonomously decides when to search the web
- **Image Understanding**: Support pasting or uploading images for model to analyze

### Model Management
- Support for multiple model providers: OpenAI, Anthropic, Google, Zhipu AI, Alibaba Cloud, SiliconFlow, etc.
- Custom model configuration (Base URL, API Key, model parameters)
- Adjustable model parameters: temperature, max_tokens, top_p
- Local model support (via OpenAI compatible interface)
- Configuration sync: Web and desktop clients share the same config file
- **MCP Tool Support**: Extend AI capabilities via Model Context Protocol, supporting web search, code execution, etc.

### Interface Features
- Markdown rendering support (code blocks, tables, lists, etc.)
- Code syntax highlighting
- Responsive design
- Keyboard shortcuts
- Message copy, regenerate, edit, delete
- Sidebar collapse/expand
- Smart input focus: Auto-focus input after generation completes
- Persist current conversation and history on page refresh
- **Image Paste/Upload**: Support Ctrl+V to paste images or click upload button
- **Smart Scrolling**: Auto-scroll to bottom during generation, pause when user scrolls manually
- **Sub-Agent Selection**: Built-in professional agents (document expert, code expert, translator, etc.)

## Tech Stack

- **Framework**: React 18 + TypeScript
- **Desktop App**: Electron
- **Backend**: Express + Node.js
- **Database**: PostgreSQL 16 (Docker)
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **State Management**: Zustand
- **Markdown Rendering**: react-markdown + remark-gfm
- **Code Highlighting**: react-syntax-highlighter
- **Icons**: lucide-react

## Quick Start

### Install Dependencies
```bash
npm install
```

### Start PostgreSQL Database
```bash
npm run db:start
```
Database tables will be created automatically on first launch. See [PostgreSQL Database Guide](docs/database.md) for detailed usage.

### Web Development Mode
```bash
npm run dev
```

### Backend + Web Development Mode (Recommended)
```bash
npm run dev:all
```
This starts both the backend API service (port 3001) and frontend dev server (port 5186)

### MCP Mode (With Tool Calling)
```bash
npm run mcp:start
```
This starts the MCP proxy, backend API service, and frontend dev server simultaneously.

**What is MCP?**
MCP (Model Context Protocol) enables AI models to use external tools:
- **Web Search**: Model can autonomously search the internet for real-time information
- **Image Understanding**: Upload or paste images for AI to analyze

When MCP is enabled, select the search tool in the chat input to enable intelligent search mode.

### Electron Desktop Development Mode
```bash
npm run electron:dev
```
This starts the backend service, frontend server, and Electron desktop app

### Build
```bash
# Build Web version
npm run build

# Build Electron Desktop App
npm run electron:build:mac   # macOS
npm run electron:build:win   # Windows
```

## Usage Guide

### 1. Configure Models
1. Click the "Settings" button in the sidebar
2. Add your model in the "Model Configuration" tab
3. Enter model name, API Key, and Base URL
4. Supported providers: OpenAI, Anthropic, Google, Zhipu AI, Alibaba Cloud, SiliconFlow, Custom

### 2. Single Model Chat
1. Click the "New Chat" button
2. Select the model to use
3. Enter system prompt (optional)
4. Start chatting

### 3. Model Comparison
1. Click the "Model Comparison" button
2. Select 2-4 models to compare
3. Enter system prompt (optional, can be set individually for each model)
4. Enter your question, all models will answer simultaneously

### 4. Message Operations
- **Edit Message**: Click the edit button below user messages to edit and regenerate
- **Delete Message**: Click the delete button below user messages to delete the question and its answer
- **Cancel Generation**: Click the red "Stop" button during generation to cancel
- **Share Conversation**: Click the share button in the top right, select messages to share, generate a link to share with others

### 5. Tool Usage
- **Web Search**: Click the search icon above the input to enable search tool. The model will autonomously decide when to search the web
- **Image Understanding**: Two methods supported:
  - Ctrl+V directly to paste image from clipboard
  - Click upload button to select image file
- **Sub-Agents**: Click the "Agent" button to select professional agents like code expert, document expert, translator, etc.

### 6. Scroll Behavior
- When sending a new question, window auto-scrolls to bottom
- Auto-scrolls continuously during generation to show new content
- Auto-scroll pauses when user manually scrolls up to view history
- Auto-scroll resumes 1.5 seconds after user stops manual scrolling

### 7. Sidebar Operations
- Click the collapse button at the top of sidebar to hide the sidebar
- Click the expand button on the left edge to expand the sidebar

### Keyboard Shortcuts
- `Ctrl/Cmd + Enter`: Send message
- `Ctrl/Cmd + Shift + Enter`: New line
- `Ctrl/Cmd + N`: New conversation
- `Esc`: Cancel generation / Close modal

## Project Structure

```
ModelComparePlatform/
├── src/                          # Frontend source code
│   ├── components/               # React components
│   │   ├── chat/                 # Chat components
│   │   │   ├── ChatContainer.tsx    # Chat container (includes cancel generation logic)
│   │   │   ├── ChatInput.tsx        # Input component (includes stop button)
│   │   │   ├── MessageBubble.tsx    # Message bubble (edit/delete)
│   │   │   ├── MessageList.tsx     # Message list
│   │   │   ├── ModelSelector.tsx    # Model selector
│   │   │   ├── FileAttachment.tsx   # File attachment
│   │   │   └── AgentConfigButton.tsx # Agent configuration
│   │   ├── compare/              # Comparison mode components
│   │   │   ├── CompareContainer.tsx # Comparison container
│   │   │   └── ComparePanel.tsx     # Comparison panel
│   │   ├── settings/             # Settings components
│   │   │   ├── SettingsModal.tsx    # Settings modal
│   │   │   ├── ModelConfigForm.tsx  # Model config form
│   │   │   └── SystemPromptEditor.tsx # System prompt editor
│   │   ├── share/                # Share feature components
│   │   │   ├── ShareModal.tsx      # Share modal
│   │   │   └── ShareView.tsx      # Share view
│   │   └── common/               # Common components
│   │       ├── Button.tsx
│   │       ├── Modal.tsx
│   │       ├── Toast.tsx
│   │       └── Loading.tsx
│   ├── stores/                   # State management
│   │   ├── chatStore.ts          # Chat state
│   │   ├── modelStore.ts         # Model state (includes sync logic)
│   │   └── settingsStore.ts      # Settings state
│   ├── services/                 # API services
│   │   ├── api.ts                # Backend API service
│   │   ├── streaming.ts           # Streaming generation management
│   │   └── openai.ts             # OpenAI API wrapper
│   ├── types/                    # TypeScript types
│   │   ├── chat.ts               # Chat-related types
│   │   ├── model.ts              # Model-related types
│   │   └── index.ts              # Type exports
│   ├── utils/                    # Utility functions
│   │   ├── helpers.ts            # Common utilities
│   │   └── storage.ts            # Local storage utilities
│   ├── styles/                   # Style files
│   │   └── index.css
│   ├── App.tsx                   # App root component
│   ├── main.tsx                  # App entry
│   └── electron.d.ts             # Electron type definitions
├── electron/                      # Electron desktop app
│   ├── main.cjs                  # Main process
│   └── preload.cjs               # Preload script
├── config/                       # Config directory (gitignored)
│   └── models.json               # Model config file
├── docs/                         # Documentation
│   └── database.md               # PostgreSQL database guide
├── server.cjs                    # Express backend service
├── # PostgreSQL Docker docker-compose.yml            config
├── init.sql                      # Database init script
├── .env.example                  # Environment variables example
├── package.json                  # Project config
├── vite.config.ts                # Vite config
├── tailwind.config.js            # TailwindCSS config
├── tsconfig.json                 # TypeScript config
└── README.md                     # Project readme
```

## Data Persistence

### Database Storage

This project uses **PostgreSQL** database to store conversation history and model configurations, enabling multi-end data sync.

- See [PostgreSQL Database Guide](docs/database.md) for detailed usage
- Database management commands:
  - `npm run db:start` - Start database
  - `npm run db:stop` - Stop database
  - `npm run db:reset` - Reset database

### Data Sync Mechanism

The project uses a three-layer data storage strategy:

1. **PostgreSQL Database** (Highest Priority)
   - Used when backend service connects successfully
   - Supports real-time multi-end data sync
   - Persistent data storage

2. **Local File Storage** (Backup)
   - Automatically falls back when database is unavailable
   - Config file location: `config/models.json`

3. **Browser localStorage** (Fallback)
   - Used when backend service is unavailable
   - Local temporary storage only

## Notes

1. **API Key Security**: API keys are stored in local config files with simple XOR encryption only. Do not use on public computers or share config files containing API keys.

2. **CORS Restrictions**: Due to browser security restrictions, some APIs may require CORS proxy configuration.

3. **Streaming Responses**: Streaming responses use Server-Sent Events (SSE), requiring API provider support.

4. **Port Usage**:
   - Backend service defaults to port 3001
   - Frontend dev server defaults to port 5186
   - If ports are occupied, close the occupying program or modify the config

## License

MIT
