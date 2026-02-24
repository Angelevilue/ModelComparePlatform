// 模型配置
export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  modelId: string;
  apiKey: string;
  baseURL: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  isEnabled: boolean;
}

// 模型提供商预设
export interface ProviderPreset {
  name: string;
  baseURL: string;
  defaultModels: string[];
}

// MCP 服务器配置
export interface MCPServerConfig {
  id: string;
  name: string;
  url: string;
  authToken?: string;
  isEnabled: boolean;
  tools?: MCPTool[];
}

// MCP 工具
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

// 模型状态
export interface ModelState {
  configs: ModelConfig[];
  presets: ProviderPreset[];
  selectedModelIds: string[];
  mcpServers: MCPServerConfig[];
}

// OpenAI 兼容请求体
export interface ChatCompletionRequest {
  model: string;
  messages: {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string | null;
    tool_calls?: ToolCall[];
    tool_call_id?: string;
  }[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stream?: boolean;
  tools?: Tool[];
}

// 工具定义
export interface Tool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

// 工具调用
export interface ToolCall {
  id: string;
  type: 'function';
  index?: number;
  function: {
    name: string;
    arguments: string;
  };
}

// OpenAI 兼容响应
export interface ChatCompletionResponse {
  id: string;
  choices: {
    message: {
      role: string;
      content: string | null;
      tool_calls?: ToolCall[];
    };
    finish_reason: string;
  }[];
}

// 流式响应块
export interface ChatCompletionStreamChunk {
  id: string;
  choices: {
    delta: {
      content?: string;
      role?: string;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }[];
}
