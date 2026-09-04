import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import TrainSearch from '../components/TrainSearch';
import PaymentModal from '../components/PaymentModal';
import ProfileMenu from '../context/ProfileMenu';
import ConfirmDialog from '../components/ConfirmDialog';
import { BookingSkeleton } from '../components/Skeleton';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import axios from '../api/axios';
import { STATIONS } from '../utils/services';
import Brand from '../components/Brand';

/* ============================================================
   PASSENGER DASHBOARD — Swiss Minimal Product
   Strictly Black (#000000), White (#FFFFFF), and OneCoolie Blue (#2563EB)
   ============================================================ */

const SERVICE_META = [
  {
    key: 'luggage',
    label: 'Luggage Assistance',
    price: 30,
    per: 'item',
    qty: true,
    desc: 'Dedicated porter handling from station gate directly to your berth.',
  },
  {
    key: 'escort',
    label: 'Seat & Coach Escort',
    price: 60,
    per: 'trip',
    desc: 'Personal guide navigating platform foot-bridges to your exact coach.',
  },
  {
    key: 'wheelchair',
    label: 'Wheelchair & Priority',
    price: 80,
    per: 'trip',
    desc: 'Wheelchair transit and dedicated escort for seniors & mobility needs.',
  },
  {
    key: 'language',
    label: 'Multilingual Guide',
    price: 30,
    per: 'trip',
    desc: 'Local communication assistance in Telugu, Hindi, or English.',
  },
  {
    key: 'snacks',
    label: 'Berth Refreshments',
    price: 50,
    per: 'trip',
    desc: 'Station water and packed snacks delivered right to your seat.',
  },
  {
    key: 'transport',
    label: 'Exit Gate & Cab Transfer',
    price: 40,
    per: 'trip',
    desc: 'Baggage escorting and navigation to pre-booked app cabs and autos.',
  },
];

const ACTIVE_STATUSES = ['pending', 'accepted', 'arriving', 'in_service'];

