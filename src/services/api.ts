import axios from 'axios';

const API_BASE = 'http://localhost:3001/api';

export const apiService = {
  async getModels() {
    const response = await axios.get(`${API_BASE}/models`);
    return response.data;
  },

  async saveModels(models: any[]) {
    const response = await axios.post(`${API_BASE}/models`, models);
    return response.data;
  },
};
