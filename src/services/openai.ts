import type { 
  ModelConfig, 
  ChatCompletionRequest, 
  ChatCompletionResponse, 
  ChatCompletionStreamChunk,
  Tool
} from '@/types';
import { apiService } from './api';

export class OpenAIError extends Error {
  constructor(
    message: string, 
    public status?: number, 
    public code?: string
  ) {
    super(message);
    this.name = 'OpenAIError';
  }
}

// 获取 MCP 工具定义
export async function getMCPTools(): Promise<Tool[]> {
  try {
    const result = await apiService.getMCPTools();
    console.log('[getMCPTools] Raw result:', result);
    // API 返回的是 { tools: [...] }，不是 { result: { tools: [...] } }
    const toolsArray = result.result?.tools || result.tools;
    if (toolsArray && toolsArray.length > 0) {
      console.log('[getMCPTools] Tools found:', toolsArray.length);
      return toolsArray.map((t: any) => ({
        type: 'function' as const,
        function: {
          name: t.name,
          description: t.description || '',
          parameters: t.inputSchema || { type: 'object', properties: {} }
        }
      }));
    }
    console.log('[getMCPTools] No tools in result');
  } catch (e) {
    console.error('[getMCPTools] Failed to get MCP tools:', e);
  }
  return [];
}

// 调用 MCP 工具
export async function callMCPTool(toolName: string, args: Record<string, unknown>): Promise<string> {
  try {
    if (toolName === 'web_search') {
      const result = await apiService.webSearch(args.query as string);
      if (result && result[0]?.isError) {
        return `工具执行错误: ${result[0].text}`;
      }
      return JSON.stringify(result);
    } else if (toolName === 'understand_image') {
      const result = await apiService.understandImage(
        args.prompt as string || '描述这张图片',
        args.image_source as string
      );
      if (result && result[0]?.isError) {
        return `工具执行错误: ${result[0].text}`;
      }
      return JSON.stringify(result);
    }
    return '未知的工具';
  } catch (e) {
    return `工具调用失败: ${e instanceof Error ? e.message : '未知错误'}`;
  }
}

export { Tool };

// 创建聊天完成请求（非流式）
export async function createChatCompletion(
  config: ModelConfig,
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[]
): Promise<string> {
  const requestBody: ChatCompletionRequest = {
    model: config.modelId,
    messages,
    temperature: config.temperature,
    max_tokens: config.maxTokens,
    top_p: config.topP,
    stream: false,
  };

  const response = await fetch(`${config.baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new OpenAIError(
      errorData.error?.message || `请求失败: ${response.status}`,
      response.status,
      errorData.error?.code
    );
  }

  const data: ChatCompletionResponse = await response.json();
  return data.choices[0]?.message?.content || '';
}

// 创建流式聊天完成请求
export async function* createChatCompletionStream(
  config: ModelConfig,
  messages: { role: 'system' | 'user' | 'assistant'; content: string; tool_calls?: any[] }[],
  tools?: Tool[]
): AsyncGenerator<{ type: 'content' | 'tool_calls'; content?: string; tool_calls?: any[] }, void, unknown> {
  const requestBody: ChatCompletionRequest = {
    model: config.modelId,
    messages,
    temperature: config.temperature,
    max_tokens: config.maxTokens,
    top_p: config.topP,
    stream: true,
    tools: tools && tools.length > 0 ? tools : undefined,
  };

  console.log('[OpenAI] Request - tools:', tools?.length, 'messages:', messages.length);
  if (tools && tools.length > 0) {
    console.log('[OpenAI] Tool definitions:', JSON.stringify(tools.map(t => t.function.name)));
    console.log('[OpenAI] Full tool:', JSON.stringify(tools[0]));
  }
  console.log('[OpenAI] Request body:', JSON.stringify(requestBody).slice(0, 500));

  const response = await fetch(`${config.baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
      'Accept': 'text/event-stream',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new OpenAIError(
      errorData.error?.message || `请求失败: ${response.status}`,
      response.status,
      errorData.error?.code
    );
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new OpenAIError('无法读取响应流');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let currentToolCalls: any[] = [];

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim() === '') continue;
        if (line.trim() === 'data: [DONE]') return;
        
        if (line.startsWith('data: ')) {
          try {
            const jsonStr = line.slice(6);
            const chunk: ChatCompletionStreamChunk = JSON.parse(jsonStr);
            const content = chunk.choices[0]?.delta?.content;
            const toolCalls = chunk.choices[0]?.delta?.tool_calls;
            const finishReason = chunk.choices[0]?.finish_reason;
            
            if (toolCalls && toolCalls.length > 0) {
              console.log('[OpenAI] Tool calls in chunk:', JSON.stringify(toolCalls));
              for (const tc of toolCalls) {
                const index = tc.index ?? 0;
                const existingIdx = currentToolCalls.findIndex(t => t.index === index);
                if (existingIdx >= 0) {
                  // 追加 arguments
                  if (tc.function?.arguments) {
                    currentToolCalls[existingIdx].function.arguments += tc.function.arguments;
                  }
                } else {
                  // 新增 tool_call
                  currentToolCalls.push({
                    index: index,
                    id: tc.id,
                    type: tc.type,
                    function: {
                      name: tc.function?.name || '',
                      arguments: tc.function?.arguments || ''
                    }
                  });
                }
              }
            }
            
            if (finishReason) {
              console.log('[OpenAI] Finish reason:', finishReason);
            }
            
            // 先返回内容，但保留 tool_calls
            if (content) {
              yield { type: 'content', content };
            }
            
            // 如果 finish_reason 是 tool_calls，说明模型想要调用工具
            // 立即返回累积的 tool_calls
            if (finishReason === 'tool_calls' && currentToolCalls.length > 0) {
              yield { type: 'tool_calls', tool_calls: [...currentToolCalls] };
              currentToolCalls = [];
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    }
    
    // 流结束后检查是否还有未返回的 tool_calls
    if (currentToolCalls.length > 0) {
      yield { type: 'tool_calls', tool_calls: currentToolCalls };
    }
  } finally {
    reader.releaseLock();
  }
}

// 验证 API Key 是否有效
export async function validateApiKey(config: ModelConfig): Promise<boolean> {
  try {
    await createChatCompletion(config, [
      { role: 'user', content: 'Hello' }
    ]);
    return true;
  } catch (error) {
    return false;
  }
}
