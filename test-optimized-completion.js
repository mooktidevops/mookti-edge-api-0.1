// Test optimized session completion endpoint
// Expected: <1s response time (vs 5-10s before)

const API_URL = 'http://localhost:3005/api';

async function testOptimizedCompletion() {
  console.log('🚀 Testing Optimized Session Completion\n');
  console.log('Expected: <1s response time (was 5-10s)\n');

  try {
    // Step 1: Create a session
    console.log('1. Creating session...');
    const createStart = Date.now();
    const createResponse = await fetch(`${API_URL}/ellen/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'test-user-optimized',
        type: 'study',
        sessionGoal: {
          type: 'learn',
          topic: 'Performance Optimization',
          duration: 25
        }
      })
    });

    const session = await createResponse.json();
    console.log(`✅ Session created: ${session.id}`);
    console.log(`   Time: ${Date.now() - createStart}ms\n`);

    // Step 2: Add some messages
    console.log('2. Adding messages...');
    const messages = [
      { role: 'user', content: 'How does async processing improve performance?' },
      { role: 'assistant', content: 'Async processing allows operations to run in the background...' },
      { role: 'user', content: 'Can you show me an example with job queues?' },
      { role: 'assistant', content: 'Here\'s how job queues work for background processing...' }
    ];

    for (const msg of messages) {
      await fetch(`${API_URL}/ellen/sessions/${session.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msg)
      });
    }
    console.log('✅ Messages added\n');

    // Step 3: Complete session (OPTIMIZED)
    console.log('3. Completing session (OPTIMIZED)...');
    const completeStart = Date.now();
    
    const completeResponse = await fetch(`${API_URL}/ellen/sessions/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: session.id,
        keyTakeaways: [
          'Async processing prevents blocking',
          'Job queues enable background work',
          'Response times improve dramatically'
        ],
        confidenceRating: 4,
        understandingRating: 5,
        difficultyRating: 3
      })
    });

    const completionTime = Date.now() - completeStart;
    const result = await completeResponse.json();

    console.log('✅ Session completed!');
    console.log(`   Time: ${completionTime}ms`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Jobs queued: ${result.jobIds?.length || 0}`);
    console.log(`   Message: ${result.message}\n`);

    // Performance comparison
    console.log('📊 Performance Comparison:');
    console.log('   Before optimization: 5000-10000ms');
    console.log(`   After optimization:  ${completionTime}ms`);
    console.log(`   Improvement:         ${Math.round((1 - completionTime/7500) * 100)}%\n`);

    if (completionTime < 1000) {
      console.log('🎉 SUCCESS: Response time under 1 second!');
    } else if (completionTime < 2000) {
      console.log('✅ GOOD: Response time under 2 seconds');
    } else {
      console.log('⚠️  WARNING: Response time still over 2 seconds');
    }

    // Step 4: Check job status (optional)
    if (result.jobIds && result.jobIds.length > 0) {
      console.log('\n4. Checking job status...');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s
      
      const jobResponse = await fetch(`${API_URL}/jobs/${result.jobIds[0]}`);
      const job = await jobResponse.json();
      console.log(`   Job ${job.id}: ${job.status}`);
      console.log(`   Type: ${job.type}`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.cause) {
      console.error('   Cause:', error.cause);
    }
  }
}

// Run the test
testOptimizedCompletion();