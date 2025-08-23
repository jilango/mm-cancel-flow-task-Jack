# MigrateMate Cancellation Flow

A sophisticated subscription cancellation management system with A/B testing, state persistence, and comprehensive security measures.

## Architecture Decisions

### **Frontend Architecture**
- **Next.js 15 with App Router**: Leverages the latest React Server Components and streaming for optimal performance
- **TypeScript**: Full type safety across the application with strict type checking
- **Tailwind CSS**: Utility-first CSS framework for rapid, responsive UI development
- **State Management**: React hooks with local state for component-level data, avoiding complex state libraries

### **Backend Architecture**
- **API Routes**: Next.js API routes for serverless backend functionality
- **Supabase Integration**: PostgreSQL database with real-time capabilities and Row-Level Security (RLS)
- **Stateless Design**: Each API endpoint is stateless, making it horizontally scalable
- **Database-First Approach**: Schema-driven development with migrations for version control

### **Data Flow Architecture**
- **Progressive Flow**: Multi-step modal with deterministic state transitions
- **State Persistence**: Database-backed modal state that survives page refreshes
- **Real-time Updates**: Immediate database updates with optimistic UI updates
- **Event-Driven**: Webhook-style notifications for subscription status changes

### **Database Structure**
- **Users Table**: Core user management with UUID primary keys and profile information
- **Subscriptions Table**: Subscription details including monthly price, status, and user relationships
- **Cancellations Table**: Comprehensive cancellation tracking with current_step, downsell_variant, and flow_type
- **Row-Level Security**: Database-level access control ensuring data isolation between users
- **Migration System**: Version-controlled schema changes with rollback capabilities

## Security Implementation

### **Authentication & Authorization**
- **Row-Level Security (RLS)**: Database-level access control ensuring users can only access their own data
- **Service Role Keys**: Secure API access using Supabase service role keys for admin operations
- **User Isolation**: Strict user ID validation preventing cross-user data access

### **Input Validation & Sanitization**
- **Zod Schema Validation**: Runtime type checking for all API endpoints
- **CSRF Protection**: Origin validation and request verification
- **SQL Injection Prevention**: Parameterized queries via Supabase client
- **XSS Protection**: Content Security Policy and input sanitization

### **Data Protection**
- **Sensitive Data Handling**: Secure storage of subscription and cancellation information
- **Audit Trails**: Comprehensive logging of all user actions and state changes
- **Rate Limiting**: Built-in protection against abuse and brute force attacks
- **Environment Variables**: Secure configuration management for API keys and secrets

## A/B Testing Approach

### **Deterministic Variant Assignment**
- **Cryptographic RNG**: Secure random number generation for variant assignment
- **User-Based Persistence**: Variant assigned once per user and persisted across sessions
- **Database Storage**: Variant stored in `cancellations.downsell_variant` field
- **Consistent Experience**: Users always see the same variant on return visits

### **Variant Implementation**
- **Variant A**: Standard cancellation flow with 50% discount offer
- **Variant B**: Enhanced flow with $10 discount ($25→$15, $29→$19)
- **Flow Type Detection**: Automatic routing based on user's cancellation reason
- **Performance Tracking**: Built-in analytics for conversion rate optimization

### **Testing Methodology**
- **50/50 Split**: Equal distribution between variants for statistical significance
- **Persistent Assignment**: User's variant remains consistent throughout their journey
- **Data Collection**: Comprehensive tracking of user interactions and conversions
- **Analysis Ready**: Structured data for A/B testing analysis and optimization

## Key Features

- **Progressive Modal Flow**: Step-by-step cancellation process with validation
- **State Persistence**: Modal remembers user's progress across page refreshes
- **Mobile-First Design**: Responsive UI optimized for all device sizes
- **Real-time Updates**: Immediate feedback and status synchronization
- **Comprehensive Logging**: Detailed audit trail for debugging and analytics

## Technical Stack

- **Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Supabase
- **Database**: PostgreSQL with RLS policies
- **Authentication**: Supabase Auth with custom policies
- **Deployment**: Vercel-ready with environment configuration

## Getting Started

```bash
npm install
npx supabase start
npm run dev
```

The application will be available at `http://localhost:3000` with full A/B testing capabilities and secure state management.
