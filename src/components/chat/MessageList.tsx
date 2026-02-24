import { useRef, useEffect, useState, useCallback } from 'react';
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
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 检测用户是否在手动滚动
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;

    const { scrollTop } = scrollRef.current;
    // 如果 scrollTop > 0，说明用户在向上滚动
    if (scrollTop > 0) {
      setIsUserScrolling(true);

      // 清除之前的定时器
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // 用户停止滚动 1.5 秒后恢复自动滚动
      scrollTimeoutRef.current = setTimeout(() => {
        setIsUserScrolling(false);
      }, 1500);
    }
  }, []);

  // 自动滚动到底部
  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    // 如果用户在手动滚动，不自动滚动
    if (isUserScrolling) {
      return;
    }

    // 生成内容时
    if (isGenerating) {
      const isNearBottom =
        scrollContainer.scrollHeight -
          scrollContainer.scrollTop -
          scrollContainer.clientHeight <
        100;
      if (isNearBottom) {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }

    // 生成完成后，检查用户是否在查看历史消息（不在底部）
    const isNearBottom =
      scrollContainer.scrollHeight -
        scrollContainer.scrollTop -
        scrollContainer.clientHeight <
      100;

    if (isNearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isGenerating, isUserScrolling]);

  // 初始滚动到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto' });
  }, []);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  if (messages.length === 0) {
    return (
      <div
        ref={scrollRef}
        onScroll={handleScroll}
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

  // 过滤掉系统消息，保留工具调用消息用于提取 toolCallsInfo
  const displayMessages = messages.filter((m) => m.role !== 'system');

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
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
