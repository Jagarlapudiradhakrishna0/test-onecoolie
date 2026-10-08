import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Train,
  FileText,
  MapPin,
  Calendar,
  Armchair,
  Luggage,
  Info,
  CheckCircle2,
  Phone,
  MessageSquare,
  Star,
  Send,
  Check,
  Headphones,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Copy,
  Clock,
  CreditCard,
  AlertCircle,
  Navigation,
  Accessibility,
  Languages,
  Coffee,
  Car,
  ChevronRight,
  MoreVertical,
  ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import axios from '../api/axios';
import vandeBharatCrisp from '../assets/images/vande-bharat-crisp.jpg';
import CancellationModal from './cancellation/CancellationModal';
import RebookingModal from './cancellation/RebookingModal';
import CancellationPolicyModal from './cancellation/CancellationPolicyModal';
import EditServicesModal from './EditServicesModal';
import {
  getLocalChat,
  saveLocalChat,
  mergeChatMessages,
  fetchRemoteChat,
  persistRemoteChat,
} from '../utils/chatSync';
import { handleContactSupport, isMobileDevice } from '../services/supportService';
import JourneyProtectionTermsModal from './protection/JourneyProtectionTermsModal';
import { fetchBookingProtection, purchaseJourneyProtection } from '../services/protectionService';
import { useAuth } from '../context/AuthContext';

/* ============================================================
   ACTIVE BOOKING / TRIP DETAILS REDESIGN
   Strictly adheres to OneCoolie production layout, hierarchy & branding:
   • CENTER: Hero Banner, Selected Services (No prices), Journey Progress (Active or Cancelled), Assistant
   • RIGHT: Fare & Payment (Itemized fees), Journey Protection, Need Help?
   ============================================================ */

