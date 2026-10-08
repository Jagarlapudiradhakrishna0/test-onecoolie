import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Luggage,
  Armchair,
  Accessibility,
  Languages,
  Coffee,
  Car,
  X,
  Check,
  Plus,
  Minus,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Loader2,
  ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import axios from '../api/axios';

/* ============================================================
   ONECOOLIE EDIT SERVICES MODAL
   Allows passenger to authoritatively edit services for THIS booking.
   Never navigates to Home — preserves current booking context.
   ============================================================ */

const SERVICE_CATALOG = [
  {
    key: 'luggage',
    label: 'Luggage Assistance',
    desc: 'Dedicated porter handling from station gate directly to your berth.',
    icon: Luggage,
    iconColor: 'text-[#1463FF]',
    iconBg: 'bg-blue-50',
    hasSizes: true,
  },
  {
    key: 'escort',
    label: 'Seat & Coach Escort',
    rate: 60,
    desc: 'Personal guide navigating platform foot-bridges to your exact coach.',
    icon: Armchair,
    iconColor: 'text-emerald-600',
    iconBg: 'bg-emerald-50',
  },
  {
    key: 'wheelchair',
    label: 'Wheelchair & Priority',
    rate: 80,
    desc: 'Wheelchair transit and dedicated escort for seniors & mobility needs.',
    icon: Accessibility,
    iconColor: 'text-purple-600',
    iconBg: 'bg-purple-50',
  },
  {
    key: 'language',
    label: 'Multilingual Guide',
    rate: 30,
    desc: 'Local communication assistance in Telugu, Hindi, or English.',
    icon: Languages,
    iconColor: 'text-amber-600',
    iconBg: 'bg-amber-50',
  },
  {
    key: 'snacks',
    label: 'Berth Refreshments',
    rate: 50,
    desc: 'Station water and packed snacks delivered right to your seat.',
    icon: Coffee,
    iconColor: 'text-rose-600',
    iconBg: 'bg-rose-50',
  },
  {
    key: 'transport',
    label: 'Exit Gate & Cab Transfer',
    rate: 40,
    desc: 'Baggage escorting and navigation to pre-booked app cabs and autos.',
    icon: Car,
    iconColor: 'text-sky-600',
    iconBg: 'bg-sky-50',
  },
];

const LUGGAGE_RATES = {
  small: 30,
  medium: 40,
  large: 60,
};

