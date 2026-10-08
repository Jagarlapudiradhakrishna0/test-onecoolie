import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Star,
  CheckCircle2,
  AlertCircle,
  Loader2,
  User,
  MapPin,
  Train
} from 'lucide-react';
import toast from 'react-hot-toast';
import axios from '../api/axios';

/* ============================================================
   ONECOOLIE — POST-TASK PASSENGER FEEDBACK MODAL
   Triggered only when the assistant completes the passenger's task.
   Provides exactly two choices:
   1. Submit Feedback (1–5 stars + optional comment)
   2. Skip (records skip, does not affect assistant rating)
   After either choice:
   Popup closes -> Passenger returns to Home/Main Page.
   ============================================================ */

export default function FeedbackModal({
  isOpen,
  booking,
  onSuccess,
  onClose
}) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen || !booking) return null;

  const bookingId = booking.id || booking._id || booking.booking_id;
  const displayBookingCode = booking.booking_id || booking.id || 'N/A';
  const assistantName = booking.assistant?.name || booking.assistant_name || 'Assigned Sahayak';
  const stationCode = booking.station_code || booking.source || 'Station';
  const trainNo = booking.train_number || booking.train_no || booking.train_name || '';

  const ratingDescriptions = {
    1: '1 Star — Poor service',
    2: '2 Stars — Below expectations',
    3: '3 Stars — Average experience',
    4: '4 Stars — Good & helpful',
    5: '5 Stars — Excellent assistance!'
  };

  const activeRatingDisplay = hoverRating || rating;

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');

    if (!rating || rating < 1 || rating > 5) {
      setErrorMessage('Please select a star rating (1 to 5 stars) before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      const targetAssistantId = booking.assistant_id || booking.assistant?.id;
      const payload = {
        rating: Number(rating),
        review: comment.trim(),
        comment: comment.trim(),
        assistantId: targetAssistantId,
        assistant_id: targetAssistantId
      };

      const res = await axios.post(`/bookings/${bookingId}/review`, payload);

      toast.success('Thank you! Your feedback has been submitted.');
      if (onSuccess) {
        onSuccess('submitted', res.data?.booking || res.data);
      }
    } catch (err) {
      console.error('Submit feedback error:', err);
      const msg = err.response?.data?.message || 'Unable to submit feedback. Please try again.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    setErrorMessage('');
    setIsSkipping(true);
    try {
      const res = await axios.post(`/bookings/${bookingId}/skip-feedback`);
      toast.success('Feedback skipped. Have a great journey!');
      if (onSuccess) {
        onSuccess('skipped', res.data?.booking || res.data);
      }
    } catch (err) {
      console.error('Skip feedback warning:', err);
      // Even if backend skip call has an edge network error, allow passenger to continue home
      toast('Feedback skipped.');
      if (onSuccess) {
        onSuccess('skipped', null);
      }
    } finally {
      setIsSkipping(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Dimmed backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={() => {
          // Prevent accidental backdrop closing so passenger explicitly chooses Submit or Skip
        }}
      />

      {/* Modal Dialog Card */}
      <div className="relative bg-white rounded-3xl max-w-md w-full shadow-[0_24px_60px_-15px_rgba(0,0,0,0.3)] border border-slate-200/90 z-10 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Branded Bar with Task Completed Check */}
        <div className="bg-gradient-to-b from-blue-50/70 to-white px-6 pt-6 pb-4 border-b border-slate-100 text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-3 text-emerald-600 shadow-xs">
            <CheckCircle2 className="w-7 h-7" />
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100/70 text-emerald-800 border border-emerald-200/60 mb-2">
            <span>Task Completed ✓</span>
          </span>

          <h2 className="text-xl font-black text-zinc-900 tracking-tight">
            How was your experience?
          </h2>

          <p className="text-xs text-zinc-500 font-medium mt-1">
            Your feedback helps us maintain high station service standards.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Assistant & Booking Attribution */}
          <div className="bg-slate-50/90 border border-slate-200/80 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-blue-100 text-[#1463FF] flex items-center justify-center shrink-0 font-bold">
                <User className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="font-extrabold text-zinc-900 truncate">{assistantName}</p>
                <p className="text-[11px] text-zinc-500 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 text-zinc-400" />
                  <span>{stationCode}</span>
                  {trainNo && (
                    <>
                      <span>•</span>
                      <Train className="w-3 h-3 text-zinc-400" />
                      <span>{trainNo}</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[10px] text-zinc-400 font-semibold block uppercase">Booking ID</span>
              <span className="font-mono text-[11px] font-bold text-zinc-700">{displayBookingCode}</span>
            </div>
          </div>

          {/* 1–5 Star Interactive Rating */}
          <div className="text-center space-y-2">
            <label className="text-xs font-bold text-zinc-700 block">
              Rate your assistance
            </label>

            <div className="flex items-center justify-center gap-2 sm:gap-3 py-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => {
                    setRating(star);
                    setErrorMessage('');
                  }}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  disabled={isSubmitting || isSkipping}
                  className="p-1 text-slate-200 hover:scale-110 active:scale-95 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group focus:outline-none"
                  aria-label={`${star} star rating`}
                >
                  <Star
                    className={`w-8 h-8 sm:w-9 sm:h-9 transition-colors ${
                      star <= activeRatingDisplay
                        ? 'fill-amber-400 text-amber-400 drop-shadow-xs'
                        : 'text-slate-300 group-hover:text-amber-300'
                    }`}
                  />
                </button>
              ))}
            </div>

            <p className="text-xs font-semibold h-4 text-amber-600 transition-all">
              {activeRatingDisplay ? ratingDescriptions[activeRatingDisplay] : 'Select 1 to 5 stars'}
            </p>
          </div>

          {/* Optional Experience Comment */}
          <div className="space-y-1.5 text-left">
            <label htmlFor="feedback-comment" className="text-xs font-bold text-zinc-700">
              Tell us about your experience <span className="text-zinc-400 font-normal">(Optional)</span>
            </label>
            <textarea
              id="feedback-comment"
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={isSubmitting || isSkipping}
              maxLength={500}
              placeholder="Was the sahayak punctual? Handled bags safely? Any comments..."
              className="w-full bg-[#F8FAFC] border border-slate-200 rounded-2xl p-3 text-xs text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-[#1463FF] focus:bg-white transition-all resize-none"
            />
            <div className="flex justify-between text-[11px] text-zinc-400 px-1">
              <span>Honest reviews keep stations reliable</span>
              <span>{comment.length}/500</span>
            </div>
          </div>

          {/* Error Message Alert */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-rose-700 text-xs font-semibold animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Exactly Two Action Buttons: [Skip] and [Submit Feedback] */}
          <div className="pt-2 flex items-center gap-3">
            {/* Skip Button */}
            <button
              type="button"
              onClick={handleSkip}
              disabled={isSubmitting || isSkipping}
              className="flex-1 py-3 px-4 rounded-full border border-slate-300 hover:bg-slate-100 text-zinc-700 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              {isSkipping ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-500" />
                  <span>Skipping...</span>
                </>
              ) : (
                <span>Skip</span>
              )}
            </button>

            {/* Submit Feedback Button */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || isSkipping}
              className="flex-1 py-3 px-4 rounded-full bg-[#1463FF] hover:bg-blue-600 active:bg-blue-700 text-white font-bold text-xs transition-colors shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  <span>Submitting...</span>
                </>
              ) : (
                <span>Submit Feedback</span>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
}
