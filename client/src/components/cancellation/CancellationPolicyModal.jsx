import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from '../../api/axios';
import { ShieldCheck, CheckCircle2, AlertTriangle, X, Clock, CreditCard, Ban } from 'lucide-react';

export default function CancellationPolicyModal({ isOpen = true, onClose }) {
  const [policyData, setPolicyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (onClose) onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    axios.get('/bookings/cancellation-policy')
      .then((res) => {
        if (res.data?.success && res.data?.policy) {
          setPolicyData(res.data.policy);
        }
      })
      .catch(() => {
        // Fallback policy data
        setPolicyData({
          unassignedRefundPercent: 100,
          assignedEligibleRefundPercent: 100,
          assignedVoluntaryRefundPercent: 70,
          voluntaryCancellationChargePercent: 30
        });
      })
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen || !mounted || typeof document === 'undefined') return null;

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[110] bg-black/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 text-left relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-zinc-400 hover:text-black p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-zinc-900 tracking-tight">ONECOOLIE Cancellation & Refund Policy</h3>
              <p className="text-xs text-zinc-500">Transparent and fair policies for Indian Railways station assistance.</p>
            </div>
          </div>

          <div className="space-y-3 text-xs leading-relaxed">
            {/* Section 1: Before Assistant Assignment */}
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-100 rounded-2xl">
              <h4 className="font-extrabold text-emerald-950 flex items-center gap-1.5 mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Before Assistant Assignment (100% Refund)
              </h4>
              <p className="text-emerald-900/90 text-[11px]">
                If your assistant has not yet been assigned, you can cancel anytime with a full 100% refund (₹0 cancellation fee) across all genuine reasons such as train delays, schedule changes, or personal emergencies.
              </p>
            </div>

            {/* Section 2: After Assistant Assignment */}
            <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-2xl">
              <h4 className="font-extrabold text-blue-950 flex items-center gap-1.5 mb-1">
                <Clock className="w-4 h-4 text-blue-600" />
                After Assistant Assignment
              </h4>
              <p className="text-blue-900/90 text-[11px] mb-2">
                Once a sahayak is allocated and confirmed for your platform assistance:
              </p>
              <ul className="space-y-1.5 text-[11px] text-blue-900">
                <li className="flex items-start gap-1.5">
                  <span className="font-bold">• Change Booking:</span> You can rebook or modify your journey date, train, or coach details instead of cancelling.
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="font-bold">• Travel Disruption (100% Refund):</span> Cancellations due to railway delays, train cancellation, or genuine emergencies receive a 100% refund.
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="font-bold">• Voluntary Cancellation (70% Refund):</span> Cancellations without a travel disruption reason incur a 30% cancellation fee to compensate the assigned assistant's platform reservation.
                </li>
              </ul>
            </div>

            {/* Section 3: In-Service & Completed */}
            <div className="p-3.5 bg-rose-50/70 border border-rose-100 rounded-2xl">
              <h4 className="font-extrabold text-rose-950 flex items-center gap-1.5 mb-1">
                <Ban className="w-4 h-4 text-rose-600" />
                Service In-Progress & Completed Trips
              </h4>
              <p className="text-rose-900/90 text-[11px]">
                Cancellations are strictly not permitted once assistance has started (In-Service OTP verified) or after the service has been marked complete.
              </p>
            </div>

            {/* Section 4: Payment Methods */}
            <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-2xl">
              <h4 className="font-extrabold text-zinc-900 flex items-center gap-1.5 mb-1">
                <CreditCard className="w-4 h-4 text-zinc-600" />
                Payment Method & Refund Settlement
              </h4>
              <p className="text-zinc-600 text-[11px] mb-1">
                <strong>Online Payments:</strong> Gateway refunds (Razorpay / Cashfree) are executed automatically upon cancellation. Settlement typically reflects in your source account within standard banking turnaround times.
              </p>
              <p className="text-zinc-600 text-[11px]">
                <strong>Cash on Delivery (COD):</strong> No online transaction reversal occurs. The booking and payment status are updated to cancelled in your account.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 px-6 rounded-full bg-black hover:bg-zinc-800 text-white font-bold text-xs transition-all cursor-pointer shadow-xs"
            >
              I Understand
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
