import { useState, useCallback, useRef } from 'react';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { ModelSelector } from './ModelSelector';
import { SystemPromptEditor } from '../settings/SystemPromptEditor';
import { ShareModal } from '../share/ShareModal';

import { useChatStore } from '@/stores/chatStore';
import { useModelStore } from '@/stores/modelStore';
import { streamingManager, buildMessageHistory } from '@/services/streaming';
import { apiService } from '@/services/api';
import type { Attachment } from './FileAttachment';

import { Trash2, Settings, MessageSquarePlus, Share2 } from 'lucide-react';

// 格式化搜索结果
function formatSearchResult(result: any): string {
  try {
    if (result && result[0]?.isError) {
      return `搜索出错: ${result[0].text}`;
    }
    
    const data = result?.[0]?.content?.[0]?.text || result;
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        const results = parsed.organic || [];
        if (results.length === 0) {
          return '未找到相关搜索结果';
        }
        return results.slice(0, 5).map((r: any, i: number) => 
          `${i + 1}. **${r.title}**\n   ${r.snippet || ''}\n   ${r.link || ''}`
        ).join('\n\n');
      } catch {
        return String(data);
      }
    }
    return JSON.stringify(result, null, 2);
  } catch (e) {
    return `搜索结果解析失败: ${e instanceof Error ? e.message : '未知错误'}`;
  }
}

// 格式化图片理解结果
function formatImageResult(result: any): string {
  try {
    if (result && result[0]?.isError) {
      return `图片识别出错: ${result[0].text}`;
    }
    
    const data = result?.[0]?.content?.[0]?.text || result;
    if (typeof data) {
      return String(data);
    }
    return JSON.stringify(result, null, 2);
  } catch (e) {
    return `图片识别结果解析失败: ${e instanceof Error ? e.message : '未知错误'}`;
  }
}

interface ChatContainerProps {
  conversationId: string;
  onOpenSettings: () => void;
}

