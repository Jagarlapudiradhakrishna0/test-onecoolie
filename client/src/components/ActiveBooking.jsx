import { useState, useEffect, useRef } from 'react';
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
  AlertTriangle,
  Send,
  Check,
  Headphones,
  ArrowRight,
  ShieldCheck,
  Copy,
  Radio,
  Users,
  Clock,
  CreditCard,
  AlertCircle,
  Navigation,
  Accessibility,
  Languages,
  Coffee,
  Car,
  Sparkles,
  Briefcase,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import axios from '../api/axios';
import vandeBharatCrisp from '../assets/images/vande-bharat-crisp.jpg';
import CancellationModal from './cancellation/CancellationModal';
import RebookingModal from './cancellation/RebookingModal';
import CancellationPolicyModal from './cancellation/CancellationPolicyModal';
import {
  getLocalChat,
  saveLocalChat,
  clearLocalChat,
  broadcastChatTab,
  mergeChatMessages,
  fetchRemoteChat,
  persistRemoteChat
} from '../utils/chatSync';
import { handleContactSupport, isMobileDevice } from '../services/supportService';

/* ============================================================
   ACTIVE BOOKING / TRIP DETAILS PAGE (SWISS-INSPIRED MINIMAL REDESIGN)
   Strictly Black, White, and OneCoolie Blue (#1463FF)
   ============================================================ */

