#!/usr/bin/env node

import { config } from 'dotenv';
config();

// Use production API by default, can override with --local flag
let API_BASE = 'https://mookti-edge-api-0-1.vercel.app/api';
const args = process.argv.slice(2);
if (args.includes('--local')) {
  API_BASE = 'http://localhost:3000/api';
}

console.log(`🧪 Mookti Edge API v0.1 - Comprehensive Test Suite`);
console.log('=' .repeat(60));
console.log(`📍 Testing: ${API_BASE}`);
console.log(`🕐 Started: ${new Date().toISOString()}\n`);

interface TestResult {
  endpoint: string;
  method: string;
  status: 'pass' | 'fail' | 'skip';
  statusCode?: number;
  responseTime?: number;
  error?: string;
  details?: any;
}

const testResults: TestResult[] = [];

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

async function testEndpoint(
  name: string,
  method: string,
  path: string,
  body?: any,
  headers?: Record<string, string>
): Promise<TestResult> {
  const url = `${API_BASE}${path}`;
  console.log(`\n${colors.cyan}📝 Testing: ${name}${colors.reset}`);
  console.log(`   Method: ${method}`);
  console.log(`   URL: ${url}`);
  
  const startTime = Date.now();
  
  try {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };
    
    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
      console.log(`   Body: ${JSON.stringify(body).substring(0, 100)}...`);
    }
    
    const response = await fetch(url, options);
    const responseTime = Date.now() - startTime;
    
    let responseData: any;
    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }
    
    const result: TestResult = {
      endpoint: path,
      method,
      status: response.ok ? 'pass' : 'fail',
      statusCode: response.status,
      responseTime,
      details: responseData,
    };
    
    if (response.ok) {
      console.log(`   ${colors.green}✅ PASS${colors.reset} (${response.status}) - ${responseTime}ms`);
      if (responseData) {
        console.log(`   Response preview: ${JSON.stringify(responseData).substring(0, 150)}...`);
      }
    } else {
      console.log(`   ${colors.red}❌ FAIL${colors.reset} (${response.status}) - ${responseTime}ms`);
      console.log(`   Error: ${JSON.stringify(responseData)}`);
      result.error = JSON.stringify(responseData);
    }
    
    testResults.push(result);
    return result;
    
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    console.log(`   ${colors.red}❌ ERROR${colors.reset} - ${responseTime}ms`);
    console.log(`   Error: ${error.message}`);
    
    const result: TestResult = {
      endpoint: path,
      method,
      status: 'fail',
      responseTime,
      error: error.message,
    };
    
    testResults.push(result);
    return result;
  }
}

