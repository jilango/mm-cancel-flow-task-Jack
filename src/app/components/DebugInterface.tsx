'use client';

import { useState } from 'react';

export default function DebugInterface() {
  const [activeTab, setActiveTab] = useState('quick-tests');

  const showResult = (elementId: string, data: any, isSuccess: boolean) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.innerHTML = `
        <h4>${isSuccess ? '✅ Success' : '❌ Error'}</h4>
        <pre>${JSON.stringify(data, null, 2)}</pre>
      `;
      element.className = `result ${isSuccess ? 'success' : 'error'}`;
    }
  };

  const showDebug = (elementId: string, message: string) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.innerHTML += `<div class="debug-line">${new Date().toLocaleTimeString()}: ${message}</div>`;
    }
  };

  // Quick Test Functions
  const testStartAPI = async () => {
    const debugId = 'startDebug';
    showDebug(debugId, '🔄 Starting Start API test...');
    
    try {
      // First, try to renew the subscription to reset any existing cancellation
      showDebug(debugId, '🔄 Resetting subscription state...');
      try {
        await fetch('/api/subscriptions/renew', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: '550e8400-e29b-41d4-a716-446655440001' })
        });
        showDebug(debugId, '✅ Subscription renewed, existing cancellation cleared');
      } catch (renewError) {
        showDebug(debugId, `⚠️ Could not renew subscription: ${renewError}`);
      }
      
      const requestBody = { 
        userId: '550e8400-e29b-41d4-a716-446655440001', 
        flowType: 'found_job' 
      };
      
      showDebug(debugId, `📝 Request body: ${JSON.stringify(requestBody)}`);
      
      const response = await fetch('/api/cancellations/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      if (response.ok) {
        const data = await response.json();
        showDebug(debugId, `✅ Success: ${JSON.stringify(data)}`);
        showResult('startResult', data, true);
      } else {
        const errorText = await response.text();
        showDebug(debugId, `❌ Error: ${errorText}`);
        showResult('startResult', { status: response.status, error: errorText }, false);
      }
    } catch (error: any) {
      showDebug(debugId, `💥 Error: ${error.message}`);
      showResult('startResult', { error: error.message }, false);
    }
  };

  const testSubscriptionRenew = async () => {
    const debugId = 'renewDebug';
    showDebug(debugId, '🔄 Testing Subscription Renew API...');
    
    try {
      const response = await fetch('/api/subscriptions/renew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: '550e8400-e29b-41d4-a716-446655440001' })
      });
      
      const data = await response.json();
      showDebug(debugId, `✅ Success: ${JSON.stringify(data)}`);
      showResult('renewResult', data, true);
    } catch (error: any) {
      showDebug(debugId, `❌ Error: ${error.message}`);
      showResult('renewResult', { error: error.message }, false);
    }
  };

  const testSubscriptionStatus = async () => {
    const debugId = 'statusDebug';
    showDebug(debugId, '🔄 Testing Subscription Status API...');
    
    try {
      const response = await fetch('/api/subscriptions/status?userId=550e8400-e29b-41d4-a716-446655440001');
      const data = await response.json();
      showDebug(debugId, `✅ Success: ${JSON.stringify(data)}`);
      showResult('statusResult', data, true);
    } catch (error: any) {
      showDebug(debugId, `❌ Error: ${error.message}`);
      showResult('statusResult', { error: error.message }, false);
    }
  };

  const testCancellationComplete = async () => {
    const debugId = 'completeDebug';
    showDebug(debugId, '🔄 Testing Cancellation Complete API...');
    
    try {
      // First, try to get existing cancellation status
      showDebug(debugId, '🔍 Checking for existing cancellations...');
      const statusResponse = await fetch('/api/subscriptions/status?userId=550e8400-e29b-41d4-a716-446655440001');
      
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        showDebug(debugId, `📊 Current status: ${JSON.stringify(statusData)}`);
        
        // If there's already a cancellation in progress, try to complete it
        if (statusData.subscription?.status === 'pending_cancellation' && statusData.cancellation?.id) {
          showDebug(debugId, `📝 Found existing cancellation ID: ${statusData.cancellation.id}`);
          
          const response = await fetch('/api/cancellations/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cancellationId: statusData.cancellation.id })
          });
          
          const data = await response.json();
          showDebug(debugId, `✅ Success: ${JSON.stringify(data)}`);
          showResult('completeResult', data, true);
          return;
        }
      }
      
      // If no existing cancellation, start a new one
      showDebug(debugId, '🔄 No existing cancellation found, starting new one...');
      const startResponse = await fetch('/api/cancellations/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: '550e8400-e29b-41d4-a716-446655440001', 
          flowType: 'found_job' 
        })
      });
      
      if (!startResponse.ok) {
        throw new Error('Failed to start cancellation');
      }
      
      const startData = await startResponse.json();
      showDebug(debugId, `📝 Got cancellation ID: ${startData.cancellationId}`);
      
      const response = await fetch('/api/cancellations/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancellationId: startData.cancellationId })
      });
      
      const data = await response.json();
      showDebug(debugId, `✅ Success: ${JSON.stringify(data)}`);
      showResult('completeResult', data, true);
    } catch (error: any) {
      showDebug(debugId, `❌ Error: ${error.message}`);
      showResult('completeResult', { error: error.message }, false);
    }
  };

  const testDownsellAPI = async () => {
    const debugId = 'downsellDebug';
    showDebug(debugId, '🔄 Testing Downsell API...');
    
    try {
      // First, try to get existing cancellation status
      showDebug(debugId, '🔍 Checking for existing cancellations...');
      const statusResponse = await fetch('/api/subscriptions/status?userId=550e8400-e29b-41d4-a716-446655440001');
      
      let cancellationId: string;
      let variant: string;
      let monthlyPrice: number;
      let discountedPrice: number;
      
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        showDebug(debugId, `📊 Current status: ${JSON.stringify(statusData)}`);
        
        // If there's already a cancellation in progress, use it
        if (statusData.subscription?.status === 'pending_cancellation' && statusData.cancellation?.id) {
          cancellationId = statusData.cancellation.id;
          variant = statusData.cancellation.variant || 'A';
          monthlyPrice = statusData.subscription.monthlyPrice || 2500;
          discountedPrice = statusData.cancellation.discountedPrice || monthlyPrice;
          showDebug(debugId, `📝 Using existing cancellation ID: ${cancellationId}`);
        } else {
          // Start a new cancellation
          showDebug(debugId, '🔄 No existing cancellation found, starting new one...');
          const startResponse = await fetch('/api/cancellations/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              userId: '550e8400-e29b-41d4-a716-446655440001', 
              flowType: 'found_job' 
            })
          });
          
          if (!startResponse.ok) {
            throw new Error('Failed to start cancellation');
          }
          
          const startData = await startResponse.json();
          cancellationId = startData.cancellationId;
          variant = startData.variant;
          monthlyPrice = startData.monthlyPrice;
          discountedPrice = startData.discountedPrice;
        }
      } else {
        // Start a new cancellation
        showDebug(debugId, '🔄 Starting new cancellation...');
        const startResponse = await fetch('/api/cancellations/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userId: '550e8400-e29b-41d4-a716-446655440001', 
            flowType: 'found_job' 
          })
        });
        
        if (!startResponse.ok) {
          throw new Error('Failed to start cancellation');
        }
        
        const startData = await startResponse.json();
        cancellationId = startData.cancellationId;
        variant = startData.variant;
        monthlyPrice = startData.monthlyPrice;
        discountedPrice = startData.discountedPrice;
      }
      
      showDebug(debugId, `📝 Cancellation ID: ${cancellationId}`);
      showDebug(debugId, `📝 Variant: ${variant}, Original: $${monthlyPrice/100}, Discounted: $${discountedPrice/100}`);
      
      const response = await fetch('/api/cancellations/downsell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          cancellationId,
          accepted: false 
        })
      });
      
      const data = await response.json();
      showDebug(debugId, `✅ Success: ${JSON.stringify(data)}`);
      showResult('downsellResult', data, true);
    } catch (error: any) {
      showDebug(debugId, `💥 Error: ${error.message}`);
      showResult('downsellResult', { error: error.message }, false);
    }
  };

  const testABVariants = async () => {
    const debugId = 'abVariantsDebug';
    showDebug(debugId, '🔄 Testing A/B Testing Variants...');
    
    const results = { A: 0, B: 0 };
    showDebug(debugId, '🧪 Running 10 A/B tests to check variant distribution...');
    
    for (let i = 0; i < 10; i++) {
      try {
        // Renew subscription first to reset state
        await fetch('/api/subscriptions/renew', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: '550e8400-e29b-41d4-a716-446655440001' })
        });
        
        // Start new cancellation
        const response = await fetch('/api/cancellations/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userId: '550e8400-e29b-41d4-a716-446655440001', 
            flowType: 'found_job' 
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          results[data.variant as 'A' | 'B']++;
          showDebug(debugId, `✅ Test ${i + 1}: Variant ${data.variant} (Price: $${data.monthlyPrice/100} → $${data.discountedPrice/100})`);
        } else {
          showDebug(debugId, `❌ Test ${i + 1} failed: ${response.status}`);
        }
      } catch (error: any) {
        showDebug(debugId, `❌ Test ${i + 1} failed: ${error.message}`);
      }
    }
    
    const total = results.A + results.B;
    showDebug(debugId, `📈 Final Results: Variant A: ${results.A} (${total > 0 ? (results.A/total*100).toFixed(1) : 'N/A'}%), Variant B: ${results.B} (${total > 0 ? (results.B/total*100).toFixed(1) : 'N/A'}%)`);
    
    showResult('abVariantsResult', {
      message: 'A/B Testing Variants Results',
      totalTests: total,
      variantA: {
        count: results.A,
        percentage: total > 0 ? `${(results.A/total*100).toFixed(1)}%` : 'N/A'
      },
      variantB: {
        count: results.B,
        percentage: total > 0 ? `${(results.B/total*100).toFixed(1)}%` : 'N/A'
      },
      pricing: {
        variantA: 'No discount (original price)',
        variantB: '$25→$15, $29→$19'
      }
    }, true);
  };

  // Custom Test Functions
  const customStartAPI = async () => {
    const userId = (document.getElementById('startUserId') as HTMLInputElement)?.value || '550e8400-e29b-41d4-a716-446655440001';
    const flowType = (document.getElementById('startFlowType') as HTMLSelectElement)?.value || 'found_job';
    
    const debugId = 'customStartDebug';
    showDebug(debugId, `🔄 Custom Start API test with userId: ${userId}, flowType: ${flowType}`);
    
    try {
      const response = await fetch('/api/cancellations/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, flowType })
      });
      
      if (response.ok) {
        const data = await response.json();
        showDebug(debugId, `✅ Success: ${JSON.stringify(data)}`);
        showResult('customStartResult', data, true);
      } else {
        const errorText = await response.text();
        showDebug(debugId, `❌ Error: ${errorText}`);
        showResult('customStartResult', { status: response.status, error: errorText }, false);
      }
    } catch (error: any) {
      showDebug(debugId, `💥 Error: ${error.message}`);
      showResult('customStartResult', { error: error.message }, false);
    }
  };

  const customRenewAPI = async () => {
    const userId = (document.getElementById('renewUserId') as HTMLInputElement)?.value || '550e8400-e29b-41d4-a716-446655440001';
    
    const debugId = 'customRenewDebug';
    showDebug(debugId, `🔄 Custom Renew API test with userId: ${userId}`);
    
    try {
      const response = await fetch('/api/subscriptions/renew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      
      if (response.ok) {
        const data = await response.json();
        showDebug(debugId, `✅ Success: ${JSON.stringify(data)}`);
        showResult('customRenewResult', data, true);
      } else {
        const errorText = await response.text();
        showDebug(debugId, `❌ Error: ${errorText}`);
        showResult('customRenewResult', { status: response.status, error: errorText }, false);
      }
    } catch (error: any) {
      showDebug(debugId, `💥 Error: ${error.message}`);
      showResult('customRenewResult', { error: error.message }, false);
    }
  };

  const customStatusAPI = async () => {
    const userId = (document.getElementById('statusUserId') as HTMLInputElement)?.value || '550e8400-e29b-41d4-a716-446655440001';
    
    const debugId = 'customStatusDebug';
    showDebug(debugId, `🔄 Custom Status API test with userId: ${userId}`);
    
    try {
      const response = await fetch(`/api/subscriptions/status?userId=${userId}`);
      
      if (response.ok) {
        const data = await response.json();
        showDebug(debugId, `✅ Success: ${JSON.stringify(data)}`);
        showResult('customStatusResult', data, true);
      } else {
        const errorText = await response.text();
        showDebug(debugId, `❌ Error: ${errorText}`);
        showResult('customStatusResult', { status: response.status, error: errorText }, false);
      }
    } catch (error: any) {
      showDebug(debugId, `💥 Error: ${error.message}`);
      showResult('customStatusResult', { error: error.message }, false);
    }
  };

  const customCompleteAPI = async () => {
    const cancellationId = (document.getElementById('completeCancellationId') as HTMLInputElement)?.value;
    
    if (!cancellationId) {
      showResult('customCompleteResult', { error: 'Please enter a cancellation ID' }, false);
      return;
    }
    
    const debugId = 'customCompleteDebug';
    showDebug(debugId, `🔄 Custom Complete API test with cancellationId: ${cancellationId}`);
    
    try {
      const response = await fetch('/api/cancellations/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancellationId })
      });
      
      if (response.ok) {
        const data = await response.json();
        showDebug(debugId, `✅ Success: ${JSON.stringify(data)}`);
        showResult('customCompleteResult', data, true);
      } else {
        const errorText = await response.text();
        showDebug(debugId, `❌ Error: ${errorText}`);
        showResult('customCompleteResult', { status: response.status, error: errorText }, false);
      }
    } catch (error: any) {
      showDebug(debugId, `💥 Error: ${error.message}`);
      showResult('customCompleteResult', { error: error.message }, false);
    }
  };

  const customDownsellAPI = async () => {
    const cancellationId = (document.getElementById('downsellCancellationId') as HTMLInputElement)?.value;
    const accepted = (document.getElementById('downsellAccepted') as HTMLSelectElement)?.value === 'true';
    
    if (!cancellationId) {
      showResult('customDownsellResult', { error: 'Please enter a cancellation ID' }, false);
      return;
    }
    
    const debugId = 'customDownsellDebug';
    showDebug(debugId, `🔄 Custom Downsell API test with cancellationId: ${cancellationId}, accepted: ${accepted}`);
    
    try {
      const response = await fetch('/api/cancellations/downsell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancellationId, accepted })
      });
      
      if (response.ok) {
        const data = await response.json();
        showDebug(debugId, `✅ Success: ${JSON.stringify(data)}`);
        showResult('customDownsellResult', data, true);
      } else {
        const errorText = await response.text();
        showDebug(debugId, `❌ Error: ${errorText}`);
        showResult('customDownsellResult', { status: response.status, error: errorText }, false);
      }
    } catch (error: any) {
      showDebug(debugId, `💥 Error: ${error.message}`);
      showResult('customDownsellResult', { error: error.message }, false);
    }
  };

  const customABTest = async () => {
    const testCount = parseInt((document.getElementById('abTestCount') as HTMLInputElement)?.value || '20');
    
    if (testCount < 5 || testCount > 100) {
      showResult('customABTestResult', { error: 'Please enter a number between 5 and 100' }, false);
      return;
    }
    
    const debugId = 'customABTestDebug';
    showDebug(debugId, `🧪 Custom A/B Test with ${testCount} iterations...`);
    
    const results = { A: 0, B: 0 };
    
    for (let i = 0; i < testCount; i++) {
      try {
        // Renew subscription first to reset state
        await fetch('/api/subscriptions/renew', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: '550e8400-e29b-41d4-a716-446655440001' })
        });
        
        // Start new cancellation
        const response = await fetch('/api/cancellations/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userId: '550e8400-e29b-41d4-a716-446655440001', 
            flowType: 'found_job' 
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          results[data.variant as 'A' | 'B']++;
          showDebug(debugId, `✅ Test ${i + 1}: Variant ${data.variant}`);
        } else {
          showDebug(debugId, `❌ Test ${i + 1} failed: ${response.status}`);
        }
      } catch (error: any) {
        showDebug(debugId, `❌ Test ${i + 1} failed: ${error.message}`);
      }
    }
    
    const total = results.A + results.B;
    showDebug(debugId, `📈 Final Results: Variant A: ${results.A} (${total > 0 ? (results.A/total*100).toFixed(1) : 'N/A'}%), Variant B: ${results.B} (${total > 0 ? (results.B/total*100).toFixed(1) : 'N/A'}%)`);
    
    showResult('customABTestResult', {
      message: `A/B Test Results (${testCount} iterations)`,
      totalTests: total,
      variantA: {
        count: results.A,
        percentage: total > 0 ? `${(results.A/total*100).toFixed(1)}%` : 'N/A'
      },
      variantB: {
        count: results.B,
        percentage: total > 0 ? `${(results.B/total*100).toFixed(1)}%` : 'N/A'
      },
      pricing: {
        variantA: 'No discount (original price)',
        variantB: '$25→$15, $29→$19'
      }
    }, true);
  };

  const runAllTests = () => {
    testStartAPI();
    testSubscriptionRenew();
    testSubscriptionStatus();
    testCancellationComplete();
    testDownsellAPI();
    testABVariants();
  };

  const clearAllOutputs = () => {
    const elements = [
      'startResult', 'startDebug', 'renewResult', 'renewDebug',
      'statusResult', 'statusDebug', 'completeResult', 'completeDebug',
      'downsellResult', 'downsellDebug', 'abVariantsResult', 'abVariantsDebug'
    ];
    
    elements.forEach(id => {
      const element = document.getElementById(id);
      if (element) element.innerHTML = '';
    });
  };

  const clearCustomResults = () => {
    const elements = [
      'customStartResult', 'customStartDebug', 'customRenewResult', 'customRenewDebug',
      'customStatusResult', 'customStatusDebug', 'customCompleteResult', 'customCompleteDebug',
      'customDownsellResult', 'customDownsellDebug', 'customABTestResult', 'customABTestDebug'
    ];
    
    elements.forEach(id => {
      const element = document.getElementById(id);
      if (element) element.innerHTML = '';
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6">
            <h1 className="text-3xl font-bold">🚀 API Testing Interface</h1>
            <p className="text-purple-100 mt-2">Test your cancellation flow APIs with ease</p>
          </div>
          
          <div className="border-b border-gray-200">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('quick-tests')}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'quick-tests'
                    ? 'border-b-2 border-purple-500 text-purple-600'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                ⚡ Quick Tests
              </button>
              <button
                onClick={() => setActiveTab('custom-tests')}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'custom-tests'
                    ? 'border-b-2 border-purple-500 text-purple-600'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                🔧 Custom Tests
              </button>
            </nav>
          </div>
          
          <div className="p-6">
            {activeTab === 'quick-tests' && (
              <div>
                <div className="mb-6 flex gap-4">
                  <button
                    onClick={runAllTests}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    🚀 Run All Tests
                  </button>
                  <button
                    onClick={clearAllOutputs}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    🗑️ Clear All Outputs
                  </button>
                  <button
                    onClick={async () => {
                      // Reset subscription state first
                      try {
                        await fetch('/api/subscriptions/renew', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ userId: '550e8400-e29b-41d4-a716-446655440001' })
                        });
                        alert('✅ Subscription state reset successfully!');
                      } catch (error) {
                        alert('❌ Failed to reset subscription state');
                      }
                    }}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                  >
                    🔄 Reset State
                  </button>
                </div>
                
                <div className="grid gap-6">
                  {/* Cancellation Start API */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-3 text-gray-900">🎯 Cancellation Start API</h3>
                    <button
                      onClick={testStartAPI}
                      className="mb-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      Test Start API
                    </button>
                    <div id="startResult" className="mb-3"></div>
                    <div id="startDebug" className="bg-gray-100 p-3 rounded text-sm max-h-40 overflow-y-auto text-gray-800" style={{color: '#1f2937', fontWeight: '500'}}></div>
                  </div>
                  
                  {/* Subscription Renew API */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-3 text-gray-900">🔄 Subscription Renew API</h3>
                    <button
                      onClick={testSubscriptionRenew}
                      className="mb-3 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                    >
                      Test Renew API
                    </button>
                    <div id="renewResult" className="mb-3"></div>
                    <div id="renewDebug" className="bg-gray-100 p-3 rounded text-sm max-h-40 overflow-y-auto text-gray-800" style={{color: '#1f2937', fontWeight: '500'}}></div>
                  </div>
                  
                  {/* Subscription Status API */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-3 text-gray-900">📊 Subscription Status API</h3>
                    <button
                      onClick={testSubscriptionStatus}
                      className="mb-3 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                    >
                      Test Status API
                    </button>
                    <div id="statusResult" className="mb-3"></div>
                    <div id="statusDebug" className="bg-gray-100 p-3 rounded text-sm max-h-40 overflow-y-auto text-gray-800" style={{color: '#1f2937', fontWeight: '500'}}></div>
                  </div>
                  
                  {/* Cancellation Complete API */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-3 text-gray-900">✅ Cancellation Complete API</h3>
                    <button
                      onClick={testCancellationComplete}
                      className="mb-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    >
                      Test Complete API
                    </button>
                    <div id="completeResult" className="mb-3"></div>
                    <div id="completeDebug" className="bg-gray-100 p-3 rounded text-sm max-h-40 overflow-y-auto text-gray-800" style={{color: '#1f2937', fontWeight: '500'}}></div>
                  </div>
                  
                  {/* Downsell API */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-3 text-gray-900">💰 Downsell API</h3>
                    <button
                      onClick={testDownsellAPI}
                      className="mb-3 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
                    >
                      Test Downsell API
                    </button>
                    <div id="downsellResult" className="mb-3"></div>
                    <div id="downsellDebug" className="bg-gray-100 p-3 rounded text-sm max-h-40 overflow-y-auto text-gray-800" style={{color: '#1f2937', fontWeight: '500'}}></div>
                  </div>
                  
                  {/* A/B Testing Variants */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-3 text-gray-900">🧪 A/B Testing Variants</h3>
                    <button
                      onClick={testABVariants}
                      className="mb-3 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
                    >
                      Test A/B Variants
                    </button>
                    <div id="abVariantsResult" className="mb-3"></div>
                    <div id="abVariantsDebug" className="bg-gray-100 p-3 rounded text-sm max-h-40 overflow-y-auto text-gray-800" style={{color: '#1f2937', fontWeight: '500'}}></div>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'custom-tests' && (
              <div>
                <div className="mb-6 flex gap-4">
                  <button
                    onClick={clearCustomResults}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    🗑️ Clear Results
                  </button>
                </div>
                
                <div className="grid gap-6">
                  {/* Cancellation Start API */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-3 text-gray-900">🎯 Cancellation Start API</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">User ID:</label>
                        <input
                          type="text"
                          id="startUserId"
                          defaultValue="550e8400-e29b-41d4-a716-446655440001"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="Enter UUID"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">Flow Type:</label>
                        <select
                          id="startFlowType"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="standard">Standard</option>
                          <option value="found_job">Found Job</option>
                        </select>
                      </div>
                    </div>
                    <button
                      onClick={customStartAPI}
                      className="mb-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      🚀 Start Cancellation
                    </button>
                    <div id="customStartResult" className="mb-3"></div>
                    <div id="customStartDebug" className="bg-gray-100 p-3 rounded text-sm max-h-40 overflow-y-auto text-gray-800" style={{color: '#1f2937', fontWeight: '500'}}></div>
                  </div>
                  
                  {/* Subscription Renew API */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-3 text-gray-900">🔄 Subscription Renew API</h3>
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-900 mb-1">User ID:</label>
                      <input
                        type="text"
                        id="renewUserId"
                        defaultValue="550e8400-e29b-41d4-a716-446655440001"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Enter UUID"
                      />
                    </div>
                    <button
                      onClick={customRenewAPI}
                      className="mb-3 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                    >
                      🔄 Renew Subscription
                    </button>
                    <div id="customRenewResult" className="mb-3"></div>
                    <div id="customRenewDebug" className="bg-gray-100 p-3 rounded text-sm max-h-40 overflow-y-auto text-gray-800" style={{color: '#1f2937', fontWeight: '500'}}></div>
                  </div>
                  
                  {/* Subscription Status API */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-3 text-gray-900">📊 Subscription Status API</h3>
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-900 mb-1">User ID:</label>
                      <input
                        type="text"
                        id="statusUserId"
                        defaultValue="550e8400-e29b-41d4-a716-446655440001"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Enter UUID"
                      />
                    </div>
                    <button
                      onClick={customStatusAPI}
                      className="mb-3 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                    >
                      📊 Get Status
                    </button>
                    <div id="customStatusResult" className="mb-3"></div>
                    <div id="customStatusDebug" className="bg-gray-100 p-3 rounded text-sm max-h-40 overflow-y-auto text-gray-800" style={{color: '#1f2937', fontWeight: '500'}}></div>
                  </div>
                  
                  {/* Cancellation Complete API */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-3 text-gray-900">✅ Cancellation Complete API</h3>
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-900 mb-1">Cancellation ID:</label>
                      <input
                        type="text"
                        id="completeCancellationId"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Enter Cancellation UUID"
                      />
                    </div>
                    <button
                      onClick={customCompleteAPI}
                      className="mb-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    >
                      ✅ Complete Cancellation
                    </button>
                    <div id="customCompleteResult" className="mb-3"></div>
                    <div id="customCompleteDebug" className="bg-gray-100 p-3 rounded text-sm max-h-40 overflow-y-auto text-gray-800" style={{color: '#1f2937', fontWeight: '500'}}></div>
                  </div>
                  
                  {/* Downsell API */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-3 text-gray-900">💰 Downsell API</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">Cancellation ID:</label>
                        <input
                          type="text"
                          id="downsellCancellationId"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="Enter Cancellation UUID"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">Accept Offer?</label>
                        <select
                          id="downsellAccepted"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="false">No - Continue Cancellation</option>
                          <option value="true">Yes - Accept & Reactivate</option>
                        </select>
                      </div>
                    </div>
                    <button
                      onClick={customDownsellAPI}
                      className="mb-3 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
                    >
                      💰 Process Downsell
                    </button>
                    <div id="customDownsellResult" className="mb-3"></div>
                    <div id="customDownsellDebug" className="bg-gray-100 p-3 rounded text-sm max-h-40 overflow-y-auto text-gray-800" style={{color: '#1f2937', fontWeight: '500'}}></div>
                  </div>
                  
                  {/* A/B Testing Analysis */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-3 text-gray-900">🧪 A/B Testing Analysis</h3>
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-900 mb-1">Number of Tests:</label>
                      <input
                        type="number"
                        id="abTestCount"
                        defaultValue="20"
                        min="5"
                        max="100"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Enter number of tests"
                      />
                    </div>
                    <button
                      onClick={customABTest}
                      className="mb-3 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
                    >
                      🧪 Run A/B Test
                    </button>
                    <div id="customABTestResult" className="mb-3"></div>
                    <div id="customABTestDebug" className="bg-gray-100 p-3 rounded text-sm max-h-40 overflow-y-auto text-gray-800" style={{color: '#1f2937', fontWeight: '500'}}></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .result.success {
          background-color: #d4edda;
          border: 1px solid #c3e6cb;
          color: #155724;
          padding: 12px;
          border-radius: 6px;
        }
        
        .result.error {
          background-color: #f8d7da;
          border: 1px solid #f5c6cb;
          color: #721c24;
          padding: 12px;
          border-radius: 6px;
        }
        
        .result pre {
          margin: 8px 0 0 0;
          white-space: pre-wrap;
          font-size: 12px;
          color: #1f2937 !important;
          font-weight: 500 !important;
        }
        
        .result h4 {
          margin: 0 0 8px 0;
          font-size: 14px;
          font-weight: 600;
        }
        
        /* Ensure debug text is always readable */
        #startDebug, #renewDebug, #statusDebug, #completeDebug, #downsellDebug, #abVariantsDebug,
        #customStartDebug, #customRenewDebug, #customStatusDebug, #customCompleteDebug, #customDownsellDebug, #customABTestDebug {
          color: #1f2937 !important;
          font-weight: 500;
        }
        
        /* Force all debug lines to be dark and readable */
        .debug-line {
          color: #1f2937 !important;
          font-weight: 500 !important;
          margin-bottom: 4px !important;
        }
        
        /* Override any browser default text colors */
        #startDebug *, #renewDebug *, #statusDebug *, #completeDebug *, #downsellDebug *, #abVariantsDebug *,
        #customStartDebug *, #customRenewDebug *, #customStatusDebug *, #customCompleteDebug *, #customDownsellDebug *, #customABTestDebug * {
          color: #1f2937 !important;
        }
        
        /* Ensure all result text is dark and readable */
        .result * {
          color: #1f2937 !important;
        }
        
        /* Force JSON text to be dark */
        .result pre, .result code {
          color: #1f2937 !important;
          font-weight: 500 !important;
        }
      `}</style>
    </div>
  );
}
