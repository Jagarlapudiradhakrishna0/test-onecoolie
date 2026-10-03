import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import axios from '../../api/axios';
import { toast } from 'react-hot-toast';
import {
  AlertTriangle,
  CheckCircle2,
  X,
  ArrowRight,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const UNASSIGNED_REASONS = [
  { id: 'TRAIN_CANCELLED', label: 'Train cancelled' },
  { id: 'TRAIN_SCHEDULE_CHANGED', label: 'Train schedule changed' },
  { id: 'JOURNEY_DATE_CHANGED', label: 'Journey date changed' },
  { id: 'JOURNEY_TIME_CHANGED', label: 'Journey time changed' },
  { id: 'DESTINATION_CHANGED', label: 'Destination changed' },
  { id: 'DUPLICATE_BOOKING', label: 'Duplicate booking' },
  { id: 'BOOKED_BY_MISTAKE', label: 'Booked by mistake' },
  { id: 'PERSONAL_EMERGENCY', label: 'Personal emergency' },
  { id: 'CHANGE_OF_PLANS', label: 'Change of travel plans' },
  { id: 'OTHER', label: 'Other', requiresDetails: true }
];

const ASSIGNED_REASONS = [
  { id: 'TRAIN_CANCELLED', label: 'Train cancelled' },
  { id: 'TRAIN_SCHEDULE_CHANGED', label: 'Train schedule changed' },
  { id: 'JOURNEY_DATE_CHANGED', label: 'Journey date changed' },
  { id: 'JOURNEY_TIME_CHANGED', label: 'Journey time changed' },
  { id: 'DESTINATION_CHANGED', label: 'Destination changed' },
  { id: 'PERSONAL_EMERGENCY', label: 'Emergency' },
  { id: 'DUPLICATE_BOOKING', label: 'Duplicate booking' },
  { id: 'BOOKED_BY_MISTAKE', label: 'Booking made by mistake' },
  { id: 'OTHER_GENUINE', label: 'Other genuine travel reason', requiresDetails: true },
  { id: 'VOLUNTARY_CANCEL', label: 'I simply want to cancel' }
];

function isMeaningfulReason(text) {
  if (!text || typeof text !== 'string') return false;
  const clean = text.trim();
  if (clean.length < 10) return false;
  if (/^(.)\1+$/.test(clean)) return false;
  if (/^(.{2})\1+$/.test(clean)) return false;
  const lower = clean.toLowerCase();
  const mash = ['asdf', 'hjkl', 'qwerty', 'zxcv', '12345', 'test test', 'none', 'nothing'];
  if (mash.some(p => lower === p || lower.replace(/[^a-z0-9]/g, '') === p)) return false;
  const uniqueChars = new Set(clean.toLowerCase().replace(/\s+/g, ''));
  if (uniqueChars.size < 4) return false;
  return true;
}

export default function CancellationModal({
  isOpen = true,
  onClose,
  booking,
  onCancelled,
  onSuccess,
  onRequestRebook
}) {
  const { t } = useLanguage();
  const [step, setStep] = useState('decision');

  const getReasonLabel = (reason) => {
    switch (reason.id) {
      case 'TRAIN_CANCELLED': return t('cancellation.trainCancelled') || reason.label;
      case 'TRAIN_SCHEDULE_CHANGED': return t('cancellation.scheduleChanged') || reason.label;
      case 'JOURNEY_DATE_CHANGED': return t('cancellation.dateChanged') || reason.label;
      case 'JOURNEY_TIME_CHANGED': return t('cancellation.timeChanged') || reason.label;
      case 'DESTINATION_CHANGED': return t('cancellation.destinationChanged') || reason.label;
      case 'DUPLICATE_BOOKING': return t('cancellation.duplicateBooking') || reason.label;
      case 'BOOKED_BY_MISTAKE': return t('cancellation.mistakeBooking') || reason.label;
      case 'PERSONAL_EMERGENCY': return t('cancellation.emergency') || reason.label;
      case 'CHANGE_OF_PLANS': return t('cancellation.plansChanged') || reason.label;
      case 'OTHER': return t('cancellation.other') || reason.label;
      case 'OTHER_GENUINE': return t('cancellation.otherGenuine') || reason.label;
      case 'VOLUNTARY_CANCEL': return t('cancellation.voluntaryCancel') || reason.label;
      default: return reason.label;
    }
  };
  const [selectedReason, setSelectedReason] = useState('');
  const [reasonDetails, setReasonDetails] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [quote, setQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cancellationResult, setCancellationResult] = useState(null);

  // FIX: now includes 'assigned' and 'in_service' statuses
  const isAssigned = useMemo(() => {
    if (!booking) return false;
    const status = String(booking.booking_status || booking.status || '').toLowerCase();
    return Boolean(
      booking.assistant_id &&
      ['assigned', 'accepted', 'arriving', 'in_service'].includes(status)
    );
  }, [booking]);

  const reasonsList = isAssigned ? ASSIGNED_REASONS : UNASSIGNED_REASONS;

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent background scrolling while modal is open
  useEffect(() => {
    if (!isOpen || !booking) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, booking]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSubmitting) {
        e.preventDefault();
        if (onClose) onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  useEffect(() => {
    if (!isOpen || !booking) return;
    setSelectedReason('');
    setReasonDetails('');
    setReasonError('');
    setQuote(null);
    setCancellationResult(null);
    setIsSubmitting(false);
    setStep(isAssigned ? 'decision' : 'reason');
  }, [isOpen, booking, isAssigned]);

  const fallbackCalculateQuote = useCallback(() => {
    const originalAmount = Number(booking.total_price || 0);
    const isVoluntary = selectedReason === 'VOLUNTARY_CANCEL';
    let refundPercent = 100;
    let chargePercent = 0;
    if (isAssigned && isVoluntary) {
      refundPercent = 70;
      chargePercent = 30;
    }
    const refundAmount = Math.round((originalAmount * refundPercent) / 100 * 100) / 100;
    const cancellationCharge = Math.round((originalAmount * chargePercent) / 100 * 100) / 100;
    const isCash = (booking.payment_method || '').toLowerCase() === 'cash';
    setQuote({
      isAssigned,
      originalAmount,
      refundPercent,
      cancellationChargePercent: chargePercent,
      refundAmount,
      cancellationCharge,
      isCash,
      reasonNote: isAssigned && isVoluntary
        ? 'Voluntary cancellation applies a 30% charge and 70% refund.'
        : 'Eligible cancellation receives a 100% refund.',
      policyNotice: isCash
        ? 'Cash on Delivery booking. No online gateway refund is required.'
        : 'Online booking refund will be credited via your payment gateway.'
    });
  }, [booking, isAssigned, selectedReason]);

  const handleProceedToReview = useCallback(async () => {
    if (!selectedReason) {
      setReasonError('Please select a reason for your cancellation.');
      return;
    }
    const currentItem = reasonsList.find(r => r.id === selectedReason);
    if (currentItem?.requiresDetails) {
      if (!isMeaningfulReason(reasonDetails)) {
        setReasonError('Please provide a meaningful explanation (at least 10 characters).');
        return;
      }
    }
    setReasonError('');
    setQuoteLoading(true);
    setStep('review');
    try {
      const targetId = booking.id || booking.booking_id;
      const res = await axios.post(`/bookings/${targetId}/cancel-quote`, {
        reasonCategory: selectedReason,
        reasonDetails: reasonDetails.trim()
      });
      if (res.data?.success && res.data?.quote) {
        setQuote(res.data.quote);
      } else {
        fallbackCalculateQuote();
      }
    } catch (err) {
      fallbackCalculateQuote();
    } finally {
      setQuoteLoading(false);
    }
  }, [selectedReason, reasonDetails, reasonsList, booking, fallbackCalculateQuote]);

  // FIX: isSubmitting hard guard prevents double-submission regardless of how button is clicked
  const handleConfirmCancel = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const targetId = booking.id || booking.booking_id;
      const res = await axios.post(`/bookings/${targetId}/cancel`, {
        reasonCategory: selectedReason,
        reasonDetails: reasonDetails.trim()
      });
      const updated = res.data?.booking || res.data;
      setCancellationResult({
        message: res.data?.message || 'Booking cancelled successfully.',
        refundAmount: quote?.refundAmount ?? (res.data?.quote?.refundAmount ?? 0),
        cancellationCharge: quote?.cancellationCharge ?? (res.data?.quote?.cancellationCharge ?? 0),
        booking: updated
      });
      setStep('success');
      toast.success('Assistance booking cancelled.');
      if (onCancelled) onCancelled(updated);
      if (onSuccess) onSuccess(updated);
    } catch (err) {
      const msg = err.response?.data?.message || 'Cancellation failed. Please try again.';
      toast.error(msg);
      setReasonError(msg);
      setStep('review');
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, booking, selectedReason, reasonDetails, quote, onCancelled, onSuccess]);

  // FIX: stable callback — no inline arrow in JSX
  const handleSelectReason = useCallback((id) => {
    setSelectedReason(id);
    setReasonError('');
  }, []);

  if (!isOpen || !booking || !mounted || typeof document === 'undefined') return null;

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[110] bg-black/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget && !isSubmitting) onClose(); }}
    >
      <div
        className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl border border-slate-200 text-left relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          aria-label="Close"
          className="absolute top-5 right-5 text-zinc-400 hover:text-black p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-40"
        >
          <X className="w-5 h-5" />
        </button>

        {step === 'decision' && (
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-zinc-900 tracking-tight">Your Assistant is Already Assigned</h3>
              <p className="text-xs sm:text-sm text-zinc-500 mt-1 leading-relaxed">
                Sahayak <span className="font-bold text-zinc-800">{booking.assistant?.name || 'Assigned Assistant'}</span> is prepared to meet you at Platform {booking.platform || '1'} for Train {booking.train_no || booking.train_number}.
              </p>
            </div>
            <div className="p-3.5 bg-blue-50/80 rounded-2xl border border-blue-100 text-xs text-blue-900 space-y-1">
              <span className="font-extrabold flex items-center gap-1.5 text-blue-700">
                <Sparkles className="w-3.5 h-3.5" />
                Need to travel on a different date or train?
              </span>
              <p className="text-[11px] text-blue-800/90 leading-relaxed">
                You can change your journey schedule, coach, or seat number without cancelling your booking.
              </p>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={() => { onClose(); if (onRequestRebook) onRequestRebook(); }}
                className="flex-1 py-3 px-4 rounded-full bg-black hover:bg-zinc-800 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <span>Change Booking (Rebook)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setStep('reason')}
                className="py-3 px-5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-all cursor-pointer"
              >
                Proceed to Cancel
              </button>
            </div>
          </div>
        )}

        {step === 'reason' && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-rose-600 mb-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Step 1 of 2: Reason Selection</span>
              </div>
              <h3 className="text-lg font-black text-zinc-900 tracking-tight">Why do you want to cancel this booking?</h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                {isAssigned
                  ? 'Your assistant has already been assigned. Select a genuine reason for full refund eligibility.'
                  : 'Your assistant has not been assigned yet. All eligible cancellations receive a 100% refund.'}
              </p>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 text-xs" role="radiogroup" aria-label="Cancellation reason">
              {reasonsList.map((r) => {
                const isSelected = selectedReason === r.id;
                return (
                  <label
                    key={r.id}
                    htmlFor={`cancel-reason-${r.id}`}
                    className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${isSelected ? 'border-black bg-slate-50 font-bold text-black shadow-2xs' : 'border-slate-200/90 hover:border-slate-300 text-zinc-700'}`}
                  >
                    <input
                      type="radio"
                      id={`cancel-reason-${r.id}`}
                      name="cancellation-reason"
                      value={r.id}
                      checked={isSelected}
                      onChange={() => handleSelectReason(r.id)}
                      className="sr-only"
                    />
                    <span>{getReasonLabel(r)}</span>
                    <span aria-hidden="true" className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${isSelected ? 'border-black bg-black' : 'border-slate-300'}`}>
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                  </label>
                );
              })}
            </div>

            {(selectedReason === 'OTHER' || selectedReason === 'OTHER_GENUINE') && (
              <div className="space-y-1.5 animate-fade-in">
                <label htmlFor="cancel-reason-details" className="text-xs font-bold text-zinc-800">
                  Please tell us the reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="cancel-reason-details"
                  rows={2}
                  value={reasonDetails}
                  onChange={(e) => { setReasonDetails(e.target.value); if (reasonError) setReasonError(''); }}
                  placeholder="Explain why you are cancelling (minimum 10 characters)..."
                  className="w-full text-xs p-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-black bg-slate-50 resize-none"
                />
                <p className="text-[10px] text-zinc-400">Meaningful explanation is required for administrative verification.</p>
              </div>
            )}

            {reasonError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">{reasonError}</div>
            )}

            <div className="pt-2 flex items-center gap-2.5">
              {isAssigned && (
                <button type="button" onClick={() => setStep('decision')} className="py-2.5 px-4 rounded-full border border-slate-200 hover:bg-slate-100 text-zinc-700 font-bold text-xs cursor-pointer">
                  {t('common.back')}
                </button>
              )}
              <button
                type="button"
                onClick={handleProceedToReview}
                className="flex-1 py-3 px-5 rounded-full bg-black hover:bg-zinc-800 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <span>{t('cancellation.policy')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-rose-600 mb-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Step 2 of 2: Cancellation Policy &amp; Refund</span>
              </div>
              <h3 className="text-lg font-black text-zinc-900 tracking-tight">{t('cancellation.cancelBooking')}</h3>
              <p className="text-xs text-zinc-500 mt-0.5">Review your refund eligibility calculated under ONECOOLIE station assistance rules.</p>
            </div>

            {quoteLoading ? (
              <div className="py-8 text-center space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin text-zinc-400 mx-auto" />
                <p className="text-xs text-zinc-500 font-medium">Calculating authoritative refund breakdown...</p>
              </div>
            ) : quote ? (
              <div className="space-y-3">
                <div className={`p-3.5 rounded-2xl border text-xs ${quote.cancellationCharge > 0 ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'}`}>
                  <span className="font-extrabold block mb-0.5">{quote.cancellationCharge > 0 ? 'Voluntary Cancellation (Charge Applies)' : '100% Refund Eligible'}</span>
                  <p className="text-[11px] leading-relaxed opacity-90">{quote.reasonNote}</p>
                </div>
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-zinc-600">
                    <span>Booking Total Amount</span>
                    <span className="font-mono font-bold text-zinc-900">₹{quote.originalAmount}</span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-600">
                    <span>Refund Percentage</span>
                    <span className="font-mono font-bold text-zinc-900">{quote.refundPercent}%</span>
                  </div>
                  {quote.cancellationCharge > 0 && (
                    <div className="flex items-center justify-between text-rose-600 font-semibold">
                      <span>Cancellation Charge (30%)</span>
                      <span className="font-mono font-bold">-₹{quote.cancellationCharge}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-200 pt-2 flex items-center justify-between font-extrabold text-sm">
                    <span className="text-zinc-900">{t('cancellation.refundAmount')}</span>
                    <span className="font-mono text-emerald-600">₹{quote.refundAmount}</span>
                  </div>
                </div>
                <p className="text-[11px] text-zinc-500 leading-relaxed px-1">{quote.policyNotice}</p>
              </div>
            ) : null}

            {reasonError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">{reasonError}</div>
            )}

            <div className="pt-2 flex items-center gap-2.5">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setStep('reason')}
                className="py-3 px-5 rounded-full border border-slate-200 hover:bg-slate-100 text-zinc-700 font-bold text-xs cursor-pointer disabled:opacity-40"
              >
                {t('common.back')}
              </button>
              <button
                type="button"
                disabled={isSubmitting || quoteLoading}
                onClick={handleConfirmCancel}
                className="flex-1 py-3 px-5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isSubmitting ? (
                  <><RefreshCw className="w-3.5 h-3.5 animate-spin" /><span>Cancelling booking...</span></>
                ) : (
                  <span>{t('cancellation.confirmCancel')}</span>
                )}
              </button>
            </div>
          </div>
        )}

        {step === 'success' && cancellationResult && (
          <div className="space-y-4 text-center py-2 animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-black text-zinc-900">{t('cancellation.cancelledSuccess')}</h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto">{cancellationResult.message}</p>
            </div>
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl max-w-sm mx-auto text-xs space-y-1">
              <div className="flex items-center justify-between text-zinc-600">
                <span>{t('cancellation.refund')}</span>
                <span className="font-mono font-bold text-emerald-600">₹{cancellationResult.refundAmount}</span>
              </div>
              {cancellationResult.cancellationCharge > 0 && (
                <div className="flex items-center justify-between text-zinc-600">
                  <span>Cancellation Charge</span>
                  <span className="font-mono font-bold text-rose-600">₹{cancellationResult.cancellationCharge}</span>
                </div>
              )}
            </div>
            <div className="pt-2">
              <button type="button" onClick={onClose} className="w-full py-3 px-6 rounded-full bg-black hover:bg-zinc-800 text-white font-bold text-xs transition-all cursor-pointer shadow-xs">
                {t('common.done')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
