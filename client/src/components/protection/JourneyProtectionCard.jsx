import React, { useState } from 'react';
import { ShieldCheck, Info, Check, ExternalLink, AlertCircle, FileText, CheckCircle2, Clock } from 'lucide-react';
import JourneyProtectionTermsModal from './JourneyProtectionTermsModal';
import { useLanguage } from '../../context/LanguageContext';

/* ============================================================
   ONECOOLIE JOURNEY PROTECTION CARD
   • Customer price: ₹0.50 / journey
   • Status: PRE-LAUNCH (Demonstration only)
   • Explicit opt-in & versioned terms acceptance
   • STRICT: ZERO display of any benefit, coverage, or payout amounts
   • Supports CASH / COD Pending Payment state with clear activation notice
   ============================================================ */

export default function JourneyProtectionCard({
  selected = false,
  onToggle,
  protection = null,
  disabled = false,
  bookingRef = null,
  paymentMethod = 'online'
}) {
  const { t, formatCurrency, formatDate } = useLanguage();
  const [showTerms, setShowTerms] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(selected);

  const isAlreadyActive = protection?.status === 'active';
  const isPending = protection?.status === 'pending_payment';
  const protectionId = protection?.protection_id;
  const activatedAt = protection?.activated_at;
  const termsVersion = protection?.terms_version || 'ONECOOLIE-PROTECTION-PRELAUNCH-v2';
  const isCash = ['cash', 'cod', 'pay_on_arrival', 'pay_on_delivery'].includes(
    String(protection?.payment_method || paymentMethod).toLowerCase()
  );

  const handleCheckboxChange = (e) => {
    if (disabled || isAlreadyActive || isPending) return;
    const checked = e.target.checked;
    setTermsAccepted(checked);
    if (onToggle) onToggle(checked);
  };

  return (
    <div className="bg-[#fafbfc] border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-4 hover:border-slate-300 transition-all shadow-2xs w-full min-w-0">
      {/* Header Row */}
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
            <ShieldCheck className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-bold text-xs sm:text-sm text-zinc-900 truncate">
                {t('protection.title')}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
                {t('protection.preLaunch')}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 font-medium mt-0.5">
              {t('protection.subtitle')}
            </p>
          </div>
        </div>

        {/* Price / Active / Pending Status Badge */}
        <div className="text-right shrink-0">
          {isAlreadyActive ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Check className="w-3 h-3 stroke-[3]" />
              <span>{t('protection.active')}</span>
            </span>
          ) : isPending ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-50 text-amber-800 border border-amber-200">
              <Clock className="w-3 h-3 stroke-[2.5]" />
              <span>{t('protection.pendingPayment')}</span>
            </span>
          ) : (
            <div>
              <div className="font-mono font-black text-sm text-zinc-900 leading-none">
                ₹0.50
              </div>
              <div className="text-[10px] text-zinc-400 font-semibold mt-0.5">
                {t('protection.perJourney')}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Body: Active Telemetry OR Pending Cash Telemetry OR Opt-in Switch */}
      {isAlreadyActive ? (
        <div className="bg-white rounded-xl p-3.5 border border-slate-200/70 text-xs space-y-2">
          <div className="flex items-center justify-between font-mono">
            <span className="text-zinc-500 text-[11px]">{t('protection.protectionId')}</span>
            <span className="font-bold text-zinc-900 select-all">{protectionId}</span>
          </div>
          <div className="flex items-center justify-between font-mono">
            <span className="text-zinc-500 text-[11px]">{t('protection.status')}</span>
            <span className="font-bold text-emerald-600">{t('protection.active')}</span>
          </div>
          <div className="flex items-center justify-between font-mono">
            <span className="text-zinc-500 text-[11px]">{t('protection.price')}</span>
            <span className="font-bold text-zinc-900">₹0.50</span>
          </div>
          {protection?.proposed_protection_limit != null && (
            <div className="flex items-center justify-between font-mono">
              <span className="text-zinc-500 text-[11px]">{t('protection.proposedLimit')}</span>
              <span className="font-bold text-zinc-800">
                Up to ₹{Number(protection.proposed_protection_limit).toLocaleString('en-IN')} (Proposed)
              </span>
            </div>
          )}
          {activatedAt && (
            <div className="flex items-center justify-between font-mono">
              <span className="text-zinc-500 text-[11px]">{t('protection.activated')}</span>
              <span className="text-zinc-700">{formatDate(activatedAt)}</span>
            </div>
          )}
          <div className="flex items-center justify-between font-mono">
            <span className="text-zinc-500 text-[11px]">{t('protection.termsVersion')}</span>
            <span className="text-zinc-600 truncate max-w-[200px]">{termsVersion}</span>
          </div>
        </div>
      ) : isPending ? (
        <div className="bg-white rounded-xl p-3.5 border border-amber-200/70 text-xs space-y-2.5">
          <div className="flex items-center justify-between font-mono">
            <span className="text-zinc-500 text-[11px]">{t('protection.protectionId')}</span>
            <span className="font-bold text-zinc-900 select-all">{protectionId}</span>
          </div>
          <div className="flex items-center justify-between font-mono">
            <span className="text-zinc-500 text-[11px]">{t('protection.status')}</span>
            <span className="font-bold text-amber-700">{t('protection.pendingPayment')}</span>
          </div>
          <div className="flex items-center justify-between font-mono">
            <span className="text-zinc-500 text-[11px]">{t('protection.price')}</span>
            <span className="font-bold text-zinc-900">₹0.50</span>
          </div>
          <div className="flex items-center justify-between font-mono">
            <span className="text-zinc-500 text-[11px]">{t('protection.payment')}</span>
            <span className="font-bold text-zinc-800">{isCash ? t('payments.cash') : 'Pending Gateway'}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-amber-50/80 border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
            {t('protection.cashNotice')}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Pre-launch Disclaimer Banner */}
          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/70 text-amber-900 text-[11px] leading-relaxed">
            <div className="flex items-center gap-1.5 font-bold mb-0.5 text-amber-950">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>{t('protection.preLaunchDemo')}</span>
            </div>
            {t('protection.preLaunchNotice')}
          </div>

          {/* Opt-in and Terms Acceptance Row */}
          {!disabled && (
            <div className="space-y-2 pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={handleCheckboxChange}
                  className="mt-0.5 w-4 h-4 rounded text-black border-slate-300 focus:ring-black cursor-pointer"
                />
                <span className="text-xs font-bold text-zinc-800">
                  {t('protection.addProtection')}
                </span>
              </label>

              {selected && (
                <div className="pl-6.5 text-[11px] text-zinc-600 space-y-1 animate-fade-in">
                  <p className="flex items-center gap-1.5 text-emerald-700 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{t('protection.termsAccepted')}</span>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Footer Link: View Terms Modal Trigger */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
        <button
          type="button"
          onClick={() => setShowTerms(true)}
          className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer transition-colors text-[11px]"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>{t('protection.viewTerms')}</span>
        </button>

        <span className="text-[10px] text-zinc-400 font-mono">
          {termsVersion}
        </span>
      </div>

      {/* Terms Modal */}
      <JourneyProtectionTermsModal
        open={showTerms}
        onClose={() => setShowTerms(false)}
        onAccept={() => {
          setTermsAccepted(true);
          if (onToggle) onToggle(true);
        }}
        hasAccepted={selected || isAlreadyActive || isPending}
        protectionId={protectionId}
        bookingRef={bookingRef}
        acceptedAt={activatedAt || protection?.terms_accepted_at}
      />
    </div>
  );
}
