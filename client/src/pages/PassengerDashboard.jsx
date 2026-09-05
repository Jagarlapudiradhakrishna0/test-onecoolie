import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import TrainSearch from '../components/TrainSearch';
import PaymentModal from '../components/PaymentModal';
import ProfileMenu from '../context/ProfileMenu';
import ConfirmDialog from '../components/ConfirmDialog';
import TrainLoader from '../components/TrainLoader';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import axios from '../api/axios';
import { STATIONS } from '../utils/services';
import Brand from '../components/Brand';

/* ============================================================
   PASSENGER DASHBOARD — Swiss Minimalist Operations Portal
   Strictly Black (#000000), White (#FFFFFF), and OneCoolie Blue (#2563EB)
   ============================================================ */

const LUGGAGE_PRICING = {
  small: { label: 'Small Bag / Backpack', price: 30, desc: 'Laptop bag, small duffle, or backpack under 10 kg' },
  medium: { label: 'Medium Trolley / Suitcase', price: 40, desc: 'Standard cabin trolley or medium travel suitcase' },
  large: { label: 'Large Trunk / Heavy Luggage', price: 60, desc: 'Large 28"+ luggage, heavy cargo, or traditional trunk' },
};

const ADDON_SERVICES = [
  {
    key: 'escort',
    label: 'Seat & Coach Escort',
    price: 60,
    desc: 'Personal guide navigating platform foot-bridges directly to your coach door.',
    icon: '🚶',
  },
  {
    key: 'wheelchair',
    label: 'Wheelchair & Priority Transit',
    price: 80,
    desc: 'Station wheelchair and dedicated attendant for seniors & mobility assistance.',
    icon: '♿',
  },
  {
    key: 'language',
    label: 'Multilingual Guide',
    price: 30,
    desc: 'Local communication assistance in Telugu, Hindi, or English on the concourse.',
    icon: '🗣️',
  },
  {
    key: 'snacks',
    label: 'Berth Refreshments',
    price: 50,
    desc: 'Station packaged mineral water and certified snacks delivered to your seat.',
    icon: '🥪',
  },
  {
    key: 'transport',
    label: 'Exit Gate & Cab Transfer',
    price: 40,
    desc: 'Baggage transfer and guided navigation to pre-booked app cabs and autos.',
    icon: '🚕',
  },
];

const COACH_PRESETS = ['S1', 'S2', 'S3', 'B1', 'B2', 'B3', 'A1', 'H1', 'M1', 'GS'];
const ACTIVE_STATUSES = ['pending', 'accepted', 'arriving', 'in_service'];

