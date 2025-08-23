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
      // Mark the existing cancellation as resolved
      const { error: updateError } = await supabase
        .from('cancellations')
        .update({
          resolved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existingCancellation.id);

      if (updateError) {
        return NextResponse.json({ error: 'Failed to reset cancellation' }, { status: 500 });
      }
    }

    // Don't create a new cancellation record - just resolve existing ones
    // This allows the subscription to return to 'active' status

    return NextResponse.json({
      success: true,
      message: 'Modal state reset successfully',
      cancellationId: existingCancellation?.id || null
    });

  } catch (error) {
    console.error('Error resetting modal state:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
