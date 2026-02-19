import { useRef, useEffect, useMemo } from 'react';
import { MessageBubble } from '../chat/MessageBubble';
import { ModelSelector } from '../chat/ModelSelector';
import { cn } from '@/utils/helpers';
import type { Message, ModelConfig } from '@/types';
import { X, Settings } from 'lucide-react';

interface ComparePanelProps {
  modelConfig?: ModelConfig;
  messages: Message[];
  onModelChange?: (modelId: string) => void;
  onRemove?: () => void;
  canRemove?: boolean;
  isGenerating?: boolean;
  className?: string;
  panelIndex: number; // 面板索引
}

export function ComparePanel({
  modelConfig,
  messages,
  onModelChange,
  onRemove,
  canRemove = true,
  isGenerating = false,
  className,
  panelIndex,
}: ComparePanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // 过滤消息：显示用户消息 + 当前面板模型的助手消息
  const displayMessages = useMemo(() => {
    if (!modelConfig) return [];
    
    const userMessages: Message[] = [];
    const assistantMessages: Message[] = [];
    
    for (const message of messages) {
      if (message.role === 'user') {
        userMessages.push(message);
      } else if (message.role === 'assistant') {
        if (message.panelIndex === panelIndex) {
          assistantMessages.push(message);
        }
      }
    }
    
    const result: Message[] = [];
    for (let i = 0; i < userMessages.length; i++) {
      result.push(userMessages[i]);
      if (assistantMessages[i]) {
        result.push(assistantMessages[i]);
      }
    }
    
    return result;
  }, [messages, modelConfig, panelIndex]);

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayMessages]);

  return (
    <div className={cn('flex flex-col h-full min-h-0 bg-white border-r border-gray-200', className)}>
      {/* 面板头部 */}
      <div className="flex-none flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
        {modelConfig ? (
          <ModelSelector
            selectedId={modelConfig.id}
            onSelect={(id) => onModelChange?.(id)}
          />
        ) : (
          <span className="text-sm text-gray-500">未选择模型</span>
        )}
        
        {canRemove && onRemove && (
          <button
            onClick={onRemove}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-2"
            title="移除此面板"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 消息列表 - 可滚动区域 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 min-h-0">
        {!modelConfig ? (
          <div className="h-full flex items-center justify-center text-gray-400 text-sm text-center px-4">
            <div>
              <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                <Settings className="w-5 h-5 text-gray-400" />
              </div>
              <p>请先选择模型</p>
            </div>
          </div>
        ) : displayMessages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-400 text-sm text-center px-4">
            <div>
              <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                <Settings className="w-5 h-5 text-gray-400" />
              </div>
              <p>选择模型开始对比</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {displayMessages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                showActions={false}
                className="py-2"
              />
            ))}
            {isGenerating && (
              <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
