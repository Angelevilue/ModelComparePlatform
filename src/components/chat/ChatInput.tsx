import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, X, CornerDownLeft, Command, Bot, Paperclip, Square, Globe, Image, Loader2 } from 'lucide-react';
import { cn } from '@/utils/helpers';
import { useSettingsStore } from '@/stores/settingsStore';
import { FileAttachment, Attachment } from './FileAttachment';
import { AgentConfigButton } from './AgentConfigButton';

type MCPTool = 'web_search' | 'understand_image' | null;

interface ChatInputProps {
  onSend: (message: string, attachments: Attachment[], tool?: MCPTool, toolArgs?: Record<string, string>) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  isToolLoading?: boolean;
  placeholder?: string;
  disabled?: boolean;
  modelName?: string;
  showModelInfo?: boolean;
  onSelectAgent?: (systemPrompt: string) => void;
  autoFocus?: boolean;
}

export function ChatInput({
  onSend,
  onCancel,
  isLoading = false,
  isToolLoading = false,
  placeholder = '输入消息...',
  disabled = false,
  modelName,
  showModelInfo = false,
  onSelectAgent,
  autoFocus = false,
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [selectedTool, setSelectedTool] = useState<MCPTool>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { enterToSend } = useSettingsStore();
  const [isFocused, setIsFocused] = useState(false);
  const [wasLoading, setWasLoading] = useState(false);

  // 聚焦输入框
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  // 生成完成后聚焦输入框
  useEffect(() => {
    if (wasLoading && !isLoading && textareaRef.current) {
      textareaRef.current.focus();
    }
    setWasLoading(isLoading);
  }, [isLoading, wasLoading]);

  // 自动调整高度
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 280);
      textarea.style.height = `${newHeight}px`;
    }
  }, [input]);

  const handleSend = useCallback(() => {
    console.log('[ChatInput] selectedTool:', selectedTool, 'input:', input.trim(), 'attachments:', attachments.length);

    // 检查是否有图片附件
    const imageAttachments = attachments.filter(a => a.type.startsWith('image/'));
    const hasImageAttachment = imageAttachments.length > 0;

    // 确定使用哪个工具：如果有图片附件，自动使用 understand_image
    const toolToUse: MCPTool = hasImageAttachment ? 'understand_image' : selectedTool;

    if ((!input.trim() && attachments.length === 0 && !toolToUse) || isLoading || disabled) return;

    const toolArgs: Record<string, string> = {};
    if (toolToUse === 'web_search') {
      toolArgs.query = input.trim();
    } else if (toolToUse === 'understand_image') {
      // 使用图片附件的 base64 内容
      toolArgs.image_source = hasImageAttachment
        ? (imageAttachments[0].content || imageAttachments[0].url || '')
        : '';
    }

    console.log('[ChatInput] Calling onSend, tool:', toolToUse, 'hasImageAttachment:', hasImageAttachment);
    onSend(input.trim(), attachments, toolToUse, toolArgs);
    setInput('');
    setAttachments([]);
    // 不重置 selectedTool，让用户保持工具选择状态
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.focus();
    }
  }, [input, attachments, isLoading, disabled, onSend, selectedTool]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (enterToSend && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      } else if (!enterToSend && e.ctrlKey) {
        e.preventDefault();
        handleSend();
      }
    }
  };

  const handleClear = () => {
    setInput('');
    setAttachments([]);
    textareaRef.current?.focus();
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleSelectAgent = (_agentId: string, systemPrompt: string) => {
    onSelectAgent?.(systemPrompt);
  };

  const charCount = input.length;
  const isOverLimit = charCount > 4000;

  // 监听粘贴事件，支持粘贴图片
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (disabled || isLoading) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();

          const file = item.getAsFile();
          if (!file) continue;

          // 检查数量限制
          if (attachments.length >= 5) {
            alert('最多只能上传 5 个文件');
            return;
          }

          // 检查文件大小（最大 5MB）
          if (file.size > 5 * 1024 * 1024) {
            alert('图片超过 5MB 限制');
            return;
          }

          // 读取图片内容为 base64
          const reader = new FileReader();
          reader.onload = (event) => {
            const base64 = event.target?.result as string;
            const newAttachment: Attachment = {
              id: `paste-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              name: file.name || `screenshot-${Date.now()}.png`,
              size: file.size,
              type: file.type || 'image/png',
              content: base64,
              url: base64, // 图片预览 URL
            };
            // 使用函数式更新确保获取最新的 attachments
            setAttachments(prev => [...prev, newAttachment]);
          };
          reader.readAsDataURL(file);

          return; // 只处理第一张图片
        }
      }
    };

    const textarea = textareaRef.current;
    if (textarea) {
      textarea.addEventListener('paste', handlePaste);
    }

    return () => {
      if (textarea) {
        textarea.removeEventListener('paste', handlePaste);
      }
    };
  }, [disabled, isLoading, attachments]);

  return (
    <div
      className={cn(
        'relative rounded-xl border bg-white transition-all duration-200 overflow-hidden',
        'focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-100 focus-within:ring-inset',
        isFocused ? 'shadow-md' : 'shadow-sm border-gray-200',
        (disabled || isLoading) && 'bg-gray-50/50'
      )}
    >
      {/* 顶部信息栏 - 仅显示字数统计和清空按钮 */}
      {(charCount > 0 || attachments.length > 0) && (
        <div className="flex items-center justify-end px-3 py-1.5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            {attachments.length > 0 && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Paperclip className="w-3 h-3" />
                {attachments.length} 个附件
              </span>
            )}
            {charCount > 0 && (
              <span
                className={cn(
                  'text-xs transition-colors',
                  isOverLimit ? 'text-red-500' : 'text-gray-400'
                )}
              >
                {charCount}
                {isOverLimit && <span className="ml-0.5">/ 4000</span>}
              </span>
            )}
            {!isLoading && (
              <button
                onClick={handleClear}
                className="p-0.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                title="清空"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 附件区域 - 在输入框上方显示 */}
      {attachments.length > 0 && (
        <div className="px-4 py-2 border-b border-gray-100 bg-gray-50/30">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500">附件:</span>
            <FileAttachment
              attachments={attachments}
              onAttachmentsChange={setAttachments}
              disabled={disabled || isLoading}
            />
          </div>
        </div>
      )}

      {/* 文本输入区域 */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          rows={1}
          className={cn(
            'w-full px-4 py-3 bg-transparent resize-none outline-none',
            'text-sm text-gray-800 placeholder:text-gray-400',
            'min-h-[44px] max-h-[280px]',
            (disabled || isLoading) && 'cursor-not-allowed'
          )}
        />
      </div>

      {/* 底部工具栏 */}
      <div className="flex items-center justify-between px-3 py-2">
        {/* 左侧：功能按钮 + 快捷键提示 */}
        <div className="flex items-center gap-2 flex-1 min-w-0 flex-nowrap">
          {/* 文件上传按钮（当没有附件时显示） */}
          {attachments.length === 0 && (
            <FileAttachment
              attachments={attachments}
              onAttachmentsChange={setAttachments}
              disabled={disabled || isLoading}
            />
          )}

          {/* 子代理配置按钮 */}
          {onSelectAgent && (
            <AgentConfigButton
              onSelectAgent={handleSelectAgent}
              disabled={disabled || isLoading}
            />
          )}

          {/* MCP 工具选择器 */}
          {(isLoading || isToolLoading) ? (
            <div className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 bg-gray-50 rounded-lg">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>{selectedTool === 'web_search' ? '搜索中...' : selectedTool === 'understand_image' ? '识别中...' : '处理中...'}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 flex-nowrap">
              <button
                type="button"
                onClick={() => setSelectedTool(selectedTool === 'web_search' ? null : 'web_search')}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 text-xs rounded-lg transition-colors whitespace-nowrap',
                  selectedTool === 'web_search'
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'text-gray-500 hover:bg-gray-100 border border-transparent'
                )}
                disabled={disabled || isLoading}
                title="网络搜索"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>搜索</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedTool(selectedTool === 'understand_image' ? null : 'understand_image')}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 text-xs rounded-lg transition-colors whitespace-nowrap',
                  selectedTool === 'understand_image'
                    ? 'bg-purple-100 text-purple-700 border border-purple-300'
                    : 'text-gray-500 hover:bg-gray-100 border border-transparent'
                )}
                disabled={disabled || isLoading}
                title="图片理解"
              >
                <Image className="w-3.5 h-3.5" />
                <span>识图</span>
              </button>
            </div>
          )}

          <div className="w-px h-4 bg-gray-200 mx-1 flex-shrink-0" />

          {/* 快捷键提示 */}
          <div className="hidden sm:flex items-center gap-3 text-xs text-gray-400 flex-shrink-0">
            <span className="flex items-center gap-1">
              <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-100 rounded text-gray-500 font-sans">
                {enterToSend ? (
                  <>
                    <Command className="w-3 h-3" />
                    <span>Enter</span>
                  </>
                ) : (
                  <>
                    <Command className="w-3 h-3" />
                    <span>+</span>
                    <CornerDownLeft className="w-3 h-3" />
                  </>
                )}
              </kbd>
              <span>发送</span>
            </span>
            <span className="text-gray-300">|</span>
            <span>
              {enterToSend ? 'Shift+Enter 换行' : 'Enter 换行'}
            </span>
          </div>
        </div>

        {/* 右侧：模型名称 + 发送按钮 */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* 模型名称 */}
          {showModelInfo && modelName && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 rounded-lg border border-gray-100">
              <Bot className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs text-gray-600 max-w-[120px] truncate" title={modelName}>
                {modelName}
              </span>
            </div>
          )}
          
          {/* 发送/取消按钮 */}
          {isLoading && onCancel ? (
            <button
              onClick={onCancel}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 bg-red-500 text-white hover:bg-red-600 shadow-sm hover:shadow"
            >
              <Square className="w-4 h-4" />
              <span className="hidden sm:inline">停止</span>
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={(!input.trim() && attachments.length === 0 && !selectedTool) || isLoading || disabled || isOverLimit}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                (input.trim() || attachments.length > 0 || selectedTool) && !isLoading && !disabled && !isOverLimit
                  ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm hover:shadow'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              )}
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">发送</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
