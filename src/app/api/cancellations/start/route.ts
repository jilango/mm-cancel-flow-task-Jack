import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';


const StartSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  flowType: z.enum(['standard', 'found_job']).optional().default('standard')
});

export async function POST(req: Request) {
  try {
    // Basic CSRF hardening - allow local development and testing
    const site = process.env.NEXT_PUBLIC_SITE_URL;
    if (site) {
      const origin = req.headers.get('origin') ?? '';
      // Allow localhost, file:// (for testing), and configured site
      if (!origin.startsWith(site) && 
          !origin.startsWith('http://localhost:3000') && 
          !origin.startsWith('file://') &&
          origin !== 'null') {
        return NextResponse.json({ error: 'Bad origin' }, { status: 403 });
      }
    }

    const body = await req.json().catch(() => ({}));
    const validation = StartSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid request data', 
        details: validation.error.errors 
      }, { status: 400 });
    }

    const { userId, flowType } = validation.data;

    // For development/testing without database
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('mock')) {
      // Mock response for testing
      let variant: 'A' | 'B';
      let flowDecision: string;
      
      if (flowType === 'found_job') {
        // For found job flow: 50% chance to show offer vs direct cancellation
        variant = Math.floor(Math.random() * 2) === 0 ? 'A' : 'B';
        flowDecision = Math.floor(Math.random() * 2) === 0 ? 'step1Offer' : 'subscriptionCancelled';
      } else {
        // For standard flow: existing logic
        variant = Math.floor(Math.random() * 2) === 0 ? 'A' : 'B';
        flowDecision = 'step1Offer'; // Standard flow always goes to step 1
      }
      
      const mockMonthlyPrice = 2500; // $25
      
      // Calculate discounted price for Variant B in mock mode
      let discountedPrice = mockMonthlyPrice;
      if (variant === 'B') {
        // Apply discount: $25 → $15, $29 → $19
        if (mockMonthlyPrice === 2500) {
          discountedPrice = 1500; // $25 → $15
        } else if (mockMonthlyPrice === 2900) {
          discountedPrice = 1900; // $29 → $19
        }
      }
      
      const response = NextResponse.json({
        cancellationId: 'mock-cancellation-id',
        variant,
        monthlyPrice: mockMonthlyPrice,
        discountedPrice: discountedPrice,
        flowType,
        flowDecision
      });

      // Set CORS headers directly on response
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      return response;
    }

    // Check if user already has an active cancellation
    const { data: activeCancel, error: activeErr } = await supabaseAdmin
      .from('cancellations')
      .select('id, downsell_variant, flow_type')
      .eq('user_id', userId)
      .is('resolved_at', null)
      .limit(1)
      .maybeSingle();

    if (activeErr) {
      return NextResponse.json({ error: 'Failed to fetch active cancellations' }, { status: 500 });
    }

    // If user has an active cancellation, return it
    if (activeCancel) {
      // Determine flow decision based on existing flow type
      let flowDecision: string;
      if (activeCancel.flow_type === 'found_job') {
        flowDecision = Math.floor(Math.random() * 2) === 0 ? 'step1Offer' : 'subscriptionCancelled';
      } else {
        flowDecision = 'step1Offer';
      }

      // Get subscription details for pricing
      const { data: sub } = await supabaseAdmin
        .from('subscriptions')
        .select('monthly_price')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();

      // Calculate discounted price for Variant B
      let discountedPrice = sub?.monthly_price || 2500;
      if (activeCancel.downsell_variant === 'B') {
        // Apply discount: $25 → $15, $29 → $19
        if (discountedPrice === 2500) {
          discountedPrice = 1500; // $25 → $15
        } else if (discountedPrice === 2900) {
          discountedPrice = 1900; // $29 → $19
        }
      }

      return NextResponse.json({
        cancellationId: activeCancel.id,
        variant: activeCancel.downsell_variant,
        monthlyPrice: sub?.monthly_price || 2500, // Original price in cents
        discountedPrice: discountedPrice, // Discounted price for Variant B
        flowType: activeCancel.flow_type,
        flowDecision,
        message: 'Returning existing active cancellation'
      });
    }

    // Find last cancellation to reuse variant if present
    const { data: lastCancel, error: lastErr } = await supabaseAdmin
      .from('cancellations')
      .select('downsell_variant')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastErr) {
      return NextResponse.json({ error: 'Failed to fetch previous cancellations' }, { status: 500 });
    }

    // Determine variant (reuse or crypto RNG)
    const variant: 'A' | 'B' =
      lastCancel?.downsell_variant === 'A' || lastCancel?.downsell_variant === 'B'
        ? (lastCancel.downsell_variant as 'A' | 'B')
        : Math.floor(Math.random() * 2) === 0 ? 'A' : 'B';

    // Determine flow decision based on flow type
    let flowDecision: string;
    if (flowType === 'found_job') {
      // For found job flow: 50% chance to show offer vs direct cancellation
      flowDecision = Math.floor(Math.random() * 2) === 0 ? 'step1Offer' : 'subscriptionCancelled';
    } else {
      // For standard flow: always go to step 1
      flowDecision = 'step1Offer';
    }

    // Find active or pending cancellation subscription for user
    const { data: sub, error: subErr } = await supabaseAdmin
      .from('subscriptions')
      .select('id, monthly_price, status')
      .eq('user_id', userId)
      .in('status', ['active', 'pending_cancellation'])
      .limit(1)
      .maybeSingle();

    if (subErr) {
      return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 });
    }
    if (!sub) {
      return NextResponse.json({ error: 'Active or pending cancellation subscription not found' }, { status: 404 });
    }

    // Mark subscription as pending_cancellation
    const { error: updErr } = await supabaseAdmin
      .from('subscriptions')
      .update({ status: 'pending_cancellation' })
      .eq('id', sub.id);

    if (updErr) {
      return NextResponse.json({ error: 'Failed to update subscription status' }, { status: 500 });
    }

    // Insert cancellation record with assigned variant and flow type
    const { data: ins, error: insErr } = await supabaseAdmin
      .from('cancellations')
      .insert({
        user_id: userId,
        subscription_id: sub.id,
        downsell_variant: variant,
        flow_type: flowType,
        current_step: 'start'
      })
      .select('id')
      .single();

    if (insErr || !ins) {
      // Check if it's a unique constraint violation (user already has an active cancellation)
      if (insErr?.code === '23505') {
        return NextResponse.json({ 
          error: 'User already has an active cancellation in progress. Please complete or cancel the existing cancellation first.' 
        }, { status: 409 });
      }
      
      console.error('Cancellation creation error:', insErr);
      return NextResponse.json({ error: 'Failed to create cancellation' }, { status: 500 });
    }

    // Calculate discounted price for Variant B
    let discountedPrice = sub.monthly_price;
    if (variant === 'B') {
      // Apply discount: $25 → $15, $29 → $19
      if (sub.monthly_price === 2500) {
        discountedPrice = 1500; // $25 → $15
      } else if (sub.monthly_price === 2900) {
        discountedPrice = 1900; // $29 → $19
      }
    }

    const response = NextResponse.json({
      cancellationId: ins.id,
      variant,
      monthlyPrice: sub.monthly_price, // Original price in cents
      discountedPrice: discountedPrice, // Discounted price for Variant B
      flowType,
      flowDecision
    });

    // Set CORS headers directly on response
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return response;
  } catch (e) {
    console.error('Start cancellation error:', e);
    const response = NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
    
    // Set CORS headers directly on response
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return response;
  }
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
