import React, { useState } from 'react';
import { 
  Phone, Copy, Check, FilePlus2, Ticket, 
  Headphones, AlertCircle, ShieldCheck, Clock
} from 'lucide-react';
import { 
  SUPPORT_PHONE, 
  isMobileDevice, 
  copySupportNumber, 
  triggerSupportCall 
} from '../../services/supportService';

/**
 * SupportHeroCard
 *
 * Dedicated 24/7 Passenger Support panel meeting all requirements:
 * - 24/7 Passenger Support header
 * - 1800-COOLIE display
 * - [ Call Support ] with desktop fallback
 * - [ Copy Number ] with clipboard feedback
 * - [ Create Support Ticket ] with real ticket system
 * - [ My Support Tickets ] with real tracking view
 */
export default function SupportHeroCard({ onNavigate }) {
  const [copied, setCopied] = useState(false);
  const [showCallFallback, setShowCallFallback] = useState(false);

  const handleCall = () => {
    triggerSupportCall();
    // On non-mobile desktop devices, show the calling application fallback in case
    // the system has no VoIP or tel: app configured.
    if (!isMobileDevice()) {
      setShowCallFallback(true);
    }
  };

  const handleCopy = async () => {
    const success = await copySupportNumber();
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="w-full bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs relative overflow-hidden transition-all">
      {/* Background Accent Pill */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-blue-50/60 via-slate-50/20 to-transparent rounded-full -mr-16 -mt-16 pointer-events-none" />

      <div className="relative z-10 space-y-6">
        {/* Header Block */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100/80 text-blue-700 text-xs font-bold tracking-wide">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              <span>24/7 Passenger Support</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Need Help?
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Our support team is here to help you.
            </p>
          </div>

          {/* Official Helpline Number Display */}
          <div className="flex items-center gap-3.5 bg-slate-50/90 border border-slate-200/80 rounded-2xl px-4 py-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center shrink-0 shadow-xs">
              <Headphones className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Official Toll-Free
              </p>
              <p className="text-lg sm:text-xl font-black font-mono tracking-tight text-slate-900">
                {SUPPORT_PHONE}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Call Support */}
          <button
            type="button"
            onClick={handleCall}
            className="w-full py-3.5 px-4 rounded-2xl bg-black hover:bg-zinc-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-[0.99]"
          >
            <Phone className="w-4 h-4 text-emerald-400" />
            <span>Call Support</span>
          </button>

          {/* 2. Copy Number */}
          <button
            type="button"
            onClick={handleCopy}
            className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs hover:border-slate-300 active:scale-[0.99]"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-500" />
                <span>Copy Number</span>
              </>
            )}
          </button>

          {/* 3. Create Support Ticket */}
          <button
            type="button"
            onClick={() => onNavigate('raise_ticket')}
            className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-[0.99]"
          >
            <FilePlus2 className="w-4 h-4" />
            <span>Create Support Ticket</span>
          </button>

          {/* 4. My Support Tickets */}
          <button
            type="button"
            onClick={() => onNavigate('tickets')}
            className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs hover:border-slate-300 active:scale-[0.99]"
          >
            <Ticket className="w-4 h-4 text-[#1463FF]" />
            <span>My Support Tickets</span>
          </button>
        </div>

        {/* Desktop Calling App Fallback Notice (Only shown after user explicitly clicks "Call Support") */}
        {showCallFallback && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200/90 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in text-xs">
            <div className="flex items-center gap-2.5 text-amber-900">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Your device doesn't have a calling application configured. Dial <strong className="font-mono font-bold">{SUPPORT_PHONE}</strong> from your phone or copy below.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                type="button"
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copied ? 'Copied!' : 'Copy Number'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowCallFallback(false)}
                className="px-2.5 py-1.5 text-amber-800 hover:text-amber-950 font-medium text-xs cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Trust & Availability Indicators */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-400 pt-1">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Official Railway Helpline Partner</span>
          </div>
          <span className="hidden sm:inline text-slate-200">•</span>
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-emerald-600" />
            <span>Typical wait time: &lt; 30 seconds</span>
          </div>
        </div>
      </div>
    </div>
  );
}
