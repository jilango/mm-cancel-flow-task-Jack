import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';

// Validation schema for found job completion
const FoundJobCompletionSchema = z.object({
  cancellationId: z.string().uuid('Invalid cancellation ID format'),
  foundJobData: z.object({
    viaMigrateMate: z.enum(['Yes', 'No'], {
      errorMap: () => ({ message: 'viaMigrateMate must be either "Yes" or "No"' })
    }),
    rolesApplied: z.enum(['0', '1-5', '6-20', '20+'], {
      errorMap: () => ({ message: 'rolesApplied must be one of: 0, 1-5, 6-20, 20+' })
    }),
    companiesEmailed: z.enum(['0', '1-5', '6-20', '20+'], {
      errorMap: () => ({ message: 'companiesEmailed must be one of: 0, 1-5, 6-20, 20+' })
    }),
    companiesInterviewed: z.enum(['0', '1-2', '3-5', '5+'], {
      errorMap: () => ({ message: 'companiesInterviewed must be one of: 0, 1-2, 3-5, 5+' })
    }),
    feedback: z.string().min(25, 'Feedback must be at least 25 characters').max(1000, 'Feedback too long'),
    visaLawyer: z.enum(['Yes', 'No'], {
      errorMap: () => ({ message: 'visaLawyer must be either "Yes" or "No"' })
    }),
    visaType: z.string().max(100, 'Visa type too long').optional()
  }).refine((data) => {
    // If visa lawyer is "No", visa type is required
    if (data.visaLawyer === 'No' && (!data.visaType || data.visaType.trim() === '')) {
      return false;
    }
    return true;
  }, {
    message: 'Visa type is required when visa lawyer is "No"',
    path: ['visaType']
  })
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
    const validation = FoundJobCompletionSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({ 
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data', 
          details: validation.error.errors 
        }
      }, { status: 400 });
    }

    const { cancellationId, foundJobData } = validation.data;

    // For development/testing without database
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      // Mock response for testing
      const finalStep = determineFinalStep(foundJobData.viaMigrateMate, foundJobData.visaLawyer);
      
      return NextResponse.json({
        success: true,
        data: {
          cancellationId,
          flowType: 'found_job',
          finalStep,
          nextActions: getNextActions(finalStep)
        }
      });
    }

    // Verify cancellation exists and is not resolved
    const { data: cancellation, error: cancelErr } = await supabaseAdmin
      .from('cancellations')
      .select('id, user_id, subscription_id, resolved_at, flow_type')
      .eq('id', cancellationId)
      .single();

    if (cancelErr || !cancellation) {
      return NextResponse.json({ 
        success: false,
        error: {
          code: 'CANCELLATION_NOT_FOUND',
          message: 'Cancellation not found'
        }
      }, { status: 404 });
    }

    if (cancellation.resolved_at) {
      return NextResponse.json({ 
        success: false,
        error: {
          code: 'CANCELLATION_ALREADY_RESOLVED',
          message: 'Cancellation already resolved'
        }
      }, { status: 409 });
    }

    // Begin transaction
    const { error: transactionError } = await supabaseAdmin.rpc('begin_transaction');
    if (transactionError) {
      return NextResponse.json({ 
        success: false,
        error: {
          code: 'TRANSACTION_ERROR',
          message: 'Failed to begin transaction'
        }
      }, { status: 500 });
    }

    try {
      // Insert found job cancellation data
      const { error: insertErr } = await supabaseAdmin
        .from('found_job_cancellations')
        .insert({
          cancellation_id: cancellationId,
          via_migrate_mate: foundJobData.viaMigrateMate,
          roles_applied: foundJobData.rolesApplied,
          companies_emailed: foundJobData.companiesEmailed,
          companies_interviewed: foundJobData.companiesInterviewed,
          feedback: foundJobData.feedback,
          visa_lawyer: foundJobData.visaLawyer,
          visa_type: foundJobData.visaType || null
        });

      if (insertErr) {
        throw new Error(`Failed to insert found job data: ${insertErr.message}`);
      }

      // Update cancellation record
      const { error: updateErr } = await supabaseAdmin
        .from('cancellations')
        .update({ 
          flow_type: 'found_job',
          resolved_at: new Date().toISOString()
        })
        .eq('id', cancellationId);

      if (updateErr) {
        throw new Error(`Failed to update cancellation: ${updateErr.message}`);
      }

      // Cancel the subscription
      const { error: subErr } = await supabaseAdmin
        .from('subscriptions')
        .update({ status: 'cancelled' })
        .eq('id', cancellation.subscription_id);

      if (subErr) {
        throw new Error(`Failed to cancel subscription: ${subErr.message}`);
      }

      // Commit transaction
      const { error: commitErr } = await supabaseAdmin.rpc('commit_transaction');
      if (commitErr) {
        throw new Error(`Failed to commit transaction: ${commitErr.message}`);
      }

      // Determine final step and next actions
      const finalStep = determineFinalStep(foundJobData.viaMigrateMate, foundJobData.visaLawyer);
      const nextActions = getNextActions(finalStep);

      return NextResponse.json({
        success: true,
        data: {
          cancellationId,
          flowType: 'found_job',
          finalStep,
          nextActions
        }
      });

    } catch (transactionError) {
      // Rollback transaction
      await supabaseAdmin.rpc('rollback_transaction');
      throw transactionError;
    }

  } catch (e) {
    console.error('Found job completion error:', e);
    return NextResponse.json({ 
      success: false,
      error: {
        code: 'UNEXPECTED_ERROR',
        message: 'Unexpected error occurred'
      }
    }, { status: 500 });
  }
}

// Helper function to determine final step based on user responses
function determineFinalStep(viaMigrateMate: string, visaLawyer: string): string {
  if (visaLawyer === 'Yes') {
    return 'foundJobCancelledNoHelp';
  } else {
    return 'foundJobCancelledWithHelp';
  }
}

// Helper function to get next actions based on final step
function getNextActions(finalStep: string): string[] {
  switch (finalStep) {
    case 'foundJobCancelledNoHelp':
      return ['Close modal', 'Send confirmation email'];
    case 'foundJobCancelledWithHelp':
      return ['Close modal', 'Send confirmation email', 'Schedule visa consultation call'];
    default:
      return ['Close modal'];
  }
}
