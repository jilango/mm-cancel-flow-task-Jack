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

    // Renew subscription: Reset to active status and clear any unresolved cancellations

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      const response = NextResponse.json({ 
        success: false, 
        error: 'User ID is required' 
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
        message: 'Subscription renewed successfully (mock mode)',
        data: { status: 'active' }
      });
      
      // Set CORS headers directly on response
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      return response;
    }

    // Find the user's subscription
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('id, status')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (subError) {
      const response = NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch subscription' 
      }, { status: 500 });
      
      // Set CORS headers directly on response
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      return response;
    }

    if (!subscription) {
      const response = NextResponse.json({ 
        success: false, 
        error: 'Subscription not found' 
      }, { status: 404 });
      
      // Set CORS headers directly on response
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      return response;
    }

    // Update subscription status to active
    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({ 
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.id);

    if (updateError) {
      const response = NextResponse.json({ 
        success: false, 
        error: 'Failed to renew subscription' 
      }, { status: 500 });
      
      // Set CORS headers directly on response
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      return response;
    }

    // Clean up any unresolved (active) cancellations for this user
    const { error: deleteError } = await supabaseAdmin
      .from('cancellations')
      .delete()
      .eq('user_id', userId)
      .is('resolved_at', null);

    if (deleteError) {
      console.warn('Warning: Failed to clean up cancellations:', deleteError);
      // Don't fail the request for this, just log it
    }

    const response = NextResponse.json({
      success: true,
      message: 'Subscription renewed successfully',
      data: { status: 'active' }
    });
    
    // Set CORS headers directly on response
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return response;

  } catch (error) {
    console.error('Renew subscription error:', error);
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
