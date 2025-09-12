#!/usr/bin/env node

// Development server for Mookti Edge API
// Handles TypeScript API functions

const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3002;

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Simple in-memory compiled module cache
const compiledModules = {};

// Compile TypeScript on the fly
async function compileTypeScript(filePath) {
  if (compiledModules[filePath]) {
    return compiledModules[filePath];
  }
  
  return new Promise((resolve, reject) => {
    // Use ts-node to compile and run
    exec(`npx ts-node -e "
      const handler = require('${filePath}').default;
      console.log(typeof handler);
    "`, (error, stdout, stderr) => {
      if (error) {
        console.error('Compilation error:', stderr);
        reject(error);
      } else {
        // For now, just require the module directly with ts-node
        resolve(require(filePath).default);
      }
    });
  });
}

// Mock Edge Runtime Request/Response
class EdgeRequest extends Request {
  constructor(url, init) {
    super(url, init);
    // method is already set by the parent constructor
  }
  
  async json() {
    const text = await this.text();
    return JSON.parse(text);
  }
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  
  // Set CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  console.log(`${new Date().toISOString()} ${req.method} ${pathname}`);
  
  try {
    // Collect request body
    let body = '';
    if (req.method === 'POST' || req.method === 'PUT') {
      for await (const chunk of req) {
        body += chunk;
      }
    }
    
    // Route to appropriate handler
    let handler;
    let modulePath;
    
    // Check for dynamic routes
    if (pathname.startsWith('/api/storage/chats/')) {
      // This is a dynamic chat ID route
      modulePath = path.join(__dirname, 'api', 'storage', 'chats.ts');
    } else if (pathname.startsWith('/api/ellen/sessions/') && pathname !== '/api/ellen/sessions/complete') {
      // This is a dynamic session ID route
      modulePath = path.join(__dirname, 'api', 'ellen', 'sessions.ts');
    } else {
      switch (pathname) {
      case '/api/health':
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', service: 'mookti-edge-api', version: 'dev' }));
        return;
      case '/':
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'ok',
          message: 'Mookti Edge API Dev Server',
          endpoints: [
            '/api/chat-v2 (POST) - Multi-provider chat with Vercel AI SDK',
            '/api/chat (POST) - Original chat endpoint',
            '/api/test-providers (GET) - Test provider availability',
            '/api/storage/users - User management',
            '/api/storage/chats - Chat management',
            '/api/storage/messages - Message storage',
            '/api/storage/search - Semantic search',
            '/api/ellen/sessions - Ellen session management',
            '/api/ellen/chat - Ellen chat endpoint',
            '/api/ellen/stream - Ellen streaming endpoint',
            '/api/ellen/sessions/complete - Complete Ellen session',
            '/test - Test UI page'
          ]
        }));
        return;
        
      case '/api/chat-v2':
        modulePath = path.join(__dirname, 'api', 'chat-v2.ts');
        break;
        
      case '/api/chat':
        modulePath = path.join(__dirname, 'api', 'chat.ts');
        break;
        
      case '/api/test-providers':
        modulePath = path.join(__dirname, 'api', 'test-providers.ts');
        break;
        
      case '/api/storage/users':
        modulePath = path.join(__dirname, 'api', 'storage', 'users.ts');
        break;
        
      case '/api/storage/chats':
        modulePath = path.join(__dirname, 'api', 'storage', 'chats.ts');
        break;
        
      case '/api/storage/messages':
        modulePath = path.join(__dirname, 'api', 'storage', 'messages.ts');
        break;
      
      case '/api/storage/votes':
        modulePath = path.join(__dirname, 'api', 'storage', 'votes.ts');
        break;
        
      case '/api/storage/search':
        modulePath = path.join(__dirname, 'api', 'storage', 'search.ts');
        break;
        
      case '/api/ellen/sessions':
        modulePath = path.join(__dirname, 'api', 'ellen', 'sessions.ts');
        break;
        
      case '/api/ellen/chat':
        modulePath = path.join(__dirname, 'api', 'ellen', 'chat.ts');
        break;
        
      case '/api/ellen/stream':
        modulePath = path.join(__dirname, 'api', 'ellen', 'stream.ts');
        break;
        
      case '/api/ellen/sessions/complete':
        modulePath = path.join(__dirname, 'api', 'ellen', 'sessions', 'complete.ts');
        break;
        
      case '/api/test-chat':
        modulePath = path.join(__dirname, 'api', 'test-chat.ts');
        break;
        
      case '/test':
        const htmlPath = path.join(__dirname, 'public', 'test-chat.html');
        try {
          const html = fs.readFileSync(htmlPath, 'utf-8');
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(html);
        } catch (error) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Test page not found');
        }
        return;
        
      case '/simple-test':
        const simpleHtmlPath = path.join(__dirname, 'public', 'simple-test.html');
        try {
          const html = fs.readFileSync(simpleHtmlPath, 'utf-8');
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(html);
        } catch (error) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Simple test page not found');
        }
        return;
        
      default:
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
        return;
      }
    }
    
    // Load and execute handler - use require with ts-node
    require('ts-node/register');
    const module = require(modulePath);
    
    // Check for named exports (GET, POST, etc.) or default export
    if (module[req.method]) {
      handler = module[req.method];
    } else if (module.default) {
      handler = module.default;
    } else {
      throw new Error(`No handler found for ${req.method} ${pathname}`);
    }
    
    // Create Edge-compatible Request
    const edgeReq = new EdgeRequest(`http://localhost:${PORT}${req.url}`, {
      method: req.method,
      headers: req.headers,
      body: body || undefined
    });
    
    // Execute handler
    const response = await handler(edgeReq);
    
    if (!response) {
      throw new Error('Handler returned no response');
    }
    
    // Stream or send response
    const contentType = response.headers.get('content-type') || '';

    // Copy headers
    const headers = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    // If SSE, pipe the stream incrementally to the Node response
    if (contentType.includes('text/event-stream') && response.body) {
      res.writeHead(response.status, headers);
      const reader = response.body.getReader();
      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) res.write(Buffer.from(value));
          }
          res.end();
        } catch (e) {
          console.error('SSE piping error:', e);
          try { res.end(); } catch {}
        }
      };
      pump();
      return;
    }

    // Non-streaming: read full body then respond
    const responseBody = await response.text();
    res.writeHead(response.status, headers);
    res.end(responseBody);
    
  } catch (error) {
    console.error('Server error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }));
  }
});

server.listen(PORT, () => {
  console.log(`
🚀 Mookti Edge API Development Server
=====================================
Server running at: http://localhost:${PORT}
Test UI at: http://localhost:${PORT}/test

API Endpoints:
  POST /api/chat-v2      - Multi-provider chat (new)
  POST /api/chat         - Original chat endpoint  
  GET  /api/test-providers - Test provider availability

Provider Status:
  Anthropic: ${process.env.ANTHROPIC_API_KEY ? '✅ Configured' : '❌ Missing API key'}
  OpenAI: ${process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'YOUR_OPENAI_API_KEY_HERE' ? '✅ Configured' : '❌ Missing API key'}
  Google: ${process.env.GOOGLE_GENERATIVE_AI_API_KEY && process.env.GOOGLE_GENERATIVE_AI_API_KEY !== 'YOUR_GOOGLE_AI_API_KEY_HERE' ? '✅ Configured' : '❌ Missing API key'}

Press Ctrl+C to stop the server
`);
});

// Handle shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  server.close(() => {
    console.log('Server stopped.');
    process.exit(0);
  });
});
