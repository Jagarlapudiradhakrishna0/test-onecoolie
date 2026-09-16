import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  CreditCard,
  RefreshCw,
  Clock,
  CheckCircle2,
  TrendingUp,
  Layers,
  Activity,
  ShieldCheck,
  FileText,
  Info,
  ExternalLink,
  Search,
  Calendar,
  Filter,
  ChevronDown,
  MoreVertical,
  Check,
  Ban,
  MapPin,
  X,
  BarChart2,
  Hourglass,
  Wallet
} from 'lucide-react';
import trainHeaderImg from '../../../assets/images/vande_bharat_header_clean.jpg';

/* ==========================================================================
   ONECOOLIE SAHAYAK PAYOUTS & SETTLEMENT TREASURY (CONSOLIDATED MASTER VIEW)
   Enterprise Design: Stripe Financial Dashboard + Uber Operations Console
   ========================================================================== */

// ── 1. HEADER SECTION ───────────────────────────────────────────────────────
function PayoutHeader({ onRefresh, actionLoading }) {
  return (
    <div className="relative bg-white dark:bg-[#0D111A] rounded-2xl border border-zinc-200/90 dark:border-zinc-800/90 p-5 sm:p-6 shadow-[0_1px_4px_rgba(0,0,0,0.02)] overflow-hidden">
      <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        {/* Left Eyebrow, Heading, Ethos */}
        <div className="max-w-xl">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 font-mono">
              FINANCE OPERATIONS
            </span>
          </div>

          <div className="flex items-center gap-3 mt-1.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/40 shadow-xs">
              <CreditCard className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white tracking-tight leading-tight">
                Sahayak Payout Requests &amp; Settlement Treasury
              </h1>
            </div>
          </div>

          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 font-normal leading-relaxed">
            Authoritative review, verification, and disbursement of 80% assistant commission shares.
          </p>
        </div>

        {/* Right Side: Vande Bharat Cutout & Refresh Button */}
        <div className="flex items-center gap-5 w-full lg:w-auto justify-between lg:justify-end">
          {/* Subtle Train Cutout Treatment */}
          <div className="hidden sm:flex items-center gap-3.5 pl-4 border-l border-zinc-200/60 dark:border-zinc-800/60">
            <div className="relative h-14 w-28 lg:w-36 overflow-hidden rounded-xl bg-gradient-to-r from-transparent to-white/30">
              <img
                src={trainHeaderImg}
                alt="Vande Bharat Express"
                className="w-full h-full object-cover object-center opacity-85 hover:opacity-100 transition-opacity duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-white dark:to-[#0D111A] pointer-events-none" />
            </div>
            <div className="text-left hidden md:block">
              <p className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 leading-tight">
                Empowering Sahayaks,
              </p>
              <p className="text-[11px] font-semibold text-[#2563EB] dark:text-blue-400 leading-tight">
                Strengthening Journeys.
              </p>
            </div>
          </div>

          {/* Compact Refresh Ledger Button */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={actionLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-xs hover:shadow transition-all duration-150 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Ledger</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 2. KPI CARDS SECTION ───────────────────────────────────────────────────
function PayoutKpis({ payouts = [], stats = {}, activeFilter, onSelectFilter }) {
  const pendingCount = useMemo(() => {
    return payouts.filter((p) => {
      const s = (p.status || '').toLowerCase();
      return s === 'requested' || s === 'pending';
    }).length;
  }, [payouts]);

  const processingCount = useMemo(() => {
    return payouts.filter((p) => {
      const s = (p.status || '').toLowerCase();
      return s === 'processing' || s === 'approved';
    }).length;
  }, [payouts]);

  const totalDisbursed = useMemo(() => {
    if (stats.totalPayoutsPaid !== undefined) return Number(stats.totalPayoutsPaid || 0);
    return payouts
      .filter((p) => (p.status || '').toLowerCase() === 'paid')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  }, [payouts, stats.totalPayoutsPaid]);

  const pendingFleet = useMemo(() => {
    if (stats.assistantEarningsPending !== undefined) return Number(stats.assistantEarningsPending || 0);
    return payouts
      .filter((p) => ['requested', 'pending', 'approved', 'processing'].includes((p.status || '').toLowerCase()))
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  }, [payouts, stats.assistantEarningsPending]);

  const cards = [
    {
      id: 'requested',
      label: 'PENDING REVIEW',
      value: pendingCount,
      isCurrency: false,
      desc: 'Awaiting administrative sign-off',
      icon: Clock,
      theme: {
        border: 'border-amber-200/80 dark:border-amber-900/40',
        bg: 'bg-white dark:bg-[#0D111A]',
        text: 'text-amber-500 dark:text-amber-400',
        badgeBg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400',
        stroke: '#F59E0B',
      },
      sparkline: 'M 0 16 Q 15 12 30 15 T 60 4'
    },
    {
      id: 'processing',
      label: 'IN PROCESSING',
      value: processingCount,
      isCurrency: false,
      desc: 'Treasury transfer underway',
      icon: Hourglass,
      theme: {
        border: 'border-blue-200/80 dark:border-blue-900/40',
        bg: 'bg-white dark:bg-[#0D111A]',
        text: 'text-[#2563EB] dark:text-blue-400',
        badgeBg: 'bg-blue-50 dark:bg-blue-950/40 text-[#2563EB] dark:text-blue-400',
        stroke: '#2563EB',
      },
      sparkline: 'M 0 18 Q 15 14 30 8 T 60 2'
    },
    {
      id: 'paid',
      label: 'TOTAL DISBURSED',
      value: totalDisbursed,
      isCurrency: true,
      desc: 'Cumulative paid out to sahayaks',
      icon: Wallet,
      theme: {
        border: 'border-emerald-200/80 dark:border-emerald-900/40',
        bg: 'bg-white dark:bg-[#0D111A]',
        text: 'text-emerald-600 dark:text-emerald-400',
        badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400',
        stroke: '#10B981',
      },
      sparkline: 'M 0 18 Q 15 10 30 12 T 60 3'
    },
    {
      id: 'ALL',
      label: 'PENDING FLEET SETTLEMENTS',
      value: pendingFleet,
      isCurrency: true,
      desc: 'Maturing earnings across all stations',
      icon: FileText,
      theme: {
        border: 'border-purple-200/80 dark:border-purple-900/40',
        bg: 'bg-white dark:bg-[#0D111A]',
        text: 'text-purple-600 dark:text-purple-400',
        badgeBg: 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400',
        stroke: '#8B5CF6',
      },
      sparkline: 'M 0 17 Q 15 13 30 11 T 60 5'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => {
        const IconComponent = c.icon;
        const isSelected = activeFilter && activeFilter.toLowerCase() === c.id.toLowerCase();

        return (
          <div
            key={c.id}
            onClick={() => onSelectFilter?.(c.id)}
            className={`p-4 sm:p-5 rounded-2xl border transition-all duration-150 cursor-pointer ${c.theme.bg} ${c.theme.border} ${isSelected ? 'ring-2 ring-blue-500 shadow-md' : 'hover:shadow-xs'
              }`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[10.5px] font-bold tracking-wider uppercase font-mono text-zinc-500 dark:text-zinc-400">
                {c.label}
              </span>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${c.theme.badgeBg}`}>
                <IconComponent className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="flex items-baseline justify-between gap-2 mt-1">
              <span className={`text-2xl font-bold font-mono tracking-tight ${c.theme.text}`}>
                {c.isCurrency ? `₹${c.value.toLocaleString('en-IN')}` : c.value}
              </span>

              {/* Minimal SVG Sparkline */}
              <div className="w-16 h-6 shrink-0">
                <svg viewBox="0 0 60 20" className="w-full h-full overflow-visible">
                  <path
                    d={c.sparkline}
                    fill="none"
                    stroke={c.theme.stroke}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>

            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-2 line-clamp-1 font-normal">
              {c.desc}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ── 3. STATUS TABS ──────────────────────────────────────────────────────────
function PayoutStatusTabs({ currentFilter = 'ALL', onFilterChange, counts }) {
  const tabs = [
    { id: 'ALL', label: 'All', count: counts.all ?? 0 },
    { id: 'requested', label: 'Requested', count: counts.requested ?? 0 },
    { id: 'approved', label: 'Approved', count: counts.approved ?? 0 },
    { id: 'processing', label: 'Processing', count: counts.processing ?? 0 },
    { id: 'paid', label: 'Paid', count: counts.paid ?? 0 },
    { id: 'failed', label: 'Failed', count: counts.failed ?? 0 },
    { id: 'rejected', label: 'Rejected', count: counts.rejected ?? 0 },
  ];

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none py-1">
      {tabs.map((tab) => {
        const isActive = (currentFilter || 'ALL').toLowerCase() === tab.id.toLowerCase();
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onFilterChange?.(tab.id)}
            className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer ${isActive
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs'
                : 'bg-zinc-100/90 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/80 dark:hover:bg-zinc-700/80'
              }`}
          >
            <span>{tab.label}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${isActive
                  ? 'bg-white/20 text-white dark:bg-zinc-900/20 dark:text-zinc-900'
                  : 'bg-zinc-200/70 dark:bg-zinc-700/60 text-zinc-500 dark:text-zinc-400'
                }`}
            >
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── 4. EMPTY STATE ─────────────────────────────────────────────────────────
function PayoutEmptyState({ onProcessMockPayout, onOpenGuidelines }) {
  return (
    <div className="py-16 px-4 text-center max-w-md mx-auto">
      <div className="w-14 h-14 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 text-[#2563EB] dark:text-blue-400 flex items-center justify-center mx-auto mb-4 border border-blue-100 dark:border-blue-900/50 shadow-xs">
        <FileText className="w-7 h-7 stroke-[1.8]" />
      </div>

      <h4 className="text-base font-bold text-zinc-900 dark:text-white">
        No payout withdrawal requests found.
      </h4>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
        When sahayaks request payouts, they will appear here for review and settlement.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
        <button
          type="button"
          onClick={onProcessMockPayout}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
        >
          <span>+ Process Mock Payout</span>
        </button>

        <button
          type="button"
          onClick={onOpenGuidelines}
          className="px-4 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5 text-zinc-400" />
          <span>View Payout Guidelines</span>
        </button>
      </div>
    </div>
  );
}

// ── 5. TABLE SECTION ───────────────────────────────────────────────────────
function PayoutTable({
  payouts,
  onInspectPayout,
  onApprove,
  onReject,
  onProcessing,
  onPaid,
  onFailed,
  actionLoading
}) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [activeMenuId, setActiveMenuId] = useState(null);

  const toggleSelectAll = () => {
    if (selectedIds.length === payouts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(payouts.map((p) => p.id));
    }
  };

  const toggleSelectRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const getStatusBadge = (status) => {
    const s = (status || 'requested').toLowerCase();
    switch (s) {
      case 'requested':
      case 'pending':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800';
      case 'approved':
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800';
      case 'processing':
        return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800';
      case 'paid':
      case 'completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800';
      case 'failed':
      case 'rejected':
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800';
      default:
        return 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300';
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-zinc-100 dark:border-zinc-800/80 text-[10.5px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-mono bg-[#F8FAFC]/60 dark:bg-zinc-900/30">
            <th className="py-3 px-4 w-10">
              <input
                type="checkbox"
                checked={payouts.length > 0 && selectedIds.length === payouts.length}
                onChange={toggleSelectAll}
                className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </th>
            <th className="py-3 px-4 font-semibold">REQUEST ID</th>
            <th className="py-3 px-4 font-semibold">SAHAYAK</th>
            <th className="py-3 px-4 font-semibold">STATION</th>
            <th className="py-3 px-4 font-semibold">BOOKINGS</th>
            <th className="py-3 px-4 font-semibold">COMMISSION (80%)</th>
            <th className="py-3 px-4 font-semibold">STATUS</th>
            <th className="py-3 px-4 font-semibold">REQUESTED ON</th>
            <th className="py-3 px-4 text-right font-semibold">ACTIONS</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
          {payouts.map((p) => {
            const id = p.id || 'N/A';
            const displayId =
              typeof id === 'string' && id.startsWith('PAY-')
                ? id
                : `#PAY-${String(id).slice(-5).toUpperCase()}`;

            const sahayakName = p.assistant?.name || p.sahayak_name || 'Ravi Kumar';
            const sahayakPhone = p.assistant?.phone || p.sahayak_phone || '+91 98480 22338';
            const station = p.assistant?.station_code || p.station || 'KZJ';
            const bookings = p.bookings_count || (p.booking_ids?.length ?? 12);
            const amount = Number(p.amount || 840);
            const dateStr = p.requested_at || p.created_at || '2026-09-11';
            const formattedDate = new Date(dateStr).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });
            const status = (p.status || 'requested').toUpperCase();
            const isMenuOpen = activeMenuId === id;

            return (
              <tr
                key={id}
                className="hover:bg-[#F8FAFC]/80 dark:hover:bg-zinc-800/30 transition-colors duration-100 group"
              >
                <td className="py-3 px-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(id)}
                    onChange={() => toggleSelectRow(id)}
                    className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </td>

                <td className="py-3 px-4">
                  <button
                    type="button"
                    onClick={() => onInspectPayout?.(p)}
                    className="font-mono text-xs font-semibold text-[#2563EB] dark:text-blue-400 hover:underline cursor-pointer text-left"
                  >
                    {displayId}
                  </button>
                </td>

                <td className="py-3 px-4">
                  <div className="font-semibold text-zinc-900 dark:text-white">
                    {sahayakName}
                  </div>
                  <div className="text-[11px] text-zinc-400 font-mono font-normal">
                    {sahayakPhone}
                  </div>
                </td>

                <td className="py-3 px-4">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono">
                    {station}
                  </span>
                </td>

                <td className="py-3 px-4 font-mono text-zinc-700 dark:text-zinc-300">
                  {bookings}
                </td>

                <td className="py-3 px-4">
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-[13px]">
                    ₹{amount.toLocaleString('en-IN')}
                  </span>
                </td>

                <td className="py-3 px-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${getStatusBadge(
                      p.status
                    )}`}
                  >
                    {status}
                  </span>
                </td>

                <td className="py-3 px-4 text-zinc-500 dark:text-zinc-400 text-[11px] font-medium whitespace-nowrap">
                  {formattedDate}
                </td>

                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1.5 relative">
                    <button
                      type="button"
                      onClick={() => onInspectPayout?.(p)}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      View
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveMenuId(isMenuOpen ? null : id)}
                      className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>

                    {/* Context Menu Dropdown */}
                    {isMenuOpen && (
                      <div className="absolute right-0 top-8 z-30 w-44 bg-white dark:bg-[#111622] rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xl py-1 text-left animate-in fade-in duration-100">
                        {status === 'REQUESTED' && (
                          <>
                            <button
                              disabled={actionLoading}
                              onClick={() => {
                                onApprove?.(id);
                                setActiveMenuId(null);
                              }}
                              className="w-full px-3 py-1.5 text-xs text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 flex items-center gap-2 cursor-pointer font-medium"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Approve Sign-off
                            </button>
                            <button
                              disabled={actionLoading}
                              onClick={() => {
                                onReject?.(id);
                                setActiveMenuId(null);
                              }}
                              className="w-full px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2 cursor-pointer font-medium"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              Reject Payout
                            </button>
                          </>
                        )}

                        {status === 'APPROVED' && (
                          <button
                            disabled={actionLoading}
                            onClick={() => {
                              onProcessing?.(id);
                              setActiveMenuId(null);
                            }}
                            className="w-full px-3 py-1.5 text-xs text-[#2563EB] hover:bg-blue-50 dark:hover:bg-blue-950/30 flex items-center gap-2 cursor-pointer font-medium"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            Start Processing
                          </button>
                        )}

                        {status === 'PROCESSING' && (
                          <>
                            <button
                              disabled={actionLoading}
                              onClick={() => {
                                onPaid?.(p);
                                setActiveMenuId(null);
                              }}
                              className="w-full px-3 py-1.5 text-xs text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 flex items-center gap-2 cursor-pointer font-medium"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Mark Paid
                            </button>
                            <button
                              disabled={actionLoading}
                              onClick={() => {
                                onFailed?.(id);
                                setActiveMenuId(null);
                              }}
                              className="w-full px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2 cursor-pointer font-medium"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              Mark Failed
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => {
                            onInspectPayout?.(p);
                            setActiveMenuId(null);
                          }}
                          className="w-full px-3 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-zinc-400" />
                          View Dossier
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── 6. PAYOUT INSIGHTS (7D / 30D / 90D CHART) ──────────────────────────────
function PayoutInsights({ payouts = [] }) {
  const [timeframe, setTimeframe] = useState('7D');

  const chartData = useMemo(() => {
    const days = timeframe === '7D' ? 7 : timeframe === '30D' ? 30 : 90;
    const now = new Date(2026, 8, 11);
    const bins = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      bins.push({ date: key, label, count: 0 });
    }

    payouts.forEach((p) => {
      if (!p.created_at) return;
      const pDate = new Date(p.created_at).toISOString().split('T')[0];
      const found = bins.find((b) => b.date === pDate);
      if (found) found.count += 1;
    });

    return bins;
  }, [timeframe, payouts]);

  const totalCount = chartData.reduce((acc, d) => acc + d.count, 0);

  const width = 640;
  const height = 220;
  const padding = { top: 20, right: 20, bottom: 40, left: 40 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const maxVal = Math.max(4, ...chartData.map((d) => d.count));
  const yTicks = [0, Math.round(maxVal * 0.25), Math.round(maxVal * 0.5), Math.round(maxVal * 0.75), maxVal];

  const step = Math.ceil(chartData.length / 7);
  const visiblePoints = chartData.filter((_, idx) => idx % step === 0 || idx === chartData.length - 1);

  const points = chartData.map((d, i) => {
    const x = padding.left + (i / (chartData.length - 1 || 1)) * innerWidth;
    const y = padding.top + innerHeight - (d.count / maxVal) * innerHeight;
    return { ...d, x, y };
  });

  const pathD = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');

  const areaD =
    points.length > 0
      ? `${pathD} L ${points[points.length - 1].x} ${padding.top + innerHeight} L ${points[0].x} ${padding.top + innerHeight} Z`
      : '';

  return (
    <div className="bg-white dark:bg-[#0D111A] rounded-2xl border border-zinc-200/90 dark:border-zinc-800/90 p-5 shadow-xs flex flex-col justify-between h-full">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-[#2563EB] dark:text-blue-400 shrink-0 border border-blue-100 dark:border-blue-900/50">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
              Payout Insights
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Overview of sahayak payout requests over time.
            </p>
          </div>
        </div>

        <div className="inline-flex items-center p-0.5 bg-zinc-100 dark:bg-zinc-800/80 rounded-lg border border-zinc-200/60 dark:border-zinc-700/60 text-xs font-medium">
          {['7D', '30D', '90D'].map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all duration-150 cursor-pointer ${timeframe === t
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white'
                }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="relative w-full h-[220px] flex items-center justify-center">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="payoutGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563EB" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {yTicks.map((val, idx) => {
            const y = padding.top + innerHeight - (val / maxVal) * innerHeight;
            return (
              <g key={`y-${idx}`}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="currentColor"
                  className="text-zinc-100 dark:text-zinc-800"
                  strokeDasharray={idx === 0 ? undefined : '3 3'}
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="text-[10px] fill-zinc-400 font-mono"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {visiblePoints.map((pt, idx) => {
            const originalIndex = chartData.findIndex((d) => d.date === pt.date);
            const x = padding.left + (originalIndex / (chartData.length - 1 || 1)) * innerWidth;
            return (
              <g key={`x-grid-${idx}`}>
                <line
                  x1={x}
                  y1={padding.top}
                  x2={x}
                  y2={padding.top + innerHeight}
                  stroke="currentColor"
                  className="text-zinc-100/70 dark:text-zinc-800/70"
                  strokeWidth="1"
                />
                <text
                  x={x}
                  y={height - 12}
                  textAnchor="middle"
                  className="text-[10px] fill-zinc-400 font-medium"
                >
                  {pt.label}
                </text>
              </g>
            );
          })}

          {totalCount > 0 && <path d={areaD} fill="url(#payoutGrad)" />}

          <path
            d={pathD}
            fill="none"
            stroke="#2563EB"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {points.map((p, idx) => (
            <circle
              key={`pt-${idx}`}
              cx={p.x}
              cy={p.y}
              r="3.5"
              className="fill-white dark:fill-[#0D111A] stroke-blue-600 stroke-[2] transition-transform duration-150 hover:scale-150 cursor-pointer"
            >
              <title>{`${p.label}: ${p.count} request${p.count === 1 ? '' : 's'}`}</title>
            </circle>
          ))}
        </svg>

        {totalCount === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-6">
            <div className="w-8 h-8 rounded-lg bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 mb-2 border border-zinc-100 dark:border-zinc-700">
              <BarChart2 className="w-4 h-4" />
            </div>
            <p className="text-xs font-medium text-zinc-400 dark:text-zinc-500">
              No data available for the selected period.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 7. STATUS BREAKDOWN ────────────────────────────────────────────────────
function PayoutStatusBreakdown({ payouts = [] }) {
  const breakdown = useMemo(() => {
    const total = payouts.length;
    const counts = {
      requested: 0,
      approved: 0,
      processing: 0,
      paid: 0,
      failed: 0,
      rejected: 0,
    };

    payouts.forEach((p) => {
      const s = (p.status || '').toLowerCase();
      if (counts[s] !== undefined) {
        counts[s] += 1;
      } else if (s === 'pending') {
        counts.requested += 1;
      } else if (s === 'completed') {
        counts.paid += 1;
      }
    });

    const items = [
      { key: 'requested', label: 'Requested', dotColor: 'bg-amber-400', barColor: 'bg-amber-400', count: counts.requested, percentage: total > 0 ? Math.round((counts.requested / total) * 100) : 0 },
      { key: 'approved', label: 'Approved', dotColor: 'bg-emerald-500', barColor: 'bg-emerald-500', count: counts.approved, percentage: total > 0 ? Math.round((counts.approved / total) * 100) : 0 },
      { key: 'processing', label: 'Processing', dotColor: 'bg-blue-500', barColor: 'bg-blue-500', count: counts.processing, percentage: total > 0 ? Math.round((counts.processing / total) * 100) : 0 },
      { key: 'paid', label: 'Paid', dotColor: 'bg-emerald-600', barColor: 'bg-emerald-600', count: counts.paid, percentage: total > 0 ? Math.round((counts.paid / total) * 100) : 0 },
      { key: 'failed', label: 'Failed', dotColor: 'bg-rose-500', barColor: 'bg-rose-500', count: counts.failed, percentage: total > 0 ? Math.round((counts.failed / total) * 100) : 0 },
      { key: 'rejected', label: 'Rejected', dotColor: 'bg-zinc-400', barColor: 'bg-zinc-400', count: counts.rejected, percentage: total > 0 ? Math.round((counts.rejected / total) * 100) : 0 },
    ];

    return { total, items };
  }, [payouts]);

  return (
    <div className="bg-white dark:bg-[#0D111A] rounded-2xl border border-zinc-200/90 dark:border-zinc-800/90 p-5 shadow-xs flex flex-col justify-between h-full">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-[#2563EB] dark:text-blue-400 shrink-0 border border-blue-100 dark:border-blue-900/50">
          <Layers className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
            Payout Status Breakdown
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Distribution of payout requests by status.
          </p>
        </div>
      </div>

      <div className="space-y-3 my-auto">
        {breakdown.items.map((item) => (
          <div key={item.key} className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-2 w-24 shrink-0">
              <span className={`w-2 h-2 rounded-full ${item.dotColor}`} />
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                {item.label}
              </span>
            </div>

            <span className="w-6 text-right font-mono font-semibold text-zinc-900 dark:text-white shrink-0">
              {item.count}
            </span>

            <div className="flex-1 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full ${item.barColor} transition-all duration-300 rounded-full`}
                style={{ width: `${item.percentage}%` }}
              />
            </div>

            <span className="w-9 text-right font-mono text-zinc-400 text-[11px] shrink-0">
              {item.percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 8. TREASURY HEALTH ─────────────────────────────────────────────────────
function TreasuryHealth({ lastSynced }) {
  const formattedTime = lastSynced
    ? new Date(lastSynced).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    : '11 Sept 2026, 17:07:23';

  const healthItems = [
    { label: 'Treasury Wallet', status: 'Operational' },
    { label: 'Payout Engine', status: 'Active' },
    { label: 'Commission Calculation', status: 'Verified (80%)' },
    { label: 'Bank Transfer Module', status: 'Operational' },
  ];

  return (
    <div className="bg-white dark:bg-[#0D111A] rounded-2xl border border-zinc-200/90 dark:border-zinc-800/90 p-5 shadow-xs flex flex-col justify-between h-full">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-[#2563EB] dark:text-blue-400 shrink-0 border border-blue-100 dark:border-blue-900/50">
          <Activity className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
            Treasury Health
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Real-time treasury and disbursement status.
          </p>
        </div>
      </div>

      <div className="space-y-2.5 my-auto">
        {healthItems.map((item, idx) => (
          <div
            key={idx}
            className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-50/70 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800/80"
          >
            <div className="w-6 h-6 rounded-full bg-emerald-100/70 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-zinc-900 dark:text-white leading-tight">
                {item.label}
              </p>
              <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 leading-tight">
                {item.status}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-4 mt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-zinc-500">
          <Clock className="w-3.5 h-3.5 text-zinc-400" />
          <div>
            <div className="text-[10px] uppercase font-semibold tracking-wider text-zinc-400">
              Last Checked
            </div>
            <div className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300 font-mono">
              {formattedTime}
            </div>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60 text-[11px] font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          All Systems Operational
        </div>
      </div>
    </div>
  );
}

// ── 9. POLICY BANNER ───────────────────────────────────────────────────────
function PayoutPolicyBanner({ onOpenPolicy }) {
  return (
    <div className="bg-blue-50/70 dark:bg-blue-950/20 rounded-2xl border border-blue-100/80 dark:border-blue-900/40 p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
      <div className="flex items-start sm:items-center gap-3.5">
        <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
          <Info className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-zinc-900 dark:text-white leading-snug">
            Secure &amp; Transparent Payouts
          </h4>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5 leading-relaxed">
            All payout requests are verified, audited, and processed securely. Sahayaks receive 80% of eligible commission as per platform policy.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
        <button
          type="button"
          onClick={onOpenPolicy}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-pointer"
        >
          <span>View Policy</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/70 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60 text-xs font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>System Secure</span>
        </div>
      </div>
    </div>
  );
}

// ── 10. MODALS (DETAIL DOSSIER & GUIDELINES) ────────────────────────────────
function PayoutGuidelinesModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#111622] w-full max-w-xl rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-[#2563EB] dark:text-blue-400 border border-blue-100 dark:border-blue-900/50">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
                OneCoolie Sahayak Payout Policy
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Treasury rules, disbursement SLAs, and commission guarantees
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-xs leading-relaxed max-h-[70vh] overflow-y-auto">
          <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[#2563EB] dark:text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900 dark:text-blue-200">
                80% Assistant Commission Guarantee
              </p>
              <p className="text-blue-700/90 dark:text-blue-300/80 mt-0.5">
                Every verified Sahayak receives exactly 80% of booking revenue. Platform retains 20% for network telemetry, passenger insurance, and station desk infrastructure.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-zinc-900 dark:text-white uppercase tracking-wider text-[11px]">
              Treasury Settlement Schedule
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
                <p className="font-medium text-zinc-900 dark:text-white">Morning Batch</p>
                <p className="text-zinc-500 text-[11px] mt-0.5">11:00 AM IST (IMPS / UPI Direct)</p>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
                <p className="font-medium text-zinc-900 dark:text-white">Evening Batch</p>
                <p className="text-zinc-500 text-[11px] mt-0.5">05:00 PM IST (NEFT Batch Run)</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-zinc-900 dark:text-white uppercase tracking-wider text-[11px]">
              Compliance &amp; Verification Checks
            </h4>
            <ul className="space-y-2 text-zinc-600 dark:text-zinc-400">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Station badge number &amp; Aadhaar biometric identity must be fully verified.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Zero unresolved passenger dispute or luggage damage flags in the last 24 hours.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>UPI VPA or Bank Account IFSC must match the registered Sahayak profile.</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors shadow-xs cursor-pointer"
          >
            Acknowledge Guidelines
          </button>
        </div>
      </div>
    </div>
  );
}

function PayoutDetailModal({
  payout,
  isOpen,
  onClose,
  onApprove,
  onReject,
  onProcess,
  onPaid,
  actionLoading,
}) {
  if (!isOpen || !payout) return null;

  const id = payout.id || 'N/A';
  const displayId = typeof id === 'string' && id.startsWith('PAY-') ? id : `#PAY-${String(id).slice(-5).toUpperCase()}`;
  const sahayakName = payout.sahayak_name || payout.assistant?.name || 'Assigned Sahayak';
  const sahayakPhone = payout.sahayak_phone || payout.assistant?.phone || '+91 98765 43210';
  const station = payout.station || payout.assistant?.station_code || 'SC';
  const amount = Number(payout.amount || 0);
  const grossEst = Math.round(amount / 0.8);
  const platformFee = grossEst - amount;
  const bookingsCount = payout.booking_ids?.length || payout.bookings_count || 1;
  const status = (payout.status || 'REQUESTED').toUpperCase();

  const isPending = status === 'REQUESTED' || status === 'PENDING';
  const isApproved = status === 'APPROVED';
  const isProcessing = status === 'PROCESSING';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#111622] w-full max-w-xl rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-[#2563EB] dark:text-blue-400 border border-blue-100 dark:border-blue-900/50">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-[#2563EB] dark:text-blue-400">
                  {displayId}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 uppercase font-mono">
                  {status}
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Sahayak Commission Settlement Dossier
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-xs max-h-[70vh] overflow-y-auto">
          <div className="p-4 rounded-xl bg-zinc-50/80 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-semibold flex items-center justify-center text-sm shadow-xs">
                {sahayakName[0] || 'S'}
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-900 dark:text-white">
                  {sahayakName}
                </p>
                <p className="text-zinc-500 dark:text-zinc-400 font-mono text-[11px]">
                  {sahayakPhone}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold text-xs border border-blue-100 dark:border-blue-900/40 font-mono">
                <MapPin className="w-3 h-3" />
                {station}
              </span>
              <p className="text-[10px] text-zinc-400 mt-1">Station Hub</p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 space-y-3">
            <h4 className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400 font-mono">
              Commission &amp; Share Calculation
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                <span>Completed Assistant Bookings</span>
                <span className="font-semibold text-zinc-900 dark:text-white font-mono">
                  {bookingsCount} trips
                </span>
              </div>
              <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                <span>Gross Porter Revenue</span>
                <span className="font-mono text-zinc-700 dark:text-zinc-300">
                  ₹{grossEst.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                <span>Platform Telemetry &amp; Insurance Fee (20%)</span>
                <span className="font-mono text-zinc-500 dark:text-zinc-400">
                  - ₹{platformFee.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center text-sm font-bold">
                <span className="text-zinc-900 dark:text-white">
                  Sahayak Net Commission (80%)
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono text-base">
                  ₹{amount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
              <p className="text-[10px] uppercase font-semibold text-zinc-400 font-mono">
                Settlement Channel
              </p>
              <p className="font-medium text-zinc-900 dark:text-white mt-0.5">
                UPI Instant / IMPS
              </p>
              <p className="text-[11px] font-mono text-zinc-500 mt-0.5">
                {payout.payment_details?.upi_id || 'sahayak@okhdfcbank'}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
              <p className="text-[10px] uppercase font-semibold text-zinc-400 font-mono">
                Verification State
              </p>
              <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>KYC Cleared</span>
              </div>
              <p className="text-[11px] text-zinc-500 mt-0.5 font-mono">
                Railway Pass Active
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Dismiss
          </button>

          <div className="flex items-center gap-2">
            {isPending && (
              <>
                <button
                  disabled={actionLoading}
                  onClick={() => {
                    onReject?.(id);
                    onClose();
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Ban className="w-3.5 h-3.5" />
                  Reject
                </button>
                <button
                  disabled={actionLoading}
                  onClick={() => {
                    onApprove?.(id);
                    onClose();
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  Approve Sign-off
                </button>
              </>
            )}

            {isApproved && (
              <button
                disabled={actionLoading}
                onClick={() => {
                  onProcess?.(id);
                  onClose();
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5" />
                Dispatch to Bank Processing
              </button>
            )}

            {isProcessing && (
              <button
                disabled={actionLoading}
                onClick={() => {
                  onPaid?.(payout);
                  onClose();
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Confirm Settlement &amp; Mark Paid
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 11. MASTER ORCHESTRATOR COMPONENT ───────────────────────────────────────
export default function SahayakPayoutsView({
  payoutsList = [],
  payoutsFilter = 'ALL',
  setPayoutsFilter,
  stats = {},
  actionLoading = false,
  fetchAll,
  lastSynced,
  handleApprovePayout,
  handleRejectPayout,
  handleProcessingPayout,
  handlePaidPayout,
  handleFailedPayout,
}) {
  const [isGuidelinesOpen, setIsGuidelinesOpen] = useState(false);
  const [selectedDetailPayout, setSelectedDetailPayout] = useState(null);

  // Search & Filter state for the ledger
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState('ALL');
  const [showFilters, setShowFilters] = useState(false);

  // Local simulated payouts (in case dev backend has 0 records)
  const [mockPayouts, setMockPayouts] = useState([]);

  const allPayouts = useMemo(() => {
    if (payoutsList && payoutsList.length > 0) {
      return payoutsList;
    }
    return mockPayouts;
  }, [payoutsList, mockPayouts]);

  const handleProcessMockPayout = () => {
    const mock = {
      id: `PAY-${Math.floor(10000 + Math.random() * 90000)}`,
      status: 'requested',
      amount: 840,
      bookings_count: 12,
      booking_ids: Array.from({ length: 12 }, (_, i) => `BK-00${i + 1}`),
      assistant: {
        id: 'ast-mock-01',
        name: 'Ravi Kumar',
        phone: '+91 98480 22338',
        station_code: 'KZJ',
      },
      assistant_id: 'ast-mock-01',
      payout_method: 'upi',
      payment_details: {
        upi_id: 'ravikumar.porter@okhdfcbank',
      },
      created_at: new Date().toISOString(),
      requested_at: new Date().toISOString(),
    };

    setMockPayouts((prev) => [mock, ...prev]);
    toast.success('Demonstration payout request initialized');
  };

  // Filter tab counts
  const counts = useMemo(() => {
    return {
      all: allPayouts.length,
      requested: allPayouts.filter((p) => (p.status || '').toLowerCase() === 'requested').length,
      approved: allPayouts.filter((p) => (p.status || '').toLowerCase() === 'approved').length,
      processing: allPayouts.filter((p) => (p.status || '').toLowerCase() === 'processing').length,
      paid: allPayouts.filter((p) => (p.status || '').toLowerCase() === 'paid').length,
      failed: allPayouts.filter((p) => (p.status || '').toLowerCase() === 'failed').length,
      rejected: allPayouts.filter((p) => (p.status || '').toLowerCase() === 'rejected').length,
    };
  }, [allPayouts]);

  // Filtered payouts based on status, search, and date
  const filteredPayouts = useMemo(() => {
    return allPayouts.filter((p) => {
      // 1. Status Filter
      if (payoutsFilter && payoutsFilter !== 'ALL') {
        const pStatus = (p.status || '').toLowerCase();
        const fStatus = payoutsFilter.toLowerCase();
        if (pStatus !== fStatus) return false;
      }

      // 2. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim().replace(/^#/, '');
        const id = String(p.id || '').toLowerCase();
        const sName = String(p.assistant?.name || p.sahayak_name || '').toLowerCase();
        const sPhone = String(p.assistant?.phone || '').toLowerCase();
        const station = String(p.assistant?.station_code || p.station || '').toLowerCase();

        const matches =
          id.includes(q) ||
          sName.includes(q) ||
          sPhone.includes(q) ||
          station.includes(q);

        if (!matches) return false;
      }

      // 3. Date Range Filter
      if (dateRange !== 'ALL' && p.created_at) {
        const pDate = new Date(p.created_at).getTime();
        const now = Date.now();
        if (dateRange === 'TODAY') {
          const oneDay = 24 * 60 * 60 * 1000;
          if (now - pDate > oneDay) return false;
        } else if (dateRange === '7D') {
          const sevenDays = 7 * 24 * 60 * 60 * 1000;
          if (now - pDate > sevenDays) return false;
        } else if (dateRange === '30D') {
          const thirtyDays = 30 * 24 * 60 * 60 * 1000;
          if (now - pDate > thirtyDays) return false;
        }
      }

      return true;
    });
  }, [allPayouts, payoutsFilter, searchQuery, dateRange]);

  // Action delegators supporting both backend APIs and test records
  const onApprove = (id) => {
    if (mockPayouts.some((m) => m.id === id)) {
      setMockPayouts((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: 'approved' } : m))
      );
      toast.success('Payout sign-off approved.');
    } else {
      handleApprovePayout?.(id);
    }
  };

  const onReject = (id) => {
    if (mockPayouts.some((m) => m.id === id)) {
      setMockPayouts((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: 'rejected' } : m))
      );
      toast.success('Payout rejected.');
    } else {
      handleRejectPayout?.(id);
    }
  };

  const onProcess = (id) => {
    if (mockPayouts.some((m) => m.id === id)) {
      setMockPayouts((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: 'processing' } : m))
      );
      toast.success('Payout dispatched to processing.');
    } else {
      handleProcessingPayout?.(id);
    }
  };

  const onPaid = (payout) => {
    if (mockPayouts.some((m) => m.id === payout.id)) {
      setMockPayouts((prev) =>
        prev.map((m) => (m.id === payout.id ? { ...m, status: 'paid', payout_reference: 'NEFT-MOCK-99182' } : m))
      );
      toast.success('Payout settled & marked paid!');
    } else {
      handlePaidPayout?.(payout);
    }
  };

  const onFailed = (id) => {
    if (mockPayouts.some((m) => m.id === id)) {
      setMockPayouts((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: 'failed' } : m))
      );
      toast.success('Payout marked failed.');
    } else {
      handleFailedPayout?.(id);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-zinc-800 dark:text-zinc-200">
      {/* ── 1. Page Header ── */}
      <PayoutHeader
        onRefresh={fetchAll}
        actionLoading={actionLoading}
      />

      {/* ── 2. KPI Cards Row ── */}
      <PayoutKpis
        payouts={allPayouts}
        stats={stats}
        activeFilter={payoutsFilter}
        onSelectFilter={(f) => setPayoutsFilter?.(f)}
      />

      {/* ── 3. Master Payout Ledger Card ── */}
      <div className="bg-white dark:bg-[#0D111A] border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.02)] overflow-hidden space-y-4">
        {/* Ledger Header Controls */}
        <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base sm:text-[17px] font-bold text-[#0F172A] dark:text-white tracking-tight">
              Payout Requests
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Review, verify and settle Sahayak commission withdrawals.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* Date Range Selector */}
            <div className="relative">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="appearance-none bg-[#F8FAFC] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/80 rounded-xl pl-8 pr-8 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-2xs"
              >
                <option value="ALL">Select Date Range</option>
                <option value="TODAY">Today</option>
                <option value="7D">Last 7 Days</option>
                <option value="30D">Last 30 Days</option>
              </select>
              <Calendar className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <ChevronDown className="w-3 h-3 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Filter Toggle */}
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-2xs ${showFilters
                  ? 'bg-blue-50 text-[#2563EB] border-blue-200 dark:bg-blue-950/40 dark:border-blue-800'
                  : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700/80 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                }`}
            >
              <Filter className="w-3.5 h-3.5 text-zinc-400" />
              <span>Filters</span>
            </button>
          </div>
        </div>

        {/* Expandable Filter Search */}
        {showFilters && (
          <div className="px-4 sm:px-5 pb-2 animate-in fade-in duration-150">
            <div className="relative max-w-sm">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Request ID, Sahayak, Station..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {/* Horizontal Status Pills */}
        <div className="px-4 sm:px-5">
          <PayoutStatusTabs
            currentFilter={payoutsFilter}
            onFilterChange={(f) => setPayoutsFilter?.(f)}
            counts={counts}
          />
        </div>

        {/* Table or Clean Empty State */}
        <div className="pt-1">
          {filteredPayouts.length === 0 ? (
            <PayoutEmptyState
              onProcessMockPayout={handleProcessMockPayout}
              onOpenGuidelines={() => setIsGuidelinesOpen(true)}
            />
          ) : (
            <PayoutTable
              payouts={filteredPayouts}
              onInspectPayout={(p) => setSelectedDetailPayout(p)}
              onApprove={onApprove}
              onReject={onReject}
              onProcessing={onProcess}
              onPaid={onPaid}
              onFailed={onFailed}
              actionLoading={actionLoading}
            />
          )}
        </div>
      </div>

      {/* ── 4. Lower Analytics 3-Column Section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
        <div className="h-full">
          <PayoutInsights payouts={allPayouts} />
        </div>
        <div className="h-full">
          <PayoutStatusBreakdown payouts={allPayouts} />
        </div>
        <div className="h-full">
          <TreasuryHealth lastSynced={lastSynced} />
        </div>
      </div>

      {/* ── 5. Security & Policy Information Banner ── */}
      <PayoutPolicyBanner
        onOpenPolicy={() => setIsGuidelinesOpen(true)}
      />

      {/* ── 6. Modals ── */}
      <PayoutGuidelinesModal
        isOpen={isGuidelinesOpen}
        onClose={() => setIsGuidelinesOpen(false)}
      />

      <PayoutDetailModal
        payout={selectedDetailPayout}
        isOpen={Boolean(selectedDetailPayout)}
        onClose={() => setSelectedDetailPayout(null)}
        onApprove={onApprove}
        onReject={onReject}
        onProcess={onProcess}
        onPaid={onPaid}
        actionLoading={actionLoading}
      />
    </div>
  );
}
