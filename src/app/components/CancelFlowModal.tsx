'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  heroSrc?: string;
  profileSrc?: string;
};

type StartResp = {
  cancellationId: string;
  variant: 'A' | 'B';
  monthlyPrice: number; // cents
};

export default function CancelFlowModal({
  isOpen,
  onClose,
  userId,
  heroSrc = '/empire-state-compressed.jpg',
  profileSrc = '/mihailo-profile.jpeg'
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'start' | 'step1Offer' | 'step2OfferVariantA' | 'offer' | 'reason' | 'foundDetails' | 'subscriptionCancelled' | 'offerAccepted' | 'foundJobStep1' | 'foundJobStep2' | 'foundJobStep3VariantA' | 'foundJobStep3VariantB' | 'foundJobCancelledNoHelp' | 'foundJobCancelledWithHelp'>('start');


  const [data, setData] = useState<StartResp | null>(null);

  // Form state
  const [reason, setReason] = useState('');
  const [willingPrice, setWillingPrice] = useState<string>('');
  const [otherText, setOtherText] = useState('');
  const [platformDetails, setPlatformDetails] = useState('');
  const [jobsDetails, setJobsDetails] = useState('');
  const [moveDetails, setMoveDetails] = useState('');
  const [foundViaUs, setFoundViaUs] = useState<'yes' | 'no' | ''>('');
  const [visaType, setVisaType] = useState<'H-1B' | 'OPT' | 'Green card' | 'Citizen' | 'Other' | ''>('');
  const [foundNotes, setFoundNotes] = useState('');
  
  // Found job survey state
  const [foundJobViaMigrateMate, setFoundJobViaMigrateMate] = useState<string>('');
  const [foundJobRolesApplied, setFoundJobRolesApplied] = useState<string>('');
  const [foundJobCompaniesEmailed, setFoundJobCompaniesEmailed] = useState<string>('');
    const [foundJobCompaniesInterviewed, setFoundJobCompaniesInterviewed] = useState<string>('');
  const [foundJobFeedback, setFoundJobFeedback] = useState<string>('');
  const [foundJobVisaLawyer, setFoundJobVisaLawyer] = useState<string>('');
  const [foundJobVisaType, setFoundJobVisaType] = useState<string>('');
  
  const [acceptedOffer, setAcceptedOffer] = useState<boolean | null>(null);
  const [surveyData, setSurveyData] = useState({
    rolesApplied: '',
    companiesEmailed: '',
    companiesInterviewed: ''
  });
  const [cancellationReason, setCancellationReason] = useState('');

  const offerPrice = useMemo(() => {
    if (!data) return null;
    // $10 off: 2500->1500, 2900->1900
    if (data.monthlyPrice === 2500) return 1500;
    if (data.monthlyPrice === 2900) return 1900;
    return Math.max(0, data.monthlyPrice - 1000);
  }, [data]);

  const pretty = (cents: number) => `$${(cents / 100).toFixed(0)}`;

  // Check if any text box has content
  const hasTextInTextBox = () => {
    if (!reason) return false;
    
    switch (reason) {
      case 'Too expensive':
        return willingPrice.trim() !== '';
      case 'Platform not helpful':
        return platformDetails.trim() !== '';
      case 'Not enough relevant jobs':
        return jobsDetails.trim() !== '';
      case 'Decided not to move':
        return moveDetails.trim() !== '';
      case 'Other':
        return otherText.trim() !== '';
      default:
        return false;
    }
  };

  const clearError = () => setError(null);

  const handleFoundJob = async () => {
    setLoading(true);
    clearError();
    try {
      const res = await fetch('/api/cancellations/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to start cancellation');
      }
      
      const payload = (await res.json()) as StartResp;
      setData(payload);
      // Go to found job survey step 1
      setStep('foundJobStep1');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong starting cancellation');
    } finally {
      setLoading(false);
    }
  };

  // Step flow logic function
  const getStepInfo = (stepType: string, stepNumber: number) => {
    switch (stepType) {
      case 'step1Offer':
        return {
          title: 'Step 1 of 3',
          progress: [false, false, false], // ○○○ (current step is grey)
          showBackButton: false,
          isVariant: false,
          previousStep: 'start'
        };
      

      
      case 'step2OfferVariantA':
        return {
          title: 'Step 2 of 3',
          progress: [true, false, false], // ●○○ (step 1 completed, step 2 current)
          showBackButton: true,
          isVariant: false,
          previousStep: 'step1Offer'
        };
      
      case 'reason':
        return {
          title: 'Step 3 of 3',
          progress: [true, true, false], // ●●○ (steps 1&2 completed, step 3 current)
          showBackButton: true,
          isVariant: false,
          previousStep: 'step2OfferVariantA'
        };
      
      case 'foundDetails':
        return {
          title: 'Step 3 of 3',
          progress: [true, true, false], // ●●○ (steps 1&2 completed, step 3 current)
          showBackButton: true,
          isVariant: false,
          previousStep: 'reason'
        };
      
      case 'subscriptionCancelled':
        return {
          title: 'Subscription Cancelled',
          progress: [true, true, true], // ●●●
          showBackButton: false,
          isVariant: false,
          previousStep: null
        };
      
      case 'offerAccepted':
        return {
          title: 'Subscription',
          progress: [true, true, true], // ●●●
          showBackButton: false,
          isVariant: false,
          previousStep: null
        };
      
      case 'foundJobStep1':
        return {
          title: 'Step 1 of 3',
          progress: [false, false, false], // ○○○
          showBackButton: true,
          isVariant: false,
          previousStep: 'start'
        };
      
      case 'foundJobStep2':
        return {
          title: 'Step 2 of 3',
          progress: [true, false, false], // ●○○
          showBackButton: true,
          isVariant: false,
          previousStep: 'foundJobStep1'
        };
      
      case 'foundJobStep3VariantA':
        return {
          title: 'Step 3 of 3',
          progress: [true, true, false], // ●●○
          showBackButton: true,
          isVariant: true,
          previousStep: 'foundJobStep2'
        };
      
      case 'foundJobStep3VariantB':
        return {
          title: 'Step 3 of 3',
          progress: [true, true, false], // ●●○
          showBackButton: true,
          isVariant: true,
          previousStep: 'foundJobStep2'
        };
      
      case 'foundJobCancelledNoHelp':
        return {
          title: 'Subscription Cancelled',
          progress: [true, true, true], // ●●●
          showBackButton: false,
          isVariant: false,
          previousStep: null
        };
      
      case 'foundJobCancelledWithHelp':
        return {
          title: 'Subscription Cancelled',
          progress: [true, true, true], // ●●●
          showBackButton: false,
          isVariant: false,
          previousStep: null
        };
      
      default:
        return {
          title: 'Step 1 of 3',
          progress: [false, false, false], // ○○○
          showBackButton: false,
          isVariant: false,
          previousStep: null
        };
    }
  };

  // Navigation helper function
  const goToPreviousStep = () => {
    const currentStepInfo = getStepInfo(step, 1);
    
    // Special handling for Step 3 (reason) - clear selection and stay on same step
    if (step === 'reason' && reason) {
      setReason('');
      return;
    }
    
    // Special handling for Step 3 variants - clear selection and stay on same step
    if ((step === 'foundJobStep3VariantA' || step === 'foundJobStep3VariantB') && foundJobVisaLawyer) {
      setFoundJobVisaLawyer('');
      setFoundJobVisaType('');
      return;
    }
    
    // Normal navigation to previous step
    if (currentStepInfo.previousStep) {
      setStep(currentStepInfo.previousStep as any);
    }
  };

  // Get current step index (0-based)
  const getCurrentStepIndex = (stepType: string): number => {
    switch (stepType) {
      case 'step1Offer': return 0;
      case 'step2OfferVariantA': return 1;
      case 'reason': return 2;
      case 'foundDetails': return 2;
      case 'foundJobStep1': return 0;
      case 'foundJobStep2': return 1;
      case 'foundJobStep3VariantA': return 2;
      case 'foundJobStep3VariantB': return 2;
      case 'foundJobCancelledNoHelp': return 3;
      case 'foundJobCancelledWithHelp': return 3;
      default: return 0;
    }
  };

  // Get step-specific styling and behavior
  const getStepConfig = (stepType: string) => {
    const stepInfo = getStepInfo(stepType, 1);
    
    return {
      ...stepInfo,
      // Step-specific styling
      headerClass: stepInfo.isVariant ? 'text-purple-600' : 'text-gray-800',
      // Step-specific behavior
      allowSkip: stepInfo.isVariant, // Variants might allow skipping
      showProgress: stepInfo.title !== 'Complete',
      // Step-specific actions
      primaryAction: stepInfo.isVariant ? 'Try Alternative' : 'Continue',
      secondaryAction: stepInfo.isVariant ? 'Skip' : 'Back'
    };
  };

  const handleStillLooking = async () => {
    setLoading(true);
    clearError();
    try {
      const res = await fetch('/api/cancellations/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to start cancellation');
      }
      
      const payload = (await res.json()) as StartResp;
      setData(payload);
      
      // A/B Testing: 50% chance to go to Step 1 Offer or directly to Subscription Cancelled
      const randomValue = Math.random();
      if (randomValue < 0.5) {
        // 50% chance: Go to Step 1 Offer
        setStep('step1Offer');
      } else {
        // 50% chance: Go directly to Subscription Cancelled
        setStep('subscriptionCancelled');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong starting cancellation');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptStep1Offer = async () => {
    // Handle accepting the 50% off offer
    setStep('offerAccepted');
  };

  const handleDeclineStep1Offer = async () => {
    // Go to Step 2 (User engagement survey)
    setStep('step2OfferVariantA');
  };

  const handleAcceptStep2Offer = async () => {
    // Handle accepting the 50% off offer from step 2
    setStep('offerAccepted');
  };

  const handleContinueFromStep2 = async () => {
    // Continue to reason selection
    setStep('reason');
  };

  const acceptOffer = async () => {
    if (!data) return;
    setLoading(true);
    clearError();
    try {
      const res = await fetch(`/api/cancellations/${data.cancellationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acceptedDownsell: true })
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to accept offer');
      }
      
      setStep('subscriptionCancelled');
      setTimeout(onClose, 500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to record acceptance');
    } finally {
      setLoading(false);
    }
  };

  const continueAfterReason = () => {
    if (reason === 'Found a job') {
      setStep('foundDetails');
    } else {
      submitReason(); // Too expensive / Not useful / Other submit directly
    }
  };

  const submitReason = async () => {
    if (!data) return;
    setLoading(true);
    clearError();
    try {
      const details: Record<string, unknown> = {};
      if (reason === 'Too expensive' && typeof willingPrice === 'number') {
        details.willing_price_cents = Math.round(willingPrice * 100);
      }
      if (reason === 'Other' && otherText.trim()) {
        details.other = otherText.trim().slice(0, 500);
      }

      const res = await fetch(`/api/cancellations/${data.cancellationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          reason, 
          details: Object.keys(details).length ? details : undefined 
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save reason');
      }
      
      setStep('subscriptionCancelled');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save reason');
    } finally {
      setLoading(false);
    }
  };

  const submitFoundDetails = async () => {
    if (!data) return;
    setLoading(true);
    clearError();
    try {
      const details: Record<string, unknown> = {
        found_via_us: foundViaUs || null,
        visa_type: visaType || null
      };
      if (foundNotes.trim()) {
        details.notes = foundNotes.trim().slice(0, 500);
      }

      const res = await fetch(`/api/cancellations/${data.cancellationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          reason: 'Found a job', 
          details 
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save details');
      }
      
      setStep('subscriptionCancelled');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save details');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start lg:items-center justify-center pt-16 lg:pt-0 p-0 lg:p-4">
      <div className="absolute inset-0 bg-gray-800/50" onClick={onClose} />
      <div className="relative w-full max-w-none lg:max-w-7xl bg-white rounded-t-lg lg:rounded-lg shadow-xl overflow-hidden flex flex-col h-full lg:h-auto max-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between px-4 lg:px-6 py-2 lg:py-4 border-b border-gray-200">
          <div className="hidden lg:block w-24">
            {/* Back button only on desktop */}
            {step !== 'start' && step !== 'subscriptionCancelled' && step !== 'offerAccepted' && (
              <button 
                onClick={goToPreviousStep}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-base">Back</span>
              </button>
            )}
          </div>
          
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-2 lg:gap-8">
            <h2 className="text-lg lg:text-xl font-semibold text-gray-800 text-left lg:text-center whitespace-nowrap">
              {step === 'offerAccepted' ? 'Subscription' : 'Subscription Cancellation'}
            </h2>
            {step !== 'start' && step !== 'offerAccepted' && (
              <div className="flex items-center gap-3 lg:gap-4">
                <div className="flex gap-2 lg:gap-3">
                  {getStepInfo(step, 1).progress.map((isCompleted, index) => (
                    <div 
                      key={index}
                      className={`w-6 h-2 lg:w-10 lg:h-3 rounded-full ${
                        isCompleted ? 'bg-green-500' : index === getCurrentStepIndex(step) ? 'bg-gray-500' : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs lg:text-sm text-gray-600">{getStepInfo(step, 1).title}</span>
              </div>
            )}
          </div>

          <div className="w-16 lg:w-24 flex justify-end">
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            >
              <svg className="w-5 h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Main content area */}
        <div className="flex flex-col lg:flex-row lg:gap-0 min-h-0 flex-1">
          {/* Mobile: Back button above image */}
          <div className="lg:hidden px-6 pt-2">
            {step !== 'start' && step !== 'subscriptionCancelled' && (
              <button 
                onClick={goToPreviousStep}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors mb-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-sm">Back</span>
              </button>
            )}
          </div>
          
          {/* Mobile: Image banner above content - only on start, subscription cancelled, and found job step 1 */}
          {(step === 'start' || step === 'subscriptionCancelled') && (
            <div className="lg:hidden w-full px-6 pt-2">
              <div className="w-full h-40 sm:h-48 lg:h-44 relative rounded-lg overflow-hidden">
                <Image 
                  src={heroSrc} 
                  alt="New York City skyline" 
                  fill
                  className="object-cover"
                  priority 
                  sizes="100vw"
                />
              </div>
            </div>
          )}

          {/* Content area */}
          <div className="flex-1 px-6 pt-2 pb-4 lg:py-6 flex flex-col min-h-0">
            {/* Error display */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg" aria-live="polite">
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}

            {step === 'start' && (
              <div className="space-y-3 lg:space-y-6 flex-1">
                {/* Greeting */}
                <h3 className="text-xl lg:text-4xl font-semibold text-[#41403D] leading-tight">
                  Hey mate,<br />
                  Quick one before you go.
                </h3>
                
                {/* Question */}
                <h3 className="text-xl lg:text-4xl font-semibold italic text-[#41403D] leading-tight">
                  Have you found a job yet?
                </h3>
                
                {/* Descriptive text */}
                <p className="text-sm lg:text-xl text-[#41403D] leading-relaxed">
                  Whatever your answer, we just want to help you take the next step. With visa support, or by hearing how we can do better.
                </p>
                
                {/* Separation line */}
                <div className="border-t border-gray-200 mt-3"></div>
                
                {/* Buttons */}
                <div className="space-y-2 mt-auto">
                  <button 
                    className="w-full px-6 lg:px-8 py-2 lg:py-4 bg-white border border-gray-300 text-[#41403D] rounded-lg hover:bg-gray-50 disabled:opacity-50 font-medium transition-colors text-base lg:text-xl" 
                    onClick={handleFoundJob} 
                    disabled={loading}
                  >
                    {loading ? 'Loading…' : 'Yes, I\'ve found a job'}
                  </button>
                  <button 
                    className="w-full px-6 lg:px-8 py-2 lg:py-4 bg-white border border-gray-300 text-[#41403D] rounded-lg hover:bg-gray-200 disabled:opacity-50 font-medium transition-colors text-base lg:text-xl" 
                    onClick={handleStillLooking} 
                    disabled={loading}
                  >
                    {loading ? 'Loading…' : 'Not yet - I\'m still looking'}
                  </button>
                </div>
              </div>
            )}

            {step === 'step1Offer' && (
              <div className="flex flex-col h-full">
                <div className="space-y-5 lg:space-y-6 flex-1">
                  {/* Main Heading */}
                  <h3 className="text-3xl lg:text-4xl font-semibold text-[#41403D] leading-tight">
                    We built this to help you land the job,<br />
                    this makes it a little easier.
                  </h3>
                  
                  {/* Descriptive Text */}
                  <p className="text-xl lg:text-2xl font-semibold text-[#41403D] leading-relaxed">
                    We've been there and we're here to help you.
                  </p>
                  
                  {/* Offer */}
                  <div className="bg-[#EBE1FE] p-5 rounded-lg border border-[#9A6FFF] text-center">
                    <h4 className="text-2xl lg:text-3xl font-semibold text-[#41403D] mb-3">
                      Here's <span className="font-bold">50% off</span> until you find a job.
                    </h4>
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <span className="text-2xl lg:text-3xl font-bold text-[#9A6FFF]">$12.50</span>
                      <span className="text-lg text-gray-500">/month</span>
                      <span className="text-lg text-gray-400 line-through">$25/month</span>
                    </div>
                    
                    {/* Call to Action Button */}
                    <button 
                      className="w-full px-6 py-4 bg-[#4ABF71] text-white rounded-lg hover:bg-[#4ABF71]/80 disabled:opacity-50 font-medium transition-colors text-xl mb-3" 
                      onClick={handleAcceptStep1Offer} 
                      disabled={loading}
                    >
                      {loading ? 'Loading…' : 'Get 50% off'}
                    </button>
                    
                    {/* Disclaimer */}
                    <p className="text-base text-gray-500 text-center italic">
                      You won't be charged until your next billing date.
                    </p>
                  </div>
                  
                  {/* Separation line */}
                  <div className="border-t border-gray-200 my-5"></div>
                  
                                      {/* Button container - pushed to bottom */}
                    <div className="mt-auto">
                      <button 
                        className="w-full px-6 lg:px-8 py-4 lg:py-4 bg-white border border-purple-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 font-medium transition-colors text-xl lg:text-base" 
                        onClick={handleDeclineStep1Offer} 
                        disabled={loading}
                      >
                        {loading ? 'Loading…' : 'No thanks'}
                      </button>
                    </div>
                </div>
              </div>
            )}

            {step === 'step2OfferVariantA' && (
              <div className="flex flex-col h-full">
                <div className="space-y-7 flex-1">
                  {/* Main Heading */}
                  <h3 className="text-3xl lg:text-3xl font-semibold text-[#41403D] leading-tight">
                    Help us understand how you were<br />
                    using Migrate Mate.
                  </h3>
                  
                  {/* Survey Questions */}
                  <div className="space-y-7">
                    <div className="space-y-3">
                      <label className="text-xl font-semibold text-[#41403D]">
                        How many roles did you <span className="underline">apply</span> for through Migrate Mate?
                      </label>
                      <div className="flex gap-3">
                        {['0', '1-5', '6-20', '20+'].map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => setSurveyData({...surveyData, rolesApplied: option})}
                            className={`flex-1 px-6 py-4 rounded-lg border-2 transition-all text-lg ${
                              surveyData.rolesApplied === option
                                ? 'border-[#9A6FFF] bg-[#9A6FFF] text-white'
                                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-xl font-semibold text-[#41403D]">
                        How many companies did you <span className="underline">email</span> directly?
                      </label>
                      <div className="flex gap-3">
                        {['0', '1-5', '6-20', '20+'].map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => setSurveyData({...surveyData, companiesEmailed: option})}
                            className={`flex-1 px-6 py-4 rounded-lg border-2 transition-all text-lg ${
                              surveyData.companiesEmailed === option
                                ? 'border-[#9A6FFF] bg-[#9A6FFF] text-white'
                                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-xl font-semibold text-[#41403D]">
                        How many different companies did you <span className="underline">interview</span> with?
                      </label>
                      <div className="flex gap-3">
                        {['0', '1-2', '3-5', '5+'].map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => setSurveyData({...surveyData, companiesInterviewed: option})}
                            className={`flex-1 px-6 py-4 rounded-lg border-2 transition-all text-lg ${
                              surveyData.companiesInterviewed === option
                                ? 'border-[#9A6FFF] bg-[#9A6FFF] text-white'
                                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Separation line */}
                <div className="border-t-2 border-gray-200 mt-8 mb-6"></div>
                
                {/* Buttons - pushed to bottom */}
                <div className="mt-auto space-y-3">
                  <button 
                    className="w-full px-8 lg:px-10 py-4 lg:py-4 bg-[#4ABF71] text-white rounded-lg hover:bg-[#4ABF71]/80 disabled:opacity-50 font-medium transition-colors text-lg lg:text-xl" 
                    onClick={handleAcceptStep2Offer} 
                    disabled={loading}
                  >
                    {loading ? 'Loading…' : (
                      <>
                        Get 50% off | $12.50 <span className="line-through">$25</span>
                      </>
                    )}
                  </button>
                  <button 
                    className={`w-full px-8 lg:px-10 py-4 lg:py-4 font-medium transition-colors text-lg lg:text-xl rounded-lg ${
                      surveyData.rolesApplied && surveyData.companiesEmailed && surveyData.companiesInterviewed
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    }`}
                    onClick={handleContinueFromStep2} 
                    disabled={loading || !surveyData.rolesApplied || !surveyData.companiesEmailed || !surveyData.companiesInterviewed}
                  >
                    {loading ? 'Loading…' : 'Continue'}
                  </button>
                </div>
              </div>
            )}



                        {step === 'reason' && (
              <div className="flex flex-col h-full">
                <div className="space-y-7 flex-1">
                  {/* Main Heading */}
                  <h3 className="text-3xl lg:text-3xl font-semibold text-[#41403D] leading-tight">
                    What's the main reason for cancelling?
                  </h3>
                  
                  {/* Subtitle */}
                  <p className="text-xl text-[#41403D] leading-relaxed">
                    Please take a minute to let us know why:
                  </p>
                  
                  {/* Cancellation Reasons */}
                  <div className="space-y-4">
                    {!reason ? (
                      // Show all options when none is selected
                      ['Too expensive', 'Platform not helpful', 'Not enough relevant jobs', 'Decided not to move', 'Other'].map((option) => (
                        <div key={option} className="space-y-2">
                          <label className="flex items-center space-x-3 cursor-pointer">
                            <div className="relative">
                              <input
                                type="radio"
                                name="reason"
                                value={option}
                                checked={reason === option}
                                onChange={(e) => setReason(e.target.value)}
                                className="sr-only"
                              />
                              <div className="w-5 h-5 border-2 border-gray-800 rounded-full flex items-center justify-center">
                              </div>
                            </div>
                            <span className="text-xl text-gray-600">{option}</span>
                          </label>
                        </div>
                      ))
                    ) : (
                      // Show only the selected option with text box
                      <div className="space-y-2">
                        <label className="flex items-center space-x-3 cursor-pointer">
                          <div className="relative">
                            <input
                              type="radio"
                              name="reason"
                              value={reason}
                              checked={true}
                              onChange={() => {}} // No change handler needed when already selected
                              className="sr-only"
                            />
                            <div className="w-5 h-5 border-2 border-gray-800 bg-gray-800 rounded-full flex items-center justify-center">
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            </div>
                          </div>
                          <span className="text-xl text-gray-600">{reason}</span>
                        </label>
                        
                        {/* Additional details textbox for selected option */}
                        <div className="ml-8 mt-3 space-y-2">
                          <label className="text-sm font-medium text-gray-700">
                            {reason === 'Too expensive' && 'What price would you be willing to pay?'}
                            {reason === 'Platform not helpful' && 'What could we have done better?'}
                            {reason === 'Not enough relevant jobs' && 'What types of jobs are you looking for?'}
                            {reason === 'Decided not to move' && 'What changed your mind about moving?'}
                            {reason === 'Other' && 'Please tell us more:'}
                          </label>
                          <textarea
                            value={reason === 'Too expensive' ? willingPrice : 
                                   reason === 'Platform not helpful' ? platformDetails :
                                   reason === 'Not enough relevant jobs' ? jobsDetails :
                                   reason === 'Decided not to move' ? moveDetails :
                                   otherText}
                            onChange={(e) => {
                              if (reason === 'Too expensive') setWillingPrice(e.target.value);
                              else if (reason === 'Platform not helpful') setPlatformDetails(e.target.value);
                              else if (reason === 'Not enough relevant jobs') setJobsDetails(e.target.value);
                              else if (reason === 'Decided not to move') setMoveDetails(e.target.value);
                              else setOtherText(e.target.value);
                            }}
                            placeholder={`Tell us more about ${reason.toLowerCase()}...`}
                            rows={3}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#9A6FFF] focus:outline-none resize-none text-gray-800"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                </div>
                
                {/* Separation line */}
                <div className="border-t border-gray-200 mt-6"></div>
                
                {/* Buttons - pushed to bottom */}
                <div className="mt-auto space-y-3">
                  <button 
                    className="w-full px-6 lg:px-8 py-4 lg:py-4 bg-[#4ABF71] text-white rounded-lg hover:bg-[#4ABF71]/80 disabled:opacity-50 font-medium transition-colors text-xl lg:text-base" 
                    onClick={handleAcceptStep2Offer} 
                    disabled={loading}
                  >
                    {loading ? 'Loading…' : (
                      <>
                        Get 50% off | $12.50 <span className="line-through">$25</span>
                      </>
                    )}
                  </button>
                  <button 
                    className={`w-full px-6 lg:px-8 py-4 lg:py-4 rounded-lg font-medium transition-colors text-lg lg:text-xl ${
                      loading || !reason 
                        ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                        : hasTextInTextBox()
                          ? 'bg-red-600 text-white hover:bg-red-700 cursor-pointer'
                          : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    }`}
                    onClick={continueAfterReason} 
                    disabled={loading || !reason}
                  >
                    {loading ? 'Loading…' : 'Complete cancellation'}
                  </button>
                </div>
              </div>
            )}

            {step === 'foundDetails' && (
              <div className="flex flex-col h-full">
                <div className="space-y-6 flex-1">
                  {/* Main Heading */}
                  <h3 className="text-2xl lg:text-3xl font-semibold text-[#41403D] leading-tight">
                    Congratulations on finding a job!
                  </h3>
                  
                  {/* Form Fields */}
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-lg font-semibold text-[#41403D]">
                        Did you find the job through Migrate Mate?
                      </label>
                      <div className="flex gap-3">
                        {['yes', 'no'].map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => setFoundViaUs(option as 'yes' | 'no')}
                            className={`flex-1 px-6 py-3 rounded-lg border-2 transition-all ${
                              foundViaUs === option
                                ? 'border-[#9A6FFF] bg-[#9A6FFF] text-white'
                                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                            }`}
                          >
                            {option === 'yes' ? 'Yes' : 'No'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-lg font-semibold text-[#41403D]">
                        What type of visa do you have?
                      </label>
                      <div className="flex gap-3 flex-wrap">
                        {['H-1B', 'OPT', 'Green card', 'Citizen', 'Other'].map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => setVisaType(option as any)}
                            className={`px-6 py-3 rounded-lg border-2 transition-all ${
                              visaType === option
                                ? 'border-[#9A6FFF] bg-[#9A6FFF] text-white'
                                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-lg font-semibold text-[#41403D]">
                        Any additional notes?
                      </label>
                      <textarea
                        value={foundNotes}
                        onChange={(e) => setFoundNotes(e.target.value)}
                        placeholder="Tell us more about your experience..."
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#9A6FFF] focus:outline-none resize-none"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
                
                {/* Separation line */}
                <div className="border-t border-gray-200 mt-6"></div>
                
                {/* Buttons - pushed to bottom */}
                <div className="mt-auto space-y-3">
                  <button 
                    className="w-full px-6 lg:px-8 py-4 lg:py-4 bg-[#8952fc] text-white rounded-lg hover:bg-[#7b40fc] disabled:opacity-50 font-medium transition-colors text-lg lg:text-xl" 
                    onClick={submitFoundDetails} 
                    disabled={loading}
                  >
                    {loading ? 'Loading…' : 'Submit & Cancel'}
                  </button>
                </div>
              </div>
            )}

            {step === 'subscriptionCancelled' && (
              <div className="flex flex-col h-full">
                <div className="flex-1 px-6 lg:px-8 py-6 lg:py-8">
                  <div className="space-y-4">
                    {/* Main Heading */}
                    <div className="text-left space-y-4">
                      <h3 className="text-4xl lg:text-4xl font-semibold text-[#41403D] leading-tight">
                        Sorry to see you go, mate.
                      </h3>
                      <p className="text-3xl lg:text-3xl font-semibold text-[#41403D] leading-relaxed">
                        Thanks for being with us, and you're always welcome back.
                      </p>
                    </div>
                    
                    {/* Subscription Details */}
                    <div className="space-y-2 text-left">
                      <p className="text-sm md:text-base font-semibold text-[#41403D] leading-relaxed">
                        Your subscription is set to end on {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}.
                        <br /> You'll still have full access until then. No further charges after that.
                      </p>
                    </div>
                    
                    {/* Reactivation Option */}
                    <div className="text-left">
                      <p className="text-sm md:text-base  font-normal text-[#41403D] leading-relaxed">
                        Changed your mind? You can reactivate anytime before your end date.
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Button - pushed to bottom */}
                <div className="px-6 lg:px-8 pb-6 lg:pb-8">
                  <button 
                    className="w-full px-6 lg:px-8 py-4 lg:py-4 bg-[#8952fc] text-white rounded-lg hover:bg-[#7b40fc] disabled:opacity-50 font-medium transition-colors text-xl lg:text-base" 
                    onClick={onClose}
                  >
                    Back to Jobs
                  </button>
                </div>
              </div>
            )}

            {step === 'foundJobStep1' && (
              <div className="flex flex-col h-full">
                <div className="space-y-6 flex-1">
                  {/* Main Heading */}
                  <h3 className="text-3xl lg:text-4xl font-bold text-[#41403D] leading-tight">
                    Congrats on the new role! 🎉
                  </h3>
                  
                  {/* Survey Questions */}
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-lg font-semibold text-[#41403D]">
                        Did you find this job with MigrateMate?*
                      </label>
                      <div className="flex gap-3">
                        {['Yes', 'No'].map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => setFoundJobViaMigrateMate(option)}
                            className={`flex-1 px-6 py-3 rounded-lg border-2 transition-all ${
                              foundJobViaMigrateMate === option
                                ? 'border-[#9A6FFF] bg-[#9A6FFF] text-white'
                                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-lg font-semibold text-[#41403D]">
                        How many roles did you apply for through Migrate Mate?*
                      </label>
                      <div className="flex gap-3">
                        {['0', '1-5', '6-20', '20+'].map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => setFoundJobRolesApplied(option)}
                            className={`flex-1 px-6 py-3 rounded-lg border-2 transition-all ${
                              foundJobRolesApplied === option
                                ? 'border-[#9A6FFF] bg-[#9A6FFF] text-white'
                                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-lg font-semibold text-[#41403D]">
                        How many companies did you email directly?*
                      </label>
                      <div className="flex gap-3">
                        {['0', '1-5', '6-20', '20+'].map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => setFoundJobCompaniesEmailed(option)}
                            className={`flex-1 px-6 py-3 rounded-lg border-2 transition-all ${
                              foundJobCompaniesEmailed === option
                                ? 'border-[#9A6FFF] bg-[#9A6FFF] text-white'
                                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-lg font-semibold text-[#41403D]">
                        How many different companies did you interview with?*
                      </label>
                      <div className="flex gap-3">
                        {['0', '1-2', '3-5', '5+'].map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => setFoundJobCompaniesInterviewed(option)}
                            className={`flex-1 px-6 py-3 rounded-lg border-2 transition-all ${
                              foundJobCompaniesInterviewed === option
                                ? 'border-[#9A6FFF] bg-[#9A6FFF] text-white'
                                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Separation line */}
                <div className="border-t border-gray-200 mt-6"></div>
                
                {/* Continue Button - pushed to bottom */}
                <div className="mt-auto space-y-3">
                  <button 
                    className={`w-full px-8 lg:px-10 py-4 lg:py-4 rounded-lg font-medium transition-colors text-lg lg:text-xl ${
                      foundJobViaMigrateMate && foundJobRolesApplied && foundJobCompaniesEmailed && foundJobCompaniesInterviewed
                        ? 'bg-[#4ABF71] text-white hover:bg-[#4ABF71]/80'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                    onClick={() => {
                      setStep('foundJobStep2');
                    }}
                    disabled={!foundJobViaMigrateMate || !foundJobRolesApplied || !foundJobCompaniesEmailed || !foundJobCompaniesInterviewed}
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {step === 'foundJobStep2' && (
              <div className="flex flex-col h-full">
                <div className="space-y-6 flex-1">
                  {/* Main Heading */}
                  <h3 className="text-3xl lg:text-4xl font-bold text-[#41403D] leading-tight">
                    What's one thing you wish we could've helped you with?
                  </h3>
                  
                  {/* Description */}
                  <p className="text-lg text-[#41403D] leading-relaxed">
                    We're always looking to improve, your thoughts can help us make Migrate Mate more useful for others.
                  </p>
                  
                  {/* Text Input */}
                  <div className="space-y-2">
                    <textarea
                      value={foundJobFeedback}
                      onChange={(e) => setFoundJobFeedback(e.target.value)}
                      placeholder="Min 25 characters (0/25)"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#9A6FFF] focus:border-transparent"
                      rows={6}
                      minLength={25}
                    />
                    <div className="text-sm text-gray-500 text-right">
                      Min 25 characters ({foundJobFeedback.length}/25)
                    </div>
                  </div>
                </div>
                
                {/* Separation line */}
                <div className="border-t border-gray-200 mt-6"></div>
                
                {/* Continue Button - pushed to bottom */}
                <div className="mt-auto space-y-3">
                  <button 
                    className={`w-full px-8 lg:px-10 py-4 lg:py-4 rounded-lg font-medium transition-colors text-lg lg:text-xl ${
                      foundJobFeedback.length >= 25
                        ? 'bg-[#4ABF71] text-white hover:bg-[#4ABF71]/80'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                    onClick={() => {
                      console.log('Step 2 continue button clicked');
                      console.log('foundJobViaMigrateMate:', foundJobViaMigrateMate);
                      console.log('foundJobFeedback length:', foundJobFeedback.length);
                      
                      // Navigate to Step 3 variant based on whether they found job with MigrateMate
                      if (foundJobViaMigrateMate === 'Yes') {
                        console.log('Navigating to Variant A');
                        setStep('foundJobStep3VariantA');
                      } else {
                        console.log('Navigating to Variant B');
                        setStep('foundJobStep3VariantB');
                      }
                    }}
                    disabled={foundJobFeedback.length < 25}
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {step === 'foundJobStep3VariantA' && (
              <div className="flex flex-col h-full">
                <div className="space-y-6 flex-1">
                  {/* Main Heading */}
                  <h3 className="text-3xl lg:text-4xl font-bold text-[#41403D] leading-tight">
                    We helped you land the job, now let's help you secure your visa.
                  </h3>
                  
                  {/* Question */}
                  <div className="space-y-3">
                    <label className="text-lg font-semibold text-[#41403D]">
                      Is your company providing an immigration lawyer to help with your visa?*
                    </label>
                    {!foundJobVisaLawyer ? (
                      <div className="space-y-3">
                        {['Yes', 'No'].map((option) => (
                          <label key={option} className="flex items-center gap-3 cursor-pointer">
                            <div className="relative">
                              <input
                                type="radio"
                                name="visaLawyer"
                                value={option}
                                checked={foundJobVisaLawyer === option}
                                onChange={() => setFoundJobVisaLawyer(option)}
                                className="sr-only"
                              />
                              <div className={`w-5 h-5 border-2 rounded-full flex items-center justify-center ${
                                foundJobVisaLawyer === option
                                  ? 'border-gray-800'
                                  : 'border-gray-300'
                              }`}>
                                {foundJobVisaLawyer === option && (
                                  <div className="w-2.5 h-2.5 bg-gray-800 rounded-full"></div>
                                )}
                              </div>
                            </div>
                            <span className="text-[#41403D] font-medium">{option}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-gray-800 rounded-full flex items-center justify-center">
                          <div className="w-2.5 h-2.5 bg-gray-800 rounded-full"></div>
                        </div>
                        <span className="text-[#41403D] font-medium">{foundJobVisaLawyer}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Conditional Text Input for "Yes" */}
                  {foundJobVisaLawyer === 'Yes' && (
                    <div className="space-y-3">
                      <label className="text-lg font-semibold text-[#41403D]">
                        What visa will you be applying for?*
                      </label>
                      <input
                        type="text"
                        value={foundJobVisaType}
                        onChange={(e) => setFoundJobVisaType(e.target.value)}
                        placeholder="Enter visa type"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9A6FFF] focus:border-transparent"
                      />
                    </div>
                  )}
                  
                  {/* Conditional Text Input for "No" */}
                  {foundJobVisaLawyer === 'No' && (
                    <div className="space-y-3">
                      <p className="text-lg text-[#41403D] leading-relaxed">
                        We can connect you with one of our trusted partners.
                      </p>
                      <label className="text-lg font-semibold text-[#41403D]">
                        Which visa would you like to apply for?*
                      </label>
                      <input
                        type="text"
                        value={foundJobVisaType}
                        onChange={(e) => setFoundJobVisaType(e.target.value)}
                        placeholder="Enter visa type"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9A6FFF] focus:border-transparent"
                      />
                    </div>
                  )}
                </div>
                
                {/* Separation line */}
                <div className="border-t border-gray-200 mt-6"></div>
                
                {/* Complete Cancellation Button - pushed to bottom */}
                <div className="mt-auto space-y-3">
                  <button 
                    className={`w-full px-8 lg:px-10 py-4 lg:py-4 rounded-lg font-medium transition-colors text-lg lg:text-xl ${
                      foundJobVisaLawyer && (foundJobVisaLawyer === 'No' || foundJobVisaType.trim())
                        ? 'bg-[#4ABF71] text-white hover:bg-[#4ABF71]/80'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                    onClick={() => {
                      // Navigate to final cancellation state based on visa lawyer selection
                      if (foundJobVisaLawyer === 'Yes') {
                        setStep('foundJobCancelledNoHelp');
                      } else {
                        setStep('foundJobCancelledWithHelp');
                      }
                    }}
                    disabled={!foundJobVisaLawyer || (foundJobVisaLawyer === 'Yes' && !foundJobVisaType.trim())}
                  >
                    Complete cancellation
                  </button>
                </div>
              </div>
            )}

            {step === 'foundJobStep3VariantB' && (
              <div className="flex flex-col h-full">
                <div className="space-y-6 flex-1">
                  {/* Main Heading */}
                  <h3 className="text-3xl lg:text-4xl font-bold text-[#41403D] leading-tight">
                    You landed the job! That's what we live for.
                  </h3>
                  
                  {/* Descriptive Text */}
                  <p className="text-lg text-[#41403D] leading-relaxed">
                    Even if it wasn't through Migrate Mate, let us help get your visa sorted.
                  </p>
                  
                  {/* Question */}
                  <div className="space-y-3">
                    <label className="text-lg font-semibold text-[#41403D]">
                      Is your company providing an immigration lawyer to help with your visa?
                    </label>
                    {!foundJobVisaLawyer ? (
                      <div className="space-y-3">
                        {['Yes', 'No'].map((option) => (
                          <label key={option} className="flex items-center gap-3 cursor-pointer">
                            <div className="relative">
                              <input
                                type="radio"
                                name="visaLawyer"
                                value={option}
                                checked={foundJobVisaLawyer === option}
                                onChange={() => setFoundJobVisaLawyer(option)}
                                className="sr-only"
                              />
                              <div className={`w-5 h-5 border-2 rounded-full flex items-center justify-center ${
                                foundJobVisaLawyer === option
                                  ? 'border-gray-800'
                                  : 'border-gray-300'
                              }`}>
                                {foundJobVisaLawyer === option && (
                                  <div className="w-2.5 h-2.5 bg-gray-800 rounded-full"></div>
                                )}
                              </div>
                            </div>
                            <span className="text-[#41403D] font-medium">{option}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-gray-800 rounded-full flex items-center justify-center">
                          <div className="w-2.5 h-2.5 bg-gray-800 rounded-full"></div>
                        </div>
                        <span className="text-[#41403D] font-medium">{foundJobVisaLawyer}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Conditional Text Input for "Yes" */}
                  {foundJobVisaLawyer === 'Yes' && (
                    <div className="space-y-3">
                      <label className="text-lg font-semibold text-[#41403D]">
                        What visa will you be applying for?*
                      </label>
                      <input
                        type="text"
                        value={foundJobVisaType}
                        onChange={(e) => setFoundJobVisaType(e.target.value)}
                        placeholder="Enter visa type"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9A6FFF] focus:border-transparent"
                      />
                    </div>
                  )}
                  
                  {/* Conditional Text Input for "No" */}
                  {foundJobVisaLawyer === 'No' && (
                    <div className="space-y-3">
                      <p className="text-lg text-[#41403D] leading-relaxed">
                        We can connect you with one of our trusted partners.
                      </p>
                      <label className="text-lg font-semibold text-[#41403D]">
                        Which visa would you like to apply for?*
                      </label>
                      <input
                        type="text"
                        value={foundJobVisaType}
                        onChange={(e) => setFoundJobVisaType(e.target.value)}
                        placeholder="Enter visa type"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9A6FFF] focus:border-transparent"
                      />
                    </div>
                  )}
                </div>
                
                {/* Separation line */}
                <div className="border-t border-gray-200 mt-6"></div>
                
                {/* Complete Cancellation Button - pushed to bottom */}
                <div className="mt-auto space-y-3">
                  <button 
                    className={`w-full px-8 lg:px-10 py-4 lg:py-4 rounded-lg font-medium transition-colors text-lg lg:text-xl ${
                      foundJobVisaLawyer && (foundJobVisaLawyer === 'No' || foundJobVisaType.trim())
                        ? 'bg-[#4ABF71] text-white hover:bg-[#4ABF71]/80'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                    onClick={() => {
                      // Navigate to final cancellation state based on visa lawyer selection
                      if (foundJobVisaLawyer === 'Yes') {
                        setStep('foundJobCancelledNoHelp');
                      } else {
                        setStep('foundJobCancelledWithHelp');
                      }
                    }}
                    disabled={!foundJobVisaLawyer || (foundJobVisaLawyer === 'Yes' && !foundJobVisaType.trim())}
                  >
                    Complete cancellation
                  </button>
                </div>
              </div>
            )}

            {step === 'foundJobCancelledNoHelp' && (
              <div className="flex flex-col h-full">
                <div className="space-y-6 flex-1">
                  {/* Main Heading */}
                  <h3 className="text-3xl lg:text-4xl font-bold text-[#41403D] leading-tight">
                    All done, your cancellation's been processed.
                  </h3>
                  
                  {/* Body Text */}
                  <p className="text-lg text-[#41403D] leading-relaxed">
                    We're stoked to hear you've landed a job and sorted your visa. Big congrats from the team. 🙌
                  </p>
                </div>
                
                {/* Separation line */}
                <div className="border-t border-gray-200 mt-6"></div>
                
                {/* Finish Button - pushed to bottom */}
                <div className="mt-auto space-y-3">
                  <button 
                    className="w-full px-8 lg:px-10 py-4 lg:py-4 bg-[#9A6FFF] text-white rounded-lg hover:bg-[#8952fc] font-medium transition-colors text-lg lg:text-xl"
                    onClick={onClose}
                  >
                    Finish
                  </button>
                </div>
              </div>
            )}

            {step === 'foundJobCancelledWithHelp' && (
              <div className="flex flex-col h-full">
                {/* Content */}
                <div className="flex-1 flex flex-col justify-center px-6 lg:px-8 py-4 lg:py-6">
                  <div className="space-y-6">
                    {/* Success Icon */}
                    <div className="flex justify-center">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                    
                    {/* Main Heading */}
                    <div className="text-center">
                      <h3 className="text-2xl lg:text-3xl font-bold text-[#41403D] leading-tight">
                        Congratulations on your new role!
                      </h3>
                      <p className="text-lg text-[#41403D] mt-2">
                        We're thrilled you found success with MigrateMate
                      </p>
                    </div>
                    
                    {/* Contact Info */}
                    <div className="bg-gray-50 rounded-lg p-6">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <Image 
                            src={profileSrc} 
                            alt="Mihailo Bozic" 
                            width={64} 
                            height={64}
                            className="object-cover rounded-full"
                          />
                        </div>
                        <div>
                          <h4 className="text-xl font-semibold text-[#41403D]">Mihailo Bozic</h4>
                          <p className="text-lg text-[#41403D]">mihailo@migratemate.co</p>
                        </div>
                      </div>
                      
                      <p className="text-lg text-[#41403D] leading-relaxed mt-4">
                        I'll be reaching out soon to help with the visa side of things. We've got your back, whether it's questions, paperwork, or just figuring out your options. Keep an eye on your inbox, I'll be in touch shortly.
                      </p>
                    </div>
                    
                    {/* Separation line */}
                    <div className="border-t border-gray-200 mt-6"></div>
                    
                    {/* Finish Button - pushed to bottom */}
                    <div className="mt-auto space-y-3">
                      <button 
                        className="w-full px-8 lg:px-10 py-4 lg:py-4 bg-[#9A6FFF] text-white rounded-lg hover:bg-[#8952fc] font-medium transition-colors text-lg lg:text-xl"
                        onClick={onClose}
                      >
                        Finish
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 'offerAccepted' && (
              <div className="flex flex-col h-full">
                {/* Content */}
                <div className="flex-1 flex flex-col justify-center px-6 lg:px-8 py-4 lg:py-6">
                  <div className="space-y-4">
                    {/* Main Heading */}
                    <h3 className="text-2xl lg:text-3xl font-bold text-[#41403D] leading-tight">
                      Great choice, mate!
                    </h3>
                    
                    {/* Sub-heading */}
                    <p className="text-lg text-xl text-[#41403D] leading-relaxed">
                      You're still on the path to your dream role. <span className="font-semibold">Let's make it happen together!</span>
                    </p>
                    
                    {/* Subscription Details */}
                    <div className="space-y-2">
                      <p className="text-sm lg:text-base text-[#41403D]">
                        You've got <span className="font-semibold">30 days</span> left on your current plan.
                      </p>
                      <p className="text-sm lg:text-base text-[#41403D]">
                        Starting from <span className="font-semibold">{new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</span>, your monthly payment will be <span className="font-semibold">$12.50</span>.
                      </p>
                      <p className="text-sm lg:text-base text-[#41403D]">
                        You can cancel anytime before then.
                      </p>
                    </div>
                    
                    {/* Call to Action Button */}
                    <div className="pt-3">
                      <button 
                        className="w-full px-6 py-3 bg-[#9A6FFF] text-white rounded-lg hover:bg-[#8952fc] disabled:opacity-50 font-medium transition-colors text-lg" 
                        onClick={onClose}
                      >
                        Land your dream role
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Desktop: Image banner on the right */}
          <div className="hidden lg:block w-1/2 p-4">
            <div className="w-full h-full relative rounded-lg overflow-hidden">
              <Image 
                src={heroSrc} 
                alt="New York City skyline" 
                fill
                className="object-cover"
                priority 
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

