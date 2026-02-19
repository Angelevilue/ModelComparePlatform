import { useState } from 'react';
import { Modal } from '../common/Modal';
import { ModelConfigList } from './ModelConfigForm';
import { useSettingsStore } from '@/stores/settingsStore';
import { cn } from '@/utils/helpers';
import { Palette, Keyboard, Database } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'models' | 'appearance' | 'shortcuts';

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('models');
  const { theme, setTheme, fontSize, setFontSize, showTimestamps, setShowTimestamps, enterToSend, setEnterToSend } = useSettingsStore();

  const tabs = [
    { id: 'models' as const, label: '模型配置', icon: Database },
    { id: 'appearance' as const, label: '外观', icon: Palette },
    { id: 'shortcuts' as const, label: '快捷键', icon: Keyboard },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="设置" size="xl">
      <div className="flex gap-6 min-h-[400px]">
        {/* 左侧导航 */}
        <div className="w-40 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  activeTab === tab.id
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50'
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* 右侧内容 */}
        <div className="flex-1 border-l border-gray-100 pl-6">
          {activeTab === 'models' && <ModelConfigList />}

          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">主题</h4>
                <div className="flex gap-2">
                  {(['light', 'dark', 'system'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={cn(
                        'px-4 py-2 rounded-lg text-sm border transition-colors',
                        theme === t
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      {t === 'light' ? '浅色' : t === 'dark' ? '深色' : '跟随系统'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">字体大小</h4>
                <div className="flex gap-2">
                  {(['small', 'medium', 'large'] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => setFontSize(size)}
                      className={cn(
                        'px-4 py-2 rounded-lg text-sm border transition-colors',
                        fontSize === size
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      {size === 'small' ? '小' : size === 'medium' ? '中' : '大'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">其他选项</h4>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={showTimestamps}
                      onChange={(e) => setShowTimestamps(e.target.checked)}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">显示消息时间戳</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={enterToSend}
                      onChange={(e) => setEnterToSend(e.target.checked)}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">按 Enter 发送消息</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'shortcuts' && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-900">键盘快捷键</h4>
              <div className="space-y-2">
                {[
                  { key: 'Ctrl/Cmd + Enter', action: '发送消息' },
                  { key: 'Ctrl/Cmd + Shift + Enter', action: '换行' },
                  { key: 'Ctrl/Cmd + N', action: '新建对话' },
                  { key: 'Esc', action: '取消生成 / 关闭弹窗' },
                ].map((shortcut) => (
                  <div
                    key={shortcut.key}
                    className="flex items-center justify-between py-2 border-b border-gray-100"
                  >
                    <span className="text-sm text-gray-600">{shortcut.action}</span>
                    <kbd className="px-2 py-1 text-xs font-mono bg-gray-100 rounded">
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
