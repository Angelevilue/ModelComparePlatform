import type { 
  ModelConfig, 
  ChatCompletionRequest, 
  ChatCompletionResponse, 
  ChatCompletionStreamChunk 
} from '@/types';

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
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[]
): AsyncGenerator<string, void, unknown> {
  const requestBody: ChatCompletionRequest = {
    model: config.modelId,
    messages,
    temperature: config.temperature,
    max_tokens: config.maxTokens,
    top_p: config.topP,
    stream: true,
  };

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
            if (content) {
              yield content;
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
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
