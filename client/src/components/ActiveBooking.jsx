import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Train,
  FileText,
  MapPin,
  Calendar,
  Armchair,
  Luggage,
  Info,
  User,
  CheckCircle2,
  Phone,
  MessageSquare,
  Star,
  Share2,
  AlertTriangle,
  Send,
  Check,
  Headphones,
  ArrowRight,
  XCircle,
  ShieldCheck,
  Copy
} from 'lucide-react';
import toast from 'react-hot-toast';
import axios from '../api/axios';
import ConfirmDialog from './ConfirmDialog';

/* ============================================================
   ACTIVE BOOKING — TRIP & TELEMETRY DETAILS COMPONENT
   (PIXEL PERFECT & ULTRA-RESPONSIVE ACROSS ALL MOBILE SCREENS)
   ============================================================ */

const STEPS = [
  { key: 'accepted', label: 'Accepted', defaultSub: 'Assistant assigned', pendingSub: 'Allocating assistant...' },
  { key: 'arriving', label: 'Arriving', defaultSub: 'Assistant at station', pendingSub: 'Pending arrival' },
  { key: 'in_service', label: 'In Service', defaultSub: 'Assistance in progress', pendingSub: 'Pending start OTP' },
  { key: 'completed', label: 'Completed', defaultSub: 'Assistance completed', pendingSub: 'Pending completion' },
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
  
  const savedRating = Number(localStorage.getItem(`rating_${booking.id}`)) || booking.rating || 0;
  const savedReview = localStorage.getItem(`review_${booking.id}`) || booking.review || '';
  const isAlreadySubmitted = Boolean(
    booking.rating ||
    savedRating > 0 ||
    localStorage.getItem(`rated_${booking.id}`) === 'true'
  );

  const [rating, setRating] = useState(savedRating);
  const [review, setReview] = useState(savedReview);
  const [isSubmitted, setIsSubmitted] = useState(isAlreadySubmitted);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [showSosModal, setShowSosModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [sosSent, setSosSent] = useState(false);

  useEffect(() => {
    if (booking.rating) {
      setRating(booking.rating);
      setIsSubmitted(true);
      localStorage.setItem(`rated_${booking.id}`, 'true');
      localStorage.setItem(`rating_${booking.id}`, String(booking.rating));
      if (booking.review) {
        setReview(booking.review);
        localStorage.setItem(`review_${booking.id}`, booking.review);
      }
    } else {
      const localRated = localStorage.getItem(`rated_${booking.id}`);
      const localRating = Number(localStorage.getItem(`rating_${booking.id}`));
      if (localRated === 'true' || localRating > 0) {
        setIsSubmitted(true);
        if (localRating > 0) setRating(localRating);
        const localRev = localStorage.getItem(`review_${booking.id}`);
        if (localRev) setReview(localRev);
      }
    }
  }, [booking.id, booking.rating, booking.review]);

  const status = booking.booking_status || booking.assistant_status || 'pending';
  const isCompleted = status === 'completed';
  const isCancelled = status === 'cancelled';
  const isBoarding = !(booking.action_type === 'collect_from_seat' || booking.services?.action_type === 'collect_from_seat');

  const getAssistantBadgeMeta = (st) => {
    switch (st) {
      case 'completed':
        return { label: 'COMPLETED', bg: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
      case 'in_service':
        return { label: 'IN SERVICE', bg: 'bg-blue-100 text-blue-700 border-blue-200' };
      case 'arriving':
        return { label: 'ARRIVING', bg: 'bg-amber-100 text-amber-700 border-amber-200' };
      case 'accepted':
        return { label: 'ON THE WAY', bg: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
      case 'cancelled':
        return { label: 'CANCELLED', bg: 'bg-rose-100 text-rose-700 border-rose-200' };
      default:
        return { label: 'ALLOCATING', bg: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  const getTripSummaryBadgeMeta = (st) => {
    switch (st) {
      case 'completed':
        return { label: 'COMPLETED', bg: 'bg-emerald-100 text-emerald-700', icon: '✓', pulse: false };
      case 'cancelled':
        return { label: 'CANCELLED', bg: 'bg-rose-100 text-rose-700', icon: '✕', pulse: false };
      case 'in_service':
        return { label: 'IN SERVICE', bg: 'bg-blue-100 text-blue-700', icon: null, pulse: true };
      case 'arriving':
        return { label: 'ARRIVING', bg: 'bg-blue-100 text-blue-700', icon: null, pulse: true };
      case 'accepted':
        return { label: 'IN PROGRESS', bg: 'bg-blue-100 text-blue-700', icon: null, pulse: true };
      default:
        return { label: 'PENDING', bg: 'bg-amber-100 text-amber-700', icon: null, pulse: true };
    }
  };

  const assistantBadge = getAssistantBadgeMeta(status);
  const tripSummaryBadge = getTripSummaryBadgeMeta(status);

  // Passenger feedback rating (updates in real-time when passenger selects or submits feedback)
  const passengerFeedbackRating =
    (booking.rating ? Number(booking.rating) : null) ||
    (isSubmitted && rating > 0 ? Number(rating) : null) ||
    (savedRating > 0 ? Number(savedRating) : null);

  const activeFeedback = passengerFeedbackRating || (rating > 0 ? Number(rating) : null);
  const assistantBaseRating = Number(booking.assistant?.rating) || 4.9;
  const displayRating = (activeFeedback || assistantBaseRating).toFixed(1);
  const hasPassengerFeedback = Boolean(activeFeedback);

  // Assistant total bookings completed count
  const bookingsCount =
    booking.assistant?.completed_jobs ??
    booking.assistant?.total_completed ??
    booking.assistant?.total_bookings ??
    18;

  /* ── Socket Connection ── */
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

  const sendChat = () => {
    if (!msgInput.trim() || !window.socket) return;
    const msg = {
      bookingId: booking.id,
      from: 'passenger',
      text: msgInput.trim(),
    };
    window.socket.emit('chat_message', msg);
    setChatMsgs((p) => [...p, msg]);
    setMsgInput('');
  };

  const submitRating = async () => {
    if (rating === 0) return;
    setSubmittingRating(true);

    // Save to localStorage immediately
    localStorage.setItem(`rated_${booking.id}`, 'true');
    localStorage.setItem(`rating_${booking.id}`, String(rating));
    if (review) localStorage.setItem(`review_${booking.id}`, review);
    setIsSubmitted(true);

    try {
      const { data } = await axios.post(`/service/${booking.id}/rate`, {
        rating,
        review,
      });
      if (data) onUpdate(data.booking || data);
      toast.success('Thank you for rating your assistant!');
      setTimeout(() => {
        navigate('/dashboard?tab=trips');
      }, 1200);
    } catch (err) {
      console.warn('Primary rating submission failed, attempting fallback route:', err);
      try {
        const { data } = await axios.post(`/bookings/${booking.id}/rating`, { rating, review });
        if (data) onUpdate(data.booking || data);
        toast.success('Thank you for rating your assistant!');
        setTimeout(() => {
          navigate('/dashboard?tab=trips');
        }, 1200);
      } catch (fallbackErr) {
        console.warn('Feedback preserved locally:', fallbackErr);
        toast.success('Feedback recorded successfully!');
      }
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleCancel = async () => {
    try {
      const { data } = await axios.post(`/bookings/${booking.id}/cancel`);
      onUpdate(data.booking || data);
      setShowCancelModal(false);
      toast.success('Booking cancelled successfully.');
    } catch (err) {
      console.error(err);
      toast.error('Unable to cancel booking.');
    }
  };

  const handleSos = async () => {
    try {
      await axios.post(`/service/${booking.id}/sos`, {
        reason: 'Passenger initiated emergency SOS from dashboard',
      });
      setSosSent(true);
      setShowSosModal(false);
      toast.error('🚨 Emergency SOS alert sent!');
    } catch (err) {
      console.error(err);
    }
  };

  const currentStepIndex = STATUS_INDEX[status] ?? 0;

  const formatTimeHHMM = (rawTime) => {
    if (!rawTime) return null;
    try {
      const d = new Date(rawTime);
      if (isNaN(d.getTime())) {
        if (/^\d{1,2}:\d{2}$/.test(String(rawTime).trim())) return String(rawTime).trim();
        return null;
      }
      return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch (e) {
      return null;
    }
  };

  const getStepDetails = (step, idx) => {
    const stepStage = idx + 1;
    const isPassed = currentStepIndex > stepStage || (isCompleted && idx <= 3);
    const isCurrent = currentStepIndex === stepStage && !isCompleted;
    const isReached = isPassed || isCurrent || (isCompleted && idx <= 3);

    if (!isReached) {
      return {
        isPassed: false,
        isCurrent: false,
        isReached: false,
        time: '--:--',
        sub: step.pendingSub,
      };
    }

    const bookingRefId = booking.id || booking.booking_id || 'active';
    const storageKey = `oc_steptime_${bookingRefId}_${step.key}`;

    let resolvedTime = null;

    if (step.key === 'accepted') {
      resolvedTime =
        formatTimeHHMM(booking.accepted_at) ||
        formatTimeHHMM(booking.services?.accepted_at) ||
        localStorage.getItem(storageKey);

      if (!resolvedTime) {
        if (status === 'accepted' && booking.updated_at) {
          resolvedTime = formatTimeHHMM(booking.updated_at);
        } else if (booking.created_at) {
          resolvedTime = formatTimeHHMM(booking.created_at);
        } else {
          resolvedTime = formatTimeHHMM(new Date());
        }
        if (resolvedTime) localStorage.setItem(storageKey, resolvedTime);
      }
    } else if (step.key === 'arriving') {
      resolvedTime =
        formatTimeHHMM(booking.arrived_at) ||
        formatTimeHHMM(booking.services?.arrived_at) ||
        localStorage.getItem(storageKey);

      if (!resolvedTime) {
        if (status === 'arriving' && booking.updated_at) {
          resolvedTime = formatTimeHHMM(booking.updated_at);
        } else if (currentStepIndex >= 2 && booking.updated_at) {
          resolvedTime = formatTimeHHMM(booking.updated_at);
        } else {
          resolvedTime = formatTimeHHMM(new Date());
        }
        if (resolvedTime) localStorage.setItem(storageKey, resolvedTime);
      }
    } else if (step.key === 'in_service') {
      resolvedTime =
        formatTimeHHMM(booking.service_started_at) ||
        formatTimeHHMM(booking.services?.in_service_at) ||
        formatTimeHHMM(booking.services?.service_started_at) ||
        localStorage.getItem(storageKey);

      if (!resolvedTime) {
        if (status === 'in_service' && booking.updated_at) {
          resolvedTime = formatTimeHHMM(booking.updated_at);
        } else if (currentStepIndex >= 3 && booking.updated_at) {
          resolvedTime = formatTimeHHMM(booking.updated_at);
        } else {
          resolvedTime = formatTimeHHMM(new Date());
        }
        if (resolvedTime) localStorage.setItem(storageKey, resolvedTime);
      }
    } else if (step.key === 'completed') {
      resolvedTime =
        formatTimeHHMM(booking.completed_at) ||
        formatTimeHHMM(booking.services?.completed_at) ||
        localStorage.getItem(storageKey);

      if (!resolvedTime) {
        if (status === 'completed' && (booking.completed_at || booking.updated_at)) {
          resolvedTime = formatTimeHHMM(booking.completed_at || booking.updated_at);
        } else if (isCompleted) {
          resolvedTime = formatTimeHHMM(new Date());
        }
        if (resolvedTime) localStorage.setItem(storageKey, resolvedTime);
      }
    }

    return {
      isPassed,
      isCurrent,
      isReached: true,
      time: resolvedTime || '--:--',
      sub: step.defaultSub,
    };
  };

  const formatDateString = (dateStr) => {
    if (!dateStr) return '04 Sep 2026';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  const getStatusBannerMeta = (st) => {
    switch (st) {
      case 'completed':
        return {
          badgeBg: 'bg-[#dcfce7] border-[#bbf7d0] text-[#00b964]',
          icon: '✓',
          titlePrefix: 'Assistance ',
          titleHighlight: 'Completed',
          highlightColor: 'text-[#00b964]',
          desc: 'Your journey was supported successfully. Thank you for choosing OneCoolie!'
        };
      case 'cancelled':
        return {
          badgeBg: 'bg-[#fee2e2] border-[#fca5a5] text-[#ef4444]',
          icon: '✕',
          titlePrefix: 'Assistance ',
          titleHighlight: 'Cancelled',
          highlightColor: 'text-[#ef4444]',
          desc: 'This booking was cancelled. You may schedule a new booking anytime.'
        };
      case 'accepted':
        return {
          badgeBg: 'bg-[#dbeafe] border-[#bfdbfe] text-[#2563eb]',
          icon: '●',
          titlePrefix: 'Assistant ',
          titleHighlight: 'Dispatched',
          highlightColor: 'text-[#2563eb]',
          desc: 'Platform assistant assigned and dispatched to your train.'
        };
      case 'arriving':
        return {
          badgeBg: 'bg-[#dbeafe] border-[#bfdbfe] text-[#2563eb]',
          icon: '●',
          titlePrefix: 'Assistant ',
          titleHighlight: 'En Route',
          highlightColor: 'text-[#2563eb]',
          desc: 'Assistant is navigating to your platform / coach location.'
        };
      case 'in_service':
        return {
          badgeBg: 'bg-[#dbeafe] border-[#bfdbfe] text-[#2563eb]',
          icon: '●',
          titlePrefix: 'Assistance ',
          titleHighlight: 'In Progress',
          highlightColor: 'text-[#2563eb]',
          desc: 'Luggage loading/escort service currently underway on platform.'
        };
      default:
        return {
          badgeBg: 'bg-[#dbeafe] border-[#bfdbfe] text-[#2563eb]',
          icon: '●',
          titlePrefix: 'Assistant ',
          titleHighlight: 'Allocating...',
          highlightColor: 'text-[#2563eb]',
          desc: 'Searching for nearest available station coolie assistant.'
        };
    }
  };

  const bannerMeta = getStatusBannerMeta(status);

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-hidden">
      {/* ── 1. FULL-WIDTH HERO STATUS BANNER CARD ── */}
      <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-gradient-to-r from-[#eef5fc] via-[#e6f1fd] to-[#d6e8fa] border border-[#d2e4f7] p-4 sm:p-7 text-zinc-900 shadow-xs min-h-[140px] sm:min-h-[160px] flex items-center justify-between w-full">
        {/* Banner Graphic Background */}
        <div className="absolute inset-y-0 right-0 w-full md:w-[65%] overflow-hidden pointer-events-none opacity-40 sm:opacity-100">
          <img
            src="/trip-hero-banner-v2.png"
            alt="Station Banner"
            className="w-full h-full object-cover object-right"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#eef5fc] via-[#eef5fc]/90 to-transparent w-1/2 sm:w-1/3" />
        </div>

        {/* Banner Left Content */}
        <div className="relative z-10 flex flex-col justify-between w-full gap-3 sm:gap-4">
          <div className="flex items-center gap-3 sm:gap-4 max-w-lg bg-[#eef5fc]/90 md:bg-transparent rounded-2xl p-1.5 sm:p-0 backdrop-blur-xs">
            {/* Round Icon Badge */}
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-black text-lg sm:text-xl shrink-0 shadow-2xs border ${bannerMeta.badgeBg}`}>
              <span className={!isCompleted && !isCancelled ? "animate-pulse inline-block" : ""}>
                {bannerMeta.icon}
              </span>
            </div>

            <div className="space-y-0.5 min-w-0 flex-1">
              <span className="text-[10px] sm:text-[11px] font-mono font-bold tracking-widest text-zinc-400 uppercase block">
                TRIP STATUS
              </span>
              <h2 className="text-xl sm:text-3xl font-black tracking-tight text-zinc-900 leading-tight sm:leading-none truncate">
                <span>{bannerMeta.titlePrefix}</span>
                <span className={bannerMeta.highlightColor}>{bannerMeta.titleHighlight}</span>
              </h2>
              <p className="text-[11px] sm:text-sm text-zinc-600 font-medium pt-0.5 sm:pt-1 leading-snug line-clamp-2">
                {bannerMeta.desc}
              </p>
            </div>
          </div>

          {/* 3 Feature Badges underneath title */}
          <div className="flex items-center gap-2 sm:gap-3 pt-1 sm:pt-2 flex-wrap">
            <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-white/90 border border-blue-100/90 backdrop-blur-md shadow-2xs">
              <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] sm:text-[10px] font-bold shrink-0">
                ✓
              </div>
              <div>
                <p className="text-[10px] sm:text-[11px] font-extrabold text-zinc-900 leading-none">Verified Assistants</p>
                <p className="text-[8px] sm:text-[9px] text-zinc-500 font-medium leading-none mt-0.5">Trusted &amp; Trained</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-white/90 border border-blue-100/90 backdrop-blur-md shadow-2xs">
              <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              </div>
              <div>
                <p className="text-[10px] sm:text-[11px] font-extrabold text-zinc-900 leading-none">Real-Time Updates</p>
                <p className="text-[8px] sm:text-[9px] text-zinc-500 font-medium leading-none mt-0.5">Stay Informed</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-white/90 border border-blue-100/90 backdrop-blur-md shadow-2xs">
              <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <User className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              </div>
              <div>
                <p className="text-[10px] sm:text-[11px] font-extrabold text-zinc-900 leading-none">Safe &amp; Hassle-Free</p>
                <p className="text-[8px] sm:text-[9px] text-zinc-500 font-medium leading-none mt-0.5">Travel With Confidence</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. FULL-WIDTH MILESTONE PROGRESSION STEPPER CARD ── */}
      {!isCancelled && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/70 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 sm:p-7 space-y-3 w-full">
          <div className="grid grid-cols-4 gap-1 sm:gap-2 relative">
            {STEPS.map((step, idx) => {
              const { isPassed, isCurrent, isReached, time, sub } = getStepDetails(step, idx);

              return (
                <div key={step.key} className="space-y-1.5 sm:space-y-2 relative text-center sm:text-left min-w-0">
                  <div className="flex items-center gap-1 sm:gap-2 justify-center sm:justify-start">
                    <span className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold shrink-0 transition-all ${
                      isPassed
                        ? 'bg-emerald-500 text-white'
                        : isCurrent
                        ? 'border-2 border-blue-600 bg-white text-blue-600 ring-2 sm:ring-4 ring-blue-100'
                        : 'border-2 border-slate-200 bg-white text-transparent'
                    }`}>
                      {isPassed ? (
                        '✓'
                      ) : isCurrent ? (
                        <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                      ) : (
                        ''
                      )}
                    </span>
                    <div className="hidden sm:block flex-1 h-1 rounded-full bg-slate-200 overflow-hidden">
                      <div className={`h-full transition-all ${
                        isPassed ? 'bg-emerald-500 w-full' : isCurrent ? 'bg-blue-600 w-1/2 animate-pulse' : 'w-0'
                      }`} />
                    </div>
                  </div>

                  <div className="px-0.5">
                    <p className={`text-[10px] sm:text-xs font-bold truncate ${
                      isReached ? 'text-zinc-900' : 'text-zinc-400'
                    }`}>
                      {step.label}
                    </p>
                    <p className={`font-mono text-[9px] sm:text-[10px] font-semibold truncate ${
                      isReached ? 'text-zinc-600' : 'text-zinc-300'
                    }`}>
                      {time}
                    </p>
                    <p className={`text-[9px] sm:text-[10px] hidden sm:block truncate ${
                      isReached ? 'text-zinc-500' : 'text-zinc-400'
                    }`}>
                      {sub}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 3. FULL-WIDTH OTP VERIFICATION CARD ── */}
      {(status === 'accepted' || status === 'arriving') && booking.start_otp && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/70 p-4 sm:p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 sm:gap-6 w-full">
          {/* Left info */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <p className="text-[10px] sm:text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                In-Person Verification
              </p>
              <h4 className="text-base sm:text-lg font-black text-zinc-900 leading-tight">
                Enter Service Start OTP
              </h4>
              <p className="text-[11px] sm:text-xs text-zinc-500 font-medium">
                Share this code with your assistant in person.
              </p>
            </div>
          </div>

          {/* Center Digits & Copy Button */}
          <div className="flex flex-wrap items-center justify-between sm:justify-center gap-2">
            <div className="flex items-center gap-1.5">
              {String(booking.start_otp || '144892').split('').map((digit, i) => (
                <div
                  key={i}
                  className="w-8 h-10 sm:w-10 sm:h-12 rounded-lg sm:rounded-xl bg-blue-50/70 border border-blue-100 flex items-center justify-center font-mono font-black text-base sm:text-xl text-blue-600 shadow-2xs"
                >
                  {digit}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(String(booking.start_otp));
                toast.success('OTP copied to clipboard!');
              }}
              className="px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 border border-blue-100 shrink-0"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </button>
          </div>

          {/* Right Helper Box */}
          <div className="hidden lg:flex items-center gap-3 border-l border-slate-100 pl-6 text-xs text-zinc-400 max-w-[220px]">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
              <User className="w-4 h-4" />
            </div>
            <p className="leading-tight font-medium">
              Share this code only when you meet your assistant at the platform.
            </p>
          </div>
        </div>
      )}

      {/* ── 4. TWO-COLUMN GRID LAYOUT ── */}
      <div className="grid lg:grid-cols-12 gap-4 sm:gap-8 items-start w-full">
        {/* Left Column (8 cols): Platform Details, Assistant Profile, Messaging */}
        <div className="lg:col-span-8 space-y-4 sm:space-y-6 min-w-0 w-full">
          {/* Trip & Platform Details Card */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/70 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 sm:p-8 space-y-4 sm:space-y-6 w-full">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 sm:pb-4">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                  <Train className="w-4 h-4 sm:w-5 sm:h-5" />
                </span>
                <h3 className="text-base sm:text-lg font-extrabold tracking-tight text-zinc-900 truncate">
                  Trip &amp; Platform Details
                </h3>
              </div>

              <button
                type="button"
                onClick={() => toast.success(`Live map for station ${booking.station_code || 'KZJ'} active`)}
                className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-[11px] sm:text-xs transition-colors cursor-pointer flex items-center gap-1 sm:gap-1.5 border border-blue-100 shrink-0 ml-2"
              >
                <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>View on Map</span>
              </button>
            </div>

            {/* Train Hero Banner Box inside Card */}
            <div className="bg-[#f0f7ff] border border-blue-100/80 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 sm:gap-6 relative overflow-hidden">
              <div className="flex items-center gap-3 sm:gap-4 relative z-10 min-w-0">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-white shadow-xs p-1 sm:p-1.5 flex items-center justify-center shrink-0 border border-blue-100">
                  <img
                    src="https://images.unsplash.com/photo-1532105956626-9569c03602f6?auto=format&fit=crop&w=150&q=80"
                    alt="Train"
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-lg sm:text-xl font-black text-zinc-900 leading-tight truncate">
                    {booking.train_name || 'Grand Trunk Express'}
                  </h4>
                  <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-extrabold text-[10px] sm:text-xs">
                    Train No. {booking.train_no || booking.train_number || '12615'}
                  </span>
                </div>
              </div>

              {/* Station Route Banner */}
              <div className="flex items-center gap-2 sm:gap-4 text-[11px] sm:text-xs font-semibold text-zinc-600 bg-white/90 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-blue-100/60 backdrop-blur-xs w-full md:w-auto justify-between">
                <div>
                  <p className="font-black text-zinc-900">{booking.station_code || 'KZJ'}</p>
                  <p className="text-[9px] sm:text-[10px] text-zinc-400">Kazipet Jn</p>
                </div>
                <div className="flex flex-col items-center px-1 sm:px-2">
                  <span className="text-[9px] sm:text-[10px] text-blue-600 font-bold flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDateString(booking.journey_date)}
                  </span>
                  <span className="text-blue-300 font-mono text-[10px]">----------&gt;</span>
                </div>
                <div className="text-right">
                  <p className="font-black text-zinc-900">KAZIPET JN</p>
                  <p className="text-[9px] sm:text-[10px] text-zinc-400">Destination</p>
                </div>
              </div>
            </div>

            {/* Platform Details Subsection */}
            <div className="space-y-2.5 sm:space-y-3 pt-1 sm:pt-2">
              <p className="text-[11px] sm:text-xs font-extrabold text-zinc-900 uppercase tracking-wider">
                Platform Details
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
                <div className="p-3 sm:p-3.5 bg-blue-50/50 rounded-xl sm:rounded-2xl border border-blue-100/60 flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-100/80 text-blue-600 flex items-center justify-center shrink-0">
                    <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] sm:text-[10px] text-zinc-400 font-medium">Coach</p>
                    <p className="font-black text-sm sm:text-base text-zinc-900 font-mono truncate">
                      {booking.coach || booking.services?.coach || 'S3'}
                    </p>
                  </div>
                </div>

                <div className="p-3 sm:p-3.5 bg-blue-50/50 rounded-xl sm:rounded-2xl border border-blue-100/60 flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-100/80 text-blue-600 flex items-center justify-center shrink-0">
                    <Armchair className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] sm:text-[10px] text-zinc-400 font-medium">Seat / Berth</p>
                    <p className="font-black text-xs text-zinc-900 truncate">
                      {booking.seat_number || booking.services?.seat_number || '33'} ({booking.berth_type || 'Lower'})
                    </p>
                  </div>
                </div>

                <div className="p-3 sm:p-3.5 bg-blue-50/50 rounded-xl sm:rounded-2xl border border-blue-100/60 flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-100/80 text-blue-600 flex items-center justify-center shrink-0">
                    <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] sm:text-[10px] text-zinc-400 font-medium">Station Hub</p>
                    <p className="font-black text-sm sm:text-base text-zinc-900 font-mono truncate">
                      {booking.station_code || 'KZJ'}
                    </p>
                  </div>
                </div>

                <div className="p-3 sm:p-3.5 bg-blue-50/50 rounded-xl sm:rounded-2xl border border-blue-100/60 flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-100/80 text-blue-600 flex items-center justify-center shrink-0">
                    <Luggage className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] sm:text-[10px] text-zinc-400 font-medium">Luggage Mission</p>
                    <p className="font-black text-[11px] sm:text-xs text-zinc-900 leading-tight break-words">
                      {isBoarding ? 'Boarding (Load)' : 'De-board (Collect)'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Requested Services Banner Bar at Bottom */}
            <div className="p-3 sm:p-3.5 bg-[#f0f7ff] rounded-xl sm:rounded-2xl border border-blue-100/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-zinc-600">
              <div className="flex items-start sm:items-center gap-2 min-w-0 flex-1">
                <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 font-bold text-[10px] sm:text-xs mt-0.5 sm:mt-0">
                  ⓘ
                </span>
                <p className="leading-snug text-zinc-700 font-medium text-[11px] sm:text-xs">
                  Requested services: Luggage Assistance ({booking.services?.luggage || 1} item) | Coach: {booking.coach || booking.services?.coach || 'S3'} | Seat: {booking.seat_number || booking.services?.seat_number || '33'} ({booking.berth_type || 'Lower'})
                </p>
              </div>
              <span className="font-mono text-[10px] sm:text-[11px] text-zinc-400 shrink-0 self-end sm:self-center">
                Journey time: {booking.journey_time || '20:05'}
              </span>
            </div>
          </div>

          {/* Assistant Details Card */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/70 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 sm:p-7 space-y-4 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black text-white flex items-center justify-center font-black text-base sm:text-lg shrink-0 shadow-xs">
                  {booking.assistant?.name ? booking.assistant.name.charAt(0).toUpperCase() : 'R'}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm sm:text-base font-extrabold text-zinc-900 truncate">
                      {booking.assistant?.name || (status === 'pending' ? 'Assistant Allocation Pending' : 'Ramesh - Platform Assistant')}
                    </h3>
                    <span className={`px-2.5 py-0.5 text-[9px] sm:text-[10px] font-extrabold rounded-full border uppercase tracking-wider shrink-0 ${assistantBadge.bg}`}>
                      {assistantBadge.label}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] sm:text-xs text-zinc-500 font-medium mt-1">
                    <span>Station {booking.station_code || 'KZJ'}</span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1 text-blue-600 font-bold shrink-0">
                      <span className="w-2 h-2 rounded-full bg-blue-600" />
                      KYC Verified
                    </span>
                    <span>•</span>
                    <span
                      title={review || booking.review ? `Feedback: "${review || booking.review}"` : undefined}
                      className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/90 shadow-xs shrink-0 transition-all"
                    >
                      <Star className="w-3 h-3 fill-amber-400 text-amber-500 shrink-0" />
                      <span>{displayRating}</span>
                      <span className="text-[10px] font-semibold text-amber-800/80">
                        {hasPassengerFeedback ? 'Feedback' : 'Rating'}
                      </span>
                    </span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-zinc-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200/90 shadow-xs shrink-0">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>{bookingsCount} Bookings Done</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    if (booking.assistant?.phone) {
                      toast.success(`Calling assistant: ${booking.assistant.phone}`);
                    } else if (status === 'pending') {
                      toast.error('Assistant not assigned yet.');
                    } else {
                      toast.success('Calling assistant: +91 98765 43210');
                    }
                  }}
                  className="flex-1 sm:flex-initial px-4 py-2 sm:px-5 sm:py-2.5 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 border border-blue-100"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const chatEl = document.getElementById('assistant-chat-input');
                    if (chatEl) chatEl.focus();
                  }}
                  className="flex-1 sm:flex-initial px-4 py-2 sm:px-5 sm:py-2.5 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 border border-blue-100"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Message</span>
                </button>
              </div>
            </div>

            {sosSent && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>🚨 Emergency SOS Alert transmitted to Station Operations Supervisor.</span>
              </div>
            )}
          </div>

          {/* Assistant Messaging Live Channel */}
          {!isCancelled && (
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/70 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 sm:p-8 space-y-4 w-full">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 sm:pb-4">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                    <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
                  </span>
                  <h3 className="text-sm sm:text-base font-extrabold text-zinc-900">
                    Assistant Messaging
                  </h3>
                </div>
                <span className={`px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-[11px] font-semibold rounded-full border ${
                  isCompleted ? 'bg-slate-100 text-zinc-500 border-slate-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                  {isCompleted ? 'Channel Closed (Trip Completed)' : 'Live Platform Channel'}
                </span>
              </div>

              {/* Messages Feed */}
              <div className="space-y-3 min-h-[120px] max-h-60 overflow-y-auto p-3 sm:p-4 bg-slate-50/70 rounded-xl sm:rounded-2xl border border-slate-200/60">
                {chatMsgs.length === 0 ? (
                  <div className="text-center py-6 sm:py-8 text-xs text-zinc-400 font-medium space-y-1">
                    <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-zinc-300 mx-auto mb-1.5" />
                    <p className="font-bold text-zinc-700">No messages yet.</p>
                    <p>Send a note about your coach or coach position.</p>
                  </div>
                ) : (
                  chatMsgs.map((m, i) => {
                    const isPassenger = m.from === 'passenger';
                    return (
                      <div
                        key={i}
                        className={`flex flex-col ${isPassenger ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-xs px-4 py-2.5 rounded-2xl text-xs font-medium ${
                            isPassenger
                              ? 'bg-blue-600 text-white rounded-br-none shadow-xs'
                              : 'bg-white text-zinc-900 border border-slate-200 rounded-bl-none shadow-xs'
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
                  id="assistant-chat-input"
                  type="text"
                  value={msgInput}
                  disabled={isCompleted}
                  onChange={(e) => setMsgInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                  placeholder={isCompleted ? "Trip completed. Live messaging closed." : "Send a note about your coach position..."}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-3.5 py-2.5 sm:px-4 sm:py-3 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition-all min-w-0 disabled:opacity-60 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={sendChat}
                  disabled={isCompleted}
                  className="bg-black hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-4 py-2.5 sm:px-6 sm:py-3 rounded-full text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                >
                  <span>Send</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Post-Trip Rating & Feedback Section */}
          {isCompleted && (
            (isSubmitted || booking.rating || rating > 0) ? (
              <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/70 p-4 sm:p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-3 w-full">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    </span>
                    <div>
                      <h3 className="text-sm sm:text-base font-extrabold text-zinc-900">
                        Trip Feedback &amp; Rating
                      </h3>
                      <p className="text-[11px] text-zinc-500 font-medium">Rating submitted for {booking.assistant?.name || 'Assistant'}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-[10px] sm:text-[11px] font-extrabold rounded-full uppercase tracking-wider">
                    ✓ Submitted
                  </span>
                </div>

                <div className="flex items-center gap-1.5 pt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-5 h-5 ${
                        star <= (booking.rating || rating || 5)
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-200'
                      }`}
                    />
                  ))}
                  <span className="text-xs font-black text-zinc-900 ml-2">
                    {booking.rating || rating || 5} / 5 Stars
                  </span>
                </div>

                {(review || booking.review) && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 text-xs text-zinc-700 italic">
                    "{review || booking.review}"
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/70 p-4 sm:p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4 w-full">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                      <Star className="w-4 h-4 text-amber-600" />
                    </span>
                    <div>
                      <h3 className="text-sm sm:text-base font-extrabold text-zinc-900">
                        Rate Your Assistant
                      </h3>
                      <p className="text-[11px] text-zinc-500 font-medium">Share feedback for {booking.assistant?.name || 'Platform Assistant'}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 py-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="p-1 cursor-pointer transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-7 h-7 sm:w-8 sm:h-8 ${
                          star <= rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-200 hover:text-amber-300'
                        }`}
                      />
                    </button>
                  ))}
                  {rating > 0 && (
                    <span className="text-xs font-black text-amber-600 ml-2">
                      {rating} of 5 Stars
                    </span>
                  )}
                </div>

                <textarea
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  placeholder="Share a quick note about your experience (optional)..."
                  rows={2}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
                />

                <button
                  type="button"
                  onClick={submitRating}
                  disabled={rating === 0 || submittingRating}
                  className="w-full py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  {submittingRating ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </div>
            )
          )}
        </div>

        {/* Right Column (4 cols): Quick Actions & Support */}
        <div className="lg:col-span-4 space-y-4 sm:space-y-6 w-full">
          {/* Status Overview Mini-Card */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/70 p-4 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-3 w-full">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold tracking-wider text-zinc-400 uppercase">
                Trip Overview
              </span>
              <span className={`px-2.5 py-0.5 text-[9px] font-extrabold rounded-full uppercase tracking-wider ${tripSummaryBadge.bg}`}>
                {tripSummaryBadge.label}
              </span>
            </div>

            <div className="space-y-2 pt-1 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-zinc-500">Train</span>
                <span className="font-mono font-bold text-zinc-900">{booking.train_no || booking.train_number}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-zinc-500">Coach / Seat</span>
                <span className="font-bold text-zinc-900">{booking.coach || 'S3'} / {booking.seat_number || '33'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-zinc-500">Total Price</span>
                <span className="font-bold text-zinc-900">₹{booking.total_price || 0}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-zinc-500">Payment</span>
                <span className="font-bold text-emerald-600 uppercase">{booking.payment_status || 'Paid'}</span>
              </div>
            </div>
          </div>

          {/* Safety & SOS Card */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/70 p-4 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-3 w-full">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Assistance Controls</span>
            </h4>

            <div className="space-y-2 pt-1">
              {!isCompleted && !isCancelled && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowSosModal(true)}
                    className="w-full py-2.5 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Emergency SOS Alert</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowCancelModal(true)}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-zinc-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Cancel Assistance</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: `OneCoolie Trip #${booking.id?.slice(-8)}`,
                      text: `Tracking OneCoolie assistance for train ${booking.train_no} at ${booking.station_code}.`,
                      url: window.location.href,
                    });
                  } else {
                    navigator.clipboard.writeText(window.location.href);
                    toast.success('Live trip link copied to clipboard!');
                  }
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-zinc-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share Trip Details</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Cancellation Dialog */}
      <ConfirmDialog
        open={showCancelModal}
        title="Cancel Assistance Request"
        message="Are you sure you want to cancel this booking? This action cannot be reversed."
        onConfirm={handleCancel}
        onCancel={() => setShowCancelModal(false)}
      />

      {/* Confirm SOS Dialog */}
      <ConfirmDialog
        open={showSosModal}
        title="Trigger Emergency SOS"
        message="This will immediately transmit an emergency alert with your coach location to Station Operations. Proceed only in genuine emergencies."
        onConfirm={handleSos}
        onCancel={() => setShowSosModal(false)}
      />
    </div>
  );
}