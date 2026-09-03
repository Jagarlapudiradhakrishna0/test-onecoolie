import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import Brand from '../components/Brand';
import axios from '../api/axios';
import toast, { Toaster } from 'react-hot-toast';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  Shield, Train, User, Clock, AlertTriangle, CheckCircle, XCircle, Search, Filter,
  Download, RefreshCw, Eye, Phone, Mail, MapPin, CreditCard, ChevronRight, TrendingUp,
  Users, Check, X, ExternalLink, Printer, Key, Briefcase, Calendar, Info, Layers,
  Compass, ArrowUpRight, CheckSquare, Power, ToggleLeft, ToggleRight
} from 'lucide-react';

/* ============================================================
   ONECOOLIE ENTERPRISE ADMIN OPERATIONS COMMAND CENTER
   Swiss Minimal Typography: Black (#000000), White (#FFFFFF), Blue (#2563EB)
   ============================================================ */

const STATIONS = [
  { code: 'SC', name: 'Secunderabad Jn' },
  { code: 'BZA', name: 'Vijayawada Jn' },
  { code: 'KZJ', name: 'Kazipet Jn' },
  { code: 'WL', name: 'Warangal' },
];

const STATUS_COLORS = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
  accepted: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800',
  arriving: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800',
  in_service: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
  cancelled: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800',
};

const PAYMENT_COLORS = {
  paid: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  refunded: 'bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300',
  failed: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
};

