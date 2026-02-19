import { useState, useCallback, useEffect } from 'react';
import { ComparePanel } from './ComparePanel';
import { ChatInput } from '../chat/ChatInput';
import { SystemPromptEditor } from '../settings/SystemPromptEditor';

import { useChatStore } from '@/stores/chatStore';
import { useModelStore } from '@/stores/modelStore';
import { streamingManager, buildMessageHistory } from '@/services/streaming';
import type { Attachment } from '@/components/chat/FileAttachment';
import { cn } from '@/utils/helpers';
import { Trash2, Plus, Settings, MessageSquarePlus, Users } from 'lucide-react';
import type { ModelConfig } from '@/types';

interface CompareContainerProps {
  conversationId: string;
  onOpenSettings: () => void;
}

// 最大对比数
const MAX_COMPARE_COUNT = 4;

export function CompareContainer({ conversationId, onOpenSettings }: CompareContainerProps) {
  const { 
    getConversationById, 
    addMessage, 
    updateMessage, 
    clearMessages,
    setGenerating,
    createConversation,
    setCurrentConversation,
    updateConversation 
  } = useChatStore();
  const { configs, getEnabledConfigs } = useModelStore();
  
  const conversation = getConversationById(conversationId);
  const [systemPrompt, setSystemPrompt] = useState(conversation?.systemPrompt || '');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // 当前选中的模型配置
  const [panelModels, setPanelModels] = useState<(ModelConfig | undefined)[]>([]);

  // 初始化面板模型
  useEffect(() => {
    if (!conversation) return;
    
    const enabledConfigs = getEnabledConfigs();
    const count = conversation.compareCount || 2;
    const modelIds = conversation.modelIds || [];
    
    const models: (ModelConfig | undefined)[] = [];
    for (let i = 0; i < count; i++) {
      const modelId = modelIds[i];
      const config = modelId 
        ? configs.find(c => c.id === modelId)
        : enabledConfigs[i];
      models.push(config);
    }
    setPanelModels(models);
  }, [conversation?.compareCount, conversation?.modelIds]);

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        对话不存在
      </div>
    );
  }

  const handleAddPanel = () => {
    if (panelModels.length >= MAX_COMPARE_COUNT) return;
    
    const newCount = panelModels.length + 1;
    const enabledConfigs = getEnabledConfigs();
    const newModel = enabledConfigs[newCount - 1];
    
    setPanelModels([...panelModels, newModel]);
    updateConversation(conversationId, {
      compareCount: newCount,
      modelIds: [...panelModels, newModel].map(m => m?.id).filter(Boolean) as string[],
    });
  };

  const handleRemovePanel = (index: number) => {
    if (panelModels.length <= 2) return; // 最少保留2个
    
    const newModels = panelModels.filter((_, i) => i !== index);
    setPanelModels(newModels);
    
    const newCount = newModels.length;
    updateConversation(conversationId, {
      compareCount: newCount,
      modelIds: newModels.map(m => m?.id).filter(Boolean) as string[],
    });
  };

  const handleModelChange = (index: number, modelId: string) => {
    const config = configs.find(c => c.id === modelId);
    if (!config) return;
    
    const newModels = [...panelModels];
    newModels[index] = config;
    setPanelModels(newModels);
    
    updateConversation(conversationId, {
      modelIds: newModels.map(m => m?.id).filter(Boolean) as string[],
    });
  };

  const handleSend = useCallback(async (content: string, attachments: Attachment[] = []) => {
    const validModels = panelModels.filter(Boolean) as ModelConfig[];
    if (validModels.length === 0) return;

    // 构建消息内容（包含附件信息）
    let messageContent = content;
    if (attachments.length > 0) {
      const attachmentInfo = attachments.map(att => `[附件: ${att.name}]`).join('\n');
      messageContent = content 
        ? `${content}\n\n${attachmentInfo}` 
        : `请查看以下附件并回答：\n\n${attachmentInfo}`;
    }

    // 添加用户消息（只需要添加一次）
    addMessage(conversationId, {
      role: 'user',
      content: messageContent,
    });

    // 为每个模型添加 AI 消息占位
    const messageIds: { modelId: string; messageId: string }[] = [];
    
    for (let i = 0; i < validModels.length; i++) {
      const model = validModels[i];
      const messageId = addMessage(conversationId, {
        role: 'assistant',
        content: '',
        modelId: model.name,
        panelIndex: i,
        isStreaming: true,
      });
      messageIds.push({ modelId: model.id, messageId });
    }

    setIsGenerating(true);
    setGenerating(true);

    // 构建消息历史（包含附件内容）
    const userMessage = { 
      id: '', 
      role: 'user' as const, 
      content: messageContent, 
      timestamp: Date.now() 
    };
    
    // 如果有文本类型的附件，将内容附加到消息中
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

    // 并行发送所有请求
    const generatePromises = validModels.map((model, index) => {
      const { messageId } = messageIds[index];
      let fullContent = '';
      
      return streamingManager.streamGenerate(
        model,
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
          },
          onError: (error) => {
            updateMessage(conversationId, messageId, {
              content: `错误: ${error.message}`,
              isStreaming: false,
              isError: true,
            });
          },
        }
      );
    });

    // 等待所有生成完成
    await Promise.all(generatePromises);
    
    setIsGenerating(false);
    setGenerating(false);
  }, [conversationId, conversation?.messages, panelModels, systemPrompt]);

  const handleNewChat = () => {
    const newId = createConversation('compare', 2);
    setCurrentConversation(newId);
  };

  // 计算网格列数
  const getGridCols = () => {
    switch (panelModels.length) {
      case 1: return 'grid-cols-1';
      case 2: return 'grid-cols-2';
      case 3: return 'grid-cols-3';
      case 4: return 'grid-cols-4';
      default: return 'grid-cols-2';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50/50">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-500" />
            <span className="font-medium text-gray-700">模型对比</span>
            <span className="text-sm text-gray-500">
              ({panelModels.length}/{MAX_COMPARE_COUNT})
            </span>
          </div>
          <div className="h-6 w-px bg-gray-200" />
          <SystemPromptEditor
            value={systemPrompt}
            onChange={setSystemPrompt}
          />
        </div>
        <div className="flex items-center gap-2">
          {panelModels.length < MAX_COMPARE_COUNT && (
            <button
              onClick={handleAddPanel}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              添加模型
            </button>
          )}
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
            title="新建对比"
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

      {/* 对比面板网格 - 支持水平滚动（移动端）和垂直滚动 */}
      <div 
        className={cn(
          'flex-1 grid divide-x divide-gray-200 overflow-auto min-h-0',
          'lg:overflow-hidden', // 桌面端隐藏外层滚动，让面板内部滚动
          getGridCols()
        )}
      >
        {panelModels.map((model, index) => (
          <ComparePanel
            key={`${index}-${model?.id || 'empty'}`}
            modelConfig={model}
            messages={conversation.messages}
            onModelChange={(id) => handleModelChange(index, id)}
            onRemove={() => handleRemovePanel(index)}
            canRemove={panelModels.length > 2}
            isGenerating={isGenerating}
            panelIndex={index}
          />
        ))}
      </div>

      {/* 底部输入区 */}
      <div className="p-4 bg-white border-t border-gray-200">
        <div className="max-w-4xl mx-auto">
          <ChatInput
            onSend={handleSend}
            isLoading={isGenerating}
            placeholder={
              panelModels.some(Boolean) 
                ? '输入消息或上传文件，所有模型将同时回答...' 
                : '请先选择或配置模型'
            }
            disabled={!panelModels.some(Boolean)}
            modelName={
              panelModels.filter(Boolean).length > 0
                ? `对比: ${panelModels.filter(Boolean).map(m => m!.name).join(', ')}`
                : undefined
            }
            showModelInfo={panelModels.some(Boolean)}
            onSelectAgent={(agentPrompt) => {
              setSystemPrompt(agentPrompt);
            }}
          />
        </div>
      </div>
    </div>
  );
}
