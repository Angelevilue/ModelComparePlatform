import { useState, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Share2, Copy, Check, Link2 } from 'lucide-react';
import { cn } from '@/utils/helpers';
import type { Message } from '@/types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
  title?: string;
}

export function ShareModal({ isOpen, onClose, messages, title = '分享对话' }: ShareModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(messages.map(m => m.id)));
  const [shareLink, setShareLink] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const validMessages = useMemo(() => {
    return messages.filter(m => m.content.trim() && m.role !== 'system');
  }, [messages]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(validMessages.map(m => m.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const generateShareLink = () => {
    const selectedMessages = validMessages.filter(m => selectedIds.has(m.id));
    const shareData = {
      title,
      messages: selectedMessages.map(m => ({
        role: m.role,
        content: m.content,
        modelId: m.modelId,
      })),
      createdAt: Date.now(),
    };
    
    // 简单可靠的编码方式
    const jsonStr = JSON.stringify(shareData);
    const encoded = encodeURIComponent(jsonStr);
    const link = `${window.location.origin}${window.location.pathname}?share=${encoded}`;
    setShareLink(link);
  };

  const copyLink = async () => {
    if (shareLink) {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setShareLink('');
    setSelectedIds(new Set(validMessages.map(m => m.id)));
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="分享对话" size="lg">
      <div className="space-y-4">
        {!shareLink ? (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">
                已选择 {selectedIds.size} / {validMessages.length} 条消息
              </span>
              <div className="flex gap-2">
                <button
                  onClick={selectAll}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  全选
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={deselectAll}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  取消全选
                </button>
              </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto border border-gray-200 rounded-lg">
              {validMessages.map((message) => {
                const isSelected = selectedIds.has(message.id);
                const isUser = message.role === 'user';
                
                return (
                  <div
                    key={message.id}
                    onClick={() => toggleSelect(message.id)}
                    className={cn(
                      'flex gap-3 p-4 border-b border-gray-100 last:border-b-0 cursor-pointer transition-colors',
                      isSelected ? 'bg-primary-50' : 'bg-white hover:bg-gray-50'
                    )}
                  >
                    <div className="flex-shrink-0">
                      <div className={cn(
                        'w-5 h-5 rounded border-2 flex items-center justify-center',
                        isSelected
                          ? 'bg-primary-600 border-primary-600'
                          : 'border-gray-300'
                      )}>
                        {isSelected && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn(
                          'text-xs font-medium',
                          isUser ? 'text-primary-600' : 'text-gray-600'
                        )}>
                          {isUser ? '用户' : message.modelId || 'AI'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-700 line-clamp-3">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {validMessages.length === 0 && (
                <div className="p-8 text-center text-gray-400">
                  暂无可分享的消息
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={handleClose}>
                取消
              </Button>
              <Button
                onClick={generateShareLink}
                disabled={selectedIds.size === 0}
                className="flex items-center gap-2"
              >
                <Link2 className="w-4 h-4" />
                创建分享链接
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-700 mb-2">
                <Share2 className="w-4 h-4" />
                <span className="font-medium">分享链接已生成</span>
              </div>
              <p className="text-sm text-green-600">
                复制下方链接，发送给他人即可查看分享的对话内容
              </p>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={shareLink}
                readOnly
                className="flex-1 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg"
              />
              <Button onClick={copyLink} className="flex items-center gap-2">
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    已复制
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    复制
                  </>
                )}
              </Button>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={handleClose}>
                关闭
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
