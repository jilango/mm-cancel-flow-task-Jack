# Setup Guide

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Optional: Your site URL for CSRF protection
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Database Setup

1. Install Supabase CLI: `brew install supabase/tap/supabase`
2. Initialize Supabase: `supabase init`
3. Start local Supabase: `supabase start`
4. Run the seed script: `npm run db:setup`

## Testing the Implementation

1. Start the development server: `npm run dev`
2. Open http://localhost:3000
3. Click "Manage Subscription" to expand the section
4. Click "Cancel Migrate Mate" to start the flow
5. Test both variants:
   - Variant A: Skips the offer and goes directly to reason selection
   - Variant B: Shows the $10 off offer first

## Features Implemented

✅ **Deterministic A/B Testing**: 50/50 split, persists variant per user
✅ **Progressive Flow**: Matches Figma design with all steps
✅ **Data Persistence**: Saves cancellation data to database
✅ **Security**: Input validation, CSRF protection, RLS policies
✅ **Error Handling**: Inline error display, proper loading states
✅ **Responsive Design**: Works on mobile and desktop

## API Endpoints

- `POST /api/cancellations/start` - Start cancellation flow
- `PATCH /api/cancellations/[id]` - Update cancellation with reason/acceptance
