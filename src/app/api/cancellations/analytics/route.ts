import { NextResponse } from 'next/server';

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

    // For development/testing without database - always return mock data
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

  } catch (error) {
    console.error('Analytics error:', error);
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
