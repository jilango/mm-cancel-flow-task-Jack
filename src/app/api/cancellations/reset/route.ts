import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { userId, reason = 'modal_reset' } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Check if there's an active cancellation for this user
    const { data: existingCancellation, error: fetchError } = await supabase
      .from('cancellations')
      .select('*')
      .eq('user_id', userId)
      .is('resolved_at', null)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      return NextResponse.json({ error: 'Failed to fetch cancellation' }, { status: 500 });
    }

    if (existingCancellation) {
      // Mark the existing cancellation as resolved with reset reason
      const { error: updateError } = await supabase
        .from('cancellations')
        .update({
          resolved_at: new Date().toISOString(),
          resolution_reason: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingCancellation.id);

      if (updateError) {
        return NextResponse.json({ error: 'Failed to reset cancellation' }, { status: 500 });
      }
    }

    // Create a new cancellation record for the reset action
    const { data: newCancellation, error: createError } = await supabase
      .from('cancellations')
      .insert({
        user_id: userId,
        downsell_variant: 'A', // Default variant for reset
        flow_type: 'standard', // Standard flow type for reset
        reason: reason,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      return NextResponse.json({ error: 'Failed to create reset record' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Modal state reset successfully',
      cancellationId: newCancellation.id
    });

  } catch (error) {
    console.error('Error resetting modal state:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
