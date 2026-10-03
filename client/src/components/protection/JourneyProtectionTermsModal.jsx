import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertCircle, CheckCircle2, Printer, Shield, Luggage, AlertTriangle, FileText, Check, Package } from 'lucide-react';

/* ============================================================
   ONECOOLIE JOURNEY PROTECTION — PRE-LAUNCH POLICY & TERMS MODAL
   • Status: PRE-LAUNCH / DEMONSTRATION ONLY
   • Authoritative Customer Price: ₹0.50 / journey
   • Policy Version: ONECOOLIE-PROTECTION-PRELAUNCH-v2
   • Expanded Baggage Loss & Damage Terms
   • Proposed Baggage Protection Limits (Small, Medium, Large, Extra-Large)
   • Damage Severity Classification & 13-Point Damage Terms Table
   • Valuable Items Passenger Responsibility Callout
   • Container vs Contents Distinction & Prohibited Items Rules
   • Rendered via React Portal into document.body with z-[120]
   ============================================================ */

export const BAGGAGE_PROTECTION_TIERS = [
  {
    tier: 'Small Bag',
    weightRange: 'Up to 5 kg',
    limit: 'Up to ₹2,500',
    description: 'Light backpacks, small vanity/carry bags, handheld travel kits.'
  },
  {
    tier: 'Medium Bag',
    weightRange: '>5 kg – 15 kg',
    limit: 'Up to ₹5,000',
    description: 'Standard cabin trolley, overnight duffel, standard travel rucksack.'
  },
  {
    tier: 'Large Bag',
    weightRange: '>15 kg – 25 kg',
    limit: 'Up to ₹10,000',
    description: 'Medium to large check-in suitcase, wheeled trunk, heavy luggage.'
  },
  {
    tier: 'Extra-Large Bag',
    weightRange: '>25 kg',
    limit: 'Up to ₹15,000',
    description: 'Oversized heavy cargo trunk, extra-large transit baggage.'
  }
];

export const DAMAGE_TERMS_TABLE = [
  { damageType: 'Minor scratches', treatment: 'Not covered', status: 'excluded' },
  { damageType: 'Minor scuffs', treatment: 'Not covered', status: 'excluded' },
  { damageType: 'Dirt/stains', treatment: 'Not covered', status: 'excluded' },
  { damageType: 'Normal wear and tear', treatment: 'Not covered', status: 'excluded' },
  { damageType: 'Pre-existing damage', treatment: 'Not covered', status: 'excluded' },
  { damageType: 'Damaged wheel', treatment: 'May be considered', status: 'considered' },
  { damageType: 'Broken handle', treatment: 'May be considered', status: 'considered' },
  { damageType: 'Damaged zipper', treatment: 'May be considered', status: 'considered' },
  { damageType: 'Cracked shell', treatment: 'May be considered', status: 'considered' },
  { damageType: 'Major structural damage', treatment: 'May be considered', status: 'considered' },
  { damageType: 'Intentional damage', treatment: 'Not covered', status: 'excluded' },
  { damageType: 'Improper packaging damage', treatment: 'Generally excluded', status: 'excluded' },
  { damageType: 'Damage to excluded valuables', treatment: 'Not covered', status: 'excluded' }
];

