import { cn } from '@/utils/helpers';
import { Copy, RotateCcw, Check, Send, X, Trash2, ChevronDown, ChevronRight, Globe, ExternalLink, Search } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { Message, ToolCallInfo } from '@/types';

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

function parseSearchResults(resultText: string): { title: string; link: string; snippet: string }[] {
  try {
    // 直接解析 JSON 字符串
    const data = JSON.parse(resultText);
    // 处理可能的嵌套结构
    // 格式1: { success: true, data: { organic: [...] } }
    // 格式2: { organic: [...] }
    // 格式3: { content: [{ type: 'text', text: '{"organic": [...]}' }] }
    let results: any[] = [];

    if (Array.isArray(data)) {
      // 如果是数组，尝试提取 text 字段
      const textData = data[0]?.content?.[0]?.text || data[0]?.text;
      if (textData) {
        const parsed = JSON.parse(textData);
        results = parsed.organic || [];
      }
    } else if (data.data?.organic) {
      results = data.data.organic;
    } else if (data.organic) {
      results = data.organic;
    } else if (data.content) {
      // 处理 { content: [{ type: 'text', text: '...' }] }
      const textData = data.content[0]?.text;
      if (textData) {
        const parsed = JSON.parse(textData);
        results = parsed.organic || [];
      }
    }

    return results.map((r: any) => ({
      title: r.title || '',
      link: r.link || '',
      snippet: r.snippet || ''
    }));
  } catch {
    // 如果解析失败，返回空数组
    console.error('Failed to parse search results:', resultText.substring(0, 200));
    return [];
  }
}

// 提取域名
function getDomain(link: string): string {
  try {
    const url = new URL(link);
    return url.hostname.replace('www.', '');
  } catch {
    return '';
  }
}

