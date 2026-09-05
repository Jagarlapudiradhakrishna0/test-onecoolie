import { useState } from 'react';

/* ============================================================
   PAYMENT MODAL — Apple-Style Minimal Checkout
   Strictly Black, White, and OneCoolie Blue (#2563EB)
   ============================================================ */

export default function PaymentModal({ open, total, onClose, onPaid }) {
  const [method, setMethod] = useState(null);
  const [processing, setProcessing] = useState(false);

  if (!open) return null;

  const handleConfirm = async () => {
    if (!method) return;
    setProcessing(true);
    try {
      await onPaid(method);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl animate-scale-in text-black dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold tracking-tight">
              Payment Method
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Select how you would like to settle this booking
            </p>
          </div>

          <div className="text-right">
            <span className="text-xs font-mono uppercase text-zinc-400 block">Total</span>
            <span className="text-2xl font-bold font-mono text-black dark:text-white">
              ₹{total}
            </span>
          </div>
        </div>

        {/* Options */}
        <div className="space-y-3 mb-6">
          {[
            {
              id: 'upi',
              title: 'Instant Online UPI',
              description: 'Fast digital checkout via PhonePe, GPay, Paytm, or BHIM',
              badge: 'Instant',
            },
            {
              id: 'cash',
              title: 'Pay Upon Completion',
              description: 'Hand over cash or scan assistant direct QR at destination',
              badge: null,
            },
          ].map((option) => {
            const isSelected = method === option.id;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setMethod(option.id)}
                className={`w-full flex items-start gap-4 text-left p-4 rounded-xl transition-all ${
                  isSelected
                    ? 'border-2 border-blue-600 bg-blue-50/40 dark:bg-blue-950/30'
                    : 'border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                {/* Radio Indicator */}
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                    isSelected
                      ? 'border-blue-600 bg-blue-600'
                      : 'border-zinc-300 dark:border-zinc-600 bg-transparent'
                  }`}
                >
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm text-black dark:text-white">
                      {option.title}
                    </span>
                    {option.badge && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                        {option.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    {option.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* UPI Instruction Box */}
        {method === 'upi' && (
          <div className="p-4 rounded-xl mb-6 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-center animate-fade-in">
            <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400 mb-1">
              PAYMENT GATEWAY
            </p>
            <p className="text-xs font-semibold text-black dark:text-white font-mono">
              OneCoolie@okaxis · Secure 256-bit SSL
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary flex-1 py-3"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!method || processing}
            className="btn-primary flex-1 py-3"
          >
            {processing ? 'Confirming...' : method === 'upi' ? 'Pay ₹' + total : 'Confirm Booking'}
          </button>
        </div>

        <p className="text-center text-[11px] text-zinc-400 mt-4">
          OTP verification issued immediately upon confirmation
        </p>
      </div>
    </div>
  );
}