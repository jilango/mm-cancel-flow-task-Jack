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
    const { cancellationId, accepted } = body;

    if (!cancellationId || typeof accepted !== 'boolean') {
      const response = NextResponse.json({ 
        success: false, 
        error: 'Cancellation ID and accepted status are required' 
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
        message: accepted ? 'Downsell offer accepted (mock mode)' : 'Downsell offer declined (mock mode)',
        data: { accepted }
      });
      
      // Set CORS headers directly on response
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      return response;
    }

    // Update the cancellation record with downsell acceptance
    const { error: updateError } = await supabaseAdmin
      .from('cancellations')
      .update({ 
        accepted_downsell: accepted,
        updated_at: new Date().toISOString()
      })
      .eq('id', cancellationId);

    if (updateError) {
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

    // If accepted, update subscription status back to active
    if (accepted) {
      const { data: cancellation } = await supabaseAdmin
        .from('cancellations')
        .select('subscription_id')
        .eq('id', cancellationId)
        .single();

      if (cancellation) {
        const { error: subUpdateError } = await supabaseAdmin
          .from('subscriptions')
          .update({ 
            status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', cancellation.subscription_id);

        if (subUpdateError) {
          console.warn('Warning: Failed to reactivate subscription:', subUpdateError);
        }
      }
    }

    const response = NextResponse.json({
      success: true,
      message: accepted ? 'Downsell offer accepted successfully' : 'Downsell offer declined successfully',
      data: { accepted }
    });
    
    // Set CORS headers directly on response
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return response;

  } catch (error) {
    console.error('Downsell API error:', error);
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
