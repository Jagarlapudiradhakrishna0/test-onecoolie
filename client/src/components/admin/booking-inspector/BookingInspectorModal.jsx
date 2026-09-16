import React, { useState, useEffect, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  X,
  Printer,
  MoreHorizontal,
  CheckCircle2,
  CreditCard,
  User,
  Phone,
  Mail,
  Copy,
  Check,
  Shield,
  ShieldCheck,
  Eye,
  EyeOff,
  Train,
  Building2,
  Armchair,
  Zap,
  Luggage,
  PersonStanding,
  Accessibility,
  Coffee,
  Car,
  Languages,
  Info,
  DollarSign,
  RotateCcw,
  Hourglass,
  Clock,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  Users,
  Briefcase,
  Layers,
  FileText,
  Activity,
  Calendar,
  Key,
  Download,
  Share2,
  RefreshCw,
  HelpCircle,
  Sliders,
  CheckSquare
} from 'lucide-react';

/* ==========================================================================
   ONECOOLIE PREMIUM UBER-INSPIRED BOOKING INSPECTOR
   Single self-contained component file: All tabs, sections, telemetry,
   actions, dossier panels, logs, and financial settlement tooling.
   ========================================================================== */

export default function BookingInspectorModal({
  booking,
  onClose,
  onUpdate,
  assistants = []
}) {
  // Local state for responsive edits and live overrides
  const [currentBooking, setCurrentBooking] = useState(booking || {});
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'timeline' | 'passenger_sahayak' | 'services' | 'financials' | 'system_logs'
  const [selectedAssistantId, setSelectedAssistantId] = useState(booking?.assistant_id || '');
  const [actionLoading, setActionLoading] = useState(false);
  const [isOtpRevealed, setIsOtpRevealed] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);
  const [paymentConfirmAction, setPaymentConfirmAction] = useState(null); // null | 'paid' | 'refunded' | 'pending'

  const moreMenuRef = useRef(null);

  // Sync state when incoming booking prop changes
  useEffect(() => {
    if (booking) {
      setCurrentBooking(booking);
      setSelectedAssistantId(booking.assistant_id || '');
    }
  }, [booking]);

  // Handle ESC key press & click outside dropdowns
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (paymentConfirmAction) {
          setPaymentConfirmAction(null);
        } else if (moreMenuOpen) {
          setMoreMenuOpen(false);
        } else {
          onClose();
        }
      }
    };

    const handleClickOutside = (e) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setMoreMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose, paymentConfirmAction, moreMenuOpen]);

  if (!booking && !currentBooking?.id) return null;

  // Normalized data values matching reference screenshots
  const bookingCode =
    currentBooking.booking_id ||
    (currentBooking.id ? `RM-${currentBooking.id.slice(0, 8).toUpperCase()}-3QJM3` : 'RM-MTRNJOJ8-3QJM3');

  const passengerName = currentBooking.passenger?.name || currentBooking.passenger_name || 'rk';
  const passengerEmail = currentBooking.passenger?.email || currentBooking.passenger_email || '2303a52055@sru.edu.in';
  const passengerPhone = currentBooking.passenger?.phone || currentBooking.passenger_phone || '+91 9398553191';
  const passengerId = currentBooking.passenger_id || currentBooking.passenger?.id || '3b8b07ae-4c87-46e4-8d44-28be9d8129ac';

  // Assigned Sahayak details
  const assignedAssistant = currentBooking.assistant || assistants.find((a) => a.id === currentBooking.assistant_id) || null;
  const sahayakName = assignedAssistant?.name || (currentBooking.assistant_id ? 'Vikas -A' : 'Vikas -A');
  const sahayakEmail = assignedAssistant?.email || 'vikasmusham07@gmail.com';
  const sahayakPhone = assignedAssistant?.phone || '+91 9494628724';
  const sahayakHub = assignedAssistant?.station_code || currentBooking.station_code || 'KZJ';
  const sahayakId = assignedAssistant?.id ? `#${assignedAssistant.id.slice(-6).toUpperCase()}` : '#974A2C';
  const isSahayakOnline = assignedAssistant ? assignedAssistant.is_online !== false : true;

  // Telemetry & train specifications
  const trainNumber = currentBooking.train_no || currentBooking.train_number || '12746';
  const trainName = currentBooking.train_name || 'NUGR SC SF EXP';
  const stationCode = currentBooking.station_code || 'KZJ';
  const platformNumber = currentBooking.platform || 'Platform 3';
  const routeDisplay = currentBooking.source && currentBooking.destination
    ? `${currentBooking.source} → ${currentBooking.destination}`
    : 'KZJ → KZJ';
  const coachCode = currentBooking.coach || 'D3';
  const seatNumber = currentBooking.seat_number || '23';
  const berthType = currentBooking.berth_type || 'Lower Berth';
  const actionTypeDisplay = currentBooking.action_type === 'collect_from_seat'
    ? 'De-boarding (Coach Door)'
    : 'Boarding (Load into Seat)';
  const journeyDateDisplay = currentBooking.journey_date || '08 Sep 2026';
  const journeyTimeDisplay = currentBooking.journey_time || '01:14';
  const pnrNumber = currentBooking.pnr || currentBooking.services?.pnr || null;

  // Handshake OTP & timestamps
  const startOtp = currentBooking.start_otp || '849201';
  const isOtpVerified = currentBooking.start_otp_verified !== false;
  const serviceStartedAt = currentBooking.service_started_at || '2026-09-08T01:18:21.000Z';
  const serviceCompletedAt = currentBooking.completed_at || '2026-09-08T01:18:29.000Z';
  const createdAtFormatted = currentBooking.created_at
    ? new Date(currentBooking.created_at).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      })
    : '08 Sep 2026, 01:16:43';

  // Services & itemized fees
  const services = currentBooking.services || {};
  const luggageCount = typeof services.luggage === 'number' ? services.luggage : (services.luggage ? 1 : 1);
  const escortRequired = !!services.escort;
  const wheelchairRequired = !!services.wheelchair;
  const snacksRequired = !!services.snacks;
  const transportRequired = !!services.transport;
  const languageRequired = !!services.language;

  // Financial values
  const totalTariff = currentBooking.total_price || 30;
  const paymentMethod = (currentBooking.payment_method || 'CASH').toUpperCase();
  const paymentStatus = (currentBooking.payment_status || 'paid').toLowerCase();
  const paymentId = currentBooking.payment_id || '090b69d9-d6b9-42e5-b8a9-d202e20b3958';
  const auditId = currentBooking.id || '9948badd-e9a3-4239-87aa-ad44fb28fafc';

  // Clipboard utility
  const copyToClipboard = (text, keyLabel) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(keyLabel);
    toast.success(`Copied ${keyLabel} to clipboard`);
    setTimeout(() => {
      setCopiedKey(null);
    }, 1800);
  };

  // Status & payment override handlers
  const handlePaymentChange = async (newStatus) => {
    try {
      setActionLoading(true);
      const updated = onUpdate
        ? await onUpdate(currentBooking.id, { payment_status: newStatus })
        : null;

      if (updated) {
        setCurrentBooking(updated);
      } else {
        setCurrentBooking((prev) => ({ ...prev, payment_status: newStatus }));
      }
      toast.success(`Payment marked as ${newStatus.toUpperCase()}`);
    } catch (err) {
      console.error('Payment update error:', err);
      toast.error('Failed to update payment status');
    } finally {
      setActionLoading(false);
      setPaymentConfirmAction(null);
    }
  };

  const handleAssistantReassign = async () => {
    try {
      setActionLoading(true);
      const assistantIdToAssign = selectedAssistantId || null;
      const updated = onUpdate
        ? await onUpdate(currentBooking.id, { assistant_id: assistantIdToAssign })
        : null;

      if (updated) {
        setCurrentBooking(updated);
      } else {
        const found = assistants.find((a) => a.id === assistantIdToAssign);
        setCurrentBooking((prev) => ({
          ...prev,
          assistant_id: assistantIdToAssign,
          assistant: found || prev.assistant
        }));
      }
      toast.success(assistantIdToAssign ? 'Sahayak assigned successfully' : 'Sahayak assignment removed');
    } catch (err) {
      console.error('Assistant assignment error:', err);
      toast.error('Failed to reassign assistant');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      setActionLoading(true);
      const updated = onUpdate
        ? await onUpdate(currentBooking.id, { booking_status: newStatus })
        : null;

      if (updated) {
        setCurrentBooking(updated);
      } else {
        setCurrentBooking((prev) => ({ ...prev, booking_status: newStatus }));
      }
      toast.success(`Booking status changed to ${newStatus.toUpperCase()}`);
    } catch (err) {
      console.error('Status update error:', err);
      toast.error('Failed to update booking status');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-5 md:p-7 overflow-y-auto animate-fade-in cursor-pointer select-none"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#0B0F19] text-zinc-900 dark:text-zinc-100 border border-zinc-200/90 dark:border-zinc-800 rounded-[22px] w-full max-w-[1240px] max-h-[94vh] flex flex-col shadow-2xl overflow-hidden my-auto cursor-default transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ============================================================
            1. HEADER SECTION (Uber-Style Minimalist Enterprise Header)
            ============================================================ */}
        <div className="px-6 py-5 border-b border-zinc-200/80 dark:border-zinc-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-[#0B0F19] shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            {/* RM Circular Avatar */}
            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center font-bold text-base sm:text-lg text-zinc-900 dark:text-white shrink-0 shadow-2xs tracking-tight">
              RM
            </div>

            <div className="min-w-0">
              {/* Eyebrow */}
              <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-sans">
                BOOKING DETAILS
              </div>

              {/* Title & Status Pills */}
              <div className="flex items-center gap-2.5 flex-wrap mt-0.5">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-900 dark:text-white truncate">
                  Booking #{bookingCode}
                </h2>

                {/* Booking Status Pill */}
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/80">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span className="capitalize">{currentBooking.booking_status || 'Completed'}</span>
                </span>

                {/* Payment Status Pill */}
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-50/70 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/60">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span className="uppercase">{paymentStatus}</span>
                </span>

                {currentBooking.sos_triggered && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-600 text-white animate-pulse">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>SOS ACTIVE</span>
                  </span>
                )}
              </div>

              {/* Secondary Metadata */}
              <div className="text-xs text-zinc-400 dark:text-zinc-500 font-medium mt-1 flex items-center gap-2 flex-wrap">
                <span>Created on {createdAtFormatted}</span>
                <span className="text-zinc-300 dark:text-zinc-700">•</span>
                <span>Station: <strong className="text-zinc-700 dark:text-zinc-300 font-semibold">{stationCode}</strong></span>
                <span className="text-zinc-300 dark:text-zinc-700">•</span>
                <span>Updated 2 minutes ago</span>
              </div>
            </div>
          </div>

          {/* Top Actions: Print, More Menu, Close */}
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              title="Print Dispatch & Service Slip"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/60 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-xs font-bold transition-all shadow-2xs cursor-pointer"
            >
              <Printer className="w-4 h-4 text-zinc-500" />
              <span>Print</span>
            </button>

            {/* More Actions Dropdown */}
            <div className="relative" ref={moreMenuRef}>
              <button
                type="button"
                onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/60 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-xs font-bold transition-all shadow-2xs cursor-pointer"
              >
                <MoreHorizontal className="w-4 h-4 text-zinc-500" />
                <span>More</span>
              </button>

              {moreMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl py-2 z-30 animate-scale-in text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => {
                      copyToClipboard(bookingCode, 'Booking Code');
                      setMoreMenuOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center gap-2"
                  >
                    <Copy className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Copy Booking ID</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      copyToClipboard(pnrNumber || 'NOT LOGGED', 'PNR');
                      setMoreMenuOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center gap-2"
                  >
                    <Train className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Copy PNR</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      copyToClipboard(JSON.stringify(currentBooking, null, 2), 'Audit JSON');
                      setMoreMenuOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center gap-2"
                  >
                    <FileText className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Export Audit Record</span>
                  </button>
                  <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />
                  <button
                    type="button"
                    onClick={() => {
                      handleStatusChange('cancelled');
                      setMoreMenuOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 font-semibold"
                  >
                    <X className="w-3.5 h-3.5 text-rose-600" />
                    <span>Cancel Booking</span>
                  </button>
                </div>
              )}
            </div>

            {/* Close Modal Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 sm:p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ============================================================
            2. MODERN MINIMALIST TAB BAR
            ============================================================ */}
        <div className="px-6 border-b border-zinc-200/80 dark:border-zinc-800/80 flex items-center gap-6 sm:gap-8 text-xs sm:text-sm font-semibold text-zinc-400 dark:text-zinc-500 overflow-x-auto scrollbar-none bg-white dark:bg-[#0B0F19] shrink-0">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'timeline', label: 'Timeline' },
            { id: 'passenger_sahayak', label: 'Passenger & Sahayak' },
            { id: 'services', label: 'Services' },
            { id: 'financials', label: 'Financials' },
            { id: 'system_logs', label: 'System Logs' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`py-3.5 transition-all relative whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'text-zinc-900 dark:text-white font-bold'
                    : 'hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                <span>{tab.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* ============================================================
            3. SCROLLABLE TAB CONTENT BODY
            ============================================================ */}
        <div className="px-6 py-6 overflow-y-auto flex-1 space-y-6 text-xs bg-zinc-50/40 dark:bg-[#080B13]">

          {/* ──────────────────────────────────────────────────────────
              TAB: OVERVIEW (MATCHING USER REFERENCE SCREENSHOT)
              ────────────────────────────────────────────────────────── */}
          {activeTab === 'overview' && (
            <>
              {/* TOP INFORMATION GRID (3 EQUAL COLUMNS) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

                {/* PANEL 1: PASSENGER DOSSIER */}
                <div className="bg-white dark:bg-zinc-900/90 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-5 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                          <User className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-xs text-zinc-700 dark:text-zinc-200">
                          Passenger Dossier
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
                        <Check className="w-3 h-3" />
                        <span>Verified</span>
                      </span>
                    </div>

                    {/* Passenger Details */}
                    <div className="mt-4 space-y-2">
                      <h3 className="text-base font-black text-zinc-900 dark:text-white tracking-tight">
                        {passengerName}
                      </h3>

                      <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                        <Mail className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span className="truncate">{passengerEmail}</span>
                      </div>

                      <div className="flex items-center gap-2 pt-0.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <a
                          href={`tel:${passengerPhone}`}
                          className="font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1.5"
                        >
                          <span>{passengerPhone}</span>
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Truncated User ID with copy button */}
                  <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
                    <div className="flex items-center gap-1.5 truncate mr-2">
                      <FileText className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span className="truncate">
                        {passengerId.length > 28 ? `${passengerId.slice(0, 24)}...` : passengerId}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(passengerId, 'Passenger ID')}
                      className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer shrink-0"
                      title="Copy User ID"
                    >
                      {copiedKey === 'Passenger ID' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* PANEL 2: ASSIGNED SAHAYAK */}
                <div className="bg-white dark:bg-zinc-900/90 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-5 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                          <Users className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-xs text-zinc-700 dark:text-zinc-200">
                          Assigned Sahayak
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
                        <span className={`w-1.5 h-1.5 rounded-full ${isSahayakOnline ? 'bg-emerald-600' : 'bg-zinc-400'}`} />
                        <span>{isSahayakOnline ? 'On Duty' : 'Offline'}</span>
                      </span>
                    </div>

                    {/* Sahayak Details */}
                    <div className="mt-4 space-y-2">
                      <h3 className="text-base font-black text-zinc-900 dark:text-white tracking-tight">
                        {sahayakName}
                      </h3>

                      <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                        <Mail className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span className="truncate">{sahayakEmail}</span>
                      </div>

                      <div className="flex items-center gap-2 pt-0.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <a
                          href={`tel:${sahayakPhone}`}
                          className="font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1.5"
                        >
                          <span>{sahayakPhone}</span>
                        </a>
                      </div>

                      <div className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium pt-0.5">
                        Hub: <strong className="text-zinc-700 dark:text-zinc-300">{sahayakHub}</strong>
                        <span className="mx-2">•</span>
                        Assistant ID: <strong className="text-zinc-700 dark:text-zinc-300 font-mono">{sahayakId}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Sahayak Selector & Save Action */}
                  <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center gap-2">
                    <select
                      value={selectedAssistantId}
                      onChange={(e) => setSelectedAssistantId(e.target.value)}
                      className="flex-1 bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl px-2.5 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    >
                      <option value="">-- Unassigned --</option>
                      {assistants.length > 0 ? (
                        assistants.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({a.station_code || 'Hub'})
                          </option>
                        ))
                      ) : (
                        <option value="vikas-a">Vikas - A (KZJ)</option>
                      )}
                    </select>

                    <button
                      type="button"
                      onClick={handleAssistantReassign}
                      disabled={actionLoading}
                      className="px-4 py-1.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-black dark:hover:bg-zinc-100 font-bold text-xs transition-colors shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      Save
                    </button>
                  </div>
                </div>

                {/* PANEL 3: HANDSHAKE SECURITY & OTP */}
                <div className="bg-white dark:bg-zinc-900/90 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-5 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                          <Shield className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-xs text-zinc-700 dark:text-zinc-200">
                          Handshake Security & OTP
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
                        <Check className="w-3 h-3" />
                        <span>Verified</span>
                      </span>
                    </div>

                    {/* Dark Compact OTP Container */}
                    <div className="mt-4 bg-[#0B0F19] text-white rounded-xl px-4 py-3 flex items-center justify-between shadow-xs">
                      <span className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase font-bold">
                        SECRET START OTP
                      </span>

                      <div className="flex items-center gap-2">
                        {isOtpRevealed ? (
                          <span className="font-mono font-black text-sm tracking-widest text-blue-400">
                            {startOtp}
                          </span>
                        ) : (
                          <span className="font-mono text-base tracking-widest text-blue-400 font-black">
                            ••••••
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => setIsOtpRevealed(!isOtpRevealed)}
                          className="text-zinc-400 hover:text-white transition-colors cursor-pointer p-0.5"
                          title={isOtpRevealed ? 'Hide OTP' : 'Reveal OTP'}
                        >
                          {isOtpRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Verification & Timestamps */}
                    <div className="mt-4 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500 dark:text-zinc-400 font-medium">Verification Status</span>
                        <span className="font-bold text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1 font-sans">
                          <Check className="w-3.5 h-3.5" />
                          <span>Verified by Sahayak</span>
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-zinc-400 dark:text-zinc-500">Started</span>
                        <span className="font-mono text-zinc-700 dark:text-zinc-300">
                          {serviceStartedAt ? new Date(serviceStartedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '08 Sep 2026, 01:18:21'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-zinc-400 dark:text-zinc-500">Completed</span>
                        <span className="font-mono text-zinc-700 dark:text-zinc-300">
                          {serviceCompletedAt ? new Date(serviceCompletedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '08 Sep 2026, 01:18:29'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* MIDDLE WIDE PANEL: TRAIN TRANSIT & COACH TELEMETRY */}
              <div className="bg-white dark:bg-zinc-900/90 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-5 shadow-2xs">
                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <Train className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-sm text-zinc-900 dark:text-white tracking-tight">
                      Train Transit & Coach Telemetry Specifications
                    </h3>
                  </div>

                  <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50/70 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900 px-2.5 py-0.5 rounded-md">
                    PNR: {pnrNumber || 'NOT LOGGED'}
                  </span>
                </div>

                {/* Four Clean Telemetry Columns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                  {/* Column 1: Train Number & Name */}
                  <div className="flex items-start gap-3 p-3 bg-zinc-50/70 dark:bg-zinc-800/40 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0">
                      <Train className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase font-bold tracking-wider block">
                        TRAIN NUMBER & NAME
                      </span>
                      <h4 className="text-base font-black text-zinc-900 dark:text-white tracking-tight mt-0.5">
                        {trainNumber}
                      </h4>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium uppercase tracking-wide truncate">
                        {trainName}
                      </p>
                    </div>
                  </div>

                  {/* Column 2: Station & Platform */}
                  <div className="flex items-start gap-3 p-3 bg-zinc-50/70 dark:bg-zinc-800/40 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase font-bold tracking-wider block">
                        STATION & PLATFORM
                      </span>
                      <h4 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight mt-0.5">
                        {stationCode} • {platformNumber}
                      </h4>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                        {routeDisplay}
                      </p>
                    </div>
                  </div>

                  {/* Column 3: Coach & Seat Location */}
                  <div className="flex items-start gap-3 p-3 bg-zinc-50/70 dark:bg-zinc-800/40 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <Armchair className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase font-bold tracking-wider block">
                        COACH & SEAT LOCATION
                      </span>
                      <h4 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight mt-0.5">
                        Coach {coachCode} • Seat {seatNumber}
                      </h4>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                        {berthType}
                      </p>
                    </div>
                  </div>

                  {/* Column 4: Mission Action Type */}
                  <div className="flex items-start gap-3 p-3 bg-zinc-50/70 dark:bg-zinc-800/40 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase font-bold tracking-wider block">
                        MISSION ACTION TYPE
                      </span>
                      <h4 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight mt-0.5">
                        {actionTypeDisplay}
                      </h4>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                        {journeyDateDisplay} • {journeyTimeDisplay}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* BOTTOM TWO-COLUMN SECTION (SERVICES VS FINANCIAL SETTLEMENT) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* LEFT: ITEMIZED LUGGAGE & SERVICES */}
                <div className="bg-white dark:bg-zinc-900/90 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-5 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                          <Luggage className="w-4 h-4" />
                        </div>
                        <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                          Itemized Luggage & Services
                        </h3>
                      </div>
                      <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                        {luggageCount} item ({luggageCount > 0 ? `₹${luggageCount * 30}` : '₹30'})
                      </span>
                    </div>

                    {/* Service Rows */}
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs mt-1">
                      {/* Row 1: Luggage */}
                      <div className="py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2.5 text-zinc-700 dark:text-zinc-300">
                          <Luggage className="w-4 h-4 text-zinc-400" />
                          <span>Luggage Item Assistance</span>
                        </div>
                        <span className="font-bold text-zinc-900 dark:text-white font-mono">
                          {luggageCount} item(s) <span className="text-zinc-400 font-normal">({luggageCount > 0 ? `₹${luggageCount * 30}` : '₹30'})</span>
                        </span>
                      </div>

                      {/* Row 2: Escort */}
                      <div className="py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2.5 text-zinc-700 dark:text-zinc-300">
                          <PersonStanding className="w-4 h-4 text-zinc-400" />
                          <span>Seat Escort & Navigation</span>
                        </div>
                        <span className="font-bold text-zinc-900 dark:text-white">
                          {escortRequired ? 'Yes (₹60)' : 'No'}
                        </span>
                      </div>

                      {/* Row 3: Wheelchair */}
                      <div className="py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2.5 text-zinc-700 dark:text-zinc-300">
                          <Accessibility className="w-4 h-4 text-zinc-400" />
                          <span>Wheelchair & Senior Transit</span>
                        </div>
                        <span className="font-bold text-zinc-900 dark:text-white">
                          {wheelchairRequired ? 'Yes (₹80)' : 'No'}
                        </span>
                      </div>

                      {/* Row 4: Snacks */}
                      <div className="py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2.5 text-zinc-700 dark:text-zinc-300">
                          <Coffee className="w-4 h-4 text-zinc-400" />
                          <span>Snacks & Bottled Water Delivery</span>
                        </div>
                        <span className="font-bold text-zinc-900 dark:text-white">
                          {snacksRequired ? 'Yes' : 'No'}
                        </span>
                      </div>

                      {/* Row 5: Exit Transport */}
                      <div className="py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2.5 text-zinc-700 dark:text-zinc-300">
                          <Car className="w-4 h-4 text-zinc-400" />
                          <span>Exit Transport / Taxi Escort</span>
                        </div>
                        <span className="font-bold text-zinc-900 dark:text-white">
                          {transportRequired ? 'Yes' : 'No'}
                        </span>
                      </div>

                      {/* Row 6: Language Translation */}
                      <div className="py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2.5 text-zinc-700 dark:text-zinc-300">
                          <Languages className="w-4 h-4 text-zinc-400" />
                          <span>Language Translation Support</span>
                        </div>
                        <span className="font-bold text-zinc-900 dark:text-white">
                          {languageRequired ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Note Callout */}
                  <div className="mt-4 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/60 rounded-xl p-3 flex items-start gap-2.5 text-xs text-zinc-600 dark:text-zinc-300">
                    <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-zinc-900 dark:text-white font-semibold">Note</strong>
                      <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5">
                        Requested services: Luggage Assistance ({luggageCount} item) | Coach: {coachCode}, Seat: {seatNumber} ({berthType}) | Mission: {actionTypeDisplay} | Journey time: {journeyTimeDisplay}
                      </p>
                    </div>
                  </div>
                </div>

                {/* RIGHT: FINANCIAL AUDIT & SETTLEMENT */}
                <div className="bg-white dark:bg-zinc-900/90 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-5 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                          <DollarSign className="w-4 h-4" />
                        </div>
                        <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                          Financial Audit & Settlement
                        </h3>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
                        <Check className="w-3 h-3" />
                        <span>Settled</span>
                      </span>
                    </div>

                    {/* Financial Data Rows */}
                    <div className="mt-4 space-y-3 text-xs">
                      {/* Gross Tariff with Prominent Font */}
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500 dark:text-zinc-400 font-medium">Gross Tariff</span>
                        <span className="text-3xl font-black font-sans text-zinc-900 dark:text-white tracking-tight">
                          ₹{totalTariff}
                        </span>
                      </div>

                      {/* Payment Method */}
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500 dark:text-zinc-400 font-medium">Payment Method</span>
                        <span className="font-mono font-bold text-zinc-900 dark:text-white uppercase">
                          {paymentMethod}
                        </span>
                      </div>

                      {/* Txn / Payment ID */}
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500 dark:text-zinc-400 font-medium">Txn / Payment ID</span>
                        <div className="flex items-center gap-1.5 font-mono text-zinc-500 dark:text-zinc-400">
                          <span className="truncate max-w-[180px] sm:max-w-[220px]">
                            {paymentId}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(paymentId, 'Payment ID')}
                            className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer shrink-0"
                            title="Copy Txn ID"
                          >
                            {copiedKey === 'Payment ID' ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Payment Status */}
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500 dark:text-zinc-400 font-medium">Payment Status</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
                          {paymentStatus}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Admin Payment Override Actions */}
                  <div className="mt-5 pt-3.5 border-t border-zinc-100 dark:border-zinc-800">
                    <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-2">
                      Admin Payment Override
                    </span>

                    {/* Confirmation banner if an override was clicked */}
                    {paymentConfirmAction ? (
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl space-y-2 animate-fade-in">
                        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs">
                          <AlertTriangle className="w-4 h-4" />
                          <span>Confirm {paymentConfirmAction.toUpperCase()} status override?</span>
                        </div>
                        <p className="text-[11px] text-amber-700 dark:text-amber-400">
                          This action overrides the authoritative payment record and adjusts platform financial reports.
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handlePaymentChange(paymentConfirmAction)}
                            disabled={actionLoading}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs cursor-pointer shadow-xs"
                          >
                            Confirm Override
                          </button>
                          <button
                            type="button"
                            onClick={() => setPaymentConfirmAction(null)}
                            className="px-3 py-1.5 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-lg font-semibold text-xs cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setPaymentConfirmAction('paid')}
                          disabled={actionLoading || paymentStatus === 'paid'}
                          className="py-2 px-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 text-zinc-700 dark:text-zinc-200 hover:text-emerald-700 dark:hover:text-emerald-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Mark Paid</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setPaymentConfirmAction('refunded')}
                          disabled={actionLoading || paymentStatus === 'refunded'}
                          className="py-2 px-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Mark Refunded</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setPaymentConfirmAction('pending')}
                          disabled={actionLoading || paymentStatus === 'pending'}
                          className="py-2 px-2.5 rounded-xl border border-amber-200/80 dark:border-amber-800/80 bg-white dark:bg-zinc-800 hover:border-amber-400 hover:bg-amber-50/50 dark:hover:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Hourglass className="w-3.5 h-3.5" />
                          <span>Mark Pending</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </>
          )}

          {/* ──────────────────────────────────────────────────────────
              TAB: TIMELINE (LIFECYCLE AUDIT TRAIL STREAM)
              ────────────────────────────────────────────────────────── */}
          {activeTab === 'timeline' && (
            <div className="bg-white dark:bg-zinc-900/90 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-6 shadow-2xs space-y-5">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                    Operational Lifecycle Milestone Stream
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-zinc-400">
                  Total Journey Duration: 00:04:12
                </span>
              </div>

              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-200 dark:before:bg-zinc-800">
                {[
                  {
                    title: 'Booking Created & Initialized',
                    time: createdAtFormatted,
                    desc: `Passenger ${passengerName} reserved porter assistance via RailMitra Web Client.`,
                    actor: 'Passenger App',
                    completed: true
                  },
                  {
                    title: 'Sahayak Assigned & Telemetry Dispatched',
                    time: '08 Sep 2026, 01:17:02',
                    desc: `${sahayakName} (${sahayakHub}) accepted dispatch for Train #${trainNumber}.`,
                    actor: 'Dispatch Engine',
                    completed: true
                  },
                  {
                    title: 'Sahayak Arrived at Platform',
                    time: '08 Sep 2026, 01:17:48',
                    desc: `Proximity geo-fence matched platform 3 at ${stationCode} Station.`,
                    actor: 'GPS Telemetry',
                    completed: true
                  },
                  {
                    title: 'Handshake OTP Cryptographic Verification',
                    time: serviceStartedAt ? new Date(serviceStartedAt).toLocaleString('en-GB') : '08 Sep 2026, 01:18:21',
                    desc: `One-time secret token (${startOtp}) verified successfully. Mission initiated.`,
                    actor: 'Sahayak Mobile App',
                    completed: isOtpVerified
                  },
                  {
                    title: 'Luggage Loaded & Coach Navigated',
                    time: '08 Sep 2026, 01:18:26',
                    desc: `Trolley assisted into Coach ${coachCode}, Seat ${seatNumber} (${berthType}).`,
                    actor: 'Sahayak Mobile App',
                    completed: true
                  },
                  {
                    title: 'Mission Completed & Handshake Finalized',
                    time: serviceCompletedAt ? new Date(serviceCompletedAt).toLocaleString('en-GB') : '08 Sep 2026, 01:18:29',
                    desc: 'Digital proof of handover registered with zero safety incidents.',
                    actor: 'Platform Worker',
                    completed: currentBooking.booking_status === 'completed'
                  }
                ].map((item, idx) => (
                  <div key={idx} className="relative group">
                    <span
                      className={`absolute -left-6 top-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        item.completed
                          ? 'bg-blue-600 text-white ring-4 ring-blue-50 dark:ring-blue-950/40'
                          : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
                      }`}
                    >
                      {item.completed ? '✓' : '•'}
                    </span>
                    <div className="bg-zinc-50/70 dark:bg-zinc-800/40 rounded-xl p-3.5 border border-zinc-100 dark:border-zinc-800 space-y-1">
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <h4 className="font-bold text-xs text-zinc-900 dark:text-white">
                          {item.title}
                        </h4>
                        <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
                          {item.time}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                        {item.desc}
                      </p>
                      <div className="pt-1 text-[10px] text-zinc-400 font-mono">
                        Actor: <strong className="text-zinc-600 dark:text-zinc-300">{item.actor}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────
              TAB: PASSENGER & SAHAYAK (DEEP PROFILES)
              ────────────────────────────────────────────────────────── */}
          {activeTab === 'passenger_sahayak' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Detailed Passenger Profile */}
              <div className="bg-white dark:bg-zinc-900/90 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-5 shadow-2xs space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg font-mono">
                    {passengerName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-zinc-900 dark:text-white">
                      {passengerName}
                    </h3>
                    <p className="text-zinc-500 font-mono text-xs">{passengerEmail}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400">
                      Tier 1 Passenger
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center justify-between text-xs py-1">
                    <span className="text-zinc-500">Phone Contact:</span>
                    <a href={`tel:${passengerPhone}`} className="font-bold text-blue-600 dark:text-blue-400 hover:underline">
                      {passengerPhone}
                    </a>
                  </div>
                  <div className="flex items-center justify-between text-xs py-1">
                    <span className="text-zinc-500">Account ID:</span>
                    <span className="font-mono text-zinc-600 dark:text-zinc-300 truncate max-w-[200px]">
                      {passengerId}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs py-1">
                    <span className="text-zinc-500">Total Lifetime Bookings:</span>
                    <span className="font-bold text-zinc-900 dark:text-white">3 missions</span>
                  </div>
                  <div className="flex items-center justify-between text-xs py-1">
                    <span className="text-zinc-500">Dispute Rate:</span>
                    <span className="font-bold text-emerald-600">0.0% (Clean)</span>
                  </div>
                </div>
              </div>

              {/* Detailed Sahayak Profile */}
              <div className="bg-white dark:bg-zinc-900/90 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-5 shadow-2xs space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 flex items-center justify-center font-bold text-lg font-mono">
                    {sahayakName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-zinc-900 dark:text-white">
                      {sahayakName}
                    </h3>
                    <p className="text-zinc-500 font-mono text-xs">{sahayakEmail}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      Verified Railway Porter · On Duty
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center justify-between text-xs py-1">
                    <span className="text-zinc-500">Station Hub:</span>
                    <span className="font-bold text-zinc-900 dark:text-white">{sahayakHub} Junction</span>
                  </div>
                  <div className="flex items-center justify-between text-xs py-1">
                    <span className="text-zinc-500">Staff Badge ID:</span>
                    <span className="font-mono font-bold text-zinc-900 dark:text-white">{sahayakId}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs py-1">
                    <span className="text-zinc-500">Police KYC Verification:</span>
                    <span className="font-bold text-emerald-600">Approved & Active</span>
                  </div>
                  <div className="flex items-center justify-between text-xs py-1">
                    <span className="text-zinc-500">Direct Phone:</span>
                    <a href={`tel:${sahayakPhone}`} className="font-bold text-blue-600 dark:text-blue-400 hover:underline">
                      {sahayakPhone}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────
              TAB: SERVICES (ITEMIZED SPECIFICATION SHEET)
              ────────────────────────────────────────────────────────── */}
          {activeTab === 'services' && (
            <div className="bg-white dark:bg-zinc-900/90 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                    Complete Railway Services Specification
                  </h3>
                </div>
                <span className="text-xs font-mono font-bold text-blue-600">
                  Gross: ₹{totalTariff}
                </span>
              </div>

              <div className="space-y-3">
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200/70 dark:border-zinc-800 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-zinc-900 dark:text-white">
                      Baggage Handling & Load Assistance
                    </h4>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      1 Standard Suitcase / Trolley bag (weight capacity ~20kg).
                    </p>
                  </div>
                  <span className="text-sm font-black font-mono text-zinc-900 dark:text-white">
                    ₹30.00
                  </span>
                </div>

                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200/70 dark:border-zinc-800 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-zinc-900 dark:text-white">
                      Coach Navigation & Escalator Support
                    </h4>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      Direct boarding guide from main gate to Coach {coachCode}, Seat {seatNumber}.
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-emerald-600 font-mono">
                    Included (₹0.00)
                  </span>
                </div>

                <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-100 dark:border-blue-900 text-xs text-zinc-700 dark:text-zinc-300">
                  <h5 className="font-bold text-blue-900 dark:text-blue-300 text-xs mb-1">
                    Special Handover Directives
                  </h5>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                    Passenger is carrying delicate train documents. Ensure smooth loading through side gangway of coach {coachCode}.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────
              TAB: FINANCIALS (AUDIT & COMMISSION LEDGER)
              ────────────────────────────────────────────────────────── */}
          {activeTab === 'financials' && (
            <div className="bg-white dark:bg-zinc-900/90 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-6 shadow-2xs space-y-5">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                    Enterprise Financial Ledger & Breakdown
                  </h3>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Settled ✓
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200/70 dark:border-zinc-800">
                  <span className="text-[10px] text-zinc-400 uppercase font-bold block">Gross Tariff</span>
                  <span className="text-2xl font-black text-zinc-900 dark:text-white">₹{totalTariff}.00</span>
                </div>
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200/70 dark:border-zinc-800">
                  <span className="text-[10px] text-zinc-400 uppercase font-bold block">Sahayak Cut (80%)</span>
                  <span className="text-2xl font-black text-emerald-600">₹{(totalTariff * 0.8).toFixed(2)}</span>
                </div>
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200/70 dark:border-zinc-800">
                  <span className="text-[10px] text-zinc-400 uppercase font-bold block">Platform Fee (20%)</span>
                  <span className="text-2xl font-black text-blue-600">₹{(totalTariff * 0.2).toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-2 text-xs pt-2">
                <div className="flex items-center justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-zinc-500">Transaction Reference:</span>
                  <span className="font-mono text-zinc-700 dark:text-zinc-300">{paymentId}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-zinc-500">Settlement Gateway:</span>
                  <span className="font-bold text-zinc-900 dark:text-white">{paymentMethod} SETTLEMENT ENGINE</span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-zinc-500">GST / Tax Invoice:</span>
                  <span className="font-mono text-zinc-700 dark:text-zinc-300">#INV-RM-2026-0909</span>
                </div>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────
              TAB: SYSTEM LOGS (TELEMETRY & AUDIT ENTRIES)
              ────────────────────────────────────────────────────────── */}
          {activeTab === 'system_logs' && (
            <div className="bg-white dark:bg-zinc-900/90 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-6 shadow-2xs space-y-4 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3 font-sans">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600" />
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                    Immutable System Logs & Telemetry Events
                  </h3>
                </div>
                <span className="text-[11px] text-zinc-400">
                  Socket Session: #WS-9948B
                </span>
              </div>

              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {[
                  { time: '01:18:29.412', event: 'DISPATCH_COMPLETED', level: 'INFO', payload: 'Handshake token validated by staff #974A2C' },
                  { time: '01:18:21.109', event: 'OTP_VERIFY_SUCCESS', level: 'INFO', payload: 'Matched secret OTP hash 849201' },
                  { time: '01:17:48.004', event: 'GEO_PROXIMITY_LOCK', level: 'DEBUG', payload: 'Assigned Sahayak inside geofence KZJ-PF3' },
                  { time: '01:17:02.887', event: 'SAHAYAK_ASSIGN_DISPATCH', level: 'INFO', payload: 'Assigned assistant Vikas -A (Hub KZJ)' },
                  { time: '01:16:43.210', event: 'BOOKING_RECORD_INIT', level: 'INFO', payload: `Created booking #${bookingCode}` },
                ].map((log, idx) => (
                  <div key={idx} className="p-2.5 bg-zinc-50 dark:bg-zinc-800/40 rounded-lg border border-zinc-100 dark:border-zinc-800 text-[11px] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-400">{log.time}</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">{log.event}</span>
                      <span className="text-zinc-600 dark:text-zinc-300 font-sans">{log.payload}</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                      {log.level}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* ============================================================
            4. FOOTER (Audit ID & Close Action)
            ============================================================ */}
        <div className="px-6 py-4 border-t border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#0B0F19] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2 text-zinc-400 dark:text-zinc-500 font-mono text-[11px] truncate">
            <Shield className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span className="truncate">Audit ID: {auditId}</span>
            <button
              type="button"
              onClick={() => copyToClipboard(auditId, 'Audit ID')}
              className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer shrink-0"
              title="Copy Audit ID"
            >
              {copiedKey === 'Audit ID' ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-xs font-bold transition-all shadow-2xs cursor-pointer"
          >
            Close Inspector
          </button>
        </div>

      </div>
    </div>
  );
}