export default function PassengerDashboard() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [tab, setTab] = useState('book'); // 'book' | 'trips'
  const [wizardStep, setWizardStep] = useState(1); // 1: Journey, 2: Coach & Bags, 3: Services, 4: Review & Pay
  const [bookingMode, setBookingMode] = useState('pnr'); // 'pnr' | 'train'

  // Step 1: PNR and Train states
  const [pnrInput, setPnrInput] = useState('');
  const [pnrLoading, setPnrLoading] = useState(false);
  const [pnrError, setPnrError] = useState('');
  const [selectedTrain, setSelectedTrain] = useState(null);
  const [journeyDate, setJourneyDate] = useState('');
  const [journeyTime, setJourneyTime] = useState('');
  const [station, setStation] = useState('KZJ');

  // Step 2: Coach, Berth, Mission & Granular Luggage
  const [coach, setCoach] = useState('');
  const [seatNumber, setSeatNumber] = useState('');
  const [berthType, setBerthType] = useState('Lower');
  const [actionType, setActionType] = useState('load_to_seat'); // 'load_to_seat' | 'collect_from_seat'
  const [luggageCounts, setLuggageCounts] = useState({
    small: 1,
    medium: 1,
    large: 0,
  });

  // Step 3: Add-on Services
  const [addons, setAddons] = useState({
    escort: true,
    wheelchair: false,
    language: false,
    snacks: false,
    transport: false,
  });

  // Modal & Async states
  const [payOpen, setPayOpen] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [confirmCancel, setConfirmCancel] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Edit Coach / Berth Modal
  const [editModalBooking, setEditModalBooking] = useState(null);
  const [editCoach, setEditCoach] = useState('');
  const [editSeat, setEditSeat] = useState('');
  const [editBerth, setEditBerth] = useState('Lower');
  const [editAction, setEditAction] = useState('load_to_seat');
  const [editSaving, setEditSaving] = useState(false);

  // Audio confirmation synthesis
  const playSuccessChime = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Primary chime tone
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now); // D5
      gain1.gain.setValueAtTime(0.15, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Higher resolve tone
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.12); // A5
      gain2.gain.setValueAtTime(0.18, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.55);
    } catch {
      // Ignore audio synthesis restriction
    }
  }, []);

  // Compute item counts & total payable
  const totalLuggageCount = luggageCounts.small + luggageCounts.medium + luggageCounts.large;
  const luggagePrice =
    luggageCounts.small * LUGGAGE_PRICING.small.price +
    luggageCounts.medium * LUGGAGE_PRICING.medium.price +
    luggageCounts.large * LUGGAGE_PRICING.large.price;

  const addonsPrice = ADDON_SERVICES.reduce(
    (sum, s) => (addons[s.key] ? sum + s.price : sum),
    0
  );

  const calculateTotal = () => luggagePrice + addonsPrice;

  // Fetch Passenger's Bookings
  const fetchBookings = useCallback(async () => {
    try {
      const { data } = await axios.get('/bookings/my-bookings');
      setBookings(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingBookings(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
    const interval = setInterval(fetchBookings, 8000);
    return () => clearInterval(interval);
  }, [fetchBookings, tab]);

  const active = bookings.filter((b) => ACTIVE_STATUSES.includes(b.booking_status));
  const history = bookings.filter((b) => !ACTIVE_STATUSES.includes(b.booking_status));

  // Auto-fill from Live Station Board Query Params
  useEffect(() => {
    const trainNo = searchParams.get('train_no');
    const trainName = searchParams.get('train_name');
    const stCode = searchParams.get('station');
    const expTime = searchParams.get('time');

    if (trainNo && trainName) {
      setSelectedTrain({
        train_no: trainNo,
        train_name: trainName,
        from: { name: stCode || 'Origin' },
        to: { name: 'Destination' },
        stops: [{ code: stCode || 'KZJ' }],
        expected_arrival: expTime,
        scheduled_arrival: expTime,
      });
      if (stCode) setStation(stCode);
      if (!journeyDate) setJourneyDate(new Date().toISOString().split('T')[0]);
      if (expTime) setJourneyTime(expTime);
      setBookingMode('train');
      setTab('book');
      setWizardStep(1);
    }
  }, [searchParams]);

  // PNR Status Lookup
  const handleFetchPnr = async (e) => {
    e?.preventDefault();
    const pnr = pnrInput.trim();
    if (!/^\d{10}$/.test(pnr)) {
      setPnrError('Please enter a valid 10-digit Indian Railway PNR number.');
      return;
    }

    setPnrLoading(true);
    setPnrError('');

    try {
      const res = await axios.get('/trains/pnr-status', {
        params: { pnrNumber: pnr },
      });

      if (res.data?.success && res.data?.data && res.data.data.trainNumber) {
        const d = res.data.data;
        setSelectedTrain({
          train_no: d.trainNumber,
          train_name: d.trainName,
          from: { name: d.boardingStationName || d.boardingStation },
          to: { name: d.destinationStationName || d.destinationStation },
          stops: [{ code: d.boardingStation, name: STATIONS.find((s) => s.code === d.boardingStation)?.name || d.boardingStation }],
        });

        if (d.boardingStation && STATIONS.some((s) => s.code === d.boardingStation)) {
          setStation(d.boardingStation);
        }

        if (d.journeyDate) {
          try {
            const parsed = new Date(d.journeyDate);
            if (!isNaN(parsed.getTime())) {
              setJourneyDate(parsed.toISOString().split('T')[0]);
            } else {
              setJourneyDate(d.journeyDate);
            }
          } catch {
            setJourneyDate(d.journeyDate);
          }
        } else {
          setJourneyDate(new Date().toISOString().split('T')[0]);
        }

        if (d.journeyTime) setJourneyTime(d.journeyTime);
        if (d.coach && d.coach !== 'TBD') setCoach(d.coach);
        if (d.berthNumber && d.berthNumber !== 'TBD') setSeatNumber(d.berthNumber);
        if (d.berthType) setBerthType(d.berthType);

        toast.success(`Live PNR verified: Train ${d.trainNumber} · Coach ${d.coach || 'TBD'} · Berth ${d.berthNumber || 'TBD'}`);
      } else {
        setPnrError('Unable to fetch live PNR details from Indian Railways PRS. Please verify the PNR number.');
      }
    } catch (err) {
      const msg = err?.response?.data?.message || 'Unable to fetch PNR from Indian Railways. Please verify your 10-digit PNR.';
      setPnrError(msg);
    } finally {
      setPnrLoading(false);
    }
  };

  // Step Validation & Navigation
  const validateStep = (step) => {
    if (step === 1) {
      if (!selectedTrain) {
        toast.error('Please select or verify your train.');
        return false;
      }
      if (!journeyDate) {
        toast.error('Please specify your journey date.');
        return false;
      }
      return true;
    }
    if (step === 2) {
      if (!coach.trim()) {
        toast.error('Please enter your Coach Number (e.g. S4, B2).');
        return false;
      }
      if (!seatNumber.trim()) {
        toast.error('Please enter your Seat / Berth Number (e.g. 45).');
        return false;
      }
      if (totalLuggageCount === 0 && !addons.escort && !addons.wheelchair) {
        toast.error('Please specify at least 1 luggage item or an assistance service.');
        return false;
      }
      return true;
    }
    if (step === 3) {
      if (calculateTotal() === 0) {
        toast.error('Please select at least one assistance item or luggage service.');
        return false;
      }
      return true;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(wizardStep)) {
      setWizardStep((prev) => Math.min(4, prev + 1));
      window.scrollTo({ top: 120, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    setWizardStep((prev) => Math.max(1, prev - 1));
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  // Submit Booking & Payment
  const handleConfirmReview = () => {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) return;
    setPayOpen(true);
  };

  const handlePaid = async (method) => {
    try {
      const servicesPayload = {
        luggage: totalLuggageCount,
        luggage_small: luggageCounts.small,
        luggage_medium: luggageCounts.medium,
        luggage_large: luggageCounts.large,
        escort: addons.escort,
        wheelchair: addons.wheelchair,
        language: addons.language,
        snacks: addons.snacks,
        transport: addons.transport,
        coach: coach.trim().toUpperCase(),
        seat_number: seatNumber.trim(),
        berth_type: berthType,
        action_type: actionType,
        pnr: pnrInput.trim() || undefined,
      };

      const { data } = await axios.post('/bookings', {
        train_no: selectedTrain.train_no,
        train_name: selectedTrain.train_name,
        station_code: station,
        journey_date: journeyDate,
        journey_time: journeyTime,
        services: servicesPayload,
        total_price: calculateTotal(),
        payment_method: method,
        coach: coach.trim().toUpperCase(),
        seat_number: seatNumber.trim(),
        berth_type: berthType,
        action_type: actionType,
        pnr: pnrInput.trim(),
      });

      setPayOpen(false);
      playSuccessChime();
      toast.success('Assistance booking confirmed! OTP issued.');
      navigate(`/booking/${data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking submission failed.');
    }
  };

  // Cancel Booking
  const doCancel = async () => {
    if (!confirmCancel) return;
    try {
      await axios.post(`/bookings/${confirmCancel}/cancel`);
      setConfirmCancel(null);
      toast.success('Assistance booking cancelled.');
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cancellation failed.');
    }
  };

  // Open Edit Coach Modal
  const openEditModal = (booking) => {
    setEditModalBooking(booking);
    setEditCoach(booking.coach || booking.services?.coach || '');
    setEditSeat(booking.seat_number || booking.services?.seat_number || '');
    setEditBerth(booking.berth_type || booking.services?.berth_type || 'Lower');
    setEditAction(booking.action_type || booking.services?.action_type || 'load_to_seat');
    setActiveMenuId(null);
  };

  // Save Edit Coach / Berth
  const saveCoachEdit = async (e) => {
    e.preventDefault();
    if (!editModalBooking) return;
    if (!editCoach.trim() || !editSeat.trim()) {
      return toast.error('Coach and Seat numbers cannot be empty.');
    }

    setEditSaving(true);
    try {
      await axios.put(`/bookings/${editModalBooking.id}`, {
        coach: editCoach.trim().toUpperCase(),
        seat_number: editSeat.trim(),
        berth_type: editBerth,
        action_type: editAction,
      });

      toast.success('Coach & seat details updated successfully!');
      setEditModalBooking(null);
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to update details.');
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-black dark:text-white">
      {/* ── Sticky Top Navigation ──────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-black/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Brand sub="Passenger Portal" dark={theme === 'dark'} />

            {/* Segmented Tab Switcher */}
            <div className="hidden sm:flex items-center p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl border border-zinc-200 dark:border-zinc-700">
              <button
                type="button"
                onClick={() => setTab('book')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  tab === 'book'
                    ? 'bg-white dark:bg-zinc-900 text-black dark:text-white shadow-sm'
                    : 'text-zinc-500 hover:text-black dark:hover:text-white'
                }`}
              >
                {t('book') || 'Book Assistance'}
              </button>

              <button
                type="button"
                onClick={() => setTab('trips')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                  tab === 'trips'
                    ? 'bg-white dark:bg-zinc-900 text-black dark:text-white shadow-sm'
                    : 'text-zinc-500 hover:text-black dark:hover:text-white'
                }`}
              >
                <span>{t('myTrips') || 'My Trips'}</span>
                {active.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">
                    {active.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* User Profile */}
          <div className="flex items-center gap-4">
            <ProfileMenu role="passenger" onNavigate={(t) => setTab(t)} />
          </div>
        </div>

        {/* Mobile Tab Switcher */}
        <div className="sm:hidden grid grid-cols-2 p-2 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 gap-1">
          <button
            type="button"
            onClick={() => setTab('book')}
            className={`py-2 text-[11px] font-bold text-center rounded-lg ${
              tab === 'book'
                ? 'bg-white dark:bg-zinc-800 text-black dark:text-white shadow-sm'
                : 'text-zinc-500'
            }`}
          >
            Book Assistance
          </button>
          <button
            type="button"
            onClick={() => setTab('trips')}
            className={`py-2 text-[11px] font-bold text-center rounded-lg flex items-center justify-center gap-1 ${
              tab === 'trips'
                ? 'bg-white dark:bg-zinc-800 text-black dark:text-white shadow-sm'
                : 'text-zinc-500'
            }`}
          >
            <span>My Trips</span>
            {active.length > 0 && (
              <span className="w-3.5 h-3.5 rounded-full bg-blue-600 text-white text-[9px] flex items-center justify-center font-bold">
                {active.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ── Main Container ──────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-6 py-8 sm:py-10">
        {tab === 'book' ? (
          /* ============================================================
             4-STEP WIZARD WORKFLOW
             ============================================================ */
          <div className="grid lg:grid-cols-12 gap-8 items-start animate-fade-in">
            {/* Left Configuration Column (8 Cols) */}
            <div className="lg:col-span-8 space-y-6">
              {/* Stepper Navigation Pills */}
              <nav aria-label="Booking steps" className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-2 sm:p-3 shadow-xs">
                <div className="grid grid-cols-4 gap-1 sm:gap-2">
                  {[
                    { step: 1, label: 'Journey', icon: '🚂' },
                    { step: 2, label: 'Coach & Bags', icon: '🧳' },
                    { step: 3, label: 'Services', icon: '✨' },
                    { step: 4, label: 'Review & Pay', icon: '💳' },
                  ].map((s) => {
                    const isCurrent = wizardStep === s.step;
                    const isPassed = wizardStep > s.step;
                    return (
                      <button
                        key={s.step}
                        type="button"
                        onClick={() => {
                          if (isPassed || validateStep(s.step - 1)) {
                            setWizardStep(s.step);
                          }
                        }}
                        className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 px-2 rounded-xl text-xs font-bold transition-all ${
                          isCurrent
                            ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/30'
                            : isPassed
                            ? 'bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700'
                            : 'text-zinc-400 dark:text-zinc-600 opacity-60 cursor-not-allowed'
                        }`}
                      >
                        <span className="text-xs sm:text-sm">{s.icon}</span>
                        <span className="hidden sm:inline">{s.label}</span>
                        <span className="sm:hidden">0{s.step}</span>
                        {isPassed && <span className="text-[10px] text-emerald-400">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </nav>

              {/* ── STEP 01: Journey & Train / PNR ────────────────────── */}
              {wizardStep === 1 && (
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6 animate-fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 font-mono block mb-1">
                        Step 01 of 04
                      </span>
                      <h2 className="text-xl font-bold tracking-tight">
                        Journey &amp; Train Telemetry
                      </h2>
                    </div>

                    {/* Mode Switcher: PNR vs Station & Train */}
                    <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setBookingMode('pnr')}
                        className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                          bookingMode === 'pnr'
                            ? 'bg-white dark:bg-zinc-900 text-black dark:text-white shadow-sm font-black'
                            : 'text-zinc-500 hover:text-black dark:hover:text-white'
                        }`}
                      >
                        🎫 10-Digit PNR
                      </button>
                      <button
                        type="button"
                        onClick={() => setBookingMode('train')}
                        className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                          bookingMode === 'train'
                            ? 'bg-white dark:bg-zinc-900 text-black dark:text-white shadow-sm font-black'
                            : 'text-zinc-500 hover:text-black dark:hover:text-white'
                        }`}
                      >
                        🚂 Station &amp; Train
                      </button>
                    </div>
                  </div>

                  {/* 10-Digit PNR Lookup */}
                  {bookingMode === 'pnr' && (
                    <div className="space-y-4 animate-fade-in">
                      <p className="text-xs text-zinc-500 leading-relaxed">
                        Enter your 10-digit Indian Railways PNR to automatically fetch train, station, coach, and seat details directly from railway telemetry.
                      </p>

                      <form onSubmit={handleFetchPnr} className="flex flex-col sm:flex-row gap-2.5">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            maxLength={10}
                            placeholder="Enter 10-Digit PNR Number (e.g. 4523891024)"
                            value={pnrInput}
                            onChange={(e) => {
                              setPnrInput(e.target.value.replace(/\D/g, '').slice(0, 10));
                              setPnrError('');
                            }}
                            className="input-base text-sm font-mono tracking-wider font-bold"
                          />
                          {pnrInput && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-400">
                              {pnrInput.length}/10
                            </span>
                          )}
                        </div>
                        <button
                          type="submit"
                          disabled={pnrLoading || pnrInput.length !== 10}
                          className="btn-primary py-2.5 px-5 text-xs font-bold shrink-0"
                        >
                          {pnrLoading ? 'Verifying PNR...' : 'Fetch Details →'}
                        </button>
                      </form>

                      {pnrError && (
                        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl text-xs text-amber-800 dark:text-amber-300">
                          {pnrError}
                        </div>
                      )}

                      {selectedTrain && (
                        <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">
                                Train {selectedTrain.train_no}
                              </span>
                              <span className="font-bold text-sm text-black dark:text-white">
                                · {selectedTrain.train_name}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-500 font-mono">
                              Boarding Hub: {station} {journeyDate ? `· Date: ${journeyDate}` : ''}
                            </p>
                          </div>
                          <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold rounded-full border border-emerald-300 dark:border-emerald-800 self-start sm:self-auto">
                            ✓ Train Verified
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Manual / Live Station Search */}
                  {bookingMode === 'train' && (
                    <div className="space-y-6 animate-fade-in">
                      {/* Station Pills */}
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
                          Station Hub
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {STATIONS.map((st) => (
                            <button
                              key={st.code}
                              type="button"
                              onClick={() => setStation(st.code)}
                              className={`p-3 rounded-xl border text-left transition-all ${
                                station === st.code
                                  ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/40'
                                  : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                              }`}
                            >
                              <p className="font-bold text-xs font-mono text-blue-600 dark:text-blue-400">
                                {st.code}
                              </p>
                              <p className="font-semibold text-xs text-black dark:text-white truncate">
                                {st.name}
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Train Search Component */}
                      <div>
                        <TrainSearch
                          station={station}
                          onSelect={(train) => {
                            setSelectedTrain(train);
                            const time =
                              train.expected_arrival ||
                              train.scheduled_arrival ||
                              train.expected_departure ||
                              train.scheduled_departure;
                            if (time) setJourneyTime(time);
                            if (!journeyDate) {
                              setJourneyDate(new Date().toISOString().split('T')[0]);
                            }
                          }}
                        />

                        {selectedTrain && (
                          <div className="mt-3 p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-fade-in">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-black dark:text-white font-mono text-sm">
                                  {selectedTrain.train_no}
                                </span>
                                <span className="font-black text-sm text-black dark:text-white">
                                  · {selectedTrain.train_name}
                                </span>
                                {selectedTrain.status && (
                                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                    {selectedTrain.status}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-zinc-500 font-mono">
                                <span>
                                  {selectedTrain.from?.name} &rarr; {selectedTrain.to?.name}
                                </span>
                                {selectedTrain.platform && selectedTrain.platform !== 'TBD' && (
                                  <>
                                    <span>•</span>
                                    <span className="font-bold text-blue-600 dark:text-blue-400">
                                      Platform {selectedTrain.platform}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            {(selectedTrain.expected_arrival || selectedTrain.scheduled_arrival) && (
                              <div className="text-left sm:text-right font-mono">
                                <span className="text-[10px] uppercase tracking-wider text-zinc-400 block">
                                  Live Expected Time
                                </span>
                                <span className="font-bold text-sm text-blue-600 dark:text-blue-400">
                                  {selectedTrain.expected_arrival || selectedTrain.scheduled_arrival}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Journey Date & Time */}
                  <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
                        Journey Date <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={journeyDate}
                        onChange={(e) => setJourneyDate(e.target.value)}
                        className="input-base text-sm font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
                        Estimated Arrival / Boarding Time
                      </label>
                      <input
                        type="time"
                        value={journeyTime}
                        onChange={(e) => setJourneyTime(e.target.value)}
                        className="input-base text-sm font-semibold"
                      />
                    </div>
                  </div>

                  {/* Wizard Step 1 Action */}
                  <div className="pt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={handleNext}
                      className="btn-primary py-3 px-6 text-xs font-bold"
                    >
                      Next: Coach &amp; Bags &rarr;
                    </button>
                  </div>
                </div>
              )}

              {/* ── STEP 02: Coach, Berth & Luggage Breakdown ──────────── */}
              {wizardStep === 2 && (
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6 animate-fade-in">
                  <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 font-mono block mb-1">
                        Step 02 of 04
                      </span>
                      <h2 className="text-xl font-bold tracking-tight">
                        Coach, Seat &amp; Luggage Breakdown
                      </h2>
                    </div>
                    <span className="badge-blue">Seat Direct Dispatch</span>
                  </div>

                  {/* Mission Direction */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2.5">
                      Select Luggage Mission
                    </label>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setActionType('load_to_seat')}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          actionType === 'load_to_seat'
                            ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 ring-1 ring-blue-500'
                            : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-base">🚶</span>
                          <p className="font-bold text-xs text-black dark:text-white">
                            Boarding: Load to Seat
                          </p>
                        </div>
                        <p className="text-[11px] text-zinc-500 leading-normal">
                          Assistant meets you at entrance / concourse and loads luggage directly into your coach &amp; berth.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActionType('collect_from_seat')}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          actionType === 'collect_from_seat'
                            ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 ring-1 ring-blue-500'
                            : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-base">🚪</span>
                          <p className="font-bold text-xs text-black dark:text-white">
                            De-boarding: Collect from Seat
                          </p>
                        </div>
                        <p className="text-[11px] text-zinc-500 leading-normal">
                          Assistant meets train at your coach door, boards to collect luggage from your seat, and escorts you out.
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Coach, Seat & Berth Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
                        Coach Number <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. B2, S4, A1, D3"
                        value={coach}
                        onChange={(e) => setCoach(e.target.value.toUpperCase())}
                        className="input-base text-sm font-mono font-bold"
                      />
                      {/* Coach presets */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {COACH_PRESETS.map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setCoach(p)}
                            className="px-2 py-0.5 text-[10px] font-mono rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
                        Seat / Berth No. <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 45, 21, 64"
                        value={seatNumber}
                        onChange={(e) => setSeatNumber(e.target.value)}
                        className="input-base text-sm font-mono font-bold"
                      />
                      <p className="text-[10px] text-zinc-400 mt-1">Berth numbers 1 to 108</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
                        Berth Position
                      </label>
                      <select
                        value={berthType}
                        onChange={(e) => setBerthType(e.target.value)}
                        className="input-base text-sm font-semibold"
                      >
                        <option value="Lower">Lower Berth (LB)</option>
                        <option value="Middle">Middle Berth (MB)</option>
                        <option value="Upper">Upper Berth (UB)</option>
                        <option value="Side Lower">Side Lower (SL)</option>
                        <option value="Side Upper">Side Upper (SU)</option>
                        <option value="Window">Window Seat (CC)</option>
                        <option value="Aisle">Aisle Seat (CC)</option>
                        <option value="Cabin">First AC Cabin</option>
                      </select>
                    </div>
                  </div>

                  {/* Granular Luggage Pricing Section */}
                  <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500">
                          Luggage Breakdown
                        </label>
                        <p className="text-[11px] text-zinc-400">
                          Transparent tiered porter pricing per piece
                        </p>
                      </div>
                      <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                        {totalLuggageCount} Pieces (₹{luggagePrice})
                      </span>
                    </div>

                    <div className="grid gap-3">
                      {Object.entries(LUGGAGE_PRICING).map(([key, item]) => (
                        <div
                          key={key}
                          className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-black dark:text-white">
                                {item.label}
                              </span>
                              <span className="text-[11px] font-mono text-zinc-500">
                                ₹{item.price} / item
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-400">{item.desc}</p>
                          </div>

                          <div className="flex items-center gap-2.5">
                            <button
                              type="button"
                              onClick={() =>
                                setLuggageCounts((prev) => ({
                                  ...prev,
                                  [key]: Math.max(0, prev[key] - 1),
                                }))
                              }
                              className="w-7 h-7 rounded-lg border border-zinc-200 dark:border-zinc-700 flex items-center justify-center font-bold text-xs hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                            >
                              -
                            </button>
                            <span className="font-mono font-bold text-sm w-4 text-center">
                              {luggageCounts[key]}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setLuggageCounts((prev) => ({
                                  ...prev,
                                  [key]: prev[key] + 1,
                                }))
                              }
                              className="w-7 h-7 rounded-lg border border-zinc-200 dark:border-zinc-700 flex items-center justify-center font-bold text-xs hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Wizard Step 2 Actions */}
                  <div className="pt-4 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handleBack}
                      className="btn-secondary py-3 px-5 text-xs font-bold"
                    >
                      &larr; Back: Journey
                    </button>
                    <button
                      type="button"
                      onClick={handleNext}
                      className="btn-primary py-3 px-6 text-xs font-bold"
                    >
                      Next: Additional Services &rarr;
                    </button>
                  </div>
                </div>
              )}

              {/* ── STEP 03: Add-on Services ──────────────────────────── */}
              {wizardStep === 3 && (
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6 animate-fade-in">
                  <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 font-mono block mb-1">
                        Step 03 of 04
                      </span>
                      <h2 className="text-xl font-bold tracking-tight">
                        Additional Assistance Services
                      </h2>
                    </div>
                    <span className="text-xs font-mono text-zinc-400">
                      {Object.values(addons).filter(Boolean).length} Selected
                    </span>
                  </div>

                  <p className="text-xs text-zinc-500">
                    Enhance your station transit with verified escort, wheelchair, and concierge services.
                  </p>

                  <div className="grid sm:grid-cols-2 gap-4">
                    {ADDON_SERVICES.map((s) => {
                      const isSelected = Boolean(addons[s.key]);
                      return (
                        <div
                          key={s.key}
                          className={`p-5 rounded-xl border transition-all ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50/20 dark:bg-blue-950/20 shadow-sm'
                              : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-base">{s.icon}</span>
                              <h3 className="font-bold text-sm text-black dark:text-white">
                                {s.label}
                              </h3>
                            </div>
                            <span className="font-mono text-xs font-bold text-black dark:text-white">
                              ₹{s.price}
                            </span>
                          </div>

                          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mb-4">
                            {s.desc}
                          </p>

                          <button
                            type="button"
                            onClick={() =>
                              setAddons((prev) => ({
                                ...prev,
                                [s.key]: !prev[s.key],
                              }))
                            }
                            className={`w-full py-2 rounded-lg text-xs font-bold transition-all ${
                              isSelected
                                ? 'bg-blue-600 text-white'
                                : 'border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                            }`}
                          >
                            {isSelected ? '✓ Added to Booking' : '+ Add Service'}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Wizard Step 3 Actions */}
                  <div className="pt-4 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handleBack}
                      className="btn-secondary py-3 px-5 text-xs font-bold"
                    >
                      &larr; Back: Coach &amp; Bags
                    </button>
                    <button
                      type="button"
                      onClick={handleNext}
                      className="btn-primary py-3 px-6 text-xs font-bold"
                    >
                      Next: Review &amp; Pay &rarr;
                    </button>
                  </div>
                </div>
              )}

              {/* ── STEP 04: Review & Confirm ─────────────────────────── */}
              {wizardStep === 4 && (
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6 animate-fade-in">
                  <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 font-mono block mb-1">
                        Step 04 of 04
                      </span>
                      <h2 className="text-xl font-bold tracking-tight">
                        Review &amp; Final Checkout
                      </h2>
                    </div>
                    <span className="badge-blue">Final Verification</span>
                  </div>

                  {/* Detailed Trip Credentials Box */}
                  <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">
                            {selectedTrain?.train_no}
                          </span>
                          <span className="font-bold text-sm text-black dark:text-white">
                            {selectedTrain?.train_name}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 font-mono mt-0.5">
                          Hub Station: {station} · Date: {journeyDate} {journeyTime ? `· Time: ${journeyTime}` : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setWizardStep(1)}
                        className="text-xs font-semibold text-blue-600 hover:underline"
                      >
                        Edit
                      </button>
                    </div>

                    <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                          Coach {coach} · Seat {seatNumber} ({berthType})
                        </span>
                        <span className="font-semibold text-zinc-600 dark:text-zinc-400">
                          {actionType === 'collect_from_seat' ? '🚪 De-boarding Unload' : '🚶 Boarding Load'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setWizardStep(2)}
                        className="text-xs font-semibold text-blue-600 hover:underline"
                      >
                        Edit
                      </button>
                    </div>
                  </div>

                  {/* Line Item Receipts */}
                  <div className="space-y-2.5">
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono">
                      Itemized Cost Breakdown
                    </p>

                    {/* Luggage items */}
                    {Object.entries(luggageCounts).map(([k, count]) => {
                      if (count <= 0) return null;
                      const item = LUGGAGE_PRICING[k];
                      return (
                        <div key={k} className="flex justify-between items-center text-xs py-1.5 border-b border-zinc-100 dark:border-zinc-800">
                          <span className="text-zinc-600 dark:text-zinc-400">
                            {item.label} &times; {count}
                          </span>
                          <span className="font-mono font-semibold text-black dark:text-white">
                            ₹{item.price * count}
                          </span>
                        </div>
                      );
                    })}

                    {/* Add-ons */}
                    {ADDON_SERVICES.map((s) => {
                      if (!addons[s.key]) return null;
                      return (
                        <div key={s.key} className="flex justify-between items-center text-xs py-1.5 border-b border-zinc-100 dark:border-zinc-800">
                          <span className="text-zinc-600 dark:text-zinc-400">
                            {s.icon} {s.label}
                          </span>
                          <span className="font-mono font-semibold text-black dark:text-white">
                            ₹{s.price}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Total payable callout */}
                  <div className="p-4 rounded-xl border border-blue-600/30 bg-blue-50/20 dark:bg-blue-950/20 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 block">
                        Total Settlement
                      </span>
                      <p className="text-[11px] text-zinc-400">
                        Includes GST &amp; verified assistant allocation
                      </p>
                    </div>
                    <span className="text-2xl font-bold font-mono text-black dark:text-white">
                      ₹{calculateTotal()}
                    </span>
                  </div>

                  {/* Wizard Step 4 Actions */}
                  <div className="pt-4 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handleBack}
                      className="btn-secondary py-3 px-5 text-xs font-bold"
                    >
                      &larr; Back: Services
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmReview}
                      className="btn-primary py-3 px-8 text-sm font-bold shadow-lg shadow-blue-600/20"
                    >
                      Pay &amp; Confirm Booking &rarr;
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Summary Sidebar (4 Cols) */}
            <aside className="lg:col-span-4 sticky top-24 space-y-6">
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
                <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 font-mono block mb-2">
                  Live Dispatch Ledger
                </span>
                <h3 className="text-xl font-bold tracking-tight mb-6">
                  Booking Overview
                </h3>

                {/* Train Info */}
                <div className="space-y-3 pb-6 border-b border-zinc-100 dark:border-zinc-800 text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Hub Station</span>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                      {station}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Train</span>
                    <span className="font-bold text-black dark:text-white truncate max-w-[180px]">
                      {selectedTrain ? `${selectedTrain.train_no} · ${selectedTrain.train_name}` : 'Not selected'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Coach &amp; Berth</span>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                      {coach ? `Coach ${coach}` : 'TBD'} · {seatNumber ? `Seat ${seatNumber}` : 'TBD'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Mission</span>
                    <span className="font-semibold text-black dark:text-white">
                      {actionType === 'collect_from_seat' ? 'De-boarding Unload' : 'Boarding Load'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Date</span>
                    <span className="font-mono text-black dark:text-white">
                      {journeyDate || 'Not selected'}
                    </span>
                  </div>
                </div>

                {/* Luggage and Services Summary */}
                <div className="py-6 border-b border-zinc-100 dark:border-zinc-800 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Total Luggage ({totalLuggageCount} pcs)</span>
                    <span className="font-mono font-semibold text-black dark:text-white">₹{luggagePrice}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Add-on Assistance</span>
                    <span className="font-mono font-semibold text-black dark:text-white">₹{addonsPrice}</span>
                  </div>
                </div>

                {/* Total */}
                <div className="pt-6 mb-6">
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                      Total Payable
                    </span>
                    <span className="text-3xl font-bold font-mono text-black dark:text-white">
                      ₹{calculateTotal()}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Includes GST and verified assistant allocation fee
                  </p>
                </div>

                {/* Quick Advance Button */}
                {wizardStep < 4 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="btn-primary w-full py-3.5 text-xs font-bold"
                  >
                    Continue to Step 0{wizardStep + 1} &rarr;
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleConfirmReview}
                    className="btn-primary w-full py-3.5 text-xs font-bold shadow-md shadow-blue-600/30"
                  >
                    Proceed to Payment &rarr;
                  </button>
                )}
              </div>

              {/* Safety Guarantee */}
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-start gap-3">
                <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1.5" />
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Your 6-digit start OTP is issued immediately upon confirmation. Share it only with your verified assistant when they arrive on the platform.
                </p>
              </div>
            </aside>
          </div>
        ) : tab === 'trips' ? (
          /* ============================================================
             MY TRIPS TAB
             ============================================================ */
          <div className="space-y-8 animate-fade-in">
            <div>
              <h2 className="text-2xl font-bold tracking-tight mb-1">
                Your Assistance Bookings
              </h2>
              <p className="text-xs text-zinc-500">
                Track active station dispatches and view historical trip receipts
              </p>
            </div>

            {loadingBookings ? (
              <div className="p-12">
                <TrainLoader label="Loading Your Journeys..." sub="Syncing active station dispatches" />
              </div>
            ) : bookings.length === 0 ? (
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center max-w-md mx-auto">
                <p className="font-bold text-base mb-1">No bookings found</p>
                <p className="text-xs text-zinc-500 mb-6">
                  You haven't requested station assistance yet.
                </p>
                <button
                  type="button"
                  onClick={() => setTab('book')}
                  className="btn-primary py-2.5 px-6 text-xs"
                >
                  Book Assistance Now &rarr;
                </button>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Active Bookings */}
                {active.length > 0 && (
                  <div>
                    <span className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 font-mono block mb-4">
                      Active Trips ({active.length})
                    </span>
                    <div className="grid md:grid-cols-2 gap-4">
                      {active.map((b) => (
                        <div
                          key={b.id}
                          className="bg-white dark:bg-zinc-900 border border-blue-600/30 rounded-2xl p-6 shadow-md relative overflow-visible"
                        >
                          <div className="flex items-start justify-between gap-4 mb-4">
                            <div>
                              <span className="badge-blue mb-2">
                                Status: {b.booking_status?.toUpperCase()}
                              </span>
                              <h3 className="text-base font-bold text-black dark:text-white">
                                Train {b.train_no} · {b.train_name}
                              </h3>
                              <p className="text-xs font-mono text-zinc-500 mt-0.5">
                                Station {b.station_code} · {b.journey_date}
                              </p>

                              {(b.coach || b.seat_number || b.services?.coach || b.services?.seat_number) && (
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                                    Coach {b.coach || b.services?.coach} · Seat {b.seat_number || b.services?.seat_number}
                                  </span>
                                  <span className="text-[10px] font-semibold text-zinc-500">
                                    {(b.action_type === 'collect_from_seat' || b.services?.action_type === 'collect_from_seat')
                                      ? '🚪 De-boarding Unload'
                                      : '🚶 Boarding Load'}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Price & 3-Dots Action Menu */}
                            <div className="flex flex-col items-end gap-2 relative">
                              <span className="text-xl font-bold font-mono text-black dark:text-white">
                                ₹{b.total_price}
                              </span>

                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => setActiveMenuId(activeMenuId === b.id ? null : b.id)}
                                  className="w-7 h-7 rounded-lg border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                  title="Options"
                                >
                                  •••
                                </button>

                                {activeMenuId === b.id && (
                                  <div className="absolute right-0 top-8 z-50 w-44 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl py-1 text-xs animate-scale-in">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveMenuId(null);
                                        navigate(`/live/${b.id}`);
                                      }}
                                      className="w-full text-left px-3.5 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-semibold"
                                    >
                                      📡 Live Tracking
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => openEditModal(b)}
                                      className="w-full text-left px-3.5 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-semibold"
                                    >
                                      ✏️ Edit Coach / Seat
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveMenuId(null);
                                        setConfirmCancel(b.id);
                                      }}
                                      className="w-full text-left px-3.5 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-semibold"
                                    >
                                      ✕ Cancel Booking
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-3">
                            <button
                              type="button"
                              onClick={() => openEditModal(b)}
                              className="text-xs font-semibold text-zinc-500 hover:text-black dark:hover:text-white underline decoration-zinc-300"
                            >
                              Edit Coach / Seat
                            </button>

                            <button
                              type="button"
                              onClick={() => navigate(`/live/${b.id}`)}
                              className="btn-primary py-2 px-4 text-xs font-bold"
                            >
                              Live Tracking &rarr;
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Trip History */}
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-zinc-400 font-mono block mb-4">
                    Trip History ({history.length})
                  </span>

                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl divide-y divide-zinc-100 dark:divide-zinc-800 overflow-hidden">
                    {history.map((b) => (
                      <div
                        key={b.id}
                        className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-sm text-black dark:text-white">
                              Train {b.train_no} · {b.train_name}
                            </span>
                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                b.booking_status === 'completed'
                                  ? 'bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white'
                                  : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-400'
                              }`}
                            >
                              {b.booking_status}
                            </span>
                          </div>
                          <p className="text-xs font-mono text-zinc-400">
                            Station {b.station_code} · {b.journey_date} · ID: #{b.id?.slice(-8).toUpperCase()}
                          </p>

                          {(b.coach || b.seat_number || b.services?.coach || b.services?.seat_number) && (
                            <div className="mt-1.5 flex flex-wrap items-center gap-2">
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                                Coach {b.coach || b.services?.coach} · Seat {b.seat_number || b.services?.seat_number}
                              </span>
                              <span className="text-[10px] font-medium text-zinc-500">
                                {(b.action_type === 'collect_from_seat' || b.services?.action_type === 'collect_from_seat')
                                  ? 'De-boarding Unload'
                                  : 'Boarding Load'}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-4">
                          <span className="font-mono font-bold text-sm text-black dark:text-white">
                            ₹{b.total_price}
                          </span>
                          <button
                            type="button"
                            onClick={() => navigate(`/live/${b.id}`)}
                            className="btn-secondary py-1.5 px-3 text-xs font-semibold"
                          >
                            Details &rarr;
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </main>

      {/* ── Edit Coach & Seat Modal ─────────────────────────────── */}
      {editModalBooking && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setEditModalBooking(null)}
        >
          <div
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-scale-in text-black dark:text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <h3 className="text-base font-bold">Edit Coach &amp; Seat Info</h3>
                <p className="text-xs text-zinc-500 font-mono">
                  Booking #{editModalBooking.id?.slice(-8).toUpperCase()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditModalBooking(null)}
                className="text-zinc-400 hover:text-black dark:hover:text-white text-base"
              >
                &times;
              </button>
            </div>

            <form onSubmit={saveCoachEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                  Coach Number
                </label>
                <input
                  type="text"
                  value={editCoach}
                  onChange={(e) => setEditCoach(e.target.value.toUpperCase())}
                  placeholder="e.g. S4, B2, A1"
                  className="input-base text-sm font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                  Seat / Berth Number
                </label>
                <input
                  type="text"
                  value={editSeat}
                  onChange={(e) => setEditSeat(e.target.value)}
                  placeholder="e.g. 45"
                  className="input-base text-sm font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                  Berth Position
                </label>
                <select
                  value={editBerth}
                  onChange={(e) => setEditBerth(e.target.value)}
                  className="input-base text-sm font-semibold"
                >
                  <option value="Lower">Lower Berth (LB)</option>
                  <option value="Middle">Middle Berth (MB)</option>
                  <option value="Upper">Upper Berth (UB)</option>
                  <option value="Side Lower">Side Lower (SL)</option>
                  <option value="Side Upper">Side Upper (SU)</option>
                  <option value="Window">Window Seat (CC)</option>
                  <option value="Aisle">Aisle Seat (CC)</option>
                  <option value="Cabin">First AC Cabin</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                  Luggage Mission
                </label>
                <select
                  value={editAction}
                  onChange={(e) => setEditAction(e.target.value)}
                  className="input-base text-sm font-semibold"
                >
                  <option value="load_to_seat">🚶 Boarding: Load to Seat</option>
                  <option value="collect_from_seat">🚪 De-boarding: Collect from Seat</option>
                </select>
              </div>

              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditModalBooking(null)}
                  className="btn-secondary py-2 px-4 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="btn-primary py-2 px-5 text-xs font-bold"
                >
                  {editSaving ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Payment Modal ────────────────────────────────────────── */}
      <PaymentModal
        open={payOpen}
        total={calculateTotal()}
        onClose={() => setPayOpen(false)}
        onPaid={handlePaid}
      />

      {/* ── Cancel Confirmation Dialog ──────────────────────────── */}
      <ConfirmDialog
        open={Boolean(confirmCancel)}
        title="Cancel Assistance Booking"
        message="Are you sure you want to cancel this station assistance request? Your allocated assistant will be released back to the platform pool."
        confirmText="Yes, Cancel Booking"
        cancelText="Keep Booking"
        onConfirm={doCancel}
        onCancel={() => setConfirmCancel(null)}
      />
    </div>
  );
}