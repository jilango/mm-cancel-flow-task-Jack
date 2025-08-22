// Cancellation flow types
export type FlowType = 'standard' | 'found_job' | 'offer_accepted';

// A/B testing variants
export type VariantType = 'A' | 'B';

// Found job survey data
export interface FoundJobSurveyData {
  viaMigrateMate: 'Yes' | 'No';
  rolesApplied: '0' | '1-5' | '6-20' | '20+';
  companiesEmailed: '0' | '1-5' | '6-20' | '20+';
  companiesInterviewed: '0' | '1-2' | '3-5' | '5+';
  feedback: string;
  visaLawyer: 'Yes' | 'No';
  visaType?: string;
}

// Cancellation start request
export interface CancellationStartRequest {
  userId: string;
  flowType?: FlowType;
}

// Cancellation start response
export interface CancellationStartResponse {
  cancellationId: string;
  variant: VariantType;
  monthlyPrice: number;
  flowType: FlowType;
  flowDecision: string;
}

// Found job completion request
export interface FoundJobCompletionRequest {
  cancellationId: string;
  foundJobData: FoundJobSurveyData;
}

// Found job completion response
export interface FoundJobCompletionResponse {
  success: boolean;
  data?: {
    cancellationId: string;
    flowType: FlowType;
    finalStep: string;
    nextActions: string[];
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

// Cancellation update request
export interface CancellationUpdateRequest {
  reason?: string | null;
  acceptedDownsell?: boolean | null;
  details?: Record<string, any> | null;
  flowType?: FlowType;
  foundJobData?: Partial<FoundJobSurveyData>;
}

// Database models
export interface Cancellation {
  id: string;
  user_id: string;
  subscription_id: string;
  downsell_variant: VariantType;
  flow_type: FlowType;
  reason?: string;
  accepted_downsell: boolean;
  details: Record<string, any>;
  resolved_at?: string;
  created_at: string;
}

export interface FoundJobCancellation {
  id: string;
  cancellation_id: string;
  via_migrate_mate: 'Yes' | 'No';
  roles_applied: '0' | '1-5' | '6-20' | '20+';
  companies_emailed: '0' | '1-5' | '6-20' | '20+';
  companies_interviewed: '0' | '1-2' | '3-5' | '5+';
  feedback: string;
  visa_lawyer: 'Yes' | 'No';
  visa_type?: string;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  monthly_price: number;
  status: 'active' | 'pending_cancellation' | 'cancelled';
  created_at: string;
  updated_at: string;
}

// Analytics and reporting
export interface CancellationAnalytics {
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
}

// Error codes
export enum CancellationErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  CANCELLATION_NOT_FOUND = 'CANCELLATION_NOT_FOUND',
  CANCELLATION_ALREADY_RESOLVED = 'CANCELLATION_ALREADY_RESOLVED',
  TRANSACTION_ERROR = 'TRANSACTION_ERROR',
  UNEXPECTED_ERROR = 'UNEXPECTED_ERROR',
  SUBSCRIPTION_NOT_FOUND = 'SUBSCRIPTION_NOT_FOUND',
  DATABASE_ERROR = 'DATABASE_ERROR'
}
