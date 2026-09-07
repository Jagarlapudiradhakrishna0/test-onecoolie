/**
 * AssistantWalletView.jsx
 *
 * Wallet & Earnings Dashboard for the OneCoolie Assistant Portal.
 * Connects to the existing backend:
 *   GET  /api/assistant-wallet            → wallet balances
 *   GET  /api/assistant-wallet/earnings   → earning ledger history
 *   GET  /api/assistant-payouts           → payout history
 *   POST /api/assistant-payouts/request   → submit payout request
 *   POST /api/assistant-payouts/:id/cancel → cancel requested payout
 *
 * Security: All financial calculations are performed server-side.
 * The frontend only displays and requests — never mutates balances.
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
} from 'lucide-react';
import axios from '../api/axios';

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

/** Format an ISO date string to a readable date */
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

/** Format an ISO date string to a readable date + time */
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
// Status Badge
// ─────────────────────────────────────────────

const STATUS_CONFIG = {
  // Earning statuses
  pending:     { label: 'Pending',     bg: 'bg-amber-50 dark:bg-amber-950/40',   text: 'text-amber-700 dark:text-amber-400',    border: 'border-amber-200 dark:border-amber-800' },
  available:   { label: 'Available',   bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' },
  held:        { label: 'On Hold',     bg: 'bg-blue-50 dark:bg-blue-950/40',    text: 'text-blue-700 dark:text-blue-400',      border: 'border-blue-200 dark:border-blue-800' },
  paid_out:    { label: 'Paid Out',    bg: 'bg-slate-100 dark:bg-zinc-800',      text: 'text-slate-600 dark:text-zinc-400',     border: 'border-slate-200 dark:border-zinc-700' },
  reversed:    { label: 'Reversed',    bg: 'bg-rose-50 dark:bg-rose-950/40',    text: 'text-rose-700 dark:text-rose-400',      border: 'border-rose-200 dark:border-rose-800' },
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
// Payout Filter tabs
// ─────────────────────────────────────────────

const PAYOUT_FILTERS = ['all', 'requested', 'approved', 'processing', 'paid', 'failed', 'cancelled'];

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────

export default function AssistantWalletView() {
  // ── State ──────────────────────────────────
  const [wallet, setWallet]         = useState(null);
  const [earnings, setEarnings]     = useState([]);
  const [payouts, setPayouts]       = useState([]);
  const [walletLoading, setWalletLoading]   = useState(true);
  const [earningsLoading, setEarningsLoading] = useState(true);
  const [payoutsLoading, setPayoutsLoading]   = useState(true);
  const [walletError, setWalletError]   = useState('');
  const [earningsError, setEarningsError] = useState('');
  const [payoutsError, setPayoutsError]   = useState('');

  // ── Payout request modal ────────────────────
  const [payoutModalOpen, setPayoutModalOpen]   = useState(false);
  const [payoutAmount, setPayoutAmount]         = useState('');
  const [payoutMethod, setPayoutMethod]         = useState('bank_transfer');
  const [payoutSubmitting, setPayoutSubmitting] = useState(false);
  const [payoutSuccess, setPayoutSuccess]       = useState(null);
  const [payoutError, setPayoutError]           = useState('');

  // ── Cancel payout ───────────────────────────
  const [cancellingId, setCancellingId] = useState(null);

  // ── Payout history filter ───────────────────
  const [payoutFilter, setPayoutFilter] = useState('all');

  // ── Earnings show more ──────────────────────
  const [showAllEarnings, setShowAllEarnings] = useState(false);

  // ── Copy reference ──────────────────────────
  const [copiedRef, setCopiedRef] = useState(null);

  // ── Prevent duplicate submit ────────────────
  const submittingRef = useRef(false);

  // ── Data fetching ───────────────────────────

  const fetchWallet = useCallback(async () => {
    setWalletLoading(true);
    setWalletError('');
    try {
      const res = await axios.get('/assistant-wallet');
      if (res.data?.success && res.data.wallet) {
        setWallet(res.data.wallet);
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

  const refreshAll = useCallback(() => {
    fetchWallet();
    fetchEarnings();
    fetchPayouts();
  }, [fetchWallet, fetchEarnings, fetchPayouts]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // ── Socket.IO: listen for wallet_updated events ──
  useEffect(() => {
    if (!window.socket) return;
    const handler = () => refreshAll();
    window.socket.on('wallet_updated', handler);
    return () => window.socket.off('wallet_updated', handler);
  }, [refreshAll]);

  // ── Payout request ───────────────────────────

  const handlePayoutRequest = async (e) => {
    e.preventDefault();
    if (submittingRef.current || payoutSubmitting) return;

    setPayoutError('');
    const requestedAmount = parseFloat(payoutAmount);

    // Frontend validation (backend enforces authoritatively)
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
        // Refresh all data to reflect new balances
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
      // Show brief error using payoutsError state
      setPayoutsError(err.response?.data?.message || 'Unable to cancel payout.');
      setTimeout(() => setPayoutsError(''), 5000);
    } finally {
      setCancellingId(null);
    }
  };

  const copyRef = (ref) => {
    navigator.clipboard.writeText(ref).catch(() => {});
    setCopiedRef(ref);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  const openPayoutModal = () => {
    setPayoutModalOpen(true);
    setPayoutSuccess(null);
    setPayoutError('');
    setPayoutAmount('');
    setPayoutMethod('bank_transfer');
  };

  const closePayoutModal = () => {
    setPayoutModalOpen(false);
    setPayoutSuccess(null);
    setPayoutError('');
  };

  // ── Derived values ───────────────────────────
  const displayEarnings = showAllEarnings ? earnings : earnings.slice(0, 6);
  const filteredPayouts = payoutFilter === 'all'
    ? payouts
    : payouts.filter((p) => p.status === payoutFilter);

  const hasAvailableBalance = (wallet?.available_balance || 0) > 0;

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── PAGE HEADER ───────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-extrabold tracking-widest text-slate-400 dark:text-zinc-500 uppercase block">
            FINANCIAL DASHBOARD
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-black dark:text-white tracking-tight mt-0.5">
            Wallet &amp; Earnings
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 font-medium mt-0.5">
            Track your earnings and manage payouts.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Refresh button */}
          <button
            type="button"
            onClick={refreshAll}
            disabled={walletLoading || earningsLoading || payoutsLoading}
            className="w-9 h-9 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-500 dark:text-zinc-400 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all cursor-pointer disabled:opacity-40"
            title="Refresh wallet data"
          >
            <RefreshCw size={16} className={(walletLoading || earningsLoading || payoutsLoading) ? 'animate-spin' : ''} />
          </button>

          {/* Withdraw / Request Payout CTA */}
          <button
            type="button"
            onClick={openPayoutModal}
            disabled={walletLoading || !hasAvailableBalance}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shadow-sm shadow-blue-600/20 transition-all cursor-pointer"
            title={hasAvailableBalance ? 'Request a payout withdrawal' : 'No available balance to withdraw'}
          >
            <ArrowDownToLine size={15} />
            <span>Withdraw Money</span>
          </button>
        </div>
      </div>

      {/* ── WALLET ERROR ──────────────────────────────────────── */}
      {walletError && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center gap-2.5">
          <AlertTriangle size={16} className="text-rose-600 shrink-0" />
          <span>{walletError}</span>
          <button type="button" onClick={() => setWalletError('')} className="ml-auto underline">Dismiss</button>
        </div>
      )}

      {/* ── BALANCE SUMMARY CARDS ─────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {walletLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            {/* Available Balance */}
            <div className="bg-white dark:bg-zinc-900 border border-emerald-200/60 dark:border-emerald-800/40 rounded-2xl p-5 sm:p-6 shadow-2xs col-span-2 lg:col-span-1">
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
                Ready for withdrawal
              </p>
            </div>

            {/* Pending Earnings */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-2xs">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-500 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Clock size={18} />
                </div>
                <span className="text-[10px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-widest leading-tight">
                  Pending
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-black dark:text-white tracking-tight">
                {formatINR(wallet?.pending_balance)}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1.5 font-medium">
                Processing or settling
              </p>
            </div>

            {/* Total Earnings */}
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
                Lifetime earnings
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
                Successfully disbursed
              </p>
            </div>
          </>
        )}
      </div>

      {/* On-hold note */}
      {!walletLoading && wallet && (wallet.held_balance || 0) > 0 && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40 text-xs text-blue-800 dark:text-blue-300">
          <Info size={15} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <span>
            <strong>{formatINR(wallet.held_balance)}</strong> is currently on hold as part of a pending payout request and is not included in your available balance.
          </span>
        </div>
      )}

      {/* ── RECENT EARNINGS SECTION ───────────────────────────── */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl shadow-2xs overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-base text-black dark:text-white tracking-tight">
                Recent Earnings
              </h3>
              {!earningsLoading && earnings.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 text-[10px] font-bold">
                  {earnings.length}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 font-medium">
              Your earning ledger from completed services.
            </p>
          </div>
        </div>

        {/* Earnings error */}
        {earningsError && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle size={14} className="shrink-0" />
            <span>{earningsError}</span>
          </div>
        )}

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
                Complete OneCoolie service requests to start earning. Your earnings will appear here.
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
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      earning.status === 'available' ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                      : earning.status === 'pending'  ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-500'
                      : earning.status === 'paid_out' ? 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400'
                      : earning.status === 'held'     ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400'
                      :                                 'bg-rose-50 dark:bg-rose-950/50 text-rose-600'
                    }`}>
                      <Package size={18} />
                    </div>

                    {/* Details */}
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

                    {/* Status */}
                    <StatusBadge status={earning.status} />

                    {/* Amount */}
                    <div className="text-right shrink-0">
                      <p className="font-black text-base text-[#2563EB] dark:text-blue-400 tracking-tight">
                        {formatINR(earning.assistant_amount)}
                      </p>
                    </div>
                  </div>
                );
              })}

              {/* Show more / less */}
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

      {/* ── PAYOUT HISTORY SECTION ────────────────────────────── */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl shadow-2xs overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-black dark:text-white tracking-tight">
                  Payout History
                </h3>
                {!payoutsLoading && payouts.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 text-[10px] font-bold">
                    {payouts.length}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 font-medium">
                All payout requests and disbursements.
              </p>
            </div>
          </div>

          {/* Filter pills */}
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

        {/* Payouts error */}
        {payoutsError && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle size={14} className="shrink-0" />
            <span>{payoutsError}</span>
            <button type="button" onClick={() => setPayoutsError('')} className="ml-auto underline">Dismiss</button>
          </div>
        )}

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
              <p className="text-xs text-slate-400 dark:text-zinc-500 max-w-xs mx-auto">
                {payoutFilter === 'all'
                  ? 'Your completed payouts will appear here once you request a withdrawal.'
                  : 'Try another filter to view other payouts.'}
              </p>
            </div>
          ) : (
            filteredPayouts.map((payout) => {
              const isRequested = payout.status === 'requested';
              const ref = payout.payout_reference || payout.gateway_payout_id || null;
              return (
                <div key={payout.id} className="px-6 py-4 hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      payout.status === 'paid'       ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                      : payout.status === 'requested' || payout.status === 'approved' ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-500'
                      : payout.status === 'processing' ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400'
                      : payout.status === 'failed' || payout.status === 'rejected' ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600'
                      :                                  'bg-slate-100 dark:bg-zinc-800 text-slate-500'
                    }`}>
                      <IndianRupee size={18} />
                    </div>

                    {/* Details */}
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
                        {payout.payout_method && (
                          <p className="capitalize">Method: {payout.payout_method.replace(/_/g, ' ')}</p>
                        )}
                        {ref && (
                          <div className="flex items-center gap-1.5">
                            <span>Ref:</span>
                            <code className="font-mono text-black dark:text-white">{ref}</code>
                            <button
                              type="button"
                              onClick={() => copyRef(ref)}
                              className="text-slate-400 hover:text-[#2563EB] transition-colors cursor-pointer"
                              title="Copy reference"
                            >
                              {copiedRef === ref
                                ? <Check size={12} className="text-emerald-500" />
                                : <Copy size={12} />}
                            </button>
                          </div>
                        )}
                        {payout.failure_reason && (
                          <p className="text-rose-600 dark:text-rose-400">Reason: {payout.failure_reason}</p>
                        )}
                      </div>
                    </div>

                    {/* Cancel button (only for 'requested' status) */}
                    {isRequested && (
                      <button
                        type="button"
                        onClick={() => handleCancelPayout(payout.id)}
                        disabled={cancellingId === payout.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 bg-rose-50/70 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-950/50 text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shrink-0"
                      >
                        {cancellingId === payout.id
                          ? <Loader2 size={13} className="animate-spin" />
                          : <XCircle size={13} />}
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

      {/* ── PAYOUT REQUEST MODAL ──────────────────────────────── */}
      {payoutModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={closePayoutModal}
        >
          <div
            className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 flex items-center justify-center">
                  <ArrowDownToLine size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-black dark:text-white tracking-tight">
                    Withdraw Money
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    Request a payout to your bank account.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closePayoutModal}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Success state */}
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
                    <p>Reference ID: <code className="font-mono text-black dark:text-white">{payoutSuccess.id}</code></p>
                    <p className="text-slate-500 dark:text-zinc-400 pt-1">
                      Your payout request is now under review by the OneCoolie team. You will be notified once it is processed.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/60 dark:border-zinc-700 text-xs text-slate-600 dark:text-zinc-300">
                  <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
                  <span>Payments are securely processed and disbursed by the OneCoolie Finance team.</span>
                </div>

                <button
                  type="button"
                  onClick={closePayoutModal}
                  className="w-full py-3 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handlePayoutRequest} className="space-y-5">
                {/* Available balance display */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/60 dark:border-zinc-700 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">
                      Available Balance
                    </span>
                    <span className="text-2xl font-black text-black dark:text-white tracking-tight mt-0.5 block">
                      {walletLoading ? '...' : formatINR(wallet?.available_balance)}
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Wallet size={18} />
                  </div>
                </div>

                {/* Amount field */}
                <div>
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block mb-1.5">
                    Amount to Withdraw *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-zinc-400 font-bold text-sm">₹</span>
                    <input
                      type="number"
                      min="100"
                      step="1"
                      max={wallet?.available_balance || 0}
                      value={payoutAmount}
                      onChange={(e) => { setPayoutAmount(e.target.value); setPayoutError(''); }}
                      placeholder="Enter amount (min. ₹100)"
                      required
                      className="w-full pl-8 pr-3.5 py-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-black dark:text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#2563EB] transition-all"
                    />
                  </div>

                  {/* Quick fill */}
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => { setPayoutAmount(String(wallet?.available_balance || '')); setPayoutError(''); }}
                      disabled={!wallet?.available_balance}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 text-[11px] font-bold hover:bg-slate-100 dark:hover:bg-zinc-700 transition-all cursor-pointer disabled:opacity-40"
                    >
                      Full Balance
                    </button>
                    <span className="text-[11px] text-slate-400 dark:text-zinc-500">Minimum: ₹100</span>
                  </div>
                </div>

                {/* Payout method */}
                <div>
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block mb-1.5">
                    Payout Method
                  </label>
                  <select
                    value={payoutMethod}
                    onChange={(e) => setPayoutMethod(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-black dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  >
                    <option value="bank_transfer">Bank Transfer (NEFT/IMPS)</option>
                    <option value="upi">UPI</option>
                    <option value="imps">IMPS</option>
                    <option value="neft">NEFT</option>
                  </select>
                </div>

                {/* Error */}
                {payoutError && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <span>{payoutError}</span>
                  </div>
                )}

                {/* Security note */}
                <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/60 dark:border-zinc-700 text-xs text-slate-500 dark:text-zinc-400">
                  <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
                  <span>Payouts are reviewed and approved by the OneCoolie team before disbursement.</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={closePayoutModal}
                    className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={payoutSubmitting || walletLoading || !payoutAmount}
                    className="flex-1 py-3 rounded-xl bg-[#2563EB] hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
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
