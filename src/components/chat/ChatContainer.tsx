import { useState, useCallback, useRef } from 'react';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { ModelSelector } from './ModelSelector';
import { SystemPromptEditor } from '../settings/SystemPromptEditor';
import { ShareModal } from '../share/ShareModal';

import { useChatStore } from '@/stores/chatStore';
import { useModelStore } from '@/stores/modelStore';
import { streamingManager, buildMessageHistory } from '@/services/streaming';
import type { Attachment } from './FileAttachment';

import { Trash2, Settings, MessageSquarePlus, Share2 } from 'lucide-react';

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

  const handleSend = useCallback(async (content: string, attachments: Attachment[] = []) => {
    if (!modelConfig || !selectedModelId) return;

    let messageContent = content;
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
      [...conversation.messages, userMessage],
      systemPrompt
    );

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
      }
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
      }
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
        }
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
          }
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
