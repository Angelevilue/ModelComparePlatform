const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
const PORT = process.env.MCP_PROXY_PORT || 3002;

app.use(cors());
app.use(express.json());

let mcpProcess = null;
let mcpReady = false;
let mcpBuffer = '';

function startMCP() {
  if (mcpProcess) return;
  
  const apiKey = process.env.MINIMAX_API_KEY || 'sk-cp-ZxKohMTlJKRZs_XbAASpCazyada2BrhbhNPHVoDnfcw938JQvJU5nL3px9m0QAAXMIq3Zg715cfYN6deAx3iytDyGC924SMxLGRvJbWeUNjfR8dl0f6rVag';
  const apiHost = process.env.MINIMAX_API_HOST || 'https://api.minimaxi.com';
  
  console.log('Starting MCP service...');
  console.log('API Key:', apiKey.substring(0, 10) + '...');
  console.log('API Host:', apiHost);
  
  mcpProcess = spawn('uvx', ['minimax-coding-plan-mcp', '-y'], {
    env: {
      ...process.env,
      MINIMAX_API_KEY: apiKey,
      MINIMAX_API_HOST: apiHost,
    },
    stdio: ['pipe', 'pipe', 'pipe']
  });

  mcpProcess.stdout.on('data', (data) => {
    const text = data.toString();
    console.log('[MCP stdout]:', text);
    mcpBuffer += text;
    
    if (!mcpReady && text.includes('ready')) {
      mcpReady = true;
      console.log('MCP service ready!');
    }
  });

  mcpProcess.stderr.on('data', (data) => {
    console.log('[MCP stderr]:', data.toString());
  });

  mcpProcess.on('close', (code) => {
    console.log('MCP process exited with code:', code);
    mcpProcess = null;
    mcpReady = false;
    mcpBuffer = '';
  });

  mcpProcess.on('error', (err) => {
    console.error('Failed to start MCP:', err);
  });
}

function sendMCPRequest(method, params = {}) {
  return new Promise((resolve, reject) => {
    if (!mcpProcess || !mcpReady) {
      reject(new Error('MCP service not ready'));
      return;
    }

    const request = JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params
    }) + '\n';

    let responseData = '';
    let resolved = false;

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error('MCP request timeout'));
      }
    }, 60000);

    const handleData = (data) => {
      responseData += data.toString();
      try {
        const lines = responseData.split('\n').filter(line => line.trim());
        for (const line of lines) {
          try {
            const response = JSON.parse(line);
            if (response.id && response.id === parseInt(request.match(/"id":\s*(\d+)/)?.[1] || '0')) {
              resolved = true;
              clearTimeout(timeout);
              mcpProcess.stdout.removeListener('data', handleData);
              
              if (response.error) {
                reject(new Error(response.error.message || 'MCP error'));
              } else {
                resolve(response.result);
              }
            }
          } catch (e) {
            // Continue parsing
          }
        }
      } catch (e) {
        // Continue
      }
    };

    mcpProcess.stdout.on('data', handleData);
    mcpProcess.stdin.write(request);
  });
}

// 初始化 MCP 服务
app.post('/init', async (req, res) => {
  try {
    if (!mcpProcess) {
      startMCP();
      // 等待 MCP 启动
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
    res.json({ success: true, ready: mcpReady });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取可用工具列表
app.get('/tools', async (req, res) => {
  try {
    const result = await sendMCPRequest('tools/list');
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 调用工具
app.post('/tools/call', async (req, res) => {
  try {
    const { name, arguments: args } = req.body;
    const result = await sendMCPRequest('tools/call', {
      name,
      arguments: args
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 网络搜索
app.post('/web_search', async (req, res) => {
  try {
    const { query } = req.body;
    const result = await sendMCPRequest('tools/call', {
      name: 'web_search',
      arguments: { query }
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 图片理解
app.post('/understand_image', async (req, res) => {
  try {
    const { prompt, image_url } = req.body;
    const result = await sendMCPRequest('tools/call', {
      name: 'understand_image',
      arguments: { prompt, image_url }
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: mcpReady ? 'ready' : 'not_ready' });
});

app.listen(PORT, () => {
  console.log(`MCP Proxy server running on http://localhost:${PORT}`);
  console.log(`API endpoints:`);
  console.log(`  GET  /health - Health check`);
  console.log(`  POST /init - Initialize MCP`);
  console.log(`  GET  /tools - List available tools`);
  console.log(`  POST /web_search - Web search`);
  console.log(`  POST /understand_image - Understand image`);
});
