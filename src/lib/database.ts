// src/lib/database.ts
// Simple in-memory database service for development
// This replaces Supabase when local development isn't available

import { Cancellation, FoundJobCancellation, Subscription, User } from './types/cancellation';

// In-memory storage
const users: User[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    email: 'user1@example.com',
    created_at: new Date().toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    email: 'user2@example.com',
    created_at: new Date().toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    email: 'user3@example.com',
    created_at: new Date().toISOString()
  }
];

const subscriptions: Subscription[] = [
  {
    id: 'sub-001',
    user_id: '550e8400-e29b-41d4-a716-446655440001',
    monthly_price: 2500, // $25.00
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'sub-002',
    user_id: '550e8400-e29b-41d4-a716-446655440002',
    monthly_price: 2900, // $29.00
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'sub-003',
    user_id: '550e8400-e29b-41d4-a716-446655440003',
    monthly_price: 2500, // $25.00
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const cancellations: Cancellation[] = [];
const foundJobCancellations: FoundJobCancellation[] = [];

// Database service class
export class DatabaseService {
  // Users
  async getUserById(id: string): Promise<User | null> {
    return users.find(user => user.id === id) || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return users.find(user => user.email === email) || null;
  }

  // Subscriptions
  async getSubscriptionByUserId(userId: string): Promise<Subscription | null> {
    return subscriptions.find(sub => sub.user_id === userId) || null;
  }

  async updateSubscriptionStatus(subscriptionId: string, status: string): Promise<void> {
    const subscription = subscriptions.find(sub => sub.id === subscriptionId);
    if (subscription) {
      subscription.status = status;
      subscription.updated_at = new Date().toISOString();
    }
  }

  // Cancellations
  async createCancellation(cancellation: Omit<Cancellation, 'id' | 'created_at'>): Promise<Cancellation> {
    const newCancellation: Cancellation = {
      ...cancellation,
      id: `cancel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString()
    };
    cancellations.push(newCancellation);
    return newCancellation;
  }

  async getCancellationById(id: string): Promise<Cancellation | null> {
    return cancellations.find(cancel => cancel.id === id) || null;
  }

  async updateCancellation(id: string, updates: Partial<Cancellation>): Promise<Cancellation | null> {
    const cancellation = cancellations.find(cancel => cancel.id === id);
    if (cancellation) {
      Object.assign(cancellation, updates);
      return cancellation;
    }
    return null;
  }

  async getCancellationsByUserId(userId: string): Promise<Cancellation[]> {
    return cancellations.filter(cancel => cancel.user_id === userId);
  }

  // Found Job Cancellations
  async createFoundJobCancellation(cancellation: Omit<FoundJobCancellation, 'id' | 'created_at' | 'updated_at'>): Promise<FoundJobCancellation> {
    const newCancellation: FoundJobCancellation = {
      ...cancellation,
      id: `fjc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    foundJobCancellations.push(newCancellation);
    return newCancellation;
  }

  // Analytics
  async getCancellationAnalytics() {
    const totalCancellations = cancellations.length;
    const byFlowType = {
      standard: cancellations.filter(c => c.flow_type === 'standard').length,
      found_job: cancellations.filter(c => c.flow_type === 'found_job').length,
      offer_accepted: cancellations.filter(c => c.flow_type === 'offer_accepted').length
    };
    const byVariant = {
      A: cancellations.filter(c => c.downsell_variant === 'A').length,
      B: cancellations.filter(c => c.downsell_variant === 'B').length
    };

    const foundJobStats = {
      total: foundJobCancellations.length,
      viaMigrateMate: {
        Yes: foundJobCancellations.filter(fjc => fjc.via_migrate_mate === 'Yes').length,
        No: foundJobCancellations.filter(fjc => fjc.via_migrate_mate === 'No').length
      },
      visaLawyer: {
        Yes: foundJobCancellations.filter(fjc => fjc.visa_lawyer === 'Yes').length,
        No: foundJobCancellations.filter(fjc => fjc.visa_lawyer === 'No').length
      },
      averageFeedbackLength: foundJobCancellations.length > 0 
        ? Math.round(foundJobCancellations.reduce((sum, fjc) => sum + fjc.feedback.length, 0) / foundJobCancellations.length)
        : 0
    };

    const conversionRates = {
      offerAccepted: byFlowType.offer_accepted / Math.max(totalCancellations, 1),
      directCancellation: byFlowType.standard / Math.max(totalCancellations, 1),
      foundJobCancellation: byFlowType.found_job / Math.max(totalCancellations, 1)
    };

    const recentTrends = {
      last7Days: cancellations.filter(c => {
        const daysAgo = (Date.now() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24);
        return daysAgo <= 7;
      }).length,
      last30Days: cancellations.filter(c => {
        const daysAgo = (Date.now() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24);
        return daysAgo <= 30;
      }).length,
      last90Days: cancellations.filter(c => {
        const daysAgo = (Date.now() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24);
        return daysAgo <= 90;
      }).length
    };

    return {
      totalCancellations,
      byFlowType,
      byVariant,
      foundJobStats,
      conversionRates,
      recentTrends
    };
  }
}

// Export singleton instance
export const db = new DatabaseService();
