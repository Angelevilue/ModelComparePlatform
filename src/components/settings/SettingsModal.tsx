import { useState } from 'react';
import { Modal } from '../common/Modal';
import { ModelConfigList } from './ModelConfigForm';
import { useSettingsStore } from '@/stores/settingsStore';
import { useModelStore } from '@/stores/modelStore';
import { apiService } from '@/services/api';
import { cn } from '@/utils/helpers';
import { Palette, Keyboard, Database, Plug2, Plus, Trash2, ExternalLink, Power, PowerOff, Loader2 } from 'lucide-react';
import type { MCPServerConfig } from '@/types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'models' | 'mcp' | 'appearance' | 'shortcuts';

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('models');
  const { theme, setTheme, fontSize, setFontSize, showTimestamps, setShowTimestamps, enterToSend, setEnterToSend } = useSettingsStore();
  const { mcpServers, addMCPServer, updateMCPServer, deleteMCPServer } = useModelStore();

  const tabs = [
    { id: 'models' as const, label: '模型配置', icon: Database },
    { id: 'mcp' as const, label: 'MCP 服务', icon: Plug2 },
    { id: 'appearance' as const, label: '外观', icon: Palette },
    { id: 'shortcuts' as const, label: '快捷键', icon: Keyboard },
  ];

  const handleAddMCPServer = () => {
    addMCPServer({
      name: '新 MCP 服务',
      url: '',
      isEnabled: false,
    });
  };

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

          {activeTab === 'mcp' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">MCP 服务器</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    配置 MCP (Model Context Protocol) 服务以扩展 AI 能力
                  </p>
                </div>
                <button
                  onClick={handleAddMCPServer}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  添加服务
                </button>
              </div>

              <MCPTestPanel />

              <div className="space-y-3">
                {mcpServers.map((server) => (
                  <MCPServerCard
                    key={server.id}
                    server={server}
                    onUpdate={(updates) => updateMCPServer(server.id, updates)}
                    onDelete={() => deleteMCPServer(server.id)}
                  />
                ))}
                
                {mcpServers.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    暂无 MCP 服务配置
                  </div>
                )}
              </div>
            </div>
          )}

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

interface MCPServerCardProps {
  server: MCPServerConfig;
  onUpdate: (updates: Partial<MCPServerConfig>) => void;
  onDelete: () => void;
}

function MCPServerCard({ server, onUpdate, onDelete }: MCPServerCardProps) {
  const [isEditing, setIsEditing] = useState(!server.url);
  const [name, setName] = useState(server.name);
  const [url, setUrl] = useState(server.url);
  const [authToken, setAuthToken] = useState(server.authToken || '');

  const handleSave = () => {
    onUpdate({ name, url, authToken });
    setIsEditing(false);
  };

  const handleToggle = () => {
    onUpdate({ isEnabled: !server.isEnabled });
  };

  return (
    <div className={cn(
      'p-4 border rounded-lg transition-colors',
      server.isEnabled ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="服务名称"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="MCP 服务器 URL 或命令"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <input
                type="password"
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                placeholder="API Key (可选)"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  保存
                </button>
                {server.url && (
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    取消
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2">
                <h5 className="text-sm font-medium text-gray-900">{server.name}</h5>
                {server.isEnabled && (
                  <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                    已启用
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1 truncate">{server.url}</p>
              {server.authToken && (
                <p className="text-xs text-gray-400 mt-1">API Key: 已配置</p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          {server.url && !isEditing && (
            <>
              <button
                onClick={handleToggle}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  server.isEnabled
                    ? 'text-green-600 hover:bg-green-100'
                    : 'text-gray-400 hover:bg-gray-100'
                )}
                title={server.isEnabled ? '禁用' : '启用'}
              >
                {server.isEnabled ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                title="编辑"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            </>
          )}
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
            title="删除"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function MCPTestPanel() {
  const [status, setStatus] = useState<'idle' | 'checking' | 'ready' | 'error'>('idle');
  const [statusText, setStatusText] = useState('');
  const [tools, setTools] = useState<string[]>([]);
  const [testResult, setTestResult] = useState('');
  const [isTesting, setIsTesting] = useState(false);

  const checkStatus = async () => {
    setStatus('checking');
    setStatusText('检查中...');
    try {
      const result = await apiService.getMCPHealth();
      if (result.status === 'ready') {
        setStatus('ready');
        setStatusText('MCP 服务已就绪');
        
        const toolsResult = await apiService.getMCPTools();
        if (toolsResult.result?.tools) {
          setTools(toolsResult.result.tools.map((t: any) => t.name));
        }
      } else {
        setStatus('error');
        setStatusText('MCP 服务未运行');
      }
    } catch (error: any) {
      setStatus('error');
      setStatusText(error.message || '无法连接 MCP 服务');
    }
  };

  const initMCP = async () => {
    setStatus('checking');
    setStatusText('初始化中...');
    try {
      await apiService.initMCP();
      setTimeout(checkStatus, 2000);
    } catch (error: any) {
      setStatus('error');
      setStatusText(error.message || '初始化失败');
    }
  };

  const testWebSearch = async () => {
    setIsTesting(true);
    setTestResult('搜索中...');
    try {
      const result = await apiService.webSearch('Hello World');
      setTestResult(JSON.stringify(result, null, 2));
    } catch (error: any) {
      setTestResult('错误: ' + (error.message || '搜索失败'));
    }
    setIsTesting(false);
  };

  return (
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h5 className="text-sm font-medium text-gray-900">MCP 测试</h5>
          <p className="text-xs text-gray-500 mt-1">
            测试 MCP 代理服务是否正常工作
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={checkStatus}
            disabled={status === 'checking'}
            className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
          >
            {status === 'checking' ? '检查中...' : '检查状态'}
          </button>
          <button
            onClick={initMCP}
            disabled={status === 'checking'}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            初始化 MCP
          </button>
        </div>
      </div>

      {statusText && (
        <div className={cn(
          'p-3 rounded-lg text-sm',
          status === 'ready' ? 'bg-green-100 text-green-700' :
          status === 'error' ? 'bg-red-100 text-red-700' :
          'bg-yellow-100 text-yellow-700'
        )}>
          {statusText}
        </div>
      )}

      {tools.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2">可用工具:</p>
          <div className="flex flex-wrap gap-2">
            {tools.map((tool) => (
              <span key={tool} className="px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded">
                {tool}
              </span>
            ))}
          </div>
        </div>
      )}

      {tools.includes('web_search') && (
        <div className="pt-2 border-t border-gray-200">
          <button
            onClick={testWebSearch}
            disabled={isTesting || status !== 'ready'}
            className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isTesting && <Loader2 className="w-4 h-4 animate-spin" />}
            测试网络搜索
          </button>
        </div>
      )}

      {testResult && (
        <div className="mt-2">
          <p className="text-xs text-gray-500 mb-1">测试结果:</p>
          <pre className="p-3 bg-white rounded-lg text-xs overflow-x-auto max-h-40 border border-gray-200">
            {testResult}
          </pre>
        </div>
      )}
    </div>
  );
}
