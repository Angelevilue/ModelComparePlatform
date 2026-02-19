// 消息角色
export type MessageRole = 'user' | 'assistant' | 'system';

// 消息对象
export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  modelId?: string;
  isError?: boolean;
  isStreaming?: boolean;
}

// 对话会话
export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  systemPrompt: string;
  modelIds: string[];
  createdAt: number;
  updatedAt: number;
  mode: 'single' | 'compare';
  compareCount?: number; // 对比模式下的模型数量
}

// 聊天状态
export interface ChatState {
  conversations: Conversation[];
  currentConversationId: string | null;
  isGenerating: boolean;
}

// 发送消息参数
export interface SendMessageParams {
  content: string;
  conversationId: string;
  modelIds: string[];
  systemPrompt?: string;
}

// 流式消息更新
export interface StreamingUpdate {
  messageId: string;
  content: string;
  isComplete?: boolean;
  isError?: boolean;
}
