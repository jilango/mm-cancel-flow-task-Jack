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
  const [step, setStep] = useState<'start' | 'step1Offer' | 'step2OfferVariantA' | 'offer' | 'reason' | 'foundDetails' | 'done'>('start');


  const [data, setData] = useState<StartResp | null>(null);

  // Form state
  const [reason, setReason] = useState('');
  const [willingPrice, setWillingPrice] = useState<number | ''>('');
  const [otherText, setOtherText] = useState('');
  const [foundViaUs, setFoundViaUs] = useState<'yes' | 'no' | ''>('');
  const [visaType, setVisaType] = useState<'H-1B' | 'OPT' | 'Green card' | 'Citizen' | 'Other' | ''>('');
  const [foundNotes, setFoundNotes] = useState('');
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
      // A/B Testing: Variant B shows offer, Variant A goes directly to found details
      if (payload.variant === 'B') {
        setStep('offer');
      } else {
        setStep('foundDetails');
      }
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
          progress: [true, true, true], // ●●● (all steps completed, step 3 current)
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
      
      case 'done':
        return {
          title: 'Complete',
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
      // Go directly to Step 1 Offer
      setStep('step1Offer');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong starting cancellation');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptStep1Offer = async () => {
    // Handle accepting the 50% off offer
    setStep('done');
  };

  const handleDeclineStep1Offer = async () => {
    // Go to Step 2 (User engagement survey)
    setStep('step2OfferVariantA');
  };

  const handleAcceptStep2Offer = async () => {
    // Handle accepting the 50% off offer from step 2
    setStep('done');
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
      
      setStep('done');
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
      
      setStep('done');
      setTimeout(onClose, 800);
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
      
      setStep('done');
      setTimeout(onClose, 800);
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
      <div className="relative w-full max-w-none lg:max-w-7xl bg-white rounded-t-lg lg:rounded-lg shadow-xl overflow-hidden h-full lg:h-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="w-24">
            {step !== 'start' && (
              <button 
                onClick={goToPreviousStep}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Back</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-6">
            <h2 className="text-xl font-semibold text-gray-800 text-center whitespace-nowrap">
              Subscription Cancellation
            </h2>
            {step !== 'start' && (
              <div className="flex items-center gap-3">
                <div className="flex gap-2">
                  {getStepInfo(step, 1).progress.map((isCompleted, index) => (
                    <div 
                      key={index}
                      className={`w-8 h-2 rounded-full ${
                        isCompleted ? 'bg-green-500' : index === getCurrentStepIndex(step) ? 'bg-gray-500' : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-600">{getStepInfo(step, 1).title}</span>
              </div>
            )}
          </div>

          <div className="w-24 flex justify-end">
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Main content area */}
        <div className="flex flex-col lg:flex-row lg:gap-0 h-full lg:h-auto">
          {/* Mobile: Image banner above content */}
          <div className="lg:hidden w-full px-4 pt-1">
            <div className="w-full h-60 relative rounded-lg overflow-hidden">
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

          {/* Content area */}
          <div className="flex-1 px-6 pt-3 pb-0 lg:py-6 flex flex-col overflow-y-auto">
            {/* Error display */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg" aria-live="polite">
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}

            {step === 'start' && (
              <div className="space-y-4 lg:space-y-6">
                {/* Greeting */}
                <h3 className="text-4xl lg:text-3xl font-semibold text-gray-800 leading-tight">
                  Hey mate,<br />
                  Quick one before you go.
                </h3>
                
                {/* Question */}
                <h3 className="text-4xl lg:text-3xl font-semibold italic text-gray-800 leading-tight">
                  Have you found a job yet?
                </h3>
                
                {/* Descriptive text */}
                <p className="text-xl lg:text-base text-gray-800 leading-relaxed">
                  Whatever your answer, we just want to help you take the next step. With visa support, or by hearing how we can do better.
                </p>
                
                {/* Separation line */}
                <div className="border-t border-gray-200"></div>
                
                {/* Buttons */}
                <div className="space-y-3">
                  <button 
                    className="w-full px-6 lg:px-8 py-4 lg:py-4 bg-white border border-gray-300 text-[#41403D] rounded-lg hover:bg-gray-50 disabled:opacity-50 font-medium transition-colors text-xl lg:text-base" 
                    onClick={handleFoundJob} 
                    disabled={loading}
                  >
                    {loading ? 'Loading…' : 'Yes, I\'ve found a job'}
                  </button>
                  <button 
                    className="w-full px-6 lg:px-8 py-4 lg:py-4 bg-white border border-gray-300 text-[#41403D] rounded-lg hover:bg-gray-200 disabled:opacity-50 font-medium transition-colors text-xl lg:text-base" 
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



                <div className="space-y-4 lg:space-y-6">
                  {/* Main Heading */}
                  <h3 className="text-4xl lg:text-4xl font-semibold text-gray-800 leading-tight">
                    We built this to help you land the job,
                    this makes it a little easier.
                  </h3>
                  
                  {/* Descriptive Text */}
                  <h3 className="text-3xl lg:text-2xl font-semibold text-gray-700 leading-relaxed">
                    We've been there and we're here to help you.
                  </h3>
                  
                  {/* Offer */}
                  <div className="bg-[#EBE1FE] p-6 rounded-lg border border-[#9A6FFF] text-center">
                    <h4 className="text-3xl lg:text-3xl font-semibold text-gray-800 mb-2">
                      Here's <span className="underline font-bold">50% off</span> until you find a job.
                    </h4>
                    <div className="flex items-center justify-center gap-3 mb-4">
                      <span className="text-3xl lg:text-3xl font-bold text-[#9A6FFF]">$12.50</span>
                      <span className="text-lg lg:text-lg text-gray-500">/month</span>
                      <span className="text-lg lg:text-lg text-gray-400 line-through">$25/month</span>
                    </div>
                    
                    {/* Call to Action Button */}
                    <button 
                      className="w-full px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium transition-colors text-lg mb-3" 
                      onClick={handleAcceptStep1Offer} 
                      disabled={loading}
                    >
                      {loading ? 'Loading…' : 'Get 50% off'}
                    </button>
                    
                    {/* Disclaimer */}
                    <p className="text-sm text-gray-500 text-center italic">
                      You wont be charged until your next billing date.
                    </p>
                  </div>
                  
                  {/* Separation line */}
                  <div className="border-t border-gray-200 my-6"></div>
                  
                  {/* Cancellation Button */}
                  <button 
                    className="w-full px-6 lg:px-8 py-4 lg:py-4 bg-white border border-purple-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 font-medium transition-colors text-xl lg:text-base" 
                    onClick={handleDeclineStep1Offer} 
                    disabled={loading}
                  >
                    {loading ? 'Loading…' : 'No thanks'}
                  </button>
                </div>
              </div>
            )}



            {step === 'step2OfferVariantA' && (
              <div className="flex flex-col h-full">
                <div className="space-y-6">
                  {/* Main Heading */}
                  <h3 className="text-3xl lg:text-3xl font-semibold text-gray-800 leading-tight">
                    Help us understand how you were<br />
                    using Migrate Mate.
                  </h3>
                  
                  {/* Survey Questions */}
                  <div className="space-y-8">
                    <div className="space-y-3">
                      <label className="text-lg font-semibold text-[#41403D]">
                        How many roles did you <span className="underline">apply</span> for through Migrate Mate?
                      </label>
                      <div className="flex gap-3">
                        {['0', '1-5', '6-20', '20+'].map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => setSurveyData({...surveyData, rolesApplied: option})}
                            className={`flex-1 px-6 py-3 rounded-lg border-2 transition-all ${
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
                      <label className="text-lg font-semibold text-[#41403D]">
                        How many companies did you <span className="underline">email</span> directly?
                      </label>
                      <div className="flex gap-3">
                        {['0', '1-5', '6-20', '20+'].map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => setSurveyData({...surveyData, companiesEmailed: option})}
                            className={`flex-1 px-6 py-3 rounded-lg border-2 transition-all ${
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
                      <label className="text-lg font-semibold text-[#41403D]">
                        How many different companies did you <span className="underline">interview</span> with?
                      </label>
                      <div className="flex gap-3">
                        {['0', '1-2', '3-5', '5+'].map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => setSurveyData({...surveyData, companiesInterviewed: option})}
                            className={`flex-1 px-6 py-3 rounded-lg border-2 transition-all ${
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
                    className="w-full px-8 lg:px-10 py-4 lg:py-4 bg-[#4ABF71] text-white rounded-lg hover:bg-[#4ABF71]/80 disabled:opacity-50 font-medium transition-colors text-xl lg:text-base" 
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
                    className={`w-full px-8 lg:px-10 py-4 lg:py-4 font-medium transition-colors text-xl lg:text-base rounded-lg ${
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
                <div className="space-y-6">
                  {/* Main Heading */}
                  <h3 className="text-3xl lg:text-3xl font-semibold text-gray-800 leading-tight">
                    What's the main reason for cancelling?
                  </h3>
                  
                  {/* Subtitle */}
                  <p className="text-lg text-gray-600 leading-relaxed">
                    Please take a minute to let us know why:
                  </p>
                  
                  {/* Cancellation Reasons */}
                  <div className="space-y-4">
                    <div className="space-y-3">
                      {['Too expensive', 'Platform not helpful', 'Not enough relevant jobs', 'Decided not to move', 'Other'].map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setReason(option)}
                          className={`w-full px-6 py-3 rounded-lg border-2 transition-all text-left ${
                            reason === option
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
                    className="w-full px-6 lg:px-8 py-4 lg:py-4 bg-gray-400 text-gray-200 rounded-lg cursor-not-allowed font-medium transition-colors text-xl lg:text-base" 
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
                <div className="space-y-6">
                  {/* Main Heading */}
                  <h3 className="text-3xl lg:text-3xl font-semibold text-gray-800 leading-tight">
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
                    className="w-full px-6 lg:px-8 py-4 lg:py-4 bg-[#8952fc] text-white rounded-lg hover:bg-[#7b40fc] disabled:opacity-50 font-medium transition-colors text-xl lg:text-base" 
                    onClick={submitFoundDetails} 
                    disabled={loading}
                  >
                    {loading ? 'Loading…' : 'Submit & Cancel'}
                  </button>
                </div>
              </div>
            )}

            {step === 'done' && (
              <div className="flex flex-col h-full">
                <div className="space-y-4 lg:space-y-6 text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-3xl font-semibold text-gray-800">Thank you!</h3>
                  <p className="text-xl text-gray-700 leading-relaxed">
                    We've received your cancellation request. We'll process it within 24 hours.
                  </p>
                </div>
                
                {/* Button - pushed to bottom */}
                <div className="mt-auto">
                  <button 
                    className="w-full px-6 lg:px-8 py-4 lg:py-4 bg-[#8952fc] text-white rounded-lg hover:bg-[#7b40fc] disabled:opacity-50 font-medium transition-colors text-xl lg:text-base" 
                    onClick={onClose}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}








          </div>

          {/* Right side - Hero image (Desktop only) */}
          <div className="hidden lg:block w-full lg:w-1/2 lg:flex-1 relative p-4">
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

