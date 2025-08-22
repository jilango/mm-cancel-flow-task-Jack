import { 
  validateFoundJobData, 
  determineFinalStep, 
  getNextActions,
  calculateCancellationAnalytics,
  createErrorResponse,
  createSuccessResponse,
  sanitizeInput,
  formatPrice,
  parsePrice
} from '../utils/cancellation';
import { CancellationErrorCode } from '../types/cancellation';

// Test data
const validFoundJobData = {
  viaMigrateMate: 'Yes' as const,
  rolesApplied: '1-5' as const,
  companiesEmailed: '6-20' as const,
  companiesInterviewed: '3-5' as const,
  feedback: 'This is a valid feedback message with more than 25 characters to meet the requirement.',
  visaLawyer: 'Yes' as const
};

const invalidFoundJobData = {
  viaMigrateMate: 'Yes' as const,
  rolesApplied: '1-5' as const,
  companiesEmailed: '6-20' as const,
  companiesInterviewed: '3-5' as const,
  feedback: 'Too short', // Less than 25 characters
  visaLawyer: 'No' as const
  // Missing visaType when visaLawyer is 'No'
};

describe('Cancellation Utilities', () => {
  describe('validateFoundJobData', () => {
    it('should validate correct data', () => {
      const result = validateFoundJobData(validFoundJobData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject data with short feedback', () => {
      const data = { ...validFoundJobData, feedback: 'Short' };
      const result = validateFoundJobData(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('feedback must be at least 25 characters');
    });

    it('should reject data with missing visaType when visaLawyer is No', () => {
      const data = { ...validFoundJobData, visaLawyer: 'No' as const };
      const result = validateFoundJobData(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('visaType is required when visaLawyer is "No"');
    });

    it('should accept data with visaType when visaLawyer is No', () => {
      const data = { 
        ...validFoundJobData, 
        visaLawyer: 'No' as const,
        visaType: 'H-1B'
      };
      const result = validateFoundJobData(data);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject data with missing required fields', () => {
      const data = { feedback: 'Valid feedback message' };
      const result = validateFoundJobData(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('viaMigrateMate is required');
      expect(result.errors).toContain('rolesApplied is required');
      expect(result.errors).toContain('companiesEmailed is required');
      expect(result.errors).toContain('companiesInterviewed is required');
      expect(result.errors).toContain('visaLawyer is required');
    });
  });

  describe('determineFinalStep', () => {
    it('should return foundJobCancelledNoHelp when visaLawyer is Yes', () => {
      expect(determineFinalStep('Yes', 'Yes')).toBe('foundJobCancelledNoHelp');
      expect(determineFinalStep('No', 'Yes')).toBe('foundJobCancelledNoHelp');
    });

    it('should return foundJobCancelledWithHelp when visaLawyer is No', () => {
      expect(determineFinalStep('Yes', 'No')).toBe('foundJobCancelledWithHelp');
      expect(determineFinalStep('No', 'No')).toBe('foundJobCancelledWithHelp');
    });
  });

  describe('getNextActions', () => {
    it('should return correct actions for foundJobCancelledNoHelp', () => {
      const actions = getNextActions('foundJobCancelledNoHelp');
      expect(actions).toEqual(['Close modal', 'Send confirmation email']);
    });

    it('should return correct actions for foundJobCancelledWithHelp', () => {
      const actions = getNextActions('foundJobCancelledWithHelp');
      expect(actions).toEqual(['Close modal', 'Send confirmation email', 'Schedule visa consultation call']);
    });

    it('should return default actions for unknown step', () => {
      const actions = getNextActions('unknown');
      expect(actions).toEqual(['Close modal']);
    });
  });

  describe('calculateCancellationAnalytics', () => {
    const mockCancellations = [
      { flow_type: 'standard', downsell_variant: 'A' },
      { flow_type: 'found_job', downsell_variant: 'B' },
      { flow_type: 'offer_accepted', downsell_variant: 'A' },
      { flow_type: 'found_job', downsell_variant: 'B' }
    ];

    const mockFoundJobCancellations = [
      { via_migrate_mate: 'Yes', visa_lawyer: 'Yes', feedback: 'This is a test feedback message' },
      { via_migrate_mate: 'No', visa_lawyer: 'No', feedback: 'Another feedback message for testing purposes' }
    ];

    it('should calculate correct totals', () => {
      const analytics = calculateCancellationAnalytics(mockCancellations, mockFoundJobCancellations);
      expect(analytics.totalCancellations).toBe(4);
      expect(analytics.foundJobStats.total).toBe(2);
    });

    it('should calculate correct flow type breakdown', () => {
      const analytics = calculateCancellationAnalytics(mockCancellations, mockFoundJobCancellations);
      expect(analytics.byFlowType.standard).toBe(1);
      expect(analytics.byFlowType.found_job).toBe(2);
      expect(analytics.byFlowType.offer_accepted).toBe(1);
    });

    it('should calculate correct variant breakdown', () => {
      const analytics = calculateCancellationAnalytics(mockCancellations, mockFoundJobCancellations);
      expect(analytics.byVariant.A).toBe(2);
      expect(analytics.byVariant.B).toBe(2);
    });

    it('should calculate correct found job statistics', () => {
      const analytics = calculateCancellationAnalytics(mockCancellations, mockFoundJobCancellations);
      expect(analytics.foundJobStats.viaMigrateMate.Yes).toBe(1);
      expect(analytics.foundJobStats.viaMigrateMate.No).toBe(1);
      expect(analytics.foundJobStats.visaLawyer.Yes).toBe(1);
      expect(analytics.foundJobStats.visaLawyer.No).toBe(1);
      expect(analytics.foundJobStats.averageFeedbackLength).toBeGreaterThan(0);
    });

    it('should calculate correct conversion rates', () => {
      const analytics = calculateCancellationAnalytics(mockCancellations, mockFoundJobCancellations);
      expect(analytics.conversionRates.offerAccepted).toBe(0.25); // 1/4
      expect(analytics.conversionRates.foundJobCancellation).toBe(0.5); // 2/4
      expect(analytics.conversionRates.directCancellation).toBe(0.75); // 3/4
    });

    it('should handle empty data', () => {
      const analytics = calculateCancellationAnalytics([], []);
      expect(analytics.totalCancellations).toBe(0);
      expect(analytics.foundJobStats.total).toBe(0);
      expect(analytics.foundJobStats.averageFeedbackLength).toBe(0);
      expect(analytics.conversionRates.offerAccepted).toBe(0);
    });
  });

  describe('createErrorResponse', () => {
    it('should create properly structured error response', () => {
      const error = createErrorResponse(
        CancellationErrorCode.VALIDATION_ERROR,
        'Invalid data',
        ['Field is required']
      );
      
      expect(error.success).toBe(false);
      expect(error.error.code).toBe(CancellationErrorCode.VALIDATION_ERROR);
      expect(error.error.message).toBe('Invalid data');
      expect(error.error.details).toEqual(['Field is required']);
    });
  });

  describe('createSuccessResponse', () => {
    it('should create properly structured success response', () => {
      const data = { id: '123', status: 'success' };
      const response = createSuccessResponse(data);
      
      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
    });
  });

  describe('sanitizeInput', () => {
    it('should trim whitespace', () => {
      expect(sanitizeInput('  test  ')).toBe('test');
    });

    it('should remove HTML tags', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
    });

    it('should limit length', () => {
      const longInput = 'a'.repeat(2000);
      expect(sanitizeInput(longInput).length).toBeLessThanOrEqual(1000);
    });
  });

  describe('formatPrice', () => {
    it('should format cents to dollars', () => {
      expect(formatPrice(2500)).toBe('$25.00');
      expect(formatPrice(2999)).toBe('$29.99');
      expect(formatPrice(100)).toBe('$1.00');
    });
  });

  describe('parsePrice', () => {
    it('should parse dollars to cents', () => {
      expect(parsePrice('$25.00')).toBe(2500);
      expect(parsePrice('29.99')).toBe(2999);
      expect(parsePrice('$1')).toBe(100);
    });

    it('should handle commas and currency symbols', () => {
      expect(parsePrice('$1,250.50')).toBe(125050);
    });
  });
});
