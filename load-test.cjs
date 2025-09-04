// MIXAI v1.4 Load Test Script
// Run: node load-test.js

const { performance } = require('perf_hooks');
const crypto = require('crypto');

// Test configuration
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  concurrentUsers: 50,
  testDuration: 60, // seconds
  rampUpTime: 10,   // seconds
  endpoints: [
    { path: '/', weight: 30 },
    { path: '/pricing', weight: 20 },
    { path: '/how-it-works', weight: 15 },
    { path: '/api/health', weight: 10 },
    { path: '/upload', weight: 15 },
    { path: '/faq', weight: 10 }
  ]
};

// Performance metrics
const metrics = {
  totalRequests: 0,
  successfulRequests: 0,
  errorRequests: 0,
  responseTimes: [],
  errors: {},
  startTime: null,
  endTime: null
};

// Generate random user simulation
function generateRandomUser() {
  return {
    id: crypto.randomUUID(),
    sessionId: crypto.randomUUID(),
    userAgent: 'MIXAI-LoadTest/1.0'
  };
}

// Select random endpoint based on weights
function selectRandomEndpoint() {
  const totalWeight = TEST_CONFIG.endpoints.reduce((sum, ep) => sum + ep.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const endpoint of TEST_CONFIG.endpoints) {
    random -= endpoint.weight;
    if (random <= 0) return endpoint.path;
  }
  return TEST_CONFIG.endpoints[0].path;
}

// Make HTTP request with metrics collection
async function makeRequest(path, user) {
  const startTime = performance.now();
  
  try {
    const response = await fetch(`${TEST_CONFIG.baseUrl}${path}`, {
      headers: {
        'User-Agent': user.userAgent,
        'X-Session-ID': user.sessionId,
        'Accept': 'text/html,application/json',
        'Cache-Control': 'no-cache'
      }
    });
    
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    metrics.totalRequests++;
    metrics.responseTimes.push(responseTime);
    
    if (response.ok) {
      metrics.successfulRequests++;
    } else {
      metrics.errorRequests++;
      const errorKey = `${response.status}_${path}`;
      metrics.errors[errorKey] = (metrics.errors[errorKey] || 0) + 1;
    }
    
    return { success: true, status: response.status, responseTime };
  } catch (error) {
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    metrics.totalRequests++;
    metrics.errorRequests++;
    metrics.responseTimes.push(responseTime);
    
    const errorKey = `ERROR_${error.code || 'UNKNOWN'}_${path}`;
    metrics.errors[errorKey] = (metrics.errors[errorKey] || 0) + 1;
    
    return { success: false, error: error.message, responseTime };
  }
}

// Simulate single user session
async function simulateUser(userId, duration) {
  const user = generateRandomUser();
  const endTime = Date.now() + (duration * 1000);
  
  console.log(`👤 User ${userId} started simulation`);
  
  while (Date.now() < endTime) {
    const endpoint = selectRandomEndpoint();
    const result = await makeRequest(endpoint, user);
    
    // Random think time between 1-5 seconds
    const thinkTime = Math.random() * 4000 + 1000;
    await new Promise(resolve => setTimeout(resolve, thinkTime));
  }
  
  console.log(`👤 User ${userId} completed simulation`);
}

