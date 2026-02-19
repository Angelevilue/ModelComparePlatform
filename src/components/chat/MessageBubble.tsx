import { cn } from '@/utils/helpers';
import { Copy, RotateCcw, Check, Send, X, Trash2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { Message } from '@/types';

import { TypingIndicator } from '../common/Loading';

interface MessageBubbleProps {
  message: Message;
  onCopy?: () => void;
  onRegenerate?: () => void;
  onDelete?: () => void;
  onEdit?: (newContent: string) => void;
  showActions?: boolean;
  className?: string;
}

export function MessageBubble({
  message,
  onCopy,
  onRegenerate,
  onDelete,
  onEdit,
  showActions = true,
  className,
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const editInputRef = useRef<HTMLTextAreaElement>(null);
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [isEditing]);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy?.();
  };

  const handleEditStart = () => {
    setEditContent(message.content);
    setIsEditing(true);
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setEditContent(message.content);
  };

  const handleEditSubmit = () => {
    if (editContent.trim() && onEdit) {
      onEdit(editContent.trim());
      setIsEditing(false);
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleEditSubmit();
    } else if (e.key === 'Escape') {
      handleEditCancel();
    }
  };

  if (isSystem) {
    return (
      <div className="flex justify-center py-2">
        <div className="px-4 py-1.5 bg-gray-100 rounded-full text-xs text-gray-500">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex gap-3 py-4 group',
        isUser ? 'flex-row-reverse' : 'flex-row',
        className
      )}
    >
      {/* 消息内容 */}
      <div className={cn('flex-1 max-w-[calc(100%-60px)]', isUser && 'text-right')}>
        {/* 消息气泡 */}
        <div
          className={cn(
            'inline-block text-left px-4 py-3 rounded-xl border border-gray-200',
            isUser
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-800',
            message.isError && 'bg-red-50 border-red-200 text-red-700'
          )}
        >
          {message.isStreaming && !message.content ? (
            <TypingIndicator />
          ) : (
            <div className={cn('prose prose-sm max-w-none', isUser && 'prose-invert')}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code(props) {
                    const { className, children } = props;
                    const match = /language-(\w+)/.exec(className || '');
                    const language = match ? match[1] : '';
                    const isInline = !className?.includes('language-');
                    
                    if (!isInline && language) {
                      return (
                        <SyntaxHighlighter
                          style={oneLight as { [key: string]: React.CSSProperties }}
                          language={language}
                          PreTag="div"
                          className="rounded-lg my-2 text-sm"
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      );
                    }
                    
                    return (
                      <code
                        className={cn(
                          'px-1.5 py-0.5 rounded text-sm font-mono',
                          isUser
                            ? 'bg-primary-700 text-white'
                            : 'bg-gray-100 text-gray-800'
                        )}
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                  p({ children }) {
                    return <p className="mb-2 last:mb-0">{children}</p>;
                  },
                  ul({ children }) {
                    return <ul className="list-disc pl-4 mb-2">{children}</ul>;
                  },
                  ol({ children }) {
                    return <ol className="list-decimal pl-4 mb-2">{children}</ol>;
                  },
                  li({ children }) {
                    return <li className="mb-1">{children}</li>;
                  },
                  h1({ children }) {
                    return <h1 className="text-lg font-bold mb-2">{children}</h1>;
                  },
                  h2({ children }) {
                    return <h2 className="text-base font-bold mb-2">{children}</h2>;
                  },
                  h3({ children }) {
                    return <h3 className="text-sm font-bold mb-2">{children}</h3>;
                  },
                  blockquote({ children }) {
                    return (
                      <blockquote
                        className={cn(
                          'border-l-2 pl-3 my-2 italic',
                          isUser ? 'border-primary-400' : 'border-gray-300'
                        )}
                      >
                        {children}
                      </blockquote>
                    );
                  },
                  table({ children }) {
                    return (
                      <div className="overflow-x-auto my-2">
                        <table className="min-w-full border-collapse border border-gray-300 text-sm">
                          {children}
                        </table>
                      </div>
                    );
                  },
                  thead({ children }) {
                    return <thead className="bg-gray-50">{children}</thead>;
                  },
                  th({ children }) {
                    return (
                      <th className="border border-gray-300 px-3 py-2 text-left font-semibold">
                        {children}
                      </th>
                    );
                  },
                  td({ children }) {
                    return (
                      <td className="border border-gray-300 px-3 py-2">{children}</td>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        {showActions && !isEditing && (
          <div
            className={cn(
              'flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity',
              isUser && 'justify-end'
            )}
          >
            <button
              onClick={handleCopy}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
              title="复制"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            {isUser && onEdit && (
              <button
                onClick={handleEditStart}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                title="修改"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
            {isUser && onDelete && (
              <button
                onClick={onDelete}
                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                title="删除"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            {!isUser && onRegenerate && (
              <button
                onClick={onRegenerate}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                title="重新生成"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* 编辑输入框 */}
        {isEditing && (
          <div className="mt-2">
            <textarea
              ref={editInputRef}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={handleEditKeyDown}
              rows={Math.max(2, editContent.split('\n').length)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-400 resize-none"
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={handleEditCancel}
                className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                取消
              </button>
              <button
                onClick={handleEditSubmit}
                disabled={!editContent.trim()}
                className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-3.5 h-3.5" />
                发送
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
