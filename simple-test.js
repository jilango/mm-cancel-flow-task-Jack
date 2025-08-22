#!/usr/bin/env node

/**
 * Simple Node.js test script for backend APIs
 * Run with: node simple-test.js
 */

const BASE_URL = 'http://localhost:3000';

// Test data
const testUserId = '550e8400-e29b-41d4-a716-446655440001';
const testCancellationId = '550e8400-e29b-41d4-a716-446655440001';

const testFoundJobData = {
  viaMigrateMate: 'Yes',
  rolesApplied: '1-5',
  companiesEmailed: '6-20',
  companiesInterviewed: '3-5',
  feedback: 'This is a valid feedback message with more than 25 characters to meet the requirement.',
  visaLawyer: 'Yes'
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name, result) {
  const status = result.status === 200 ? '✅ PASS' : '❌ FAIL';
  const color = result.status === 200 ? 'green' : 'red';
  log(`${status} ${name}`, color);
  
  if (result.status !== 200) {
    log(`  Status: ${result.status}`, 'yellow');
    log(`  Response: ${JSON.stringify(result.data, null, 2)}`, 'yellow');
  } else {
    log(`  Response: ${JSON.stringify(result.data, null, 2)}`, 'cyan');
  }
  console.log('');
}

async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    const data = await response.json();
    return { status: response.status, data };
  } catch (error) {
    return { status: 'ERROR', error: error.message };
  }
}

async function testCancellationStart() {
  log('🧪 Testing Cancellation Start API...', 'blue');
  
  // Test standard flow
  const standardResult = await makeRequest(`${BASE_URL}/api/cancellations/start`, {
    method: 'POST',
    body: JSON.stringify({ userId: testUserId, flowType: 'standard' })
  });
  logTest('Standard Flow Start', standardResult);
  
  // Test found job flow
  const foundJobResult = await makeRequest(`${BASE_URL}/api/cancellations/start`, {
    method: 'POST',
    body: JSON.stringify({ userId: testUserId, flowType: 'found_job' })
  });
  logTest('Found Job Flow Start', foundJobResult);
  
  // Test without flow type (should default to standard)
  const defaultResult = await makeRequest(`${BASE_URL}/api/cancellations/start`, {
    method: 'POST',
    body: JSON.stringify({ userId: testUserId })
  });
  logTest('Default Flow Start', defaultResult);
  
  // Test invalid user ID
  const invalidResult = await makeRequest(`${BASE_URL}/api/cancellations/start`, {
    method: 'POST',
    body: JSON.stringify({ userId: 'invalid-uuid' })
  });
  logTest('Invalid User ID (should fail)', invalidResult);
}

async function testFoundJobCompletion() {
  log('🧪 Testing Found Job Completion API...', 'blue');
  
  // Test valid completion
  const validResult = await makeRequest(`${BASE_URL}/api/cancellations/found-job/complete`, {
    method: 'POST',
    body: JSON.stringify({
      cancellationId: testCancellationId,
      foundJobData: testFoundJobData
    })
  });
  logTest('Valid Found Job Completion', validResult);
  
  // Test with visa lawyer No (requires visa type)
  const noLawyerData = { ...testFoundJobData, visaLawyer: 'No', visaType: 'H-1B' };
  const noLawyerResult = await makeRequest(`${BASE_URL}/api/cancellations/found-job/complete`, {
    method: 'POST',
    body: JSON.stringify({
      cancellationId: testCancellationId,
      foundJobData: noLawyerData
    })
  });
  logTest('No Lawyer with Visa Type', noLawyerResult);
  
  // Test missing visa type when lawyer is No (should fail)
  const missingVisaData = { ...testFoundJobData, visaLawyer: 'No' };
  const missingVisaResult = await makeRequest(`${BASE_URL}/api/cancellations/found-job/complete`, {
    method: 'POST',
    body: JSON.stringify({
      cancellationId: testCancellationId,
      foundJobData: missingVisaData
    })
  });
  logTest('Missing Visa Type (should fail)', missingVisaResult);
  
  // Test short feedback (should fail)
  const shortFeedbackData = { ...testFoundJobData, feedback: 'Too short' };
  const shortFeedbackResult = await makeRequest(`${BASE_URL}/api/cancellations/found-job/complete`, {
    method: 'POST',
    body: JSON.stringify({
      cancellationId: testCancellationId,
      foundJobData: shortFeedbackData
    })
  });
  logTest('Short Feedback (should fail)', shortFeedbackResult);
}

async function testAnalytics() {
  log('🧪 Testing Analytics API...', 'blue');
  
  const result = await makeRequest(`${BASE_URL}/api/cancellations/analytics`);
  logTest('Analytics Data', result);
}

async function testABTesting() {
  log('🧪 Testing A/B Testing Logic...', 'blue');
  
  const results = [];
  
  for (let i = 0; i < 10; i++) {
    const response = await makeRequest(`${BASE_URL}/api/cancellations/start`, {
      method: 'POST',
      body: JSON.stringify({ userId: testUserId, flowType: 'found_job' })
    });
    
    if (response.status === 200) {
      results.push({
        test: i + 1,
        variant: response.data.variant,
        flowDecision: response.data.flowDecision,
        flowType: response.data.flowType
      });
    }
  }
  
  const summary = {
    totalTests: results.length,
    variants: {
      A: results.filter(r => r.variant === 'A').length,
      B: results.filter(r => r.variant === 'B').length
    },
    flowDecisions: {
      step1Offer: results.filter(r => r.flowDecision === 'step1Offer').length,
      subscriptionCancelled: results.filter(r => r.flowDecision === 'subscriptionCancelled').length
    }
  };
  
  log('A/B Testing Results:', 'green');
  log(`Total Tests: ${summary.totalTests}`, 'cyan');
  log(`Variants - A: ${summary.variants.A}, B: ${summary.variants.B}`, 'cyan');
  log(`Flow Decisions - Step 1: ${summary.flowDecisions.step1Offer}, Direct Cancel: ${summary.flowDecisions.subscriptionCancelled}`, 'cyan');
  console.log('');
}

async function runAllTests() {
  log('🚀 Starting Backend API Tests...', 'magenta');
  console.log('');
  
  try {
    await testCancellationStart();
    await testFoundJobCompletion();
    await testAnalytics();
    await testABTesting();
    
    log('✨ All tests completed!', 'green');
  } catch (error) {
    log(`💥 Test runner error: ${error}`, 'red');
  }
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(`${BASE_URL}/api/cancellations/start`);
    return response.ok;
  } catch {
    return false;
  }
}

// Run tests if server is available
async function main() {
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    log('❌ Server not running. Please start the development server with: npm run dev', 'red');
    log('Then run this test script again.', 'red');
    process.exit(1);
  }
  
  await runAllTests();
}

main().catch(console.error);
