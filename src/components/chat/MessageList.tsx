import { useRef, useEffect } from 'react';
import { MessageBubble } from './MessageBubble';
import type { Message } from '@/types';
import { cn } from '@/utils/helpers';

interface MessageListProps {
  messages: Message[];
  onRegenerate?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onEdit?: (messageId: string, newContent: string) => void;
  className?: string;
  isCompareMode?: boolean;
  isGenerating?: boolean;
}

export function MessageList({
  messages,
  onRegenerate,
  onDelete,
  onEdit,
  className,
  isCompareMode = false,
  isGenerating = false,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    // 生成内容时总是滚动到底部
    if (isGenerating) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    // 检查用户是否在查看历史消息（不在底部）
    const isNearBottom =
      scrollContainer.scrollHeight -
        scrollContainer.scrollTop -
        scrollContainer.clientHeight <
      100;

    if (isNearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isGenerating]);

  // 初始滚动到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto' });
  }, []);

  if (messages.length === 0) {
    return (
      <div
        ref={scrollRef}
        className={cn(
          'flex-1 overflow-y-auto p-4 flex items-center justify-center text-gray-400',
          className
        )}
      >
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <p className="text-sm">开始一个新的对话</p>
          <p className="text-xs mt-1">输入消息开始与 AI 交流</p>
        </div>
      </div>
    );
  }

  // 过滤掉系统消息，由 MessageBubble 单独渲染
  const displayMessages = messages.filter((m) => m.role !== 'system');

  return (
    <div
      ref={scrollRef}
      className={cn('flex-1 overflow-y-auto', className)}
    >
      <div className={cn('space-y-2', isCompareMode ? 'px-2' : 'max-w-3xl mx-auto px-4')}>
        {displayMessages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            onRegenerate={
              onRegenerate && message.role === 'assistant'
                ? () => onRegenerate(message.id)
                : undefined
            }
            onDelete={onDelete ? () => onDelete(message.id) : undefined}
            onEdit={onEdit && message.role === 'user' ? (content) => onEdit(message.id, content) : undefined}
          />
        ))}
        <div ref={bottomRef} className="h-4" />
      </div>
    </div>
  );
}