export function ChatContainer({ conversationId, onOpenSettings }: ChatContainerProps) {
  const { 
    getConversationById, 
    addMessage, 
    updateMessage, 
    clearMessages,
    setGenerating,
    createConversation,
    setCurrentConversation,
    deleteMessage 
  } = useChatStore();
  const { selectedModelIds, setSelectedModels, getConfigById } = useModelStore();
  
  const conversation = getConversationById(conversationId);
  const [systemPrompt, setSystemPrompt] = useState(conversation?.systemPrompt || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isToolLoading, setIsToolLoading] = useState(false);
  const currentMessageIdRef = useRef<string | null>(null);

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        对话不存在
      </div>
    );
  }

  const selectedModelId = selectedModelIds[0] || '';
  const modelConfig = getConfigById(selectedModelId);
  const hasMessages = conversation.messages.length > 0;
  const isInputAtCenter = !hasMessages && !isGenerating;

  const handleCancel = useCallback(() => {
    if (currentMessageIdRef.current) {
      streamingManager.cancel(conversationId, currentMessageIdRef.current);
      updateMessage(conversationId, currentMessageIdRef.current, {
        isStreaming: false,
      });
      setIsGenerating(false);
      setGenerating(false);
      currentMessageIdRef.current = null;
    }
  }, [conversationId]);

  const handleSend = useCallback(async (
    content: string, 
    attachments: Attachment[] = [],
    tool?: 'web_search' | 'understand_image' | null,
    toolArgs?: Record<string, string>
  ) => {
    if (!modelConfig || !selectedModelId) return;

    // 如果启用了工具，先调用工具获取结果
    if (tool) {
      setIsToolLoading(true);

      // 添加用户消息
      addMessage(conversationId, {
        role: 'user',
        content: tool === 'web_search'
          ? `搜索: ${toolArgs?.query || content}`
          : `识图: ${toolArgs?.prompt || content}`,
      });

      try {
        let toolResult: string;
        let rawResult: string = ''; // 原始搜索结果用于解析链接

        if (tool === 'web_search') {
          const query = toolArgs?.query || content;
          const result = await apiService.webSearch(query);
          // 提取原始搜索结果用于解析搜索链接
          // MCP 返回格式可能是 { content: [{ type: 'text', text: '{"organic": [...]}' }] }
          try {
            if (Array.isArray(result) && result[0]?.content) {
              const textContent = result[0].content[0]?.text;
              if (textContent) {
                rawResult = textContent; // 保存原始 JSON 字符串
              }
            } else if (result?.content) {
              const textContent = result.content[0]?.text;
              if (textContent) {
                rawResult = textContent;
              }
            }
          } catch (e) {
            console.error('Failed to extract raw search result:', e);
          }
          toolResult = formatSearchResult(result);
        } else if (tool === 'understand_image') {
          const imageUrl = toolArgs?.image_source || '';
          const prompt = toolArgs?.prompt || '描述这张图片';
          const result = await apiService.understandImage(prompt, imageUrl);
          toolResult = formatImageResult(result);
        } else {
          toolResult = '未知的工具';
        }

        // 现在将工具结果发送给模型，让模型基于结果回复
        const messages = buildMessageHistory(conversation.messages, systemPrompt);

        // 添加系统提示
        messages.unshift({
          role: 'system' as const,
          content: '你是一个智能助手。请根据提供的工具搜索结果或图片理解结果来回答用户的问题。'
        });

        // 添加用户的问题和工具结果
        messages.push({
          role: 'user' as const,
          content: `用户的问题: ${content}\n\n工具返回的结果:\n${toolResult}\n\n请根据以上工具结果回答用户的问题。`
        });

        // 创建助手消息，用于流式输出，并携带工具调用信息
        const toolCallId = `manual_${Date.now()}`;
        const assistantMessageId = addMessage(conversationId, {
          role: 'assistant',
          content: '',
          modelId: modelConfig.name,
          isStreaming: true,
          // 将工具信息存储在 toolCallsInfo 中，用于前端显示搜索标签
          toolCallsInfo: [{
            id: toolCallId,
            name: tool === 'web_search' ? 'web_search' : 'understand_image',
            arguments: JSON.stringify(tool === 'web_search'
              ? { query: toolArgs?.query || content }
              : { prompt: toolArgs?.prompt || content, image_source: toolArgs?.image_source || '' }),
            result: rawResult || toolResult
          }]
        });

        currentMessageIdRef.current = assistantMessageId;
        setIsGenerating(true);
        setGenerating(true);

        let fullContent = '';

        await streamingManager.streamGenerate(
          modelConfig,
          messages,
          conversationId,
          assistantMessageId,
          {
            onToken: (token) => {
              fullContent += token;
              updateMessage(conversationId, assistantMessageId, {
                content: fullContent,
              });
            },
            onComplete: () => {
              updateMessage(conversationId, assistantMessageId, {
                isStreaming: false,
              });
              setIsGenerating(false);
              setGenerating(false);
            },
            onError: (error) => {
              updateMessage(conversationId, assistantMessageId, {
                content: `错误: ${error.message}`,
                isStreaming: false,
                isError: true,
              });
              setIsGenerating(false);
              setGenerating(false);
            },
          },
          false  // 不需要再次调用工具
        );

      } catch (error) {
        // 工具调用失败时，添加一条错误消息
        addMessage(conversationId, {
          role: 'assistant',
          content: `工具调用失败: ${error instanceof Error ? error.message : '未知错误'}`,
          isError: true,
          toolCallsInfo: [{
            id: `error_${Date.now()}`,
            name: tool === 'web_search' ? 'web_search' : 'understand_image',
            arguments: JSON.stringify({}),
            result: `错误: ${error instanceof Error ? error.message : '未知错误'}`
          }]
        });
      } finally {
        setIsToolLoading(false);
      }
      return;
    }

    // 普通消息处理 - 启用自动工具调用（让模型决定是否使用工具）
    // 如果用户明确选择了工具，使用手动模式（上面的逻辑）
    const enableTools = true; // 默认启用自动工具调用
    console.log('[ChatContainer] handleSend enableTools:', enableTools, 'tool:', tool);
    
    let messageContent = content;
    
    // 处理附件
    if (attachments.length > 0) {
      const attachmentInfo = attachments.map(att => `[附件: ${att.name}]`).join('\n');
      messageContent = content 
        ? `${content}\n\n${attachmentInfo}` 
        : `请查看以下附件并回答：\n\n${attachmentInfo}`;
    }

    addMessage(conversationId, {
      role: 'user',
      content: messageContent,
    });

    const assistantMessageId = addMessage(conversationId, {
      role: 'assistant',
      content: '',
      modelId: modelConfig.name,
      isStreaming: true,
    });

    currentMessageIdRef.current = assistantMessageId;
    setIsGenerating(true);
    setGenerating(true);

    const userMessage = { 
      id: '', 
      role: 'user' as const, 
      content: messageContent, 
      timestamp: Date.now() 
    };
    
    const attachmentContents = attachments
      .filter(att => att.content && !att.type.startsWith('image/'))
      .map(att => `--- ${att.name} ---\n${att.content?.slice(0, 5000)}${(att.content?.length || 0) > 5000 ? '...(内容已截断)' : ''}`)
      .join('\n\n');
    
    if (attachmentContents) {
      userMessage.content = messageContent + '\n\n附件内容：\n\n' + attachmentContents;
    }
    
    const messages = buildMessageHistory(
      conversation.messages,
      systemPrompt
    );
    
    // 如果启用工具，在系统提示中告诉模型可以使用哪些工具
    if (enableTools) {
      messages.unshift({
        role: 'system' as const,
        content: `你是一个智能助手。你可以使用以下工具来帮助回答用户的问题：

1. web_search - 搜索网络获取最新信息。当用户询问实时信息、新闻、天气、股价等时，请主动使用此工具。
2. understand_image - 分析图片内容。当用户上传图片并询问图片相关内容时使用。

使用工具的格式是通过返回 tool_calls 来调用工具，而不是在文本中描述你会调用工具。`
      });
    }
    
    messages.push({ role: 'user' as const, content: userMessage.content });

    let fullContent = '';
    let toolCallsResult: { id: string; name: string; arguments: string; result: string }[] = [];
    
    await streamingManager.streamGenerate(
      modelConfig,
      messages,
      conversationId,
      assistantMessageId,
      {
        onToken: (token) => {
          fullContent += token;
          updateMessage(conversationId, assistantMessageId, {
            content: fullContent,
          });
        },
        onComplete: () => {
          // 在完成时才显示工具调用信息
          updateMessage(conversationId, assistantMessageId, {
            isStreaming: false,
            toolCallsInfo: toolCallsResult.length > 0 ? toolCallsResult : undefined,
          });
          setIsGenerating(false);
          setGenerating(false);
        },
        onError: (error) => {
          updateMessage(conversationId, assistantMessageId, {
            content: `错误: ${error.message}`,
            isStreaming: false,
            isError: true,
          });
          setIsGenerating(false);
          setGenerating(false);
        },
        onToolCall: (toolCalls) => {
          console.log('[ChatContainer] Tool calls executed:', toolCalls);
          toolCallsResult = toolCalls;
          
          // 将工具结果存储在助手消息的 toolCallsInfo 中，而不是单独添加 tool 消息
          updateMessage(conversationId, assistantMessageId, {
            toolCallsInfo: toolCalls.map(tc => ({
              id: tc.id,
              name: tc.name,
              arguments: tc.arguments,
              result: tc.result,
            })),
          });
        },
      },
      enableTools  // 启用工具调用
    );
  }, [conversationId, conversation?.messages, modelConfig, selectedModelId, systemPrompt]);

  const handleRegenerate = useCallback(async (messageId: string) => {
    if (!modelConfig) return;

    const messageIndex = conversation.messages.findIndex((m) => m.id === messageId);
    if (messageIndex <= 0) return;

    const historyMessages = conversation.messages.slice(0, messageIndex);
    
    updateMessage(conversationId, messageId, {
      content: '',
      isStreaming: true,
      isError: false,
    });

    setIsGenerating(true);
    setGenerating(true);

    const messages = buildMessageHistory(historyMessages, systemPrompt);

    let fullContent = '';
    
    await streamingManager.streamGenerate(
      modelConfig,
      messages,
      conversationId,
      messageId,
      {
        onToken: (token) => {
          fullContent += token;
          updateMessage(conversationId, messageId, {
            content: fullContent,
          });
        },
        onComplete: () => {
          updateMessage(conversationId, messageId, {
            isStreaming: false,
          });
          setIsGenerating(false);
          setGenerating(false);
        },
        onError: (error) => {
          updateMessage(conversationId, messageId, {
            content: `错误: ${error.message}`,
            isStreaming: false,
            isError: true,
          });
          setIsGenerating(false);
          setGenerating(false);
        },
      },
      false  // 重新生成时不启用工具
    );
  }, [conversationId, conversation?.messages, modelConfig, systemPrompt]);

  const handleNewChat = () => {
    const newId = createConversation('single');
    setCurrentConversation(newId);
  };

  const handleDelete = useCallback((messageId: string) => {
    const messageIndex = conversation.messages.findIndex((m) => m.id === messageId);
    if (messageIndex < 0) return;

    const message = conversation.messages[messageIndex];
    
    if (message.role === 'user') {
      deleteMessage(conversationId, messageId);
      const nextMessageIndex = messageIndex + 1;
      if (nextMessageIndex < conversation.messages.length) {
        const nextMessage = conversation.messages[nextMessageIndex];
        if (nextMessage.role === 'assistant') {
          deleteMessage(conversationId, nextMessage.id);
        }
      }
    } else if (message.role === 'assistant') {
      const prevMessageIndex = messageIndex - 1;
      if (prevMessageIndex >= 0) {
        const prevMessage = conversation.messages[prevMessageIndex];
        if (prevMessage.role === 'user') {
          deleteMessage(conversationId, prevMessage.id);
        }
      }
      deleteMessage(conversationId, messageId);
    }
  }, [conversationId, conversation?.messages]);

  const handleEdit = useCallback(async (messageId: string, newContent: string) => {
    if (!modelConfig || !selectedModelId) return;

    const messageIndex = conversation.messages.findIndex((m) => m.id === messageId);
    if (messageIndex < 0) return;

    updateMessage(conversationId, messageId, {
      content: newContent,
    });

    const nextMessageIndex = messageIndex + 1;
    if (nextMessageIndex >= conversation.messages.length) {
      const assistantMessageId = addMessage(conversationId, {
        role: 'assistant',
        content: '',
        modelId: modelConfig.name,
        isStreaming: true,
      });

      setIsGenerating(true);
      setGenerating(true);

      const historyMessages = conversation.messages.slice(0, messageIndex + 1);
      const messages = buildMessageHistory(historyMessages, systemPrompt);

      let fullContent = '';
      
      await streamingManager.streamGenerate(
        modelConfig,
        messages,
        conversationId,
        assistantMessageId,
        {
          onToken: (token) => {
            fullContent += token;
            updateMessage(conversationId, assistantMessageId, {
              content: fullContent,
            });
          },
          onComplete: () => {
            updateMessage(conversationId, assistantMessageId, {
              isStreaming: false,
            });
            setIsGenerating(false);
            setGenerating(false);
          },
          onError: (error) => {
            updateMessage(conversationId, assistantMessageId, {
              content: `错误: ${error.message}`,
              isStreaming: false,
              isError: true,
            });
            setIsGenerating(false);
            setGenerating(false);
          },
        },
        false  // 编辑时不启用工具
      );
    } else {
      const nextMessage = conversation.messages[nextMessageIndex];
      if (nextMessage.role === 'assistant') {
        updateMessage(conversationId, nextMessage.id, {
          content: '',
          isStreaming: true,
          isError: false,
        });

        setIsGenerating(true);
        setGenerating(true);

        const historyMessages = conversation.messages.slice(0, messageIndex + 1);
        const messages = buildMessageHistory(historyMessages, systemPrompt);

        let fullContent = '';
        
        await streamingManager.streamGenerate(
          modelConfig,
          messages,
          conversationId,
          nextMessage.id,
          {
            onToken: (token) => {
              fullContent += token;
              updateMessage(conversationId, nextMessage.id, {
                content: fullContent,
              });
            },
            onComplete: () => {
              updateMessage(conversationId, nextMessage.id, {
                isStreaming: false,
              });
              setIsGenerating(false);
              setGenerating(false);
            },
            onError: (error) => {
              updateMessage(conversationId, nextMessage.id, {
                content: `错误: ${error.message}`,
                isStreaming: false,
                isError: true,
              });
              setIsGenerating(false);
              setGenerating(false);
            },
          },
          false  // 编辑时不启用工具
        );
      }
    }
  }, [conversationId, conversation?.messages, modelConfig, selectedModelId, systemPrompt]);

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50/50 relative">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3">
          <ModelSelector
            selectedId={selectedModelId}
            onSelect={(id) => setSelectedModels([id])}
            onOpenSettings={onOpenSettings}
          />
          <div className="h-6 w-px bg-gray-200" />
          <SystemPromptEditor
            value={systemPrompt}
            onChange={setSystemPrompt}
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsShareOpen(true)}
            className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            title="分享"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => clearMessages(conversationId)}
            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="清空对话"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleNewChat}
            className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            title="新建对话"
          >
            <MessageSquarePlus className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenSettings}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="设置"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 消息列表或空状态 */}
      {hasMessages || isGenerating ? (
        <MessageList
          messages={conversation.messages}
          onRegenerate={handleRegenerate}
          onDelete={handleDelete}
          onEdit={handleEdit}
          isGenerating={isGenerating}
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center pb-24">
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">Smart Agent</h2>
          <p className="text-gray-500">让你的工作更轻松</p>
        </div>
      )}

      <div className={`p-4 bg-white transition-all duration-300 ${isInputAtCenter ? 'absolute bottom-0 left-0 right-0' : 'border-t border-gray-200'}`}>
        <div className={`${isInputAtCenter ? 'w-full max-w-2xl mx-auto' : 'max-w-3xl mx-auto w-full'}`}>
          <ChatInput
            onSend={handleSend}
            onCancel={handleCancel}
            isLoading={isGenerating}
            isToolLoading={isToolLoading}
            placeholder={modelConfig ? '输入消息，或上传文件...' : '请先选择或配置模型'}
            disabled={!modelConfig}
            modelName={modelConfig?.name}
            showModelInfo={true}
            autoFocus={hasMessages || isGenerating}
            onSelectAgent={(agentPrompt) => {
              setSystemPrompt(agentPrompt);
            }}
          />
        </div>
      </div>

      <ShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        messages={conversation.messages}
        title={conversation.title}
      />
    </div>
  );
}
