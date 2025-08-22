import { NextResponse } from 'next/server';
import { z } from 'zod';

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

    // For development/testing without database - always return success
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
  if (visaLawyer === 'Yes') {
    return 'foundJobCancelledNoHelp';
  } else {
    return 'foundJobCancelledWithHelp';
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