export default function PassengerDashboard() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [tab, setTab] = useState('book'); // 'book' | 'trips'
  const [bookingMode, setBookingMode] = useState('pnr'); // 'pnr' | 'train'

  // PNR lookup state
  const [pnrInput, setPnrInput] = useState('');
  const [pnrLoading, setPnrLoading] = useState(false);
  const [pnrError, setPnrError] = useState('');

  // Train & station details
  const [selectedTrain, setSelectedTrain] = useState(null);
  const [journeyDate, setJourneyDate] = useState('');
  const [journeyTime, setJourneyTime] = useState('');
  const [station, setStation] = useState('KZJ');

  // Coach, seat, and mission type
  const [coach, setCoach] = useState('');
  const [seatNumber, setSeatNumber] = useState('');
  const [berthType, setBerthType] = useState('Lower');
  const [actionType, setActionType] = useState('load_to_seat'); // 'load_to_seat' | 'collect_from_seat'

  const [services, setServices] = useState({
    luggage: 1,
    escort: true,
    language: false,
    wheelchair: false,
    snacks: false,
    transport: false,
  });
  const [payOpen, setPayOpen] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmCancel, setConfirmCancel] = useState(null);

  const calculateTotal = () =>
    SERVICE_META.reduce(
      (sum, s) =>
        s.qty
          ? sum + (services[s.key] || 0) * s.price
          : sum + (services[s.key] ? s.price : 0),
      0
    );

  const fetchBookings = useCallback(async () => {
    try {
      const { data } = await axios.get('/bookings/my-bookings');
      setBookings(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
    const interval = setInterval(fetchBookings, 8000);
    return () => clearInterval(interval);
  }, [fetchBookings, tab]);

  const active = bookings.filter((b) =>
    ACTIVE_STATUSES.includes(b.booking_status)
  );
  const history = bookings.filter(
    (b) => !ACTIVE_STATUSES.includes(b.booking_status)
  );

  // Auto-fill from URL query params (e.g. from Live Station Board "Book Porter" button)
  useEffect(() => {
    const tNo = searchParams.get('trainNo');
    const tName = searchParams.get('trainName');
    const stCode = searchParams.get('station');
    if (tNo) {
      setSelectedTrain({
        train_no: tNo,
        train_name: tName || 'Express',
        stops: [{ code: stCode || 'KZJ' }]
      });
      if (stCode) setStation(stCode);
      setBookingMode('train');
      setTab('book');
    }
  }, [searchParams]);

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
        params: { pnrNumber: pnr }
      });

      if (res.data?.success && res.data?.data) {
        const d = res.data.data;
        setSelectedTrain({
          train_no: d.trainNumber,
          train_name: d.trainName,
          from: { name: d.boardingStation },
          to: { name: d.destinationStation },
          stops: [{ code: d.boardingStation, name: STATIONS.find((s) => s.code === d.boardingStation)?.name || d.boardingStation }]
        });
        if (d.boardingStation && STATIONS.some((s) => s.code === d.boardingStation)) {
          setStation(d.boardingStation);
        }
        if (d.journeyDate) {
          try {
            const parsed = new Date(d.journeyDate);
            if (!isNaN(parsed.getTime())) {
              setJourneyDate(parsed.toISOString().split('T')[0]);
            }
          } catch {}
        }
        if (d.journeyTime) {
          setJourneyTime(d.journeyTime);
        }
        if (d.coach) setCoach(d.coach);
        if (d.berthNumber) setSeatNumber(d.berthNumber);
        if (d.berthType) setBerthType(d.berthType);
        toast.success(`PNR verified: Train ${d.trainNumber} · Coach ${d.coach || 'TBD'} · Berth ${d.berthNumber || 'TBD'}`);
      }
    } catch (err) {
      const msg = err?.response?.data?.message || 'Unable to fetch PNR automatically. You can enter your train & coach details manually below.';
      setPnrError(msg);
    } finally {
      setPnrLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!selectedTrain || !journeyDate) {
      return toast.error('Please select your train and journey date.');
    }
    if (!coach.trim() || !seatNumber.trim()) {
      return toast.error('Please enter your Coach and Seat/Berth number so the assistant knows where to meet you.');
    }
    if (calculateTotal() === 0) {
      return toast.error('Please select at least one assistance service.');
    }
    setPayOpen(true);
  };

  const handlePaid = async (method) => {
    try {
      const { data } = await axios.post('/bookings', {
        train_no: selectedTrain.train_no,
        train_name: selectedTrain.train_name,
        station_code: station,
        journey_date: journeyDate,
        journey_time: journeyTime,
        services,
        total_price: calculateTotal(),
        payment_method: method,
        coach: coach.trim(),
        seat_number: seatNumber.trim(),
        berth_type: berthType,
        action_type: actionType,
        pnr: pnrInput.trim(),
      });
      setPayOpen(false);
      toast.success('Assistance booking confirmed!');
      navigate(`/booking/${data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking submission failed');
    }
  };

  const doCancel = async () => {
    if (!confirmCancel) return;
    try {
      await axios.post(`/bookings/${confirmCancel}/cancel`);
      setConfirmCancel(null);
      toast.success('Assistance booking cancelled');
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cancellation failed');
    }
  };

  const totalSelectedCount = SERVICE_META.filter((s) =>
    s.qty ? services[s.key] > 0 : services[s.key]
  ).length;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-black dark:text-white">
      {/* ── Sticky Top Navigation ──────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-black/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Brand sub="Passenger" dark={theme === 'dark'} />

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
            Book
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
            <span>Trips</span>
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
             BOOKING WORKFLOW
             ============================================================ */
          <div className="grid lg:grid-cols-12 gap-8 items-start animate-fade-in">
            {/* Left Configuration Column (8 Cols) */}
            <div className="lg:col-span-8 space-y-8">
              {/* Step 1: Station & Train Selection (PNR vs Live Trains) */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 font-mono block mb-1">
                      Step 01
                    </span>
                    <h2 className="text-xl font-bold tracking-tight">
                      Journey &amp; Train Details
                    </h2>
                  </div>

                  {/* Mode switcher: PNR vs Train Search */}
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

                {/* ── SUB-MODE: 10-Digit PNR ─────────────────────── */}
                {bookingMode === 'pnr' && (
                  <div className="space-y-4 animate-fade-in">
                    <p className="text-xs text-zinc-500">
                      Enter your 10-digit Indian Railways PNR to automatically fetch train, station, coach, and seat details.
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

                {/* ── SUB-MODE: Manual / Live Station Search ──────── */}
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

                    {/* Train Search */}
                    <div>
                      <TrainSearch
                        station={station}
                        onSelect={(train) => {
                          setSelectedTrain(train);
                          const time = train.expected_arrival || train.scheduled_arrival || train.expected_departure || train.scheduled_departure;
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
                              <span>{selectedTrain.from?.name} &rarr; {selectedTrain.to?.name}</span>
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
                      Journey Date
                    </label>
                    <input
                      type="date"
                      value={journeyDate}
                      onChange={(e) => setJourneyDate(e.target.value)}
                      className="input-base text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
                      Estimated Time (Optional)
                    </label>
                    <input
                      type="time"
                      value={journeyTime}
                      onChange={(e) => setJourneyTime(e.target.value)}
                      className="input-base text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Step 2: Coach, Seat Number & Luggage Mission (Load vs Unload) */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 font-mono block mb-1">
                      Step 02
                    </span>
                    <h2 className="text-xl font-bold tracking-tight">
                      Coach, Seat &amp; Luggage Mission
                    </h2>
                  </div>
                  <span className="badge-blue">Seat Direct Dispatch</span>
                </div>

                <p className="text-xs text-zinc-500 leading-relaxed">
                  Provide your coach and seat number so your assigned assistant can meet you directly on the platform, carry your luggage into your coach, or collect it from your seat upon arrival.
                </p>

                {/* Mission Direction: Boarding vs De-boarding */}
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

                {/* Coach & Seat Inputs */}
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
              </div>

              {/* Step 3: Assistance Services Selection */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 font-mono block mb-1">
                      Step 03
                    </span>
                    <h2 className="text-xl font-bold tracking-tight">
                      Select Required Services
                    </h2>
                  </div>
                  <span className="text-xs font-mono text-zinc-400">
                    {totalSelectedCount} Selected
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  {SERVICE_META.map((s) => {
                    const isSelected = s.qty
                      ? services[s.key] > 0
                      : Boolean(services[s.key]);

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
                          <h3 className="font-bold text-sm text-black dark:text-white">
                            {s.label}
                          </h3>
                          <span className="font-mono text-xs font-bold text-black dark:text-white">
                            ₹{s.price}
                            <span className="text-[10px] text-zinc-400 font-normal">
                              /{s.per}
                            </span>
                          </span>
                        </div>

                        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mb-4">
                          {s.desc}
                        </p>

                        {/* Controls */}
                        {s.qty ? (
                          <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
                            <span className="text-xs font-semibold text-zinc-400">
                              Item Quantity
                            </span>
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() =>
                                  setServices((prev) => ({
                                    ...prev,
                                    [s.key]: Math.max(0, (prev[s.key] || 0) - 1),
                                  }))
                                }
                                className="w-7 h-7 rounded-lg border border-zinc-200 dark:border-zinc-700 flex items-center justify-center font-bold text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
                              >
                                -
                              </button>
                              <span className="font-mono font-bold text-sm w-4 text-center">
                                {services[s.key] || 0}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setServices((prev) => ({
                                    ...prev,
                                    [s.key]: (prev[s.key] || 0) + 1,
                                  }))
                                }
                                className="w-7 h-7 rounded-lg border border-zinc-200 dark:border-zinc-700 flex items-center justify-center font-bold text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setServices((prev) => ({
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
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Summary Sidebar (4 Cols) */}
            <aside className="lg:col-span-4 sticky top-24 space-y-6">
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-sm">
                <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 font-mono block mb-2">
                  Trip Summary
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
                      {selectedTrain ? selectedTrain.train_name : 'Not selected'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Coach &amp; Seat</span>
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

                {/* Selected Services Breakdown */}
                <div className="py-6 border-b border-zinc-100 dark:border-zinc-800 space-y-2.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
                    Services Breakdown
                  </p>

                  {totalSelectedCount === 0 ? (
                    <p className="text-xs text-zinc-400 italic">
                      No services selected yet.
                    </p>
                  ) : (
                    SERVICE_META.filter((s) =>
                      s.qty ? services[s.key] > 0 : services[s.key]
                    ).map((s) => {
                      const cost = s.qty
                        ? services[s.key] * s.price
                        : s.price;

                      return (
                        <div
                          key={s.key}
                          className="flex justify-between items-center text-xs"
                        >
                          <span className="text-zinc-700 dark:text-zinc-300">
                            {s.label}{' '}
                            {s.qty ? `(${services[s.key]})` : ''}
                          </span>
                          <span className="font-mono font-semibold text-black dark:text-white">
                            ₹{cost}
                          </span>
                        </div>
                      );
                    })
                  )}
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

                {/* Confirm Action */}
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="btn-primary w-full py-3.5 text-sm"
                >
                  Continue to Payment &rarr;
                </button>
              </div>

              {/* Safety Guarantee */}
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-start gap-3">
                <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1.5" />
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Your 6-digit OTP is issued immediately upon booking. Share with your assistant only when they meet you on the platform.
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

            {loading ? (
              <div className="space-y-4">
                <BookingSkeleton />
                <BookingSkeleton />
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
                          className="bg-white dark:bg-zinc-900 border border-blue-600/30 rounded-2xl p-6 shadow-md relative overflow-hidden"
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

                            <span className="text-xl font-bold font-mono text-black dark:text-white">
                              ₹{b.total_price}
                            </span>
                          </div>

                          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-3">
                            <button
                              type="button"
                              onClick={() => setConfirmCancel(b.id)}
                              className="text-xs font-semibold text-zinc-400 hover:text-black dark:hover:text-white"
                            >
                              Cancel Booking
                            </button>

                            <button
                              type="button"
                              onClick={() => navigate(`/booking/${b.id}`)}
                              className="btn-primary py-2 px-4 text-xs"
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
                            onClick={() => navigate(`/booking/${b.id}`)}
                            className="btn-secondary py-1.5 px-3 text-xs"
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

      {/* Payment Modal */}
      <PaymentModal
        open={payOpen}
        total={calculateTotal()}
        onClose={() => setPayOpen(false)}
        onPaid={handlePaid}
      />

      {/* Cancel Confirmation Dialog */}
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