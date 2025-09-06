#!/usr/bin/env node

// Local development server for testing API endpoints
// Run with: node local-server.mjs

import { createServer } from 'http';
import { parse } from 'url';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

// Import API handlers
import chatV2Handler from './api/chat-v2.js';
import chatV1Handler from './api/chat.js';
import testProvidersHandler from './api/test-providers.js';

const PORT = process.env.PORT || 3001;

// Mock Edge Runtime Request/Response for local testing
class EdgeRequest extends Request {
  constructor(url, init) {
    super(url, init);
    this.method = init?.method || 'GET';
  }
  
  async json() {
    const text = await this.text();
    return JSON.parse(text);
  }
}

// Create HTTP server
const server = createServer(async (req, res) => {
  const parsedUrl = parse(req.url, true);
  const path = parsedUrl.pathname;
  
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  console.log(`${new Date().toISOString()} ${req.method} ${path}`);
  
  try {
    // Collect request body
    let body = '';
    if (req.method === 'POST') {
      for await (const chunk of req) {
        body += chunk;
      }
    }
    
    // Create Edge-compatible Request object
    const edgeReq = new EdgeRequest(`http://localhost:${PORT}${req.url}`, {
      method: req.method,
      headers: req.headers,
      body: body || undefined
    });
    
    let response;
    
    // Route to appropriate handler
    switch (path) {
      case '/api/chat-v2':
        response = await chatV2Handler(edgeReq);
        break;
        
      case '/api/chat':
        response = await chatV1Handler(edgeReq);
        break;
        
      case '/api/test-providers':
        response = await testProvidersHandler(edgeReq);
        break;
        
      case '/':
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'ok',
          message: 'Mookti Edge API Local Server',
          endpoints: [
            '/api/chat-v2 (POST) - New multi-provider chat',
            '/api/chat (POST) - Original chat endpoint',
            '/api/test-providers (GET) - Test provider availability',
            '/test - Test UI'
          ]
        }));
        return;
        
      case '/test':
        // Serve the test HTML file
        const htmlPath = join(__dirname, 'public', 'test-chat.html');
        try {
          const html = await fs.readFile(htmlPath, 'utf-8');
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(html);
        } catch (error) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Test page not found');
        }
        return;
        
      default:
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
        return;
    }
    
    // Process the response from handler
    if (response) {
      // Get response body
      const responseBody = await response.text();
      
      // Copy headers
      const headers = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });
      
      // Send response
      res.writeHead(response.status, headers);
      res.end(responseBody);
    } else {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'No response from handler' }));
    }
    
  } catch (error) {
    console.error('Server error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message 
    }));
  }
});

// Start server
server.listen(PORT, () => {
  console.log(`
🚀 Mookti Edge API Local Server
================================
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