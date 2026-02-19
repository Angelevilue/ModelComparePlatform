require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// 数据库连接
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'modelcompare',
  password: process.env.DB_PASSWORD || 'modelcompare123',
  database: process.env.DB_NAME || 'modelcompare',
});

// 测试数据库连接
pool.connect((err, client, release) => {
  if (err) {
    console.error('数据库连接失败:', err.message);
    console.log('将使用文件存储作为备用方案');
  } else {
    console.log('数据库连接成功');
    release();
  }
});

app.use(cors());
app.use(express.json());

// 配置文件路径（备用）
const configDir = path.join(__dirname, 'config');
const modelsConfigPath = path.join(configDir, 'models.json');

function ensureConfigDir() {
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
}

// ==================== 模型配置 API ====================

// 读取模型配置
app.get('/api/models', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM model_configs ORDER BY created_at');
    const models = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      provider: row.provider,
      modelId: row.model_id,
      apiKey: row.api_key || '',
      baseURL: row.base_url,
      temperature: parseFloat(row.temperature),
      maxTokens: row.max_tokens,
      topP: parseFloat(row.top_p),
      isEnabled: row.is_enabled,
    }));
    res.json(models);
  } catch (error) {
    console.error('数据库读取失败，使用文件存储:', error.message);
    ensureConfigDir();
    try {
      if (fs.existsSync(modelsConfigPath)) {
        const data = fs.readFileSync(modelsConfigPath, 'utf-8');
        res.json(JSON.parse(data));
      } else {
        res.json([]);
      }
    } catch (fileError) {
      res.status(500).json({ error: 'Failed to read config' });
    }
  }
});

// 保存模型配置
app.post('/api/models', async (req, res) => {
  const models = req.body;
  try {
    await pool.query('DELETE FROM model_configs');
    for (const model of models) {
      await pool.query(
        `INSERT INTO model_configs (id, name, provider, model_id, api_key, base_url, temperature, max_tokens, top_p, is_enabled)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO UPDATE SET
           name = $2, provider = $3, model_id = $4, api_key = $5, base_url = $6,
           temperature = $7, max_tokens = $8, top_p = $9, is_enabled = $10, updated_at = CURRENT_TIMESTAMP`,
        [model.id, model.name, model.provider, model.modelId, model.apiKey, model.baseURL, model.temperature, model.maxTokens, model.topP, model.isEnabled]
      );
    }
    res.json({ success: true });
  } catch (error) {
    console.error('数据库写入失败，使用文件存储:', error.message);
    ensureConfigDir();
    try {
      fs.writeFileSync(modelsConfigPath, JSON.stringify(models, null, 2), 'utf-8');
      res.json({ success: true });
    } catch (fileError) {
      res.status(500).json({ error: 'Failed to save config' });
    }
  }
});

// ==================== 对话 API ====================

// 获取所有对话
app.get('/api/conversations', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM conversations WHERE user_id = 1 ORDER BY updated_at DESC'
    );
    const conversations = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      systemPrompt: row.system_prompt || '',
      modelIds: [],
      createdAt: new Date(row.created_at).getTime(),
      updatedAt: new Date(row.updated_at).getTime(),
      mode: row.mode,
      compareCount: row.compare_count,
      messages: [],
    }));
    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// 创建对话
app.post('/api/conversations', async (req, res) => {
  const { id, mode = 'single', compareCount = 1 } = req.body;
  try {
    await pool.query(
      `INSERT INTO conversations (id, user_id, title, mode, compare_count)
       VALUES ($1, 1, $2, $3, $4)`,
      [id, '新对话', mode, mode === 'compare' ? Math.max(2, Math.min(4, compareCount)) : 1]
    );
    res.json({ success: true, id });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// 更新对话
app.put('/api/conversations/:id', async (req, res) => {
  const { id } = req.params;
  const { title, systemPrompt } = req.body;
  try {
    await pool.query(
      `UPDATE conversations SET title = COALESCE($1, title), 
       system_prompt = COALESCE($2, system_prompt), 
       updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3`,
      [title, systemPrompt, id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating conversation:', error);
    res.status(500).json({ error: 'Failed to update conversation' });
  }
});

// 删除对话
app.delete('/api/conversations/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM conversations WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// 清空对话消息
app.delete('/api/conversations/:id/messages', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM messages WHERE conversation_id = $1', [id]);
    await pool.query(
      `UPDATE conversations SET title = '新对话', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error clearing messages:', error);
    res.status(500).json({ error: 'Failed to clear messages' });
  }
});

// ==================== 消息 API ====================

// 获取对话消息
app.get('/api/conversations/:id/messages', async (req, res) => {
  const { id } = req.params;
  const limit = parseInt(req.query.limit) || 100;
  try {
    const result = await pool.query(
      `SELECT * FROM (
        SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT $2
      ) sub ORDER BY created_at ASC`,
      [id, limit]
    );
    const messages = result.rows.map(row => ({
      id: row.id,
      role: row.role,
      content: row.content,
      timestamp: new Date(row.created_at).getTime(),
      modelId: row.model_id,
      panelIndex: row.panel_index,
      isError: row.is_error,
      isStreaming: row.is_streaming,
    }));
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// 添加消息
app.post('/api/conversations/:id/messages', async (req, res) => {
  const { id } = req.params;
  const { messageId, role, content, modelId, panelIndex, isError, isStreaming } = req.body;
  try {
    await pool.query(
      `INSERT INTO messages (id, conversation_id, role, content, model_id, panel_index, is_error, is_streaming)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [messageId, id, role, content, modelId, panelIndex, isError || false, isStreaming || false]
    );
    
    // 更新对话标题（如果是第一条用户消息）
    if (role === 'user') {
      const title = content.length > 30 ? content.substring(0, 30) + '...' : content;
      await pool.query(
        `UPDATE conversations SET title = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 
         AND (title = '新对话' OR title IS NULL)`,
        [title, id]
      );
    }
    
    res.json({ success: true, messageId });
  } catch (error) {
    console.error('Error adding message:', error);
    res.status(500).json({ error: 'Failed to add message' });
  }
});

// 更新消息
app.put('/api/conversations/:conversationId/messages/:messageId', async (req, res) => {
  const { conversationId, messageId } = req.params;
  const { content, isStreaming, isError } = req.body;
  try {
    await pool.query(
      `UPDATE messages SET content = COALESCE($1, content), 
       is_streaming = COALESCE($2, is_streaming), 
       is_error = COALESCE($3, is_error)
       WHERE id = $4 AND conversation_id = $5`,
      [content, isStreaming, isError, messageId, conversationId]
    );
    await pool.query(
      'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [conversationId]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating message:', error);
    res.status(500).json({ error: 'Failed to update message' });
  }
});

// 删除消息
app.delete('/api/conversations/:conversationId/messages/:messageId', async (req, res) => {
  const { conversationId, messageId } = req.params;
  try {
    await pool.query(
      'DELETE FROM messages WHERE id = $1 AND conversation_id = $2',
      [messageId, conversationId]
    );
    await pool.query(
      'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [conversationId]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`API Server running on http://localhost:${PORT}`);
});
