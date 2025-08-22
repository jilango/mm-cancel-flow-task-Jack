import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export async function POST(request: NextRequest) {
  try {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 204 });
    }

    const body = await request.json();
    const { cancellationId } = body;

    if (!cancellationId) {
      const response = NextResponse.json({ 
        success: false, 
        error: 'Cancellation ID is required' 
      }, { status: 400 });
      
      // Set CORS headers directly on response
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      return response;
    }

    // For development/testing without database
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('mock')) {
      // Mock response for testing
      const response = NextResponse.json({
        success: true,
        message: 'Cancellation completed successfully (mock mode)',
        data: { status: 'cancelled' }
      });
      
      // Set CORS headers directly on response
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      return response;
    }

    // Get the cancellation details
    const { data: cancellation, error: cancelError } = await supabaseAdmin
      .from('cancellations')
      .select('id, user_id, subscription_id')
      .eq('id', cancellationId)
      .is('resolved_at', null)
      .limit(1)
      .maybeSingle();

    if (cancelError) {
      const response = NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch cancellation' 
      }, { status: 500 });
      
      // Set CORS headers directly on response
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      return response;
    }

    if (!cancellation) {
      const response = NextResponse.json({ 
        success: false, 
        error: 'Cancellation not found or already resolved' 
      }, { status: 404 });
      
      // Set CORS headers directly on response
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      return response;
    }

    // Update the cancellation to mark it as resolved
    const { error: updateCancelError } = await supabaseAdmin
      .from('cancellations')
      .update({ 
        resolved_at: new Date().toISOString()
      })
      .eq('id', cancellationId);

    if (updateCancelError) {
      const response = NextResponse.json({ 
        success: false, 
        error: 'Failed to update cancellation' 
      }, { status: 500 });
      
      // Set CORS headers directly on response
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      return response;
    }

    // Update the subscription status to cancelled
    const { error: updateSubError } = await supabaseAdmin
      .from('subscriptions')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', cancellation.subscription_id);

    if (updateSubError) {
      const response = NextResponse.json({ 
        success: false, 
        error: 'Failed to update subscription status' 
      }, { status: 500 });
      
      // Set CORS headers directly on response
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      return response;
    }

    const response = NextResponse.json({
      success: true,
      message: 'Cancellation completed successfully',
      data: { status: 'cancelled' }
    });
    
    // Set CORS headers directly on response
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return response;

  } catch (error) {
    console.error('Complete cancellation error:', error);
    const response = NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
    
    // Set CORS headers directly on response
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return response;
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
