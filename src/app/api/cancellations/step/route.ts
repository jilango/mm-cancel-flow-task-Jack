import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';

const StepUpdateSchema = z.object({
  cancellationId: z.string().uuid('Invalid cancellation ID format'),
  currentStep: z.enum([
    'start', 
    'step1Offer', 
    'step2OfferVariantA', 
    'offer', 
    'reason', 
    'foundDetails', 
    'subscriptionCancelled', 
    'offerAccepted', 
    'foundJobStep1', 
    'foundJobStep2', 
    'foundJobStep3VariantA', 
    'foundJobStep3VariantB', 
    'foundJobCancelledNoHelp', 
    'foundJobCancelledWithHelp', 
    'downsell'
  ])
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
    const validation = StepUpdateSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid request data', 
        details: validation.error.errors 
      }, { status: 400 });
    }

    const { cancellationId, currentStep } = validation.data;

    // For development/testing without database
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('mock')) {
      return NextResponse.json({
        success: true,
        message: 'Step updated (mock mode)',
        currentStep
      });
    }

    // Update the current step in the cancellation record
    const { error: updateError } = await supabaseAdmin
      .from('cancellations')
      .update({ current_step: currentStep })
      .eq('id', cancellationId)
      .is('resolved_at', null);

    if (updateError) {
      console.error('Failed to update current step:', updateError);
      return NextResponse.json({ error: 'Failed to update current step' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Step updated successfully',
      currentStep
    });

  } catch (error) {
    console.error('Step update error:', error);
    return NextResponse.json(
      { error: 'Failed to update step' },
      { status: 500 }
    );
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
