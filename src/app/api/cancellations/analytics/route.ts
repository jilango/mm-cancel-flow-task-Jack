import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { calculateCancellationAnalytics } from '@/lib/utils/cancellation';
import { CancellationErrorCode } from '@/lib/types/cancellation';

export async function GET(req: Request) {
  try {
    // Basic CSRF hardening
    const site = process.env.NEXT_PUBLIC_SITE_URL;
    if (site) {
      const origin = req.headers.get('origin') ?? '';
      if (!origin.startsWith(site) && !origin.startsWith('http://localhost:3000')) {
        return NextResponse.json({ error: 'Bad origin' }, { status: 403 });
      }
    }

    // For development/testing without database
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      // Mock analytics data for testing
      const mockAnalytics = {
        totalCancellations: 150,
        byFlowType: {
          standard: 80,
          found_job: 45,
          offer_accepted: 25
        },
        byVariant: {
          A: 75,
          B: 75
        },
        foundJobStats: {
          total: 45,
          viaMigrateMate: { Yes: 28, No: 17 },
          visaLawyer: { Yes: 32, No: 13 },
          averageFeedbackLength: 67
        },
        conversionRates: {
          offerAccepted: 0.167, // 25/150
          directCancellation: 0.833, // 125/150
          foundJobCancellation: 0.3 // 45/150
        },
        recentTrends: {
          last7Days: 23,
          last30Days: 89,
          last90Days: 150
        }
      };

      return NextResponse.json({
        success: true,
        data: mockAnalytics
      });
    }

    // Fetch all cancellations
    const { data: cancellations, error: cancelErr } = await supabaseAdmin
      .from('cancellations')
      .select('*')
      .order('created_at', { ascending: false });

    if (cancelErr) {
      return NextResponse.json({ 
        success: false,
        error: {
          code: CancellationErrorCode.DATABASE_ERROR,
          message: 'Failed to fetch cancellations'
        }
      }, { status: 500 });
    }

    // Fetch all found job cancellations
    const { data: foundJobCancellations, error: fjcErr } = await supabaseAdmin
      .from('found_job_cancellations')
      .select('*')
      .order('created_at', { ascending: false });

    if (fjcErr) {
      return NextResponse.json({ 
        success: false,
        error: {
          code: CancellationErrorCode.DATABASE_ERROR,
          message: 'Failed to fetch found job cancellations'
        }
      }, { status: 500 });
    }

    // Calculate analytics
    const analytics = calculateCancellationAnalytics(cancellations || [], foundJobCancellations || []);

    // Calculate recent trends
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const last90Days = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const recentTrends = {
      last7Days: (cancellations || []).filter(c => new Date(c.created_at) >= last7Days).length,
      last30Days: (cancellations || []).filter(c => new Date(c.created_at) >= last30Days).length,
      last90Days: (cancellations || []).filter(c => new Date(c.created_at) >= last90Days).length
    };

    // Add recent trends to analytics
    const analyticsWithTrends = {
      ...analytics,
      recentTrends
    };

    return NextResponse.json({
      success: true,
      data: analyticsWithTrends
    });

  } catch (e) {
    console.error('Analytics error:', e);
    return NextResponse.json({ 
      success: false,
      error: {
        code: CancellationErrorCode.UNEXPECTED_ERROR,
        message: 'Unexpected error occurred'
      }
    }, { status: 500 });
  }
}
