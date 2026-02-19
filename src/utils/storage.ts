import type { ModelConfig } from '@/types';

const STORAGE_KEYS = {
  CONVERSATIONS: 'mc_conversations',
  MODEL_CONFIGS: 'mc_model_configs',
  SETTINGS: 'mc_settings',
};

// 简单的 XOR 加密（基础防护，防君子不防小人）
const ENCRYPTION_KEY = 'ModelCompare_Secret_Key_2024';

function xorEncrypt(text: string, key: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(result);
}

function xorDecrypt(encodedText: string, key: string): string {
  try {
    const text = atob(encodedText);
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
  } catch {
    return '';
  }
}

// 存储工具函数
export const storage = {
  // 保存对话
  saveConversations: (conversations: unknown) => {
    localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(conversations));
  },

  // 获取对话
  getConversations: () => {
    const data = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
    return data ? JSON.parse(data) : [];
  },

  // 保存模型配置（加密 API Key）
  saveModelConfigs: (configs: ModelConfig[]) => {
    const encryptedConfigs = configs.map(config => ({
      ...config,
      apiKey: config.apiKey ? xorEncrypt(config.apiKey, ENCRYPTION_KEY) : '',
    }));
    localStorage.setItem(STORAGE_KEYS.MODEL_CONFIGS, JSON.stringify(encryptedConfigs));
  },

  // 获取模型配置（解密 API Key）
  getModelConfigs: (): ModelConfig[] => {
    const data = localStorage.getItem(STORAGE_KEYS.MODEL_CONFIGS);
    if (!data) return [];
    
    try {
      const configs = JSON.parse(data);
      return configs.map((config: ModelConfig) => ({
        ...config,
        apiKey: config.apiKey ? xorDecrypt(config.apiKey, ENCRYPTION_KEY) : '',
      }));
    } catch {
      return [];
    }
  },

  // 保存设置
  saveSettings: (settings: unknown) => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  },

  // 获取设置
  getSettings: () => {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return data ? JSON.parse(data) : null;
  },

  // 清除所有数据
  clearAll: () => {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
  },
};