// Calculate statistics
function calculateStats() {
  if (metrics.responseTimes.length === 0) return null;
  
  const sortedTimes = metrics.responseTimes.sort((a, b) => a - b);
  const len = sortedTimes.length;
  
  return {
    totalRequests: metrics.totalRequests,
    successfulRequests: metrics.successfulRequests,
    errorRequests: metrics.errorRequests,
    successRate: ((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(2),
    averageResponseTime: (sortedTimes.reduce((a, b) => a + b, 0) / len).toFixed(2),
    medianResponseTime: sortedTimes[Math.floor(len / 2)].toFixed(2),
    p95ResponseTime: sortedTimes[Math.floor(len * 0.95)].toFixed(2),
    p99ResponseTime: sortedTimes[Math.floor(len * 0.99)].toFixed(2),
    minResponseTime: sortedTimes[0].toFixed(2),
    maxResponseTime: sortedTimes[len - 1].toFixed(2),
    requestsPerSecond: (metrics.totalRequests / ((metrics.endTime - metrics.startTime) / 1000)).toFixed(2)
  };
}

// Main load test execution
async function runLoadTest() {
  console.log('🚀 MIXAI v1.4 Load Test Starting...');
  console.log(`📊 Configuration:`);
  console.log(`   - Base URL: ${TEST_CONFIG.baseUrl}`);
  console.log(`   - Concurrent Users: ${TEST_CONFIG.concurrentUsers}`);
  console.log(`   - Test Duration: ${TEST_CONFIG.testDuration}s`);
  console.log(`   - Ramp-up Time: ${TEST_CONFIG.rampUpTime}s`);
  console.log('');
  
  // Health check
  console.log('🔍 Performing health check...');
  try {
    const healthResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/health`);
    if (!healthResponse.ok) {
      throw new Error(`Health check failed: ${healthResponse.status}`);
    }
    console.log('✅ Health check passed');
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    process.exit(1);
  }
  
  console.log('');
  metrics.startTime = Date.now();
  
  // Start users with ramp-up
  const userPromises = [];
  const rampUpDelay = (TEST_CONFIG.rampUpTime * 1000) / TEST_CONFIG.concurrentUsers;
  
  for (let i = 0; i < TEST_CONFIG.concurrentUsers; i++) {
    setTimeout(() => {
      const userPromise = simulateUser(i + 1, TEST_CONFIG.testDuration);
      userPromises.push(userPromise);
    }, i * rampUpDelay);
  }
  
  // Wait for all users to complete
  console.log('⏱️  Load test in progress...');
  
  // Progress reporting
  const progressInterval = setInterval(() => {
    const stats = calculateStats();
    if (stats) {
      console.log(`📈 Progress: ${stats.totalRequests} requests, ${stats.successRate}% success rate, ${stats.averageResponseTime}ms avg response time`);
    }
  }, 10000);
  
  await Promise.all(userPromises);
  clearInterval(progressInterval);
  
  metrics.endTime = Date.now();
  
  console.log('');
  console.log('✅ Load test completed!');
  console.log('');
  
  // Final statistics
  const stats = calculateStats();
  if (stats) {
    console.log('📊 Final Results:');
    console.log(`   Total Requests: ${stats.totalRequests}`);
    console.log(`   Successful Requests: ${stats.successfulRequests}`);
    console.log(`   Error Requests: ${stats.errorRequests}`);
    console.log(`   Success Rate: ${stats.successRate}%`);
    console.log(`   Requests per Second: ${stats.requestsPerSecond}`);
    console.log('');
    console.log('⏱️  Response Times:');
    console.log(`   Average: ${stats.averageResponseTime}ms`);
    console.log(`   Median: ${stats.medianResponseTime}ms`);
    console.log(`   95th Percentile: ${stats.p95ResponseTime}ms`);
    console.log(`   99th Percentile: ${stats.p99ResponseTime}ms`);
    console.log(`   Min: ${stats.minResponseTime}ms`);
    console.log(`   Max: ${stats.maxResponseTime}ms`);
    
    if (Object.keys(metrics.errors).length > 0) {
      console.log('');
      console.log('❌ Errors:');
      Object.entries(metrics.errors).forEach(([error, count]) => {
        console.log(`   ${error}: ${count}`);
      });
    }
    
    console.log('');
    console.log('🎯 Performance Analysis:');
    
    // Performance recommendations
    if (parseFloat(stats.successRate) < 99) {
      console.log(`   ⚠️  Success rate below 99% (${stats.successRate}%)`);
    }
    
    if (parseFloat(stats.averageResponseTime) > 1000) {
      console.log(`   ⚠️  Average response time high (${stats.averageResponseTime}ms)`);
    }
    
    if (parseFloat(stats.p95ResponseTime) > 2000) {
      console.log(`   ⚠️  95th percentile response time high (${stats.p95ResponseTime}ms)`);
    }
    
    if (parseFloat(stats.requestsPerSecond) < 10) {
      console.log(`   ⚠️  Low throughput (${stats.requestsPerSecond} req/s)`);
    }
    
    // Success criteria
    const successCriteria = [
      parseFloat(stats.successRate) >= 99,
      parseFloat(stats.averageResponseTime) <= 1000,
      parseFloat(stats.p95ResponseTime) <= 2000,
      parseFloat(stats.requestsPerSecond) >= 10
    ];
    
    if (successCriteria.every(Boolean)) {
      console.log('   ✅ All performance criteria met!');
    } else {
      console.log('   ⚠️  Some performance criteria not met');
    }
  }
  
  console.log('');
  console.log('🎵 MIXAI v1.4 Load Test Complete!');
}

// Execute load test
if (require.main === module) {
  runLoadTest().catch(error => {
    console.error('❌ Load test failed:', error);
    process.exit(1);
  });
}

module.exports = { runLoadTest, TEST_CONFIG };