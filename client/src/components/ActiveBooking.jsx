import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import axios from '../api/axios';
import ConfirmDialog from './ConfirmDialog';

/* ============================================================
   ACTIVE BOOKING — Swiss Live Trip Management Component
   Strictly Black (#000000), White (#FFFFFF), and Blue (#2563EB)
   ============================================================ */

const STEPS = [
  { key: 'accepted', label: 'Accepted' },
  { key: 'arriving', label: 'Arriving' },
  { key: 'in_service', label: 'In Service' },
  { key: 'completed', label: 'Completed' },
];

const STATUS_INDEX = {
  pending: 0,
  accepted: 1,
  arriving: 2,
  in_service: 3,
  completed: 4,
  cancelled: -1,
};

export default function ActiveBooking({ booking, onUpdate, distance = 500 }) {
  const navigate = useNavigate();
  const [chatMsgs, setChatMsgs] = useState([]);
  const [msgInput, setMsgInput] = useState('');
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [showSosModal, setShowSosModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [sosSent, setSosSent] = useState(false);

  const status =
    booking.booking_status || booking.assistant_status || 'pending';

  /* ── Socket Connection ──────────────────────────────────── */
  useEffect(() => {
    if (!window.socket || !booking.id) return;
    window.socket.emit('join_booking', booking.id);

    const handleStatus = (b) => {
      if (b.id === booking.id) onUpdate(b);
    };
    const handleChat = (m) => {
      if (m.bookingId === booking.id) {
        setChatMsgs((p) => [...p, m]);
      }
    };

    window.socket.on('status_update', handleStatus);
    window.socket.on('chat_message', handleChat);

    return () => {
      window.socket.off('status_update', handleStatus);
      window.socket.off('chat_message', handleChat);
    };
  }, [booking.id, onUpdate]);

  const submitRating = async () => {
    if (rating === 0) return;
    setSubmittingRating(true);
    try {
      const { data } = await axios.post(`/service/${booking.id}/rate`, {
        rating,
        review,
      });
      onUpdate(data.booking || data);
      toast.success('Thank you for rating your assistant!');
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    } catch (err) {
      console.error(err);
      toast.error('Unable to submit rating.');
    } finally {
      setSubmittingRating(false);
    }
  };

  const sendChat = () => {
    if (!msgInput.trim() || !window.socket) return;
    const msg = {
      bookingId: booking.id,
      from: 'passenger',
      text: msgInput.trim(),
      timestamp: new Date().toISOString(),
    };
    window.socket.emit('chat_message', msg);
    setChatMsgs((p) => [...p, msg]);
    setMsgInput('');
  };

  const handleCancel = async () => {
    try {
      const { data } = await axios.post(`/bookings/${booking.id}/cancel`);
      onUpdate(data.booking || data);
      setShowCancelModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  const triggerSos = async () => {
    try {
      await axios.post(`/service/${booking.id}/sos`, {
        station_code: booking.station_code,
        train_no: booking.train_no,
      });
      setSosSent(true);
      setShowSosModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  const currentStepIndex = STATUS_INDEX[status] ?? 0;

  return (
    <div className="space-y-6">
      {/* ── Status Progression Bar ────────────────────────────── */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 font-mono block mb-1">
              Live Transit Telemetry
            </span>
            <h2 className="text-xl font-bold tracking-tight">
              {status === 'pending'
                ? 'Allocating Platform Assistant'
                : status === 'accepted'
                ? 'Assistant Dispatched'
                : status === 'arriving'
                ? 'Assistant En Route to Platform'
                : status === 'in_service'
                ? 'Assistance In Progress'
                : status === 'completed'
                ? 'Assistance Completed'
                : 'Booking Cancelled'}
            </h2>
          </div>

          <span
            className={`px-3 py-1 rounded-full text-xs font-bold font-mono uppercase tracking-wider ${
              status === 'completed'
                ? 'bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white'
                : status === 'cancelled'
                ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                : 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
            }`}
          >
            {status.toUpperCase()}
          </span>
        </div>

        {/* Step Indicator */}
        {status !== 'cancelled' && (
          <div className="grid grid-cols-4 gap-2 pt-2">
            {STEPS.map((step, idx) => {
              const isPassed = currentStepIndex > idx;
              const isCurrent = currentStepIndex === idx + 1;

              return (
                <div key={step.key} className="space-y-2">
                  <div
                    className={`h-1.5 rounded-full transition-all ${
                      isPassed || isCurrent
                        ? 'bg-blue-600'
                        : 'bg-zinc-100 dark:bg-zinc-800'
                    }`}
                  />
                  <p
                    className={`text-[11px] font-semibold truncate ${
                      isCurrent
                        ? 'text-blue-600 dark:text-blue-400 font-bold'
                        : isPassed
                        ? 'text-black dark:text-white'
                        : 'text-zinc-400'
                    }`}
                  >
                    {step.label}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Distance Indicator */}
        {status === 'arriving' && distance > 0 && (
          <div className="mt-6 p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 flex items-center justify-between text-xs">
            <span className="text-zinc-600 dark:text-zinc-300">
              Assistant Proximity:
            </span>
            <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
              ~{distance}m from platform
            </span>
          </div>
        )}
      </div>

      {/* ── OTP Verification Card (High Contrast Swiss) ──────── */}
      {(status === 'accepted' || status === 'arriving') && booking.start_otp && (
        <div className="bg-white dark:bg-zinc-900 border-2 border-blue-600 rounded-2xl p-8 text-center shadow-lg">
          <span className="badge-blue mb-3">
            In-Person Handshake
          </span>
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 font-mono mb-2">
            6-Digit Service Start OTP
          </p>
          <p className="text-5xl sm:text-6xl font-bold tracking-[0.35em] font-mono text-black dark:text-white my-4">
            {booking.start_otp}
          </p>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto leading-relaxed">
            Provide this code to your assistant <strong>only in person on the platform</strong> to begin your service.
          </p>
        </div>
      )}

      {/* ── Coach, Seat & Train Location Card ─────────────────── */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 font-mono">
            Platform Target Details
          </span>
          <span className="badge-blue font-mono">
            Train {booking.train_no || booking.train_number}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-100 dark:border-zinc-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-0.5">
              Coach Number
            </span>
            <span className="font-mono font-black text-base text-blue-600 dark:text-blue-400">
              {booking.coach || booking.services?.coach || 'TBD'}
            </span>
          </div>

          <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-100 dark:border-zinc-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-0.5">
              Seat / Berth
            </span>
            <span className="font-mono font-black text-base text-black dark:text-white">
              {booking.seat_number || booking.services?.seat_number || 'TBD'}
              {(booking.berth_type || booking.services?.berth_type) && ` (${booking.berth_type || booking.services?.berth_type})`}
            </span>
          </div>

          <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-100 dark:border-zinc-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-0.5">
              Station Hub
            </span>
            <span className="font-mono font-black text-base text-black dark:text-white">
              {booking.station_code}
            </span>
          </div>

          <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-100 dark:border-zinc-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-0.5">
              Luggage Mission
            </span>
            <span className="font-bold text-xs text-black dark:text-white truncate block">
              {(booking.action_type === 'collect_from_seat' || booking.services?.action_type === 'collect_from_seat')
                ? '🚪 De-board (Collect)'
                : '🚶 Boarding (Load)'}
            </span>
          </div>
        </div>

        {booking.service_description && (
          <p className="text-xs text-zinc-500 border-t border-zinc-100 dark:border-zinc-800 pt-3 font-mono">
            {booking.service_description}
          </p>
        )}
      </div>

      {/* ── Assistant Profile & SOS Controls ─────────────────── */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold text-base">
              {booking.assistant?.name?.charAt(0) || 'A'}
            </div>
            <div>
              <p className="font-bold text-sm text-black dark:text-white">
                {booking.assistant?.name || 'Allocating Assistant...'}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-zinc-500 font-mono">
                  Station {booking.station_code}
                </span>
                {booking.assistant && (
                  <span className="text-[10px] font-bold bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-full">
                    KYC Verified
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* SOS and Cancel Buttons */}
          <div className="flex items-center gap-2">
            {status !== 'completed' && status !== 'cancelled' && (
              <>
                <button
                  type="button"
                  onClick={() => setShowSosModal(true)}
                  className="btn-black text-xs px-3.5 py-2"
                >
                  SOS Emergency
                </button>
                <button
                  type="button"
                  onClick={() => setShowCancelModal(true)}
                  className="btn-secondary text-xs px-3.5 py-2"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>

        {sosSent && (
          <div className="mt-4 p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 text-xs font-mono text-black dark:text-white">
            🚨 SOS Alert transmitted to Station Operations Supervisor.
          </div>
        )}
      </div>

      {/* ── Real-Time Chat Drawer ────────────────────────────── */}
      {status !== 'cancelled' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-zinc-100 dark:border-zinc-800">
            <h3 className="text-sm font-bold tracking-tight">
              Assistant Messaging
            </h3>
            <span className="text-[11px] font-mono text-zinc-400">
              Live Platform Channel
            </span>
          </div>

          {/* Message Feed */}
          <div className="space-y-3 min-h-[160px] max-h-60 overflow-y-auto pr-2 mb-4">
            {chatMsgs.length === 0 ? (
              <div className="text-center py-8 text-xs text-zinc-400 font-mono">
                No messages yet. Send a note about your coach or coach position.
              </div>
            ) : (
              chatMsgs.map((m, i) => {
                const isPassenger = m.from === 'passenger';

                return (
                  <div
                    key={i}
                    className={`flex flex-col ${
                      isPassenger ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-xs px-4 py-2.5 rounded-2xl text-xs font-medium ${
                        isPassenger
                          ? 'bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white rounded-br-none border border-zinc-200 dark:border-zinc-700'
                          : 'bg-black text-white dark:bg-white dark:text-black rounded-bl-none'
                      }`}
                    >
                      {m.text}
                    </div>
                    <span className="text-[10px] text-zinc-400 mt-1 font-mono">
                      {isPassenger ? 'You' : 'Assistant'}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Chat Input */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={msgInput}
              onChange={(e) => setMsgInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendChat()}
              placeholder="Type message to assistant..."
              className="input-base text-xs py-2.5"
            />
            <button
              type="button"
              onClick={sendChat}
              className="btn-primary py-2.5 px-4 text-xs shrink-0"
            >
              Send
            </button>
          </div>
        </div>
      )}

      {/* ── Post-Trip Rating ─────────────────────────────────── */}
      {status === 'completed' && !booking.rating && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold tracking-tight mb-1">
            Rate Your Assistant
          </h3>
          <p className="text-xs text-zinc-500 mb-4">
            Help maintain high service standards across the OneCoolie network
          </p>

          <div className="flex items-center gap-2 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className={`w-9 h-9 rounded-xl border text-sm font-bold transition-all ${
                  rating >= star
                    ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                    : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-400'
                }`}
              >
                ★
              </button>
            ))}
          </div>

          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder="Write a brief review of your transit assistance experience..."
            className="input-base text-xs mb-3 h-20 resize-none"
          />

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={submitRating}
              disabled={rating === 0 || submittingRating}
              className="btn-primary py-2 px-4 text-xs"
            >
              {submittingRating ? 'Submitting...' : 'Submit Feedback & Finish'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="btn-secondary py-2 px-4 text-xs"
            >
              Skip to Dashboard →
            </button>
          </div>
        </div>
      )}

      {status === 'completed' && booking.rating && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm text-center">
          <p className="font-bold text-sm text-black dark:text-white mb-1">
            ✓ Service Completed & Rated ({booking.rating} ★)
          </p>
          <p className="text-xs text-zinc-500 mb-4">
            Thank you for choosing OneCoolie assistance.
          </p>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="btn-primary py-2 px-6 text-xs"
          >
            Return to Passenger Dashboard →
          </button>
        </div>
      )}

      {/* SOS Confirmation Modal */}
      <ConfirmDialog
        open={showSosModal}
        title="Broadcast Emergency SOS"
        message="Are you sure you want to trigger an immediate station security & assistance alert? Your live location and booking details will be broadcasted to station control."
        confirmText="Transmit SOS"
        cancelText="Dismiss"
        onConfirm={triggerSos}
        onCancel={() => setShowSosModal(false)}
      />

      {/* Cancel Confirmation Modal */}
      <ConfirmDialog
        open={showCancelModal}
        title="Cancel Station Booking"
        message="Are you sure you want to cancel this assistance request?"
        confirmText="Confirm Cancellation"
        cancelText="Keep Active"
        onConfirm={handleCancel}
        onCancel={() => setShowCancelModal(false)}
      />
    </div>
  );
}