const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

const configDir = path.join(__dirname, 'config');
const modelsConfigPath = path.join(configDir, 'models.json');

app.use(cors());
app.use(express.json());

function ensureConfigDir() {
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
}

// 读取模型配置
app.get('/api/models', (req, res) => {
  ensureConfigDir();
  try {
    if (fs.existsSync(modelsConfigPath)) {
      const data = fs.readFileSync(modelsConfigPath, 'utf-8');
      res.json(JSON.parse(data));
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error('Error reading models config:', error);
    res.status(500).json({ error: 'Failed to read config' });
  }
});

// 保存模型配置
app.post('/api/models', (req, res) => {
  ensureConfigDir();
  try {
    const models = req.body;
    fs.writeFileSync(modelsConfigPath, JSON.stringify(models, null, 2), 'utf-8');
    res.json({ success: true });
  } catch (error) {
    console.error('Error writing models config:', error);
    res.status(500).json({ error: 'Failed to save config' });
  }
});

app.listen(PORT, () => {
  console.log(`API Server running on http://localhost:${PORT}`);
});