export default function ActiveBooking({ booking, onUpdate, distance = 500 }) {
  const navigate = useNavigate();
  const bookingUuid = booking?.id || '';
  const bookingCode = booking?.booking_id || '';

  // ── 1. Live Chat State ──
  const [chatMsgs, setChatMsgs] = useState(() => {
    const local = getLocalChat(bookingUuid, bookingCode);
    if (local.length > 0) return local;
    const serverMsgs = booking?.chat_messages || booking?.services?.chat_messages;
    if (Array.isArray(serverMsgs) && serverMsgs.length > 0) return serverMsgs;
    return [];
  });

  const [msgInput, setMsgInput] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const lastSentRef = useRef({ text: '', time: 0 });
  const chatBottomRef = useRef(null);

  // Sync chat from local storage & Supabase
  useEffect(() => {
    if (!bookingUuid && !bookingCode) return;
    const local = getLocalChat(bookingUuid, bookingCode);
    if (local.length > 0) {
      setChatMsgs((prev) => {
        const { merged, changed } = mergeChatMessages(prev, local);
        return changed ? merged : prev;
      });
    }

    let isMounted = true;
    fetchRemoteChat(bookingUuid, bookingCode).then((remoteMsgs) => {
      if (isMounted && Array.isArray(remoteMsgs) && remoteMsgs.length > 0) {
        setChatMsgs((prev) => {
          const { merged, changed } = mergeChatMessages(prev, remoteMsgs);
          if (changed) {
            saveLocalChat(bookingUuid, bookingCode, merged);
            return merged;
          }
          return prev;
        });
      }
    });

    return () => {
      isMounted = false;
    };
  }, [bookingUuid, bookingCode]);

  useEffect(() => {
    if (chatMsgs.length > 0 && isChatOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMsgs.length, isChatOpen]);

  // ── 2. Socket Listeners ──
  useEffect(() => {
    if (!bookingUuid && !bookingCode) return;

    let bc = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('onecoolie_chat_channel');
        bc.onmessage = (event) => {
          const data = event.data;
          if (!data || !data.message) return;
          const targetId = data.bookingId;
          const targetCode = data.bookingCode;
          if (
            targetId === bookingUuid ||
            targetId === bookingCode ||
            targetCode === bookingUuid ||
            targetCode === bookingCode
          ) {
            setChatMsgs((prev) => {
              const { merged, changed } = mergeChatMessages(prev, [data.message]);
              if (!changed) return prev;
              saveLocalChat(bookingUuid, bookingCode, merged);
              return merged;
            });
          }
        };
      }
    } catch (e) { }

    const joinRooms = () => {
      if (!window.socket) return;
      if (bookingUuid) window.socket.emit('join_booking', bookingUuid);
      if (bookingCode && bookingCode !== bookingUuid) window.socket.emit('join_booking', bookingCode);
    };

    const handleStatus = (b) => {
      if (b && (b.id === bookingUuid || b.id === bookingCode || b.booking_id === bookingCode)) {
        onUpdate?.(b);
      }
    };

    const handleIncomingChat = (incomingMsg) => {
      if (!incomingMsg || !incomingMsg.text) return;
      const targetId = incomingMsg.bookingId;
      const targetCode = incomingMsg.bookingCode;
      if (
        !targetId ||
        targetId === bookingUuid ||
        targetId === bookingCode ||
        targetCode === bookingUuid ||
        targetCode === bookingCode
      ) {
        setChatMsgs((prev) => {
          const { merged, changed } = mergeChatMessages(prev, [incomingMsg]);
          if (!changed) return prev;
          saveLocalChat(bookingUuid, bookingCode, merged);
          return merged;
        });
      }
    };

    if (window.socket) {
      joinRooms();
      window.socket.on('connect', joinRooms);
      window.socket.on('status_update', handleStatus);
      window.socket.on('chat_message', handleIncomingChat);
    }

    return () => {
      if (bc) {
        try { bc.close(); } catch (e) { }
      }
      if (window.socket) {
        window.socket.off('connect', joinRooms);
        window.socket.off('status_update', handleStatus);
        window.socket.off('chat_message', handleIncomingChat);
      }
    };
  }, [bookingUuid, bookingCode, onUpdate]);

  // ── 3. Ratings & Feedback State (Strictly Empty by Default, Database Backed) ──
  const dbRating = booking?.rating ? Number(booking.rating) : null;
  const dbReview = booking?.review || '';
  const isAlreadySubmitted = Boolean(dbRating && dbRating >= 1 && dbRating <= 5);

  const [rating, setRating] = useState(() => dbRating);
  const [review, setReview] = useState(() => dbReview);
  const [feedbackStatus, setFeedbackStatus] = useState(() => isAlreadySubmitted ? 'success' : 'idle'); // 'idle' | 'loading' | 'success' | 'error'
  const [feedbackError, setFeedbackError] = useState('');
  const [showCancellationModal, setShowCancellationModal] = useState(false);
  const [showRebookingModal, setShowRebookingModal] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [showSosModal, setShowSosModal] = useState(false);
  const [sosSent, setSosSent] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  // Sync if booking changes or loads fresh data from DB
  useEffect(() => {
    if (booking?.rating && Number(booking.rating) > 0) {
      setRating(Number(booking.rating));
      if (booking?.review) setReview(booking.review);
      setFeedbackStatus('success');
    }
  }, [booking?.rating, booking?.review]);

  // ── 4. Derived Booking Details (From Real Database Booking) ──
  const rawStatus = (booking?.booking_status || booking?.status || 'pending').toLowerCase();
  const isCompleted = rawStatus === 'completed';
  const isCancelled = rawStatus === 'cancelled';
  const isInService = rawStatus === 'in_service';
  const canCancel = !isCancelled && !isCompleted && !isInService;
  const isBoarding = !(booking?.action_type === 'collect_from_seat' || booking?.services?.action_type === 'collect_from_seat');

  const trainNo = booking?.train_no || booking?.train_number || 'Train';
  const rawTrainName = booking?.train_name || 'Express';
  const fromStationName = booking?.source || booking?.from_station || booking?.station_name || 'Origin';
  const toStationName = booking?.destination || booking?.to_station || 'Destination';
  const stationCode = booking?.station_code || booking?.source || '';
  const stationName = booking?.station_name || fromStationName;
  const destStationCode = booking?.destination || 'Destination';

  // Extract clean train name without duplicating the route / station names
  const cleanTrainName = (() => {
    let name = (booking?.train_name || '').trim();
    if (!name) return 'Express';

    // Strip fromStation and toStation if present at start
    if (fromStationName && toStationName) {
      const routeRegex = new RegExp(`^${fromStationName}\\s*[-–—→/to]+\\s*${toStationName}\\s*`, 'i');
      name = name.replace(routeRegex, '').trim();
    }
    // Also strip generic "City1 - City2" prefix
    name = name.replace(/^[A-Za-z\s]+[-–—→/]\s*[A-Za-z\s]+[-–—:]\s*/i, '').trim();
    // Strip leading numbers
    name = name.replace(/^\d+\s*[-–—/]\s*/, '').trim();

    return name || 'Express';
  })();
  const trainName = cleanTrainName;

  const coach = booking?.coach || booking?.services?.coach || 'Unassigned';
  const seatNumber = booking?.seat_number || booking?.services?.seat_number || 'Unassigned';
  const berthType = booking?.berth_type || booking?.services?.berth_type || 'Berth';
  const serviceLabel = isBoarding ? 'Boarding Load' : 'Platform Assist';
  const specialInstructions = booking?.special_instructions || booking?.notes || booking?.service_description || 'Standard platform assistance';
  const fareAmount = booking?.total_price ?? booking?.amount ?? 0;
  const paymentStatus = (booking?.payment_status || 'PAID').toUpperCase();
  const paymentMethod = booking?.payment_method || 'Online Payment';

  // ── Extract All Selected Assistance Services ──
  const getSelectedServices = () => {
    const list = [];
    const s = booking?.services;

    // 1. If services is an object with selected flags
    if (s && typeof s === 'object' && !Array.isArray(s)) {
      if (s.luggage || (typeof s.luggage === 'number' && s.luggage > 0) || s.luggageCounts) {
        const count = typeof s.luggage === 'number' ? s.luggage : 1;
        const details = s.luggage_details || (count > 1 ? `${count} items` : '1 item');
        list.push({
          key: 'luggage',
          name: 'Luggage Assistance',
          desc: 'Porter handling from station gate directly to berth',
          badge: details,
          icon: <Luggage className="w-3.5 h-3.5 text-[#1463FF]" />,
        });
      }
      if (s.escort) {
        list.push({
          key: 'escort',
          name: 'Seat & Coach Escort',
          desc: 'Personal guide navigating platform foot-bridges to your exact coach',
          badge: 'Included',
          icon: <Navigation className="w-3.5 h-3.5 text-[#1463FF]" />,
        });
      }
      if (s.wheelchair) {
        list.push({
          key: 'wheelchair',
          name: 'Wheelchair & Priority',
          desc: 'Wheelchair transit and dedicated escort for seniors & mobility needs',
          badge: 'Priority',
          icon: <Accessibility className="w-3.5 h-3.5 text-[#1463FF]" />,
        });
      }
      if (s.language) {
        list.push({
          key: 'language',
          name: 'Multilingual Guide',
          desc: 'Local communication assistance in Telugu, Hindi, or English',
          badge: 'Included',
          icon: <Languages className="w-3.5 h-3.5 text-[#1463FF]" />,
        });
      }
      if (s.snacks) {
        list.push({
          key: 'snacks',
          name: 'Berth Refreshments',
          desc: 'Station water and packed snacks delivered right to your seat',
          badge: 'Included',
          icon: <Coffee className="w-3.5 h-3.5 text-[#1463FF]" />,
        });
      }
      if (s.transport) {
        list.push({
          key: 'transport',
          name: 'Exit Gate & Cab Transfer',
          desc: 'Assistance connecting to pre-booked cab or station auto stand',
          badge: 'Included',
          icon: <Car className="w-3.5 h-3.5 text-[#1463FF]" />,
        });
      }
    }

    // 2. Parse raw string if list is empty
    if (list.length === 0) {
      const rawString =
        (typeof booking?.services === 'string' ? booking.services : '') ||
        booking?.service ||
        booking?.service_type ||
        booking?.service_description ||
        '';

      if (rawString) {
        const lower = rawString.toLowerCase();
        if (lower.includes('luggage') || lower.includes('load') || lower.includes('porter')) {
          const countMatch = rawString.match(/(\d+)\s*item/i) || rawString.match(/(\d+)\s*bag/i);
          const countStr = countMatch ? `${countMatch[1]} items` : '1-2 items';
          list.push({
            key: 'luggage',
            name: 'Luggage Assistance',
            desc: 'Porter handling from station gate directly to berth',
            badge: countStr,
            icon: <Luggage className="w-3.5 h-3.5 text-[#1463FF]" />,
          });
        }
        if (lower.includes('escort') || lower.includes('seat') || lower.includes('coach') || lower.includes('assist')) {
          list.push({
            key: 'escort',
            name: 'Seat & Coach Escort',
            desc: 'Personal guide navigating platform foot-bridges to your exact coach',
            badge: 'Included',
            icon: <Navigation className="w-3.5 h-3.5 text-[#1463FF]" />,
          });
        }
        if (lower.includes('wheelchair') || lower.includes('elderly')) {
          list.push({
            key: 'wheelchair',
            name: 'Wheelchair & Priority',
            desc: 'Wheelchair transit and dedicated escort for seniors & mobility needs',
            badge: 'Priority',
            icon: <Accessibility className="w-3.5 h-3.5 text-[#1463FF]" />,
          });
        }
        if (lower.includes('snack') || lower.includes('water')) {
          list.push({
            key: 'snacks',
            name: 'Berth Refreshments',
            desc: 'Station water and packed snacks delivered right to your seat',
            badge: 'Included',
            icon: <Coffee className="w-3.5 h-3.5 text-[#1463FF]" />,
          });
        }
        if (lower.includes('language')) {
          list.push({
            key: 'language',
            name: 'Multilingual Guide',
            desc: 'Local communication assistance in Telugu, Hindi, or English',
            badge: 'Included',
            icon: <Languages className="w-3.5 h-3.5 text-[#1463FF]" />,
          });
        }
        if (lower.includes('transport') || lower.includes('cab') || lower.includes('auto')) {
          list.push({
            key: 'transport',
            name: 'Exit Gate & Cab Transfer',
            desc: 'Assistance connecting to pre-booked cab or station auto stand',
            badge: 'Included',
            icon: <Car className="w-3.5 h-3.5 text-[#1463FF]" />,
          });
        }
      }
    }

    // 3. Fallback: Always display the primary confirmed booking services
    if (list.length === 0) {
      list.push({
        key: 'luggage',
        name: 'Luggage Assistance',
        desc: 'Porter handling from station gate to seat ' + seatNumber,
        badge: '1 item',
        icon: <Luggage className="w-3.5 h-3.5 text-[#1463FF]" />,
      });
      list.push({
        key: 'escort',
        name: 'Seat & Coach Escort',
        desc: 'Personal guide navigating directly to coach ' + coach,
        badge: 'Included',
        icon: <Navigation className="w-3.5 h-3.5 text-[#1463FF]" />,
      });
    }

    return list;
  };

  const selectedServices = getSelectedServices();

  // Format Dates & Times
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

  const bookingCreationTime = formatTimeHHMM(booking?.created_at) || '--:--';
  const bookingCreationDate = booking?.created_at
    ? (() => {
      try {
        const d = new Date(booking.created_at);
        const day = String(d.getDate()).padStart(2, '0');
        const month = d.toLocaleString('en-US', { month: 'short' });
        const year = d.getFullYear();
        return `${day} ${month} ${year}`;
      } catch (e) {
        return 'Today';
      }
    })()
    : 'Today';

  const paidOnFormatted = booking?.created_at
    ? `${bookingCreationDate}, ${bookingCreationTime}`
    : 'Confirmed';

  const journeyDateFormatted = booking?.journey_date
    ? (() => {
      try {
        const d = new Date(booking.journey_date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = d.toLocaleString('en-US', { month: 'short' });
        const year = d.getFullYear();
        return `${day} ${month} ${year}`;
      } catch (e) {
        return 'Scheduled';
      }
    })()
    : 'Scheduled';

  const journeyWeekday = booking?.journey_date
    ? (() => {
      try {
        const d = new Date(booking.journey_date);
        return d.toLocaleDateString('en-US', { weekday: 'long' });
      } catch (e) {
        return 'Journey Day';
      }
    })()
    : 'Journey Day';

  // Assistant Allocated Status
  const hasAssignedAssistant = Boolean(
    booking?.assistant_id &&
    booking?.assistant &&
    booking.assistant.name &&
    rawStatus !== 'pending'
  );

  const assistantName = booking?.assistant?.name || 'Assigned Assistant';

  const assistantBookingsCount =
    booking?.assistant?.completed_jobs ??
    booking?.assistant?.total_completed ??
    booking?.assistant?.completed_bookings ??
    booking?.assistant?.total_trips ??
    booking?.assistant?.bookings_count ??
    booking?.assistant?.bookings_done ??
    booking?.assistant?.jobs ??
    0;

  const assistantRating = booking?.assistant?.rating
    ? Number(booking.assistant.rating).toFixed(1)
    : null;

  const assistantReviewsCount =
    booking?.assistant?.reviews_count ||
    booking?.assistant?.total_reviews ||
    booking?.assistant?.ratings_count ||
    0;

  // ── 5. Status Milestone Steps (Strictly as Ordered) ──
  // 1. Booking Confirmed (MUST be first)
  // 2. Assistant Assigned
  // 3. Assistant Reached
  // 4. Service Completed
  const isAssigned = ['accepted', 'arriving', 'in_service', 'completed'].includes(rawStatus);
  const isReached = ['arriving', 'in_service', 'completed'].includes(rawStatus);
  const isServiceDone = rawStatus === 'completed';

  const assignedTime = isAssigned
    ? formatTimeHHMM(booking?.accepted_at || booking?.services?.accepted_at || booking?.updated_at) || '--:--'
    : '--:--';

  const reachedTime = isReached
    ? formatTimeHHMM(booking?.arrived_at || booking?.services?.arrived_at) || '--:--'
    : '--:--';

  const completedTime = isServiceDone
    ? formatTimeHHMM(booking?.completed_at || booking?.services?.completed_at) || '--:--'
    : '--:--';

  const steps = [
    {
      id: 'confirmed',
      label: 'Booking Confirmed',
      sub: isAssigned ? 'Confirmed & Registered' : 'Allocating assistant...',
      time: bookingCreationTime,
      date: bookingCreationDate,
      isDone: true,
      isCurrent: !isAssigned && !isCompleted && !isCancelled,
    },
    {
      id: 'assigned',
      label: 'Assistant Assigned',
      sub: isAssigned ? (booking?.assistant?.name ? `Assigned: ${booking.assistant.name}` : 'Assistant Assigned') : 'Pending arrival',
      time: assignedTime,
      isDone: isAssigned,
      isCurrent: isAssigned && !isReached && !isCompleted,
    },
    {
      id: 'reached',
      label: 'Assistant Reached',
      sub: isReached ? 'Assistant at platform' : 'Pending start OTP',
      time: reachedTime,
      isDone: isReached,
      isCurrent: isReached && !isServiceDone && !isCompleted,
    },
    {
      id: 'completed',
      label: 'Service Completed',
      sub: isServiceDone ? 'Assistance completed' : 'Pending completion',
      time: completedTime,
      isDone: isServiceDone,
      isCurrent: false,
    },
  ];

  // ── 6. Actions (Send Chat, Submit Rating, Cancel, SOS) ──
  const sendChat = (customText) => {
    const text = (customText || msgInput).trim();
    if (!text) return;
    const now = Date.now();
    if (lastSentRef.current.text === text && now - lastSentRef.current.time < 800) return;
    lastSentRef.current = { text, time: now };

    const clientMsgId = `cmsg-${now}-${Math.random().toString(36).slice(2, 9)}`;
    const msg = {
      id: clientMsgId,
      clientMessageId: clientMsgId,
      bookingId: bookingUuid || booking?.id,
      bookingCode: bookingCode || booking?.booking_id || null,
      from: 'passenger',
      senderRole: 'passenger',
      text,
      timestamp: new Date().toISOString(),
      status: 'sending',
    };

    setChatMsgs((prev) => {
      const { merged } = mergeChatMessages(prev, [msg]);
      saveLocalChat(bookingUuid, bookingCode, merged);
      return merged;
    });
    setMsgInput('');
    broadcastChatTab(bookingUuid, bookingCode, msg);
    persistRemoteChat(bookingUuid, bookingCode, msg);
  };

  const submitRating = async () => {
    if (!rating || rating < 1 || rating > 5) {
      toast.error('Please select a rating.');
      return;
    }
    setFeedbackStatus('loading');
    setFeedbackError('');

    const targetId = bookingUuid || booking?.id;
    try {
      const payload = {
        passengerId: booking?.passenger_id || booking?.passenger?.id,
        bookingId: booking?.id || bookingUuid,
        assistantId: booking?.assistant_id || booking?.assistant?.id,
        rating: Number(rating),
        comment: review.trim(),
        review: review.trim()
      };
      const { data } = await axios.post(`/bookings/${targetId}/rate`, payload);
      setFeedbackStatus('success');
      toast.success('Feedback submitted successfully!');
      if (data?.booking) {
        onUpdate?.(data.booking);
      }
    } catch (e) {
      console.error('Failed to submit rating:', e);
      setFeedbackStatus('error');
      const msg = e.response?.data?.message || 'Unable to submit feedback. Please try again.';
      setFeedbackError(msg);
      toast.error(msg);
    }
  };

  const handleCancel = async () => {
    if (isCancelling || !canCancel) return;
    setIsCancelling(true);
    try {
      const { data } = await axios.post(`/bookings/${booking.id}/cancel`);
      onUpdate?.(data.booking || data);
      setShowCancelModal(false);
      toast.success(data?.message || 'Booking cancelled successfully.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to cancel booking.');
    } finally {
      setIsCancelling(false);
    }
  };

  const triggerSos = async () => {
    try {
      await axios.post(`/service/${booking.id}/sos`, {
        station_code: stationCode,
        train_no: trainNo,
      });
      setSosSent(true);
      setShowSosModal(false);
      toast.error('🚨 Emergency SOS alert sent to station supervisor!');
    } catch (err) {
      setSosSent(true);
      setShowSosModal(false);
      toast.error('🚨 Emergency SOS alert logged.');
    }
  };

  return (
    <div className="space-y-6">
      {/* ══════════════════════════════════════════════════════════════════
          1. HERO SECTION (Wide Card with Integrated Railway Visual & Fade)
          ══════════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.03)] overflow-hidden relative">
        <div className="flex flex-col lg:flex-row items-stretch justify-between">
          {/* Left Hero Details: Drives exact card height with zero excess space */}
          <div className="p-4 sm:p-5 lg:py-4 lg:px-6 flex flex-col justify-center flex-1 z-10 w-full">
            <div>
              <span className="text-[10px] font-extrabold tracking-widest text-zinc-400 uppercase font-mono block mb-0.5">
                INDIAN RAILWAYS
              </span>
              <h1 className="text-xl sm:text-2xl lg:text-[26px] font-black tracking-tight leading-tight text-zinc-900 flex flex-wrap items-center">
                <span>{fromStationName}</span>
                <span className="text-[#1463FF] mx-1.5 font-normal">→</span>
                <span className="text-[#1463FF]">{toStationName}</span>
              </h1>
              <p className="text-[11px] sm:text-xs text-zinc-500 font-semibold mt-0.5">
                Train {trainNo} | {cleanTrainName}
              </p>

              {/* Information Row: Date & Stations Pills (Compact & Snug) */}
              <div className="flex flex-wrap items-center gap-2 mt-2.5">
                {/* Date Capsule */}
                <div className="bg-[#F8FAFC] border border-slate-200/70 rounded-2xl px-3 py-1.5 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-50 text-[#1463FF] flex items-center justify-center shrink-0">
                    <Calendar className="w-3 h-3 text-[#1463FF]" />
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-zinc-900 leading-tight">{journeyDateFormatted}</p>
                    <p className="text-[9px] text-zinc-400 font-semibold leading-tight">{journeyWeekday}</p>
                  </div>
                </div>

                {/* Route Stations Capsule */}
                <div className="bg-[#F8FAFC] border border-slate-200/70 rounded-2xl px-3 py-1.5 flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-blue-50 text-[#1463FF] flex items-center justify-center shrink-0">
                    <Train className="w-3 h-3 text-[#1463FF]" />
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-zinc-900 leading-tight">{stationCode}</p>
                    <p className="text-[9px] text-zinc-400 font-semibold leading-tight">{stationName}</p>
                  </div>
                  <span className="text-zinc-400 text-xs mx-0.5">→</span>
                  <div className="w-6 h-6 rounded-lg bg-blue-50 text-[#1463FF] flex items-center justify-center shrink-0">
                    <MapPin className="w-3 h-3 text-[#1463FF]" />
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-zinc-900 leading-tight">{destStationCode}</p>
                    <p className="text-[9px] text-zinc-400 font-semibold leading-tight">{toStationName}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tagline right below capsules */}
            <p className="text-[11px] text-zinc-500 font-medium mt-2">
              A faster, smoother, and more comfortable journey with OneCoolie.
            </p>

            {/* Quick Actions: Change Booking / Cancel Booking Pill Bar */}
            {canCancel && (
              <div className="flex flex-wrap items-center gap-2 mt-3.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRebookingModal(true)}
                  className="px-3.5 py-1.5 rounded-full bg-blue-50 hover:bg-blue-100 text-[#1463FF] border border-blue-200/80 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#1463FF]" />
                  <span>Change / Rebook Journey</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowCancellationModal(true)}
                  className="px-3.5 py-1.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                >
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Cancel Booking</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPolicyModal(true)}
                  className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-zinc-600 font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Cancellation Policy</span>
                </button>
              </div>
            )}
          </div>

          {/* Right Railway Visual: ONLY takes the exact height of the text */}
          <div className="relative w-full lg:w-[46%] min-h-[130px] lg:min-h-0 overflow-hidden bg-slate-100">
            <img
              src={vandeBharatCrisp}
              alt="Vande Bharat Express Platform"
              className="w-full h-full lg:absolute lg:inset-0 object-cover object-center"
            />
            {/* Smooth Gradient Fading from Image into White on the Left Edge */}
            <div className="absolute inset-y-0 left-0 w-28 bg-gradient-to-r from-white via-white/70 to-transparent pointer-events-none hidden lg:block" />
            {/* Subtle bottom gradient on mobile screens */}
            <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-white to-transparent pointer-events-none lg:hidden" />
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          2. TRUST STRIP (Horizontal 4-item strip with blue icons)
          ══════════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 w-full lg:w-auto flex-1">
            {/* 1. Verified Assistants */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-50 text-[#1463FF] flex items-center justify-center shrink-0 border border-blue-100">
                <ShieldCheck className="w-4 h-4 text-[#1463FF]" />
              </div>
              <div>
                <h5 className="text-xs font-extrabold text-zinc-900 leading-tight">Verified Assistants</h5>
                <p className="text-[10px] text-zinc-400 font-medium leading-tight mt-0.5">Trusted &amp; Trained</p>
              </div>
            </div>

            {/* 2. Real-Time Updates */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-50 text-[#1463FF] flex items-center justify-center shrink-0 border border-blue-100">
                <Radio className="w-4 h-4 text-[#1463FF]" />
              </div>
              <div>
                <h5 className="text-xs font-extrabold text-zinc-900 leading-tight">Real-Time Updates</h5>
                <p className="text-[10px] text-zinc-400 font-medium leading-tight mt-0.5">Stay Informed</p>
              </div>
            </div>

            {/* 3. Safe & Hassle-Free */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-50 text-[#1463FF] flex items-center justify-center shrink-0 border border-blue-100">
                <Users className="w-4 h-4 text-[#1463FF]" />
              </div>
              <div>
                <h5 className="text-xs font-extrabold text-zinc-900 leading-tight">Safe &amp; Hassle-Free</h5>
                <p className="text-[10px] text-zinc-400 font-medium leading-tight mt-0.5">Travel With Confidence</p>
              </div>
            </div>

            {/* 4. On-Ground Support */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-50 text-[#1463FF] flex items-center justify-center shrink-0 border border-blue-100">
                <Clock className="w-4 h-4 text-[#1463FF]" />
              </div>
              <div>
                <h5 className="text-xs font-extrabold text-zinc-900 leading-tight">On-Ground Support</h5>
                <p className="text-[10px] text-zinc-400 font-medium leading-tight mt-0.5">At Every Station</p>
              </div>
            </div>
          </div>

          {/* Slogan Quote on Far Right */}
          <div className="hidden xl:block pl-6 border-l border-slate-100 shrink-0">
            <span className="text-sm font-serif italic text-zinc-400 tracking-tight">
              “Making every journey easier”
            </span>
          </div>
        </div>
      </div>

      {/* ── Conditional In-Person Start OTP Card ── */}
      {(rawStatus === 'accepted' || rawStatus === 'arriving') && booking?.start_otp && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#1463FF] flex items-center justify-center shrink-0 border border-blue-100">
              <ShieldCheck className="w-5 h-5 text-[#1463FF]" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">In-Person Verification</span>
              <h4 className="text-base font-black text-zinc-900 leading-tight">Service Start OTP</h4>
              <p className="text-xs text-zinc-500 font-medium">Share this code only when you meet your assistant in person at the platform.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 font-mono font-black text-xl text-[#1463FF]">
              {String(booking.start_otp).split('').map((d, i) => (
                <span key={i} className="w-9 h-11 rounded-xl bg-blue-50/70 border border-blue-100 flex items-center justify-center shadow-2xs">
                  {d}
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(String(booking.start_otp));
                toast.success('OTP copied to clipboard!');
              }}
              className="px-3.5 py-2.5 rounded-full bg-blue-50 hover:bg-blue-100 text-[#1463FF] font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer ml-1"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          3. MAIN CONTENT: 3-COLUMN DESKTOP LAYOUT (Stacked on Mobile)
          ══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
        {/* ───────────────────────────────────────────────────────────────
            LEFT COLUMN (lg:col-span-3): TRIP PROGRESS
            Status Order: 1. Booking Confirmed, 2. Assistant Assigned,
                          3. Assistant Reached, 4. Service Completed
            ─────────────────────────────────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5 sm:p-6 space-y-6">
            <h3 className="text-base font-extrabold text-zinc-900 tracking-tight">
              Trip Progress
            </h3>

            {/* Vertical Timeline */}
            <div className="relative space-y-5 pl-1">
              {steps.map((step, idx) => {
                const isDone = step.isDone;
                const isCurrent = step.isCurrent;

                return (
                  <div key={step.id} className="relative flex items-start gap-3.5">
                    {/* Circle Node & Connecting Line */}
                    <div className="flex flex-col items-center shrink-0">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 transition-all ${isDone
                          ? isCompleted
                            ? 'bg-[#059669] text-white'
                            : 'bg-[#1463FF] text-white'
                          : isCurrent
                            ? 'border-2 border-[#1463FF] bg-white ring-4 ring-blue-50 text-[#1463FF]'
                            : 'border-2 border-slate-200 bg-white text-transparent'
                          }`}
                      >
                        {isDone ? (
                          '✓'
                        ) : isCurrent ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#1463FF]" />
                        ) : (
                          ''
                        )}
                      </span>

                      {/* Connecting Line to next step */}
                      {idx < steps.length - 1 && (
                        <div
                          className={`w-[2px] h-10 mt-1 transition-all ${steps[idx + 1].isDone
                            ? isCompleted
                              ? 'bg-[#059669]'
                              : 'bg-[#1463FF]'
                            : isDone && steps[idx + 1].isCurrent
                              ? 'bg-gradient-to-b from-[#1463FF] to-slate-200'
                              : 'bg-slate-200'
                            }`}
                        />
                      )}
                    </div>

                    {/* Step Content */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-start justify-between gap-1">
                        <p
                          className={`text-xs font-bold leading-snug ${isDone ? 'text-zinc-900' : isCurrent ? 'text-zinc-900' : 'text-zinc-400'
                            }`}
                        >
                          {step.label}
                        </p>
                        <span
                          className={`font-mono text-xs font-bold shrink-0 ${isDone ? 'text-zinc-600' : 'text-zinc-300'
                            }`}
                        >
                          {step.time}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 font-medium leading-tight mt-0.5">
                        {step.sub}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Contextual Blue Info Box underneath Timeline */}
            {!isCancelled && !isCompleted && (
              <div className="bg-[#EFF6FF] border border-[#BFDBFE]/70 rounded-2xl p-3.5 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-[#1463FF] shrink-0 mt-0.5" />
                <p className="text-xs font-semibold text-[#1E40AF] leading-snug">
                  Your booking is confirmed. We’re assigning the nearest available assistant.
                </p>
              </div>
            )}

            {isCompleted && (
              <div className="bg-[#ECFDF5] dark:bg-emerald-950/40 border border-[#A7F3D0]/70 dark:border-emerald-800/60 rounded-2xl p-3.5 flex items-center justify-between gap-2.5">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#059669] dark:text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-xs font-semibold text-[#065F46] dark:text-emerald-300 leading-snug">
                    Service completed successfully. Thank you for traveling with OneCoolie!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const targetId = booking?.id || booking?.booking_id || bookingUuid;
                    if (targetId) navigate(`/trip-summary/${targetId}`);
                  }}
                  className="px-3.5 py-1.5 rounded-full bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold shrink-0 cursor-pointer transition-colors shadow-xs"
                >
                  View Summary
                </button>
              </div>
            )}

            {isCancelled && (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <p className="text-xs font-semibold text-rose-800 leading-snug">
                  This booking was cancelled.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────────
            CENTER COLUMN (lg:col-span-6): TRIP & PLATFORM DETAILS
            ─────────────────────────────────────────────────────────────── */}
        <div className="lg:col-span-6 space-y-5">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-6 sm:p-7 space-y-5">
            {/* Header: Title + View on Map */}
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-zinc-900 tracking-tight">
                Trip &amp; Platform Details
              </h3>
              <button
                type="button"
                onClick={() => toast.success(`Station map active for ${stationCode}`)}
                className="px-3.5 py-1.5 rounded-full bg-blue-50 hover:bg-blue-100 text-[#1463FF] font-bold text-xs border border-blue-100 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>View on Map</span>
              </button>
            </div>

            {/* 4 Details Grid - All Information 100% Fully Visible */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
              {/* Coach */}
              <div className="p-3 bg-[#F8FAFC] border border-slate-100 rounded-2xl flex items-start gap-2.5 min-h-[72px]">
                <div className="w-7 h-7 rounded-xl bg-blue-50 text-[#1463FF] flex items-center justify-center shrink-0 mt-0.5">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] text-zinc-400 font-semibold block leading-none">Coach</span>
                  <span className="text-xs sm:text-[13px] font-bold text-zinc-900 block leading-tight break-words mt-1">
                    {coach}
                  </span>
                </div>
              </div>

              {/* Seat / Berth */}
              <div className="p-3 bg-[#F8FAFC] border border-slate-100 rounded-2xl flex items-start gap-2.5 min-h-[72px]">
                <div className="w-7 h-7 rounded-xl bg-blue-50 text-[#1463FF] flex items-center justify-center shrink-0 mt-0.5">
                  <Armchair className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] text-zinc-400 font-semibold block leading-none">Seat / Berth</span>
                  <span className="text-xs sm:text-[13px] font-bold text-zinc-900 block leading-snug break-words mt-1">
                    {seatNumber} {berthType ? `(${berthType})` : ''}
                  </span>
                </div>
              </div>

              {/* Boarding Station */}
              <div className="p-3 bg-[#F8FAFC] border border-slate-100 rounded-2xl flex items-start gap-2.5 min-h-[72px]">
                <div className="w-7 h-7 rounded-xl bg-blue-50 text-[#1463FF] flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] text-zinc-400 font-semibold block leading-none">Boarding Station</span>
                  <span className="text-xs sm:text-[13px] font-bold text-zinc-900 block leading-tight break-words mt-1">
                    {stationCode}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-medium block leading-tight break-words mt-0.5">
                    {stationName}
                  </span>
                </div>
              </div>

              {/* Service Type */}
              <div className="p-3 bg-[#F8FAFC] border border-slate-100 rounded-2xl flex items-start gap-2.5 min-h-[72px]">
                <div className="w-7 h-7 rounded-xl bg-blue-50 text-[#1463FF] flex items-center justify-center shrink-0 mt-0.5">
                  <Luggage className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] text-zinc-400 font-semibold block leading-none">Service Type</span>
                  <span className="text-xs sm:text-[13px] font-bold text-zinc-900 block leading-snug break-words mt-1">
                    {serviceLabel}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-medium block leading-tight break-words mt-0.5">
                    {selectedServices.map(s => s.name).join(' + ')}
                  </span>
                </div>
              </div>
            </div>

            {/* Selected Assistance Services Subsection */}
            <div className="p-4 bg-[#F8FAFC] border border-slate-200/70 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-lg bg-blue-50 text-[#1463FF] flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#1463FF]" />
                  </div>
                  <h4 className="text-xs sm:text-sm font-extrabold text-zinc-900">
                    Selected Services
                  </h4>
                </div>
                <span className="text-[10px] font-bold text-zinc-400 font-mono uppercase tracking-wider">
                  {selectedServices.length} {selectedServices.length === 1 ? 'Service' : 'Services'} Selected
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
                {selectedServices.map((srv) => (
                  <div
                    key={srv.key}
                    className="p-3 bg-white border border-slate-200/80 rounded-xl flex items-center justify-between gap-2.5 shadow-2xs hover:border-blue-200 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-xl bg-blue-50 text-[#1463FF] flex items-center justify-center shrink-0">
                        {srv.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-zinc-900 leading-tight">
                          {srv.name}
                        </p>
                        <p className="text-[10px] text-zinc-400 font-medium leading-tight mt-0.5">
                          {srv.desc}
                        </p>
                      </div>
                    </div>
                    {srv.badge && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-[#1463FF] border border-blue-100 shrink-0">
                        {srv.badge}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Special Instructions Panel */}
            <div className="bg-[#EFF6FF] border border-[#BFDBFE]/60 rounded-2xl p-4 flex items-start gap-3">
              <div className="w-7 h-7 rounded-xl bg-white text-[#1463FF] flex items-center justify-center shrink-0 shadow-2xs border border-blue-100 mt-0.5">
                <FileText className="w-3.5 h-3.5 text-[#1463FF]" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-black tracking-wider text-[#1E40AF] uppercase font-mono block">
                  SPECIAL INSTRUCTIONS
                </span>
                <p className="text-xs sm:text-[13px] font-medium text-[#1E3A8A] leading-relaxed mt-1 break-words">
                  “{specialInstructions}”
                </p>
              </div>
            </div>

            {/* Train Information Subsection - 100% Fully Visible */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <div className="flex items-center gap-2">
                <Train className="w-4 h-4 text-zinc-900" />
                <h4 className="text-xs sm:text-sm font-extrabold text-zinc-900">
                  Train Information
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 items-start">
                <div className="sm:col-span-3">
                  <p className="text-xs sm:text-sm font-black text-zinc-900 font-mono">{trainNo}</p>
                  <p className="text-[10px] text-zinc-400 font-semibold mt-0.5">Train Number</p>
                </div>
                <div className="sm:col-span-5 min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-zinc-900 leading-snug break-words">
                    {trainName}
                  </p>
                  <p className="text-[10px] text-zinc-400 font-semibold mt-0.5">Train Name</p>
                </div>
                <div className="sm:col-span-4 min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-zinc-900 leading-snug break-words">
                    {fromStationName} <span className="text-[#1463FF] font-semibold">→</span> {toStationName}
                  </p>
                  <p className="text-[10px] text-zinc-400 font-semibold mt-0.5">Route</p>
                </div>
              </div>
            </div>

            {/* ── Assistant Profile & Messaging (Preserved when Assigned) ── */}
            {hasAssignedAssistant && (
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F8FAFC] border border-slate-200/80 rounded-2xl p-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <div className="w-11 h-11 rounded-full bg-black text-white flex items-center justify-center font-black text-base shadow-2xs">
                        {booking.assistant.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" title="Online" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-extrabold text-zinc-900 leading-tight">
                          {booking.assistant.name}
                        </h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]/60 flex items-center gap-1">
                          <span>✓</span>
                          <span>KYC Verified</span>
                        </span>
                      </div>

                      {/* Ratings & Bookings Done */}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {/* Rating Pill */}
                        <div className="flex items-center gap-1 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full">
                          <Star className="w-3 h-3 text-amber-500 fill-amber-400 shrink-0" />
                          <span className="font-black text-zinc-900 text-[11px] leading-none">
                            {assistantRating}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-medium leading-none">
                            ({assistantReviewsCount})
                          </span>
                        </div>

                        <span className="text-zinc-300">•</span>

                        {/* Completed Bookings */}
                        <div className="flex items-center gap-1 text-[11px] text-zinc-700 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#1463FF] shrink-0" />
                          <span><strong className="text-zinc-900 font-black">{assistantBookingsCount}</strong> Bookings Done</span>
                        </div>

                        <span className="text-zinc-300">•</span>

                        <span className="text-[11px] text-zinc-400 font-medium">
                          Station {stationCode}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {booking.assistant.phone && (
                      <button
                        type="button"
                        onClick={() => {
                          if (isMobileDevice()) {
                            window.location.href = `tel:${booking.assistant.phone}`;
                          } else {
                            if (navigator.clipboard?.writeText) {
                              navigator.clipboard.writeText(booking.assistant.phone);
                            }
                            toast.success(`Assistant phone: ${booking.assistant.phone} copied!`);
                          }
                        }}
                        className="p-2.5 rounded-full bg-white hover:bg-blue-50 text-[#1463FF] border border-slate-200/80 shadow-2xs transition-colors cursor-pointer"
                        title={isMobileDevice() ? "Call Assistant" : `Assistant phone: ${booking.assistant.phone}`}
                      >
                        <Phone className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsChatOpen(!isChatOpen)}
                      className="px-3.5 py-2 rounded-full bg-blue-50 hover:bg-blue-100 text-[#1463FF] font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-blue-100 shadow-2xs"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{isChatOpen ? 'Close Chat' : 'Message'}</span>
                    </button>
                  </div>
                </div>

                {/* Inline Live Chat Feed */}
                {isChatOpen && (
                  <div className="space-y-3 pt-2">
                    <div className="space-y-2 max-h-48 overflow-y-auto p-3 bg-slate-50 rounded-2xl border border-slate-200/70 text-xs">
                      {chatMsgs.length === 0 ? (
                        <p className="text-center text-zinc-400 py-3">No messages yet. Send a note to your assistant.</p>
                      ) : (
                        chatMsgs.map((m, i) => (
                          <div
                            key={i}
                            className={`flex flex-col ${m.from === 'passenger' ? 'items-end' : 'items-start'}`}
                          >
                            <div
                              className={`px-3.5 py-2 rounded-2xl max-w-[85%] ${m.from === 'passenger'
                                ? 'bg-[#1463FF] text-white rounded-br-xs'
                                : 'bg-white text-zinc-900 border border-slate-200 rounded-bl-xs'
                                }`}
                            >
                              {m.text}
                            </div>
                          </div>
                        ))
                      )}
                      <div ref={chatBottomRef} />
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={msgInput}
                        onChange={(e) => setMsgInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                        placeholder="Type message to assistant..."
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-4 py-2 text-xs focus:outline-none focus:border-[#1463FF]"
                      />
                      <button
                        type="button"
                        onClick={() => sendChat()}
                        className="bg-black hover:bg-zinc-800 text-white font-bold p-2.5 rounded-full text-xs transition-colors cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Post-Trip Feedback (Preserved when Completed) ── */}
            {isCompleted && (
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs sm:text-sm font-extrabold text-zinc-900">
                    Rate Your Journey Assistant
                  </h4>
                  {feedbackStatus === 'success' && (
                    <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60 inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>✓ Feedback Submitted</span>
                    </span>
                  )}
                </div>

                {feedbackStatus === 'success' ? (
                  <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 sm:p-5 space-y-3">
                    <p className="text-xs text-zinc-600 font-medium">Thank you for your feedback.</p>
                    <div>
                      <span className="text-[10px] font-extrabold text-zinc-400 block uppercase tracking-wider mb-1">
                        Rating:
                      </span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-5 h-5 ${
                              rating && star <= rating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-200'
                            }`}
                          />
                        ))}
                        <span className="text-xs font-black text-zinc-800 ml-2">
                          {rating} / 5
                        </span>
                      </div>
                    </div>

                    {review && (
                      <div>
                        <span className="text-[10px] font-extrabold text-zinc-400 block uppercase tracking-wider mb-1">
                          Your Feedback:
                        </span>
                        <p className="text-xs text-zinc-800 font-medium bg-white/90 p-2.5 rounded-xl border border-emerald-100/90 leading-relaxed">
                          {review}
                        </p>
                      </div>
                    )}

                    <div className="pt-1 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => navigate('/dashboard?tab=trips')}
                        className="px-4 py-2 rounded-full bg-black hover:bg-zinc-800 text-white font-bold text-xs transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Briefcase className="w-3.5 h-3.5" />
                        <span>Back to My Trips</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const targetId = booking?.id || booking?.booking_id || bookingUuid;
                          if (targetId) navigate(`/trip-summary/${targetId}`);
                        }}
                        className="px-4 py-2 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-zinc-900 font-bold text-xs transition-colors cursor-pointer"
                      >
                        <span>View Summary</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          disabled={feedbackStatus === 'loading'}
                          onClick={() => setRating(star)}
                          className="p-1 text-slate-200 hover:text-amber-400 transition-colors cursor-pointer disabled:cursor-default"
                          title={`${star} Star`}
                        >
                          <Star
                            className={`w-6 h-6 transition-all ${
                              rating && star <= rating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-300 hover:text-amber-400'
                            }`}
                          />
                        </button>
                      ))}
                      <span className="text-xs font-bold text-zinc-700 ml-2">
                        {rating ? `${rating} / 5` : '☆ Tap to rate'}
                      </span>
                    </div>

                    {feedbackError && (
                      <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                        {feedbackError}
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={review}
                        onChange={(e) => setReview(e.target.value)}
                        placeholder="Optional feedback..."
                        disabled={feedbackStatus === 'loading'}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-4 py-2 text-xs focus:outline-none focus:border-black"
                      />
                      <button
                        type="button"
                        disabled={feedbackStatus === 'loading'}
                        onClick={submitRating}
                        className="bg-black hover:bg-zinc-800 text-white font-bold px-5 py-2 rounded-full text-xs transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5 shrink-0"
                      >
                        {feedbackStatus === 'loading' ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            <span>Submitting...</span>
                          </>
                        ) : (
                          <span>Submit</span>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────────
            RIGHT COLUMN (lg:col-span-3): FARE & PAYMENT + NEED HELP?
            ─────────────────────────────────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-5">
          {/* Card 1: Fare & Payment */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-6 space-y-4">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-zinc-900" />
              <h3 className="text-base font-extrabold text-zinc-900">
                Fare &amp; Payment
              </h3>
            </div>

            <div>
              <div className="text-3xl sm:text-4xl font-black text-zinc-900 tracking-tight leading-none">
                ₹{fareAmount}
              </div>
              <p className="text-xs font-semibold text-zinc-400 mt-1">
                Assistance Fee
              </p>
              <div className="flex flex-wrap gap-1 mt-2.5">
                {selectedServices.map(s => (
                  <span key={s.key} className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-zinc-700 border border-slate-200/80">
                    {s.name}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-3 border-t border-slate-100 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 font-medium">Payment Status</span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]/60 flex items-center gap-1">
                  <span>✓</span>
                  <span>{paymentStatus}</span>
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-zinc-500 font-medium">Payment Method</span>
                <span className="font-bold text-zinc-900">{paymentMethod}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-zinc-500 font-medium">Paid on</span>
                <span className="font-bold text-zinc-900">{paidOnFormatted}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Need Help? */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-6 space-y-3">
            <div className="flex items-center gap-2">
              <Headphones className="w-4 h-4 text-zinc-900" />
              <h3 className="text-base font-extrabold text-zinc-900">
                Need Help?
              </h3>
            </div>

            <p className="text-xs text-zinc-500 font-medium">
              Our support team is here for you.
            </p>

            <button
              type="button"
              onClick={() => handleContactSupport(navigate)}
              className="w-full py-3 px-5 rounded-full bg-black hover:bg-zinc-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              <span>Contact Support</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Action Links: Cancel & SOS (Preserved functionality) */}
          {!isCompleted && !isCancelled && (
            <div className="flex items-center justify-center gap-4 text-xs font-semibold px-2">
              {canCancel && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowCancellationModal(true)}
                    className="text-zinc-400 hover:text-rose-600 transition-colors cursor-pointer"
                  >
                    Cancel Booking
                  </button>
                  <span className="text-zinc-300">•</span>
                  <button
                    type="button"
                    onClick={() => setShowRebookingModal(true)}
                    className="text-zinc-400 hover:text-[#1463FF] transition-colors cursor-pointer"
                  >
                    Change / Rebook
                  </button>
                  <span className="text-zinc-300">•</span>
                  <button
                    type="button"
                    onClick={() => setShowPolicyModal(true)}
                    className="text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
                  >
                    Cancellation Policy
                  </button>
                  <span className="text-zinc-300">•</span>
                </>
              )}
              <button
                type="button"
                onClick={() => setShowSosModal(true)}
                className="text-rose-500 hover:text-rose-700 transition-colors cursor-pointer"
              >
                Emergency SOS
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Real Production Cancellation Modal ── */}
      {showCancellationModal && (
        <CancellationModal
          isOpen={showCancellationModal}
          booking={booking}
          onClose={() => setShowCancellationModal(false)}
          onCancelled={(cancelledBooking) => {
            setShowCancellationModal(false);
            onUpdate?.(cancelledBooking);
          }}
          onSuccess={(cancelledBooking) => {
            setShowCancellationModal(false);
            onUpdate?.(cancelledBooking);
          }}
          onRequestRebook={() => {
            setShowCancellationModal(false);
            setShowRebookingModal(true);
          }}
        />
      )}

      {/* ── Real Production Rebooking Modal ── */}
      {showRebookingModal && (
        <RebookingModal
          isOpen={showRebookingModal}
          booking={booking}
          onClose={() => setShowRebookingModal(false)}
          onRebooked={(updatedBooking) => {
            setShowRebookingModal(false);
            onUpdate?.(updatedBooking);
          }}
          onSuccess={(updatedBooking) => {
            setShowRebookingModal(false);
            onUpdate?.(updatedBooking);
          }}
        />
      )}

      {/* ── Cancellation Policy Modal ── */}
      {showPolicyModal && (
        <CancellationPolicyModal
          isOpen={showPolicyModal}
          onClose={() => setShowPolicyModal(false)}
        />
      )}

      {/* ── SOS Dialog Modal ── */}
      {showSosModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 text-center shadow-xl border border-rose-200">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto animate-pulse">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h4 className="text-base font-extrabold text-zinc-900">Transmit Emergency SOS?</h4>
            <p className="text-xs text-zinc-500">
              This will notify railway protection and station operational supervisors immediately at {stationName}.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSosModal(false)}
                className="flex-1 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-zinc-700 font-bold text-xs cursor-pointer"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={triggerSos}
                className="flex-1 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer shadow-xs"
              >
                Send SOS Alert
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Passenger Trip Completion Modal (Theme Sunk) ── */}
      {showCompletionModal && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/65 backdrop-blur-md animate-fade-in select-none"
          onClick={() => {
            setShowCompletionModal(false);
            navigate('/dashboard');
          }}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-[32px] p-6 sm:p-8 shadow-2xl border border-slate-200/90 dark:border-zinc-800 text-zinc-900 dark:text-white relative overflow-hidden animate-scale-in text-center transition-colors duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient Emerald Glow Overlay */}
            <div className="absolute top-0 inset-x-0 h-36 bg-gradient-to-b from-emerald-500/15 via-emerald-500/5 to-transparent pointer-events-none -z-0" />

            {/* Header / Dismiss */}
            <div className="relative z-10 flex items-center justify-between mb-2">
              <span className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>Service Completed</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowCompletionModal(false);
                  navigate('/dashboard');
                }}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>

            {/* Centered Grand Animated Checkmark Badge */}
            <div className="relative z-10 my-4">
              <div className="w-20 h-20 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-[0_10px_25px_-5px_rgba(16,185,129,0.4)] ring-8 ring-emerald-500/15 ring-offset-4 ring-offset-white dark:ring-offset-zinc-900 transition-colors">
                <Check className="w-10 h-10 stroke-[3.5]" />
              </div>
            </div>

            {/* Title & Subtitle */}
            <div className="relative z-10 space-y-1 mb-5">
              <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-900 dark:text-white">
                Trip <span className="text-emerald-600 dark:text-emerald-400">Completed!</span>
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium max-w-xs mx-auto leading-relaxed">
                Thank you for traveling with OneCoolie! Your assistance mission has been completed successfully.
              </p>
            </div>

            {/* Sunk Details Card */}
            <div className="relative z-10 bg-slate-50 dark:bg-zinc-800/70 border border-slate-200/80 dark:border-zinc-700/80 rounded-2xl p-4 mb-5 text-left space-y-3 text-xs shadow-2xs">
              {/* Row 1: Train */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                  <span className="w-6.5 h-6.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#1463FF] dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Train size={14} />
                  </span>
                  <span className="font-semibold text-zinc-600 dark:text-zinc-400">Train</span>
                </div>
                <span className="font-extrabold text-zinc-900 dark:text-white font-mono">
                  {trainNo} · {rawTrainName}
                </span>
              </div>

              {/* Row 2: Coach & Seat */}
              <div className="flex items-center justify-between border-t border-slate-200/60 dark:border-zinc-700/60 pt-2.5">
                <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                  <span className="w-6.5 h-6.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#1463FF] dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Armchair size={14} />
                  </span>
                  <span className="font-semibold text-zinc-600 dark:text-zinc-400">Coach &amp; Seat</span>
                </div>
                <span className="font-bold text-zinc-900 dark:text-white">
                  {coach} · Seat {seatNumber}
                </span>
              </div>

              {/* Row 3: Station Hub */}
              <div className="flex items-center justify-between border-t border-slate-200/60 dark:border-zinc-700/60 pt-2.5">
                <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                  <span className="w-6.5 h-6.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#1463FF] dark:text-blue-400 flex items-center justify-center shrink-0">
                    <MapPin size={14} />
                  </span>
                  <span className="font-semibold text-zinc-600 dark:text-zinc-400">Station</span>
                </div>
                <span className="font-bold text-zinc-900 dark:text-white">
                  {stationName} ({stationCode})
                </span>
              </div>

              {/* Row 4: Assistant */}
              <div className="flex items-center justify-between border-t border-slate-200/60 dark:border-zinc-700/60 pt-2.5">
                <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                  <span className="w-6.5 h-6.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#1463FF] dark:text-blue-400 flex items-center justify-center shrink-0">
                    <User size={14} />
                  </span>
                  <span className="font-semibold text-zinc-600 dark:text-zinc-400">Assistant</span>
                </div>
                <span className="font-bold text-zinc-900 dark:text-white">
                  {assistantName}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setShowCompletionModal(false);
                  const targetId = booking?.id || booking?.booking_id || bookingUuid;
                  if (targetId) navigate(`/trip-summary/${targetId}`);
                  else navigate('/dashboard?tab=trips');
                }}
                className="w-full bg-[#1463FF] hover:bg-[#0d52dd] active:scale-[0.99] text-white font-black py-3.5 px-6 rounded-full text-xs shadow-lg shadow-[#1463FF]/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>View Complete Summary</span>
                <ArrowRight size={14} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCompletionModal(false);
                  navigate('/dashboard?tab=trips');
                }}
                className="w-full bg-slate-100 hover:bg-slate-200 text-zinc-700 font-bold py-2.5 px-6 rounded-full text-xs transition-colors cursor-pointer"
              >
                <span>Back to My Trips</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}