export const PRE_LAUNCH_TERMS_SECTIONS = [
  {
    number: 1,
    title: 'Product Overview',
    content: 'ONECOOLIE Journey Protection is an optional journey-protection service associated with an eligible ONECOOLIE station assistance booking and eligible declared baggage. The customer price is ₹0.50 per journey. This product is currently in PRE-LAUNCH DEMONSTRATION phase and does not constitute an insurance policy or guarantee of payment.'
  },
  {
    number: 2,
    title: 'Pre-launch Status',
    content: 'ONECOOLIE Journey Protection is currently a pre-launch product demonstration and proposed protection service. It is not currently an insurance policy and does not constitute legally binding insurance coverage or a guarantee of payment. Any future insurance product will be introduced only after the required regulatory, underwriting, and insurance-provider arrangements are completed.'
  },
  {
    number: 3,
    title: 'Eligibility',
    content: 'Protection is available to passengers holding a valid, confirmed ONECOOLIE station assistance booking for an eligible scheduled rail journey, who explicitly opt in and accept these versioned terms, and whose payment of ₹0.50 is server-verified (via online gateway or authorized cash collection). Protection is non-transferable and strictly bound to the authenticated passenger and booking.'
  },
  {
    number: 4,
    title: 'Protection Activation',
    content: 'For online Razorpay bookings, protection activates immediately upon server-side cryptographic signature and amount verification. For CASH / COD bookings, protection is initialized as PENDING PAYMENT upon booking creation and activates only after authorized assistant cash collection is verified on the server. Selecting cash does not activate protection.'
  },
  {
    number: 5,
    title: 'Protection Period',
    content: 'Protection applies strictly during the scheduled station assistance process associated with the booking, beginning when the assistant meets the passenger at the station and ending upon completion of the booked platform/coach transit service.'
  },
  {
    number: 6,
    title: 'Baggage Categories',
    content: 'Eligible baggage is classified into four standard operational categories based on weight and container dimensions: Small Bag (up to 5 kg), Medium Bag (>5 kg to 15 kg), Large Bag (>15 kg to 25 kg), and Extra-Large Bag (>25 kg).'
  },
  {
    number: 7,
    title: 'Proposed Baggage Protection Limits',
    content: 'PROPOSED PRE-LAUNCH PROTECTION LIMITS: Small Bag (Up to 5 kg): Up to ₹2,500; Medium Bag (>5–15 kg): Up to ₹5,000; Large Bag (>15–25 kg): Up to ₹10,000; Extra-Large Bag (>25 kg): Up to ₹15,000. These limits are illustrative product terms for the current pre-launch demonstration and do not constitute active insurance coverage or a guaranteed payout. The proposed protection limit represents the maximum amount that may be considered under the applicable product terms. It does not represent an automatic payout or guaranteed reimbursement.'
  },
  {
    number: 8,
    title: 'Baggage Loss',
    content: 'Baggage Loss Protection concerns eligible baggage that cannot be located after the applicable ONECOOLIE service process. A loss incident may be considered where there is a valid booking, active protection, eligible recorded baggage, verifiable occurrence during the service, timely passenger reporting, sufficient evidence, and no applicable exclusion. Loss claims are not automatically approved and remain subject to verification and approved final terms.'
  },
  {
    number: 9,
    title: 'Baggage Damage',
    content: 'Baggage Damage Protection distinguishes genuine accidental physical damage from ordinary wear. Potentially considered damage includes broken suitcase shell, cracked hard-shell body, damaged wheel, detached wheel, broken handle, damaged telescopic handle, broken zipper caused by an eligible incident, damaged lock attached to baggage, and major structural deformation rendering baggage unusable. All damage claims are subject to verification.'
  },
  {
    number: 10,
    title: 'Damage Assessment',
    content: 'Damage is classified into three severity tiers: (1) Minor Damage (small scratches, superficial marks, minor scuffs, dirt, stains, cosmetic imperfections) — Not covered; (2) Moderate Damage (damaged wheel, broken handle, damaged zipper, functional non-structural damage) — May be considered subject to verification; (3) Major Damage (cracked shell, broken shell, major structural deformation, baggage rendered unusable) — May be considered subject to verification and applicable protection limit.'
  },
  {
    number: 11,
    title: 'Valuable and Excluded Items',
    content: 'VALUABLE ITEMS — PASSENGER RESPONSIBILITY: Passengers are responsible for keeping cash, currency, jewelry, gold, silver, precious metals, precious stones, passports, identity documents, credit/debit/bank cards, financial instruments, securities, important financial documents, laptops, tablets, mobile phones, cameras, expensive electronics, luxury watches, irreplaceable personal items, confidential documents, fragile valuables, and perishable goods with them. These items should not be placed inside checked or assisted baggage. ONECOOLIE is not responsible for loss, theft, disappearance, or damage to items that are excluded under the applicable Journey Protection terms. This statement describes proposed pre-launch product terms and does not constitute an active insurance exclusion.'
  },
  {
    number: 12,
    title: 'Prohibited/Restricted Items',
    content: 'PROHIBITED OR RESTRICTED ITEMS: Weapons, explosives, hazardous materials, flammable materials, illegal substances, stolen goods, prohibited chemicals, dangerous goods, and any items prohibited by Indian Railways or applicable law are strictly excluded. Passengers must comply with applicable railway, transport, safety, and legal requirements.'
  },
  {
    number: 13,
    title: 'Pre-existing Damage',
    content: 'Pre-existing damage is not intended to be covered. Existing cracks, pre-existing dents, previously damaged wheels, previously broken handles or zippers, and prior structural weakness are excluded. The condition of baggage may be observed and recorded upon acceptance.'
  },
  {
    number: 14,
    title: 'Normal Wear and Tear',
    content: 'Normal wear and tear is not covered. Ordinary surface scratches, minor scuffs, fabric fading, superficial stains, cosmetic deterioration, ordinary aging, minor zipper wear, and normal wheel tread wear resulting from regular transit use are excluded.'
  },
  {
    number: 15,
    title: 'Packaging Responsibilities',
    content: 'Passengers are responsible for properly securing fragile belongings and ensuring baggage is adequately closed and sealed. Proposed protection does not apply to damage caused solely by inadequate packaging, unzipped bags, overpacking, structural fatigue, or poor pre-existing condition.'
  },
  {
    number: 16,
    title: 'Passenger Responsibilities',
    content: 'Passengers are responsible for accurately declaring baggage count and category during booking, keeping all valuable and fragile items on their person, inspecting baggage upon handoff, and reporting any incident promptly.'
  },
  {
    number: 17,
    title: 'Incident Reporting',
    content: 'Passengers should report baggage loss or damage as soon as reasonably possible after becoming aware of the incident. A report should include Protection ID, Booking ID, baggage reference, incident type (Loss, Damage, or Theft/Unaccounted), date, time, station location, full bag photograph, close-up photograph of damage, and passenger statement.'
  },
  {
    number: 18,
    title: 'Evidence Requirements',
    content: 'Future assessment of reported incidents may require the booking record, Protection ID, acceptance record, service telemetry, assistant verification notes, photographic evidence, and proof of ownership. Unsubstantiated or unverified reports are not eligible.'
  },
  {
    number: 19,
    title: 'Proposed Claim Process',
    content: 'In the future authorized insurance provider model: Protection Active → Incident Occurs → Passenger Reports Loss/Damage with Evidence → ONECOOLIE Verifies Booking & Assistant Telemetry → Eligibility & Exclusions Checked → Future Authorized Provider Review → Determination. In the current pre-launch phase, no real claim adjudication or payout takes place.'
  },
  {
    number: 20,
    title: 'Repair/Replacement',
    content: 'Where damage is eventually determined eligible under future approved terms, resolution may take the form of authorized repair, replacement, or approved settlement up to the applicable bag protection limit. Cash payout or full replacement is not guaranteed.'
  },
  {
    number: 21,
    title: 'Cancellation and Refund',
    content: 'If an associated ONECOOLIE booking is cancelled prior to service commencement in accordance with the Cancellation Policy, the ₹0.50 protection fee is 100% refundable via the original payment method. For cash bookings cancelled before collection, the protection is cancelled without surcharge. Once a service is in progress or completed, the protection fee is non-refundable.'
  },
  {
    number: 22,
    title: 'Terms Acceptance',
    content: 'By selecting Journey Protection, the passenger explicitly confirms having read, understood, and accepted these pre-launch product terms. Acceptance is authoritatively logged with user ID, booking ID, Protection ID, timestamp, and version string ONECOOLIE-PROTECTION-PRELAUNCH-v2.'
  },
  {
    number: 23,
    title: 'Policy Version',
    content: 'This policy is version ONECOOLIE-PROTECTION-PRELAUNCH-v2 (effective October 2026). Historical protection records retain the exact terms version accepted at purchase and are not retroactively modified.'
  },
  {
    number: 24,
    title: 'Future Provider Integration',
    content: 'ONECOOLIE is a technology platform and not an insurance company. Legitimate insurance coverage will be underwritten solely by an authorized, IRDAI-registered insurance partner once formal regulatory and commercial agreements are finalized. Provider fields in this version remain null.'
  },
  {
    number: 25,
    title: 'Important Disclaimer',
    content: 'This feature is currently a pre-launch product demonstration and proposed protection service. It does not constitute an insurance policy, certificate of insurance, or guarantee of financial reimbursement. Neither ONECOOLIE nor its operating entities shall be liable for claims or financial compensation under this pre-launch concept demonstration.'
  }
];

