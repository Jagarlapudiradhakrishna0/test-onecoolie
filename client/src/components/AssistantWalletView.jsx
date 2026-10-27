/**
 * AssistantWalletView.jsx
 *
 * Full Production Assistant Wallet & Earnings Dashboard (ONECOOLIE V4.0)
 *
 * Architecture:
 * - Authoritative Server-Side Balances & Ledger Invariants
 * - Top-Up Action with Razorpay Standard Checkout
 * - Immutable Auditable Wallet Transactions History
 * - Strict Separation between Service Earnings vs Wallet Top-ups
 * - Regulatory Compliance Guardrail Disclaimers (RBI PPI Regulations)
 * - Payout Withdrawal Requests & Admin Approval Workflow
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Wallet,
  ArrowDownToLine,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  X,
  IndianRupee,
  Banknote,
  ReceiptText,
  Package,
  ShieldCheck,
  Loader2,
  Info,
  Copy,
  Check,
  PlusCircle,
  ArrowUpRight,
  ArrowDownLeft,
  Lock,
  ExternalLink
} from 'lucide-react';
import axios from '../api/axios';
import { loadRazorpayScript } from '../utils/razorpay';
import oneCoolieLogo from '../assets/onecoolie-logo.png';

// ─────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────

/** Format a number as Indian Rupee string: ₹1,25,000 */
function formatINR(amount) {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

/** Format an ISO date string to readable date */
function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

/** Format an ISO date string to readable date + time */
function formatDateTime(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

// ─────────────────────────────────────────────
// Status Badges
// ─────────────────────────────────────────────

const STATUS_CONFIG = {
  // Earning & Wallet statuses
  pending:     { label: 'Pending',     bg: 'bg-amber-50 dark:bg-amber-950/40',   text: 'text-amber-700 dark:text-amber-400',    border: 'border-amber-200 dark:border-amber-800' },
  available:   { label: 'Available',   bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' },
  held:        { label: 'On Hold',     bg: 'bg-blue-50 dark:bg-blue-950/40',    text: 'text-blue-700 dark:text-blue-400',      border: 'border-blue-200 dark:border-blue-800' },
  paid_out:    { label: 'Paid Out',    bg: 'bg-slate-100 dark:bg-zinc-800',      text: 'text-slate-600 dark:text-zinc-400',     border: 'border-slate-200 dark:border-zinc-700' },
  reversed:    { label: 'Reversed',    bg: 'bg-rose-50 dark:bg-rose-950/40',    text: 'text-rose-700 dark:text-rose-400',      border: 'border-rose-200 dark:border-rose-800' },
  completed:   { label: 'Completed',   bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' },
  // Payout statuses
  requested:   { label: 'Requested',   bg: 'bg-amber-50 dark:bg-amber-950/40',   text: 'text-amber-700 dark:text-amber-400',    border: 'border-amber-200 dark:border-amber-800' },
  approved:    { label: 'Approved',    bg: 'bg-blue-50 dark:bg-blue-950/40',    text: 'text-blue-700 dark:text-blue-400',      border: 'border-blue-200 dark:border-blue-800' },
  processing:  { label: 'Processing',  bg: 'bg-indigo-50 dark:bg-indigo-950/40', text: 'text-indigo-700 dark:text-indigo-400',  border: 'border-indigo-200 dark:border-indigo-800' },
  paid:        { label: 'Paid',        bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' },
  failed:      { label: 'Failed',      bg: 'bg-rose-50 dark:bg-rose-950/40',    text: 'text-rose-700 dark:text-rose-400',      border: 'border-rose-200 dark:border-rose-800' },
  rejected:    { label: 'Rejected',    bg: 'bg-rose-50 dark:bg-rose-950/40',    text: 'text-rose-700 dark:text-rose-400',      border: 'border-rose-200 dark:border-rose-800' },
  cancelled:   { label: 'Cancelled',   bg: 'bg-slate-100 dark:bg-zinc-800',      text: 'text-slate-500 dark:text-zinc-500',     border: 'border-slate-200 dark:border-zinc-700' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      {cfg.label}
    </span>
  );
}

// ─────────────────────────────────────────────
// Skeleton loaders
// ─────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-6 shadow-2xs animate-pulse">
      <div className="h-3 w-24 bg-slate-200 dark:bg-zinc-700 rounded mb-3" />
      <div className="h-8 w-32 bg-slate-200 dark:bg-zinc-700 rounded mb-2" />
      <div className="h-3 w-40 bg-slate-100 dark:bg-zinc-800 rounded" />
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="py-4 flex items-center gap-4 animate-pulse border-b border-slate-100 dark:border-zinc-800 last:border-b-0">
      <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-zinc-700 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-40 bg-slate-200 dark:bg-zinc-700 rounded" />
        <div className="h-3 w-28 bg-slate-100 dark:bg-zinc-800 rounded" />
      </div>
      <div className="h-5 w-20 bg-slate-200 dark:bg-zinc-700 rounded-full" />
      <div className="h-6 w-16 bg-slate-200 dark:bg-zinc-700 rounded" />
    </div>
  );
}

// ─────────────────────────────────────────────
// Filter Tabs
// ─────────────────────────────────────────────

const PAYOUT_FILTERS = ['all', 'requested', 'approved', 'processing', 'paid', 'failed', 'cancelled'];
const TRANSACTION_FILTERS = ['all', 'topup', 'earning_credit', 'payout_debit', 'payout_hold'];

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────

export default function AssistantWalletView() {
  // ── Balance & Data State ────────────────────
  const [wallet, setWallet]                   = useState(null);
  const [earnings, setEarnings]               = useState([]);
  const [payouts, setPayouts]                 = useState([]);
  const [transactions, setTransactions]       = useState([]);
  const [topupPolicy, setTopupPolicy]         = useState(null);

  const [walletLoading, setWalletLoading]     = useState(true);
  const [earningsLoading, setEarningsLoading] = useState(true);
  const [payoutsLoading, setPayoutsLoading]   = useState(true);
  const [txnsLoading, setTxnsLoading]         = useState(true);

  const [walletError, setWalletError]         = useState('');
  const [earningsError, setEarningsError]     = useState('');
  const [payoutsError, setPayoutsError]       = useState('');
  const [txnsError, setTxnsError]             = useState('');

  // ── Active View Tab inside Wallet ───────────
  const [activeTab, setActiveTab]             = useState('transactions'); // 'transactions' | 'earnings' | 'payouts'

  // ── Top-Up Modal State ──────────────────────
  const [topupModalOpen, setTopupModalOpen]   = useState(false);
  const [topupAmount, setTopupAmount]         = useState('500');
  const [topupSubmitting, setTopupSubmitting] = useState(false);
  const [topupError, setTopupError]           = useState('');
  const [topupSuccess, setTopupSuccess]       = useState(null);

  // ── Payout Request Modal State ──────────────
  const [payoutModalOpen, setPayoutModalOpen]   = useState(false);
  const [payoutAmount, setPayoutAmount]         = useState('');
  const [payoutMethod, setPayoutMethod]         = useState('bank_transfer');
  const [payoutSubmitting, setPayoutSubmitting] = useState(false);
  const [payoutSuccess, setPayoutSuccess]       = useState(null);
  const [payoutError, setPayoutError]           = useState('');

  // ── Cancel Payout Action ────────────────────
  const [cancellingId, setCancellingId]         = useState(null);

  // ── Filters ─────────────────────────────────
  const [payoutFilter, setPayoutFilter]         = useState('all');
  const [txnFilter, setTxnFilter]               = useState('all');
  const [showAllEarnings, setShowAllEarnings]   = useState(false);

  // ── Clipboard State ─────────────────────────
  const [copiedRef, setCopiedRef]               = useState(null);
  const submittingRef = useRef(false);

  // ── Data Fetching Handlers ──────────────────

  const fetchWallet = useCallback(async () => {
    setWalletLoading(true);
    setWalletError('');
    try {
      const res = await axios.get('/assistant-wallet');
      if (res.data?.success && res.data.wallet) {
        setWallet(res.data.wallet);
        if (res.data.topup_policy) {
          setTopupPolicy(res.data.topup_policy);
        }
      } else {
        setWalletError('Unable to load wallet balance.');
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setWalletError('Session expired. Please sign in again.');
      } else {
        setWalletError(err.response?.data?.message || 'Unable to load wallet balance.');
      }
    } finally {
      setWalletLoading(false);
    }
  }, []);

  const fetchEarnings = useCallback(async () => {
    setEarningsLoading(true);
    setEarningsError('');
    try {
      const res = await axios.get('/assistant-wallet/earnings');
      if (res.data?.success) {
        setEarnings(res.data.earnings || []);
      } else {
        setEarningsError('Unable to load earnings history.');
      }
    } catch (err) {
      setEarningsError(err.response?.data?.message || 'Unable to load earnings history.');
    } finally {
      setEarningsLoading(false);
    }
  }, []);

  const fetchPayouts = useCallback(async () => {
    setPayoutsLoading(true);
    setPayoutsError('');
    try {
      const res = await axios.get('/assistant-payouts');
      if (res.data?.success) {
        setPayouts(res.data.payouts || []);
      } else {
        setPayoutsError('Unable to load payout history.');
      }
    } catch (err) {
      setPayoutsError(err.response?.data?.message || 'Unable to load payout history.');
    } finally {
      setPayoutsLoading(false);
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    setTxnsLoading(true);
    setTxnsError('');
    try {
      const res = await axios.get('/assistant-wallet/transactions', {
        params: { limit: 50 }
      });
      if (res.data?.success) {
        setTransactions(res.data.transactions || []);
      }
    } catch (err) {
      setTxnsError(err.response?.data?.message || 'Unable to load transaction history.');
    } finally {
      setTxnsLoading(false);
    }
  }, []);

  const refreshAll = useCallback(() => {
    fetchWallet();
    fetchEarnings();
    fetchPayouts();
    fetchTransactions();
  }, [fetchWallet, fetchEarnings, fetchPayouts, fetchTransactions]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Real-time Socket.IO: auto-refresh balances and ledger on wallet_updated event
  useEffect(() => {
    if (!window.socket) return;
    const handler = () => refreshAll();
    window.socket.on('wallet_updated', handler);
    return () => window.socket.off('wallet_updated', handler);
  }, [refreshAll]);

  // ── Top-Up Action with Razorpay Standard Checkout ──

  const handleTopupSubmit = async (e) => {
    e.preventDefault();
    if (submittingRef.current || topupSubmitting) return;

    setTopupError('');
    const numAmount = parseFloat(topupAmount);

    if (!numAmount || numAmount < 100) {
      setTopupError('Minimum top-up amount is ₹100.');
      return;
    }
    if (numAmount > 50000) {
      setTopupError('Maximum top-up amount is ₹50,000 per transaction.');
      return;
    }

    submittingRef.current = true;
    setTopupSubmitting(true);

    try {
      // 1. Initiate Top-up Intent on Backend
      const { data: initRes } = await axios.post('/assistant-wallet/topup/initiate', {
        amount: numAmount
      });

      if (!initRes || !initRes.success) {
        throw new Error(initRes?.message || 'Failed to initialize wallet top-up.');
      }

      // 2. Load Official Razorpay Checkout Script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || typeof window === 'undefined' || !window.Razorpay) {
        throw new Error('Razorpay Checkout SDK failed to load. Please check your internet connection.');
      }

      // 3. Open Razorpay Standard Checkout
      const options = {
        key: initRes.razorpay?.key_id || 'rzp_test',
        amount: initRes.razorpay?.amount || Math.round(numAmount * 100),
        currency: initRes.razorpay?.currency || 'INR',
        name: 'ONECOOLIE Assistant Wallet',
        description: `Wallet Top-up: ₹${numAmount}`,
        image: oneCoolieLogo,
        order_id: initRes.razorpay?.order_id,
        handler: async function (response) {
          try {
            setTopupSubmitting(true);
            // 4. Server-Side Cryptographic Signature Verification & Fulfillment
            const { data: verifyRes } = await axios.post('/assistant-wallet/topup/verify', {
              topup_id: initRes.topup_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            if (verifyRes && verifyRes.success) {
              setTopupSuccess({
                amount: numAmount,
                paymentId: response.razorpay_payment_id,
                reference: verifyRes.transaction?.transaction_reference,
                wallet: verifyRes.wallet
              });
              refreshAll();
            } else {
              throw new Error(verifyRes?.message || 'Top-up verification failed.');
            }
          } catch (vErr) {
            console.error('Topup verify error:', vErr);
            setTopupError(vErr.response?.data?.message || vErr.message || 'Payment verification failed.');
          } finally {
            setTopupSubmitting(false);
          }
        },
        theme: {
          color: '#2563EB'
        },
        modal: {
          ondismiss: function () {
            setTopupSubmitting(false);
          }
        }
      };

      const rzpInstance = new window.Razorpay(options);
      rzpInstance.on('payment.failed', function (resp) {
        const desc = resp?.error?.description || 'Top-up transaction failed or cancelled';
        setTopupError(desc);
        setTopupSubmitting(false);
      });

      rzpInstance.open();

    } catch (err) {
      console.error('Topup initiate error:', err);
      const msg = err.response?.data?.message || err.message || 'Unable to initiate top-up.';
      setTopupError(msg);
      setTopupSubmitting(false);
    } finally {
      submittingRef.current = false;
    }
  };

  // ── Payout Withdrawal Handler ───────────────

  const handlePayoutRequest = async (e) => {
    e.preventDefault();
    if (submittingRef.current || payoutSubmitting) return;

    setPayoutError('');
    const requestedAmount = parseFloat(payoutAmount);

    if (!requestedAmount || requestedAmount <= 0) {
      setPayoutError('Please enter a valid amount greater than ₹0.');
      return;
    }
    if (requestedAmount < 100) {
      setPayoutError('Minimum payout amount is ₹100.');
      return;
    }
    const availBal = wallet?.available_balance || 0;
    if (requestedAmount > availBal) {
      setPayoutError(`Amount exceeds your available balance of ${formatINR(availBal)}.`);
      return;
    }

    submittingRef.current = true;
    setPayoutSubmitting(true);
    try {
      const res = await axios.post('/assistant-payouts/request', {
        amount: requestedAmount,
        payout_method: payoutMethod,
      });
      if (res.data?.success) {
        setPayoutSuccess(res.data.payout);
        setPayoutAmount('');
        refreshAll();
      } else {
        setPayoutError(res.data?.message || 'Failed to submit payout request.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Unable to submit payout request. Please try again.';
      setPayoutError(msg);
    } finally {
      setPayoutSubmitting(false);
      submittingRef.current = false;
    }
  };

  const handleCancelPayout = async (payoutId) => {
    if (cancellingId) return;
    setCancellingId(payoutId);
    try {
      await axios.post(`/assistant-payouts/${payoutId}/cancel`);
      refreshAll();
    } catch (err) {
      setPayoutsError(err.response?.data?.message || 'Unable to cancel payout.');
      setTimeout(() => setPayoutsError(''), 5000);
    } finally {
      setCancellingId(null);
    }
  };

  const copyRef = (ref) => {
    navigator.clipboard?.writeText(ref).catch(() => {});
    setCopiedRef(ref);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  // ── Derived Values & Filters ────────────────

  const displayEarnings = showAllEarnings ? earnings : earnings.slice(0, 6);
  const filteredPayouts = payoutFilter === 'all'
    ? payouts
    : payouts.filter((p) => p.status === payoutFilter);

  const filteredTransactions = txnFilter === 'all'
    ? transactions
    : transactions.filter((t) => t.transaction_type === txnFilter);

  const hasAvailableBalance = (wallet?.available_balance || 0) > 0;

  return (
    <div className="space-y-6">

      {/* ── TOP ACTION BAR ────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-black dark:text-white tracking-tight">
            Assistant Wallet &amp; Ledger
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 font-medium">
            Database-backed financial ledger, service earnings, and top-ups.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refreshAll}
            disabled={walletLoading || earningsLoading || payoutsLoading || txnsLoading}
            className="w-9 h-9 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-500 dark:text-zinc-400 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all cursor-pointer disabled:opacity-40"
            title="Refresh wallet data"
          >
            <RefreshCw size={16} className={(walletLoading || earningsLoading || payoutsLoading || txnsLoading) ? 'animate-spin' : ''} />
          </button>

          {/* Add Money (Top-up) Button */}
          <button
            type="button"
            id="btn-add-money-wallet"
            onClick={() => {
              setTopupModalOpen(true);
              setTopupError('');
              setTopupSuccess(null);
              setTopupAmount('500');
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <PlusCircle size={15} />
            <span>Add Money</span>
          </button>

          {/* Withdraw Money Button */}
          <button
            type="button"
            id="btn-withdraw-money-wallet"
            onClick={() => {
              setPayoutModalOpen(true);
              setPayoutSuccess(null);
              setPayoutError('');
              setPayoutAmount('');
              setPayoutMethod('bank_transfer');
            }}
            disabled={walletLoading || !hasAvailableBalance}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <ArrowDownToLine size={15} />
            <span>Withdraw</span>
          </button>
        </div>
      </div>

      {/* ── COMPLIANCE ADVISORY BANNER IF RESTRICTED ──────────────── */}
      {topupPolicy && !topupPolicy.allowed && (
        <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
          <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold block">Regulatory Notice: Stored-Value Wallet Top-up</span>
            <p className="leading-relaxed text-[11px] opacity-90">{topupPolicy.compliance_notice}</p>
          </div>
        </div>
      )}

      {/* ── WALLET ERROR ──────────────────────────────────────── */}
      {walletError && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center gap-2.5">
          <AlertTriangle size={16} className="text-rose-600 shrink-0" />
          <span>{walletError}</span>
          <button type="button" onClick={() => setWalletError('')} className="ml-auto underline">Dismiss</button>
        </div>
      )}

      {/* ── 4 BALANCE SUMMARY METRIC CARDS ────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {walletLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            {/* Available Balance */}
            <div className="bg-white dark:bg-zinc-900 border border-emerald-200/80 dark:border-emerald-800/40 rounded-2xl p-5 sm:p-6 shadow-2xs col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Wallet size={18} />
                </div>
                <span className="text-[10px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-widest leading-tight">
                  Available Balance
                </span>
              </div>
              <p className="text-3xl sm:text-4xl font-black text-black dark:text-white tracking-tight">
                {formatINR(wallet?.available_balance)}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1.5 font-medium">
                Ready for withdrawal or service use
              </p>
            </div>

            {/* Pending Balance */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-2xs">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-500 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Clock size={18} />
                </div>
                <span className="text-[10px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-widest leading-tight">
                  Pending Settling
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-black dark:text-white tracking-tight">
                {formatINR(wallet?.pending_balance)}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1.5 font-medium">
                Maturing to available balance
              </p>
            </div>

            {/* Total Earned */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-2xs">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 flex items-center justify-center shrink-0">
                  <TrendingUp size={18} />
                </div>
                <span className="text-[10px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-widest leading-tight">
                  Total Earned
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-black dark:text-white tracking-tight">
                {formatINR(wallet?.total_earnings)}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1.5 font-medium">
                Lifetime completed earnings
              </p>
            </div>

            {/* Total Paid Out */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-2xs">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 flex items-center justify-center shrink-0">
                  <Banknote size={18} />
                </div>
                <span className="text-[10px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-widest leading-tight">
                  Total Paid Out
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-black dark:text-white tracking-tight">
                {formatINR(wallet?.paid_out_total)}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1.5 font-medium">
                Disbursed to bank/UPI
              </p>
            </div>
          </>
        )}
      </div>

      {/* Held balance note */}
      {!walletLoading && wallet && (wallet.held_balance || 0) > 0 && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40 text-xs text-blue-800 dark:text-blue-300">
          <Info size={15} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <span>
            <strong>{formatINR(wallet.held_balance)}</strong> is currently reserved for a pending payout request and excluded from your available balance.
          </span>
        </div>
      )}

      {/* ── TAB NAVIGATION (TRANSACTIONS / EARNINGS / PAYOUTS) ─────── */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-zinc-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('transactions')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'transactions'
              ? 'bg-[#2563EB] text-white shadow-xs'
              : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800'
          }`}
        >
          Wallet Ledger ({transactions.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('earnings')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'earnings'
              ? 'bg-[#2563EB] text-white shadow-xs'
              : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800'
          }`}
        >
          Job Earnings ({earnings.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('payouts')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'payouts'
              ? 'bg-[#2563EB] text-white shadow-xs'
              : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800'
          }`}
        >
          Withdrawal Requests ({payouts.length})
        </button>
      </div>

      {/* ── TAB 1: IMMUTABLE WALLET TRANSACTIONS LEDGER ────────────── */}
      {activeTab === 'transactions' && (
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl shadow-2xs overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 dark:border-zinc-800">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div>
                <h3 className="font-extrabold text-base text-black dark:text-white tracking-tight">
                  Immutable Wallet Transactions
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 font-medium">
                  Authoritative append-only ledger of top-ups, earnings credits, and withdrawals.
                </p>
              </div>
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
              {TRANSACTION_FILTERS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setTxnFilter(f)}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                    txnFilter === f
                      ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-xs'
                      : 'bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200/80 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-700'
                  }`}
                >
                  {f === 'all'
                    ? 'All Transactions'
                    : f === 'topup'
                    ? 'Top-ups'
                    : f === 'earning_credit'
                    ? 'Earning Credits'
                    : f === 'payout_debit'
                    ? 'Withdrawals'
                    : 'Holds'}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-zinc-800">
            {txnsLoading ? (
              <div className="px-6">
                {Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4 text-slate-400">
                  <ReceiptText size={28} />
                </div>
                <p className="text-sm font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  No transactions found
                </p>
                <p className="text-xs text-slate-400 dark:text-zinc-500 max-w-xs mx-auto">
                  Wallet top-ups and balance changes will be permanently recorded here with unique references.
                </p>
              </div>
            ) : (
              filteredTransactions.map((t) => {
                const isCredit = t.direction === 'credit';
                return (
                  <div key={t.id} className="px-6 py-4 hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                    <div className="flex items-start sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3.5 min-w-0">
                        {/* Direction Icon */}
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isCredit
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                            : 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
                        }`}>
                          {isCredit ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                        </div>

                        {/* Description & Metadata */}
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-black dark:text-white truncate">
                            {t.description || (isCredit ? 'Credit Transaction' : 'Debit Transaction')}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1 text-[11px] text-slate-500 dark:text-zinc-400">
                            {t.transaction_reference && (
                              <div className="flex items-center gap-1 font-mono">
                                <span>Ref:</span>
                                <code className="font-bold text-slate-900 dark:text-zinc-200">{t.transaction_reference}</code>
                                <button
                                  type="button"
                                  onClick={() => copyRef(t.transaction_reference)}
                                  className="text-slate-400 hover:text-[#2563EB] cursor-pointer"
                                  title="Copy reference"
                                >
                                  {copiedRef === t.transaction_reference ? (
                                    <Check size={12} className="text-emerald-500" />
                                  ) : (
                                    <Copy size={12} />
                                  )}
                                </button>
                              </div>
                            )}
                            <span>·</span>
                            <span>{formatDateTime(t.created_at)}</span>
                            {t.gateway_payment_id && (
                              <>
                                <span>·</span>
                                <span className="font-mono text-[10px] text-slate-400">Gateway: {t.gateway_payment_id}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Amount & Balance */}
                      <div className="text-right shrink-0">
                        <p className={`font-black text-base tracking-tight ${
                          isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
                        }`}>
                          {isCredit ? '+' : '-'}{formatINR(t.amount)}
                        </p>
                        <p className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 mt-0.5">
                          Bal: {formatINR(t.balance_after)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: JOB EARNINGS ────────────────────────────────────── */}
      {activeTab === 'earnings' && (
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl shadow-2xs overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-black dark:text-white tracking-tight">
                  Service Earnings Ledger
                </h3>
                {!earningsLoading && earnings.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 text-[10px] font-bold">
                    {earnings.length}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 font-medium">
                Commission-split earnings from completed passenger station assistance bookings.
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-zinc-800">
            {earningsLoading ? (
              <div className="px-6">
                {Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}
              </div>
            ) : earnings.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4 text-slate-400">
                  <ReceiptText size={28} />
                </div>
                <p className="text-sm font-bold text-slate-700 dark:text-zinc-300 mb-1">No earnings yet</p>
                <p className="text-xs text-slate-400 dark:text-zinc-500 max-w-xs mx-auto">
                  Complete OneCoolie service bookings to start earning. Your commission will automatically credit here.
                </p>
              </div>
            ) : (
              <>
                {displayEarnings.map((earning) => {
                  const booking = earning.booking;
                  const refCode = booking?.booking_id || booking?.id || '—';
                  const serviceLabel = booking?.station_code ? `Station Assistance (${booking.station_code})` : 'Station Assistance';
                  const dateStr = formatDate(earning.created_at);
                  return (
                    <div key={earning.id} className="px-6 py-4 flex items-start sm:items-center gap-4 hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        earning.status === 'available' ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                        : earning.status === 'pending'  ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-500'
                        : earning.status === 'paid_out' ? 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400'
                        : earning.status === 'held'     ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400'
                        :                                 'bg-rose-50 dark:bg-rose-950/50 text-rose-600'
                      }`}>
                        <Package size={18} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-black dark:text-white truncate">{serviceLabel}</p>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                          {refCode !== '—' && (
                            <span className="text-[11px] font-mono font-medium text-slate-500 dark:text-zinc-400">
                              #{refCode}
                            </span>
                          )}
                          <span className="text-[11px] text-slate-400 dark:text-zinc-500">{dateStr}</span>
                        </div>
                      </div>

                      <StatusBadge status={earning.status} />

                      <div className="text-right shrink-0">
                        <p className="font-black text-base text-[#2563EB] dark:text-blue-400 tracking-tight">
                          {formatINR(earning.assistant_amount)}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {earnings.length > 6 && (
                  <div className="px-6 py-4 flex justify-center">
                    <button
                      type="button"
                      onClick={() => setShowAllEarnings(!showAllEarnings)}
                      className="flex items-center gap-1.5 text-xs font-bold text-[#2563EB] dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      <span>{showAllEarnings ? 'Show Less' : `View All ${earnings.length} Earnings →`}</span>
                      <ChevronDown size={14} className={`transition-transform ${showAllEarnings ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 3: WITHDRAWAL REQUESTS ────────────────────────────── */}
      {activeTab === 'payouts' && (
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl shadow-2xs overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 dark:border-zinc-800">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <h3 className="font-extrabold text-base text-black dark:text-white tracking-tight">
                  Withdrawal &amp; Payout Requests
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 font-medium">
                  Review withdrawal disbursements to your bank account or UPI ID.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
              {PAYOUT_FILTERS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setPayoutFilter(f)}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                    payoutFilter === f
                      ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-xs'
                      : 'bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200/80 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-700'
                  }`}
                >
                  {f === 'all' ? 'All' : STATUS_CONFIG[f]?.label || f}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-zinc-800">
            {payoutsLoading ? (
              <div className="px-6">
                {Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}
              </div>
            ) : filteredPayouts.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4 text-slate-400">
                  <Banknote size={28} />
                </div>
                <p className="text-sm font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  {payoutFilter === 'all' ? 'No payout history yet' : `No ${STATUS_CONFIG[payoutFilter]?.label || payoutFilter} payouts`}
                </p>
              </div>
            ) : (
              filteredPayouts.map((payout) => {
                const isRequested = payout.status === 'requested';
                const ref = payout.payout_reference || payout.gateway_payout_id || null;
                return (
                  <div key={payout.id} className="px-6 py-4 hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        payout.status === 'paid'       ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                        : payout.status === 'requested' || payout.status === 'approved' ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-500'
                        : payout.status === 'processing' ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400'
                        : payout.status === 'failed' || payout.status === 'rejected' ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600'
                        :                                  'bg-slate-100 dark:bg-zinc-800 text-slate-500'
                      }`}>
                        <IndianRupee size={18} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-black text-base text-black dark:text-white tracking-tight">
                            {formatINR(payout.amount)}
                          </span>
                          <StatusBadge status={payout.status} />
                        </div>

                        <div className="space-y-0.5 text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
                          <p>Requested: {formatDateTime(payout.created_at)}</p>
                          {payout.processed_at && <p>Processed: {formatDateTime(payout.processed_at)}</p>}
                          {ref && (
                            <div className="flex items-center gap-1.5">
                              <span>Ref:</span>
                              <code className="font-mono text-black dark:text-white">{ref}</code>
                              <button
                                type="button"
                                onClick={() => copyRef(ref)}
                                className="text-slate-400 hover:text-[#2563EB] cursor-pointer"
                              >
                                {copiedRef === ref ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                              </button>
                            </div>
                          )}
                          {payout.failure_reason && (
                            <p className="text-rose-600 dark:text-rose-400">Reason: {payout.failure_reason}</p>
                          )}
                        </div>
                      </div>

                      {isRequested && (
                        <button
                          type="button"
                          onClick={() => handleCancelPayout(payout.id)}
                          disabled={cancellingId === payout.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 bg-rose-50/70 dark:bg-rose-950/30 hover:bg-rose-100 text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shrink-0"
                        >
                          {cancellingId === payout.id ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
                          <span>Cancel</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────
          MODAL 1: ADD MONEY (WALLET TOP-UP VIA RAZORPAY)
          ──────────────────────────────────────────────────────────── */}
      {topupModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setTopupModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 text-zinc-900 dark:text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <PlusCircle size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold tracking-tight">Add Money to Wallet</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    Secure top-up via Razorpay Gateway
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTopupModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Success state */}
            {topupSuccess ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 size={20} />
                    <span className="font-extrabold text-sm">Top-up Successful!</span>
                  </div>
                  <div className="text-xs text-slate-700 dark:text-zinc-300 space-y-1 pl-7">
                    <p>Amount Credited: <strong>₹{topupSuccess.amount}</strong></p>
                    <p>Transaction Ref: <code className="font-mono font-bold text-black dark:text-white">{topupSuccess.reference}</code></p>
                    <p>Payment ID: <code className="font-mono text-slate-500">{topupSuccess.paymentId}</code></p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setTopupModalOpen(false)}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleTopupSubmit} className="space-y-4">
                {/* Available Balance Preview */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/60 dark:border-zinc-700 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">Current Balance:</span>
                  <span className="text-base font-black">{formatINR(wallet?.available_balance)}</span>
                </div>

                {/* Amount input */}
                <div>
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block mb-1.5">
                    Amount (₹100 to ₹50,000) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">₹</span>
                    <input
                      type="number"
                      min="100"
                      max="50000"
                      step="1"
                      value={topupAmount}
                      onChange={(e) => { setTopupAmount(e.target.value); setTopupError(''); }}
                      placeholder="Enter amount"
                      required
                      className="w-full pl-8 pr-3.5 py-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    />
                  </div>

                  {/* Quick select pills */}
                  <div className="flex items-center gap-2 mt-2">
                    {['200', '500', '1000', '2000'].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => { setTopupAmount(amt); setTopupError(''); }}
                        className={`px-3 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                          topupAmount === amt
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-700'
                        }`}
                      >
                        ₹{amt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Error message */}
                {topupError && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <span>{topupError}</span>
                  </div>
                )}

                {/* Security and compliance footnote */}
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 text-[11px] text-blue-900 dark:text-blue-300 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Lock size={12} className="text-[#2563EB]" />
                    <span>Razorpay PCI-DSS Level 1 Secure Gateway</span>
                  </div>
                  <p className="opacity-90">
                    Supports UPI, debit cards, credit cards, and netbanking. Funds are credited instantly to your auditable ledger.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setTopupModalOpen(false)}
                    className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={topupSubmitting || !topupAmount}
                    className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {topupSubmitting ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Opening Checkout...</span>
                      </>
                    ) : (
                      <>
                        <PlusCircle size={14} />
                        <span>Proceed to Pay</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────
          MODAL 2: WITHDRAW MONEY (PAYOUT REQUEST)
          ──────────────────────────────────────────────────────────── */}
      {payoutModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setPayoutModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 text-zinc-900 dark:text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 flex items-center justify-center">
                  <ArrowDownToLine size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold tracking-tight">Withdraw Money</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    Request a payout to your bank account or UPI ID.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPayoutModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {payoutSuccess ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 size={20} />
                    <span className="font-extrabold text-sm">Payout Request Submitted</span>
                  </div>
                  <div className="text-xs text-slate-700 dark:text-zinc-300 space-y-1 pl-7">
                    <p>Amount: <strong>{formatINR(payoutSuccess.amount)}</strong></p>
                    <p>Status: <strong className="capitalize">{payoutSuccess.status}</strong></p>
                    <p>Reference: <code className="font-mono text-black dark:text-white">{payoutSuccess.id}</code></p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setPayoutModalOpen(false)}
                  className="w-full py-3 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handlePayoutRequest} className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/60 dark:border-zinc-700 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">Available Balance:</span>
                  <span className="text-2xl font-black">{formatINR(wallet?.available_balance)}</span>
                </div>

                <div>
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block mb-1.5">
                    Amount to Withdraw *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">₹</span>
                    <input
                      type="number"
                      min="100"
                      step="1"
                      max={wallet?.available_balance || 0}
                      value={payoutAmount}
                      onChange={(e) => { setPayoutAmount(e.target.value); setPayoutError(''); }}
                      placeholder="Enter amount (min. ₹100)"
                      required
                      className="w-full pl-8 pr-3.5 py-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => { setPayoutAmount(String(wallet?.available_balance || '')); setPayoutError(''); }}
                      disabled={!wallet?.available_balance}
                      className="px-3 py-1 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs font-bold hover:bg-slate-100 cursor-pointer disabled:opacity-40"
                    >
                      Full Balance
                    </button>
                    <span className="text-[11px] text-slate-400">Minimum: ₹100</span>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block mb-1.5">
                    Payout Method
                  </label>
                  <select
                    value={payoutMethod}
                    onChange={(e) => setPayoutMethod(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  >
                    <option value="bank_transfer">Bank Transfer (NEFT/IMPS)</option>
                    <option value="upi">UPI</option>
                    <option value="imps">IMPS</option>
                    <option value="neft">NEFT</option>
                  </select>
                </div>

                {payoutError && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <span>{payoutError}</span>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setPayoutModalOpen(false)}
                    className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={payoutSubmitting || !payoutAmount}
                    className="flex-1 py-3 rounded-xl bg-[#2563EB] hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {payoutSubmitting ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <ArrowDownToLine size={14} />
                        <span>Request Payout</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