export default function EditServicesModal({
  isOpen,
  onClose,
  booking,
  onSuccess
}) {
  const [luggageEnabled, setLuggageEnabled] = useState(false);
  const [luggageCounts, setLuggageCounts] = useState({ small: 0, medium: 0, large: 0 });
  const [auxServices, setAuxServices] = useState({
    escort: false,
    wheelchair: false,
    language: false,
    snacks: false,
    transport: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Extract initial services when modal opens
  useEffect(() => {
    if (!isOpen || !booking) return;

    setErrorMessage('');
    setIsSubmitting(false);

    const s = booking.services || {};

    // 1. Luggage initialization
    const counts = s.luggageCounts || {};
    let small = Number(counts.small) || 0;
    let medium = Number(counts.medium) || 0;
    let large = Number(counts.large) || 0;

    // Fallback parser if luggage was saved as raw number
    if (small === 0 && medium === 0 && large === 0) {
      const details = String(s.luggage_details || '').toLowerCase();
      if (details.includes('small')) small = 1;
      else if (details.includes('medium')) medium = 1;
      else if (details.includes('large')) large = 1;
      else if (s.luggage && Number(s.luggage) > 0) {
        small = Number(s.luggage);
      }
    }

    const hasLuggage = small > 0 || medium > 0 || large > 0 || Boolean(s.luggage);
    setLuggageEnabled(hasLuggage);
    setLuggageCounts({
      small,
      medium,
      large,
    });

    // 2. Auxiliary services initialization
    setAuxServices({
      escort: Boolean(s.escort || s.seatEscort),
      wheelchair: Boolean(s.wheelchair),
      language: Boolean(s.language || s.multilingualGuide),
      snacks: Boolean(s.snacks || s.berthSnacks),
      transport: Boolean(s.transport || s.exitTransport),
    });
  }, [isOpen, booking]);

  // Check if booking has Journey Protection
  const hasJourneyProtection = useMemo(() => {
    if (!booking) return false;
    return Boolean(
      booking.services?.has_journey_protection ||
      (Array.isArray(booking.services?.pricing_breakdown) &&
        booking.services.pricing_breakdown.some((b) => b.service === 'journey_protection'))
    );
  }, [booking]);

  // Real-time authoritative price calculation
  const { subtotal, protectionCost, total, selectedCount } = useMemo(() => {
    let sum = 0;
    let count = 0;

    if (luggageEnabled) {
      const smallCost = (luggageCounts.small || 0) * LUGGAGE_RATES.small;
      const mediumCost = (luggageCounts.medium || 0) * LUGGAGE_RATES.medium;
      const largeCost = (luggageCounts.large || 0) * LUGGAGE_RATES.large;
      const totalLuggageCost = smallCost + mediumCost + largeCost;

      if (luggageCounts.small > 0 || luggageCounts.medium > 0 || luggageCounts.large > 0) {
        sum += totalLuggageCost;
        count += 1;
      }
    }

    if (auxServices.escort) {
      sum += 60;
      count += 1;
    }
    if (auxServices.wheelchair) {
      sum += 80;
      count += 1;
    }
    if (auxServices.language) {
      sum += 30;
      count += 1;
    }
    if (auxServices.snacks) {
      sum += 50;
      count += 1;
    }
    if (auxServices.transport) {
      sum += 40;
      count += 1;
    }

    const prot = hasJourneyProtection ? 0.50 : 0;
    const finalTotal = sum > 0 ? Number((sum + prot).toFixed(2)) : 0;

    return {
      subtotal: sum,
      protectionCost: prot,
      total: finalTotal,
      selectedCount: count,
    };
  }, [luggageEnabled, luggageCounts, auxServices, hasJourneyProtection]);

  if (!isOpen || !booking) return null;

  const isNonEditable = ['in_service', 'completed', 'cancelled'].includes(
    String(booking.booking_status || '').toLowerCase()
  );

  const handleLuggageCountChange = (size, delta) => {
    setLuggageCounts((prev) => {
      const nextVal = Math.max(0, (prev[size] || 0) + delta);
      const nextObj = { ...prev, [size]: nextVal };
      const totalBags = nextObj.small + nextObj.medium + nextObj.large;
      setLuggageEnabled(totalBags > 0);
      return nextObj;
    });
  };

  const toggleAuxService = (key) => {
    setAuxServices((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    if (isNonEditable) {
      toast.error('Services can no longer be edited for this booking.');
      return;
    }

    if (selectedCount === 0) {
      setErrorMessage('Please select at least one service before saving.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    // Build luggage details string
    const detailsParts = [];
    if (luggageCounts.small > 0) detailsParts.push(`${luggageCounts.small} Small`);
    if (luggageCounts.medium > 0) detailsParts.push(`${luggageCounts.medium} Medium`);
    if (luggageCounts.large > 0) detailsParts.push(`${luggageCounts.large} Large`);
    const luggageDetailsString = detailsParts.join(', ');
    const totalLuggageBags = luggageCounts.small + luggageCounts.medium + luggageCounts.large;

    const payload = {
      services: {
        luggage: luggageEnabled && totalLuggageBags > 0 ? totalLuggageBags : 0,
        luggageCounts: luggageEnabled ? luggageCounts : { small: 0, medium: 0, large: 0 },
        luggage_details: luggageEnabled ? luggageDetailsString : null,
        escort: auxServices.escort,
        wheelchair: auxServices.wheelchair,
        language: auxServices.language,
        snacks: auxServices.snacks,
        transport: auxServices.transport,
      },
    };

    const bookingId = booking.id || booking.booking_id;

    try {
      let res;
      try {
        res = await axios.put(`/bookings/${bookingId}/services`, payload);
      } catch (firstErr) {
        // Fallback endpoint
        res = await axios.put(`/bookings/${bookingId}`, payload);
      }

      const updated = res.data?.booking || res.data;
      if (updated) {
        onSuccess?.(updated);
        onClose();
      } else {
        throw new Error('Failed to parse updated booking response.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Unable to update services.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={() => !isSubmitting && onClose()}
      />

      {/* Modal Dialog */}
      <div className="relative bg-white rounded-3xl max-w-xl w-full shadow-[0_24px_60px_-15px_rgba(0,0,0,0.3)] border border-slate-200/90 z-10 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1463FF] animate-pulse" />
              <h2 className="text-lg sm:text-xl font-extrabold text-zinc-900 tracking-tight">
                Edit Selected Services
              </h2>
            </div>
            <p className="text-xs text-zinc-500 font-medium mt-1">
              Booking Ref: <span className="font-mono font-bold text-zinc-800">{booking.booking_id || booking.id}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-left scrollbar-thin scrollbar-thumb-slate-200">
          
          {isNonEditable && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5 text-rose-700 text-xs font-semibold">
              <AlertCircle size={16} className="shrink-0" />
              <span>Services can no longer be edited because this booking is in progress, completed, or cancelled.</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2.5 text-amber-800 text-xs font-medium">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Luggage Assistance Service Card with Steppers */}
          <div
            className={`border rounded-2xl p-4 transition-all ${
              luggageEnabled && (luggageCounts.small > 0 || luggageCounts.medium > 0 || luggageCounts.large > 0)
                ? 'bg-blue-50/40 border-blue-200'
                : 'bg-white border-slate-200/80 hover:border-slate-300'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1463FF] flex items-center justify-center shrink-0">
                  <Luggage className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-900 leading-tight">
                    Luggage Assistance
                  </h4>
                  <p className="text-xs text-zinc-500 mt-0.5 leading-snug">
                    Dedicated porter carrying luggage directly to your train coach & berth.
                  </p>
                </div>
              </div>
            </div>

            {/* Luggage Size Steppers */}
            <div className="mt-4 pt-3 border-t border-slate-200/60 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Small */}
              <div className="bg-white rounded-xl p-3 border border-slate-200/80 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-zinc-900">Small</p>
                  <p className="text-[11px] text-zinc-400">₹30 · Cabin</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleLuggageCountChange('small', -1)}
                    disabled={luggageCounts.small <= 0}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-zinc-700 cursor-pointer"
                  >
                    <Minus size={13} />
                  </button>
                  <span className="w-6 text-center text-xs font-bold font-mono text-zinc-900">
                    {luggageCounts.small}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleLuggageCountChange('small', 1)}
                    className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#1463FF] flex items-center justify-center cursor-pointer"
                  >
                    <Plus size={13} />
                  </button>
                </div>
              </div>

              {/* Medium */}
              <div className="bg-white rounded-xl p-3 border border-slate-200/80 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-zinc-900">Medium</p>
                  <p className="text-[11px] text-zinc-400">₹40 · Trolley</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleLuggageCountChange('medium', -1)}
                    disabled={luggageCounts.medium <= 0}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-zinc-700 cursor-pointer"
                  >
                    <Minus size={13} />
                  </button>
                  <span className="w-6 text-center text-xs font-bold font-mono text-zinc-900">
                    {luggageCounts.medium}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleLuggageCountChange('medium', 1)}
                    className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#1463FF] flex items-center justify-center cursor-pointer"
                  >
                    <Plus size={13} />
                  </button>
                </div>
              </div>

              {/* Large */}
              <div className="bg-white rounded-xl p-3 border border-slate-200/80 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-zinc-900">Large</p>
                  <p className="text-[11px] text-zinc-400">₹60 · Trunk</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleLuggageCountChange('large', -1)}
                    disabled={luggageCounts.large <= 0}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-zinc-700 cursor-pointer"
                  >
                    <Minus size={13} />
                  </button>
                  <span className="w-6 text-center text-xs font-bold font-mono text-zinc-900">
                    {luggageCounts.large}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleLuggageCountChange('large', 1)}
                    className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#1463FF] flex items-center justify-center cursor-pointer"
                  >
                    <Plus size={13} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Auxiliary Services List */}
          <div className="space-y-2.5">
            {SERVICE_CATALOG.filter((item) => !item.hasSizes).map((svc) => {
              const IconComp = svc.icon;
              const isSelected = Boolean(auxServices[svc.key]);

              return (
                <div
                  key={svc.key}
                  onClick={() => toggleAuxService(svc.key)}
                  className={`border rounded-2xl p-3.5 flex items-center justify-between transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'bg-blue-50/40 border-blue-200 shadow-2xs'
                      : 'bg-white border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl ${svc.iconBg} ${svc.iconColor} flex items-center justify-center shrink-0`}>
                      <IconComp size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs sm:text-[13px] font-bold text-zinc-900">
                          {svc.label}
                        </h4>
                        <span className="text-[11px] font-bold text-zinc-400">
                          ₹{svc.rate}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-0.5 line-clamp-1">
                        {svc.desc}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-[#1463FF] text-white'
                        : 'border border-slate-300 bg-white'
                    }`}
                  >
                    {isSelected && <Check size={13} strokeWidth={3} />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Journey Protection Active Note */}
          {hasJourneyProtection && (
            <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                <span>Journey Protection (Pre-Launch Tier)</span>
              </div>
              <span className="font-mono font-bold text-emerald-700">₹0.50</span>
            </div>
          )}
        </div>

        {/* Sticky Footer: Total & Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200/80 rounded-b-3xl flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="w-full sm:w-auto text-left">
            <p className="text-[11px] text-zinc-500 font-medium">
              Authoritative Total ({selectedCount} {selectedCount === 1 ? 'service' : 'services'})
            </p>
            <p className="text-xl font-extrabold text-zinc-900 tracking-tight">
              ₹{total.toFixed(2)}
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-zinc-600 hover:text-zinc-900 hover:bg-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              id="save-edited-services-btn"
              onClick={handleSave}
              disabled={isSubmitting || selectedCount === 0 || isNonEditable}
              className="px-5 py-2.5 rounded-xl bg-[#1463FF] hover:bg-blue-600 disabled:opacity-50 disabled:pointer-events-none text-white text-xs font-bold transition-all shadow-sm hover:shadow flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span>Save Changes</span>
                  <ArrowRight size={13} />
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}