export default function JourneyProtectionTermsModal({
  open,
  onClose,
  onAccept,
  hasAccepted = false,
  protectionId = null,
  bookingRef = null,
  acceptedAt = null
}) {
  const [mounted, setMounted] = useState(false);
  const modalCardRef = useRef(null);

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
                PRE-LAUNCH
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200">
                DEMONSTRATION ONLY
              </span>
              <span className="text-xs font-mono font-bold text-zinc-500">
                v2 (ONECOOLIE-PROTECTION-PRELAUNCH-v2)
              </span>
            </div>
            <h2 id="protection-terms-title" className="text-base sm:text-xl font-black text-zinc-900 tracking-tight truncate sm:whitespace-normal">
              ONECOOLIE JOURNEY PROTECTION
            </h2>
            <p id="protection-terms-desc" className="text-xs text-zinc-600 font-medium">
              Optional protection for your journey &amp; eligible baggage · <strong className="text-zinc-900 font-bold">₹0.50 / journey</strong>
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
              <span>IMPORTANT — PRE-LAUNCH PRODUCT DISCLAIMER</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-900 font-medium">
              ONECOOLIE Journey Protection is currently a product demonstration and proposed protection service. The baggage protection limits, loss and damage provisions, exclusions, eligibility rules, and claim process shown here are proposed terms and do not currently constitute an insurance policy or legally binding insurance coverage. ONECOOLIE does not currently represent itself as an insurer under these demonstration terms. Any future insurance product will be introduced only after the required regulatory, underwriting, and insurance-provider arrangements are completed. Final product terms may differ from this demonstration.
            </p>
          </div>

          {/* Active Protection Record Telemetry (if viewing after purchase/activation) */}
          {protectionId && (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-mono space-y-1.5">
              <div className="flex justify-between">
                <span className="text-zinc-500 font-sans">Protection ID:</span>
                <span className="font-bold text-zinc-900 select-all">{protectionId}</span>
              </div>
              {bookingRef && (
                <div className="flex justify-between">
                  <span className="text-zinc-500 font-sans">Booking Ref:</span>
                  <span className="font-bold text-zinc-900 select-all">{bookingRef}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-zinc-500 font-sans">Price:</span>
                <span className="font-bold text-zinc-900">₹0.50</span>
              </div>
              {acceptedAt && (
                <div className="flex justify-between">
                  <span className="text-zinc-500 font-sans">Terms Accepted At:</span>
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
                  PROPOSED PRE-LAUNCH PROTECTION LIMITS
                </h3>
              </div>
              <span className="text-[10px] font-bold text-zinc-500 font-mono">
                Illustrative Terms
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-1">
              {BAGGAGE_PROTECTION_TIERS.map((tier) => (
                <div key={tier.tier} className="bg-white rounded-xl border border-slate-200 p-3 flex flex-col justify-between shadow-2xs">
                  <div>
                    <div className="text-[11px] font-black text-zinc-900">{tier.tier}</div>
                    <div className="text-[10px] text-zinc-500 font-medium">{tier.weightRange}</div>
                    <div className="text-[10px] text-zinc-500 mt-1 leading-snug">{tier.description}</div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100">
                    <div className="text-[9px] uppercase font-bold text-zinc-400">Proposed Limit</div>
                    <div className="text-xs font-black text-blue-600 font-mono">{tier.limit}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-blue-950 text-[11px] leading-relaxed space-y-1">
              <p className="font-semibold">
                These limits are illustrative product terms for the current pre-launch demonstration and do not constitute active insurance coverage or a guaranteed payout.
              </p>
              <p className="text-blue-900">
                The proposed protection limit represents the maximum amount that may be considered under the applicable product terms. It does not represent an automatic payout or guaranteed reimbursement.
              </p>
            </div>
          </div>

          {/* ── BAGGAGE VS CONTENTS & VALUABLE ITEMS CALLOUT ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {/* Bag Container vs Contents */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/40 p-4 space-y-2">
              <div className="flex items-center gap-2 font-bold text-zinc-900 text-xs">
                <Package className="w-4 h-4 text-zinc-600" />
                <span>Baggage vs Baggage Contents</span>
              </div>
              <p className="text-[11px] text-zinc-600 leading-relaxed">
                <strong>Baggage:</strong> Suitcase, trolley, backpack, duffel bag, or other eligible luggage container.
              </p>
              <p className="text-[11px] text-zinc-600 leading-relaxed">
                <strong>Contents:</strong> Items placed inside the baggage. Proposed protection primarily concerns eligible baggage itself. Baggage contents are subject to strict exclusions and final approved terms.
              </p>
            </div>

            {/* Valuable Items Callout */}
            <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 space-y-2 text-rose-950">
              <div className="flex items-center gap-2 font-black text-xs text-rose-900">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>VALUABLE ITEMS — PASSENGER RESPONSIBILITY</span>
              </div>
              <p className="text-[11px] leading-relaxed font-medium">
                Passengers are responsible for keeping cash, jewelry, electronic devices (phones, laptops, cameras), identity documents, financial instruments, and other valuable or irreplaceable belongings with them. These items should not be placed inside checked or assisted baggage.
              </p>
              <p className="text-[10px] text-rose-800 leading-tight">
                ONECOOLIE is not responsible for loss, theft, disappearance, or damage to items that are excluded under the applicable Journey Protection terms. This statement describes proposed pre-launch product terms and does not constitute an active insurance exclusion.
              </p>
            </div>
          </div>

          {/* ── DAMAGE SEVERITY TIERS ── */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2.5 shadow-2xs">
            <h3 className="font-black text-xs text-zinc-900 uppercase tracking-wide">
              Damage Severity Classification
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px]">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="font-bold text-zinc-900">1. Minor Damage</div>
                <div className="text-zinc-600 text-[10px]">Small scratches, superficial marks, minor scuffs, dirt, stains, cosmetic imperfections.</div>
                <div className="pt-1 font-bold text-rose-600 text-[10px] uppercase">Treatment: Not covered</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="font-bold text-zinc-900">2. Moderate Damage</div>
                <div className="text-zinc-600 text-[10px]">Damaged wheel, broken handle, damaged zipper, functional non-structural damage.</div>
                <div className="pt-1 font-bold text-amber-700 text-[10px] uppercase">Treatment: May be considered</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="font-bold text-zinc-900">3. Major Damage</div>
                <div className="text-zinc-600 text-[10px]">Cracked shell, broken shell, major structural deformation, baggage rendered unusable.</div>
                <div className="pt-1 font-bold text-blue-700 text-[10px] uppercase">Treatment: May be considered (subject to limit)</div>
              </div>
            </div>
          </div>

          {/* ── PROPOSED PRE-LAUNCH DAMAGE TERMS TABLE ── */}
          <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="bg-slate-100/90 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-black text-xs sm:text-sm text-zinc-900 uppercase tracking-wide">
                PROPOSED PRE-LAUNCH DAMAGE TERMS
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
                  {DAMAGE_TERMS_TABLE.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
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
            {PRE_LAUNCH_TERMS_SECTIONS.map((sec) => (
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
            Terms Version: <span className="font-mono font-bold text-zinc-800">ONECOOLIE-PROTECTION-PRELAUNCH-v2</span>
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-white hover:bg-slate-100 text-zinc-800 font-bold text-xs border border-slate-200 transition-colors cursor-pointer text-center"
            >
              Close
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
                <span>I Understand &amp; Accept</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
