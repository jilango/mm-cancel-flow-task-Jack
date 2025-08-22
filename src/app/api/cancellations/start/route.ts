import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { randomInt } from 'crypto';

const StartSchema = z.object({
  userId: z.string().uuid('Invalid user ID format')
});

export async function POST(req: Request) {
  try {
    // Basic CSRF hardening
    const site = process.env.NEXT_PUBLIC_SITE_URL;
    if (site) {
      const origin = req.headers.get('origin') ?? '';
      if (!origin.startsWith(site) && !origin.startsWith('http://localhost:3000')) {
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

    const { userId } = validation.data;

    // For development/testing without database
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      // Mock response for testing
      const variant: 'A' | 'B' = randomInt(0, 2) === 0 ? 'A' : 'B';
      const mockMonthlyPrice = 2500; // $25
      
      return NextResponse.json({
        cancellationId: 'mock-cancellation-id',
        variant,
        monthlyPrice: mockMonthlyPrice,
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
        : randomInt(0, 2) === 0 ? 'A' : 'B';

    // Find active subscription for user
    const { data: sub, error: subErr } = await supabaseAdmin
      .from('subscriptions')
      .select('id, monthly_price, status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    if (subErr) {
      return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 });
    }
    if (!sub) {
      return NextResponse.json({ error: 'Active subscription not found' }, { status: 404 });
    }

    // Mark subscription as pending_cancellation
    const { error: updErr } = await supabaseAdmin
      .from('subscriptions')
      .update({ status: 'pending_cancellation' })
      .eq('id', sub.id);

    if (updErr) {
      return NextResponse.json({ error: 'Failed to update subscription status' }, { status: 500 });
    }

    // Insert cancellation record with assigned variant
    const { data: ins, error: insErr } = await supabaseAdmin
      .from('cancellations')
      .insert({
        user_id: userId,
        subscription_id: sub.id,
        downsell_variant: variant,
      })
      .select('id')
      .single();

    if (insErr || !ins) {
      return NextResponse.json({ error: 'Failed to create cancellation' }, { status: 500 });
    }

    return NextResponse.json({
      cancellationId: ins.id,
      variant,
      monthlyPrice: sub.monthly_price, // cents
    });
  } catch (e) {
    console.error('Start cancellation error:', e);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
