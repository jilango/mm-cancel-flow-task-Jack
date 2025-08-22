import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';

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

    // For development/testing without database
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      // Mock response for testing
      return NextResponse.json({ ok: true });
    }

    const updates: Record<string, unknown> = {};

    if (validation.data.reason !== undefined) {
      updates.reason = validation.data.reason;
    }
    if (validation.data.acceptedDownsell !== undefined) {
      updates.accepted_downsell = validation.data.acceptedDownsell;
    }
    if (validation.data.details && typeof validation.data.details === 'object') {
      updates.details = validation.data.details;
    }
    if (validation.data.flowType) {
      updates.flow_type = validation.data.flowType;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Check if cancellation exists and get subscription_id
    const { data: existing, error: getErr } = await supabaseAdmin
      .from('cancellations')
      .select('id, subscription_id, resolved_at, flow_type')
      .eq('id', id)
      .single();

    if (getErr || !existing) {
      return NextResponse.json({ error: 'Cancellation not found' }, { status: 404 });
    }

    if (existing.resolved_at) {
      return NextResponse.json({ error: 'Cancellation already resolved' }, { status: 409 });
    }

    // Determine if this update closes the cancellation
    const isClosing = 
      updates.accepted_downsell === true || 
      (typeof updates.reason === 'string' && updates.reason.trim() !== '') ||
      updates.flow_type === 'found_job';

    if (isClosing) {
      updates.resolved_at = new Date().toISOString();
    }

    // Update cancellation record
    const { error: updErr } = await supabaseAdmin
      .from('cancellations')
      .update(updates)
      .eq('id', id);

    if (updErr) {
      return NextResponse.json({ error: 'Failed to update cancellation' }, { status: 500 });
    }

    // If downsell accepted, restore subscription to active
    if (updates.accepted_downsell === true) {
      const { error: subErr } = await supabaseAdmin
        .from('subscriptions')
        .update({ status: 'active' })
        .eq('id', existing.subscription_id);

      if (subErr) {
        return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
      }
    }

    // If this is a found job cancellation, handle subscription cancellation
    if (updates.flow_type === 'found_job') {
      const { error: subErr } = await supabaseAdmin
        .from('subscriptions')
        .update({ status: 'cancelled' })
        .eq('id', existing.subscription_id);

      if (subErr) {
        return NextResponse.json({ error: 'Failed to cancel subscription' }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Update cancellation error:', e);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
