import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { calculateCancellationAnalytics } from '@/lib/utils/cancellation';
import { CancellationErrorCode } from '@/lib/types/cancellation';

export async function GET(req: Request) {
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

      const response = NextResponse.json({
        success: true,
        data: mockAnalytics
      });
      
      // Set CORS headers directly on response
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      return response;
    }

    // Fetch all cancellations
    const { data: cancellations, error: cancelErr } = await supabaseAdmin
      .from('cancellations')
      .select('*')
      .order('created_at', { ascending: false });

    if (cancelErr) {
      const response = NextResponse.json({ 
        success: false,
        error: {
          code: CancellationErrorCode.DATABASE_ERROR,
          message: 'Failed to fetch cancellations'
        }
      }, { status: 500 });
      
      // Set CORS headers directly on response
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      return response;
    }

    // Fetch all found job cancellations
    const { data: foundJobCancellations, error: fjcErr } = await supabaseAdmin
      .from('found_job_cancellations')
      .select('*')
      .order('created_at', { ascending: false });

    if (fjcErr) {
      const response = NextResponse.json({ 
        success: false,
        error: {
          code: CancellationErrorCode.DATABASE_ERROR,
          message: 'Failed to fetch found job cancellations'
        }
      }, { status: 500 });
      
      // Set CORS headers directly on response
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      return response;
    }

    // Calculate analytics
    const analytics = calculateCancellationAnalytics(cancellations || [], foundJobCancellations || []);

    // Get recent trends (last 7, 30, 90 days)
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const last90Days = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const recentTrends = {
      last7Days: (cancellations || []).filter(c => new Date(c.created_at) >= last7Days).length,
      last30Days: (cancellations || []).filter(c => new Date(c.created_at) >= last30Days).length,
      last90Days: (cancellations || []).filter(c => new Date(c.created_at) >= last90Days).length
    };

    const response = NextResponse.json({
      success: true,
      data: {
        ...analytics,
        recentTrends
      }
    });
    
    // Set CORS headers directly on response
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return response;

  } catch (error) {
    console.error('Analytics error:', error);
    const response = NextResponse.json({ 
      success: false,
      error: {
        code: CancellationErrorCode.UNEXPECTED_ERROR,
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
