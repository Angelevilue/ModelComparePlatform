import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Conversation, Message, ChatState } from '@/types';
import { generateId, generateConversationTitle } from '@/utils/helpers';
import { apiService } from '@/services/api';

const MAX_MESSAGES_LOAD = 100;

interface ChatStore extends ChatState {
  isLoaded: boolean;
  loadedConversationIds: Set<string>;
  loadConversations: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  createConversation: (mode?: 'single' | 'compare', compareCount?: number) => string;
  deleteConversation: (id: string) => void;
  setCurrentConversation: (id: string | null) => void;
  addMessage: (conversationId: string, message: Omit<Message, 'id' | 'timestamp'>) => string;
  updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => void;
  deleteMessage: (conversationId: string, messageId: string) => void;
  clearMessages: (conversationId: string) => void;
  setGenerating: (isGenerating: boolean) => void;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  getConversationById: (id: string) => Conversation | undefined;
  getCurrentConversation: () => Conversation | undefined;
}

const createEmptyConversation = (
  mode: 'single' | 'compare' = 'single',
  compareCount: number = 1
): Conversation => ({
  id: generateId(),
  title: '新对话',
  messages: [],
  systemPrompt: '',
  modelIds: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
  mode,
  compareCount: mode === 'compare' ? Math.max(2, Math.min(4, compareCount)) : 1,
});

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      conversations: [],
      currentConversationId: null,
      isGenerating: false,
      isLoaded: false,
      loadedConversationIds: new Set<string>(),

      loadConversations: async () => {
        const { conversations } = get();
        
        // 如果已经有本地数据（从 persist 恢复），保留本地数据，只标记为已加载
        if (conversations.length > 0) {
          set({ isLoaded: true });
          return;
        }
        
        try {
          const conversations = await apiService.getConversations();
          set({ conversations, isLoaded: true });
        } catch (error) {
          console.log('Backend not available, using localStorage');
          set({ isLoaded: true });
        }
      },

      loadMessages: async (conversationId: string) => {
        const { loadedConversationIds } = get();
        if (loadedConversationIds.has(conversationId)) return;

        try {
          const messages = await apiService.getMessages(conversationId);
          const limitedMessages = messages.slice(-MAX_MESSAGES_LOAD);
          
          set((state) => ({
            conversations: state.conversations.map((c) => {
              if (c.id !== conversationId) return c;
              return { ...c, messages: limitedMessages };
            }),
            loadedConversationIds: new Set([...state.loadedConversationIds, conversationId]),
          }));
        } catch (error) {
          console.error('Failed to load messages:', error);
        }
      },

      createConversation: (mode = 'single', compareCount = 1) => {
        const conversation = createEmptyConversation(mode, compareCount);
        
        apiService.createConversation(conversation.id, mode, compareCount).catch(() => {});
        
        set((state) => ({
          conversations: [conversation, ...state.conversations],
          currentConversationId: conversation.id,
          loadedConversationIds: new Set([...state.loadedConversationIds, conversation.id]),
        }));
        return conversation.id;
      },

      deleteConversation: (id) => {
        apiService.deleteConversation(id).catch(() => {});
        
        set((state) => {
          const newConversations = state.conversations.filter((c) => c.id !== id);
          const newLoadedIds = new Set(state.loadedConversationIds);
          newLoadedIds.delete(id);
          
          return {
            conversations: newConversations,
            currentConversationId:
              state.currentConversationId === id
                ? newConversations[0]?.id || null
                : state.currentConversationId,
            loadedConversationIds: newLoadedIds,
          };
        });
      },

      setCurrentConversation: async (id) => {
        set({ currentConversationId: id });
        
        if (id) {
          const { loadMessages } = get();
          await loadMessages(id);
        }
      },

      addMessage: (conversationId, message) => {
        const messageId = generateId();
        const newMessage: Message = {
          ...message,
          id: messageId,
          timestamp: Date.now(),
        };

        apiService.addMessage(conversationId, {
          messageId,
          role: message.role,
          content: message.content,
          modelId: message.modelId,
          panelIndex: message.panelIndex,
          isError: message.isError,
          isStreaming: message.isStreaming,
        }).catch(() => {});

        set((state) => ({
          conversations: state.conversations.map((c) => {
            if (c.id !== conversationId) return c;

            const updatedMessages = [...c.messages, newMessage];
            const updatedTitle =
              c.messages.length === 0 && message.role === 'user'
                ? generateConversationTitle(updatedMessages)
                : c.title;

            return {
              ...c,
              messages: updatedMessages,
              title: updatedTitle,
              updatedAt: Date.now(),
            };
          }),
        }));

        return messageId;
      },

      updateMessage: (conversationId, messageId, updates) => {
        apiService.updateMessage(conversationId, messageId, updates).catch(() => {});
        
        set((state) => ({
          conversations: state.conversations.map((c) => {
            if (c.id !== conversationId) return c;
            return {
              ...c,
              messages: c.messages.map((m) =>
                m.id === messageId ? { ...m, ...updates } : m
              ),
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      deleteMessage: (conversationId, messageId) => {
        apiService.deleteMessage(conversationId, messageId).catch(() => {});
        
        set((state) => ({
          conversations: state.conversations.map((c) => {
            if (c.id !== conversationId) return c;
            return {
              ...c,
              messages: c.messages.filter((m) => m.id !== messageId),
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      clearMessages: (conversationId) => {
        apiService.clearMessages(conversationId).catch(() => {});
        
        set((state) => ({
          conversations: state.conversations.map((c) => {
            if (c.id !== conversationId) return c;
            return {
              ...c,
              messages: [],
              title: '新对话',
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      setGenerating: (isGenerating) => {
        set({ isGenerating });
      },

      updateConversation: (id, updates) => {
        if (updates.title || updates.systemPrompt) {
          apiService.updateConversation(id, {
            title: updates.title,
            systemPrompt: updates.systemPrompt,
          }).catch(() => {});
        }
        
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c
          ),
        }));
      },

      getConversationById: (id) => {
        return get().conversations.find((c) => c.id === id);
      },

      getCurrentConversation: () => {
        const { currentConversationId, conversations } = get();
        return conversations.find((c) => c.id === currentConversationId);
      },
    }),
    {
      name: 'chat-store',
      partialize: (state) => ({
        conversations: state.conversations,
        currentConversationId: state.currentConversationId,
        isGenerating: state.isGenerating,
      }),
    }
  )
);
