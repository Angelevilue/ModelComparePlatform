#!/usr/bin/env node

import readline from 'readline';

const API_BASE = process.env.API_BASE || 'http://localhost:3001';
// Model API should point to the actual LLM API (not the backend server)
const MODEL_API_BASE = process.env.MODEL_API_BASE || 'https://api.minimax.chat/v1';
const MODEL_CONFIG = {
  modelId: process.env.MODEL_ID || 'MiniMax-M2.5',
  apiKey: process.env.API_KEY || '',
  baseURL: MODEL_API_BASE,
  temperature: 0.7,
  maxTokens: 4096,
  topP: 0.9,
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function getMCPTools() {
  console.log('\n=== Step 1: Get MCP Tools ===');
  try {
    const res = await fetch(`${API_BASE}/api/mcp/tools`);
    const data = await res.json();
    const tools = data.tools || data.result?.tools || [];
    console.log(`Found ${tools.length} tools:`);
    tools.forEach((t) => {
      console.log(`  - ${t.name}: ${t.description}`);
    });
    return tools;
  } catch (e) {
    console.error('Failed to get tools:', e);
    return [];
  }
}

async function callMCP(toolName, args) {
  console.log(`\n=== Calling tool: ${toolName} ===`);
  console.log('Args:', args);
  try {
    const res = await fetch(`${API_BASE}/api/mcp/call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: toolName, args })
    });
    const data = await res.json();
    console.log('Result:', JSON.stringify(data, null, 2).slice(0, 500));
    return data;
  } catch (e) {
    console.error('Tool call failed:', e);
    return { error: String(e) };
  }
}

async function chatWithTools(messages, tools) {
  console.log('\n=== Step 2: Chat with Tools ===');
  console.log('Sending request to model with tools...');
  console.log('Tools:', tools.map(t => t.name));
  
  const toolDefs = tools.map((t) => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description || '',
      parameters: t.inputSchema || { type: 'object', properties: {} }
    }
  }));

  const requestBody = {
    model: MODEL_CONFIG.modelId,
    messages,
    temperature: MODEL_CONFIG.temperature,
    max_tokens: MODEL_CONFIG.maxTokens,
    top_p: MODEL_CONFIG.topP,
    stream: false,
    tools: toolDefs
  };

  console.log('\nRequest body:');
  console.log(JSON.stringify(requestBody, null, 2).slice(0, 800));

  try {
    const res = await fetch(`${MODEL_CONFIG.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MODEL_CONFIG.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!res.ok) {
      const err = await res.json();
      console.error('API Error:', err);
      return null;
    }

    const data = await res.json();
    console.log('\n=== Response ===');
    console.log('Finish reason:', data.choices?.[0]?.finish_reason);
    console.log('Message:', JSON.stringify(data.choices?.[0]?.message, null, 2).slice(0, 1000));
    
    return data;
  } catch (e) {
    console.error('Request failed:', e);
    return null;
  }
}

async function chatWithToolsStream(messages, tools) {
  console.log('\n=== Step 3: Chat with Tools (Streaming) ===');
  
  const toolDefs = tools.map((t) => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description || '',
      parameters: t.inputSchema || { type: 'object', properties: {} }
    }
  }));

  const requestBody = {
    model: MODEL_CONFIG.modelId,
    messages,
    temperature: MODEL_CONFIG.temperature,
    max_tokens: MODEL_CONFIG.maxTokens,
    top_p: MODEL_CONFIG.topP,
    stream: true,
    tools: toolDefs
  };

  try {
    const res = await fetch(`${MODEL_CONFIG.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MODEL_CONFIG.apiKey}`,
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify(requestBody)
    });

    if (!res.ok) {
      const err = await res.json();
      console.error('API Error:', err);
      return;
    }

    const reader = res.body?.getReader();
    if (!reader) {
      console.error('No reader');
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let toolCalls = [];
    let content = '';

    console.log('\n--- Streaming Response ---');
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim() === '' || line.trim() === 'data: [DONE]') continue;
        
        if (line.startsWith('data: ')) {
          try {
            const jsonStr = line.slice(6);
            const chunk = JSON.parse(jsonStr);
            
            const delta = chunk.choices?.[0]?.delta;
            const tc = delta?.tool_calls;
            const text = delta?.content;
            
            if (tc && tc.length > 0) {
              console.log('[Tool call detected]');
              for (const t of tc) {
                const existingIdx = toolCalls.findIndex(x => x.id === t.id);
                if (existingIdx >= 0) {
                  toolCalls[existingIdx].function.arguments += t.function?.arguments || '';
                } else {
                  toolCalls.push({
                    id: t.id,
                    type: t.type,
                    function: {
                      name: t.function?.name || '',
                      arguments: t.function?.arguments || ''
                    }
                  });
                }
              }
            }
            
            if (text) {
              process.stdout.write(text);
              content += text;
            }
          } catch (e) {
            // ignore parse errors
          }
        }
      }
    }

    console.log('\n\n=== Summary ===');
    console.log('Content:', content.slice(0, 200));
    console.log('Tool calls:', toolCalls.length);
    if (toolCalls.length > 0) {
      console.log('Tool calls detail:', JSON.stringify(toolCalls, null, 2));
    }
  } catch (e) {
    console.error('Stream failed:', e);
  }
}

async function runTest() {
  console.log('=== Tool Calling Test Script ===');
  console.log('API Base:', API_BASE);
  console.log('Model:', MODEL_CONFIG.modelId);
  console.log('Model API:', MODEL_CONFIG.baseURL);

  const tools = await getMCPTools();
  
  if (tools.length === 0) {
    console.log('No tools available. Make sure MCP proxy is running.');
    process.exit(1);
  }

  const testMessages = [
    { role: 'system', content: '你是一个智能助手，可以通过调用工具来获取信息。' },
    { role: 'user', content: '搜索一下今天北京的天气怎么样？' }
  ];

  console.log('\n=== Test 1: Non-streaming with tools ===');
  const response1 = await chatWithTools(testMessages, tools);
  
  if (response1?.choices?.[0]?.message?.tool_calls) {
    console.log('\n✓ Tool calls detected!');
    const toolCalls = response1.choices[0].message.tool_calls;
    for (const tc of toolCalls) {
      console.log(`\nExecuting tool: ${tc.function.name}`);
      const args = JSON.parse(tc.function.arguments || '{}');
      await callMCP(tc.function.name, args);
    }
  } else {
    console.log('\n✗ No tool calls in response');
  }

  console.log('\n\n=== Test 2: Streaming with tools ===');
  await chatWithToolsStream(testMessages, tools);
}

runTest().then(() => {
  console.log('\n\nDone!');
  process.exit(0);
}).catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
