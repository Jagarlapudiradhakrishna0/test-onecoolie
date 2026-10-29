import { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Check,
  RotateCw,
  ArrowRight,
  ArrowLeft,
  Banknote,
  X,
  CreditCard,
  AlertTriangle,
  Lock,
  Loader2,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';
import oneCoolieLogo from '../assets/onecoolie-logo.png';
import axios from '../api/axios';
import { loadRazorpayScript } from '../utils/razorpay';
import {
  isCashPayment,
  isOnlinePayment,
  normalizePaymentMethod
} from '../utils/paymentClassification';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

/* ============================================================
   ONECOOLIE PRODUCTION PAYMENT MODAL — Razorpay Standard Checkout
   • Production Razorpay Standard Checkout (UPI, Cards, NetBanking, Wallets)
   • Server-Authoritative Fare & Order Creation (Paise accuracy)
   • Cryptographic Server-Side Verification (POST /api/payments/verify)
   • Realtime Socket.IO & Controlled Polling Fallback
   • Cash on Service Direct Booking Option
   • Zero Demo QR Codes, Zero Fake Countdown Timers, Zero Secrets
   ============================================================ */

export default function PaymentModal({ open, total = 0, onClose, onPaid, bookingData }) {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null); // 'online' | 'cash'
  const [processing, setProcessing] = useState(false);
  const [paymentStep, setPaymentStep] = useState('select'); // 'select' | 'online_review'
  const [activeBooking, setActiveBooking] = useState(null);
  const [razorpayOrder, setRazorpayOrder] = useState(null);
  const [orderInitializing, setOrderInitializing] = useState(false);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [verifiedPaymentId, setVerifiedPaymentId] = useState(null);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Reset state on modal open
  useEffect(() => {
    if (open) {
      setSelectedPaymentMethod(null);
      setPaymentVerified(false);
      setPaymentError(null);
      setPaymentStep('select');
      setActiveBooking(null);
      setRazorpayOrder(null);
      setVerifiedPaymentId(null);
      setProcessing(false);
      setOrderInitializing(false);

      // Check if there is an active incomplete payment session saved
      try {
        const raw = sessionStorage.getItem('onecoolie_active_payment');
        if (raw) {
          const saved = JSON.parse(raw);
          if (saved && saved.activeBooking && saved.bookingId) {
            setActiveBooking(saved.activeBooking);
            if (saved.razorpayOrder) setRazorpayOrder(saved.razorpayOrder);
          }
        }
      } catch (e) {
        // ignore
      }
    }
  }, [open]);

  // Real-time Socket.IO Listener and Controlled Polling Fallback
  useEffect(() => {
    if (!open || !activeBooking?.id || paymentVerified) return;

    let pollCount = 0;
    const maxPolls = 20; // Up to 60s
    let pollTimer = null;
    let isSubscribed = true;

    const onPaymentSuccess = async (bookingObj, pId = null) => {
      if (!isSubscribed || paymentVerified) return;
      setPaymentVerified(true);
      if (pId) setVerifiedPaymentId(pId);
      toast.success('Payment successfully verified by Razorpay!');

      try {
        sessionStorage.removeItem('onecoolie_active_payment');
      } catch (e) { }

      setTimeout(async () => {
        if (isSubscribed) {
          await onPaid('online', bookingObj || activeBooking);
        }
      }, 700);
    };

    // 1. Socket.IO Real-Time Listener
    const handleSocketPayment = (payload) => {
      const bId = payload?.bookingId || payload?.booking_id || payload?.booking?.id || payload?.booking?.booking_id;
      if (bId && (String(bId) === String(activeBooking.id) || String(bId) === String(activeBooking.booking_id))) {
        onPaymentSuccess(payload.booking || activeBooking, payload.payment_id);
      }
    };

    if (typeof window !== 'undefined' && window.socket) {
      window.socket.on('payment:success', handleSocketPayment);
      window.socket.on('payment_verified', handleSocketPayment);
    }

    // 2. Controlled Polling Fallback (every 3s)
    const checkPaymentStatus = async () => {
      if (!isSubscribed || paymentVerified) return true;
      try {
        const { data } = await axios.get(`/payments/${activeBooking.id}/status`);
        if (data?.payment_status === 'paid' || data?.status === 'paid') {
          onPaymentSuccess(data.booking || activeBooking, data.gateway_payment_id);
          return true;
        } else if (data?.payment_status === 'failed') {
          setPaymentError(data.failure_reason || 'Payment was not completed. Please retry.');
          return true;
        }
      } catch (err) {
        // Ignore temporary network hiccups during poll
      }
      return false;
    };

    const runPoll = async () => {
      if (!isSubscribed || pollCount >= maxPolls) return;
      pollCount++;
      const finished = await checkPaymentStatus();
      if (!finished && isSubscribed && pollCount < maxPolls) {
        pollTimer = setTimeout(runPoll, 3000);
      }
    };

    pollTimer = setTimeout(runPoll, 3000);

    return () => {
      isSubscribed = false;
      if (pollTimer) clearTimeout(pollTimer);
      if (typeof window !== 'undefined' && window.socket) {
        window.socket.off('payment:success', handleSocketPayment);
        window.socket.off('payment_verified', handleSocketPayment);
      }
    };
  }, [open, activeBooking?.id, paymentVerified, onPaid]);

  if (!open) return null;

  // Initialize or fetch existing order from server
  const initializeOnlineOrder = async () => {
    // 1. Validate payment method: cash methods must never enter Razorpay flow
    const methodToCheck = normalizePaymentMethod(
      selectedPaymentMethod || bookingData?.payment_method || bookingData?.paymentMethod || 'online'
    );
    if (isCashPayment(methodToCheck)) {
      const errMsg = 'Cash on service cannot be processed via online payment gateway.';
      setPaymentError(errMsg);
      toast.error(errMsg);
      return null;
    }

    // 2. Validate payable amount
    const numericTotal = Number(total || 0);
    if (!numericTotal || numericTotal <= 0) {
      const errMsg = 'A valid payable amount is required to create a payment order.';
      setPaymentError(errMsg);
      toast.error(errMsg);
      return null;
    }

    setOrderInitializing(true);
    setPaymentError(null);

    try {
      const orderPayload = {
        train_no: bookingData?.selectedTrain?.train_no || bookingData?.selectedTrain?.train_number || '12727',
        train_name: bookingData?.selectedTrain?.train_name || 'Godavari Express',
        station_code: bookingData?.station || 'KZJ',
        journey_date: bookingData?.journeyDate || new Date().toISOString().split('T')[0],
        journey_time: bookingData?.journeyTime || '10:00',
        services: {
          ...(bookingData?.services || {}),
          platform: bookingData?.selectedTrain?.platform || '2',
          luggage: bookingData?.luggageTotalCount || 0,
          luggageCounts: bookingData?.luggageCounts || { small: 0, medium: 0, large: 0 },
          luggage_details: bookingData?.luggageSummaryLabel || '',
        },
        payment_method: 'online',
        coach: bookingData?.coach || 'S1',
        seat_number: bookingData?.seatNumber || '1',
        berth_type: bookingData?.berthType || 'LB',
        action_type: bookingData?.actionType || 'load_to_seat',
        pnr: bookingData?.pnrInput || '',
        platform: bookingData?.selectedTrain?.platform || '2',
        journey_protection: Boolean(bookingData?.journeyProtection),
        terms_accepted: Boolean(bookingData?.journeyProtection),
        terms_version: 'ONECOOLIE-PROTECTION-PRELAUNCH-v2'
      };

      const { data: orderRes } = await axios.post('/payments/create-order', orderPayload);

      if (!orderRes || !orderRes.booking) {
        throw new Error(orderRes?.message || 'Failed to initialize payment gateway order.');
      }

      setActiveBooking(orderRes.booking);
      if (orderRes.razorpay) {
        setRazorpayOrder(orderRes.razorpay);
      }

      sessionStorage.setItem('onecoolie_active_payment', JSON.stringify({
        active: true,
        bookingId: orderRes.booking.id,
        bookingRef: orderRes.booking.booking_id,
        activeBooking: orderRes.booking,
        razorpayOrder: orderRes.razorpay,
        total,
        ...(bookingData || {})
      }));

      return { booking: orderRes.booking, razorpay: orderRes.razorpay };
    } catch (err) {
      console.error('Create order error:', err);
      const msg = err.response?.data?.message || err.message || 'Unable to connect to payment server. Please retry.';
      setPaymentError(msg);
      toast.error(msg);
      return null;
    } finally {
      if (isMountedRef.current) setOrderInitializing(false);
    }
  };

  // Launch Razorpay Standard Checkout Dialog
  const launchRazorpayCheckout = async (bookingObj, rzpData) => {
    setProcessing(true);
    setPaymentError(null);

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || typeof window === 'undefined' || !window.Razorpay) {
        throw new Error('Razorpay Checkout SDK could not be loaded. Please check your internet connection.');
      }

      if (!rzpData || !rzpData.order_id || !rzpData.key_id) {
        throw new Error('Razorpay order details missing from server response.');
      }

      const targetBookingId = bookingObj.id || bookingObj.booking_id;

      const options = {
        key: rzpData.key_id,
        amount: rzpData.amount,
        currency: rzpData.currency || 'INR',
        name: 'ONECOOLIE',
        description: `Station Assistance #${bookingObj.booking_id || targetBookingId}`,
        image: oneCoolieLogo,
        order_id: rzpData.order_id,
        handler: async function (response) {
          try {
            setProcessing(true);
            setPaymentError(null);

            // Authoritative server-side verification with cryptographic HMAC signature
            const { data: verifyRes } = await axios.post('/payments/verify', {
              booking_id: targetBookingId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            if (!verifyRes || !verifyRes.success) {
              throw new Error(verifyRes?.message || 'Payment signature verification failed.');
            }

            setPaymentVerified(true);
            setVerifiedPaymentId(response.razorpay_payment_id);
            toast.success('Payment verified successfully!');

            try {
              sessionStorage.removeItem('onecoolie_active_payment');
            } catch (e) { }

            setTimeout(async () => {
              if (isMountedRef.current) {
                await onPaid('online', verifyRes.booking || bookingObj);
              }
            }, 600);

          } catch (vErr) {
            console.error('Verification error:', vErr);
            const errMsg = vErr.response?.data?.message || vErr.message || 'Payment verification failed.';
            setPaymentError(errMsg);
            toast.error(errMsg);
          } finally {
            if (isMountedRef.current) setProcessing(false);
          }
        },
        prefill: {
          name: user?.name || user?.full_name || '',
          email: user?.email || '',
          contact: user?.phone || user?.phoneNumber || user?.phone_number || ''
        },
        notes: {
          booking_id: String(targetBookingId),
          passenger_id: String(user?.id || '')
        },
        theme: {
          color: '#1463FF'
        },
        modal: {
          ondismiss: function () {
            if (isMountedRef.current) {
              setProcessing(false);
              toast('Checkout was closed. You can retry anytime.', { icon: 'ℹ️' });
            }
          }
        }
      };

      const rzpInstance = new window.Razorpay(options);
      rzpInstance.on('payment.failed', function (resp) {
        const desc = resp?.error?.description || 'Transaction cancelled or failed at gateway';
        setPaymentError(`Payment failed: ${desc}`);
        toast.error(`Payment failed: ${desc}`);
        if (isMountedRef.current) setProcessing(false);
      });

      rzpInstance.open();
    } catch (err) {
      console.error('Razorpay launch error:', err);
      const msg = err.response?.data?.message || err.message || 'Unable to open payment checkout.';
      setPaymentError(msg);
      toast.error(msg);
      if (isMountedRef.current) setProcessing(false);
    }
  };

  // Passenger clicks "Online Payment"
  const handleSelectOnline = async () => {
    if (orderInitializing || processing) return;
    setSelectedPaymentMethod('online');
    setPaymentStep('online_review');
    if (activeBooking && razorpayOrder) {
      await launchRazorpayCheckout(activeBooking, razorpayOrder);
      return;
    }
    const orderResult = await initializeOnlineOrder();
    if (orderResult && orderResult.razorpay) {
      await launchRazorpayCheckout(orderResult.booking, orderResult.razorpay);
    }
  };

  // Re-open checkout button
  const handleRetryOnline = async () => {
    if (orderInitializing || processing) return;
    setSelectedPaymentMethod('online');
    if (activeBooking && razorpayOrder) {
      await launchRazorpayCheckout(activeBooking, razorpayOrder);
    } else {
      const orderResult = await initializeOnlineOrder();
      if (orderResult && orderResult.razorpay) {
        await launchRazorpayCheckout(orderResult.booking, orderResult.razorpay);
      }
    }
  };

  // Passenger chooses Cash on Service
  const handleCashConfirm = async () => {
    if (orderInitializing || processing) return;
    setSelectedPaymentMethod('cash');
    setProcessing(true);
    setPaymentError(null);
    try {
      sessionStorage.removeItem('onecoolie_active_payment');
      await onPaid('cash');
    } catch (err) {
      console.error('Cash booking confirmation error:', err);
      const msg = err.response?.data?.message || err.message || 'Cash booking confirmation failed.';
      setPaymentError(msg);
      toast.error(msg);
    } finally {
      if (isMountedRef.current) setProcessing(false);
    }
  };

  const handleModalClose = () => {
    try {
      sessionStorage.removeItem('onecoolie_active_payment');
    } catch (e) { }
    setSelectedPaymentMethod(null);
    onClose();
  };

  const formattedAmount = Number(total || 0).toFixed(2);
  const displayAmount = Number(total) % 1 === 0 ? total : formattedAmount;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-md animate-fade-in select-none overflow-y-auto"
      onClick={handleModalClose}
    >
      <div
        className="w-full max-w-xl bg-white rounded-[28px] sm:rounded-[32px] border border-slate-200/90 shadow-[0_25px_70px_-15px_rgba(7,26,61,0.22)] p-5 sm:p-7 relative animate-scale-in text-zinc-900 my-auto overflow-hidden transition-all duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Verified Success Overlay */}
        {paymentVerified && (
          <div className="absolute inset-0 bg-white/98 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6 text-center space-y-3 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto border-2 border-emerald-300 animate-scale-in">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900">Payment Verified!</h3>
            <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
              Your transaction was verified authoritatively with Razorpay. Confirming your station assistance booking...
            </p>
            {verifiedPaymentId && (
              <span className="font-mono text-[11px] bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-bold">
                Ref: {verifiedPaymentId}
              </span>
            )}
          </div>
        )}

        {/* ── Top Header Bar ────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3.5 mb-5">
          <div className="flex items-center gap-2.5 sm:gap-3">
            {paymentStep === 'online_review' && (
              <button
                type="button"
                onClick={() => {
                  setPaymentStep('select');
                  setPaymentError(null);
                }}
                className="px-2.5 sm:px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-zinc-700 hover:text-zinc-900 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                aria-label="Back to payment methods"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Back</span>
              </button>
            )}
            <img
              src={oneCoolieLogo}
              alt="OneCoolie"
              className="h-8 sm:h-9 md:h-10 w-auto object-contain"
            />
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2 text-right">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="hidden sm:block text-left">
                <span className="text-xs font-extrabold text-[#071A3D] block leading-tight">
                  Razorpay Checkout
                </span>
                <span className="text-[11px] font-medium text-[#7C8494] block leading-tight">
                  256-bit encrypted
                </span>
              </div>
            </div>

            <div className="h-6 w-px bg-slate-200" />

            <button
              type="button"
              onClick={handleModalClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-zinc-500 hover:text-zinc-800 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Payment Error Banner if any */}
        {paymentError && (
          <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-start justify-between gap-2.5 animate-fade-in">
            <div className="flex items-start gap-2 min-w-0">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-semibold leading-relaxed">{paymentError}</span>
            </div>
            <button
              type="button"
              onClick={() => setPaymentError(null)}
              className="text-rose-500 hover:text-rose-800 font-bold px-1.5 py-0.5 cursor-pointer shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ────────────────────────────────────────────────────────────
            STEP 1: SELECT PAYMENT METHOD (Online via Razorpay OR Cash on Service)
            ──────────────────────────────────────────────────────────── */}
        {paymentStep === 'select' && (
          <div className="space-y-5 animate-fade-in">
            {/* Header & Dynamic Amount */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-[#071A3D] tracking-tight leading-tight">
                  {t('payments.chooseMethod')}
                </h3>
                <p className="text-xs sm:text-sm text-zinc-500 mt-1 font-medium">
                  {t('payments.selectPreferred')}
                </p>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block">
                  {t('payments.amount')}
                </span>
                <span className="text-2xl sm:text-3xl font-black text-[#1463FF] tracking-tight font-sans">
                  ₹{displayAmount}
                </span>
              </div>
            </div>

            {/* The Two Official Payment Options */}
            <div className="space-y-3 pt-1">

              {/* Option 1: Online Payment (Razorpay Standard Checkout) */}
              <div
                role="button"
                tabIndex={0}
                onClick={handleSelectOnline}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') handleSelectOnline();
                }}
                className="w-full p-4 sm:p-5 rounded-2xl sm:rounded-3xl border-2 border-slate-200 hover:border-[#1463FF] bg-white hover:bg-blue-50/20 transition-all duration-150 cursor-pointer text-left group shadow-xs hover:shadow-md relative overflow-hidden"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#1463FF] flex items-center justify-center shrink-0 border border-blue-200/80 group-hover:scale-105 group-hover:bg-[#1463FF] group-hover:text-white transition-all duration-150">
                      <CreditCard className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base sm:text-lg font-black text-[#071A3D] group-hover:text-[#1463FF] transition-colors leading-tight">
                          {t('payments.onlinePayment')}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[#1463FF] border border-blue-200 text-[10px] font-extrabold tracking-wide uppercase">
                          Razorpay Standard
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-zinc-700 text-[10px] font-bold">
                          UPI (GPay / PhonePe / Paytm)
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-zinc-700 text-[10px] font-bold">
                          Debit & Credit Cards
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-zinc-700 text-[10px] font-bold">
                          Net Banking
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="w-9 h-9 rounded-full bg-slate-100 group-hover:bg-[#1463FF] text-zinc-400 group-hover:text-white flex items-center justify-center shrink-0 transition-all duration-150">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Option 2: Cash on Service */}
              <div
                role="button"
                tabIndex={0}
                onClick={handleCashConfirm}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') handleCashConfirm();
                }}
                className="w-full p-4 sm:p-5 rounded-2xl sm:rounded-3xl border-2 border-slate-200 hover:border-emerald-500 bg-white hover:bg-emerald-50/20 transition-all duration-150 cursor-pointer text-left group shadow-xs hover:shadow-md relative overflow-hidden"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200/80 group-hover:scale-105 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-150">
                      <Banknote className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base sm:text-lg font-black text-[#071A3D] group-hover:text-emerald-700 transition-colors leading-tight">
                          {t('payments.cashOnPayment')}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-zinc-700 border border-slate-200 text-[10px] font-extrabold tracking-wide uppercase">
                          {t('payments.payAfterService')}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-zinc-700 text-[10px] font-bold">
                          {t('payments.cashUponArrival')}
                        </span>
                        {bookingData?.journeyProtection && (
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                            {t('payments.protectionAdded')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="w-9 h-9 rounded-full bg-slate-100 group-hover:bg-emerald-600 text-zinc-400 group-hover:text-white flex items-center justify-center shrink-0 transition-all duration-150">
                    {processing ? (
                      <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <ArrowRight className="w-4 h-4" />
                    )}
                  </div>
                </div>
              </div>

            </div>

            {/* Bottom Security Footer */}
            <div className="pt-2 text-center border-t border-slate-100">
              <p className="text-[11px] text-zinc-400 flex items-center justify-center gap-1.5 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Protected by Razorpay 256-bit PCI-DSS Level 1 compliance</span>
              </p>
            </div>
          </div>
        )}

        {/* ────────────────────────────────────────────────────────────
            STEP 2: ONLINE CHECKOUT CONTROLS & STATUS
            ──────────────────────────────────────────────────────────── */}
        {paymentStep === 'online_review' && (
          <div className="space-y-5 animate-fade-in">
            {/* Header & Dynamic Amount */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-[#071A3D] tracking-tight leading-tight">
                  Razorpay Online Checkout
                </h3>
                <p className="text-xs text-zinc-500 mt-1 font-medium">
                  Complete payment via UPI, Credit/Debit Card, or Net Banking
                </p>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block">
                  {t('payments.amount')}
                </span>
                <span className="text-2xl sm:text-3xl font-black text-[#1463FF] tracking-tight font-sans">
                  ₹{displayAmount}
                </span>
              </div>
            </div>

            {/* Order Details Summary Card */}
            <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-slate-200/90 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-left">
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider">
                    Booking Ref
                  </span>
                  <span className="font-mono text-xs font-bold text-zinc-900 truncate block">
                    {activeBooking?.booking_id
                      ? `#${activeBooking.booking_id}`
                      : paymentError
                      ? '#Error'
                      : '#Initializing...'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider">
                    Gateway Order
                  </span>
                  <span className="font-mono text-xs font-bold text-zinc-700 truncate block">
                    {razorpayOrder?.order_id || (paymentError ? 'Order creation failed' : 'Creating order...')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider">
                    Station / Train
                  </span>
                  <span className="text-xs font-bold text-zinc-900 truncate block">
                    {bookingData?.station || 'KZJ'} · {bookingData?.selectedTrain?.train_no || '12727'}
                  </span>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200/80 text-xs">
                <div className="flex items-center gap-2">
                  {orderInitializing || processing ? (
                    <Loader2 className="w-4 h-4 text-[#1463FF] animate-spin" />
                  ) : paymentVerified ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : paymentError ? (
                    <AlertTriangle className="w-4 h-4 text-rose-500" />
                  ) : (
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                  )}
                  <span className="font-bold text-slate-800">
                    {orderInitializing
                      ? 'Creating gateway order...'
                      : processing
                      ? 'Verifying payment with bank...'
                      : paymentVerified
                      ? 'Payment verified!'
                      : paymentError
                      ? 'Order creation failed. Please retry.'
                      : 'Awaiting payment completion'}
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#1463FF] border border-blue-200/80">
                  Secure Checkout
                </span>
              </div>
            </div>

            {/* Launch Checkout Primary Action */}
            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                id="btn-proceed-razorpay-checkout"
                onClick={handleRetryOnline}
                disabled={processing || orderInitializing}
                className="w-full h-13 bg-[#1463FF] hover:bg-[#0d52dd] active:scale-[0.99] text-white font-bold text-sm tracking-wide rounded-full shadow-md shadow-[#1463FF]/25 hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {processing || orderInitializing ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Connecting to Razorpay...</span>
                  </span>
                ) : paymentError && !razorpayOrder ? (
                  <>
                    <span>Retry Online Order</span>
                    <RefreshCw className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span>Open Razorpay Checkout</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleCashConfirm}
                disabled={processing}
                className="w-full py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-zinc-700 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Banknote className="w-4 h-4 text-emerald-700" />
                <span>Switch to Cash on Service instead</span>
              </button>
            </div>

            {/* Security Notice */}
            <div className="pt-2 text-center border-t border-slate-100">
              <p className="text-[11px] text-zinc-400 flex items-center justify-center gap-1.5 font-medium">
                <Lock className="w-3.5 h-3.5 text-zinc-500" />
                <span>Payment is handled directly by Razorpay. No card or UPI details are stored on ONECOOLIE servers.</span>
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}