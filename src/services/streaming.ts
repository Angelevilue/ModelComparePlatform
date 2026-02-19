import { createChatCompletionStream } from './openai';
import type { ModelConfig, Message } from '@/types';

export interface StreamHandler {
  onToken: (token: string) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

// 流式生成管理器
export class StreamingManager {
  private abortControllers: Map<string, AbortController> = new Map();
  private isCancelled: Set<string> = new Set();

  // 开始流式生成
  async streamGenerate(
    modelConfig: ModelConfig,
    messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
    conversationId: string,
    messageId: string,
    handler: StreamHandler
  ): Promise<void> {
    const key = `${conversationId}-${messageId}`;
    
    if (this.isCancelled.has(key)) {
      return;
    }

    try {
      const stream = createChatCompletionStream(modelConfig, messages);
      
      for await (const token of stream) {
        if (this.isCancelled.has(key)) {
          break;
        }
        handler.onToken(token);
      }

      if (!this.isCancelled.has(key)) {
        handler.onComplete();
      }
    } catch (error) {
      if (!this.isCancelled.has(key)) {
        handler.onError(error instanceof Error ? error : new Error(String(error)));
      }
    } finally {
      this.cleanup(key);
    }
  }

  // 取消特定生成
  cancel(conversationId: string, messageId: string): void {
    const key = `${conversationId}-${messageId}`;
    this.isCancelled.add(key);
    const controller = this.abortControllers.get(key);
    if (controller) {
      controller.abort();
    }
  }

  // 取消会话中的所有生成
  cancelConversation(conversationId: string): void {
    for (const key of this.abortControllers.keys()) {
      if (key.startsWith(`${conversationId}-`)) {
        this.isCancelled.add(key);
        const controller = this.abortControllers.get(key);
        if (controller) {
          controller.abort();
        }
      }
    }
  }

  // 取消所有生成
  cancelAll(): void {
    for (const [key, controller] of this.abortControllers) {
      this.isCancelled.add(key);
      controller.abort();
    }
  }

  // 清理资源
  private cleanup(key: string): void {
    this.abortControllers.delete(key);
    this.isCancelled.delete(key);
  }

  // 检查是否已取消
  isCancelledCheck(conversationId: string, messageId: string): boolean {
    return this.isCancelled.has(`${conversationId}-${messageId}`);
  }
}

// 单例实例
export const streamingManager = new StreamingManager();

// 辅助函数：构建消息历史
export function buildMessageHistory(
  messages: Message[],
  systemPrompt: string
): { role: 'system' | 'user' | 'assistant'; content: string }[] {
  const result: { role: 'system' | 'user' | 'assistant'; content: string }[] = [];
  
  if (systemPrompt.trim()) {
    result.push({ role: 'system', content: systemPrompt });
  }
  
  for (const msg of messages) {
    if (msg.role !== 'system') {
      result.push({
        role: msg.role,
        content: msg.content,
      });
    }
  }
  
  return result;
}
