# Backend Implementation for Cancellation Flow

This document outlines the complete backend implementation for the subscription cancellation flow, including the new "found job" flow and A/B testing logic.

## 🏗️ Architecture Overview

The backend is built using Next.js API routes with the following key components:

- **API Endpoints**: RESTful APIs for cancellation management
- **Database Schema**: PostgreSQL tables with proper relationships and constraints
- **Business Logic**: A/B testing, flow routing, and validation
- **Data Processing**: Type-safe interfaces and utility functions
- **Analytics**: Business intelligence and reporting capabilities

## 📊 Database Schema

### Tables

#### 1. `cancellations` (Updated)
```sql
CREATE TABLE cancellations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
  downsell_variant TEXT NOT NULL CHECK (downsell_variant IN ('A', 'B')),
  flow_type TEXT NOT NULL DEFAULT 'standard' CHECK (flow_type IN ('standard', 'found_job', 'offer_accepted')),
  reason TEXT,
  accepted_downsell BOOLEAN DEFAULT FALSE,
  details JSONB DEFAULT '{}'::jsonb,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 2. `found_job_cancellations` (New)
```sql
CREATE TABLE found_job_cancellations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cancellation_id UUID REFERENCES cancellations(id) ON DELETE CASCADE,
  via_migrate_mate VARCHAR(3) NOT NULL CHECK (via_migrate_mate IN ('Yes', 'No')),
  roles_applied VARCHAR(10) NOT NULL CHECK (roles_applied IN ('0', '1-5', '6-20', '20+')),
  companies_emailed VARCHAR(10) NOT NULL CHECK (companies_emailed IN ('0', '1-5', '6-20', '20+')),
  companies_interviewed VARCHAR(10) NOT NULL CHECK (companies_interviewed IN ('0', '1-2', '3-5', '5+')),
  feedback TEXT NOT NULL CHECK (length(feedback) >= 25),
  visa_lawyer VARCHAR(3) NOT NULL CHECK (visa_lawyer IN ('Yes', 'No')),
  visa_type VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Indexes
- `uniq_open_cancellation`: Ensures one open cancellation per user
- `idx_cancellations_user_created`: Optimizes user-based queries
- `idx_found_job_cancellation_id`: Optimizes found job lookups
- `idx_found_job_visa_lawyer`: Optimizes visa lawyer analytics
- `idx_found_job_via_migrate_mate`: Optimizes MigrateMate usage analytics

## 🚀 API Endpoints

### 1. POST `/api/cancellations/start`

**Purpose**: Initialize cancellation flow with A/B testing

**Request Body**:
```typescript
{
  userId: string;
  flowType?: 'standard' | 'found_job'; // Defaults to 'standard'
}
```

**Response**:
```typescript
{
  cancellationId: string;
  variant: 'A' | 'B';
  monthlyPrice: number; // in cents
  flowType: 'standard' | 'found_job';
  flowDecision: string; // Determines next step
}
```

**A/B Testing Logic**:
- **Standard Flow**: Always goes to `step1Offer`
- **Found Job Flow**: 50% chance to show offer vs direct cancellation

### 2. POST `/api/cancellations/found-job/complete`

**Purpose**: Complete found job cancellation flow

**Request Body**:
```typescript
{
  cancellationId: string;
  foundJobData: {
    viaMigrateMate: 'Yes' | 'No';
    rolesApplied: '0' | '1-5' | '6-20' | '20+';
    companiesEmailed: '0' | '1-5' | '6-20' | '20+';
    companiesInterviewed: '0' | '1-2' | '3-5' | '5+';
    feedback: string; // Min 25 characters
    visaLawyer: 'Yes' | 'No';
    visaType?: string; // Required if visaLawyer is 'No'
  }
}
```

**Response**:
```typescript
{
  success: boolean;
  data?: {
    cancellationId: string;
    flowType: 'found_job';
    finalStep: string;
    nextActions: string[];
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
```

**Business Logic**:
- Determines final step based on visa lawyer answer
- Automatically cancels subscription
- Records detailed survey data

### 3. PATCH `/api/cancellations/[id]`

**Purpose**: Update cancellation data

**Request Body**:
```typescript
{
  reason?: string;
  acceptedDownsell?: boolean;
  details?: Record<string, any>;
  flowType?: 'standard' | 'found_job' | 'offer_accepted';
  foundJobData?: Partial<FoundJobSurveyData>;
}
```

**Features**:
- Handles all flow types
- Automatically resolves cancellations when appropriate
- Updates subscription status based on flow type

### 4. GET `/api/cancellations/analytics`

**Purpose**: Business intelligence and reporting

**Response**:
```typescript
{
  success: boolean;
  data?: {
    totalCancellations: number;
    byFlowType: Record<FlowType, number>;
    byVariant: Record<VariantType, number>;
    foundJobStats: {
      total: number;
      viaMigrateMate: Record<'Yes' | 'No', number>;
      visaLawyer: Record<'Yes' | 'No', number>;
      averageFeedbackLength: number;
    };
    conversionRates: {
      offerAccepted: number;
      directCancellation: number;
      foundJobCancellation: number;
    };
    recentTrends: {
      last7Days: number;
      last30Days: number;
      last90Days: number;
    };
  };
}
```

