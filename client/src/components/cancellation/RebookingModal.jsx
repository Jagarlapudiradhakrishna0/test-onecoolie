import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from '../../api/axios';
import { toast } from 'react-hot-toast';
import {
  Calendar,
  Clock,
  Train,
  MapPin,
  Armchair,
  Sparkles,
  AlertTriangle,
  X,
  ArrowRight,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';

const STATIONS = [
  { code: 'KZJ', name: 'Kazipet Junction' },
  { code: 'SC', name: 'Secunderabad Junction' },
  { code: 'HYB', name: 'Hyderabad Deccan' },
  { code: 'NDLS', name: 'New Delhi' },
  { code: 'HWH', name: 'Howrah Junction' },
  { code: 'BGL', name: 'Bangalore City' },
  { code: 'MAS', name: 'Chennai Central' },
  { code: 'CSTM', name: 'Mumbai CSMT' }
];

export default function RebookingModal({
  isOpen = true,
  onClose,
  booking,
  onRebooked,
  onSuccess
}) {
  const [journeyDate, setJourneyDate] = useState('');
  const [journeyTime, setJourneyTime] = useState('');
  const [stationCode, setStationCode] = useState('');
  const [trainNumber, setTrainNumber] = useState('');
  const [trainName, setTrainName] = useState('');
  const [coach, setCoach] = useState('');
  const [seatNumber, setSeatNumber] = useState('');
  const [berthType, setBerthType] = useState('Lower');
  const [platform, setPlatform] = useState('1');

  const [quote, setQuote] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isOpen || !booking) return;

    setJourneyDate(booking.journey_date || '');
    setJourneyTime(booking.journey_time || '');
    setStationCode(booking.station_code || 'KZJ');
    setTrainNumber(booking.train_no || booking.train_number || '');
    setTrainName(booking.train_name || 'Express');
    setCoach(booking.coach || booking.services?.coach || '');
    setSeatNumber(booking.seat_number || booking.services?.seat_number || '');
    setBerthType(booking.berth_type || booking.services?.berth_type || 'Lower');
    setPlatform(booking.platform || booking.services?.platform || '1');
    setErrorMessage('');
    setIsSubmitting(false);

    // Initial quote
    setQuote({
      currentTotal: Number(booking.total_price || 0),
      newTotal: Number(booking.total_price || 0),
      priceDifference: 0,
      assistantReassignmentRequired: false
    });
  }, [isOpen, booking]);

  const isStationOrDateChanged = Boolean(
    booking && (
      (stationCode && stationCode !== booking.station_code) ||
      (journeyDate && journeyDate !== booking.journey_date)
    )
  );

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (isSubmitting) return; // Hard guard against double-submission
    if (!journeyDate) {
      setErrorMessage('Please select a valid journey date.');
      return;
    }
    if (!coach.trim() || !seatNumber.trim()) {
      setErrorMessage('Please provide both coach and seat number.');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const targetId = booking.id || booking.booking_id;
      const res = await axios.post(`/bookings/${targetId}/rebook`, {
        journey_date: journeyDate,
        journey_time: journeyTime,
        station_code: stationCode,
        train_number: trainNumber,
        train_no: trainNumber,
        train_name: trainName,
        coach: coach.trim(),
        seat_number: seatNumber.trim(),
        berth_type: berthType,
        platform
      });

      const updated = res.data?.booking || res.data;
      toast.success(res.data?.message || 'Booking updated successfully!');
      if (onRebooked) onRebooked(updated);
      if (onSuccess) onSuccess(updated);
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update booking. Please try again.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSubmitting && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen || !booking) return null;

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rebooking-modal-title"
      className="fixed inset-0 z-[110] bg-black/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in"
    >
      <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl border border-slate-200 text-left relative max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-5 right-5 text-zinc-400 hover:text-black p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-blue-600 mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Modify Trip Schedule</span>
            </div>
            <h3 className="text-lg font-black text-zinc-900 tracking-tight">
              Change Booking Details
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Update your train, date, or coach without cancelling your station assistance.
            </p>
          </div>

          {/* Reassignment Notice if date/station changed */}
          {booking.assistant_id && isStationOrDateChanged && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-1">
              <span className="font-extrabold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Assistant Reassignment Required
              </span>
              <p className="text-[11px] leading-relaxed text-amber-800">
                You are modifying the station or journey date. Your current assistant will be released back to the platform pool and a new assistant will be assigned for your revised schedule.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            {/* Row 1: Journey Date & Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="font-bold text-zinc-800 block mb-1">Journey Date</label>
                <div className="relative">
                  <input
                    type="date"
                    value={journeyDate}
                    onChange={(e) => setJourneyDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-black font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-zinc-800 block mb-1">Journey Time</label>
                <div className="relative">
                  <input
                    type="time"
                    value={journeyTime}
                    onChange={(e) => setJourneyTime(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-black font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Row 2: Boarding Station & Platform */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="font-bold text-zinc-800 block mb-1">Boarding Station</label>
                <select
                  value={stationCode}
                  onChange={(e) => setStationCode(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-black font-medium"
                >
                  {STATIONS.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-zinc-800 block mb-1">Expected Platform</label>
                <input
                  type="text"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  placeholder="e.g. 1, 2"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-black font-medium"
                />
              </div>
            </div>

            {/* Row 3: Train Number & Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="font-bold text-zinc-800 block mb-1">Train Number</label>
                <input
                  type="text"
                  value={trainNumber}
                  onChange={(e) => setTrainNumber(e.target.value)}
                  placeholder="e.g. 12724"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-black font-medium uppercase font-mono"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-zinc-800 block mb-1">Train Name</label>
                <input
                  type="text"
                  value={trainName}
                  onChange={(e) => setTrainName(e.target.value)}
                  placeholder="e.g. Telangana Express"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-black font-medium"
                />
              </div>
            </div>

            {/* Row 4: Coach, Seat, Berth */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="font-bold text-zinc-800 block mb-1">Coach</label>
                <input
                  type="text"
                  value={coach}
                  onChange={(e) => setCoach(e.target.value)}
                  placeholder="e.g. B2"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-black font-medium uppercase"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-zinc-800 block mb-1">Seat/Berth</label>
                <input
                  type="text"
                  value={seatNumber}
                  onChange={(e) => setSeatNumber(e.target.value)}
                  placeholder="e.g. 45"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-black font-medium uppercase"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-zinc-800 block mb-1">Berth Type</label>
                <select
                  value={berthType}
                  onChange={(e) => setBerthType(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-black font-medium"
                >
                  <option value="Lower">Lower</option>
                  <option value="Middle">Middle</option>
                  <option value="Upper">Upper</option>
                  <option value="Side Lower">Side Lower</option>
                  <option value="Side Upper">Side Upper</option>
                  <option value="Window">Window</option>
                </select>
              </div>
            </div>

            {errorMessage && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                {errorMessage}
              </div>
            )}

            {/* Price Preview Card */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
              <span className="text-zinc-600 font-medium">Total Booking Fee:</span>
              <span className="font-mono font-extrabold text-zinc-900">₹{booking.total_price}</span>
            </div>

            <div className="pt-2 flex items-center gap-2.5">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={onClose}
                className="py-3 px-5 rounded-full border border-slate-200 hover:bg-slate-100 text-zinc-700 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3 px-5 rounded-full bg-black hover:bg-zinc-800 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Updating booking...</span>
                  </>
                ) : (
                  <span>Save & Update Booking</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
