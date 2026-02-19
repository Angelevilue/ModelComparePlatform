import { useState } from 'react';
import { MessageSquare, Users, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/utils/helpers';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface SharedMessage {
  role: 'user' | 'assistant';
  content: string;
  modelId?: string;
}

interface ShareData {
  title: string;
  messages: SharedMessage[];
  createdAt: number;
}

interface ShareViewProps {
  shareData: ShareData | null;
  error: string;
  onClose: () => void;
}

export function ShareView({ shareData, error: initError, onClose }: ShareViewProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyMessage = async (content: string, index: number) => {
    await navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (initError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">{initError}</div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            返回
          </button>
        </div>
      </div>
    );
  }

  if (!shareData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">
                    {shareData.title || '分享的对话'}
                  </h1>
                  <p className="text-sm text-gray-500">
                    {new Date(shareData.createdAt).toLocaleString('zh-CN')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Users className="w-4 h-4" />
                <span>{shareData.messages.length} 条消息</span>
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
            {shareData.messages.map((message, index) => {
              const isUser = message.role === 'user';

              return (
                <div
                  key={index}
                  className={cn('p-6 group', isUser ? 'bg-primary-50/30' : 'bg-white')}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                        isUser ? 'bg-primary-600' : 'bg-gray-600'
                      )}
                    >
                      {isUser ? (
                        <span className="text-white text-sm font-medium">U</span>
                      ) : (
                        <Users className="w-4 h-4 text-white" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={cn('text-sm font-medium', isUser ? 'text-primary-700' : 'text-gray-700')}>
                          {isUser ? '用户' : message.modelId || 'AI'}
                        </span>
                      </div>

                      <div className="prose prose-sm max-w-none text-gray-700">
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
                                <code className="px-1.5 py-0.5 rounded text-sm font-mono bg-gray-100 text-gray-800" {...props}>
                                  {children}
                                </code>
                              );
                            },
                            p({ children }) {
                              return <p className="mb-2 last:mb-0">{children}</p>;
                            },
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    </div>

                    <button
                      onClick={() => copyMessage(message.content, index)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      title="复制"
                    >
                      {copiedIndex === index ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                由 ModelCompare Platform 生成
              </p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors"
              >
                开始新对话
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
