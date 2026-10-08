import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from '../../api/axios';
import { toast } from 'react-hot-toast';
import {
  AlertTriangle,
  CheckCircle2,
  X,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  Train,
  MapPin,
  Clock,
  UserCheck
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

  const getReasonLabel = useCallback((reason) => {
    if (!reason) return '';
    const id = typeof reason === 'string' ? reason : reason.id;
    const fallbackLabel = typeof reason === 'object' ? reason.label : id;
    switch (id) {
      case 'TRAIN_CANCELLED': return t('cancellation.trainCancelled') || fallbackLabel;
      case 'TRAIN_SCHEDULE_CHANGED': return t('cancellation.scheduleChanged') || fallbackLabel;
      case 'JOURNEY_DATE_CHANGED': return t('cancellation.dateChanged') || fallbackLabel;
      case 'JOURNEY_TIME_CHANGED': return t('cancellation.timeChanged') || fallbackLabel;
      case 'DESTINATION_CHANGED': return t('cancellation.destinationChanged') || fallbackLabel;
      case 'DUPLICATE_BOOKING': return t('cancellation.duplicateBooking') || fallbackLabel;
      case 'BOOKED_BY_MISTAKE': return t('cancellation.mistakeBooking') || fallbackLabel;
      case 'PERSONAL_EMERGENCY': return t('cancellation.emergency') || fallbackLabel;
      case 'CHANGE_OF_PLANS': return t('cancellation.plansChanged') || fallbackLabel;
      case 'OTHER': return t('cancellation.other') || fallbackLabel;
      case 'OTHER_GENUINE': return t('cancellation.otherGenuine') || fallbackLabel;
      case 'VOLUNTARY_CANCEL': return t('cancellation.voluntaryCancel') || fallbackLabel;
      default: return fallbackLabel;
    }
  }, [t]);

  const [selectedReason, setSelectedReason] = useState('');
  const [reasonDetails, setReasonDetails] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [quote, setQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cancellationResult, setCancellationResult] = useState(null);

  // Evaluates assistant assignment
  const isAssigned = useMemo(() => {
    if (!booking) return false;
    const status = String(booking.booking_status || booking.status || '').toLowerCase();
    return Boolean(
      booking.assistant_id &&
      ['assigned', 'accepted', 'arriving', 'in_service'].includes(status)
    );
  }, [booking]);

  const reasonsList = isAssigned ? ASSIGNED_REASONS : UNASSIGNED_REASONS;

  const selectedReasonObj = useMemo(() => {
    return reasonsList.find(r => r.id === selectedReason) || null;
  }, [reasonsList, selectedReason]);

  const selectedReasonDisplay = useMemo(() => {
    if (!selectedReason) return '';
    return getReasonLabel(selectedReasonObj || selectedReason);
  }, [selectedReason, selectedReasonObj, getReasonLabel]);

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

  // LIFECYCLE GUARD:
  // Only initialize state when the modal transitions from closed to open,
  // or when the target booking ID changes.
  // NEVER reset state on background polling or parent re-renders while the modal is open!
  const bookingId = booking?.id || booking?.booking_id;
  const prevBookingIdRef = useRef(null);
  const prevIsOpenRef = useRef(false);

  useEffect(() => {
    if (!isOpen || !booking) {
      prevIsOpenRef.current = false;
      return;
    }

    if (!prevIsOpenRef.current || prevBookingIdRef.current !== bookingId) {
      setSelectedReason('');
      setReasonDetails('');
      setReasonError('');
      setQuote(null);
      setCancellationResult(null);
      setIsSubmitting(false);
      setStep(isAssigned ? 'decision' : 'reason');
      prevBookingIdRef.current = bookingId;
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, bookingId, isAssigned]);

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
        ? 'Voluntary passenger cancellation: 30% operational charge applies, 70% refund eligible.'
        : 'Eligible cancellation: 100% full refund with ₹0 cancellation charge.',
      policyNotice: isCash
        ? 'Cash booking. No online gateway refund is required.'
        : `Online payment refund of ₹${refundAmount} will be credited to your original payment method.`
    });
  }, [booking, isAssigned, selectedReason]);

  // STEP 1 -> STEP 2: Proceed from Reason Selection to Policy & Refund Summary
  const handleProceedToPolicy = useCallback(async () => {
    if (!selectedReason) {
      setReasonError('Please select a cancellation reason before proceeding.');
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
    setStep('policy');

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

  // STEP 2 -> STEP 3: Proceed from Policy to Final Confirmation (NO cancellation call here)
  const handleProceedToConfirmation = useCallback(() => {
    setReasonError('');
    setStep('confirmation');
  }, []);

  // STEP 3: Final authoritative cancellation submission
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
      // Stay on confirmation step
      setStep('confirmation');
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, booking, selectedReason, reasonDetails, quote, onCancelled, onSuccess]);

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

        {/* ── ASSISTANT ASSIGNED PRELIMINARY DECISION ── */}
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

        {/* ── STEP 1: SELECT CANCELLATION REASON ── */}
        {step === 'reason' && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-rose-600 mb-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Step 1 of 3: Reason Selection</span>
              </div>
              <h3 className="text-lg font-black text-zinc-900 tracking-tight">Why do you want to cancel this booking?</h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                {isAssigned
                  ? 'Your assistant has already been assigned. Select a reason to calculate your refund eligibility.'
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
                onClick={handleProceedToPolicy}
                className="flex-1 py-3 px-5 rounded-full bg-black hover:bg-zinc-800 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <span>{t('cancellation.policy') || 'Cancellation Policy'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: CANCELLATION POLICY + REFUND SUMMARY ── */}
        {step === 'policy' && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-rose-600 mb-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Step 2 of 3: Policy & Refund Summary</span>
              </div>
              <h3 className="text-lg font-black text-zinc-900 tracking-tight">Cancellation Policy &amp; Refund Details</h3>
              <p className="text-xs text-zinc-500 mt-0.5">Review your refund calculation under ONECOOLIE station assistance rules.</p>
            </div>

            {/* Selected Reason Badge */}
            <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-2xl flex items-start gap-2.5 text-xs">
              <CheckCircle2 className="w-4 h-4 text-zinc-600 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider">Cancellation Reason</span>
                <span className="font-extrabold text-zinc-900 text-xs block truncate">{selectedReasonDisplay}</span>
                {reasonDetails ? (
                  <p className="text-[11px] text-zinc-500 mt-0.5 italic line-clamp-1">"{reasonDetails}"</p>
                ) : null}
              </div>
            </div>

            {quoteLoading ? (
              <div className="py-8 text-center space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin text-zinc-400 mx-auto" />
                <p className="text-xs text-zinc-500 font-medium">Calculating authoritative refund breakdown...</p>
              </div>
            ) : quote ? (
              <div className="space-y-3">
                <div className={`p-3.5 rounded-2xl border text-xs ${quote.cancellationCharge > 0 ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'}`}>
                  <span className="font-extrabold block mb-0.5">{quote.cancellationCharge > 0 ? 'Voluntary Cancellation (Operational Fee Applies)' : '100% Refund Eligible'}</span>
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
                      <span>Cancellation Charge ({quote.cancellationChargePercent || 30}%)</span>
                      <span className="font-mono font-bold">-₹{quote.cancellationCharge}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-200 pt-2 flex items-center justify-between font-extrabold text-sm">
                    <span className="text-zinc-900">{t('cancellation.refundAmount') || 'Refund Amount'}</span>
                    <span className="font-mono text-emerald-600">₹{quote.refundAmount}</span>
                  </div>
                </div>

                <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-2xl text-[11px] text-blue-900 leading-relaxed">
                  <p className="font-semibold">{quote.policyNotice}</p>
                  <p className="text-[10px] text-blue-700/80 mt-1">
                    Cancellations made prior to service commencement are credited back to your original payment method.
                  </p>
                </div>
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
                className="py-3 px-5 rounded-full border border-slate-200 hover:bg-slate-100 text-zinc-700 font-bold text-xs cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{t('common.back') || 'Back'}</span>
              </button>
              <button
                type="button"
                disabled={isSubmitting || quoteLoading}
                onClick={handleProceedToConfirmation}
                className="flex-1 py-3 px-5 rounded-full bg-black hover:bg-zinc-800 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <span>{t('common.continue') || 'Continue'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: FINAL CONFIRMATION ── */}
        {step === 'confirmation' && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-rose-600 mb-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Step 3 of 3: Final Confirmation</span>
              </div>
              <h3 className="text-lg font-black text-zinc-900 tracking-tight">Confirm Trip Cancellation</h3>
              <p className="text-xs text-zinc-500 mt-0.5">Please review your trip details before finalizing cancellation.</p>
            </div>

            {/* Trip Summary Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2 text-zinc-900 font-extrabold">
                  <Train className="w-4 h-4 text-blue-600" />
                  <span>Train {booking.train_no || booking.train_number}</span>
                </div>
                <span className="font-mono text-zinc-500 text-[11px] font-bold">
                  {booking.booking_id || booking.id}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-zinc-600 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Station: <strong className="text-zinc-900">{booking.station_code || booking.source}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Date: <strong className="text-zinc-900">{booking.journey_date}</strong></span>
                </div>
              </div>

              {booking.assistant?.name ? (
                <div className="flex items-center gap-1.5 text-zinc-600 text-[11px] pt-1">
                  <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                  <span>Assigned Sahayak: <strong className="text-zinc-900">{booking.assistant.name}</strong> (Will be released)</span>
                </div>
              ) : null}

              <div className="border-t border-slate-200 pt-2 flex items-center justify-between font-extrabold">
                <span className="text-zinc-700">Cancellation Reason</span>
                <span className="text-zinc-900 text-right truncate max-w-[200px]">{selectedReasonDisplay}</span>
              </div>

              <div className="flex items-center justify-between font-extrabold text-sm pt-1 bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-100">
                <span className="text-emerald-950">Refund to Process</span>
                <span className="font-mono text-emerald-600 text-base">₹{quote?.refundAmount ?? booking.total_price}</span>
              </div>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-[11px] text-rose-800 leading-relaxed">
              <span className="font-bold block mb-0.5">Warning: Irreversible Action</span>
              Once confirmed, this assistance booking will be permanently cancelled. Your assigned Sahayak will be released for other passengers.
            </div>

            {reasonError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">{reasonError}</div>
            )}

            <div className="pt-2 flex items-center gap-2.5">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setStep('policy')}
                className="py-3 px-5 rounded-full border border-slate-200 hover:bg-slate-100 text-zinc-700 font-bold text-xs cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{t('common.back') || 'Back'}</span>
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmCancel}
                className="flex-1 py-3 px-5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isSubmitting ? (
                  <><RefreshCw className="w-3.5 h-3.5 animate-spin" /><span>Cancelling booking...</span></>
                ) : (
                  <span>{t('cancellation.confirmCancel') || 'Confirm Cancellation'}</span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: SUCCESS CONFIRMATION ── */}
        {step === 'success' && cancellationResult && (
          <div className="space-y-4 text-center py-2 animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-black text-zinc-900">{t('cancellation.cancelledSuccess') || 'Booking Cancelled Successfully'}</h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto">{cancellationResult.message}</p>
            </div>
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl max-w-sm mx-auto text-xs space-y-1">
              <div className="flex items-center justify-between text-zinc-600">
                <span>{t('cancellation.refund') || 'Refund'}</span>
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
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 px-6 rounded-full bg-black hover:bg-zinc-800 text-white font-bold text-xs transition-all cursor-pointer shadow-xs"
              >
                {t('common.done') || 'Done'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
