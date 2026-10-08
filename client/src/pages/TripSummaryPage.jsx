import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { toast } from 'react-hot-toast';
import {
  Train,
  MapPin,
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  Star,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Printer,
  Briefcase,
  Copy,
  Check,
  CreditCard,
  Luggage,
  ShieldCheck,
  Armchair,
  RefreshCw,
  Ticket
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import TrainLoader from '../components/TrainLoader';
import oneCoolieLogo from '../assets/onecoolie-logo.png';
import ProfileMenu from '../context/ProfileMenu';
import JourneyProtectionTermsModal from '../components/protection/JourneyProtectionTermsModal';
import { fetchBookingProtection } from '../services/protectionService';

export default function TripSummaryPage() {

  const { bookingId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isNotFound, setIsNotFound] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [journeyProtection, setJourneyProtection] = useState(null);
  const [showProtectionTerms, setShowProtectionTerms] = useState(false);


  // Rating & Feedback inside summary
  const [rating, setRating] = useState(null);
  const [comment, setComment] = useState('');
  const [feedbackStatus, setFeedbackStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
  const [feedbackError, setFeedbackError] = useState('');

  const fetchSummary = useCallback(async () => {
    if (!bookingId) {
      setIsNotFound(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setIsNotFound(false);

    try {
      let data = null;
      try {
        const res = await axios.get(`/bookings/${bookingId}/summary`);
        data = res.data?.summary || res.data?.booking || res.data;
      } catch (err) {
        // Fallback to /bookings/:id if summary route is pending
        if (err.response?.status === 404) {
          setIsNotFound(true);
          setLoading(false);
          return;
        }
        if (err.response?.status === 403) {
          setError('You are not authorized to view this trip summary.');
          setLoading(false);
          return;
        }
        const fallbackRes = await axios.get(`/bookings/${bookingId}`);
        data = fallbackRes.data?.booking || fallbackRes.data;
      }

      if (data) {
        setBooking(data);
        if (data.journey_protection) {
          setJourneyProtection(data.journey_protection);
        } else {
          fetchBookingProtection(bookingId).then((prot) => {
            if (prot) setJourneyProtection(prot);
          });
        }
        if (data.rating && Number(data.rating) > 0) {
          setRating(Number(data.rating));
          setComment(data.review || '');
          setFeedbackStatus('success');
        } else {
          setRating(null);
          setComment('');
          setFeedbackStatus('idle');
        }
      } else {
        setIsNotFound(true);
      }

    } catch (err) {
      console.error('Fetch trip summary error:', err);
      if (err.response?.status === 404) {
        setIsNotFound(true);
      } else if (err.response?.status === 403) {
        setError('You are not authorized to view this trip summary.');
      } else {
        setError('Unable to load trip summary.');
      }
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const handleCopyId = () => {
    const idToCopy = booking?.booking_id || booking?.id || bookingId;
    if (idToCopy) {
      navigator.clipboard.writeText(idToCopy);
      setCopiedId(true);
      toast.success(`Booking ID copied: ${idToCopy}`);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSubmitRating = async () => {
    if (!rating || rating < 1 || rating > 5) {
      toast.error('Please select a rating.');
      return;
    }

    setFeedbackStatus('loading');
    setFeedbackError('');

    const targetId = booking?.id || bookingId;
    try {
      const payload = {
        passengerId: user?.id || booking?.passenger_id,
        bookingId: targetId,
        assistantId: booking?.assistant_id || booking?.assistant?.id,
        rating: Number(rating),
        comment: comment.trim(),
        review: comment.trim()
      };
      await axios.post(`/bookings/${targetId}/rate`, payload);
      setFeedbackStatus('success');
      toast.success('Feedback submitted successfully!');
      fetchSummary();
    } catch (e) {
      console.error('Submit rating error:', e);
      setFeedbackStatus('error');
      const msg = e.response?.data?.message || 'Unable to submit feedback. Please try again.';
      setFeedbackError(msg);
      toast.error(msg);
    }
  };

  // ── Formatted Values ──
  const trainNo = booking?.train_no || booking?.train_number || 'Train';
  const trainName = booking?.train_name || 'Express';
  const sourceStation = booking?.source || booking?.from_station || booking?.station_name || booking?.station_code || 'Origin';
  const destStation = booking?.destination || booking?.to_station || 'Destination';
  const coach = booking?.coach || booking?.services?.coach || 'Unassigned';
  const seatNumber = booking?.seat_number || booking?.services?.seat_number || 'Unassigned';
  const berthType = booking?.berth_type || booking?.services?.berth_type || 'Berth';
  const pnr = booking?.pnr || booking?.services?.pnr || null;
  // Normalize status: handle CANCELED (US) vs CANCELLED (UK) spellings and case
  const rawStatusUpper = (booking?.booking_status || booking?.status || 'COMPLETED').toUpperCase();
  const status = rawStatusUpper === 'CANCELED' ? 'CANCELLED' : rawStatusUpper;
  const isCancelled = status === 'CANCELLED';

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const datePart = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const timePart = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
      return `${datePart}, ${timePart}`;
    } catch {
      return dateStr;
    }
  };

  const serviceLabel = useMemo(() => {
    if (!booking) return 'Station Assistance';
    if (booking.service) return booking.service.split(',')[0].trim();
    if (booking.services?.escort) return 'Seat & Coach Escort';
    if (booking.services?.wheelchair) return 'Wheelchair Assistance';
    if (booking.services?.luggage) return 'Luggage Assistance';
    return 'Platform Assistance';
  }, [booking]);

  // ══════════════════════════════════════════════════════════════════
  // 1. LOADING STATE
  // ══════════════════════════════════════════════════════════════════
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <TrainLoader
          text="Loading trip summary..."
          subtext="Retrieving verified journey & assistant data..."
        />
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // 2. NOT FOUND STATE
  // ══════════════════════════════════════════════════════════════════
  if (isNotFound) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-slate-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.04)] text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-100">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-zinc-900 mb-1">Trip summary not found</h2>
          <p className="text-xs sm:text-sm text-zinc-500 mb-6">
            We couldn't locate the requested booking summary. Please check your trips.
          </p>
          <button
            type="button"
            onClick={() => navigate('/dashboard?tab=trips')}
            className="w-full py-3 rounded-full bg-black hover:bg-zinc-800 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <Briefcase className="w-4 h-4" />
            <span>Back to My Trips</span>
          </button>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // 3. ERROR STATE
  // ══════════════════════════════════════════════════════════════════
  if (error || !booking) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-rose-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.04)] text-center">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-zinc-900 mb-1">Unable to load trip summary</h2>
          <p className="text-xs sm:text-sm text-zinc-500 mb-6 leading-relaxed">
            {error || 'Unable to load trip summary. Please check your network connection and try again.'}
          </p>
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={fetchSummary}
              className="w-full py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Try Again</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard?tab=trips')}
              className="w-full py-3 rounded-full bg-slate-100 hover:bg-slate-200 text-zinc-800 font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Briefcase className="w-4 h-4" />
              <span>Back to My Trips</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // 4. SUCCESS STATE: COMPLETE REAL BOOKING SUMMARY
  // ══════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-zinc-900 selection:bg-blue-100 pb-16">
      {/* ── Top Header / Navbar ── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/dashboard?tab=trips')}
              className="p-2 rounded-full hover:bg-slate-100 text-zinc-600 hover:text-black transition-colors cursor-pointer"
              title="Back to My Trips"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <img src={oneCoolieLogo} alt="OneCoolie" className="h-9 sm:h-10 w-auto object-contain" />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePrint}
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-zinc-800 font-bold text-xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Receipt</span>
            </button>
            <ProfileMenu role="passenger" onNavigate={(t) => navigate(`/dashboard?tab=${t}`)} />
          </div>
        </div>
      </header>

      {/* ── Main Container ── */}
      <main className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 space-y-6">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center justify-between flex-wrap gap-2 text-xs font-semibold text-zinc-500">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/dashboard?tab=trips')}
              className="hover:text-black transition-colors cursor-pointer"
            >
              My Trips
            </button>
            <span>/</span>
            <span className="text-zinc-900 font-bold">Trip Summary</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200/80 rounded-full px-3 py-1 font-mono text-[11px] font-bold text-zinc-800">
              <span className="text-zinc-400 font-normal">Booking ID:</span>
              <span>{booking.booking_id || booking.id}</span>
              <button
                type="button"
                onClick={handleCopyId}
                className="text-zinc-400 hover:text-black p-0.5 cursor-pointer ml-0.5"
                title="Copy ID"
              >
                {copiedId ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
              isCancelled
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}>
              {status}
            </span>
          </div>
        </div>

        {/* ── 1. HERO SUMMARY CARD ── */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-6 sm:p-8 relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
            <div>
              <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase font-mono block mb-1">
                {isCancelled ? 'CANCELLED BOOKING' : 'COMPLETED TRIP SUMMARY'}
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight">
                Train {trainNo} · <span className="text-[#146BFF]">{trainName}</span>
              </h1>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-zinc-600 font-semibold mt-1.5">
                <span>{sourceStation}</span>
                <span className="text-zinc-400">→</span>
                <span>{destStation}</span>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-[#F8FAFC] border border-slate-100 rounded-2xl p-4 md:text-right shrink-0">
              <div>
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Total Paid</span>
                <span className="text-2xl sm:text-3xl font-black text-black tracking-tight">
                  ₹{booking.total_price ?? 0}
                </span>
                <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">
                  ✓ {booking.payment_status?.toUpperCase() || 'PAID'} ({booking.payment_method || 'Online'})
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6">
            <div className="p-3.5 bg-[#F8FAFC] border border-slate-100/90 rounded-2xl flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#146BFF] flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-zinc-400 font-medium block leading-none">Journey Date</span>
                <span className="text-xs sm:text-sm font-bold text-zinc-900 block mt-1 truncate">
                  {formatDate(booking.journey_date)}
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-[#F8FAFC] border border-slate-100/90 rounded-2xl flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#146BFF] flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-zinc-400 font-medium block leading-none">Journey Time</span>
                <span className="text-xs sm:text-sm font-bold text-zinc-900 block mt-1 truncate">
                  {booking.journey_time || 'Scheduled'}
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-[#F8FAFC] border border-slate-100/90 rounded-2xl flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#146BFF] flex items-center justify-center shrink-0">
                <Train className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-zinc-400 font-medium block leading-none">Coach & Seat</span>
                <span className="text-xs sm:text-sm font-bold text-zinc-900 block mt-1 truncate">
                  {coach} · Seat {seatNumber}
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-[#F8FAFC] border border-slate-100/90 rounded-2xl flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#146BFF] flex items-center justify-center shrink-0">
                <Ticket className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-zinc-400 font-medium block leading-none">PNR Number</span>
                <span className="text-xs sm:text-sm font-bold text-zinc-900 block mt-1 truncate">
                  {pnr || 'Not Provided'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── 2. TWO COLUMN DETAILS: ASSISTANT & PASSENGER ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Column A: Assistant Information */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-sm sm:text-base text-zinc-900">
                  Assigned Journey Assistant
                </h3>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Verified Assistant
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 font-medium">Assistant Name</span>
                <span className="font-bold text-zinc-900">
                  {booking.assistant?.name || 'Authorized Railway Porter'}
                </span>
              </div>

              {booking.assistant?.phone && (
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 font-medium">Contact Number</span>
                  <span className="font-bold text-zinc-900 font-mono">
                    {booking.assistant.phone}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-zinc-500 font-medium">Station Hub</span>
                <span className="font-bold text-zinc-900">
                  {booking.assistant?.station_code || booking.station_code || sourceStation}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-zinc-500 font-medium">Assistant Rating</span>
                <span className="font-bold text-zinc-900 inline-flex items-center gap-1">
                  {booking.assistant?.rating ? (
                    <>
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{Number(booking.assistant.rating).toFixed(1)} / 5</span>
                    </>
                  ) : (
                    <span>No ratings yet</span>
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-zinc-500 font-medium">Completed Missions</span>
                <span className="font-bold text-zinc-900">
                  {booking.assistant?.completed_jobs ?? booking.assistant?.total_completed ?? 0} Trips
                </span>
              </div>
            </div>
          </div>

          {/* Column B: Passenger & Payment Information */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-[#146BFF]" />
                <h3 className="font-extrabold text-sm sm:text-base text-zinc-900">
                  Passenger & Payment Details
                </h3>
              </div>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                Confirmed Booking
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 font-medium">Passenger Name</span>
                <span className="font-bold text-zinc-900">
                  {booking.passenger?.name || user?.name || 'Passenger'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-zinc-500 font-medium">Passenger ID</span>
                <span className="font-mono text-[11px] text-zinc-700">
                  {booking.passenger_id || user?.id || 'Verified'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-zinc-500 font-medium">Requested Service</span>
                <span className="font-bold text-zinc-900">{serviceLabel}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-zinc-500 font-medium">Payment Method</span>
                <span className="font-bold text-zinc-900">
                  {booking.payment_method || 'Online Payment'}
                </span>
              </div>

              {booking.payment_id && (
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 font-medium">Transaction ID</span>
                  <span className="font-mono text-[11px] text-zinc-700">
                    {booking.payment_id}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── 2.5 JOURNEY PROTECTION SUMMARY (PRE-LAUNCH) ── */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              <h3 className="font-extrabold text-base text-zinc-900">
                ONECOOLIE JOURNEY PROTECTION
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
                PRE-LAUNCH
              </span>
              {journeyProtection && journeyProtection.status === 'active' ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                  ACTIVE
                </span>
              ) : journeyProtection && journeyProtection.status === 'pending_payment' ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                  PENDING PAYMENT
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-zinc-600 border border-slate-200">
                  NOT ADDED
                </span>
              )}
            </div>
          </div>

          {journeyProtection ? (
            <div className={`grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 rounded-2xl ${
              journeyProtection.status === 'active'
                ? 'bg-blue-50/50 border border-blue-100/80'
                : 'bg-amber-50/40 border border-amber-200/60'
            } text-xs`}>
              <div>
                <span className="text-[11px] text-zinc-400 font-medium block">Protection ID</span>
                <span className="font-mono font-bold text-zinc-900 select-all">{journeyProtection.protection_id}</span>
              </div>
              <div>
                <span className="text-[11px] text-zinc-400 font-medium block">Protection Fee</span>
                <span className="font-bold text-zinc-900">
                  {journeyProtection.price != null && !isNaN(Number(journeyProtection.price))
                    ? `₹${Number(journeyProtection.price).toFixed(2)}`
                    : '—'}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-zinc-400 font-medium block">Status / Terms</span>
                <span className={`font-mono font-bold block ${journeyProtection.status === 'active' ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {journeyProtection.status === 'active' ? 'ACTIVE' : 'PENDING CASH PAYMENT'}
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">{journeyProtection.terms_version || 'PRE-LAUNCH-v1'}</span>
              </div>
              <div className="flex items-center sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowProtectionTerms(true)}
                  className="px-3 py-1.5 rounded-full bg-white hover:bg-slate-100 text-blue-600 border border-blue-200 font-bold text-xs transition-colors cursor-pointer"
                >
                  View Terms
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <p className="text-zinc-500 text-[11px]">
                No Journey Protection was added to this journey. (₹0.50 / journey)
              </p>
              <button
                type="button"
                onClick={() => setShowProtectionTerms(true)}
                className="text-blue-600 hover:text-blue-800 font-bold text-xs cursor-pointer"
              >
                View Pre-Launch Terms
              </button>
            </div>
          )}
        </div>

        {/* ── 3. MISSION TIMELINE MILESTONES — hidden for cancelled bookings ── */}
        {isCancelled ? (
          <div className="bg-rose-50/60 rounded-3xl border border-rose-200/70 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <h3 className="font-extrabold text-sm sm:text-base text-rose-900">
                Booking Cancelled
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="p-4 bg-white/70 border border-rose-100 rounded-2xl space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-600 block">
                  Cancellation Date
                </span>
                <p className="text-xs font-bold text-zinc-800">
                  {formatDateTime(booking.cancelled_at || booking.updated_at || booking.created_at)}
                </p>
                <p className="text-[11px] text-zinc-400">Booking was cancelled on this date</p>
              </div>
              {(booking.cancellation_reason || booking.cancel_reason) && (
                <div className="p-4 bg-white/70 border border-rose-100 rounded-2xl space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-600 block">
                    Cancellation Reason
                  </span>
                  <p className="text-xs font-bold text-zinc-800">
                    {booking.cancellation_reason || booking.cancel_reason}
                  </p>
                </div>
              )}
            </div>
            {(booking.refund_amount != null || booking.cancellation_fee != null) && (
              <div className="p-4 bg-white/70 border border-rose-100 rounded-2xl flex flex-wrap gap-6">
                {booking.cancellation_fee != null && (
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-600 block">
                      Cancellation Fee
                    </span>
                    <p className="text-sm font-black text-zinc-900">₹{booking.cancellation_fee}</p>
                  </div>
                )}
                {booking.refund_amount != null && (
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 block">
                      Refund Amount
                    </span>
                    <p className="text-sm font-black text-zinc-900">₹{booking.refund_amount}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-6 sm:p-8 space-y-4">

          <h3 className="font-extrabold text-sm sm:text-base text-zinc-900">
            Journey Assistance Milestones
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            {/* Step 1 */}
            <div className="p-4 bg-[#F8FAFC] border border-slate-100 rounded-2xl space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 block">
                ✓ Booking Confirmed
              </span>
              <p className="text-xs font-bold text-zinc-800">{formatDateTime(booking.created_at)}</p>
              <p className="text-[11px] text-zinc-400">Assistance requested &amp; recorded</p>
            </div>

            {/* Step 2 */}
            <div className="p-4 bg-[#F8FAFC] border border-slate-100 rounded-2xl space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 block">
                ✓ Assistant Assigned
              </span>
              <p className="text-xs font-bold text-zinc-800">
                {formatDateTime(booking.accepted_at || booking.services?.accepted_at || booking.updated_at)}
              </p>
              <p className="text-[11px] text-zinc-400">Assistant dispatched to platform</p>
            </div>

            {/* Step 3 */}
            <div className="p-4 bg-[#F8FAFC] border border-slate-100 rounded-2xl space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 block">
                ✓ Service Completed
              </span>
              <p className="text-xs font-bold text-zinc-800">
                {formatDateTime(booking.completed_at || booking.services?.completed_at || booking.updated_at)}
              </p>
              <p className="text-[11px] text-zinc-400">Mission fulfilled successfully</p>
            </div>
          </div>
        </div>
        )}

        {/* ── 4. RATING & FEEDBACK SECTION (PERSISTENT & INTERACTIVE) ── */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-zinc-900">
                Passenger Feedback & Rating
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Your verified review of the station journey assistant
              </p>
            </div>
            {feedbackStatus === 'success' && (
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>✓ Feedback Submitted</span>
              </span>
            )}
          </div>

          {feedbackStatus === 'success' ? (
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-5 space-y-3">
              <p className="text-xs font-bold text-emerald-900">
                Thank you for your feedback!
              </p>
              <div>
                <span className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider block mb-1">
                  Your Rating:
                </span>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-6 h-6 ${
                        rating && star <= rating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-200'
                      }`}
                    />
                  ))}
                  <span className="text-sm font-black text-zinc-900 ml-2">
                    {rating} / 5 Stars
                  </span>
                </div>
              </div>

              {comment && (
                <div>
                  <span className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider block mb-1">
                    Your Feedback:
                  </span>
                  <p className="text-xs text-zinc-800 font-medium bg-white/90 p-3 rounded-xl border border-emerald-100 leading-relaxed">
                    {comment}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 max-w-xl">
              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-2">
                  Select Your Rating (No automatic selection):
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="p-1 text-slate-200 hover:text-amber-400 transition-colors cursor-pointer"
                      title={`${star} Star`}
                    >
                      <Star
                        className={`w-7 h-7 transition-all ${
                          rating && star <= rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-300 hover:text-amber-400'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-zinc-700 ml-2">
                    {rating ? `${rating} / 5 Stars` : '☆ Select a rating'}
                  </span>
                </div>
              </div>

              {feedbackError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                  {feedbackError}
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1.5">
                  Share Your Experience (Optional):
                </label>
                <textarea
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="How was your assistance experience at the station?"
                  disabled={feedbackStatus === 'loading'}
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-2xl p-3 text-xs focus:outline-none focus:border-black resize-none"
                />
              </div>

              <button
                type="button"
                disabled={feedbackStatus === 'loading'}
                onClick={handleSubmitRating}
                className="bg-black hover:bg-zinc-800 text-white font-bold px-6 py-2.5 rounded-full text-xs transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-2 shadow-xs"
              >
                {feedbackStatus === 'loading' ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <span>Submit Feedback</span>
                )}
              </button>
            </div>
          )}
        </div>

        {/* ── 5. BOTTOM ACTIONS ── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/dashboard?tab=trips')}
            className="w-full sm:w-auto px-6 py-3 rounded-full bg-black hover:bg-zinc-800 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <Briefcase className="w-4 h-4" />
            <span>Back to My Trips</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="w-full sm:w-auto px-6 py-3 rounded-full bg-white hover:bg-slate-50 border border-slate-200/90 text-zinc-900 font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
          >
            <Printer className="w-4 h-4" />
            <span>Print Trip Summary</span>
          </button>
        </div>
      </main>

      {/* Journey Protection Pre-Launch Terms Modal */}
      <JourneyProtectionTermsModal
        open={showProtectionTerms}
        onClose={() => setShowProtectionTerms(false)}
        protectionId={journeyProtection?.protection_id}
        bookingRef={booking?.booking_id || booking?.id}
        acceptedAt={journeyProtection?.activated_at || journeyProtection?.terms_accepted_at}
        hasAccepted={Boolean(journeyProtection)}
      />
    </div>
  );
}

