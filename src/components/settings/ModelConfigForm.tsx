import { useState } from 'react';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { useModelStore } from '@/stores/modelStore';
import type { ModelConfig } from '@/types';
import { Eye, EyeOff, Plus, Trash2, Copy } from 'lucide-react';
import { cn } from '@/utils/helpers';

interface ModelConfigFormProps {
  isOpen: boolean;
  onClose: () => void;
  editingConfig?: ModelConfig;
}

export function ModelConfigForm({ isOpen, onClose, editingConfig }: ModelConfigFormProps) {
  const { presets, addConfig, updateConfig } = useModelStore();
  const [showApiKey, setShowApiKey] = useState(false);

  const [formData, setFormData] = useState<Partial<ModelConfig>>({
    name: editingConfig?.name || '',
    provider: editingConfig?.provider || 'OpenAI',
    modelId: editingConfig?.modelId || '',
    apiKey: editingConfig?.apiKey || '',
    baseURL: editingConfig?.baseURL || presets[0].baseURL,
    temperature: editingConfig?.temperature ?? 0.7,
    maxTokens: editingConfig?.maxTokens ?? 2048,
    topP: editingConfig?.topP ?? 1,
    isEnabled: editingConfig?.isEnabled ?? true,
  });

  const selectedPreset = presets.find((p) => p.name === formData.provider);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingConfig) {
      updateConfig(editingConfig.id, formData);
    } else {
      addConfig(formData as Omit<ModelConfig, 'id'>);
    }
    onClose();
  };

  const handleProviderChange = (provider: string) => {
    const preset = presets.find((p) => p.name === provider);
    setFormData((prev) => ({
      ...prev,
      provider,
      baseURL: preset?.baseURL || prev.baseURL,
      modelId: preset?.defaultModels[0] || prev.modelId,
    }));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingConfig ? '编辑模型配置' : '添加模型配置'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              显示名称
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="例如：GPT-4"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              提供商
            </label>
            <select
              value={formData.provider}
              onChange={(e) => handleProviderChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {presets.map((preset) => (
                <option key={preset.name} value={preset.name}>
                  {preset.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            模型 ID
          </label>
          <input
            type="text"
            value={formData.modelId}
            onChange={(e) => setFormData({ ...formData, modelId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="例如：gpt-4"
            required
          />
          {selectedPreset && (
            <div className="flex gap-2 mt-2">
              {selectedPreset.defaultModels.map((model) => (
                <button
                  key={model}
                  type="button"
                  onClick={() => setFormData({ ...formData, modelId: model })}
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded text-gray-600 transition-colors"
                >
                  {model}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            API Key
          </label>
          <div className="relative">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={formData.apiKey}
              onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="sk-..."
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Base URL
          </label>
          <input
            type="text"
            value={formData.baseURL}
            onChange={(e) => setFormData({ ...formData, baseURL: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="https://api.openai.com/v1"
            required
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Temperature
            </label>
            <input
              type="number"
              min="0"
              max="2"
              step="0.1"
              value={formData.temperature}
              onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Tokens
            </label>
            <input
              type="number"
              min="1"
              max="8192"
              value={formData.maxTokens}
              onChange={(e) => setFormData({ ...formData, maxTokens: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Top P
            </label>
            <input
              type="number"
              min="0"
              max="1"
              step="0.1"
              value={formData.topP}
              onChange={(e) => setFormData({ ...formData, topP: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isEnabled"
            checked={formData.isEnabled}
            onChange={(e) => setFormData({ ...formData, isEnabled: e.target.checked })}
            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
          />
          <label htmlFor="isEnabled" className="text-sm text-gray-700">
            启用此模型
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button type="submit">
            {editingConfig ? '保存' : '添加'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// 模型配置列表组件
export function ModelConfigList() {
  const { configs, deleteConfig, duplicateConfig } = useModelStore();
  const [editingConfig, setEditingConfig] = useState<ModelConfig | undefined>();
  const [isFormOpen, setIsFormOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">模型配置</h3>
        <Button size="sm" onClick={() => { setEditingConfig(undefined); setIsFormOpen(true); }}>
          <Plus className="w-4 h-4 mr-1" />
          添加模型
        </Button>
      </div>

      <div className="space-y-2">
        {configs.map((config) => (
          <div
            key={config.id}
            className={cn(
              'flex items-center justify-between p-3 rounded-lg border transition-colors',
              config.isEnabled
                ? 'bg-white border-gray-200 hover:border-primary-300'
                : 'bg-gray-50 border-gray-200 opacity-60'
            )}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">{config.name}</span>
                <span className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-600">
                  {config.provider}
                </span>
                <span className="text-xs text-gray-500">{config.modelId}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                T={config.temperature} | Max={config.maxTokens}
              </div>
            </div>
            <div className="flex items-center gap-1 ml-4">
              <button
                onClick={() => duplicateConfig(config.id)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="复制"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setEditingConfig(config); setIsFormOpen(true); }}
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="编辑"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={() => deleteConfig(config.id)}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="删除"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {configs.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          暂无模型配置，点击上方按钮添加
        </div>
      )}

      <ModelConfigForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        editingConfig={editingConfig}
      />
    </div>
  );
}
