import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  theme: 'light' | 'dark' | 'system';
  language: 'zh-CN' | 'en-US';
  fontSize: 'small' | 'medium' | 'large';
  showTimestamps: boolean;
  enterToSend: boolean;
  codeTheme: string;
  systemPromptTemplates: { name: string; content: string }[];
}

interface SettingsStore extends SettingsState {
  setTheme: (theme: SettingsState['theme']) => void;
  setLanguage: (language: SettingsState['language']) => void;
  setFontSize: (size: SettingsState['fontSize']) => void;
  setShowTimestamps: (show: boolean) => void;
  setEnterToSend: (enterToSend: boolean) => void;
  setCodeTheme: (theme: string) => void;
  addSystemPromptTemplate: (name: string, content: string) => void;
  deleteSystemPromptTemplate: (name: string) => void;
  updateSystemPromptTemplate: (name: string, content: string) => void;
}

const defaultTemplates = [
  {
    name: '通用助手',
    content: '你是一个有帮助的AI助手。',
  },
  {
    name: '代码专家',
    content: '你是一个专业的编程专家，擅长回答代码相关问题。',
  },
  {
    name: '翻译助手',
    content: '你是一个专业的翻译助手，可以准确地进行多语言翻译。',
  },
];

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      theme: 'system',
      language: 'zh-CN',
      fontSize: 'medium',
      showTimestamps: false,
      enterToSend: true,
      codeTheme: 'github',
      systemPromptTemplates: defaultTemplates,

      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setFontSize: (fontSize) => set({ fontSize }),
      setShowTimestamps: (showTimestamps) => set({ showTimestamps }),
      setEnterToSend: (enterToSend) => set({ enterToSend }),
      setCodeTheme: (codeTheme) => set({ codeTheme }),

      addSystemPromptTemplate: (name, content) =>
        set((state) => ({
          systemPromptTemplates: [...state.systemPromptTemplates, { name, content }],
        })),

      deleteSystemPromptTemplate: (name) =>
        set((state) => ({
          systemPromptTemplates: state.systemPromptTemplates.filter(
            (t) => t.name !== name
          ),
        })),

      updateSystemPromptTemplate: (name, content) =>
        set((state) => ({
          systemPromptTemplates: state.systemPromptTemplates.map((t) =>
            t.name === name ? { ...t, content } : t
          ),
        })),
    }),
    {
      name: 'settings-store',
    }
  )
);