## 🔧 Business Logic

### Flow Routing

```typescript
// Found Job Flow Decision
if (flowType === 'found_job') {
  // 50% chance to show offer vs direct cancellation
  flowDecision = Math.random() < 0.5 ? 'step1Offer' : 'subscriptionCancelled';
} else {
  // Standard flow always goes to step 1
  flowDecision = 'step1Offer';
}
```

### Final Step Determination

```typescript
// Based on visa lawyer answer
function determineFinalStep(viaMigrateMate: string, visaLawyer: string): string {
  if (visaLawyer === 'Yes') {
    return 'foundJobCancelledNoHelp';
  } else {
    return 'foundJobCancelledWithHelp';
  }
}
```

### Validation Rules

- **Feedback**: Minimum 25 characters, maximum 1000
- **Visa Type**: Required when visa lawyer is "No"
- **All Survey Questions**: Required before proceeding
- **Input Sanitization**: Removes HTML tags, limits length

## 🧪 Testing

### Test Suite

Run the comprehensive test suite:

```bash
node test-backend.js
```

**Test Coverage**:
- ✅ API endpoint functionality
- ✅ Validation logic
- ✅ Error handling
- ✅ Business logic
- ✅ Data transformation
- ✅ Analytics calculations

### Manual Testing

Test each endpoint individually:

```bash
# Test cancellation start
curl -X POST http://localhost:3000/api/cancellations/start \
  -H "Content-Type: application/json" \
  -d '{"userId":"550e8400-e29b-41d4-a716-446655440001","flowType":"found_job"}'

# Test found job completion
curl -X POST http://localhost:3000/api/cancellations/found-job/complete \
  -H "Content-Type: application/json" \
  -d '{"cancellationId":"mock-cancellation-id","foundJobData":{...}}'

# Test analytics
curl http://localhost:3000/api/cancellations/analytics
```

## 📈 Analytics & Reporting

### Key Metrics

1. **Flow Performance**:
   - Standard vs Found Job conversion rates
   - A/B variant performance
   - Offer acceptance rates

2. **Found Job Insights**:
   - MigrateMate effectiveness
   - Visa lawyer requirements
   - User feedback analysis

3. **Trends**:
   - Daily/weekly/monthly patterns
   - Seasonal variations
   - User behavior changes

### Data Export

Analytics data can be exported for external BI tools or custom dashboards.

## 🔒 Security Features

- **CSRF Protection**: Origin validation for all endpoints
- **Input Validation**: Comprehensive schema validation with Zod
- **SQL Injection Prevention**: Parameterized queries via Supabase
- **Row Level Security**: Database-level access control
- **Input Sanitization**: XSS prevention and length limits

## 🚀 Performance Optimizations

- **Database Indexes**: Optimized for common query patterns
- **Connection Pooling**: Efficient database connections
- **Response Caching**: Static analytics data caching
- **Error Handling**: Graceful degradation and logging

## 📋 Implementation Checklist

### Phase 1: Database Setup ✅
- [x] Updated `cancellations` table with `flow_type`
- [x] Created `found_job_cancellations` table
- [x] Added indexes and constraints
- [x] Implemented RLS policies

### Phase 2: Core API Development ✅
- [x] Enhanced `/api/cancellations/start` with A/B testing
- [x] Created `/api/cancellations/found-job/complete`
- [x] Updated `/api/cancellations/[id]` for new flows
- [x] Added comprehensive validation

### Phase 3: Data Processing & Analytics ✅
- [x] TypeScript interfaces and types
- [x] Utility functions for data transformation
- [x] Analytics calculation engine
- [x] Error handling and response formatting

### Phase 4: Integration & Testing ✅
- [x] Comprehensive test suite
- [x] Manual testing scripts
- [x] Error handling validation
- [x] Performance testing

### Phase 5: Monitoring & Optimization ✅
- [x] Analytics endpoint
- [x] Comprehensive logging
- [x] Performance metrics
- [x] Documentation

## 🔄 Next Steps

1. **Frontend Integration**: Connect new API endpoints to the React modal
2. **Database Migration**: Apply schema changes to production database
3. **Monitoring**: Set up alerts and performance monitoring
4. **A/B Testing**: Move randomization logic to backend for consistency
5. **Analytics Dashboard**: Build frontend dashboard for business users

## 📚 Additional Resources

- **API Documentation**: See individual endpoint files for detailed specs
- **Database Schema**: Full schema in `seed.sql`
- **Type Definitions**: Complete types in `src/lib/types/cancellation.ts`
- **Utility Functions**: Helper functions in `src/lib/utils/cancellation.ts`
- **Test Suite**: Comprehensive tests in `test-backend.js`

---

**Status**: ✅ Complete and Tested  
**Last Updated**: Current  
**Next Review**: After frontend integration
