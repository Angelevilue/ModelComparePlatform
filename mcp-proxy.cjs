const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.MCP_PROXY_PORT || 3002;

app.use(cors());
app.use(express.json());

let mcpProcess = null;
let mcpReady = false;
let pendingRequests = new Map();
let requestId = 1;
let initialized = false;

function startMCP() {
  if (mcpProcess) return;
  
  const apiKey = process.env.MINIMAX_API_KEY || 'sk-cp-ZxKohMTlJKRZs_XbAASpCazyada2BrhbhNPHVoDnfcw938JQvJU5nL3px9m0QAAXMIq3Zg715cfYN6deAx3iytDyGC924SMxLGRvJbWeUNjfR8dl0f6rVag';
  const apiHost = process.env.MINIMAX_API_HOST || 'https://api.minimaxi.com';
  
  console.log('Starting MCP service...');
  console.log('API Key:', apiKey.substring(0, 10) + '...');
  console.log('API Host:', apiHost);
  
  const env = {
    ...process.env,
    MINIMAX_API_KEY: apiKey,
    MINIMAX_API_HOST: apiHost,
  };
  
  mcpProcess = spawn('uvx', ['minimax-coding-plan-mcp', '-y'], {
    env: env,
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: false
  });

  let buffer = '';
  
  mcpProcess.stdout.on('data', (data) => {
    buffer += data.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    
    for (const line of lines) {
      if (!line.trim()) continue;
      console.log('[MCP stdout]:', line);
      
      try {
        const response = JSON.parse(line);
        if (response.id && pendingRequests.has(response.id)) {
          const { resolve, reject, method } = pendingRequests.get(response.id);
          pendingRequests.delete(response.id);
          
          if (response.error) {
            reject(new Error(response.error.message || 'MCP error'));
          } else {
            if (method === 'initialize') {
              initialized = true;
              mcpProcess.stdin.write(JSON.stringify({
                jsonrpc: '2.0',
                method: 'initialized',
                params: { protocolVersion: '2024-11-05' }
              }) + '\n');
            }
            mcpReady = true;
            resolve(response.result);
          }
        }
      } catch (e) {
        if (line.toLowerCase().includes('ready') || line.toLowerCase().includes('listening')) {
          mcpReady = true;
          console.log('MCP service ready (via signal)!');
        }
      }
    }
  });

  mcpProcess.stderr.on('data', (data) => {
    console.log('[MCP stderr]:', data.toString());
  });

  mcpProcess.on('close', (code) => {
    console.log('MCP process exited with code:', code);
    mcpProcess = null;
    mcpReady = false;
    initialized = false;
    pendingRequests.clear();
  });

  mcpProcess.on('error', (err) => {
    console.error('Failed to start MCP:', err);
  });
}

function sendMCPRequest(method, params = {}) {
  return new Promise((resolve, reject) => {
    if (!mcpProcess) {
      startMCP();
    }
    
    const id = requestId++;
    const request = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };
    
    const timeout = setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        reject(new Error('MCP request timeout'));
      }
    }, 60000);
    
    pendingRequests.set(id, {
      resolve: (result) => {
        clearTimeout(timeout);
        resolve(result);
      },
      reject: (error) => {
        clearTimeout(timeout);
        reject(error);
      },
      method
    });
    
    mcpProcess.stdin.write(JSON.stringify(request) + '\n');
  });
}

// 初始化 MCP 服务
app.post('/init', async (req, res) => {
  try {
    if (!mcpProcess) {
      startMCP();
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    // Send initialize request
    try {
      await sendMCPRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'mcp-proxy', version: '1.0.0' }
      });
    } catch (e) {
      console.log('Initialize error (may be ok):', e.message);
    }
    res.json({ success: true, ready: mcpReady });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取可用工具列表
app.get('/tools', async (req, res) => {
  try {
    if (!mcpProcess) {
      startMCP();
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    const result = await sendMCPRequest('tools/list');
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 调用工具
app.post('/tools/call', async (req, res) => {
  try {
    if (!mcpProcess) {
      startMCP();
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
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
    if (!mcpProcess) {
      startMCP();
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    const { query } = req.body;
    const result = await sendMCPRequest('tools/call', {
      name: 'web_search',
      arguments: { query }
    });
    res.json(result);
  } catch (error) {
    console.error('Web search error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 图片理解
app.post('/understand_image', async (req, res) => {
  try {
    if (!mcpProcess) {
      startMCP();
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
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
