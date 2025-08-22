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
    const validation = FoundJobCompletionSchema.safeParse(body);
    
    if (!validation.success) {
      const response = NextResponse.json({ 
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data', 
          details: validation.error.errors 
        }
      }, { status: 400 });
      
      // Set CORS headers directly on response
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      return response;
    }

    const { cancellationId, foundJobData } = validation.data;

    // For development/testing without database
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      // Mock response for testing
      const finalStep = determineFinalStep(foundJobData.viaMigrateMate, foundJobData.visaLawyer);
      
      const response = NextResponse.json({
        success: true,
        data: {
          cancellationId,
          flowType: 'found_job',
          finalStep,
          nextActions: getNextActions(finalStep)
        }
      });
      
      // Set CORS headers directly on response
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      return response;
    }

    // Verify cancellation exists and is not resolved
    const { data: cancellation, error: cancelErr } = await supabaseAdmin
      .from('cancellations')
      .select('id, user_id, subscription_id, resolved_at, flow_type')
      .eq('id', cancellationId)
      .single();

    if (cancelErr || !cancellation) {
      const response = NextResponse.json({ 
        success: false,
        error: {
          code: 'CANCELLATION_NOT_FOUND',
          message: 'Cancellation not found'
        }
      }, { status: 404 });
      
      // Set CORS headers directly on response
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      return response;
    }

    if (cancellation.resolved_at) {
      const response = NextResponse.json({ 
        success: false,
        error: {
          code: 'CANCELLATION_ALREADY_RESOLVED',
          message: 'Cancellation already resolved'
        }
      }, { status: 409 });
      
      // Set CORS headers directly on response
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      return response;
    }

    // Begin transaction
    const { error: transactionError } = await supabaseAdmin.rpc('begin_transaction');
    if (transactionError) {
      const response = NextResponse.json({ 
        success: false,
        error: {
          code: 'TRANSACTION_ERROR',
          message: 'Failed to begin transaction'
        }
      }, { status: 500 });
      
      // Set CORS headers directly on response
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      return response;
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
          visa_type: foundJobData.visaType
        });

      if (insertErr) {
        await supabaseAdmin.rpc('rollback_transaction');
        const response = NextResponse.json({ 
          success: false,
          error: {
            code: 'INSERT_ERROR',
            message: 'Failed to insert found job data'
          }
        }, { status: 500 });
        
        // Set CORS headers directly on response
        response.headers.set('Access-Control-Allow-Origin', '*');
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        
        return response;
      }

      // Update cancellation record
      const { error: updateErr } = await supabaseAdmin
        .from('cancellations')
        .update({ 
          resolved_at: new Date().toISOString(),
          flow_type: 'found_job'
        })
        .eq('id', cancellationId);

      if (updateErr) {
        await supabaseAdmin.rpc('rollback_transaction');
        const response = NextResponse.json({ 
          success: false,
          error: {
            code: 'UPDATE_ERROR',
            message: 'Failed to update cancellation'
          }
        }, { status: 500 });
        
        // Set CORS headers directly on response
        response.headers.set('Access-Control-Allow-Origin', '*');
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        
        return response;
      }

      // Cancel subscription
      const { error: subErr } = await supabaseAdmin
        .from('subscriptions')
        .update({ status: 'cancelled' })
        .eq('id', cancellation.subscription_id);

      if (subErr) {
        await supabaseAdmin.rpc('rollback_transaction');
        const response = NextResponse.json({ 
          success: false,
          error: {
            code: 'SUBSCRIPTION_ERROR',
            message: 'Failed to cancel subscription'
          }
        }, { status: 500 });
        
        // Set CORS headers directly on response
        response.headers.set('Access-Control-Allow-Origin', '*');
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        
        return response;
      }

      // Commit transaction
      const { error: commitErr } = await supabaseAdmin.rpc('commit_transaction');
      if (commitErr) {
        await supabaseAdmin.rpc('rollback_transaction');
        const response = NextResponse.json({ 
          success: false,
          error: {
            code: 'COMMIT_ERROR',
            message: 'Failed to commit transaction'
          }
        }, { status: 500 });
        
        // Set CORS headers directly on response
        response.headers.set('Access-Control-Allow-Origin', '*');
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        
        return response;
      }

      // Determine final step and next actions
      const finalStep = determineFinalStep(foundJobData.viaMigrateMate, foundJobData.visaLawyer);
      const nextActions = getNextActions(finalStep);

      const response = NextResponse.json({
        success: true,
        data: {
          cancellationId,
          flowType: 'found_job',
          finalStep,
          nextActions
        }
      });
      
      // Set CORS headers directly on response
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      return response;

    } catch (error) {
      await supabaseAdmin.rpc('rollback_transaction');
      throw error;
    }

  } catch (error) {
    console.error('Found job completion error:', error);
    const response = NextResponse.json({ 
      success: false,
      error: {
        code: 'UNEXPECTED_ERROR',
        message: 'Unexpected error occurred'
      }
    }, { status: 500 });
    
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

// Helper functions for determining final step and next actions
function determineFinalStep(viaMigrateMate: string, visaLawyer: string): string {
  if (viaMigrateMate === 'Yes') {
    if (visaLawyer === 'Yes') {
      return 'foundJobCancelledWithHelp';
    } else {
      return 'foundJobCancelledNoHelp';
    }
  } else {
    if (visaLawyer === 'Yes') {
      return 'foundJobCancelledWithHelp';
    } else {
      return 'foundJobCancelledNoHelp';
    }
  }
}

function getNextActions(finalStep: string): string[] {
  switch (finalStep) {
    case 'foundJobCancelledWithHelp':
      return ['Reactivate subscription', 'Contact support', 'Update preferences'];
    case 'foundJobCancelledNoHelp':
      return ['Reactivate subscription', 'Contact support', 'Update preferences'];
    default:
      return ['Contact support'];
  }
}

