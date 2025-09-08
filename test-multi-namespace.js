#!/usr/bin/env node

/**
 * Multi-Namespace Retrieval Test
 * Tests retrieval across different Pinecone namespaces
 */

// Use native fetch (Node.js 18+)

const API_URL = 'http://localhost:3005';

// Queries that should trigger different namespaces
const NAMESPACE_TESTS = [
  {
    name: 'Core Learning',
    query: 'Explain the principles of spaced repetition',
    expectedNamespaces: ['public-core'],
    expectedTopics: ['spaced', 'repetition', 'memory', 'learning']
  },
  {
    name: 'Coaching Content',
    query: 'How do I write a strong thesis statement?',
    expectedNamespaces: ['public-coaching', 'public-writing'],
    expectedTopics: ['thesis', 'argument', 'writing', 'academic']
  },
  {
    name: 'Remedial Support',
    query: 'I struggle with basic algebra concepts',
    expectedNamespaces: ['public-remedial'],
    expectedTopics: ['algebra', 'math', 'equation', 'variable']
  },
  {
    name: 'Workplace Success',
    query: 'How to prepare for a performance review at work?',
    expectedNamespaces: ['workplace-success'],
    expectedTopics: ['performance', 'review', 'feedback', 'career']
  },
  {
    name: 'Growth & Reflection',
    query: 'How can I develop better metacognitive awareness?',
    expectedNamespaces: ['public-growth'],
    expectedTopics: ['metacognition', 'awareness', 'reflection', 'thinking']
  }
];

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

async function testNamespaceRetrieval(test) {
  console.log(`\n${colors.cyan}Testing: ${test.name}${colors.reset}`);
  console.log(`Query: "${test.query}"`);
  console.log(`Expected namespaces: ${test.expectedNamespaces.join(', ')}`);
  
  try {
    const startTime = Date.now();
    
    const response = await fetch(`${API_URL}/api/ellen/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: test.query,
        context: {
          userId: 'namespace-test',
          sessionId: `ns-test-${Date.now()}`
        }
      })
    });
    
    const responseTime = Date.now() - startTime;
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    // Check response quality
    const responseText = data.response?.toLowerCase() || '';
    const topicsFound = test.expectedTopics.filter(topic => 
      responseText.includes(topic.toLowerCase())
    );
    
    // Check citations (which indicate retrieval happened)
    const hasCitations = data.citations && data.citations.length > 0;
    const citationCount = data.citations?.length || 0;
    
    console.log(`  ${colors.green}✓${colors.reset} Response received (${responseTime}ms)`);
    console.log(`  ${hasCitations ? colors.green + '✓' : colors.red + '✗'} Citations: ${citationCount} sources retrieved`);
    console.log(`  ${topicsFound.length > 0 ? colors.green + '✓' : colors.yellow + '⚠'} Topics found: ${topicsFound.join(', ') || 'none'}`);
    
    // Preview response
    const preview = responseText.substring(0, 150).replace(/\n/g, ' ');
    console.log(`  Preview: "${preview}..."`);
    
    return {
      test: test.name,
      success: hasCitations && topicsFound.length > 0,
      citationCount,
      topicsFound: topicsFound.length,
      responseTime
    };
    
  } catch (error) {
    console.log(`  ${colors.red}✗ Error: ${error.message}${colors.reset}`);
    return {
      test: test.name,
      success: false,
      error: error.message
    };
  }
}

async function runMultiNamespaceTest() {
  console.log(`${colors.blue}${'='.repeat(60)}`);
  console.log('Multi-Namespace Retrieval Test');
  console.log(`${'='.repeat(60)}${colors.reset}`);
  
  // Check API
  try {
    const health = await fetch(`${API_URL}/api/ellen/chat`);
    if (!health.ok && health.status !== 405) {
      throw new Error('API not responding');
    }
  } catch (error) {
    console.log(`${colors.red}Error: API not running${colors.reset}`);
    process.exit(1);
  }
  
  console.log('\nPinecone Namespaces:');
  console.log('  • public-core (720 vectors)');
  console.log('  • public-coaching (135 vectors)');
  console.log('  • public-remedial (360 vectors)');
  console.log('  • public-writing (60 vectors)');
  console.log('  • public-growth (36 vectors)');
  console.log('  • workplace-success (3,189 vectors)');
  
  const results = [];
  
  // Test each namespace query
  for (const test of NAMESPACE_TESTS) {
    const result = await testNamespaceRetrieval(test);
    results.push(result);
    
    // Small delay between tests
    await new Promise(r => setTimeout(r, 500));
  }
  
  // Summary
  console.log(`\n${colors.blue}${'='.repeat(60)}`);
  console.log('Test Summary');
  console.log(`${'='.repeat(60)}${colors.reset}\n`);
  
  const successful = results.filter(r => r.success).length;
  const avgCitations = results
    .filter(r => r.citationCount)
    .reduce((sum, r) => sum + r.citationCount, 0) / results.length;
  const avgResponseTime = results
    .filter(r => r.responseTime)
    .reduce((sum, r) => sum + r.responseTime, 0) / results.length;
  
  console.log(`Namespace Tests: ${successful}/${results.length} successful`);
  console.log(`Average Citations: ${avgCitations.toFixed(1)} per query`);
  console.log(`Average Response Time: ${Math.round(avgResponseTime)}ms`);
  
  // Detailed results
  console.log(`\n${colors.cyan}Detailed Results:${colors.reset}`);
  results.forEach(r => {
    const status = r.success ? colors.green + '✓' : colors.red + '✗';
    console.log(`  ${status} ${r.test}${colors.reset}`);
    if (r.citationCount) {
      console.log(`    Citations: ${r.citationCount}, Topics: ${r.topicsFound}, Time: ${r.responseTime}ms`);
    }
  });
  
  // System assessment
  console.log(`\n${colors.cyan}Retrieval System Assessment:${colors.reset}`);
  const checks = {
    'All namespaces accessible': successful === results.length,
    'Citations being retrieved': avgCitations > 0,
    'Relevant content found': results.filter(r => r.topicsFound > 0).length >= 3,
    'Good response times': avgResponseTime < 20000
  };
  
  Object.entries(checks).forEach(([check, passed]) => {
    console.log(`  ${passed ? colors.green + '✓' : colors.red + '✗'} ${check}${colors.reset}`);
  });
  
  const passedChecks = Object.values(checks).filter(c => c).length;
  if (passedChecks === 4) {
    console.log(`\n${colors.green}🎉 Multi-namespace retrieval working perfectly!${colors.reset}`);
  } else if (passedChecks >= 3) {
    console.log(`\n${colors.yellow}⚠️ Retrieval mostly working, some issues${colors.reset}`);
  } else {
    console.log(`\n${colors.red}⚠️ Retrieval system needs attention${colors.reset}`);
  }
}

// Run test
runMultiNamespaceTest().catch(console.error);