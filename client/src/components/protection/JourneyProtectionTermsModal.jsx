import React from 'react';
import { X, ShieldCheck, AlertCircle, FileText, CheckCircle2, Printer } from 'lucide-react';

/* ============================================================
   ONECOOLIE JOURNEY PROTECTION — PRE-LAUNCH POLICY & TERMS MODAL
   • Status: PRE-LAUNCH / DEMONSTRATION ONLY
   • Authoritative Customer Price: ₹0.50 / journey
   • STRICT: ZERO specific benefit/payout amounts displayed
   • Strictly complies with Swiss Minimal typography and brand guidelines
   ============================================================ */

export const PRE_LAUNCH_TERMS_SECTIONS = [
  {
    number: 1,
    title: 'About Journey Protection',
    content: 'ONECOOLIE Journey Protection is a proposed optional journey-protection service designed to provide additional assistance and support to passengers during eligible journeys booked through the ONECOOLIE platform. This feature is currently a PRE-LAUNCH PRODUCT DEMONSTRATION and does NOT constitute an insurance policy, certificate of insurance, or guarantee of financial payout.'
  },
  {
    number: 2,
    title: 'Eligibility',
    content: 'To be eligible for proposed Journey Protection, the passenger must hold an active and valid ONECOOLIE station assistance booking for an eligible train journey, explicitly opt in to Journey Protection during or for that booking, and successfully complete the server-verified payment of ₹0.50. Protection is non-transferable and remains strictly tied to the designated booking and authenticated passenger.'
  },
  {
    number: 3,
    title: 'Protection Activation',
    content: 'Protection becomes ACTIVE only upon: (1) explicit passenger opt-in and versioned terms acceptance, (2) successful completion of the ₹0.50 transaction via the authorized gateway, (3) server-authoritative cryptographic signature and amount verification, (4) authenticated booking ownership validation, and (5) successful server-side issuance of a unique Protection ID (OCP-XXXXXXXX). Frontend confirmation alone never activates protection.'
  },
  {
    number: 4,
    title: 'Protection Period',
    content: 'Journey Protection is intended to apply strictly during the eligible scheduled rail journey associated with the protected ONECOOLIE booking, commencing from the scheduled departure or arrival assistance time at the station and concluding upon completion of the booked station assistance service.'
  },
  {
    number: 5,
    title: 'Proposed Protection Events',
    content: 'Certain accidental or journey-related emergency events may be considered under the future protection product, subject to final underwriting terms, regulatory approvals, verification guidelines, and authorized insurance-provider arrangements. No specific monetary compensation or payout is guaranteed under this pre-launch demonstration.'
  },
  {
    number: 6,
    title: 'Exclusions',
    content: 'Proposed product-design exclusions include: (a) fraudulent or dishonest claims, (b) intentionally caused incidents or gross negligence, (c) false, incomplete, or misleading journey details, (d) events occurring outside the eligible journey timeframe, (e) protection purchased after an incident has already occurred, (f) invalid, cancelled, or refunded bookings, and (g) any events excluded under final provider-approved terms.'
  },
  {
    number: 7,
    title: 'Incident Reporting',
    content: 'Passengers experiencing journey disruption or emergency incidents during a protected journey may record details including incident date, time, station location, description, and supporting travel documentation. Incident reporting and claim processing will be formally enabled after the future insurance-provider integration is finalized.'
  },
  {
    number: 8,
    title: 'Future Claim Process',
    content: 'When legitimate insurance-provider integration is completed, a formal claims workflow will allow submission of verified claims to the underwriting partner. In the current pre-launch phase, no real insurance claim adjudication or financial payout takes place.'
  },
  {
    number: 9,
    title: 'Cancellation and Refund',
    content: 'If an associated ONECOOLIE booking is cancelled prior to service commencement in accordance with the ONECOOLIE Cancellation Policy, the ₹0.50 protection fee is 100% refundable via the original payment method. Unpaid protection requests are cancelled automatically. Once a protected journey is completed, the protection expires and the fee is non-refundable.'
  },
  {
    number: 10,
    title: 'Terms Acceptance',
    content: 'By selecting the Journey Protection option, the passenger confirms having read, understood, and accepted these pre-launch product terms. Acceptance is recorded server-side with an immutable timestamp, user ID, booking ID, and the exact terms version (ONECOOLIE-PROTECTION-PRELAUNCH-v1).'
  },
  {
    number: 11,
    title: 'Future Insurance Provider',
    content: 'ONECOOLIE is not an insurance company and does not underwrite risk. Future insurance coverage will be provided through licensed, IRDAI-registered insurance underwriting partners once commercial and regulatory agreements are concluded. Provider references in this version remain null.'
  },
  {
    number: 12,
    title: 'Important Limitations',
    content: 'This feature is provided for informational and demonstration purposes only. Neither ONECOOLIE nor its operating entity shall be liable for claims, damages, or financial compensation arising from this pre-launch concept demonstration.'
  },
  {
    number: 13,
    title: 'Pre-Launch Disclaimer',
    content: 'This feature is currently a pre-launch product demonstration and does not constitute an insurance policy or guarantee of payment. Actual insurance coverage will be introduced only after the required regulatory, underwriting, and insurance-provider arrangements are completed.'
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
  if (!open) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="protection-terms-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/70">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-blue-100 text-blue-800 border border-blue-200">
                PRE-LAUNCH
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200">
                DEMONSTRATION ONLY
              </span>
              <span className="text-xs font-mono font-bold text-zinc-500">
                v1 (ONECOOLIE-PROTECTION-PRELAUNCH-v1)
              </span>
            </div>
            <h2 id="protection-terms-title" className="text-lg sm:text-xl font-black text-zinc-900 tracking-tight">
              ONECOOLIE JOURNEY PROTECTION
            </h2>
            <p className="text-xs text-zinc-600 font-medium">
              Optional protection for your journey. · <strong className="text-zinc-900 font-bold">₹0.50 / journey</strong>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handlePrint}
              className="w-9 h-9 rounded-full bg-white hover:bg-slate-100 text-zinc-600 border border-slate-200 flex items-center justify-center cursor-pointer transition-colors"
              title="Print Policy Document"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white hover:bg-slate-100 text-zinc-600 border border-slate-200 flex items-center justify-center cursor-pointer transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs text-zinc-700 leading-relaxed">
          {/* Prominent Pre-Launch Disclaimer Box */}
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-900 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-950 text-xs">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>IMPORTANT — PRE-LAUNCH PRODUCT DISCLAIMER</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-900 font-medium">
              ONECOOLIE Journey Protection is currently a product demonstration and proposed service concept. It is not an insurance policy and does not currently provide legally binding insurance coverage or guarantee of payment. Any future insurance product will be introduced only after the required regulatory, underwriting, and insurance-provider arrangements are completed. Final terms may differ from this demonstration.
            </p>
          </div>

          {/* Active Protection Record Telemetry (if viewing after activation) */}
          {protectionId && (
            <div className="p-3.5 rounded-2xl bg-slate-100/80 border border-slate-200 text-xs font-mono space-y-1">
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

          {/* 13 Structured Sections */}
          <div className="space-y-4 pt-1">
            {PRE_LAUNCH_TERMS_SECTIONS.map((sec) => (
              <div key={sec.number} className="border-b border-slate-100 pb-3.5 last:border-none">
                <h3 className="font-black text-zinc-900 text-xs sm:text-sm mb-1">
                  {sec.number}. {sec.title}
                </h3>
                <p className="text-zinc-600 text-[11px] sm:text-xs leading-relaxed">
                  {sec.content}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/60">
          <div className="text-[11px] text-zinc-500 font-medium text-center sm:text-left">
            Terms Version: <span className="font-mono font-bold text-zinc-800">ONECOOLIE-PROTECTION-PRELAUNCH-v1</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-full bg-white hover:bg-slate-100 text-zinc-800 font-bold text-xs border border-slate-200 transition-colors cursor-pointer"
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
                className="flex-1 sm:flex-initial px-6 py-2.5 rounded-full bg-black hover:bg-zinc-800 text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>I Understand &amp; Accept</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
