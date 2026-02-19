import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Settings } from 'lucide-react';
import { cn } from '@/utils/helpers';
import { useModelStore } from '@/stores/modelStore';


interface ModelSelectorProps {
  selectedId: string;
  onSelect: (id: string) => void;
  onOpenSettings?: () => void;
  disabled?: boolean;
}

export function ModelSelector({
  selectedId,
  onSelect,
  onOpenSettings,
  disabled = false,
}: ModelSelectorProps) {
  const { getEnabledConfigs } = useModelStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const enabledConfigs = getEnabledConfigs();
  const selectedConfig = enabledConfigs.find((c) => c.id === selectedId);

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors',
          'text-sm font-medium',
          disabled
            ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-white border-gray-200 hover:border-primary-300 text-gray-700'
        )}
      >
        <span className="max-w-[120px] truncate">
          {selectedConfig?.name || '选择模型'}
        </span>
        <ChevronDown className={cn('w-4 h-4 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
          {enabledConfigs.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500 text-center">
              没有可用的模型
            </div>
          ) : (
            <>
              {enabledConfigs.map((config) => (
                <button
                  key={config.id}
                  onClick={() => {
                    onSelect(config.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors',
                    selectedId === config.id && 'bg-primary-50 text-primary-700'
                  )}
                >
                  <Check
                    className={cn(
                      'w-4 h-4',
                      selectedId === config.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex-1 text-left">
                    <div className="font-medium">{config.name}</div>
                    <div className="text-xs text-gray-500">{config.modelId}</div>
                  </div>
                </button>
              ))}
            </>
          )}
          
          <div className="border-t border-gray-100 mt-1 pt-1">
            <button
              onClick={() => {
                onOpenSettings?.();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Settings className="w-4 h-4" />
              管理模型配置...
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// 多模型选择器（用于对比模式）
interface MultiModelSelectorProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  maxCount?: number;
}

export function MultiModelSelector({
  selectedIds,
  onChange,
  maxCount = 4,
}: MultiModelSelectorProps) {
  const { getEnabledConfigs } = useModelStore();
  const enabledConfigs = getEnabledConfigs();

  const handleToggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((sid) => sid !== id));
    } else if (selectedIds.length < maxCount) {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {enabledConfigs.map((config) => {
        const isSelected = selectedIds.includes(config.id);
        return (
          <button
            key={config.id}
            onClick={() => handleToggle(config.id)}
            disabled={!isSelected && selectedIds.length >= maxCount}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors',
              isSelected
                ? 'bg-primary-50 border-primary-500 text-primary-700'
                : selectedIds.length >= maxCount
                ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
            )}
          >
            {isSelected && <Check className="w-3.5 h-3.5" />}
            <span>{config.name}</span>
          </button>
        );
      })}
      {enabledConfigs.length === 0 && (
        <span className="text-sm text-gray-500">请先添加并启用模型配置</span>
      )}
    </div>
  );
}
