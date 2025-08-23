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

export async function GET(request: NextRequest) {
  try {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 204 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

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
        status: 'active'
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
      .select('status')
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

    // Check for active cancellations (pending cancellation status)
    const { data: activeCancellation, error: cancelError } = await supabaseAdmin
      .from('cancellations')
      .select('id')
      .eq('user_id', userId)
      .is('resolved_at', null)
      .limit(1)
      .maybeSingle();

    // Check if there's an accepted offer (resolved cancellation with offer_accepted flow type)
    const { data: acceptedOffer, error: offerError } = await supabaseAdmin
      .from('cancellations')
      .select('id, flow_type, accepted_downsell')
      .eq('user_id', userId)
      .eq('flow_type', 'offer_accepted')
      .not('resolved_at', 'is', null)
      .order('resolved_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cancelError) {
      console.error('Failed to check for active cancellations:', cancelError);
    }

    // Determine final status
    let finalStatus = subscription.status;
    
    // If there's an active cancellation and subscription is active, status is pending_cancellation
    if (activeCancellation && subscription.status === 'active') {
      finalStatus = 'pending_cancellation';
    }

    const response = NextResponse.json({
      success: true,
      status: finalStatus,
      acceptedOffer: acceptedOffer ? {
        hasAcceptedOffer: true,
        acceptedDownsell: acceptedOffer.accepted_downsell
      } : null
    });
    
    // Set CORS headers directly on response
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return response;

  } catch (error) {
    console.error('Get subscription status error:', error);
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
