import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MCPServerConfig, ModelConfig, ProviderPreset, ModelState } from '@/types';
import { apiService } from '@/services/api';
import { generateId } from '@/utils/helpers';

const isElectron = typeof window !== 'undefined' && window.electronAPI;

async function syncToServer(configs: ModelConfig[]) {
  try {
    await apiService.saveModels(configs);
  } catch (error) {
    console.log('Backend not available, using local storage');
  }
}

async function loadFromServer(): Promise<ModelConfig[] | null> {
  try {
    return await apiService.getModels();
  } catch (error) {
    console.log('Backend not available');
    return null;
  }
}

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
    }
  }
  return null;
}

const defaultPresets: ProviderPreset[] = [
  {
    name: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    defaultModels: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  },
  {
    name: 'Anthropic',
    baseURL: 'https://api.anthropic.com/v1',
    defaultModels: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'],
  },
  {
    name: 'Google',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModels: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro'],
  },
  {
    name: '智谱AI',
    baseURL: 'https://open.bigmodel.cn/api/paas/v4',
    defaultModels: ['glm-4', 'glm-4-flash', 'glm-4-plus', 'glm-3-turbo'],
  },
  {
    name: '阿里云',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModels: ['qwen-turbo', 'qwen-plus', 'qwen-max', 'qwen-max-longcontext'],
  },
  {
    name: '硅基流动',
    baseURL: 'https://api.siliconflow.cn/v1',
    defaultModels: ['Qwen/Qwen2-72B-Instruct', 'Qwen/Qwen2-7B-Instruct', 'THUDM/glm-4-9b-chat'],
  },
  {
    name: 'Moonshot',
    baseURL: 'https://api.moonshot.cn/v1',
    defaultModels: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
  },
  {
    name: 'DeepSeek',
    baseURL: 'https://api.deepseek.com/v1',
    defaultModels: ['deepseek-chat', 'deepseek-coder'],
  },
  {
    name: '本地模型',
    baseURL: 'http://localhost:8080/v1',
    defaultModels: ['local-model'],
  },
];

const defaultMCPServers: MCPServerConfig[] = [
  {
    id: 'minimax-coding-plan',
    name: 'MiniMax Coding Plan',
    url: '本地命令行服务 (uvx)',
    isEnabled: false,
    authToken: 'sk-cp-ZxKohMTlJKRZs_XbAASpCazyada2BrhbhNPHVoDnfcw938JQvJU5nL3px9m0QAAXMIq3Zg715cfYN6deAx3iytDyGC924SMxLGRvJbWeUNjfR8dl0f6rVag',
  },
];

interface ModelStore extends ModelState {
  setConfigs: (configs: ModelConfig[]) => void;
  addConfig: (config: Omit<ModelConfig, 'id'>) => string;
  updateConfig: (id: string, updates: Partial<ModelConfig>) => void;
  deleteConfig: (id: string) => void;
  duplicateConfig: (id: string) => void;
  setSelectedModels: (ids: string[]) => void;
  toggleModel: (id: string) => void;
  getEnabledConfigs: () => ModelConfig[];
  getConfigById: (id: string) => ModelConfig | undefined;
  initializeConfigs: () => Promise<void>;
  addMCPServer: (server: Omit<MCPServerConfig, 'id'>) => string;
  updateMCPServer: (id: string, updates: Partial<MCPServerConfig>) => void;
  deleteMCPServer: (id: string) => void;
  getEnabledMCPServers: () => MCPServerConfig[];
}

export const useModelStore = create<ModelStore>()(
  persist(
    (set, get) => ({
      configs: [],
      presets: defaultPresets,
      selectedModelIds: [],
      mcpServers: defaultMCPServers,

      setConfigs: (configs) => {
        set({ configs });
        syncToServer(configs);
        syncToFile(configs);
      },

      addConfig: (config) => {
        const id = generateId();
        const newConfig = { ...config, id };
        const configs = [...get().configs, newConfig];
        set({ configs });
        syncToServer(configs);
        syncToFile(configs);
        return id;
      },

      updateConfig: (id, updates) => {
        const configs = get().configs.map((c) =>
          c.id === id ? { ...c, ...updates } : c
        );
        set({ configs });
        syncToServer(configs);
        syncToFile(configs);
      },

      deleteConfig: (id) => {
        const configs = get().configs.filter((c) => c.id !== id);
        const selectedModelIds = get().selectedModelIds.filter((mid) => mid !== id);
        set({ configs, selectedModelIds });
        syncToServer(configs);
        syncToFile(configs);
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

      setSelectedModels: (ids) => {
        set({ selectedModelIds: ids });
      },

      toggleModel: (id) => {
        const selectedModelIds = get().selectedModelIds.includes(id)
          ? get().selectedModelIds.filter((mid) => mid !== id)
          : [...get().selectedModelIds, id];
        set({ selectedModelIds });
      },

      getEnabledConfigs: () => {
        return get().configs.filter((c) => c.isEnabled);
      },

      getConfigById: (id) => {
        return get().configs.find((c) => c.id === id);
      },

      initializeConfigs: async () => {
        const { configs: localConfigs } = get();
        
        if (localConfigs.length > 0) {
          return;
        }

        const serverConfigs = await loadFromServer();
        if (serverConfigs && serverConfigs.length > 0) {
          set({ configs: serverConfigs });
          return;
        }

        const fileConfigs = await loadFromFile();
        if (fileConfigs && fileConfigs.length > 0) {
          set({ configs: fileConfigs });
        }
      },

      addMCPServer: (server) => {
        const id = generateId();
        const newServer = { ...server, id };
        const mcpServers = [...get().mcpServers, newServer];
        set({ mcpServers });
        return id;
      },

      updateMCPServer: (id, updates) => {
        const mcpServers = get().mcpServers.map((s) =>
          s.id === id ? { ...s, ...updates } : s
        );
        set({ mcpServers });
      },

      deleteMCPServer: (id) => {
        const mcpServers = get().mcpServers.filter((s) => s.id !== id);
        set({ mcpServers });
      },

      getEnabledMCPServers: () => {
        return get().mcpServers.filter((s) => s.isEnabled);
      },
    }),
    {
      name: 'model-store',
      partialize: (state) => ({
        configs: state.configs,
        selectedModelIds: state.selectedModelIds,
        mcpServers: state.mcpServers,
      }),
    }
  )
);

export async function initializeModelConfigs() {
  const { configs } = useModelStore.getState();
  
  // 如果已经有配置，直接返回
  if (configs.length > 0) {
    return;
  }

  // 1. 优先从后端 API 加载配置
  const serverConfigs = await loadFromServer();
  if (serverConfigs && serverConfigs.length > 0) {
    const store = useModelStore.getState();
    store.setConfigs(serverConfigs);
    return;
  }

  // 2. 如果后端不可用，从 Electron 文件加载
  const fileConfigs = await loadFromFile();
  if (fileConfigs && fileConfigs.length > 0) {
    useModelStore.getState().setConfigs(fileConfigs);
  }
}
