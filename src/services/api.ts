import axios from 'axios';
import type { Conversation, Message } from '@/types';

const API_BASE = 'http://localhost:3001/api';

export const apiService = {
  // ==================== 模型配置 ====================
  async getModels() {
    const response = await axios.get(`${API_BASE}/models`);
    return response.data;
  },

  async saveModels(models: any[]) {
    const response = await axios.post(`${API_BASE}/models`, models);
    return response.data;
  },

  // ==================== 对话 ====================
  async getConversations(): Promise<Conversation[]> {
    const response = await axios.get(`${API_BASE}/conversations`);
    return response.data;
  },

  async createConversation(id: string, mode: 'single' | 'compare', compareCount?: number) {
    const response = await axios.post(`${API_BASE}/conversations`, { id, mode, compareCount });
    return response.data;
  },

  async updateConversation(id: string, updates: { title?: string; systemPrompt?: string }) {
    const response = await axios.put(`${API_BASE}/conversations/${id}`, updates);
    return response.data;
  },

  async deleteConversation(id: string) {
    const response = await axios.delete(`${API_BASE}/conversations/${id}`);
    return response.data;
  },

  async clearMessages(conversationId: string) {
    const response = await axios.delete(`${API_BASE}/conversations/${conversationId}/messages`);
    return response.data;
  },

  // ==================== 消息 ====================
  async getMessages(conversationId: string, limit: number = 100): Promise<Message[]> {
    const response = await axios.get(`${API_BASE}/conversations/${conversationId}/messages?limit=${limit}`);
    return response.data;
  },

  async addMessage(conversationId: string, message: Omit<Message, 'id' | 'timestamp'> & { messageId: string }) {
    const response = await axios.post(`${API_BASE}/conversations/${conversationId}/messages`, message);
    return response.data;
  },

  async updateMessage(conversationId: string, messageId: string, updates: Partial<Message>) {
    const response = await axios.put(`${API_BASE}/conversations/${conversationId}/messages/${messageId}`, updates);
    return response.data;
  },

  async deleteMessage(conversationId: string, messageId: string) {
    const response = await axios.delete(`${API_BASE}/conversations/${conversationId}/messages/${messageId}`);
    return response.data;
  },

  // ==================== 健康检查 ====================
  async healthCheck() {
    const response = await axios.get(`${API_BASE}/health`);
    return response.data;
  },

  // ==================== MCP 服务 ====================
  async initMCP() {
    const response = await axios.post(`${API_BASE}/mcp/init`);
    return response.data;
  },

  async getMCPHealth() {
    const response = await axios.get(`${API_BASE}/mcp/health`);
    return response.data;
  },

  async getMCPTools() {
    const response = await axios.get(`${API_BASE}/mcp/tools`);
    return response.data;
  },

  async callMCPTool(tool: string, args: Record<string, unknown>) {
    const response = await axios.post(`${API_BASE}/mcp/call`, { tool, args });
    return response.data;
  },

  async webSearch(query: string) {
    const response = await axios.post(`${API_BASE}/mcp/web_search`, { query });
    return response.data;
  },

  async understandImage(prompt: string, imageUrl: string) {
    const response = await axios.post(`${API_BASE}/mcp/understand_image`, { prompt, image_url: imageUrl });
    return response.data;
  },
};