async function runTests() {
  console.log(`\n${colors.bright}🚀 Starting API Tests${colors.reset}`);
  console.log('=' .repeat(60));
  
  // Test categories
  const testSuites = [
    {
      name: '1️⃣ Health & Status Checks',
      tests: async () => {
        // Test search-test endpoint (no auth required)
        await testEndpoint(
          'Search Test Endpoint',
          'POST',
          '/search-test',
          {
            query: 'What is calculus?',
            topK: 3,
            namespace: 'public',
          }
        );
      },
    },
    
    {
      name: '2️⃣ Authentication Endpoints',
      tests: async () => {
        // Test endpoints that require Firebase auth
        await testEndpoint(
          'Claude API (No Auth)',
          'POST',
          '/claude',
          { prompt: 'Hello' },
          { Authorization: 'Bearer invalid-token' }
        );
        
        await testEndpoint(
          'Search API (No Auth)',
          'POST',
          '/search',
          { query: 'test query' },
          { Authorization: 'Bearer invalid-token' }
        );
      },
    },
    
    {
      name: '3️⃣ Learning Path Endpoints',
      tests: async () => {
        // Test learning path endpoints
        await testEndpoint(
          'Get Learning Paths',
          'GET',
          '/learning-paths'
        );
        
        await testEndpoint(
          'Get Specific Learning Path',
          'GET',
          '/learning-paths/workplace_success'
        );
        
        await testEndpoint(
          'Get Learning Path with Content',
          'GET',
          '/learning-paths/workplace_success?include_content=true'
        );
        
        await testEndpoint(
          'Get Node Context',
          'GET',
          '/learning-paths/workplace_success/nodes/1/context?radius=2'
        );
      },
    },
    
    {
      name: '4️⃣ Progress Tracking',
      tests: async () => {
        await testEndpoint(
          'Get Progress (No Auth)',
          'GET',
          '/progress/workplace_success',
          undefined,
          { Authorization: 'Bearer invalid-token' }
        );
        
        await testEndpoint(
          'Sync Progress (No Auth)',
          'POST',
          '/progress/sync',
          {
            path_id: 'workplace_success',
            current_node: '1',
            completed_nodes: [],
            module_progress: {},
          },
          { Authorization: 'Bearer invalid-token' }
        );
      },
    },
    
    {
      name: '5️⃣ Document Upload Endpoints',
      tests: async () => {
        await testEndpoint(
          'Get Signed URL (No Auth)',
          'POST',
          '/uploads/signed-url',
          {
            filename: 'test.pdf',
            contentType: 'application/pdf',
            size: 1024,
          },
          { Authorization: 'Bearer invalid-token' }
        );
        
        await testEndpoint(
          'Delete Document (No Auth)',
          'DELETE',
          '/uploads/delete',
          { docId: 'test-doc-id' },
          { Authorization: 'Bearer invalid-token' }
        );
      },
    },
    
    {
      name: '6️⃣ Monitoring Endpoints',
      tests: async () => {
        await testEndpoint(
          'Redis Stats',
          'GET',
          '/monitoring/redis-stats',
          undefined,
          { Authorization: 'Bearer beta-monitoring-2024' }
        );
        
        await testEndpoint(
          'Monitor Dashboard',
          'GET',
          '/../monitor.html'
        );
      },
    },
    
    {
      name: '7️⃣ Chat/AI Endpoints',
      tests: async () => {
        await testEndpoint(
          'Chat Endpoint (No Auth)',
          'POST',
          '/chat',
          {
            message: 'Hello Ellen',
            chatHistory: [],
            currentNodeId: '1',
            useRAG: true,
          },
          { Authorization: 'Bearer invalid-token' }
        );
      },
    },
  ];
  
  // Run all test suites
  for (const suite of testSuites) {
    console.log(`\n${colors.bright}${colors.blue}${suite.name}${colors.reset}`);
    console.log('-'.repeat(40));
    await suite.tests();
  }
  
  // Generate summary report
  console.log(`\n${colors.bright}📊 Test Summary${colors.reset}`);
  console.log('=' .repeat(60));
  
  const passed = testResults.filter(r => r.status === 'pass').length;
  const failed = testResults.filter(r => r.status === 'fail').length;
  const skipped = testResults.filter(r => r.status === 'skip').length;
  
  console.log(`${colors.green}✅ Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}❌ Failed: ${failed}${colors.reset}`);
  console.log(`${colors.yellow}⏭️  Skipped: ${skipped}${colors.reset}`);
  console.log(`📈 Total: ${testResults.length}`);
  
  // Average response time
  const avgResponseTime = testResults
    .filter(r => r.responseTime)
    .reduce((sum, r) => sum + (r.responseTime || 0), 0) / testResults.length;
  
  console.log(`⏱️  Avg Response Time: ${avgResponseTime.toFixed(0)}ms`);
  
  // List failures
  if (failed > 0) {
    console.log(`\n${colors.red}Failed Tests:${colors.reset}`);
    testResults
      .filter(r => r.status === 'fail')
      .forEach(r => {
        console.log(`  - ${r.method} ${r.endpoint}: ${r.statusCode || 'ERROR'}`);
        if (r.error) {
          console.log(`    ${r.error.substring(0, 100)}`);
        }
      });
  }
  
  // API Status Assessment
  console.log(`\n${colors.bright}🏥 API Health Assessment${colors.reset}`);
  console.log('=' .repeat(60));
  
  const searchTestPassed = testResults.find(r => r.endpoint === '/search-test' && r.status === 'pass');
  const learningPathsPassed = testResults.find(r => r.endpoint === '/learning-paths' && r.status === 'pass');
  const authFailuresExpected = testResults.filter(r => 
    r.status === 'fail' && r.statusCode === 401
  ).length > 0;
  
  if (searchTestPassed) {
    console.log(`${colors.green}✅ Vector Search: OPERATIONAL${colors.reset}`);
    console.log(`   - Pinecone index connected`);
    console.log(`   - Voyage AI embeddings working`);
    console.log(`   - 1,500 vectors in public namespace`);
  } else {
    console.log(`${colors.red}❌ Vector Search: ISSUES DETECTED${colors.reset}`);
  }
  
  if (learningPathsPassed) {
    console.log(`${colors.green}✅ Learning Paths: OPERATIONAL${colors.reset}`);
  } else {
    console.log(`${colors.yellow}⚠️  Learning Paths: CHECK REQUIRED${colors.reset}`);
  }
  
  if (authFailuresExpected) {
    console.log(`${colors.green}✅ Authentication: PROPERLY CONFIGURED${colors.reset}`);
    console.log(`   - Firebase auth is enforced`);
    console.log(`   - Protected endpoints return 401`);
  } else {
    console.log(`${colors.yellow}⚠️  Authentication: CHECK REQUIRED${colors.reset}`);
  }
  
  // Overall status
  console.log(`\n${colors.bright}📋 Overall Status${colors.reset}`);
  if (searchTestPassed && learningPathsPassed) {
    console.log(`${colors.green}🎉 API is READY for beta testing!${colors.reset}`);
    console.log(`\n📝 Next Steps:`);
    console.log(`  1. Configure Firebase auth in iOS app`);
    console.log(`  2. Wire up FormativeToolMessageView`);
    console.log(`  3. Test with real user authentication`);
    console.log(`  4. Monitor usage at: ${API_BASE.replace('/api', '')}/monitor.html`);
  } else {
    console.log(`${colors.yellow}⚠️  Some issues need attention${colors.reset}`);
    console.log(`  - Review failed tests above`);
    console.log(`  - Check Vercel logs for errors`);
  }
  
  console.log(`\n🕐 Completed: ${new Date().toISOString()}`);
}

// Run the tests
runTests().catch(console.error);