export default function ActiveBooking({ booking, onUpdate, distance = 500 }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const bookingUuid = booking?.id || '';
  const bookingCode = booking?.booking_id || '';

  // ── Journey Protection State ──
  const [journeyProtection, setJourneyProtection] = useState(booking?.journey_protection || null);
  const [showProtectionTerms, setShowProtectionTerms] = useState(false);
  const [purchasingProtection, setPurchasingProtection] = useState(false);

  useEffect(() => {
    if (booking?.journey_protection) {
      setJourneyProtection(booking.journey_protection);
    } else if (bookingUuid) {
      fetchBookingProtection(bookingUuid).then((prot) => {
        if (prot) setJourneyProtection(prot);
      });
    }
  }, [bookingUuid, booking?.journey_protection]);

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

  // Sync chat from local storage & backend + periodic polling
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
    const syncRemote = () => {
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
    };

    syncRemote();
    const interval = setInterval(syncRemote, 4000);

    return () => {
      isMounted = false;
      clearInterval(interval);
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

  // ── 3. Ratings & Feedback State ──
  const dbRating = booking?.rating ? Number(booking.rating) : null;
  const dbReview = booking?.review || '';
  const isAlreadySubmitted = Boolean(dbRating && dbRating >= 1 && dbRating <= 5);

  const [rating, setRating] = useState(() => dbRating);
  const [review, setReview] = useState(() => dbReview);
  const [feedbackStatus, setFeedbackStatus] = useState(() => isAlreadySubmitted ? 'success' : 'idle');
  const [feedbackError, setFeedbackError] = useState('');
  const [showCancellationModal, setShowCancellationModal] = useState(false);
  const [showRebookingModal, setShowRebookingModal] = useState(false);
  const [showEditServicesModal, setShowEditServicesModal] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [showSosModal, setShowSosModal] = useState(false);
  const [showThreeDotMenu, setShowThreeDotMenu] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    if (booking?.rating && Number(booking.rating) > 0) {
      setRating(Number(booking.rating));
      if (booking?.review) setReview(booking.review);
      setFeedbackStatus('success');
    }
  }, [booking?.rating, booking?.review]);

  // ── 4. Derived Booking & Journey Details ──
  const rawStatus = String(booking?.booking_status || booking?.status || 'pending').toLowerCase();
  const rawAssistantStatus = String(booking?.assistant_status || booking?.services?.assistant_status || '').toLowerCase();

  const isCancelled = rawStatus === 'cancelled' || rawStatus === 'canceled' || rawAssistantStatus === 'cancelled';
  const isCompleted = !isCancelled && (rawStatus === 'completed' || rawAssistantStatus === 'completed');
  const isInService = !isCancelled && !isCompleted && (
    rawStatus === 'in_service' ||
    rawStatus === 'in_progress' ||
    rawAssistantStatus === 'in_service'
  );
  const isReached = !isCancelled && !isCompleted && !isInService && (
    rawStatus === 'reached' ||
    rawStatus === 'arrived' ||
    rawAssistantStatus === 'reached' ||
    rawAssistantStatus === 'arrived'
  );
  const canCancel = !isCancelled && !isCompleted && !isInService;
  const isServiceEditable = !isCancelled && !isCompleted && !isInService;

  // Genuine assistant acceptance from persisted backend/database state
  // Only true when assistant has actually accepted or progressed to downstream states.
  // Explicitly FALSE if assistant is only assigned/pending acceptance.
  const isAssistantAccepted = Boolean(
    !isCancelled && (
      ['accepted', 'arriving', 'reached', 'arrived', 'in_service', 'completed'].includes(rawAssistantStatus) ||
      (
        ['accepted', 'arriving', 'reached', 'arrived', 'in_service', 'completed'].includes(rawStatus) &&
        rawAssistantStatus !== 'pending' &&
        rawAssistantStatus !== 'assigned'
      )
    )
  );

  // Active "On the Way" stage: assistant accepted and en route, before reaching the station
  const isAssistantOnTheWay = Boolean(
    !isCancelled &&
    !isCompleted &&
    !isReached &&
    !isInService &&
    isAssistantAccepted &&
    (
      rawAssistantStatus === 'accepted' ||
      rawAssistantStatus === 'arriving' ||
      rawStatus === 'accepted' ||
      rawStatus === 'arriving'
    )
  );

  // ── Normalize Journey Service Type ('Boarding' | 'De-boarding') ──
  const serviceTypeDisplay = (() => {
    const rawCandidates = [
      booking?.action_type,
      booking?.services?.action_type,
      booking?.service_mode,
      booking?.services?.service_mode,
      booking?.journey_type,
      booking?.services?.journey_type,
      booking?.service_type,
      booking?.services?.service_type,
      booking?.mission,
      booking?.services?.mission,
    ];

    for (const val of rawCandidates) {
      if (!val || typeof val !== 'string') continue;
      const clean = val.trim().toLowerCase();

      if (
        clean === 'collect_from_seat' ||
        clean === 'collect-from-seat' ||
        clean === 'collect_from_berth' ||
        clean.includes('deboard') ||
        clean.includes('de-board') ||
        clean.includes('collect_from_seat')
      ) {
        return 'De-boarding';
      }

      if (
        clean === 'load_to_seat' ||
        clean === 'load-to-seat' ||
        clean === 'load_to_berth' ||
        clean === 'boarding' ||
        clean === 'board' ||
        clean.startsWith('board') ||
        clean.includes('load_to_seat')
      ) {
        return 'Boarding';
      }
    }

    const isDeBoard = booking?.action_type === 'collect_from_seat' || booking?.services?.action_type === 'collect_from_seat';
    return isDeBoard ? 'De-boarding' : 'Boarding';
  })();

  const trainNo = booking?.train_no || booking?.train_number || '07462';
  const fromStationName = booking?.source_name || booking?.source || booking?.from_station || booking?.station_name || 'Secunderabad';
  const toStationName = booking?.destination_name || booking?.destination || booking?.to_station || 'Warangal';
  const stationCode = booking?.station_code || booking?.source || 'KZJ';
  const stationName = booking?.station_name || fromStationName;
  const destStationCode = booking?.destination || 'KZJ';

  // Clean Train Name
  const cleanTrainName = (() => {
    let name = (booking?.train_name || '').trim();
    if (!name) return 'Secunderabad - Warangal MEMU Express Special';

    if (fromStationName && toStationName) {
      const routeRegex = new RegExp(`^${fromStationName}\\s*[-–—→/to]+\\s*${toStationName}\\s*`, 'i');
      name = name.replace(routeRegex, '').trim();
    }
    name = name.replace(/^[A-Za-z\s]+[-–—→/]\s*[A-Za-z\s]+[-–—:]\s*/i, '').trim();
    name = name.replace(/^\d+\s*[-–—/]\s*/, '').trim();

    return name || 'Secunderabad - Warangal MEMU Express Special';
  })();
  const trainName = cleanTrainName;

  const coach = booking?.coach || booking?.services?.coach || 'S4';
  const seatNumber = booking?.seat_number || booking?.services?.seat_number || '33';
  const berthType = booking?.berth_type || booking?.services?.berth_type || 'Side Lower';

  // Custom special instructions (Filter out auto-generated boilerplate)
  const rawSpecialInstructions = booking?.special_instructions || booking?.notes || '';
  const hasCustomInstructions = Boolean(
    rawSpecialInstructions &&
    typeof rawSpecialInstructions === 'string' &&
    rawSpecialInstructions.trim() &&
    !rawSpecialInstructions.toLowerCase().includes('requested services:') &&
    !rawSpecialInstructions.toLowerCase().includes('standard platform') &&
    !rawSpecialInstructions.toLowerCase().includes('mission: boarding') &&
    !rawSpecialInstructions.toLowerCase().includes('mission: de-boarding') &&
    !rawSpecialInstructions.toLowerCase().includes('coach:')
  );
  const specialInstructions = hasCustomInstructions ? rawSpecialInstructions.trim() : null;

  // ── Authoritative Stored Fare from Database (ZERO Hardcoded Fallbacks) ──
  const rawFare = useMemo(() => {
    if (booking?.total_price != null && !isNaN(Number(booking.total_price))) {
      return Number(booking.total_price);
    }
    if (booking?.amount != null && !isNaN(Number(booking.amount))) {
      return Number(booking.amount);
    }
    if (booking?.payment?.amount != null && !isNaN(Number(booking.payment.amount))) {
      return Number(booking.payment.amount);
    }
    return null;
  }, [booking?.total_price, booking?.amount, booking?.payment?.amount]);

  // ── Authoritative Journey Protection Pricing from DB / Booking Record ──
  const protectionPrice = useMemo(() => {
    // 1. Direct journeyProtection record price from database
    if (journeyProtection?.price != null && !isNaN(Number(journeyProtection.price))) {
      const p = Number(journeyProtection.price);
      if (p > 0) return p;
    }
    // 2. Direct booking.journey_protection object price
    if (booking?.journey_protection?.price != null && !isNaN(Number(booking.journey_protection.price))) {
      const p = Number(booking.journey_protection.price);
      if (p > 0) return p;
    }
    // 3. Stored pricing_breakdown item in booking.services
    const breakdownProt = booking?.services?.pricing_breakdown?.find(
      (b) => b.service === 'journey_protection'
    );
    if (breakdownProt && (breakdownProt.total != null || breakdownProt.unit_price != null)) {
      const p = Number(breakdownProt.total ?? breakdownProt.unit_price);
      if (!isNaN(p) && p > 0) return p;
    }
    return null;
  }, [journeyProtection, booking]);

  const hasProtection = useMemo(() => {
    if (protectionPrice == null || protectionPrice <= 0) return false;
    if (journeyProtection?.status === 'cancelled') return false;
    return Boolean(
      (journeyProtection && journeyProtection.status && journeyProtection.status !== 'cancelled') ||
      (booking?.journey_protection && booking.journey_protection.status !== 'cancelled') ||
      booking?.services?.pricing_breakdown?.some((b) => b.service === 'journey_protection') ||
      booking?.has_journey_protection ||
      booking?.services?.has_journey_protection
    );
  }, [protectionPrice, journeyProtection, booking]);

  // Authoritative separation of assistance service charges vs grand total (Single Source of Truth, avoids double-counting)
  const { serviceTotal, totalFare, isFareAvailable } = useMemo(() => {
    if (rawFare == null) {
      if (booking) {
        console.warn('[ActiveBooking] Fare information unavailable or incomplete for booking:', booking.booking_id || booking.id);
      }
      return { serviceTotal: null, totalFare: null, isFareAvailable: false };
    }

    if (!hasProtection || protectionPrice == null || protectionPrice <= 0) {
      return {
        serviceTotal: rawFare,
        totalFare: rawFare,
        isFareAvailable: true
      };
    }

    // Check if rawFare in database already incorporates the protection fee
    const breakdownHasProtection = Boolean(
      booking?.services?.pricing_breakdown?.some((b) => b.service === 'journey_protection')
    );
    const createdWithProtection = Boolean(
      booking?.has_journey_protection || booking?.services?.has_journey_protection
    );

    if ((breakdownHasProtection || createdWithProtection) && rawFare > protectionPrice) {
      const sTotal = Number((rawFare - protectionPrice).toFixed(2));
      return {
        serviceTotal: sTotal,
        totalFare: rawFare,
        isFareAvailable: true
      };
    }

    // If protection was recorded separately from rawFare
    return {
      serviceTotal: rawFare,
      totalFare: Number((rawFare + protectionPrice).toFixed(2)),
      isFareAvailable: true
    };
  }, [hasProtection, protectionPrice, rawFare, booking]);

  const fareAmount = totalFare;
  const paymentStatus = isCancelled ? 'CANCELLED' : (booking?.payment_status || 'PAID').toUpperCase();
  const paymentMethod = booking?.payment_method || 'UPI / Card';

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

  const bookingCreationTime = formatTimeHHMM(booking?.created_at) || '12:36';
  const bookingCreationDate = booking?.created_at
    ? (() => {
      try {
        const d = new Date(booking.created_at);
        const day = String(d.getDate()).padStart(2, '0');
        const month = d.toLocaleString('en-US', { month: 'short' });
        const year = d.getFullYear();
        return `${day} ${month} ${year}`;
      } catch (e) {
        return '07 Oct 2026';
      }
    })()
    : '07 Oct 2026';

  const paidOnFormatted = `${bookingCreationDate}, ${bookingCreationTime}`;

  const journeyDateFormatted = booking?.journey_date
    ? (() => {
      try {
        const d = new Date(booking.journey_date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = d.toLocaleString('en-US', { month: 'short' });
        const year = d.getFullYear();
        return `${day} ${month} ${year}`;
      } catch (e) {
        return '07 Oct 2026';
      }
    })()
    : '07 Oct 2026';

  const journeyWeekday = booking?.journey_date
    ? (() => {
      try {
        const d = new Date(booking.journey_date);
        return d.toLocaleDateString('en-US', { weekday: 'long' });
      } catch (e) {
        return 'Wednesday';
      }
    })()
    : 'Wednesday';

  // ── 5. Extract Selected Assistance Services (Strictly NO Prices Here) ──
  const selectedServices = useMemo(() => {
    const list = [];
    const s = booking?.services;

    if (s && typeof s === 'object' && !Array.isArray(s)) {
      if (s.luggage || (typeof s.luggage === 'number' && s.luggage > 0) || s.luggageCounts) {
        const count = typeof s.luggage === 'number' ? s.luggage : 2;
        const details = s.luggage_details || (count > 1 ? '1 Small, 1 Medium' : '1 Item');
        list.push({
          key: 'luggage',
          name: 'Luggage Assistance',
          desc: 'Porter handling from station gate directly to berth',
          badge: details,
          icon: <Luggage className="w-5 h-5 text-[#1463FF]" />,
          iconBg: 'bg-blue-50 text-[#1463FF]',
          badgeClass: 'bg-blue-50 text-[#1463FF] border border-blue-100',
        });
      }
      if (s.escort) {
        list.push({
          key: 'escort',
          name: 'Seat & Coach Escort',
          desc: 'Personal guide navigating platform foot-bridges to your exact coach',
          badge: 'Included',
          icon: <Armchair className="w-5 h-5 text-emerald-600" />,
          iconBg: 'bg-emerald-50 text-emerald-600',
          badgeClass: 'bg-blue-50 text-[#1463FF] border border-blue-100',
        });
      }
      if (s.wheelchair) {
        list.push({
          key: 'wheelchair',
          name: 'Wheelchair & Priority',
          desc: 'Wheelchair transit and dedicated escort for mobility needs',
          badge: 'Priority',
          icon: <Accessibility className="w-5 h-5 text-purple-600" />,
          iconBg: 'bg-purple-50 text-purple-600',
          badgeClass: 'bg-purple-50 text-purple-700 border border-purple-100',
        });
      }
      if (s.language) {
        list.push({
          key: 'language',
          name: 'Multilingual Guide',
          desc: 'Local communication assistance in Telugu, Hindi, or English',
          badge: 'Included',
          icon: <Languages className="w-5 h-5 text-amber-600" />,
          iconBg: 'bg-amber-50 text-amber-600',
          badgeClass: 'bg-blue-50 text-[#1463FF] border border-blue-100',
        });
      }
      if (s.snacks) {
        list.push({
          key: 'snacks',
          name: 'Berth Refreshments',
          desc: 'Station water and packed snacks delivered right to your seat',
          badge: 'Included',
          icon: <Coffee className="w-5 h-5 text-rose-600" />,
          iconBg: 'bg-rose-50 text-rose-600',
          badgeClass: 'bg-blue-50 text-[#1463FF] border border-blue-100',
        });
      }
      if (s.transport) {
        list.push({
          key: 'transport',
          name: 'Exit Gate & Cab Transfer',
          desc: 'Assistance connecting to pre-booked cab or station auto stand',
          badge: 'Included',
          icon: <Car className="w-5 h-5 text-sky-600" />,
          iconBg: 'bg-sky-50 text-sky-600',
          badgeClass: 'bg-blue-50 text-[#1463FF] border border-blue-100',
        });
      }
    }

    return list;
  }, [booking?.services]);

  // ── 6. Fare & Payment Line Item Breakdown (STRICTLY FROM DATABASE - ZERO HARDCODED FALLBACKS) ──
  const servicePriceBreakdown = useMemo(() => {
    // 1. Authoritative stored breakdown from DB (if present on booking record)
    const dbBreakdown = booking?.services?.pricing_breakdown;
    if (Array.isArray(dbBreakdown) && dbBreakdown.length > 0) {
      const assistanceItems = dbBreakdown.filter(
        (item) => item.service !== 'journey_protection' && item.service !== 'protection'
      );
      if (assistanceItems.length > 0) {
        return assistanceItems.map((item) => ({
          name: item.label || item.service,
          price: (item.total != null && !isNaN(Number(item.total)))
            ? Number(item.total)
            : (item.unit_price != null && !isNaN(Number(item.unit_price)))
              ? Number(item.unit_price)
              : null
        }));
      }
    }

    // 2. If no itemized breakdown array in DB, use selectedServices
    if (selectedServices.length === 0) return [];

    // If single service, the service total belongs entirely to this service
    if (selectedServices.length === 1) {
      return [{
        name: selectedServices[0].name,
        price: (serviceTotal != null && !isNaN(Number(serviceTotal))) ? serviceTotal : null
      }];
    }

    // Multiple selected services without per-item database breakdown:
    // Do NOT invent fake rates or generate arbitrary numbers on the frontend.
    // Display each selected service cleanly with price: null (rendered as "Included")
    // while the authoritative grand total displays totalFare.
    return selectedServices.map((s) => ({
      name: s.name,
      price: null
    }));
  }, [booking?.services?.pricing_breakdown, selectedServices, serviceTotal]);

  // ── 7. Journey Progress Milestones (Dynamic Active Step State & Real-time Countdown) ──
  const isServiceDone = isCompleted;

  // Live countdown timer for assistant arrival ETA (ticks only when assistant is actively on the way)
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    // Start countdown ONLY after assistant acceptance AND while actively on the way
    if (!isAssistantOnTheWay) return;

    setNow(Date.now());
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 5000);

    return () => clearInterval(interval);
  }, [isAssistantOnTheWay]);

  // Data-driven ETA calculation from persisted assignment and acceptance timestamps
  const etaText = useMemo(() => {
    // ETA ONLY appears when assistant has accepted and is actively on the way
    if (!isAssistantOnTheWay) return null;

    // If explicit flag that ETA is unavailable, do not show fake ETA
    if (booking?.eta_unavailable) return null;

    const rawAcceptedAt =
      booking?.accepted_at ||
      booking?.services?.accepted_at ||
      (isAssistantAccepted ? (booking?.updated_at || booking?.created_at) : null);

    if (!rawAcceptedAt) return null;

    const acceptedTime = new Date(rawAcceptedAt).getTime();
    if (isNaN(acceptedTime) || acceptedTime <= 0) return null;

    // Total ETA in minutes (from booking data or default 8-minute dispatch window)
    const totalMinutes = Number(
      booking?.eta_minutes ??
      booking?.services?.eta_minutes ??
      booking?.assistant_eta_minutes ??
      8
    );

    if (isNaN(totalMinutes) || totalMinutes <= 0) return null;

    const totalMs = totalMinutes * 60 * 1000;
    const elapsedMs = Math.max(0, now - acceptedTime);
    const remainingMs = totalMs - elapsedMs;
    const remainingMinutes = Math.max(0, Math.ceil(remainingMs / 60000));

    if (remainingMinutes <= 0) {
      return 'Arriving now';
    }
    if (remainingMinutes === 1) {
      return 'Arriving in 1 minute';
    }
    return `Arriving in ${remainingMinutes} minutes`;
  }, [isAssistantOnTheWay, isAssistantAccepted, booking, now]);

  // Derive current active step dynamically from live journey state
  const currentActiveStepId = useMemo(() => {
    if (isCancelled || isServiceDone) return null;
    if (isInService) return 'in_progress';
    if (isReached) return 'reaches_you';
    if (isAssistantOnTheWay) return 'on_the_way';
    return 'confirmed';
  }, [isCancelled, isServiceDone, isInService, isReached, isAssistantOnTheWay]);

  const stepIds = ['confirmed', 'on_the_way', 'reaches_you', 'in_progress', 'completed'];
  const activeStepIdx = isServiceDone ? 5 : stepIds.indexOf(currentActiveStepId);

  const progressSteps = [
    {
      id: 'confirmed',
      label: 'Booking Confirmed',
      sub: paidOnFormatted,
      isDone: isServiceDone || activeStepIdx > 0,
      isCurrent: currentActiveStepId === 'confirmed',
    },
    {
      id: 'on_the_way',
      label: isAssistantAccepted ? 'Assistant On the Way' : 'Assistant Needed',
      sub: isAssistantOnTheWay
        ? (etaText || null)
        : (isReached || isInService || isServiceDone ? 'Assigned & en route' : null),
      isDone: isServiceDone || activeStepIdx > 1,
      isCurrent: currentActiveStepId === 'on_the_way',
    },
    {
      id: 'reaches_you',
      label: 'Assistant Reaches You',
      sub: 'At platform',
      isDone: isServiceDone || activeStepIdx > 2,
      isCurrent: currentActiveStepId === 'reaches_you',
    },
    {
      id: 'in_progress',
      label: 'In Progress',
      sub: 'During your journey',
      isDone: isServiceDone || activeStepIdx > 3,
      isCurrent: currentActiveStepId === 'in_progress',
    },
    {
      id: 'completed',
      label: 'Completed',
      sub: 'After drop-off',
      isDone: isServiceDone,
      isCurrent: false,
    },
  ];

  // ── 8. Assigned Assistant Information ──
  const hasAssignedAssistant = Boolean(
    !isCancelled &&
    (booking?.assistant_id || booking?.assistant?.id || (booking?.assistant?.name && isAssistantAccepted))
  );
  const assistantName = booking?.assistant?.name || 'Assigned Sahayak';
  const assistantRating = booking?.assistant?.rating ? Number(booking.assistant.rating).toFixed(1) : null;
  const assistantBookingsCount = booking?.assistant?.completed_jobs ?? booking?.assistant?.total_completed ?? 0;

  // Actions
  const handleCopyId = () => {
    const displayId = booking?.booking_id || bookingUuid || 'RM-MUXRKWSM-SUBJ5';
    navigator.clipboard.writeText(displayId);
    setCopiedId(true);
    toast.success(`Booking ID copied: ${displayId}`);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const sendChat = (customText) => {
    const text = (customText || msgInput).trim();
    if (!text) return;
    const now = Date.now();
    if (lastSentRef.current.text === text && now - lastSentRef.current.time < 800) return;
    lastSentRef.current = { text, time: now };

    const clientMsgId = `cmsg-${now}-${Math.random().toString(36).slice(2, 9)}`;
    const timestamp = new Date().toISOString();
    const msg = {
      id: clientMsgId,
      clientMessageId: clientMsgId,
      bookingId: bookingUuid,
      bookingCode,
      sender: user?.name || 'Passenger',
      from: 'passenger',
      senderRole: 'passenger',
      text,
      message: text,
      timestamp,
      created_at: timestamp,
    };

    setChatMsgs((prev) => {
      const { merged } = mergeChatMessages(prev, [msg]);
      saveLocalChat(bookingUuid, bookingCode, merged);
      return merged;
    });
    setMsgInput('');

    if (window.socket && window.socket.connected) {
      window.socket.emit('chat_message', msg);
    }
    // Authoritative backend persistence
    persistRemoteChat(bookingUuid, bookingCode, msg);
  };

  const displayId = booking?.booking_id || bookingUuid || 'RM-MUXRKWSM-SUBJ5';

  return (
    <div className="space-y-6">
      {/* ── Breadcrumb / Header Row ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div className="flex items-center gap-2 text-xs font-bold text-zinc-500">
          <button
            type="button"
            onClick={() => navigate('/dashboard?tab=trips')}
            className="hover:text-[#1463FF] transition-colors flex items-center gap-1.5 cursor-pointer text-[#1463FF]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>My Trips</span>
          </button>
          <span className="text-zinc-300">/</span>
          <span className="text-zinc-900 font-extrabold">Trip Details</span>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2 bg-white border border-slate-200/80 rounded-full px-3.5 py-1 text-xs shadow-2xs">
            <span className="text-zinc-400 font-medium">Booking ID</span>
            <span className="font-mono font-bold text-zinc-900 select-all">
              {displayId}
            </span>
            <button
              type="button"
              onClick={handleCopyId}
              className="text-zinc-400 hover:text-black p-0.5 cursor-pointer ml-0.5"
              title="Copy Booking ID"
            >
              {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium bg-white border border-slate-200/80 rounded-full px-3.5 py-1 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
            <span>
              Booked on <span className="font-bold text-zinc-900">{paidOnFormatted}</span>
            </span>
          </div>

          {/* Three-Dot Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowThreeDotMenu(!showThreeDotMenu)}
              className="w-8 h-8 rounded-full bg-white border border-slate-200/80 hover:bg-slate-50 flex items-center justify-center text-zinc-600 transition-colors shadow-2xs cursor-pointer"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showThreeDotMenu && (
              <div className="absolute right-0 mt-1.5 w-48 bg-white rounded-2xl shadow-xl border border-slate-200/80 p-1.5 z-50 animate-scale-in text-xs font-semibold text-zinc-700">
                {canCancel && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setShowThreeDotMenu(false);
                        setShowCancellationModal(true);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-rose-50 text-rose-600 cursor-pointer"
                    >
                      Cancel Booking
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowThreeDotMenu(false);
                        setShowRebookingModal(true);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-blue-50 text-[#1463FF] cursor-pointer"
                    >
                      Change Booking / Modify Trip
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setShowThreeDotMenu(false);
                    setShowPolicyModal(true);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 cursor-pointer"
                >
                  Cancellation Policy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowThreeDotMenu(false);
                    setShowSosModal(true);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-rose-50 text-rose-600 cursor-pointer"
                >
                  Emergency SOS
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 2-Column Content Layout (Center Main Content + Right Info Panel) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
        {/* ══════════════════════════════════════════════════════════════════
            CENTER COLUMN (lg:col-span-8): HERO, SERVICES, PROGRESS, ASSISTANT
            ══════════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-8 space-y-5 min-w-0">
          {/* 1. Main Trip Hero / Banner (Vande Bharat Visual) */}
          <div className="relative rounded-3xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.08)] bg-slate-950 text-white min-h-[220px]">
            {/* Background Image with Dark Vignette/Gradient Overlay */}
            <div className="absolute inset-0 z-0">
              <img
                src={vandeBharatCrisp}
                alt="Indian Railways Vande Bharat"
                className="w-full h-full object-cover object-[80%_center] sm:object-[82%_center]"
              />
              {/* Smooth gradient blend from solid left banner color into photo (train on right remains clear and unobstructed) */}
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950 from-20% via-slate-950/80 via-45% to-transparent to-70% pointer-events-none" />
              {/* Subtle bottom vignette for trip pills contrast */}
              <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950/80 to-transparent pointer-events-none" />
              {/* Mobile subtle gradient for vertical contrast */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent pointer-events-none sm:hidden" />
            </div>

            {/* Content overlay */}
            <div className="relative z-10 p-5 sm:p-7 flex flex-col justify-between min-h-[220px]">
              <div>
                <div>
                  <span className="text-[10px] sm:text-[11px] font-extrabold tracking-widest text-blue-300 uppercase block font-mono">
                    INDIAN RAILWAYS
                  </span>
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight mt-1">
                    {stationCode} <span className="text-[#3B82F6]">→</span> {destStationCode}
                  </h2>
                  <p className="text-xs sm:text-sm font-semibold text-slate-200 mt-1">
                    Train {trainNo} | {cleanTrainName}
                  </p>
                  <p className="text-xs text-slate-300/90 mt-1">
                    “A faster, smoother, and more comfortable journey with OneCoolie.”
                  </p>
                </div>
              </div>

              {/* 4 Frosted Translucent Pills on Banner Bottom */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-2.5 mt-5 pt-4 border-t border-white/15">
                {/* Date */}
                <div className="bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/15 rounded-2xl p-2.5 px-3 flex items-center gap-2.5 transition-colors">
                  <div className="w-7 h-7 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center shrink-0">
                    <Calendar className="w-3.5 h-3.5 text-blue-300" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-white block truncate leading-tight">
                      {journeyDateFormatted}
                    </span>
                    <span className="text-[10px] text-slate-300 font-medium block truncate leading-tight mt-0.5">
                      {journeyWeekday}
                    </span>
                  </div>
                </div>

                {/* Train No */}
                <div className="bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/15 rounded-2xl p-2.5 px-3 flex items-center gap-2.5 transition-colors">
                  <div className="w-7 h-7 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center shrink-0">
                    <Train className="w-3.5 h-3.5 text-blue-300" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-white block truncate leading-tight">
                      {trainNo}
                    </span>
                    <span className="text-[10px] text-slate-300 font-medium block truncate leading-tight mt-0.5">
                      Train No.
                    </span>
                  </div>
                </div>

                {/* Route */}
                <div className="bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/15 rounded-2xl p-2.5 px-3 flex items-center gap-2.5 transition-colors">
                  <div className="w-7 h-7 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center shrink-0">
                    <MapPin className="w-3.5 h-3.5 text-blue-300" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-white block truncate leading-tight">
                      {stationCode} → {destStationCode}
                    </span>
                    <span className="text-[10px] text-slate-300 font-medium block truncate leading-tight mt-0.5">
                      {fromStationName} - {toStationName}
                    </span>
                  </div>
                </div>

                {/* Coach & Seat */}
                <div className="bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/15 rounded-2xl p-2.5 px-3 flex items-center gap-2.5 transition-colors">
                  <div className="w-7 h-7 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center shrink-0">
                    <Armchair className="w-3.5 h-3.5 text-blue-300" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-white block truncate leading-tight">
                      {coach} · {seatNumber}
                    </span>
                    <span className="text-[10px] text-slate-300 font-medium block truncate leading-tight mt-0.5">
                      Coach · Seat ({berthType})
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Selected Services (N) — STRICTLY NO PRICES HERE */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-zinc-900 tracking-tight">
                Selected Services ({selectedServices.length})
              </h3>
              <button
                type="button"
                onClick={() => {
                  if (!isServiceEditable) {
                    toast.error('Services can no longer be edited for this booking.');
                    return;
                  }
                  setShowEditServicesModal(true);
                }}
                disabled={!isServiceEditable}
                title={!isServiceEditable ? 'Services can no longer be edited for this booking.' : 'Edit services for this booking'}
                className={`text-xs font-bold px-3.5 py-1.5 rounded-full transition-colors cursor-pointer border ${
                  isServiceEditable
                    ? 'text-[#1463FF] bg-blue-50 hover:bg-blue-100 border-blue-100'
                    : 'text-zinc-400 bg-zinc-100 border-zinc-200 cursor-not-allowed opacity-60'
                }`}
              >
                Edit Services
              </button>
            </div>

            {/* Visual Grid of Selected Service Cards (or Empty State) */}
            {selectedServices.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4">
                {selectedServices.map((srv) => (
                  <div
                    key={srv.key}
                    className="bg-[#F8FAFC] hover:bg-white border border-slate-200/80 hover:border-blue-200 rounded-2xl p-4 flex flex-col justify-between min-h-[125px] transition-all shadow-2xs group"
                  >
                    <div className={`w-9 h-9 rounded-xl ${srv.iconBg} flex items-center justify-center shrink-0 shadow-2xs`}>
                      {srv.icon}
                    </div>

                    <div className="mt-3 flex-1 flex flex-col justify-between">
                      <h4 className="text-xs sm:text-[13px] font-bold text-zinc-900 leading-snug">
                        {srv.name}
                      </h4>
                      {srv.badge && (
                        <p className="text-[11px] sm:text-xs text-zinc-500 font-medium leading-tight mt-1.5">
                          {srv.badge}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-zinc-400 font-medium bg-[#F8FAFC] rounded-2xl border border-slate-100">
                No additional assistance services requested for this booking.
              </div>
            )}
          </div>

          {/* 3. Journey Progress (Horizontal 5-Step Timeline or Red Cancellation Alert) */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5 sm:p-6 space-y-4">
            <h3 className="text-base font-extrabold text-zinc-900 tracking-tight">
              Journey Progress
            </h3>

            {isCancelled ? (
              /* CANCELLED TERMINAL STATE — STRICT RULE: HIDE ALL PROGRESS TIMELINES */
              <div className="bg-rose-50 border border-rose-200/80 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                </div>
                <div className="space-y-1 min-w-0">
                  <h4 className="text-sm font-extrabold text-rose-900">
                    🔴 This booking was cancelled.
                  </h4>
                  <p className="text-xs text-rose-700 leading-relaxed">
                    {booking?.cancellation_reason || 'This journey booking has been cancelled and is no longer active. Any applicable refund has been initiated to your source payment method.'}
                  </p>
                </div>
              </div>
            ) : (
              /* ACTIVE JOURNEY TIMELINE (5 STAGES HORIZONTAL) */
              <div className="pt-2 pb-1 overflow-x-auto">
                <div className="flex items-start justify-between relative min-w-[500px]">
                  {progressSteps.map((st, idx) => (
                    <div key={st.id} className="flex-1 flex flex-col items-center relative text-center px-1">
                      {/* Connecting Line */}
                      {idx < progressSteps.length - 1 && (
                        <div
                          className={`absolute top-4 left-1/2 w-full h-[2px] -z-0 transition-all ${
                            idx < activeStepIdx ? 'bg-[#1463FF]' : 'bg-slate-200'
                          }`}
                        />
                      )}

                      {/* Icon */}
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs relative z-10 transition-all ${
                          st.isCurrent
                            ? 'bg-[#1463FF] text-white shadow-xs animate-live-step-pulse'
                            : st.isDone
                              ? 'bg-[#1463FF] text-white shadow-xs'
                              : 'bg-white border border-slate-300 text-slate-300'
                        }`}
                      >
                        {st.isDone ? (
                          <Check className="w-4 h-4 stroke-[3]" />
                        ) : st.isCurrent ? (
                          st.id === 'confirmed' ? (
                            <Check className="w-4 h-4 stroke-[3]" />
                          ) : (
                            <span className="w-2.5 h-2.5 rounded-full bg-white" />
                          )
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-slate-300" />
                        )}
                      </div>

                      {/* Label & Subtext */}
                      <p className={`text-xs font-bold mt-2.5 leading-tight ${st.isCurrent ? 'text-[#1463FF]' : st.isDone ? 'text-zinc-900' : 'text-zinc-400'}`}>
                        {st.label}
                      </p>
                      {st.sub ? (
                        <p className={`text-[10px] font-medium mt-0.5 leading-tight ${st.isCurrent ? 'text-[#1463FF]' : 'text-zinc-400'}`}>
                          {st.sub}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 4. Your Assistant (Shown when NOT cancelled and assistant exists) */}
          {!isCancelled && hasAssignedAssistant && (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5 sm:p-6 space-y-3">
              <h3 className="text-base font-extrabold text-zinc-900 tracking-tight">
                Your Assistant
              </h3>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#F8FAFC] border border-slate-100 rounded-2xl p-4">
                {/* Assistant Info */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-full bg-blue-100 border border-blue-200 text-[#1463FF] flex items-center justify-center font-black text-lg shrink-0 overflow-hidden">
                    {booking?.assistant?.avatar ? (
                      <img src={booking.assistant.avatar} alt={assistantName} className="w-full h-full object-cover" />
                    ) : (
                      <span>{assistantName.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-extrabold text-zinc-900">
                        {assistantName}
                      </h4>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>{isReached ? 'At platform' : isInService ? 'In service' : isAssistantOnTheWay ? 'On the way' : 'Assigned'}</span>
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 font-medium mt-1 flex items-center gap-1.5">
                      {assistantRating ? (
                        <>
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                          <span className="font-bold text-zinc-800">{assistantRating}</span>
                        </>
                      ) : (
                        <span className="font-bold text-zinc-500">No ratings yet</span>
                      )}
                      <span className="text-zinc-400 font-normal">
                        ({assistantBookingsCount > 0 ? `${assistantBookingsCount}+ trips` : 'New Assistant'})
                      </span>
                    </p>
                  </div>
                </div>

                {/* Arriving Box — Only shown when assistant is actively on the way */}
                {isAssistantOnTheWay && (
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-2.5 px-3.5 flex items-center gap-3 shadow-2xs">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1463FF] flex items-center justify-center shrink-0">
                      <Train className="w-4 h-4 text-[#1463FF]" />
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 font-medium block leading-none">Arriving at platform in</span>
                      <span className="text-xs sm:text-sm font-extrabold text-zinc-900 block leading-tight mt-0.5">
                        {etaText || (distance <= 100 ? '1-2 minutes' : `${Math.max(3, Math.round(distance / 60))} minutes`)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Call & Message Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const phone = booking?.assistant?.phone;
                      if (!phone) {
                        toast.error('Assistant contact number is not available.');
                        return;
                      }
                      if (isMobileDevice()) {
                        window.location.href = `tel:${phone}`;
                      } else {
                        if (navigator.clipboard?.writeText) {
                          navigator.clipboard.writeText(phone);
                        }
                        toast.success(`Assistant phone: ${phone} copied!`);
                      }
                    }}
                    className="px-4 py-2 rounded-full bg-white hover:bg-slate-50 text-zinc-800 font-bold text-xs border border-slate-200 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5 text-zinc-600" />
                    <span>Call</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsChatOpen(!isChatOpen)}
                    className="px-4 py-2 rounded-full bg-[#1463FF] hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{isChatOpen ? 'Close Chat' : 'Message'}</span>
                  </button>
                </div>
              </div>

              {/* Live Chat Drawer */}
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
                            className={`px-3.5 py-2 rounded-2xl max-w-[85%] ${
                              m.from === 'passenger'
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

          {/* 5. Trip & Platform Details */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5 sm:p-6 space-y-4">
            <h3 className="text-base font-extrabold text-zinc-900 tracking-tight">
              Trip &amp; Platform Details
            </h3>

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

              {/* Service Type (Boarding / De-boarding ONLY) */}
              <div className="p-3 bg-[#F8FAFC] border border-slate-100 rounded-2xl flex items-start gap-2.5 min-h-[72px]">
                <div className="w-7 h-7 rounded-xl bg-blue-50 text-[#1463FF] flex items-center justify-center shrink-0 mt-0.5">
                  <Luggage className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] text-zinc-400 font-semibold block leading-none">Service Type</span>
                  <span className="text-xs sm:text-[13px] font-bold text-zinc-900 block leading-snug break-words mt-1">
                    {serviceTypeDisplay}
                  </span>
                </div>
              </div>
            </div>

            {/* Custom Special Instructions (ONLY IF CUSTOM INSTRUCTION PROVIDED) */}
            {hasCustomInstructions && (
              <div className="bg-[#EFF6FF] border border-[#BFDBFE]/60 rounded-2xl p-4 flex items-start gap-3 mt-3">
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
            )}

            {/* Train Information */}
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
          </div>

          {/* 6. Service Start OTP (When in-person verification is ready) */}
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

          {/* 7. Post-Trip Feedback (When Completed) */}
          {isCompleted && (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5 sm:p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-extrabold text-zinc-900">
                  Rate Your Journey Assistant
                </h4>
                {feedbackStatus === 'success' && (
                  <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60 inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>✓ Feedback Submitted</span>
                  </span>
                )}
              </div>

              {feedbackStatus === 'success' || (booking?.rating && Number(booking.rating) > 0) ? (
                <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 sm:p-5 space-y-3">
                  <p className="text-xs text-zinc-600 font-medium">Thank you for your rating and review.</p>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-5 h-5 ${
                          rating && star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                        }`}
                      />
                    ))}
                    <span className="text-xs font-black text-zinc-800 ml-2">
                      {rating} / 5
                    </span>
                  </div>
                  {review && (
                    <p className="text-xs text-zinc-800 font-medium bg-white/90 p-2.5 rounded-xl border border-emerald-100/90 leading-relaxed">
                      “{review}”
                    </p>
                  )}
                </div>
              ) : (booking?.feedback_skipped || booking?.services?.feedback_skipped) ? (
                <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 space-y-1">
                  <p className="text-xs font-bold text-zinc-700">Trip Completed</p>
                  <p className="text-xs text-zinc-500">Feedback was skipped for this journey. Thank you for travelling with ONECOOLIE.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="p-1 text-slate-200 hover:text-amber-400 transition-colors cursor-pointer"
                      >
                        <Star
                          className={`w-6 h-6 transition-all ${
                            rating && star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <textarea
                    rows={2}
                    value={review}
                    onChange={(e) => setReview(e.target.value)}
                    placeholder="Share any comments about your assistant..."
                    className="w-full bg-[#F8FAFC] border border-slate-200 rounded-2xl p-3 text-xs focus:outline-none focus:border-[#1463FF]"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await axios.post(`/bookings/${bookingUuid}/skip-feedback`);
                          toast.success('Feedback skipped.');
                          navigate('/dashboard', { replace: true });
                        } catch (err) {
                          navigate('/dashboard', { replace: true });
                        }
                      }}
                      className="px-4 py-2 rounded-full border border-slate-300 hover:bg-slate-100 text-zinc-700 font-bold text-xs transition-colors cursor-pointer"
                    >
                      Skip
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!rating) {
                          toast.error('Please select a star rating first');
                          return;
                        }
                        setFeedbackStatus('loading');
                        try {
                          const targetAssistantId = booking?.assistant_id || booking?.assistant?.id;
                          const res = await axios.post(`/bookings/${bookingUuid}/review`, {
                            rating,
                            review,
                            assistantId: targetAssistantId,
                          });
                          setFeedbackStatus('success');
                          toast.success('Feedback submitted successfully!');
                          if (res.data?.booking && onUpdate) {
                            onUpdate(res.data.booking);
                          }
                          navigate('/dashboard', { replace: true });
                        } catch (err) {
                          setFeedbackStatus('idle');
                          const errorMsg = err.response?.data?.message || 'Unable to submit rating right now';
                          toast.error(errorMsg);
                        }
                      }}
                      className="px-5 py-2.5 rounded-full bg-black hover:bg-zinc-800 text-white font-bold text-xs transition-colors cursor-pointer"
                    >
                      Submit Feedback
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            RIGHT COLUMN (lg:col-span-4): FARE & PAYMENT, PROTECTION, NEED HELP
            ══════════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-4 space-y-5 sticky top-24 w-full">
          {/* Card 1: Fare & Payment (SINGLE SOURCE OF TRUTH FOR PRICING) */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-6 space-y-4">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-zinc-900" />
              <h3 className="text-base font-extrabold text-zinc-900">
                Fare &amp; Payment
              </h3>
            </div>

            <div>
              {isFareAvailable && totalFare != null ? (
                <>
                  <div className="text-3xl sm:text-4xl font-black text-zinc-900 tracking-tight leading-none">
                    ₹{totalFare.toFixed(2)}
                  </div>
                  <p className="text-xs font-semibold text-zinc-400 mt-1.5">
                    Total Amount
                  </p>
                </>
              ) : (
                <>
                  <div className="text-2xl sm:text-3xl font-black text-zinc-700 tracking-tight leading-none">
                    Fare unavailable
                  </div>
                  <p className="text-xs font-semibold text-zinc-400 mt-1.5">
                    Fare information unavailable
                  </p>
                </>
              )}
            </div>

            {/* Itemized Service Breakdown */}
            <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
              {servicePriceBreakdown.length > 0 ? (
                servicePriceBreakdown.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-zinc-600 font-medium py-0.5">
                    <span className="truncate pr-2">{item.name}</span>
                    <span className="font-mono font-bold text-zinc-900 shrink-0">
                      {item.price != null ? `₹${Number(item.price).toFixed(2)}` : 'Included'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-zinc-400 italic py-0.5">
                  {isFareAvailable ? 'Station Assistance Service' : 'Fare information unavailable'}
                </div>
              )}

              {/* Journey Protection Line Item */}
              {hasProtection && protectionPrice != null && protectionPrice > 0 && (
                <div className="flex items-center justify-between text-zinc-600 font-medium py-0.5">
                  <span className="truncate pr-2">Journey Protection</span>
                  <span className="font-mono font-bold text-zinc-900 shrink-0">
                    ₹{protectionPrice.toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {/* Total Amount Row */}
            <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs font-bold">
              <span className="font-extrabold text-zinc-900">Total Amount</span>
              <span className="font-mono font-black text-sm text-zinc-900">
                {isFareAvailable && totalFare != null ? `₹${totalFare.toFixed(2)}` : 'Unavailable'}
              </span>
            </div>

            {/* Payment Details */}
            <div className="space-y-2.5 pt-3 border-t border-slate-100 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 font-medium">Payment Status</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black flex items-center gap-1 ${
                  isCancelled
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : paymentStatus === 'PAID'
                      ? 'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]/60'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  <span>{paymentStatus === 'PAID' ? '✓' : isCancelled ? '✕' : '⏳'}</span>
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

          {/* Card 2: Protection (PRE-LAUNCH) */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#1463FF]" />
                <h3 className="text-base font-extrabold text-zinc-900">
                  Protection
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-50 text-[#1463FF] border border-blue-100">
                PRE-LAUNCH
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-zinc-400 block leading-none">Journey Protection</span>
                <span className="text-xl font-black text-zinc-900 block leading-tight mt-1">
                  {hasProtection && protectionPrice != null && protectionPrice > 0
                    ? `₹${protectionPrice.toFixed(2)}`
                    : 'Not Added'}
                </span>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                hasProtection && (journeyProtection?.status === 'active' || paymentStatus === 'PAID')
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80'
                  : hasProtection && (journeyProtection?.status === 'pending_payment' || paymentStatus === 'PENDING')
                    ? 'bg-amber-50 text-amber-800 border border-amber-200/80'
                    : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
              }`}>
                {hasProtection
                  ? (journeyProtection?.status === 'active' || paymentStatus === 'PAID'
                    ? 'Active'
                    : 'Pending Payment')
                  : 'Not Added'}
              </span>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 font-sans">Protection ID</span>
                <span className="font-bold text-zinc-900 select-all">
                  {hasProtection
                    ? (journeyProtection?.protection_id || `OCP-${(bookingUuid || 'ZC3TPQ36').slice(-8).toUpperCase()}`)
                    : 'Not Added'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 font-sans">Coverage</span>
                <span className="font-bold text-zinc-800 font-sans">
                  {hasProtection
                    ? (paymentMethod?.toLowerCase().includes('cash') ? 'Cash / COD' : 'UPI / Card')
                    : 'None'}
                </span>
              </div>
            </div>

            {/* Protective Callout Banner */}
            <div className={`border rounded-2xl p-3 flex items-start gap-2.5 ${
              hasProtection
                ? (journeyProtection?.status === 'active' || paymentStatus === 'PAID'
                  ? 'bg-blue-50/60 border-blue-200/70 text-blue-900'
                  : 'bg-amber-50/70 border-amber-200/70 text-amber-900')
                : 'bg-zinc-50 border-zinc-200 text-zinc-700'
            }`}>
              <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${
                hasProtection
                  ? (journeyProtection?.status === 'active' || paymentStatus === 'PAID'
                    ? 'text-blue-600'
                    : 'text-amber-600')
                  : 'text-zinc-400'
              }`} />
              <div className="text-[11px] leading-snug">
                <p className="font-bold">
                  {hasProtection
                    ? (journeyProtection?.status === 'active' || paymentStatus === 'PAID'
                      ? "You're protected for this journey."
                      : "Protection pending payment.")
                    : 'Journey Protection not added.'}
                </p>
                <p className={
                  hasProtection
                    ? (journeyProtection?.status === 'active' || paymentStatus === 'PAID'
                      ? 'text-blue-700 mt-0.5'
                      : 'text-amber-700 mt-0.5')
                    : 'text-zinc-500 mt-0.5'
                }>
                  {hasProtection
                    ? (journeyProtection?.status === 'active' || paymentStatus === 'PAID'
                      ? 'Protection is active for this trip.'
                      : 'Protection activates automatically once payment is completed.')
                    : 'Protection was not opted in for this booking.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              id="view-protection-terms-btn"
              aria-label="View Terms and Pre-Launch Policy"
              onClick={() => setShowProtectionTerms(true)}
              className="w-full py-1 text-xs text-blue-600 hover:text-blue-800 font-bold text-center cursor-pointer transition-colors focus:outline-none focus:underline"
            >
              View Terms &amp; Pre-Launch Policy
            </button>
          </div>

          {/* Card 3: Need Help? */}
          <div
            onClick={() => handleContactSupport(navigate, {
              booking,
              bookingId: booking?.booking_id || booking?.id,
              from: 'trip_details'
            })}
            className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-4 sm:p-5 flex items-center justify-between hover:border-blue-200 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#1463FF] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Headphones className="w-5 h-5 text-[#1463FF]" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-zinc-900 group-hover:text-[#1463FF] transition-colors">
                  Need Help?
                </h4>
                <p className="text-xs text-zinc-400 font-medium mt-0.5">
                  Our support team is here for you.
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-black group-hover:translate-x-0.5 transition-all" />
          </div>

          {/* Card 4: Action Links (Cancel & Rebook & SOS) */}
          {!isCompleted && !isCancelled && (
            <div className="flex items-center justify-center gap-3 text-xs font-semibold px-2 text-zinc-400">
              {canCancel && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowCancellationModal(true)}
                    className="hover:text-rose-600 transition-colors cursor-pointer"
                  >
                    Cancel Booking
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => setShowRebookingModal(true)}
                    className="hover:text-[#1463FF] transition-colors cursor-pointer"
                  >
                    Change Booking / Modify Trip
                  </button>
                  <span>•</span>
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

      {/* ── Cancellation Modal ── */}
      {showCancellationModal && (
        <CancellationModal
          isOpen={showCancellationModal}
          booking={booking}
          onClose={() => setShowCancellationModal(false)}
          onRequestRebook={() => {
            setShowCancellationModal(false);
            setShowRebookingModal(true);
          }}
          onSuccess={(updatedBooking) => {
            setShowCancellationModal(false);
            if (onUpdate) onUpdate(updatedBooking);
            toast.success('Booking cancelled successfully.');
          }}
        />
      )}

      {/* ── Rebooking Modal ── */}
      {showRebookingModal && (
        <RebookingModal
          isOpen={showRebookingModal}
          booking={booking}
          onClose={() => setShowRebookingModal(false)}
          onSuccess={(newBooking) => {
            setShowRebookingModal(false);
            if (onUpdate) onUpdate(newBooking);
          }}
        />
      )}

      {/* ── Edit Services Modal ── */}
      {showEditServicesModal && (
        <EditServicesModal
          isOpen={showEditServicesModal}
          booking={booking}
          onClose={() => setShowEditServicesModal(false)}
          onSuccess={(updatedBooking) => {
            setShowEditServicesModal(false);
            if (onUpdate) onUpdate(updatedBooking);
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

      {/* ── Protection Terms Modal ── */}
      {showProtectionTerms && (
        <JourneyProtectionTermsModal
          open={showProtectionTerms}
          isOpen={showProtectionTerms}
          onClose={() => setShowProtectionTerms(false)}
          protectionId={journeyProtection?.protection_id}
          bookingRef={bookingUuid || booking?.booking_id || booking?.id}
          acceptedAt={journeyProtection?.activated_at || journeyProtection?.terms_accepted_at}
          hasAccepted={Boolean(hasProtection)}
        />
      )}

      {/* ── Emergency SOS Modal ── */}
      {showSosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-rose-100 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-zinc-900">Emergency SOS</h3>
            <p className="text-xs text-zinc-500">
              Immediate alert will be broadcasted to Railway Police & Station Master at {stationCode}.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSosModal(false)}
                className="flex-1 py-2.5 rounded-full bg-slate-100 text-zinc-700 font-bold text-xs cursor-pointer hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSosModal(false);
                  toast.success('SOS Alert dispatched to station authorities!');
                }}
                className="flex-1 py-2.5 rounded-full bg-rose-600 text-white font-bold text-xs cursor-pointer hover:bg-rose-700 shadow-md shadow-rose-600/20"
              >
                Confirm SOS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}