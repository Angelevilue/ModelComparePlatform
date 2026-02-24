import { createChatCompletionStream, callMCPTool, getMCPTools } from './openai';
import type { ModelConfig, Message, Tool } from '@/types';

export interface StreamHandler {
  onToken: (token: string) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
  onToolCall?: (toolCalls: { id: string; name: string; arguments: string; result: string }[]) => void;
}

type ChatMessage = { role: 'system' | 'user' | 'assistant' | 'tool'; content: string | null; tool_calls?: any[]; tool_call_id?: string };

// 流式生成管理器
export class StreamingManager {
  private abortControllers: Map<string, AbortController> = new Map();
  private isCancelled: Set<string> = new Set();

  // 开始流式生成（支持工具调用）
  async streamGenerate(
    modelConfig: ModelConfig,
    messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
    conversationId: string,
    messageId: string,
    handler: StreamHandler,
    enableTools: boolean = false
  ): Promise<void> {
    console.log('[StreamingManager] streamGenerate called, enableTools:', enableTools);
    const key = `${conversationId}-${messageId}`;
    
    if (this.isCancelled.has(key)) {
      return;
    }

    let tools: Tool[] = [];
    if (enableTools) {
      tools = await getMCPTools();
      console.log('[Stream] Tools loaded:', tools.map(t => t.function.name));
    }

    // 构建当前消息列表（用于工具调用循环）
    let currentMessages: ChatMessage[] = [...messages] as ChatMessage[];
    console.log('[Stream] Messages:', currentMessages.length);
    console.log('[Stream] Enable tools:', enableTools);
    let hasToolCalls = true;
    let maxToolCalls = 5; // 最多调用5次工具，防止无限循环

    try {
      while (hasToolCalls && maxToolCalls > 0) {
        hasToolCalls = false;
        
        const stream = createChatCompletionStream(modelConfig, currentMessages as any, tools);
        let fullContent = '';
        let toolCalls: { index?: number; id: string | null; type: string | null; function: { name: string; arguments: string } }[] = [];
        
        for await (const chunk of stream) {
          if (this.isCancelled.has(key)) {
            return;
          }

          if (chunk.type === 'content' && chunk.content) {
            fullContent += chunk.content;
            handler.onToken(chunk.content);
          } else if (chunk.type === 'tool_calls' && chunk.tool_calls) {
            console.log('[Stream] Tool calls received:', chunk.tool_calls);
            toolCalls = chunk.tool_calls;
          }
        }

        console.log('[Stream] Final tool calls:', toolCalls.length);

        // 检查是否有工具调用
        if (toolCalls.length > 0 && !this.isCancelled.has(key)) {
          hasToolCalls = true;
          maxToolCalls--;

          // 将助手的工具调用添加到消息历史
          // 注意：当有 tool_calls 时，content 应该为空或 null
          currentMessages.push({
            role: 'assistant' as const,
            content: fullContent || null,
            tool_calls: toolCalls.map(tc => ({
              id: tc.id || `temp_${tc.index}`,
              type: 'function' as const,
              function: {
                name: tc.function.name,
                arguments: tc.function.arguments
              }
            }))
          });

          // 执行工具调用并添加结果到消息历史
          const toolCallResults: { id: string; name: string; arguments: string; result: string }[] = [];
          
          for (const toolCall of toolCalls) {
            try {
              const args = JSON.parse(toolCall.function.arguments || '{}');
              const result = await callMCPTool(toolCall.function.name, args);
              
              toolCallResults.push({
                id: toolCall.id || `temp_${toolCall.index}`,
                name: toolCall.function.name,
                arguments: JSON.stringify(args),
                result: result
              });
              
              currentMessages.push({
                role: 'tool' as const,
                content: result,
                tool_call_id: toolCall.id || undefined
              });
            } catch (e) {
              console.error('Tool call error:', e);
              const errorResult = `工具调用失败: ${e instanceof Error ? e.message : '未知错误'}`;
              toolCallResults.push({
                id: toolCall.id || `temp_${toolCall.index}`,
                name: toolCall.function.name,
                arguments: JSON.stringify({}),
                result: errorResult
              });
              currentMessages.push({
                role: 'tool' as const,
                content: errorResult,
                tool_call_id: toolCall.id || undefined
              });
            }
          }
          
          // 通知有工具调用
          if (handler.onToolCall && toolCallResults.length > 0) {
            handler.onToolCall(toolCallResults);
          }
        } else {
          // 没有更多工具调用，生成完成
          if (!this.isCancelled.has(key)) {
            handler.onComplete();
          }
          break;
        }
      }

      if (maxToolCalls <= 0 && hasToolCalls) {
        handler.onToken('\n\n[已达到最大工具调用次数]');
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

const MAX_CONTEXT_ROUNDS = 10;

export function buildMessageHistory(
  messages: Message[],
  systemPrompt: string,
  maxRounds: number = MAX_CONTEXT_ROUNDS
): { role: 'system' | 'user' | 'assistant'; content: string }[] {
  const result: { role: 'system' | 'user' | 'assistant'; content: string }[] = [];
  
  if (systemPrompt.trim()) {
    result.push({ role: 'system', content: systemPrompt });
  }
  
  // 一轮对话 = 一条用户消息 + 一条AI回复
  // 从后往前找最近 maxRounds 条用户消息的位置，即最近 maxRounds 轮对话
  let userCount = 0;
  let startIndex = 0;
  
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') {
      userCount++;
      if (userCount >= maxRounds) {
        startIndex = i;
        break;
      }
    }
  }
  
  // 只取 startIndex 之后的消息作为上下文（约 maxRounds * 2 条消息）
  const contextMessages = messages.slice(startIndex);
  
  for (const msg of contextMessages) {
    if (msg.role !== 'system') {
      result.push({
        role: msg.role as 'user' | 'assistant',
        content: msg.content || '',
      });
    }
  }
  
  return result;
}
