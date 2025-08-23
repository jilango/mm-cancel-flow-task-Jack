import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

const UpdateSchema = z.object({
  reason: z.string().max(500, 'Reason too long').optional().nullable(),
  acceptedDownsell: z.boolean().optional().nullable(),
  details: z.record(z.any()).optional().nullable(),
  flowType: z.enum(['standard', 'found_job', 'offer_accepted']).optional(),
  foundJobData: z.object({
    viaMigrateMate: z.enum(['Yes', 'No']).optional(),
    rolesApplied: z.enum(['0', '1-5', '6-20', '20+']).optional(),
    companiesEmailed: z.enum(['0', '1-5', '6-20', '20+']).optional(),
    companiesInterviewed: z.enum(['0', '1-2', '3-5', '5+']).optional(),
    feedback: z.string().min(25).max(1000).optional(),
    visaLawyer: z.enum(['Yes', 'No']).optional(),
    visaType: z.string().max(100).optional()
  }).optional()
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Missing cancellation ID' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const validation = UpdateSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid request data', 
        details: validation.error.errors 
      }, { status: 400 });
    }

    const { reason, acceptedDownsell, details, flowType, foundJobData } = validation.data;

    console.log('Received update request:', { id, reason, acceptedDownsell, details, flowType, foundJobData });

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Update the cancellation record
    const updateData: any = {};
    
    if (reason !== undefined) updateData.reason = reason;
    if (acceptedDownsell !== undefined) updateData.accepted_downsell = acceptedDownsell;
    if (details !== undefined) updateData.details = details;
    if (flowType !== undefined) updateData.flow_type = flowType;
    
    // If this is an offer acceptance, mark as resolved
    if (flowType === 'offer_accepted') {
      updateData.resolved_at = new Date().toISOString();
    }

    // Update the cancellation
    const { error: updateError } = await supabase
      .from('cancellations')
      .update(updateData)
      .eq('id', id);

    if (updateError) {
      console.error('Failed to update cancellation:', updateError);
      console.error('Update data:', updateData);
      console.error('Cancellation ID:', id);
      return NextResponse.json({ error: 'Failed to update cancellation', details: updateError.message }, { status: 500 });
    }

    // If this is an offer acceptance, also update the subscription status to active
    if (flowType === 'offer_accepted') {
      // Get the cancellation to find the subscription_id
      const { data: cancellation, error: fetchError } = await supabase
        .from('cancellations')
        .select('subscription_id')
        .eq('id', id)
        .single();

      if (fetchError) {
        console.error('Failed to fetch cancellation for subscription update:', fetchError);
        return NextResponse.json({ error: 'Failed to fetch cancellation', details: fetchError.message }, { status: 500 });
      }

      if (cancellation?.subscription_id) {
        const { error: subscriptionError } = await supabase
          .from('subscriptions')
          .update({ status: 'active' })
          .eq('id', cancellation.subscription_id);

        if (subscriptionError) {
          console.error('Failed to update subscription status:', subscriptionError);
          return NextResponse.json({ error: 'Failed to update subscription', details: subscriptionError.message }, { status: 500 });
        }
      }
    }

    const response = NextResponse.json({ ok: true });
    
    // Set CORS headers directly on response
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return response;
    
  } catch (e) {
    console.error('Update cancellation error:', e);
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
