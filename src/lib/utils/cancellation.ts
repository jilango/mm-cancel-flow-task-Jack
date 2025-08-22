import { 
  FoundJobSurveyData, 
  CancellationAnalytics, 
  FlowType, 
  VariantType,
  CancellationErrorCode 
} from '../types/cancellation';

/**
 * Transform frontend survey data to database format
 */
export function transformFoundJobData(foundJobData: FoundJobSurveyData) {
  return {
    via_migrate_mate: foundJobData.viaMigrateMate,
    roles_applied: foundJobData.rolesApplied,
    companies_emailed: foundJobData.companiesEmailed,
    companies_interviewed: foundJobData.companiesInterviewed,
    feedback: foundJobData.feedback,
    visa_lawyer: foundJobData.visaLawyer,
    visa_type: foundJobData.visaType || null
  };
}

/**
 * Transform database data to frontend format
 */
export function transformFoundJobDataFromDB(dbData: any): FoundJobSurveyData {
  return {
    viaMigrateMate: dbData.via_migrate_mate,
    rolesApplied: dbData.roles_applied,
    companiesEmailed: dbData.companies_emailed,
    companiesInterviewed: dbData.companies_interviewed,
    feedback: dbData.feedback,
    visaLawyer: dbData.visa_lawyer,
    visaType: dbData.visa_type
  };
}

/**
 * Validate found job survey data
 */
export function validateFoundJobData(data: Partial<FoundJobSurveyData>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Required fields
  if (!data.viaMigrateMate) errors.push('viaMigrateMate is required');
  if (!data.rolesApplied) errors.push('rolesApplied is required');
  if (!data.companiesEmailed) errors.push('companiesEmailed is required');
  if (!data.companiesInterviewed) errors.push('companiesInterviewed is required');
  if (!data.feedback) errors.push('feedback is required');
  if (!data.visaLawyer) errors.push('visaLawyer is required');

  // Field-specific validations
  if (data.feedback && data.feedback.length < 25) {
    errors.push('feedback must be at least 25 characters');
  }
  if (data.feedback && data.feedback.length > 1000) {
    errors.push('feedback must be less than 1000 characters');
  }
  if (data.visaType && data.visaType.length > 100) {
    errors.push('visaType must be less than 100 characters');
  }

  // Conditional validation
  if (data.visaLawyer === 'No' && (!data.visaType || data.visaType.trim() === '')) {
    errors.push('visaType is required when visaLawyer is "No"');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Determine final step based on user responses
 */
export function determineFinalStep(viaMigrateMate: string, visaLawyer: string): string {
  if (visaLawyer === 'Yes') {
    return 'foundJobCancelledNoHelp';
  } else {
    return 'foundJobCancelledWithHelp';
  }
}

/**
 * Get next actions based on final step
 */
export function getNextActions(finalStep: string): string[] {
  switch (finalStep) {
    case 'foundJobCancelledNoHelp':
      return ['Close modal', 'Send confirmation email'];
    case 'foundJobCancelledWithHelp':
      return ['Close modal', 'Send confirmation email', 'Schedule visa consultation call'];
    default:
      return ['Close modal'];
  }
}

/**
 * Calculate analytics from cancellation data
 */
export function calculateCancellationAnalytics(
  cancellations: any[],
  foundJobCancellations: any[]
): CancellationAnalytics {
  const totalCancellations = cancellations.length;
  
  // Flow type breakdown
  const byFlowType: Record<FlowType, number> = {
    standard: 0,
    found_job: 0,
    offer_accepted: 0
  };
  
  // Variant breakdown
  const byVariant: Record<VariantType, number> = {
    A: 0,
    B: 0
  };

  cancellations.forEach(cancellation => {
    byFlowType[cancellation.flow_type as FlowType]++;
    byVariant[cancellation.downsell_variant as VariantType]++;
  });

  // Found job statistics
  const foundJobStats = {
    total: foundJobCancellations.length,
    viaMigrateMate: { Yes: 0, No: 0 },
    visaLawyer: { Yes: 0, No: 0 },
    averageFeedbackLength: 0
  };

  let totalFeedbackLength = 0;
  foundJobCancellations.forEach(fjc => {
    foundJobStats.viaMigrateMate[fjc.via_migrate_mate]++;
    foundJobStats.visaLawyer[fjc.visa_lawyer]++;
    totalFeedbackLength += fjc.feedback.length;
  });

  foundJobStats.averageFeedbackLength = foundJobStats.total > 0 
    ? Math.round(totalFeedbackLength / foundJobStats.total) 
    : 0;

  // Conversion rates
  const conversionRates = {
    offerAccepted: byFlowType.offer_accepted / totalCancellations || 0,
    directCancellation: (byFlowType.standard + byFlowType.found_job) / totalCancellations || 0,
    foundJobCancellation: byFlowType.found_job / totalCancellations || 0
  };

  return {
    totalCancellations,
    byFlowType,
    byVariant,
    foundJobStats,
    conversionRates
  };
}

/**
 * Generate error response with proper structure
 */
export function createErrorResponse(
  code: CancellationErrorCode,
  message: string,
  details?: any
) {
  return {
    success: false,
    error: {
      code,
      message,
      details
    }
  };
}

/**
 * Generate success response with proper structure
 */
export function createSuccessResponse<T>(data: T) {
  return {
    success: true,
    data
  };
}

/**
 * Sanitize user input for database storage
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 1000); // Limit length
}

/**
 * Format price from cents to dollars
 */
export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Parse price from dollars to cents
 */
export function parsePrice(dollars: string): number {
  const clean = dollars.replace(/[$,]/g, '');
  return Math.round(parseFloat(clean) * 100);
}
