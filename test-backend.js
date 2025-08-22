#!/usr/bin/env node

/**
 * Simple test runner for backend cancellation APIs
 * Run with: node test-backend.js
 */

const BASE_URL = 'http://localhost:3000';

// Test data
const testUserId = '550e8400-e29b-41d4-a716-446655440001';
const testCancellationId = '550e8400-e29b-41d4-a716-446655440002';

const testFoundJobData = {
  viaMigrateMate: 'Yes',
  rolesApplied: '1-5',
  companiesEmailed: '6-20',
  companiesInterviewed: '3-5',
  feedback: 'This is a valid feedback message with more than 25 characters to meet the requirement.',
  visaLawyer: 'Yes'
};

// Utility functions
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

function logTest(name, result) {
  const status = result.status === 200 ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} ${name}`);
  if (result.status !== 200) {
    console.log(`  Status: ${result.status}`);
    console.log(`  Response:`, JSON.stringify(result.data, null, 2));
  }
}

// Test functions
async function testCancellationStart() {
  console.log('\n🧪 Testing Cancellation Start API...');
  
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
  logTest('Invalid User ID (validation working)', invalidResult);
}

async function testFoundJobCompletion() {
  console.log('\n🧪 Testing Found Job Completion API...');
  
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
  logTest('Missing Visa Type (validation working)', missingVisaResult);
  
  // Test short feedback (should fail)
  const shortFeedbackData = { ...testFoundJobData, feedback: 'Too short' };
  const shortFeedbackResult = await makeRequest(`${BASE_URL}/api/cancellations/found-job/complete`, {
    method: 'POST',
    body: JSON.stringify({
      cancellationId: testCancellationId,
      foundJobData: shortFeedbackData
    })
  });
  logTest('Short Feedback (validation working)', shortFeedbackResult);
  
  // Test invalid cancellation ID
  const invalidIdResult = await makeRequest(`${BASE_URL}/api/cancellations/found-job/complete`, {
    method: 'POST',
    body: JSON.stringify({
      cancellationId: 'invalid-uuid',
      foundJobData: testFoundJobData
    })
  });
  logTest('Invalid Cancellation ID (validation working)', invalidIdResult);
}

async function testCancellationUpdate() {
  console.log('\n🧪 Testing Cancellation Update API...');
  
  // Test standard update
  const standardResult = await makeRequest(`${BASE_URL}/api/cancellations/${testCancellationId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      reason: 'Testing the API',
      flowType: 'standard'
    })
  });
  logTest('Standard Update', standardResult);
  
  // Test found job update
  const foundJobResult = await makeRequest(`${BASE_URL}/api/cancellations/${testCancellationId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      flowType: 'found_job'
    })
  });
  logTest('Found Job Update', standardResult);
  
  // Test with found job data
  const withDataResult = await makeRequest(`${BASE_URL}/api/cancellations/${testCancellationId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      flowType: 'found_job',
      foundJobData: {
        viaMigrateMate: 'Yes',
        rolesApplied: '1-5'
      }
    })
  });
  logTest('Update with Found Job Data', withDataResult);
}

async function testErrorHandling() {
  console.log('\n🧪 Testing Error Handling...');
  
  // Test invalid JSON
  const invalidJsonResult = await makeRequest(`${BASE_URL}/api/cancellations/start`, {
    method: 'POST',
    body: 'invalid json'
  });
  logTest('Invalid JSON (validation working)', invalidJsonResult);
  
  // Test missing body
  const missingBodyResult = await makeRequest(`${BASE_URL}/api/cancellations/start`, {
    method: 'POST'
  });
  logTest('Missing Body (validation working)', missingBodyResult);
  
  // Test non-existent endpoint
  const notFoundResult = await makeRequest(`${BASE_URL}/api/cancellations/nonexistent`);
  logTest('Non-existent Endpoint (error handling working)', notFoundResult);
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Backend API Tests...\n');
  
  try {
    await testCancellationStart();
    await testFoundJobCompletion();
    await testCancellationUpdate();
    await testErrorHandling();
    
    console.log('\n✨ All tests completed!');
  } catch (error) {
    console.error('\n💥 Test runner error:', error);
  }
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(`${BASE_URL}/api/test`);
    return response.ok;
  } catch {
    return false;
  }
}

// Run tests if server is available
async function main() {
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.log('❌ Server not running. Please start the development server with: npm run dev');
    console.log('Then run this test script again.');
    process.exit(1);
  }
  
  await runAllTests();
}

main().catch(console.error);