// ----------------------------------------------------------------------
// SUBCOMPONENT: BOOKING DETAIL MODAL (FULL VISIBILITY & CONTROL)
// ----------------------------------------------------------------------
function BookingDetailModal({ booking, onClose, onUpdate, assistants = [] }) {
  // Local state to reflect live changes instantly
  const [currentBooking, setCurrentBooking] = useState(booking);
  const [selectedAssistant, setSelectedAssistant] = useState(booking?.assistant_id || '');
  const [actionLoading, setActionLoading] = useState(false);

  // Synchronize when the booking prop updates
  useEffect(() => {
    setCurrentBooking(booking);
    setSelectedAssistant(booking?.assistant_id || '');
  }, [booking]);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!currentBooking) return null;

  const handleStatusChange = async (newStatus) => {
    try {
      setActionLoading(true);
      const updated = await onUpdate(currentBooking.id, { booking_status: newStatus });
      if (updated) {
        setCurrentBooking(updated);
      } else {
        setCurrentBooking(prev => ({ ...prev, booking_status: newStatus }));
      }
      toast.success(`Booking status updated to ${newStatus.toUpperCase()}`);
    } catch (err) {
      console.error('Status update error:', err);
      toast.error('Failed to update booking status');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePaymentChange = async (newPaymentStatus) => {
    try {
      setActionLoading(true);
      const updated = await onUpdate(currentBooking.id, { payment_status: newPaymentStatus });
      if (updated) {
        setCurrentBooking(updated);
      } else {
        setCurrentBooking(prev => ({ ...prev, payment_status: newPaymentStatus }));
      }
      toast.success(`Payment marked as ${newPaymentStatus.toUpperCase()}`);
    } catch (err) {
      console.error('Payment update error:', err);
      toast.error('Failed to update payment status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssistantReassign = async () => {
    try {
      setActionLoading(true);
      const assistantIdToAssign = selectedAssistant || null;
      const updated = await onUpdate(currentBooking.id, { assistant_id: assistantIdToAssign });
      if (updated) {
        setCurrentBooking(updated);
      }
      toast.success(assistantIdToAssign ? 'Sahayak assigned successfully' : 'Sahayak assignment removed');
    } catch (err) {
      console.error('Assistant assignment error:', err);
      toast.error('Failed to reassign assistant');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveSOS = async () => {
    try {
      setActionLoading(true);
      const updated = await onUpdate(currentBooking.id, { sos_triggered: false });
      if (updated) {
        setCurrentBooking(updated);
      } else {
        setCurrentBooking(prev => ({ ...prev, sos_triggered: false }));
      }
      toast.success('Emergency alert marked as resolved');
    } catch (err) {
      console.error('SOS resolve error:', err);
      toast.error('Failed to resolve SOS');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrintSlip = () => {
    window.print();
  };

  const services = currentBooking.services || {};
  const luggageCount = typeof services.luggage === 'number' ? services.luggage : (services.luggage ? 1 : 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in cursor-pointer"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/80 dark:bg-zinc-950/80">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs font-mono">
              RM
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-mono font-bold text-base text-black dark:text-white">
                  Booking #{currentBooking.booking_id || currentBooking.id?.slice(-8).toUpperCase()}
                </h3>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${STATUS_COLORS[currentBooking.booking_status] || 'border-zinc-300'}`}>
                  {currentBooking.booking_status}
                </span>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${PAYMENT_COLORS[currentBooking.payment_status] || 'bg-zinc-100'}`}>
                  {currentBooking.payment_status}
                </span>
                {currentBooking.sos_triggered && (
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-red-600 text-white animate-pulse flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> SOS ACTIVE
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 font-mono mt-0.5">
                Created: {new Date(currentBooking.created_at).toLocaleString()} · Station: <strong className="text-black dark:text-white">{currentBooking.station_code}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintSlip}
              title="Print Dispatch Slip"
              className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              title="Close modal"
              className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="px-6 py-6 overflow-y-auto space-y-6 flex-1 text-xs">
          
          {/* Grid of 3 Dossier Cards */}
          <div className="grid md:grid-cols-3 gap-4">
            
            {/* 1. Passenger Dossier */}
            <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-zinc-400 font-bold uppercase tracking-wider font-mono text-[10px]">
                <User className="w-3.5 h-3.5 text-blue-600" /> Passenger Dossier
              </div>
              <div>
                <p className="font-bold text-sm text-black dark:text-white">
                  {currentBooking.passenger?.name || 'Guest Passenger'}
                </p>
                <p className="text-zinc-500 font-mono mt-0.5">{currentBooking.passenger?.email || '—'}</p>
                <div className="mt-2 flex items-center gap-2">
                  <Phone className="w-3 h-3 text-emerald-600" />
                  {currentBooking.passenger?.phone ? (
                    <a href={`tel:${currentBooking.passenger.phone}`} className="font-mono text-blue-600 dark:text-blue-400 hover:underline font-semibold">
                      {currentBooking.passenger.phone}
                    </a>
                  ) : (
                    <span className="text-zinc-400 italic">No phone logged</span>
                  )}
                </div>
                <p className="text-[10px] text-zinc-400 font-mono mt-2 truncate">
                  User ID: {currentBooking.passenger_id}
                </p>
              </div>
            </div>

            {/* 2. Sahayak (Assistant) Dossier */}
            <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-zinc-400 font-bold uppercase tracking-wider font-mono text-[10px]">
                <Briefcase className="w-3.5 h-3.5 text-blue-600" /> Assigned Sahayak
              </div>
              {currentBooking.assistant ? (
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm text-black dark:text-white">
                      {currentBooking.assistant.name}
                    </p>
                    <span className={`w-2 h-2 rounded-full ${currentBooking.assistant.is_online ? 'bg-emerald-500 ring-2 ring-emerald-300' : 'bg-zinc-400'}`} />
                  </div>
                  <p className="text-zinc-500 font-mono mt-0.5">{currentBooking.assistant.email || '—'}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Phone className="w-3 h-3 text-emerald-600" />
                    {currentBooking.assistant.phone ? (
                      <a href={`tel:${currentBooking.assistant.phone}`} className="font-mono text-blue-600 dark:text-blue-400 hover:underline font-semibold">
                        {currentBooking.assistant.phone}
                      </a>
                    ) : (
                      <span className="text-zinc-400 italic">No phone logged</span>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-500 font-mono mt-1">
                    Hub: <strong>{currentBooking.assistant.station_code || currentBooking.station_code}</strong> · Assistant ID: #{currentBooking.assistant_id?.slice(-6).toUpperCase()}
                  </p>
                </div>
              ) : (
                <div className="text-zinc-400 py-2 italic font-mono text-[11px]">
                  No assistant currently assigned to this mission.
                </div>
              )}

              {/* Reassignment Dropdown */}
              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex gap-2">
                <select
                  value={selectedAssistant}
                  onChange={(e) => setSelectedAssistant(e.target.value)}
                  className="input-base text-[11px] py-1 px-2 flex-1 h-8 bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700"
                >
                  <option value="">-- Unassign Sahayak --</option>
                  {assistants.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.station_code}) {a.is_online ? '• Online' : ''}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAssistantReassign}
                  disabled={actionLoading}
                  className="btn-primary text-[11px] py-1 px-3 h-8 cursor-pointer disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </div>

            {/* 3. Security & OTP Dossier */}
            <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-zinc-400 font-bold uppercase tracking-wider font-mono text-[10px]">
                <Key className="w-3.5 h-3.5 text-blue-600" /> Handshake Security & OTP
              </div>
              <div className="space-y-2">
                <div className="p-2.5 rounded-lg bg-black text-white dark:bg-white dark:text-black flex items-center justify-between shadow-xs">
                  <span className="text-[10px] font-mono tracking-wider uppercase text-zinc-400 dark:text-zinc-600">Secret Start OTP</span>
                  <span className="text-lg font-mono font-black tracking-widest text-blue-400 dark:text-blue-600">
                    {currentBooking.start_otp || '------'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-500">Verification Status:</span>
                  <span className={`font-bold font-mono ${currentBooking.start_otp_verified ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {currentBooking.start_otp_verified ? '✓ Verified by Sahayak' : '⏳ Awaiting Handshake'}
                  </span>
                </div>
                {currentBooking.service_started_at && (
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                    <span>Started:</span>
                    <span>{new Date(currentBooking.service_started_at).toLocaleTimeString()}</span>
                  </div>
                )}
                {currentBooking.completed_at && (
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                    <span>Completed:</span>
                    <span>{new Date(currentBooking.completed_at).toLocaleTimeString()}</span>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Train & Journey Telemetry Section */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Train className="w-4 h-4 text-blue-600" />
                <h4 className="font-bold text-sm text-black dark:text-white">
                  Train Transit & Coach Telemetry Specifications
                </h4>
              </div>
              <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2.5 py-1 rounded-md">
                PNR: {currentBooking.pnr || currentBooking.services?.pnr || 'NOT LOGGED'}
              </span>
            </div>

            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 font-mono">
              <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-lg">
                <span className="text-[10px] text-zinc-400 uppercase block">Train Number & Name</span>
                <span className="font-bold text-black dark:text-white text-xs">
                  {currentBooking.train_no || currentBooking.train_number}
                </span>
                <p className="text-[11px] text-zinc-500 truncate">{currentBooking.train_name}</p>
              </div>

              <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-lg">
                <span className="text-[10px] text-zinc-400 uppercase block">Station & Platform</span>
                <span className="font-bold text-black dark:text-white text-xs">
                  {currentBooking.station_code} {currentBooking.platform ? `· Platform ${currentBooking.platform}` : ''}
                </span>
                <p className="text-[11px] text-zinc-500 truncate">
                  {currentBooking.source ? `${currentBooking.source} ➔ ${currentBooking.destination || currentBooking.station_code}` : 'Direct Station Assistance'}
                </p>
              </div>

              <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-lg">
                <span className="text-[10px] text-zinc-400 uppercase block">Coach & Seat Location</span>
                <span className="font-bold text-blue-600 dark:text-blue-400 text-xs">
                  Coach {currentBooking.coach || 'TBD'} · Seat {currentBooking.seat_number || 'TBD'}
                </span>
                <p className="text-[11px] text-zinc-500 truncate">{currentBooking.berth_type || 'General Berth'}</p>
              </div>

              <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-lg">
                <span className="text-[10px] text-zinc-400 uppercase block">Mission Action Type</span>
                <span className="font-bold text-black dark:text-white text-xs">
                  {currentBooking.action_type === 'collect_from_seat' ? 'De-boarding (Coach Door)' : 'Boarding (Load into Seat)'}
                </span>
                <p className="text-[11px] text-zinc-500">
                  {currentBooking.journey_date} {currentBooking.journey_time ? `· ${currentBooking.journey_time}` : ''}
                </p>
              </div>
            </div>
          </div>

          {/* Itemized Services & Financial Audit */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Services Breakdown */}
            <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-400 font-mono flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-blue-600" /> Itemized Luggage & Services
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between py-1.5 border-b border-zinc-200 dark:border-zinc-800">
                  <span className="text-zinc-600 dark:text-zinc-300">🧳 Luggage Item Assistance</span>
                  <span className="font-mono font-bold text-black dark:text-white">
                    {luggageCount} item(s) {luggageCount > 0 ? `(₹${luggageCount * 30})` : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-zinc-200 dark:border-zinc-800">
                  <span className="text-zinc-600 dark:text-zinc-300">🚶 Seat Escort & Navigation</span>
                  <span className="font-mono font-bold text-black dark:text-white">
                    {services.escort ? 'Yes (₹60)' : 'No'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-zinc-200 dark:border-zinc-800">
                  <span className="text-zinc-600 dark:text-zinc-300">♿ Wheelchair & Senior Transit</span>
                  <span className="font-mono font-bold text-black dark:text-white">
                    {services.wheelchair ? 'Yes (₹80)' : 'No'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-zinc-200 dark:border-zinc-800">
                  <span className="text-zinc-600 dark:text-zinc-300">🍱 Snacks & Bottled Water Delivery</span>
                  <span className="font-mono font-bold text-black dark:text-white">
                    {services.snacks ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-zinc-200 dark:border-zinc-800">
                  <span className="text-zinc-600 dark:text-zinc-300">🛺 Exit Transport / Taxi Escort</span>
                  <span className="font-mono font-bold text-black dark:text-white">
                    {services.transport ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-zinc-600 dark:text-zinc-300">🗣️ Language Translation Support</span>
                  <span className="font-mono font-bold text-black dark:text-white">
                    {services.language ? 'Yes' : 'No'}
                  </span>
                </div>
                {currentBooking.service_description && (
                  <div className="p-2.5 bg-white dark:bg-zinc-900 rounded-lg text-[11px] text-zinc-500 font-mono mt-2 border border-zinc-200 dark:border-zinc-800">
                    Note: {currentBooking.service_description}
                  </div>
                )}
              </div>
            </div>

            {/* Financial & Payment Audit */}
            <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-4">
              <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-400 font-mono flex items-center gap-2">
                <CreditCard className="w-3.5 h-3.5 text-blue-600" /> Financial Audit & Settlement
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Gross Tariff:</span>
                  <span className="text-2xl font-black font-mono text-black dark:text-white">
                    ₹{currentBooking.total_price}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">Payment Method:</span>
                  <span className="font-bold uppercase font-mono text-black dark:text-white">
                    {currentBooking.payment_method || 'UPI / QR'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-zinc-500">Txn / Payment ID:</span>
                  <span className="text-zinc-400 truncate max-w-[200px]">
                    {currentBooking.payment_id || 'PENDING-AUTH'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">Payment Status:</span>
                  <span className={`px-2 py-0.5 rounded-md font-bold uppercase text-[10px] ${PAYMENT_COLORS[currentBooking.payment_status]}`}>
                    {currentBooking.payment_status}
                  </span>
                </div>

                {/* Admin Quick Payment Override */}
                <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase block">Admin Payment Override:</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handlePaymentChange('paid')}
                      disabled={actionLoading || currentBooking.payment_status === 'paid'}
                      className="btn-secondary text-[10px] py-1.5 px-2.5 flex-1 bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 cursor-pointer disabled:opacity-50"
                    >
                      Mark Paid
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePaymentChange('refunded')}
                      disabled={actionLoading || currentBooking.payment_status === 'refunded'}
                      className="btn-secondary text-[10px] py-1.5 px-2.5 flex-1 bg-zinc-100 text-zinc-700 border-zinc-300 hover:bg-zinc-200 cursor-pointer disabled:opacity-50"
                    >
                      Mark Refunded
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePaymentChange('pending')}
                      disabled={actionLoading || currentBooking.payment_status === 'pending'}
                      className="btn-secondary text-[10px] py-1.5 px-2.5 flex-1 bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100 cursor-pointer disabled:opacity-50"
                    >
                      Mark Pending
                    </button>
                  </div>
                </div>

                {currentBooking.rating && (
                  <div className="p-3 bg-white dark:bg-zinc-900 rounded-lg text-xs border border-zinc-200 dark:border-zinc-800">
                    <span className="text-[10px] text-zinc-400 uppercase font-mono block">Passenger Rating:</span>
                    <p className="font-bold text-amber-500">★ {currentBooking.rating} / 5</p>
                    {currentBooking.review && <p className="text-zinc-500 italic mt-1 font-sans">"{currentBooking.review}"</p>}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SOS Resolution Banner if triggered */}
          {currentBooking.sos_triggered && (
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 animate-bounce" />
                <div>
                  <h5 className="font-bold text-red-800 dark:text-red-300 text-xs uppercase font-mono">
                    Emergency Alert Active on this Booking
                  </h5>
                  <p className="text-red-600 dark:text-red-400 text-[11px]">
                    Triggered at: {currentBooking.sos_triggered_at ? new Date(currentBooking.sos_triggered_at).toLocaleTimeString() : 'Recent'} · Station: {currentBooking.station_code}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleResolveSOS}
                disabled={actionLoading}
                className="btn-primary bg-red-600 hover:bg-red-700 text-white text-xs py-1.5 px-4 cursor-pointer disabled:opacity-50"
              >
                Mark Emergency Resolved
              </button>
            </div>
          )}

          {/* Status Intervention Control */}
          <div className="p-4 bg-zinc-100 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h5 className="font-bold text-xs uppercase font-mono text-black dark:text-white">
                Admin Lifecycle State Intervention
              </h5>
              <p className="text-[11px] text-zinc-500">
                Current status: <strong className="text-blue-600 uppercase">{currentBooking.booking_status}</strong>. Click any button below to update:
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {['pending', 'accepted', 'arriving', 'in_service', 'completed', 'cancelled'].map((st) => {
                const isCurrent = currentBooking.booking_status === st;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => handleStatusChange(st)}
                    disabled={actionLoading || isCurrent}
                    className={`text-[10px] font-bold uppercase font-mono px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs cursor-default'
                        : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 border-zinc-300 dark:border-zinc-700 hover:border-black dark:hover:border-white hover:bg-zinc-50'
                    }`}
                  >
                    {isCurrent ? `✓ ${st}` : st}
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 flex justify-between items-center text-xs">
          <span className="font-mono text-[10px] text-zinc-400">
            Audit ID: {currentBooking.id}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="btn-secondary text-xs py-1.5 px-4 cursor-pointer font-bold"
          >
            Close Inspector
          </button>
        </div>

      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// SUBCOMPONENT: KYC QUEUE CARD
// ----------------------------------------------------------------------
function KycQueueCard({ applicant, onDecide, actionLoading }) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shrink-0">
          {applicant.name?.charAt(0).toUpperCase()}
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-sm text-black dark:text-white">
              {applicant.name}
            </h4>
            <span className="badge-blue text-[10px]">
              KYC Awaiting Review
            </span>
          </div>

          <p className="text-xs text-zinc-500 font-mono mt-0.5">
            {applicant.email} · Phone: <strong className="text-black dark:text-white">{applicant.phone || 'N/A'}</strong> · Hub:{' '}
            <strong className="text-blue-600 dark:text-blue-400">
              {applicant.station_code}
            </strong>
          </p>
          <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
            Applied: {new Date(applicant.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto">
        <button
          type="button"
          disabled={actionLoading}
          onClick={() => onDecide(applicant.id, 'approve')}
          className="btn-primary flex-1 sm:flex-none py-2 px-4 text-xs bg-emerald-600 hover:bg-emerald-700 cursor-pointer disabled:opacity-50"
        >
          Approve Assistant
        </button>
        <button
          type="button"
          disabled={actionLoading}
          onClick={() => onDecide(applicant.id, 'reject')}
          className="btn-secondary flex-1 sm:flex-none py-2 px-4 text-xs text-rose-600 hover:bg-rose-50 cursor-pointer disabled:opacity-50"
        >
          Reject
        </button>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// MAIN EXPORT: ADMIN DASHBOARD
// ----------------------------------------------------------------------
export default function AdminDashboard() {
  const { user, logout } = useAuth();

  // Navigation tabs: 'bookings' | 'overview' | 'assistants' | 'passengers' | 'sos'
  const [activeTab, setActiveTab] = useState('bookings');

  // Core Data States
  const [stats, setStats] = useState({
    totalBookings: 0,
    pendingAssistants: 0,
    totalAssistants: 0,
    onlineAssistants: 0,
    totalPassengers: 0,
    revenue: 0,
    todayRevenue: 0,
    todayBookings: 0,
    activeSOS: 0,
    statusBreakdown: {},
    stationStats: [],
    paymentMap: {},
  });
  const [bookings, setBookings] = useState([]);
  const [kycQueue, setKycQueue] = useState([]);
  const [assistantsList, setAssistantsList] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [sosAlerts, setSosAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastSynced, setLastSynced] = useState(new Date());

  // Filter States for Master Ledger
  const [filterQuery, setFilterQuery] = useState('');
  const [selectedStation, setSelectedStation] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('ALL');
  const [selectedDateRange, setSelectedDateRange] = useState('ALL');

  // Selected Booking for Detail Inspector
  const [inspectingBooking, setInspectingBooking] = useState(null);
  const inspectingBookingRef = useRef(null);
  inspectingBookingRef.current = inspectingBooking;

  const handleCloseInspector = useCallback(() => {
    inspectingBookingRef.current = null;
    setInspectingBooking(null);
  }, []);

  const [actionLoading, setActionLoading] = useState(false);

  // Pagination for Master Ledger
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 15;

  // --------------------------------------------------
  // DATA FETCHING
  // --------------------------------------------------
  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [sRes, pRes, bRes, aRes, uRes, sosRes] = await Promise.all([
        axios.get('/admin/stats').catch(() => ({ data: {} })),
        axios.get('/admin/pending-assistants').catch(() => ({ data: [] })),
        axios.get('/admin/bookings').catch(() => ({ data: [] })),
        axios.get('/admin/assistants').catch(() => ({ data: [] })),
        axios.get('/admin/users').catch(() => ({ data: [] })),
        axios.get('/admin/sos-alerts').catch(() => ({ data: [] })),
      ]);

      setStats(sRes.data || {});
      setKycQueue(pRes.data || []);
      setBookings(bRes.data || []);
      setAssistantsList(aRes.data || []);
      setUsersList(uRes.data || []);
      setSosAlerts(sosRes.data || []);
      setLastSynced(new Date());

      // If inspecting a booking, sync it with newest data
      if (inspectingBookingRef.current) {
        const updated = (bRes.data || []).find((b) => b.id === inspectingBookingRef.current?.id);
        if (updated && inspectingBookingRef.current) {
          setInspectingBooking(updated);
        }
      }
    } catch (err) {
      console.error('ADMIN REFRESH ERROR:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Polling and Socket Integration (Rapid 3-Second Live Telemetry Sync)
  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 3000);

    if (window.socket) {
      const handleLiveEvent = () => fetchAll();
      window.socket.on('sos_alert', handleLiveEvent);
      window.socket.on('status_update', handleLiveEvent);
      window.socket.on('new_booking', handleLiveEvent);

      return () => {
        clearInterval(interval);
        window.socket.off('sos_alert', handleLiveEvent);
        window.socket.off('status_update', handleLiveEvent);
        window.socket.off('new_booking', handleLiveEvent);
      };
    }

    return () => clearInterval(interval);
  }, [fetchAll]);

  // --------------------------------------------------
  // ADMIN INTERVENTIONS
  // --------------------------------------------------
  const handleDecideAssistant = async (id, action, reason) => {
    try {
      setActionLoading(true);
      if (action === 'approve') {
        await axios.post(`/admin/assistants/${id}/approve`);
        toast.success('Assistant approved successfully!');
      } else {
        await axios.post(`/admin/assistants/${id}/reject`, { reason });
        toast.success('Assistant application rejected');
      }
      await fetchAll();
    } catch (err) {
      console.error('DECIDE ERROR:', err);
      toast.error('Action failed. Please check permissions.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleAssistantOnline = async (assistant) => {
    try {
      const nextOnline = !assistant.is_online;
      await axios.patch(`/admin/users/${assistant.id}`, { is_online: nextOnline });
      toast.success(`${assistant.name} marked ${nextOnline ? 'ONLINE (On-Duty)' : 'OFFLINE'}`);
      await fetchAll();
    } catch (err) {
      console.error('Toggle online error:', err);
      toast.error('Failed to update duty status');
    }
  };

  const handleToggleAssistantApproval = async (assistant) => {
    try {
      const nextApproval = !assistant.is_approved;
      await axios.patch(`/admin/users/${assistant.id}`, { is_approved: nextApproval });
      toast.success(`${assistant.name} ${nextApproval ? 'Approved' : 'Suspended'}`);
      await fetchAll();
    } catch (err) {
      console.error('Toggle approval error:', err);
      toast.error('Failed to update assistant approval');
    }
  };

  const handleUpdateBooking = async (bookingId, payload) => {
    const { data } = await axios.patch(`/admin/bookings/${bookingId}`, payload);
    // Optimistically update inspecting modal
    setInspectingBooking(data);
    // Optimistically update bookings list
    setBookings((prev) => prev.map((b) => (b.id === bookingId ? data : b)));
    // Refresh background data
    fetchAll();
    return data;
  };

  const handleResolveEmergency = async (bookingId) => {
    try {
      await axios.post(`/admin/sos-alerts/${bookingId}/resolve`);
      toast.success('Emergency alert resolved and cleared');
      await fetchAll();
    } catch (err) {
      console.error('RESOLVE SOS ERROR:', err);
      toast.error('Failed to resolve SOS alert');
    }
  };

  const handleFilterToAssistant = (assistantName) => {
    setActiveTab('bookings');
    setFilterQuery(assistantName);
    setSelectedStation('ALL');
    setSelectedStatus('ALL');
    setSelectedPaymentStatus('ALL');
  };

  const handleFilterToPassenger = (passengerQuery) => {
    setActiveTab('bookings');
    setFilterQuery(passengerQuery);
    setSelectedStation('ALL');
    setSelectedStatus('ALL');
    setSelectedPaymentStatus('ALL');
  };

  // --------------------------------------------------
  // CSV EXPORTER (FULL LEDGER WITH ALL SPECIFICATIONS)
  // --------------------------------------------------
  const exportFullLedgerCSV = () => {
    try {
      const headers = [
        'Booking ID',
        'Created At',
        'Passenger Name',
        'Passenger Email',
        'Passenger Phone',
        'Train Number',
        'Train Name',
        'Station Code',
        'Platform',
        'Coach',
        'Seat Number',
        'Berth Type',
        'Action Type',
        'PNR',
        'Luggage Count',
        'Total Amount (INR)',
        'Payment Status',
        'Payment Method',
        'Payment ID',
        'Booking Status',
        'Start OTP',
        'OTP Verified',
        'Assigned Assistant',
        'Assistant Phone',
        'Rating',
      ];

      const rows = bookings.map((b) => [
        `"${b.booking_id || b.id}"`,
        `"${b.created_at || ''}"`,
        `"${b.passenger?.name || ''}"`,
        `"${b.passenger?.email || ''}"`,
        `"${b.passenger?.phone || ''}"`,
        `"${b.train_no || b.train_number || ''}"`,
        `"${b.train_name || ''}"`,
        `"${b.station_code || ''}"`,
        `"${b.platform || b.services?.platform || ''}"`,
        `"${b.coach || b.services?.coach || ''}"`,
        `"${b.seat_number || b.services?.seat_number || ''}"`,
        `"${b.berth_type || b.services?.berth_type || ''}"`,
        `"${b.action_type || b.services?.action_type || ''}"`,
        `"${b.pnr || b.services?.pnr || ''}"`,
        `"${b.services?.luggage || 0}"`,
        `"${b.total_price || 0}"`,
        `"${b.payment_status || ''}"`,
        `"${b.payment_method || ''}"`,
        `"${b.payment_id || ''}"`,
        `"${b.booking_status || ''}"`,
        `"${b.start_otp || ''}"`,
        `"${b.start_otp_verified ? 'YES' : 'NO'}"`,
        `"${b.assistant?.name || 'Unassigned'}"`,
        `"${b.assistant?.phone || ''}"`,
        `"${b.rating || ''}"`,
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `OneCoolie-MasterLedger-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      toast.success('Master booking ledger exported to CSV!');
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Failed to export CSV');
    }
  };

  // --------------------------------------------------
  // STRICT CHRONOLOGICAL SORTING (Newest Bookings Always First)
  // --------------------------------------------------
  const sortedBookings = useMemo(() => {
    return [...bookings].sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeB - timeA; // Descending: latest booking at index 0
    });
  }, [bookings]);

  // --------------------------------------------------
  // ENHANCED MULTI-FORMAT SEARCH & FILTERING LOGIC
  // --------------------------------------------------
  const filteredBookings = useMemo(() => {
    return sortedBookings.filter((b) => {
      // 1. Universal Search Query
      if (filterQuery && filterQuery.trim()) {
        const rawQ = filterQuery.trim().toLowerCase();
        const cleanQ = rawQ.replace(/^#/, '');

        const fullId = String(b.id || '').toLowerCase();
        const bookingId = String(b.booking_id || '').toLowerCase();
        const shortId6 = fullId.slice(-6);
        const shortId8 = fullId.slice(-8);
        const startId8 = fullId.slice(0, 8);
        const pName = String(b.passenger?.name || '').toLowerCase();
        const pEmail = String(b.passenger?.email || '').toLowerCase();
        const pPhone = String(b.passenger?.phone || '').toLowerCase();
        const pId = String(b.passenger_id || '').toLowerCase();
        const tNo = String(b.train_no || b.train_number || '').toLowerCase();
        const tName = String(b.train_name || '').toLowerCase();
        const pnr = String(b.pnr || b.services?.pnr || '').toLowerCase();
        const aName = String(b.assistant?.name || '').toLowerCase();
        const coach = String(b.coach || b.services?.coach || '').toLowerCase();
        const seat = String(b.seat_number || b.services?.seat_number || '').toLowerCase();

        const matchesQuery = (
          fullId.includes(cleanQ) ||
          bookingId.includes(cleanQ) ||
          shortId6.includes(cleanQ) ||
          shortId8.includes(cleanQ) ||
          startId8.includes(cleanQ) ||
          pName.includes(rawQ) ||
          pEmail.includes(rawQ) ||
          pPhone.includes(rawQ) ||
          pId.includes(cleanQ) ||
          tNo.includes(cleanQ) ||
          tName.includes(rawQ) ||
          pnr.includes(cleanQ) ||
          aName.includes(rawQ) ||
          coach.includes(cleanQ) ||
          seat.includes(cleanQ)
        );

        if (!matchesQuery) return false;

        // If explicitly searching for an ID, PNR, or phone, bypass other dropdowns so the target is never filtered out:
        const isTargetIdentifier = cleanQ.length >= 3 && (
          fullId.includes(cleanQ) ||
          bookingId.includes(cleanQ) ||
          shortId6.includes(cleanQ) ||
          shortId8.includes(cleanQ) ||
          pnr.includes(cleanQ) ||
          pPhone.includes(rawQ)
        );

        if (isTargetIdentifier) {
          return true;
        }
      }

      // 2. Station Filter
      if (selectedStation !== 'ALL' && b.station_code !== selectedStation) return false;

      // 3. Booking Status Filter
      if (selectedStatus !== 'ALL' && b.booking_status !== selectedStatus) return false;

      // 4. Payment Status Filter
      if (selectedPaymentStatus !== 'ALL' && b.payment_status !== selectedPaymentStatus) return false;

      // 5. Date Range Filter
      if (selectedDateRange === 'TODAY') {
        const todayStr = new Date().toISOString().slice(0, 10);
        if (!b.created_at?.startsWith(todayStr)) return false;
      } else if (selectedDateRange === 'WEEK') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        if (new Date(b.created_at) < sevenDaysAgo) return false;
      }

      return true;
    });
  }, [sortedBookings, selectedStation, selectedStatus, selectedPaymentStatus, selectedDateRange, filterQuery]);

  // Paginated bookings
  const paginatedBookings = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredBookings.slice(start, start + rowsPerPage);
  }, [filteredBookings, currentPage]);

  const totalPages = Math.ceil(filteredBookings.length / rowsPerPage) || 1;

  // Chart Data Preparation
  const stationChartData = useMemo(() => {
    return (stats.stationStats || []).map((s) => ({
      name: s.station,
      Bookings: s.bookings,
      Revenue: s.revenue,
    }));
  }, [stats.stationStats]);

  const statusChartData = useMemo(() => {
    const sb = stats.statusBreakdown || {};
    return Object.entries(sb).map(([k, v]) => ({
      name: k.toUpperCase(),
      count: v,
    }));
  }, [stats.statusBreakdown]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-black dark:text-white font-sans flex flex-col">
      {/* Toast feedback provider */}
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />

      {/* ── COMMAND TOPBAR ─────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-black text-white border-b border-zinc-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <Brand dark sub="Operations Hub" />
            <div className="hidden md:flex items-center gap-2 pl-3 border-l border-zinc-800 text-xs font-mono text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>SCR Telemetry Active</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Sync Timestamp */}
            <span className="text-[11px] font-mono text-zinc-400 hidden lg:inline-block">
              Synced: {lastSynced.toLocaleTimeString()}
            </span>

            {/* Manual Refresh */}
            <button
              type="button"
              onClick={() => {
                fetchAll();
                toast.success('Live data synchronized');
              }}
              title="Force Refresh Data"
              className="p-1.5 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* Full CSV Export */}
            <button
              type="button"
              onClick={exportFullLedgerCSV}
              className="btn-secondary text-xs py-1.5 px-3 bg-zinc-900 text-white border-zinc-700 hover:bg-zinc-800 flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Ledger</span>
            </button>

            {/* Admin Profile & Sign Out */}
            <div className="flex items-center gap-3 pl-3 border-l border-zinc-800">
              <span className="text-xs font-mono text-zinc-300 font-semibold hidden sm:inline-block">
                {user?.name || 'Administrator'}
              </span>
              <button
                type="button"
                onClick={logout}
                className="text-xs font-bold text-rose-400 hover:text-white transition-colors cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex overflow-x-auto gap-2 border-t border-zinc-900 text-xs font-mono">
          {[
            { id: 'bookings', label: 'Master Bookings Ledger', icon: Layers, count: bookings.length },
            { id: 'overview', label: 'Operations & Analytics', icon: TrendingUp },
            { id: 'assistants', label: 'Sahayak Force & KYC', icon: Briefcase, badge: kycQueue.length },
            { id: 'passengers', label: 'Passengers Directory', icon: Users, count: usersList.length },
            { id: 'sos', label: 'Emergency Incident SOS', icon: AlertTriangle, alert: sosAlerts.length },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-4 border-b-2 font-semibold flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? 'border-blue-500 text-white bg-zinc-900/50'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${tab.alert ? 'text-red-500 animate-pulse' : ''}`} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className="px-1.5 py-0.2 rounded-full bg-zinc-800 text-[10px] text-zinc-300 font-mono">
                    {tab.count}
                  </span>
                )}
                {tab.badge > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-blue-600 text-[10px] text-white font-mono">
                    {tab.badge}
                  </span>
                )}
                {tab.alert > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-[10px] text-white font-mono animate-pulse">
                    {tab.alert} SOS
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* ── MAIN CONTENT CONTAINER ─────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full space-y-6">

        {/* ── ACTIVE EMERGENCY SOS TICKER ─────────────────────── */}
        {sosAlerts.length > 0 && (
          <div className="bg-red-600 text-white rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-scale-in">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-white animate-ping" />
              <div>
                <h4 className="font-bold text-sm uppercase font-mono tracking-wider">
                  Urgent SOS Emergencies Active ({sosAlerts.length})
                </h4>
                <p className="text-xs text-red-100 font-mono">
                  Immediate passenger assistance required across platform transit nodes.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('sos')}
              className="btn-secondary py-1.5 px-4 text-xs bg-white text-red-700 border-white hover:bg-red-50 font-bold cursor-pointer"
            >
              Open Emergency Center ➔
            </button>
          </div>
        )}

        {/* ========================================================
            TAB 1: MASTER BOOKINGS LEDGER
            ======================================================== */}
        {activeTab === 'bookings' && (
          <div className="space-y-4 animate-fade-in">
            
            {/* Filter and Search Panel */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-black dark:text-white flex items-center gap-2">
                    <Layers className="w-5 h-5 text-blue-600" />
                    All Bookings Master Ledger
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Access 100% of telemetry, coach, seat, PNR, secret start OTP, and passenger/assistant details.
                  </p>
                </div>

                {/* Universal Search Input */}
                <div className="w-full md:w-80 relative">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by ID, passenger, phone, train, PNR..."
                    value={filterQuery}
                    onChange={(e) => {
                      setFilterQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="input-base text-xs pl-9 pr-3 py-2.5 w-full bg-zinc-50 dark:bg-zinc-950 border-zinc-300 dark:border-zinc-700"
                  />
                  {filterQuery && (
                    <button
                      type="button"
                      onClick={() => setFilterQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-black dark:hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Multi-Filter Controls */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-xs">
                
                {/* Station Filter */}
                <div>
                  <label className="text-[10px] uppercase font-mono text-zinc-400 font-bold block mb-1">
                    Station Hub
                  </label>
                  <select
                    value={selectedStation}
                    onChange={(e) => {
                      setSelectedStation(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="input-base text-xs py-1.5 bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700"
                  >
                    <option value="ALL">All Hubs (SC, BZA, KZJ, WL)</option>
                    {STATIONS.map((st) => (
                      <option key={st.code} value={st.code}>
                        {st.code} - {st.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Booking Status Filter */}
                <div>
                  <label className="text-[10px] uppercase font-mono text-zinc-400 font-bold block mb-1">
                    Booking Status
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => {
                      setSelectedStatus(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="input-base text-xs py-1.5 bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="pending">Pending Handshake</option>
                    <option value="accepted">Accepted by Sahayak</option>
                    <option value="arriving">Assistant Arriving</option>
                    <option value="in_service">In Service (OTP Verified)</option>
                    <option value="completed">Mission Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                {/* Payment Status Filter */}
                <div>
                  <label className="text-[10px] uppercase font-mono text-zinc-400 font-bold block mb-1">
                    Settlement Status
                  </label>
                  <select
                    value={selectedPaymentStatus}
                    onChange={(e) => {
                      setSelectedPaymentStatus(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="input-base text-xs py-1.5 bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700"
                  >
                    <option value="ALL">All Settlements</option>
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                    <option value="refunded">Refunded</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>

                {/* Date Filter */}
                <div>
                  <label className="text-[10px] uppercase font-mono text-zinc-400 font-bold block mb-1">
                    Date Window
                  </label>
                  <select
                    value={selectedDateRange}
                    onChange={(e) => {
                      setSelectedDateRange(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="input-base text-xs py-1.5 bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700"
                  >
                    <option value="ALL">All Time</option>
                    <option value="TODAY">Today Only</option>
                    <option value="WEEK">Last 7 Days</option>
                  </select>
                </div>

              </div>

              {/* Status Bar */}
              <div className="flex items-center justify-between text-xs text-zinc-500 font-mono pt-1">
                <span>
                  Showing {filteredBookings.length} matching missions · Total Value: ₹
                  {filteredBookings.reduce((sum, b) => sum + (Number(b.total_price) || 0), 0)}
                </span>
                {(selectedStation !== 'ALL' || selectedStatus !== 'ALL' || selectedPaymentStatus !== 'ALL' || selectedDateRange !== 'ALL' || filterQuery) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStation('ALL');
                      setSelectedStatus('ALL');
                      setSelectedPaymentStatus('ALL');
                      setSelectedDateRange('ALL');
                      setFilterQuery('');
                      toast.success('Filters cleared');
                    }}
                    className="text-blue-600 dark:text-blue-400 hover:underline text-[11px] font-bold cursor-pointer"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            </div>

            {/* Master Table */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-[10px] uppercase tracking-wider text-zinc-400 font-mono">
                      <th className="py-3 px-4 font-bold">Booking / ID</th>
                      <th className="py-3 px-4 font-bold">Passenger Details</th>
                      <th className="py-3 px-4 font-bold">Train & PNR</th>
                      <th className="py-3 px-4 font-bold">Hub & Location</th>
                      <th className="py-3 px-4 font-bold">Coach / Seat</th>
                      <th className="py-3 px-4 font-bold">Tariff & Pay</th>
                      <th className="py-3 px-4 font-bold">Status</th>
                      <th className="py-3 px-4 font-bold">Sahayak</th>
                      <th className="py-3 px-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {paginatedBookings.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-zinc-400 font-mono">
                          No matching records found for the selected criteria.
                        </td>
                      </tr>
                    ) : (
                      paginatedBookings.map((b) => (
                        <tr
                          key={b.id}
                          className="hover:bg-blue-50/40 dark:hover:bg-zinc-800/40 transition-colors group cursor-pointer"
                          onClick={() => setInspectingBooking(b)}
                        >
                          {/* 1. ID */}
                          <td className="py-3 px-4 font-mono font-semibold">
                            <span className="text-blue-600 dark:text-blue-400 font-bold block">
                              #{b.booking_id || b.id?.slice(-8).toUpperCase()}
                            </span>
                            {b.booking_id && b.id && (
                              <span className="block text-[9px] text-zinc-400 font-mono">
                                Ref: #{b.id.slice(-8).toUpperCase()}
                              </span>
                            )}
                            <span className="block text-[10px] text-zinc-400 font-normal">
                              {b.created_at ? new Date(b.created_at).toLocaleDateString() : ''} {b.created_at ? new Date(b.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </td>

                          {/* 2. Passenger */}
                          <td className="py-3 px-4">
                            <p className="font-bold text-black dark:text-white">
                              {b.passenger?.name || 'Guest'}
                            </p>
                            <p className="text-[11px] text-zinc-500 font-mono">
                              {b.passenger?.phone || b.passenger?.email || '—'}
                            </p>
                          </td>

                          {/* 3. Train & PNR */}
                          <td className="py-3 px-4 font-mono">
                            <span className="font-bold text-black dark:text-white">
                              {b.train_no || b.train_number}
                            </span>
                            <span className="block text-[10px] text-zinc-500 truncate max-w-[140px]">
                              {b.train_name}
                            </span>
                            {b.pnr && (
                              <span className="text-[9px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-1 py-0.2 rounded font-bold">
                                PNR: {b.pnr}
                              </span>
                            )}
                          </td>

                          {/* 4. Station & Platform */}
                          <td className="py-3 px-4 font-mono">
                            <span className="font-bold text-blue-600 dark:text-blue-400">
                              {b.station_code}
                            </span>
                            {b.platform && (
                              <span className="block text-[10px] text-zinc-500">
                                Pf {b.platform}
                              </span>
                            )}
                          </td>

                          {/* 5. Coach & Seat */}
                          <td className="py-3 px-4 font-mono">
                            <span className="font-bold text-black dark:text-white">
                              {b.coach || 'TBD'} - {b.seat_number || 'TBD'}
                            </span>
                            <span className="block text-[10px] text-zinc-500">
                              {b.action_type === 'collect_from_seat' ? 'De-board' : 'Board'}
                            </span>
                          </td>

                          {/* 6. Tariff & Payment */}
                          <td className="py-3 px-4 font-mono">
                            <span className="font-bold text-black dark:text-white">
                              ₹{b.total_price}
                            </span>
                            <span className={`block text-[9px] font-bold uppercase mt-0.5 px-1.5 py-0.2 rounded w-fit ${PAYMENT_COLORS[b.payment_status]}`}>
                              {b.payment_status}
                            </span>
                          </td>

                          {/* 7. Status */}
                          <td className="py-3 px-4">
                            <span className={`text-[10px] font-bold uppercase font-mono px-2 py-0.5 rounded-full border ${STATUS_COLORS[b.booking_status] || 'border-zinc-300'}`}>
                              {b.booking_status}
                            </span>
                            {b.sos_triggered && (
                              <span className="block text-[9px] font-bold text-red-600 animate-pulse mt-0.5">
                                ⚠ SOS ALERT
                              </span>
                            )}
                          </td>

                          {/* 8. Assistant */}
                          <td className="py-3 px-4">
                            {b.assistant?.name ? (
                              <div>
                                <p className="font-bold text-black dark:text-white truncate max-w-[120px]">
                                  {b.assistant.name}
                                </p>
                                <span className="text-[10px] text-zinc-500 font-mono">
                                  {b.assistant.phone || 'Assigned'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-zinc-400 italic font-mono">
                                Unassigned
                              </span>
                            )}
                          </td>

                          {/* 9. Action Button */}
                          <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => setInspectingBooking(b)}
                              className="btn-secondary py-1 px-2.5 text-[11px] flex items-center gap-1 ml-auto group-hover:border-blue-500 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 text-blue-600" />
                              <span>Inspect</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="px-6 py-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-500">
                    Page {currentPage} of {totalPages} ({filteredBookings.length} total)
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="btn-secondary py-1 px-3 text-xs disabled:opacity-40 cursor-pointer"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="btn-secondary py-1 px-3 text-xs disabled:opacity-40 cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ========================================================
            TAB 2: OPERATIONS & ANALYTICS
            ======================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* 6 Top Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'Total Bookings', value: stats.totalBookings, sub: 'All recorded jobs', action: () => { setActiveTab('bookings'); setSelectedStatus('ALL'); } },
                { label: 'Gross Revenue', value: `₹${stats.revenue || 0}`, sub: 'Settled payments', action: () => { setActiveTab('bookings'); setSelectedPaymentStatus('paid'); } },
                { label: "Today's Volume", value: stats.todayBookings || 0, sub: `₹${stats.todayRevenue || 0} today`, action: () => { setActiveTab('bookings'); setSelectedDateRange('TODAY'); } },
                { label: 'Active in Field', value: (stats.statusBreakdown?.in_service || 0) + (stats.statusBreakdown?.arriving || 0), sub: 'Live transit', action: () => { setActiveTab('bookings'); setSelectedStatus('in_service'); } },
                { label: 'Sahayaks Force', value: `${stats.onlineAssistants || 0} / ${stats.totalAssistants || 0}`, sub: 'Online / Total', action: () => setActiveTab('assistants') },
                { label: 'KYC Queue', value: stats.pendingAssistants || 0, sub: 'Awaiting ID review', action: () => setActiveTab('assistants') },
              ].map((m) => (
                <div
                  key={m.label}
                  onClick={m.action}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-xs hover:border-blue-500 cursor-pointer transition-colors group"
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono block mb-1 group-hover:text-blue-600">
                    {m.label}
                  </span>
                  <p className="text-2xl font-black font-mono text-black dark:text-white">
                    {m.value}
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-0.5 truncate">
                    {m.sub}
                  </p>
                </div>
              ))}
            </div>

            {/* Recharts Analytics Grid */}
            <div className="grid md:grid-cols-2 gap-6">
              
              {/* Station Traffic & Revenue */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-3">
                <h4 className="font-bold text-sm text-black dark:text-white font-mono flex items-center justify-between">
                  <span>Station Demand & Volume</span>
                  <span className="text-xs text-zinc-400 font-normal">Click a bar to filter</span>
                </h4>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stationChartData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} />
                      <YAxis stroke="#888888" fontSize={11} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#000000',
                          borderColor: '#333333',
                          borderRadius: '8px',
                          color: '#ffffff',
                          fontSize: '12px',
                        }}
                      />
                      <Bar
                        dataKey="Bookings"
                        fill="#2563EB"
                        radius={[4, 4, 0, 0]}
                        onClick={(entry) => {
                          if (entry?.name) {
                            setSelectedStation(entry.name);
                            setActiveTab('bookings');
                            toast.success(`Filtered to Station ${entry.name}`);
                          }
                        }}
                        className="cursor-pointer"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Status Breakdown Bar */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-3">
                <h4 className="font-bold text-sm text-black dark:text-white font-mono flex items-center justify-between">
                  <span>Mission Status Distribution</span>
                  <span className="text-xs text-zinc-400 font-normal">Live platform states</span>
                </h4>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis type="number" stroke="#888888" fontSize={11} tickLine={false} />
                      <YAxis dataKey="name" type="category" stroke="#888888" fontSize={10} tickLine={false} width={80} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#000000',
                          borderColor: '#333333',
                          borderRadius: '8px',
                          color: '#ffffff',
                          fontSize: '12px',
                        }}
                      />
                      <Bar
                        dataKey="count"
                        fill="#10B981"
                        radius={[0, 4, 4, 0]}
                        onClick={(entry) => {
                          if (entry?.name) {
                            setSelectedStatus(entry.name.toLowerCase());
                            setActiveTab('bookings');
                            toast.success(`Filtered to status ${entry.name}`);
                          }
                        }}
                        className="cursor-pointer"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ========================================================
            TAB 3: ASSISTANT FORCE & KYC
            ======================================================== */}
        {activeTab === 'assistants' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* KYC Applications Queue */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-black dark:text-white flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-blue-600" />
                    Sahayak KYC Verification Queue
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Review and verify incoming railway porter applicants before platform activation.
                  </p>
                </div>
                <span className="badge-blue text-xs">
                  {kycQueue.length} Pending
                </span>
              </div>

              {kycQueue.length === 0 ? (
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center text-xs text-zinc-400 font-mono">
                  KYC queue is clear. No pending applicant registrations.
                </div>
              ) : (
                <div className="space-y-3">
                  {kycQueue.map((app) => (
                    <KycQueueCard
                      key={app.id}
                      applicant={app}
                      onDecide={handleDecideAssistant}
                      actionLoading={actionLoading}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Active Assistants Roster with Action Controls */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-black dark:text-white">
                    Registered Sahayak Fleet ({assistantsList.length})
                  </h4>
                  <p className="text-xs text-zinc-500">
                    Manage active assistants across Secunderabad, Vijayawada, Kazipet, and Warangal hubs.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[10px] uppercase tracking-wider text-zinc-400 font-mono">
                      <th className="pb-3">Sahayak Name</th>
                      <th className="pb-3">Station Hub</th>
                      <th className="pb-3">Contact</th>
                      <th className="pb-3">Approval Status</th>
                      <th className="pb-3">Duty State</th>
                      <th className="pb-3">Missions</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-mono">
                    {assistantsList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-zinc-400 font-mono">
                          No registered assistants found.
                        </td>
                      </tr>
                    ) : (
                      assistantsList.map((ast) => (
                        <tr key={ast.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                          <td className="py-3 font-bold text-black dark:text-white font-sans">
                            {ast.name}
                          </td>
                          <td className="py-3 font-bold text-blue-600 dark:text-blue-400">
                            {ast.station_code}
                          </td>
                          <td className="py-3 text-zinc-500">
                            {ast.phone || ast.email}
                          </td>
                          <td className="py-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ast.is_approved ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800'}`}>
                              {ast.is_approved ? 'Approved' : 'Pending'}
                            </span>
                          </td>
                          <td className="py-3">
                            <span className="flex items-center gap-1.5 text-[11px]">
                              <span className={`w-2 h-2 rounded-full ${ast.is_online ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}`} />
                              {ast.is_online ? 'Online (On-Duty)' : 'Offline'}
                            </span>
                          </td>
                          <td className="py-3 font-bold">
                            {ast.completed_missions || 0} trips
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Toggle duty status button */}
                              <button
                                type="button"
                                onClick={() => handleToggleAssistantOnline(ast)}
                                title={ast.is_online ? 'Set Offline' : 'Set Online'}
                                className={`p-1.5 rounded-md border text-[11px] font-bold cursor-pointer transition-colors ${
                                  ast.is_online
                                    ? 'bg-zinc-100 text-zinc-700 border-zinc-300 hover:bg-zinc-200'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                                }`}
                              >
                                <Power className="w-3.5 h-3.5" />
                              </button>

                              {/* Toggle approval status button */}
                              <button
                                type="button"
                                onClick={() => handleToggleAssistantApproval(ast)}
                                title={ast.is_approved ? 'Suspend Assistant' : 'Approve Assistant'}
                                className={`p-1.5 rounded-md border text-[11px] font-bold cursor-pointer transition-colors ${
                                  ast.is_approved
                                    ? 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                                    : 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100'
                                }`}
                              >
                                {ast.is_approved ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                              </button>

                              {/* Filter to assistant missions */}
                              <button
                                type="button"
                                onClick={() => handleFilterToAssistant(ast.name)}
                                title="View All Missions for this Assistant"
                                className="btn-secondary py-1 px-2 text-[10px] cursor-pointer"
                              >
                                View Trips
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================
            TAB 4: PASSENGERS DIRECTORY
            ======================================================== */}
        {activeTab === 'passengers' && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-black dark:text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  Registered Passengers Directory ({usersList.length})
                </h3>
                <p className="text-xs text-zinc-500">
                  Comprehensive register of all platform travelers, booking frequencies, and contact profiles.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[10px] uppercase tracking-wider text-zinc-400 font-mono">
                    <th className="pb-3">Passenger</th>
                    <th className="pb-3">Email Address</th>
                    <th className="pb-3">Phone</th>
                    <th className="pb-3">Role</th>
                    <th className="pb-3">Joined Date</th>
                    <th className="pb-3">Total Bookings</th>
                    <th className="pb-3">Lifetime Spend</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-mono">
                  {usersList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-zinc-400 font-mono">
                        No registered users found.
                      </td>
                    </tr>
                  ) : (
                    usersList.map((u) => (
                      <tr key={u.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                        <td className="py-3 font-bold font-sans text-black dark:text-white">
                          {u.name}
                        </td>
                        <td className="py-3 text-zinc-500">
                          {u.email}
                        </td>
                        <td className="py-3 text-zinc-500">
                          {u.phone ? (
                            <a href={`tel:${u.phone}`} className="hover:underline text-blue-600">
                              {u.phone}
                            </a>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-3 uppercase text-[10px] font-bold">
                          <span className={`px-2 py-0.5 rounded-md ${u.role === 'admin' ? 'bg-black text-white' : 'bg-blue-50 text-blue-700'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 text-zinc-400 text-[11px]">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 font-bold text-black dark:text-white">
                          {u.bookings_count || 0}
                        </td>
                        <td className="py-3 font-bold text-emerald-600">
                          ₹{u.total_spent || 0}
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleFilterToPassenger(u.name || u.email)}
                              className="btn-secondary py-1 px-2.5 text-[10px] cursor-pointer"
                            >
                              View Trips
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 5: EMERGENCY SOS CENTER
            ======================================================== */}
        {activeTab === 'sos' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-black dark:text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600 animate-pulse" />
                  Emergency Incident Command Center
                </h3>
                <p className="text-xs text-zinc-500">
                  Live dispatch monitoring for emergency alerts triggered by passengers or sahayaks.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-red-600 bg-red-50 dark:bg-red-950/60 px-3 py-1 rounded-full border border-red-200 dark:border-red-800">
                {sosAlerts.length} Active Emergencies
              </span>
            </div>

            {sosAlerts.length === 0 ? (
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center space-y-2">
                <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
                <h4 className="font-bold text-sm text-black dark:text-white">
                  Station Network Secure
                </h4>
                <p className="text-xs text-zinc-500 font-mono">
                  No active SOS incidents or distress signals across all South Central Railway nodes.
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {sosAlerts.map((sos) => (
                  <div
                    key={sos.id}
                    className="bg-red-50/70 dark:bg-red-950/40 border-2 border-red-500 rounded-2xl p-5 shadow-lg space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
                        <h4 className="font-bold text-sm text-red-800 dark:text-red-300 font-mono uppercase">
                          Distress Signal · Station {sos.station_code}
                        </h4>
                      </div>
                      <span className="text-[10px] font-mono font-bold bg-red-600 text-white px-2 py-0.5 rounded">
                        #{sos.booking_id?.slice(-6).toUpperCase()}
                      </span>
                    </div>

                    <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl space-y-2 text-xs font-mono">
                      <p className="text-zinc-600 dark:text-zinc-300">
                        Passenger: <strong className="text-black dark:text-white">{sos.passenger?.name || 'Guest'}</strong>
                      </p>
                      <p className="text-zinc-600 dark:text-zinc-300">
                        Train: <strong>{sos.train_no || sos.train_number}</strong> ({sos.train_name})
                      </p>
                      <p className="text-zinc-600 dark:text-zinc-300">
                        Location: <strong>Coach {sos.coach || 'TBD'} · Seat {sos.seat_number || 'TBD'}</strong>
                      </p>
                      {sos.passenger?.phone && (
                        <p className="text-blue-600 dark:text-blue-400 font-bold">
                          Contact: <a href={`tel:${sos.passenger.phone}`}>{sos.passenger.phone}</a>
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setInspectingBooking(sos)}
                        className="btn-secondary flex-1 py-2 text-xs cursor-pointer"
                      >
                        Inspect Full Mission
                      </button>
                      <button
                        type="button"
                        onClick={() => handleResolveEmergency(sos.id)}
                        className="btn-primary flex-1 py-2 text-xs bg-red-600 hover:bg-red-700 text-white cursor-pointer"
                      >
                        Resolve & Clear Alert
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>

      {/* ── DETAIL INSPECTOR MODAL ─────────────────────────────── */}
      {inspectingBooking && (
        <BookingDetailModal
          booking={inspectingBooking}
          onClose={handleCloseInspector}
          onUpdate={handleUpdateBooking}
          assistants={assistantsList}
        />
      )}

    </div>
  );
}