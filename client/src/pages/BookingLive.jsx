import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import oneCoolieLogo from '../assets/onecoolie-logo.png';
import {
  Train,
  Luggage,
  Bell,
  ArrowLeft,
  Copy,
  Check,
  FileText,
  Headphones,
  ArrowRight,
  ShieldCheck,
  MapPin,
  Calendar,
  CreditCard
} from 'lucide-react';
import toast from 'react-hot-toast';
import axios from '../api/axios';
import ActiveBooking from '../components/ActiveBooking';
import ProfileMenu from '../context/ProfileMenu';
import { STATIONS } from '../utils/services';
import TrainLoader from '../components/TrainLoader';

/* ============================================================
   BOOKING LIVE / TRIP DETAILS PAGE (PIXEL PERFECT MATCH TO MOCKUP)
   ============================================================ */

export default function BookingLive() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [distance, setDistance] = useState(500);
  const [copiedId, setCopiedId] = useState(false);

  const fetchBooking = useCallback(async () => {
    try {
      const { data } = await axios.get(`/bookings/${id}`);
      setBooking(data);

      // Phase 2C Payment Recovery: If online booking is pending, query authoritative gateway status
      if (data && data.payment_status === 'pending' && data.payment_method !== 'cash') {
        try {
          const { data: statusRes } = await axios.get(`/payments/${id}/status`);
          if (statusRes && statusRes.payment_status === 'paid') {
            setBooking((prev) => ({
              ...prev,
              payment_status: 'paid'
            }));
            toast.success('Payment confirmed via secure gateway!');
          }
        } catch (statusErr) {
          // Continue gracefully
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, [id]);

  useEffect(() => {
    fetchBooking();
    const interval = setInterval(fetchBooking, 6000);
    return () => clearInterval(interval);
  }, [fetchBooking]);

  useEffect(() => {
    if (booking?.booking_status === 'arriving') {
      const interval = setInterval(() => {
        setDistance((d) => Math.max(0, d - Math.floor(Math.random() * 40)));
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [booking?.booking_status]);

  const getDisplayId = (b) => {
    if (!b) return '';
    return b.booking_id || b.id || '';
  };

  const handleCopyId = () => {
    if (booking) {
      const displayId = getDisplayId(booking);
      navigator.clipboard.writeText(displayId);
      setCopiedId(true);
      toast.success(`Booking ID copied: ${displayId}`);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  if (!booking) {
    return (
      <TrainLoader
        text="Loading Trip Details..."
        subtext="Fetching coach telemetry, assistant status & station track info..."
      />
    );
  }

  const status = booking.booking_status || 'pending';
  const isCompleted = status === 'completed';
  const isCancelled = status === 'cancelled';

  const formatDateString = (dateStr) => {
    if (!dateStr) return '03 Sep 2026';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, '0');
      const month = d.toLocaleString('en-US', { month: 'short' });
      const year = d.getFullYear();
      return `${day} ${month} ${year}`;
    } catch (e) {
      return dateStr;
    }
  };

  const formattedBookedDate = booking.created_at
    ? (() => {
      try {
        const d = new Date(booking.created_at);
        const day = String(d.getDate()).padStart(2, '0');
        const month = d.toLocaleString('en-US', { month: 'short' });
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, '0');
        const mins = String(d.getMinutes()).padStart(2, '0');
        return `${day} ${month} ${year}, ${hours}:${mins}`;
      } catch (e) {
        return '03 Sep 2026, 19:15';
      }
    })()
    : '03 Sep 2026, 19:15';

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-zinc-900 font-sans selection:bg-blue-600 selection:text-white">
      {/* ── Sticky Floating Glass Capsule Top Navigation Bar ── */}
      <header className="sticky top-3 z-40 px-3 sm:px-6">
        <div className="max-w-6xl mx-auto bg-white/95 backdrop-blur-md rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-200/70 px-4 sm:px-6 py-2.5 flex items-center justify-between transition-all">
          {/* Left Brand */}
          <div className="flex items-center">
            <button type="button" onClick={() => navigate('/')} className="flex items-center cursor-pointer group">
              <img
                src={oneCoolieLogo}
                alt="OneCoolie"
                className="h-10 sm:h-11 md:h-12 lg:h-13 max-h-[52px] w-auto object-contain transition-transform duration-200 group-hover:scale-102"
              />
            </button>
          </div>

          {/* Center Navigation Pills */}
          <div className="hidden sm:flex items-center p-1 bg-slate-100/70 rounded-full border border-slate-200/50 gap-1.5 shadow-inner">
            <button
              type="button"
              onClick={() => navigate('/dashboard?tab=book')}
              className="px-6 py-2.5 rounded-full text-xs font-semibold text-zinc-700 hover:text-black hover:bg-white/60 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Train className="w-4 h-4 text-zinc-600" />
              <span>Book</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/dashboard?tab=trips')}
              className="px-6 py-2.5 rounded-full text-xs font-bold bg-blue-600 text-white shadow-[0_4px_14px_0_rgba(37,99,235,0.4)] transition-all flex items-center gap-2 cursor-pointer"
            >
              <Luggage className="w-4 h-4 text-white" />
              <span>My Trips</span>
            </button>
          </div>

          {/* Right Bell & Profile */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="w-10 h-10 rounded-full bg-slate-100/80 hover:bg-slate-200/80 text-zinc-700 flex items-center justify-center transition-colors relative cursor-pointer border border-slate-200/50"
              title="Notifications"
            >
              <Bell className="w-4 h-4 text-zinc-700" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
            </button>

            <ProfileMenu role="passenger" onNavigate={(target) => navigate(`/dashboard${target === 'trips' ? '?tab=trips' : '?tab=book'}`)} />
          </div>
        </div>
      </header>

      {/* ── Main Content Container ── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Sub-Header: Breadcrumb Back Link + Booking ID & Booked Date */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/60 pb-4">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-500">
            <button
              type="button"
              onClick={() => navigate('/dashboard?tab=trips')}
              className="hover:text-blue-600 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>My Trips</span>
            </button>
            <span className="text-zinc-300">/</span>
            <span className="text-zinc-900 font-extrabold">Trip Details</span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 bg-slate-100/80 border border-slate-200/60 rounded-xl px-3 py-1 text-xs">
              <span className="text-zinc-500 font-medium">Booking ID</span>
              <span className="font-mono font-bold text-zinc-900 select-all">
                {getDisplayId(booking)}
              </span>
              <button
                type="button"
                onClick={handleCopyId}
                className="text-zinc-400 hover:text-black p-0.5 cursor-pointer ml-1"
                title="Copy Booking ID"
              >
                {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            {booking.booking_id && booking.id && (
              <div className="hidden sm:flex items-center gap-1.5 bg-slate-100/80 border border-slate-200/60 rounded-xl px-3 py-1 text-xs text-zinc-500">
                <span>DB Ref:</span>
                <span className="font-mono text-zinc-700 max-w-[120px] truncate" title={booking.id}>
                  {booking.id}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(booking.id);
                    toast.success('Database UUID copied!');
                  }}
                  className="text-zinc-400 hover:text-blue-600 p-0.5 cursor-pointer ml-0.5"
                  title="Copy Supabase UUID"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            )}

            <div className="text-xs text-zinc-500 font-medium">
              Booked on <span className="font-bold text-zinc-900">{formattedBookedDate}</span>
            </div>
          </div>
        </div>

        {/* Active Booking Component (Full-Width Top Banner & Stepper + Grid Below) */}
        <ActiveBooking
          booking={booking}
          distance={distance}
          onUpdate={(b) => setBooking(b)}
        />
      </main>
    </div>
  );
}