// 搜索结果面板 - 使用 Portal 渲染到 body，避免被父容器裁剪
function SearchResultsPanel({
  results,
  onClose,
  buttonRef
}: {
  results: { title: string; link: string; snippet: string }[],
  onClose: () => void,
  buttonRef: React.RefObject<HTMLButtonElement | null>
}) {
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 8,
        left: rect.left
      });
    }
  }, [buttonRef]);

  const panel = (
    <div
      className="fixed z-50 w-[420px] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
      style={{ top: position.top, left: position.left }}
    >
      {/* 顶部标题栏 */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-semibold text-gray-800">搜索结果</span>
          <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
            {results.length}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 搜索结果列表 */}
      <div className="max-h-[500px] overflow-y-auto">
        {results.slice(0, 10).map((result, index) => (
          <a
            key={index}
            href={result.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-4 border-b border-gray-100 last:border-b-0 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-transparent transition-all group"
          >
            <div className="flex items-start gap-3">
              {/* 序号 */}
              <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-xs font-medium text-gray-400 bg-gray-100 rounded-full group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                {index + 1}
              </span>

              <div className="flex-1 min-w-0">
                {/* 标题 */}
                <div className="text-sm font-medium text-gray-800 group-hover:text-blue-700 line-clamp-2 leading-snug">
                  {result.title}
                </div>

                {/* 域名 */}
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Globe className="w-3 h-3 text-green-600 flex-shrink-0" />
                  <span className="text-xs text-green-600 font-medium truncate">
                    {getDomain(result.link)}
                  </span>
                </div>

                {/* 摘要 */}
                {result.snippet && (
                  <div className="text-xs text-gray-500 mt-1.5 line-clamp-3 leading-relaxed">
                    {result.snippet.replace(/<[^>]*>/g, '')}
                  </div>
                )}
              </div>

              {/* 跳转图标 */}
              <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-blue-500 flex-shrink-0 mt-1 transition-colors" />
            </div>
          </a>
        ))}
      </div>

      {/* 底部提示 */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
        <span className="text-xs text-gray-400">点击链接直接打开网页</span>
      </div>
    </div>
  );

  return createPortal(panel, document.body);
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
  const [showToolCalls, setShowToolCalls] = useState(false);
  const [showResultPanel, setShowResultPanel] = useState(false);
  const editInputRef = useRef<HTMLTextAreaElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);

  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isTool = message.role === 'tool';
  const hasToolCalls = message.toolCallsInfo && message.toolCallsInfo.length > 0;
  const hasSearchTool = hasToolCalls && message.toolCallsInfo?.some(tc =>
    tc.name === 'web_search' || tc.name === 'understand_image'
  );
  const searchResults = hasToolCalls && message.toolCallsInfo
    ? message.toolCallsInfo
        .filter(tc => tc.result)
        .flatMap(tc => parseSearchResults(tc.result || ''))
    : isTool
      ? parseSearchResults(message.content)
      : [];

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

  if (isTool) {
    return (
      <div className="py-2 pl-12 relative">
        {/* 搜索工具标签 - 右侧弹出结果面板 */}
        <div className="relative block">
          <button
            ref={searchButtonRef}
            onClick={() => setShowResultPanel(!showResultPanel)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors',
              showResultPanel
                ? 'bg-blue-100 border-blue-300 text-blue-700'
                : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
            )}
          >
            {showResultPanel ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            <Search className="w-3.5 h-3.5" />
            <span className="font-medium">搜索结果</span>
            <span className="text-gray-400 ml-1">({searchResults.length})</span>
          </button>

          {/* 右侧弹出搜索结果面板 */}
          {showResultPanel && searchResults.length > 0 && (
            <SearchResultsPanel
              results={searchResults}
              onClose={() => setShowResultPanel(false)}
              buttonRef={searchButtonRef}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex gap-3 py-4 group relative',
        isUser ? 'flex-row-reverse' : 'flex-row',
        className
      )}
    >
      <div className={cn('flex-1 max-w-[calc(100%-60px)]', isUser && 'text-right')}>
        {/* 搜索工具标签 - 默认折叠，点击展开右侧弹出结果面板 */}
        {hasSearchTool && !isUser && (
          <div className="relative mb-2 block">
            <button
              ref={searchButtonRef}
              onClick={() => setShowResultPanel(!showResultPanel)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors',
                showResultPanel
                  ? 'bg-blue-100 border-blue-300 text-blue-700'
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
              )}
            >
              {showResultPanel ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              <Search className="w-3.5 h-3.5" />
              <span className="font-medium">搜索</span>
              {searchResults.length > 0 && <span className="text-gray-400 ml-1">({searchResults.length})</span>}
            </button>

            {/* 右侧弹出搜索结果面板 */}
            {showResultPanel && (
              <SearchResultsPanel
                results={searchResults}
                onClose={() => setShowResultPanel(false)}
                buttonRef={searchButtonRef}
              />
            )}
          </div>
        )}
        
        <div
          className={cn(
            'inline-block text-left px-4 py-3 rounded-xl border border-gray-200',
            // 始终显示边框和背景，保持布局一致性
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

        {/* 隐藏底部工具调用详情，因为已有搜索标签显示 */}
        {/* {hasToolCalls && (
          <div className="mt-2">
            <button
              onClick={() => setShowToolCalls(!showToolCalls)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg border transition-colors',
                showToolCalls
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
              )}
            >
              {showToolCalls ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              <Bot className="w-3.5 h-3.5" />
              <span>工具调用 ({message.toolCallsInfo?.length})</span>
            </button>

            {showToolCalls && (
              <div className="mt-2 space-y-2">
                {message.toolCallsInfo?.map((toolCall: ToolCallInfo, index: number) => (
                  <div key={toolCall.id || index} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-3 py-2 text-xs font-mono text-gray-700 border-b border-gray-200">
                      <span className="font-semibold text-blue-600">{toolCall.name}</span>
                      <span className="text-gray-400 ml-2">{toolCall.arguments}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )} */}

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
