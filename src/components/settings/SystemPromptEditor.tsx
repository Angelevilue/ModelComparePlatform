import { useState } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import { X, Save, BookOpen, Check, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { cn } from '@/utils/helpers';

interface SystemPromptEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SystemPromptEditor({ value, onChange, placeholder }: SystemPromptEditorProps) {
  const { systemPromptTemplates, addSystemPromptTemplate, deleteSystemPromptTemplate } = useSettingsStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [isAddingTemplate, setIsAddingTemplate] = useState(false);

  const handleSaveAsTemplate = () => {
    if (!value.trim() || !newTemplateName.trim()) return;
    addSystemPromptTemplate(newTemplateName.trim(), value);
    setNewTemplateName('');
    setIsAddingTemplate(false);
  };

  // 截断显示内容
  const displayValue = value.trim()
    ? value.length > 20
      ? value.slice(0, 20) + '...'
      : value
    : '未设置';

  return (
    <div className="relative">
      {/* 折叠标签按钮 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-lg transition-all duration-200',
          'border hover:shadow-sm',
          isExpanded
            ? 'bg-primary-50 border-primary-200 text-primary-700'
            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-700',
          value.trim() && 'text-gray-700'
        )}
      >
        <Sparkles className="w-3.5 h-3.5" />
        <span className="max-w-[120px] truncate">
          {value.trim() ? displayValue : '系统提示词'}
        </span>
        {isExpanded ? (
          <ChevronUp className="w-3.5 h-3.5 ml-0.5" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
        )}
      </button>

      {/* 展开编辑区域 */}
      {isExpanded && (
        <div className="absolute top-full left-0 mt-2 w-96 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
          {/* 头部 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary-600" />
              <span className="font-medium text-gray-900">系统提示词</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                title="模板"
              >
                <BookOpen className="w-4 h-4" />
              </button>
              {value && (
                <button
                  onClick={() => setIsAddingTemplate(true)}
                  className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                  title="保存为模板"
                >
                  <Save className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 模板选择区域 */}
          {showTemplates && (
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/30">
              <div className="text-xs text-gray-500 mb-2">选择模板：</div>
              <div className="flex flex-wrap gap-2">
                {systemPromptTemplates.map((template) => (
                  <button
                    key={template.name}
                    onClick={() => onChange(template.content)}
                    className={cn(
                      'group flex items-center gap-1 px-2.5 py-1 text-xs rounded-md border transition-all',
                      value === template.content
                        ? 'bg-primary-50 border-primary-300 text-primary-700'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-primary-300 hover:text-primary-600'
                    )}
                  >
                    <span>{template.name}</span>
                    <X
                      className="w-3 h-3 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSystemPromptTemplate(template.name);
                      }}
                    />
                  </button>
                ))}
                {systemPromptTemplates.length === 0 && (
                  <span className="text-xs text-gray-400">暂无保存的模板</span>
                )}
              </div>
            </div>
          )}

          {/* 保存模板输入 */}
          {isAddingTemplate && (
            <div className="px-4 py-3 border-b border-gray-100 bg-primary-50/30">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="输入模板名称"
                  className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  autoFocus
                />
                <button
                  onClick={handleSaveAsTemplate}
                  className="p-1.5 text-primary-600 hover:bg-primary-100 rounded-lg transition-colors"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { setIsAddingTemplate(false); setNewTemplateName(''); }}
                  className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* 编辑区域 */}
          <div className="p-4">
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder || '输入系统提示词，设定AI的角色和行为...'}
              className={cn(
                'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg resize-none',
                'focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                'min-h-[120px] placeholder:text-gray-400'
              )}
            />
            <div className="flex justify-between items-center mt-3">
              <span className="text-xs text-gray-400">
                {value.length} 字符
              </span>
              <button
                onClick={() => setIsExpanded(false)}
                className="px-4 py-1.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
