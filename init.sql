-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 对话表
CREATE TABLE IF NOT EXISTS conversations (
  id VARCHAR(50) PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  mode VARCHAR(20) NOT NULL DEFAULT 'single',
  system_prompt TEXT,
  compare_count INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 消息表
CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(50) PRIMARY KEY,
  conversation_id VARCHAR(50) REFERENCES conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  model_id VARCHAR(100),
  panel_index INTEGER,
  is_error BOOLEAN DEFAULT FALSE,
  is_streaming BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 模型配置表
CREATE TABLE IF NOT EXISTS model_configs (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  provider VARCHAR(100),
  model_id VARCHAR(200),
  api_key TEXT,
  base_url VARCHAR(500),
  temperature DECIMAL(3,2) DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 2048,
  top_p DECIMAL(3,2) DEFAULT 1.0,
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_conversations_user ON conversations(user_id);
CREATE INDEX idx_conversations_updated ON conversations(updated_at DESC);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created ON messages(created_at);

-- 插入默认用户
INSERT INTO users (id, username) VALUES (1, 'default') ON CONFLICT DO NOTHING;
