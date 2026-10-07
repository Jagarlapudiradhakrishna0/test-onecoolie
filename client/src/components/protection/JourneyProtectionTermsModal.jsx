import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertCircle, CheckCircle2, Printer, Luggage, AlertTriangle, Package } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { getLocalizedPolicy } from '../../locales/protectionPolicyData';

/* ============================================================
   ONECOOLIE JOURNEY PROTECTION — PRE-LAUNCH POLICY & TERMS MODAL
   • Status: PRE-LAUNCH / DEMONSTRATION ONLY
   • Authoritative Customer Price: ₹0.50 / journey
   • Policy Version: ONECOOLIE-PROTECTION-PRELAUNCH-v2
   • Multilingual Support: English, Telugu, Hindi
   • Expanded Baggage Loss & Damage Terms
   • Proposed Baggage Protection Limits (Small, Medium, Large, Extra-Large)
   • Damage Severity Classification & 13-Point Damage Terms Table
   • Valuable Items Passenger Responsibility Callout
   • Container vs Contents Distinction & Prohibited Items Rules
   • Rendered via React Portal into document.body with z-[120]
   ============================================================ */

export default function JourneyProtectionTermsModal({
  open: openProp,
  isOpen: isOpenProp,
  onClose,
  onAccept,
  hasAccepted = false,
  protectionId = null,
  bookingRef = null,
  acceptedAt = null
}) {
  const open = Boolean(openProp ?? isOpenProp);
  const { lang, t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const modalCardRef = useRef(null);

  const policy = getLocalizedPolicy(lang);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent background scrolling and lock body when open
  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;

    // Compensate for scrollbar removal to prevent layout shift
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [open]);

  // Handle keyboard events (Escape key closes dialog)
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (onClose) onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Accessible focus management: focus modal card upon opening
  useEffect(() => {
    if (open && modalCardRef.current) {
      modalCardRef.current.focus();
    }
  }, [open]);

  if (!open || !mounted || typeof document === 'undefined') return null;

  const handlePrint = (e) => {
    e.stopPropagation();
    window.print();
  };

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="protection-terms-title"
      aria-describedby="protection-terms-desc"
      className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/70 backdrop-blur-sm animate-fade-in select-none"
      onClick={onClose}
    >
      <div
        ref={modalCardRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-2xl flex flex-col overflow-hidden my-auto w-[calc(100vw-16px)] sm:w-[calc(100vw-32px)] md:w-[calc(100vw-48px)] max-w-[960px] max-h-[calc(100vh-20px)] sm:max-h-[calc(100vh-32px)] max-h-[calc(100dvh-20px)] sm:max-h-[calc(100dvh-32px)] transition-all animate-scale-in outline-none select-text"
      >
        {/* ── 1. MODAL HEADER (FIXED WITHIN MODAL) ── */}
        <div className="shrink-0 p-4 sm:p-5 border-b border-slate-100 flex items-start justify-between gap-3 sm:gap-4 bg-slate-50/95 backdrop-blur-xs">
          <div className="space-y-1 min-w-0 pr-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-blue-100 text-blue-800 border border-blue-200">
                {t('protection.preLaunch')}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200">
                {t('protection.demoOnly')}
              </span>
              <span className="text-xs font-mono font-bold text-zinc-500">
                v2 (ONECOOLIE-PROTECTION-PRELAUNCH-v2)
              </span>
            </div>
            <h2 id="protection-terms-title" className="text-base sm:text-xl font-black text-zinc-900 tracking-tight truncate sm:whitespace-normal">
              {t('protection.productName')}
            </h2>
            <p id="protection-terms-desc" className="text-xs text-zinc-600 font-medium">
              {t('protection.optionalSub')} · <strong className="text-zinc-900 font-bold">₹0.50 / journey</strong>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handlePrint}
              className="w-9 h-9 rounded-full bg-white hover:bg-slate-100 text-zinc-600 border border-slate-200 flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
              title="Print Policy Document"
              aria-label="Print policy document"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white hover:bg-slate-100 text-zinc-600 border border-slate-200 flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
              title="Close Dialog"
              aria-label="Close protection terms dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── 2. SCROLLABLE TERMS CONTENT (INDEPENDENT SCROLL) ── */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs text-zinc-700 leading-relaxed overscroll-contain focus:outline-none">
          {/* Prominent Mandatory Pre-Launch Disclaimer Box */}
          <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200/90 text-amber-950 space-y-2">
            <div className="flex items-center gap-2 font-bold text-xs text-amber-950">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{t('protection.importantDisclaimer')}</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-900 font-medium">
              {t('protection.preLaunchNotice')}
            </p>
          </div>

          {/* Active Protection Record Telemetry (if viewing after purchase/activation) */}
          {protectionId && (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-mono space-y-1.5">
              <div className="flex justify-between">
                <span className="text-zinc-500 font-sans">{t('protection.protectionId')}:</span>
                <span className="font-bold text-zinc-900 select-all">{protectionId}</span>
              </div>
              {bookingRef && (
                <div className="flex justify-between">
                  <span className="text-zinc-500 font-sans">Booking Ref:</span>
                  <span className="font-bold text-zinc-900 select-all">{bookingRef}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-zinc-500 font-sans">{t('common.price')}:</span>
                <span className="font-bold text-zinc-900">₹0.50</span>
              </div>
              {acceptedAt && (
                <div className="flex justify-between">
                  <span className="text-zinc-500 font-sans">{t('protection.activatedAt')}:</span>
                  <span className="font-bold text-zinc-900">{new Date(acceptedAt).toLocaleString()}</span>
                </div>
              )}
            </div>
          )}

          {/* ── BAGGAGE PROTECTION LIMITS (PROPOSED PRE-LAUNCH) ── */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Luggage className="w-4 h-4 text-blue-600" />
                <h3 className="font-black text-xs sm:text-sm text-zinc-900 uppercase tracking-wide">
                  {t('protection.baggageProtectionLimits')}
                </h3>
              </div>
              <span className="text-[10px] font-bold text-zinc-500 font-mono">
                {t('protection.demoOnly')}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-1">
              {policy.tiers.map((tier) => (
                <div key={tier.tier} className="bg-white rounded-xl border border-slate-200 p-3 flex flex-col justify-between shadow-2xs">
                  <div>
                    <div className="text-[11px] font-black text-zinc-900">{tier.label}</div>
                    <div className="text-[10px] text-zinc-500 font-medium">{tier.weightRange}</div>
                    <div className="text-[10px] text-zinc-500 mt-1 leading-snug">{tier.description}</div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100">
                    <div className="text-[9px] uppercase font-bold text-zinc-400">{t('protection.proposedLimit')}</div>
                    <div className="text-xs font-black text-blue-600 font-mono">{tier.limitStr}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-blue-950 text-[11px] leading-relaxed space-y-1">
              <p className="font-semibold">
                {t('protection.limitsDisclaimer')}
              </p>
              <p className="text-blue-900">
                {t('protection.limitsMaxDisclaimer')}
              </p>
            </div>
          </div>

          {/* ── BAGGAGE VS CONTENTS & VALUABLE ITEMS CALLOUT ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {/* Bag Container vs Contents */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/40 p-4 space-y-2">
              <div className="flex items-center gap-2 font-bold text-zinc-900 text-xs">
                <Package className="w-4 h-4 text-zinc-600" />
                <span>{t('protection.baggageVsContents')}</span>
              </div>
              <p className="text-[11px] text-zinc-600 leading-relaxed">
                {t('protection.baggageVsContentsDesc')}
              </p>
            </div>

            {/* Valuable Items Callout */}
            <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 space-y-2 text-rose-950">
              <div className="flex items-center gap-2 font-black text-xs text-rose-900">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{t('protection.valuablesCalloutTitle')}</span>
              </div>
              <p className="text-[11px] leading-relaxed font-medium">
                {t('protection.valuablesCalloutBody')}
              </p>
              <p className="text-[10px] text-rose-800 leading-tight">
                {t('protection.valuablesDisclaimer')}
              </p>
            </div>
          </div>

          {/* ── DAMAGE SEVERITY TIERS ── */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2.5 shadow-2xs">
            <h3 className="font-black text-xs text-zinc-900 uppercase tracking-wide">
              {t('protection.damageSeverityTitle')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px]">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="font-bold text-zinc-900">{t('protection.damageMinor')}</div>
                <div className="text-zinc-600 text-[10px]">{t('protection.damageMinorDesc')}</div>
                <div className="pt-1 font-bold text-rose-600 text-[10px] uppercase">{t('protection.damageMinorTreatment')}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="font-bold text-zinc-900">{t('protection.damageModerate')}</div>
                <div className="text-zinc-600 text-[10px]">{t('protection.damageModerateDesc')}</div>
                <div className="pt-1 font-bold text-amber-700 text-[10px] uppercase">{t('protection.damageModerateTreatment')}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="font-bold text-zinc-900">{t('protection.damageMajor')}</div>
                <div className="text-zinc-600 text-[10px]">{t('protection.damageMajorDesc')}</div>
                <div className="pt-1 font-bold text-blue-700 text-[10px] uppercase">{t('protection.damageMajorTreatment')}</div>
              </div>
            </div>
          </div>

          {/* ── PROPOSED PRE-LAUNCH DAMAGE TERMS TABLE ── */}
          <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="bg-slate-100/90 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-black text-xs sm:text-sm text-zinc-900 uppercase tracking-wide">
                {t('protection.damageTableTitle')}
              </h3>
              <span className="text-[10px] font-bold text-zinc-500">13 Incident Types</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-zinc-600 font-bold text-[11px]">
                    <th className="py-2.5 px-4">Damage Type</th>
                    <th className="py-2.5 px-4 text-right">Proposed Treatment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {policy.damageTable.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2 px-4 font-medium text-zinc-800">{row.damageType}</td>
                      <td className="py-2 px-4 text-right font-bold">
                        {row.status === 'considered' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            {row.treatment}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-600 border border-zinc-200">
                            {row.treatment}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── 25 STRUCTURED POLICY SECTIONS ── */}
          <div className="space-y-4 pt-2 border-t border-slate-200">
            <h3 className="font-black text-xs sm:text-sm text-zinc-900 uppercase tracking-wide">
              Detailed Proposed Policy Articles (1 – 25)
            </h3>
            {policy.sections.map((sec) => (
              <div key={sec.number} className="border-b border-slate-100 pb-3 last:border-none">
                <h4 className="font-black text-zinc-900 text-xs sm:text-sm mb-1">
                  {sec.number}. {sec.title}
                </h4>
                <p className="text-zinc-600 text-[11px] sm:text-xs leading-relaxed">
                  {sec.content}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── 3. MODAL ACTIONS FOOTER (FIXED WITHIN MODAL) ── */}
        <div className="shrink-0 p-4 sm:p-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/95 backdrop-blur-xs">
          <div className="text-[11px] text-zinc-500 font-medium text-center sm:text-left">
            {t('protection.termsVersion')}: <span className="font-mono font-bold text-zinc-800">ONECOOLIE-PROTECTION-PRELAUNCH-v2</span>
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-white hover:bg-slate-100 text-zinc-800 font-bold text-xs border border-slate-200 transition-colors cursor-pointer text-center"
            >
              {t('common.actions.close')}
            </button>
            {onAccept && !hasAccepted && (
              <button
                type="button"
                onClick={() => {
                  onAccept();
                  onClose();
                }}
                className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-black hover:bg-zinc-800 text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 text-center"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{t('protection.understandAndAccept')}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
