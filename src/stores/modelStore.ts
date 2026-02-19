import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ModelConfig, ProviderPreset, ModelState } from '@/types';
import { storage } from '@/utils/storage';

const isElectron = typeof window !== 'undefined' && window.electronAPI;

async function syncToFile(configs: ModelConfig[]) {
  if (isElectron && window.electronAPI) {
    try {
      await window.electronAPI.writeModelsConfig(configs);
    } catch (error) {
      console.error('Failed to sync to file:', error);
    }
  }
}

async function loadFromFile(): Promise<ModelConfig[] | null> {
  if (isElectron && window.electronAPI) {
    try {
      return await window.electronAPI.readModelsConfig();
    } catch (error) {
      console.error('Failed to load from file:', error);
      return null;
    }
  }
  return null;
}

// 预设的模型提供商
const defaultPresets: ProviderPreset[] = [
  {
    name: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    defaultModels: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  },
  {
    name: 'Anthropic',
    baseURL: 'https://api.anthropic.com/v1',
    defaultModels: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
  },
  {
    name: 'Google',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModels: ['gemini-pro', 'gemini-pro-vision'],
  },
  {
    name: '智谱AI',
    baseURL: 'https://open.bigmodel.cn/api/paas/v4',
    defaultModels: ['glm-4', 'glm-3-turbo'],
  },
  {
    name: '阿里云',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModels: ['qwen-max', 'qwen-plus', 'qwen-turbo'],
  },
  {
    name: '硅基流动',
    baseURL: 'https://api.siliconflow.cn/v1',
    defaultModels: ['deepseek-ai/DeepSeek-V2.5', 'Qwen/Qwen2.5-72B-Instruct'],
  },
  {
    name: '自定义',
    baseURL: 'http://localhost:11434/v1',
    defaultModels: ['llama2', 'vicuna', 'mistral'],
  },
];

// 默认模型配置
const createDefaultModel = (): ModelConfig => ({
  id: 'default',
  name: 'GPT-3.5',
  provider: 'OpenAI',
  modelId: 'gpt-3.5-turbo',
  apiKey: '',
  baseURL: 'https://api.openai.com/v1',
  temperature: 0.7,
  maxTokens: 2048,
  topP: 1,
  isEnabled: true,
});

interface ModelStore extends ModelState {
  // Actions
  addConfig: (config: Omit<ModelConfig, 'id'>) => void;
  updateConfig: (id: string, config: Partial<ModelConfig>) => void;
  deleteConfig: (id: string) => void;
  setSelectedModels: (ids: string[]) => void;
  getConfigById: (id: string) => ModelConfig | undefined;
  getEnabledConfigs: () => ModelConfig[];
  duplicateConfig: (id: string) => void;
  reorderConfigs: (configs: ModelConfig[]) => void;
}

export const useModelStore = create<ModelStore>()(
  persist(
    (set, get) => ({
      configs: [createDefaultModel()],
      presets: defaultPresets,
      selectedModelIds: ['default'],

      addConfig: (config) => {
        const newConfig: ModelConfig = {
          ...config,
          id: `model-${Date.now()}`,
        };
        set((state) => {
          const newConfigs = [...state.configs, newConfig];
          syncToFile(newConfigs);
          return { configs: newConfigs };
        });
      },

      updateConfig: (id, config) => {
        set((state) => {
          const newConfigs = state.configs.map((c) =>
            c.id === id ? { ...c, ...config } : c
          );
          syncToFile(newConfigs);
          return { configs: newConfigs };
        });
      },

      deleteConfig: (id) => {
        set((state) => {
          const newConfigs = state.configs.filter((c) => c.id !== id);
          syncToFile(newConfigs);
          return {
            configs: newConfigs,
            selectedModelIds: state.selectedModelIds.filter((mid) => mid !== id),
          };
        });
      },

      setSelectedModels: (ids) => {
        set({ selectedModelIds: ids });
      },

      getConfigById: (id) => {
        return get().configs.find((c) => c.id === id);
      },

      getEnabledConfigs: () => {
        return get().configs.filter((c) => c.isEnabled);
      },

      duplicateConfig: (id) => {
        const config = get().getConfigById(id);
        if (config) {
          const { id: _, ...rest } = config;
          get().addConfig({
            ...rest,
            name: `${config.name} (复制)`,
          });
        }
      },

      reorderConfigs: (configs) => {
        syncToFile(configs);
        set({ configs });
      },
    }),
    {
      name: 'model-store',
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          try {
            const data = JSON.parse(str);
            // 解密 API Keys
            if (data.state?.configs) {
              data.state.configs = storage.getModelConfigs();
            }
            return data;
          } catch {
            return null;
          }
        },
        setItem: (name, value) => {
          // 加密 API Keys 后保存
          if (value.state?.configs) {
            storage.saveModelConfigs(value.state.configs);
          }
          localStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
);

export async function initializeModelConfigs() {
  const fileConfigs = await loadFromFile();
  if (fileConfigs && fileConfigs.length > 0) {
    const localConfigs = storage.getModelConfigs();
    const mergedConfigs = [...localConfigs];
    
    for (const fileConfig of fileConfigs) {
      const exists = mergedConfigs.find(c => c.id === fileConfig.id);
      if (!exists) {
        mergedConfigs.push(fileConfig);
      }
    }
    
    if (mergedConfigs.length > localConfigs.length) {
      const store = useModelStore.getState();
      store.reorderConfigs(mergedConfigs);
    }
  }
}
