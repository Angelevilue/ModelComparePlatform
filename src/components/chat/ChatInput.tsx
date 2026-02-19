import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, X, CornerDownLeft, Command, Bot, Paperclip } from 'lucide-react';
import { cn } from '@/utils/helpers';
import { useSettingsStore } from '@/stores/settingsStore';
import { FileAttachment, Attachment } from './FileAttachment';
import { AgentConfigButton } from './AgentConfigButton';

interface ChatInputProps {
  onSend: (message: string, attachments: Attachment[]) => void;
  isLoading?: boolean;
  placeholder?: string;
  disabled?: boolean;
  modelName?: string;
  showModelInfo?: boolean;
  onSelectAgent?: (systemPrompt: string) => void;
}

export function ChatInput({
  onSend,
  isLoading = false,
  placeholder = '输入消息...',
  disabled = false,
  modelName,
  showModelInfo = false,
  onSelectAgent,
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { enterToSend } = useSettingsStore();
  const [isFocused, setIsFocused] = useState(false);

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
    if ((!input.trim() && attachments.length === 0) || isLoading || disabled) return;
    onSend(input.trim(), attachments);
    setInput('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [input, attachments, isLoading, disabled, onSend]);

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
        <div className="flex items-center gap-2 flex-1 min-w-0">
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
          
          {/* 发送按钮 */}
          <button
            onClick={handleSend}
            disabled={(!input.trim() && attachments.length === 0) || isLoading || disabled || isOverLimit}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
              (input.trim() || attachments.length > 0) && !isLoading && !disabled && !isOverLimit
                ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm hover:shadow'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="hidden sm:inline">生成中...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">发送</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
