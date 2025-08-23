import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get the current unresolved cancellation for the user
    const { data: cancellation, error: cancellationError } = await supabase
      .from('cancellations')
      .select(`
        *,
        found_job_cancellations(*)
      `)
      .eq('user_id', userId)
      .is('resolved_at', null)
      .single();

    if (cancellationError) {
      if (cancellationError.code === 'PGRST116') {
        // No unresolved cancellation found
        console.log('No active cancellation found for user:', userId);
        return NextResponse.json({ 
          hasActiveCancellation: false,
          currentStep: 'start',
          message: 'No active cancellation found'
        });
      }
      console.error('Cancellation fetch error:', cancellationError);
      throw cancellationError;
    }

    // Determine the current step based on the cancellation data
    let currentStep = cancellation.current_step || 'start';
    
    // If we have found_job_cancellations data, we're in the found job flow
    if (cancellation.found_job_cancellations && cancellation.found_job_cancellations.length > 0) {
      const foundJobData = cancellation.found_job_cancellations[0];
      
      // Determine which step we're on based on the data
      if (!foundJobData.via_migrate_mate) {
        currentStep = 'foundJobStep1';
      } else if (!foundJobData.feedback) {
        currentStep = 'foundJobStep2';
      } else if (!foundJobData.visa_lawyer) {
        currentStep = 'foundJobStep3VariantA';
      } else if (!foundJobData.visa_type) {
        currentStep = 'foundJobStep3VariantA';
      } else {
        currentStep = 'foundJobCancelledNoHelp';
      }
    }

    return NextResponse.json({
      hasActiveCancellation: true,
      currentStep,
      cancellationId: cancellation.id,
      downsellVariant: cancellation.downsell_variant,
      flowType: cancellation.flow_type,
      reason: cancellation.reason,
      acceptedDownsell: cancellation.accepted_downsell,
      details: cancellation.details,
      foundJobData: cancellation.found_job_cancellations?.[0] || null
    });

  } catch (error) {
    console.error('Error fetching cancellation state:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cancellation state' },
      { status: 500 }
    );
  }
}
