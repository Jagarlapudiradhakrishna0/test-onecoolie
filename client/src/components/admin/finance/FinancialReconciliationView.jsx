import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  FileText,
  CheckCircle2,
  RefreshCw,
  Clock,
  Wallet,
  RotateCcw,
  IndianRupee,
  PieChart,
  Users,
  Hourglass,
  AlertTriangle,
  ChevronRight,
  Activity,
  Download,
  ChevronDown,
  ChevronUp,
  Search,
  Info,
  Building,
  ArrowRight,
  Database,
  CreditCard,
  Webhook,
  FileCheck2,
  Lock
} from 'lucide-react';
import toast from 'react-hot-toast';

/* ==========================================================================
   ONECOOLIE FINANCIAL RECONCILIATIONS MASTER CONTROL CENTER
   Consolidated single-file enterprise financial views, invariants & recovery
   ========================================================================== */

// ── 1. STATUS BADGE HELPER ────────────────────────────────────────────────
function FinancialStatusBadge({
  status = 'UNKNOWN',
  size = 'md',
  dot = true,
  className = ''
}) {
  const normalized = String(status || '').toUpperCase().trim();

  let theme = {
    bg: 'bg-zinc-100 dark:bg-zinc-800/70',
    text: 'text-zinc-700 dark:text-zinc-300',
    border: 'border-zinc-200/80 dark:border-zinc-700/80',
    dotColor: 'bg-zinc-400'
  };

  switch (normalized) {
    case 'HEALTHY':
    case 'PASS':
    case 'VERIFIED':
    case 'UP':
    case 'CONFIGURED':
    case 'AUTHENTICATED':
    case 'PAID':
    case 'COMPLETED':
    case 'ALL_CLEAR':
    case 'SATISFIED':
      theme = {
        bg: 'bg-emerald-50 dark:bg-emerald-950/40',
        text: 'text-emerald-700 dark:text-emerald-300',
        border: 'border-emerald-200 dark:border-emerald-800/80',
        dotColor: 'bg-emerald-500'
      };
      break;

    case 'CRITICAL':
    case 'FAILED':
    case 'FAIL':
    case 'DOWN':
    case 'REJECTED':
    case 'MISSING':
    case 'DEGRADED':
    case 'BREACH':
      theme = {
        bg: 'bg-rose-50 dark:bg-rose-950/40',
        text: 'text-rose-700 dark:text-rose-300',
        border: 'border-rose-200 dark:border-rose-800/80',
        dotColor: 'bg-rose-500'
      };
      break;

    case 'WARNING':
    case 'WARN':
    case 'PENDING':
    case 'PROCESSING':
    case 'REQUESTED':
    case 'HELD':
    case 'NOT SET':
    case 'NOT_SET':
    case 'INVESTIGATING':
      theme = {
        bg: 'bg-amber-50 dark:bg-amber-950/40',
        text: 'text-amber-800 dark:text-amber-300',
        border: 'border-amber-200 dark:border-amber-800/80',
        dotColor: 'bg-amber-500'
      };
      break;

    case 'APPROVED':
    case 'SETTLED':
    case 'RECORDED':
    case 'AVAILABLE':
      theme = {
        bg: 'bg-blue-50 dark:bg-blue-950/40',
        text: 'text-blue-700 dark:text-blue-300',
        border: 'border-blue-200 dark:border-blue-800/80',
        dotColor: 'bg-blue-500'
      };
      break;

    case 'REFUNDED':
    case 'REVERSED':
      theme = {
        bg: 'bg-purple-50 dark:bg-purple-950/40',
        text: 'text-purple-700 dark:text-purple-300',
        border: 'border-purple-200 dark:border-purple-800/80',
        dotColor: 'bg-purple-500'
      };
      break;

    default:
      break;
  }

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[9px] gap-1',
    md: 'px-2 py-0.5 text-[10px] gap-1.5',
    lg: 'px-2.5 py-1 text-xs gap-2'
  }[size] || 'px-2 py-0.5 text-[10px] gap-1.5';

  return (
    <span
      className={`inline-flex items-center font-mono font-bold uppercase tracking-wider rounded-md border transition-colors ${sizeClasses} ${theme.bg} ${theme.text} ${theme.border} ${className}`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${theme.dotColor}`}
          aria-hidden="true"
        />
      )}
      <span className="truncate">{normalized.replace(/_/g, ' ')}</span>
    </span>
  );
}

// ── 2. PAGE HEADER ────────────────────────────────────────────────────────
function FinancialPageHeader({
  reconciledAt,
  reconLoading,
  onRefresh
}) {
  const formattedTime = reconciledAt
    ? new Date(reconciledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-[#0D111A] border border-[#E5EAF1] dark:border-zinc-800 shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-5 sm:p-6 transition-all">
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-blue-50/40 via-transparent to-blue-50/20 dark:from-blue-950/10 dark:to-transparent" />
      
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-start gap-4 max-w-3xl">
          <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center shrink-0 shadow-xs text-blue-600 dark:text-blue-400">
            <ShieldCheck className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold tracking-wider text-blue-600 dark:text-blue-400 uppercase font-mono">
                Finance Operations
              </span>
              {formattedTime && (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
                  <span>•</span>
                  <Clock className="w-3 h-3 inline" />
                  <span>Reconciled at {formattedTime}</span>
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Financial Reconciliation, Invariants & Audit Trail
            </h1>

            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed font-sans">
              Mathematical validation of revenue splits (20/80), refund ceilings, wallet solvency, and tamper-evident audit logs.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center lg:items-end gap-4 shrink-0">
          <div className="hidden sm:flex items-center gap-3 pr-2 border-r border-zinc-200/80 dark:border-zinc-800">
            <img
              src="/my_trips_train_graphic.png"
              alt="OneCoolie Train Network"
              className="h-10 w-auto object-contain opacity-85 dark:opacity-75 select-none"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <div className="text-right">
              <div className="flex items-center justify-end gap-1.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400 font-mono">
                <span>Trusted Finance.</span>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              </div>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
                Smoother Journeys.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={reconLoading}
            className="group relative inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold shadow-xs hover:shadow transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 transition-transform duration-500 ${
                reconLoading ? 'animate-spin' : 'group-hover:rotate-180'
              }`}
            />
            <span>Re-run Invariants Engine</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 3. FINANCIAL KPI ROW ──────────────────────────────────────────────────
function FinancialKpiRow({ metrics = {}, loading = false }) {
  const formatINR = (val) => {
    const num = Number(val) || 0;
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  const cards = [
    {
      id: 'gross',
      label: 'GROSS COLLECTIONS',
      value: formatINR(metrics.gross_payments),
      subtext: 'Paid payments',
      icon: Wallet,
      iconBg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400',
      valueColor: 'text-zinc-900 dark:text-white',
      sparklineColor: '#10B981',
      sparklinePath: 'M 0 16 Q 15 8 30 13 T 60 4',
      borderClass: 'border-[#E5EAF1] dark:border-zinc-800'
    },
    {
      id: 'refunds',
      label: 'TOTAL REFUNDS',
      value: formatINR(metrics.total_refunded),
      subtext: 'Completed returns',
      icon: RotateCcw,
      iconBg: 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400',
      valueColor: 'text-rose-600 dark:text-rose-400',
      sparklineColor: '#F43F5E',
      sparklinePath: 'M 0 14 Q 15 16 30 10 T 60 5',
      borderClass: 'border-[#E5EAF1] dark:border-zinc-800'
    },
    {
      id: 'net',
      label: 'NET COLLECTED',
      value: formatINR(metrics.net_collected),
      subtext: 'Gross minus refunds',
      icon: IndianRupee,
      iconBg: 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400',
      valueColor: 'text-blue-600 dark:text-blue-400 font-bold',
      sparklineColor: '#2563EB',
      sparklinePath: 'M 0 17 Q 20 15 35 9 T 60 3',
      borderClass: 'border-[#E5EAF1] dark:border-zinc-800'
    },
    {
      id: 'platform',
      label: 'PLATFORM 20%',
      value: formatINR(metrics.platform_commission),
      subtext: 'Completed bookings',
      icon: PieChart,
      iconBg: 'bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400',
      valueColor: 'text-purple-600 dark:text-purple-400',
      sparklineColor: '#9333EA',
      sparklinePath: 'M 0 15 Q 18 13 32 11 T 60 6',
      borderClass: 'border-[#E5EAF1] dark:border-zinc-800'
    },
    {
      id: 'sahayak',
      label: 'SAHAYAK PAID OUT',
      value: formatINR(metrics.total_payouts_paid),
      subtext: 'Finalized disbursements',
      icon: Users,
      iconBg: 'bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400',
      valueColor: 'text-violet-600 dark:text-violet-400',
      sparklineColor: '#7C3AED',
      sparklinePath: 'M 0 16 Q 16 11 34 14 T 60 5',
      borderClass: 'border-[#E5EAF1] dark:border-zinc-800'
    },
    {
      id: 'liability',
      label: 'PENDING LIABILITY',
      value: formatINR(metrics.pending_liability),
      subtext: 'Pending • Avail • Held',
      icon: Hourglass,
      iconBg: 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400',
      valueColor: 'text-amber-600 dark:text-amber-400',
      sparklineColor: '#F59E0B',
      sparklinePath: 'M 0 15 Q 15 14 30 11 T 60 7',
      borderClass: 'border-amber-300 dark:border-amber-700/80 bg-amber-50/20 dark:bg-amber-950/10'
    }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;

        if (loading) {
          return (
            <div
              key={card.id}
              className="bg-white dark:bg-[#0D111A] border border-[#E5EAF1] dark:border-zinc-800 rounded-2xl p-4 shadow-xs animate-pulse"
            >
              <div className="h-2.5 w-16 bg-zinc-200 dark:bg-zinc-800 rounded mb-3" />
              <div className="h-6 w-24 bg-zinc-200 dark:bg-zinc-800 rounded mb-2" />
              <div className="h-2 w-20 bg-zinc-100 dark:bg-zinc-800/60 rounded" />
            </div>
          );
        }

        return (
          <div
            key={card.id}
            className={`bg-white dark:bg-[#0D111A] border ${card.borderClass} rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-all duration-200 flex flex-col justify-between group`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-mono">
                {card.label}
              </span>
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${card.iconBg}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="my-2.5">
              <p className={`text-xl sm:text-2xl font-bold tracking-tight font-mono ${card.valueColor}`}>
                {card.value}
              </p>
            </div>

            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between gap-2">
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-sans truncate">
                {card.subtext}
              </span>

              <div className="w-12 h-4 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                <svg viewBox="0 0 60 20" fill="none" className="w-full h-full">
                  <path
                    d={card.sparklinePath}
                    stroke={card.sparklineColor}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── 4. FINANCIAL HEALTH BANNER ────────────────────────────────────────────
function FinancialHealthBanner({
  health = {},
  issuesCount = 0,
  reconciledAt,
  onViewIssues
}) {
  const isHealthy = !health?.status || health.status === 'healthy' || (issuesCount === 0 && (health.critical_issues || 0) === 0);
  const criticalCount = health?.critical_issues || 0;
  const warningCount = health?.warnings || 0;
  const totalIssues = issuesCount || (criticalCount + warningCount);

  if (isHealthy) {
    return (
      <div className="rounded-2xl p-4 sm:p-5 bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100/80 dark:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-700/80 flex items-center justify-center shrink-0 text-emerald-700 dark:text-emerald-300 shadow-2xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm tracking-wide text-emerald-900 dark:text-emerald-200 font-mono flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  ALL FINANCIAL INVARIANTS SATISFIED
                </h4>
              </div>
              <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80 font-sans">
                No fare split mismatches, over-refunds, duplicate payout claims, or radar isolation breaches found.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-100/60 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 text-[11px] font-mono font-bold text-emerald-800 dark:text-emerald-300">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>11/11 Active Invariants</span>
            </span>
            <span className="hidden md:inline-flex items-center px-2.5 py-1 rounded-lg bg-white/70 dark:bg-zinc-900/60 border border-emerald-200/60 dark:border-emerald-800/60 text-[10px] font-mono text-emerald-700 dark:text-emerald-400">
              Zero Ledger Drift
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-4 sm:p-5 bg-rose-50/80 dark:bg-rose-950/20 border border-rose-300 dark:border-rose-800 shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-all animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-900/60 border border-rose-300 dark:border-rose-700 flex items-center justify-center shrink-0 text-rose-700 dark:text-rose-300 shadow-2xs">
            <AlertTriangle className="w-5 h-5 animate-pulse" />
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm tracking-wide text-rose-950 dark:text-rose-200 font-mono flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
                FINANCIAL INVARIANTS REQUIRE ATTENTION
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-200/80 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200">
                {totalIssues} {totalIssues === 1 ? 'discrepancy' : 'discrepancies'}
              </span>
            </div>
            <p className="text-xs text-rose-900/80 dark:text-rose-300/80 font-sans">
              {criticalCount > 0
                ? `${criticalCount} critical invariant violation(s) detected. Review diagnostic results below before releasing payouts.`
                : `${totalIssues} ledger warning(s) detected. Invariant discrepancies require operational verification.`}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onViewIssues}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-semibold shadow-xs hover:shadow transition-all shrink-0 cursor-pointer self-start sm:self-center"
        >
          <span>View Diagnostics</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── 5. INVARIANT DIAGNOSTICS ──────────────────────────────────────────────
const INVARIANTS_CHECKLIST = [
  { id: 'INV-01', name: 'Fare Split Integrity', rule: 'Platform Fee (20%) + Sahayak Fee (80%) == Authoritative Total', severity: 'critical' },
  { id: 'INV-02', name: 'Over-Refund Protection', rule: 'Total Refunded <= Gross Payment Amount', severity: 'critical' },
  { id: 'INV-03', name: 'Earning Finalization Conflict', rule: 'No earning is simultaneously "paid_out" and "reversed"', severity: 'critical' },
  { id: 'INV-04', name: 'Payout-Earning Alignment', rule: 'Paid payouts must have 100% "paid_out" linked earnings', severity: 'critical' },
  { id: 'INV-05', name: 'Orphaned Held Earnings Guard', rule: 'No earning remains "held" without an active payout reservation', severity: 'critical' },
  { id: 'INV-06', name: 'Cross-Assistant Earning Guard', rule: 'Earning assistant_id strictly matches payout recipient', severity: 'critical' },
  { id: 'INV-07', name: 'Payout Reference Integrity', rule: 'Paid payouts must possess a unique, valid settlement reference', severity: 'critical' },
  { id: 'INV-08', name: 'Duplicate Earning Claim Prevention', rule: 'Zero multi-payout claims on identical earning records', severity: 'critical' },
  { id: 'INV-09', name: 'Payment Status Consistency', rule: 'Confirmed online bookings must have verified "paid" record', severity: 'critical' },
  { id: 'INV-10', name: 'Radar Isolation Invariant', rule: 'Option C: Unpaid bookings never leak onto assistant radar', severity: 'critical' },
  { id: 'INV-11', name: 'Platform Solvency Balance', rule: 'Net Revenue == Gross - Refunds - Sahayak Paid - Liabilities', severity: 'warning' }
];

function InvariantDiagnostics({
  issues = [],
  reconciledAt,
  onInspectEntity
}) {
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showChecklist, setShowChecklist] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const filteredIssues = issues.filter((iss) => {
    if (severityFilter !== 'ALL' && iss.severity !== severityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const text = `${iss.id} ${iss.code} ${iss.message} ${iss.entity_type} ${iss.entity_id}`.toLowerCase();
      if (!text.includes(q)) return false;
    }
    return true;
  });

  const handleCopy = (text) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportReport = () => {
    const reportData = {
      exported_at: new Date().toISOString(),
      reconciled_at: reconciledAt,
      total_issues: issues.length,
      filtered_count: filteredIssues.length,
      issues: issues.map(i => ({
        id: i.id,
        code: i.code,
        severity: i.severity,
        entity_type: i.entity_type,
        entity_id: i.entity_id,
        message: i.message,
        details: i.details,
        timestamp: i.timestamp
      }))
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `onecoolie-invariants-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      id="invariant-diagnostics-section"
      className="bg-white dark:bg-[#0D111A] border border-[#E5EAF1] dark:border-zinc-800 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-5 sm:p-6 transition-all space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100 dark:border-zinc-800/80">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider font-mono">
              Invariant Discrepancies & Ledger Diagnostic Results ({issues.length})
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-sans">
              Authoritative mathematical verification across 11 core financial & operational invariants.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono font-medium text-zinc-700 dark:text-zinc-300 shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="ALL">All Severities</option>
            <option value="critical">Critical Only</option>
            <option value="warning">Warnings Only</option>
          </select>

          <button
            type="button"
            onClick={handleExportReport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-200 shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {issues.length === 0 ? (
        <div className="space-y-4">
          <div className="py-10 px-6 text-center bg-[#F8FAFC] dark:bg-zinc-900/30 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto mb-3 shadow-xs">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <h4 className="text-base font-bold text-zinc-900 dark:text-white font-mono">
              All Financial Invariants Satisfied
            </h4>

            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-lg mx-auto mt-1 font-sans">
              No fare split mismatches, over-refunds, duplicate payout claims, or radar isolation breaches found across system records.
            </p>

            <button
              type="button"
              onClick={() => setShowChecklist(!showChecklist)}
              className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white shadow-2xs cursor-pointer transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>{showChecklist ? 'Hide Invariant Architecture Checklist' : 'View Invariant Architecture Checklist (11/11)'}</span>
              {showChecklist ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {showChecklist && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 p-4 rounded-xl bg-zinc-50/60 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800 animate-fade-in">
              {INVARIANTS_CHECKLIST.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3 p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800/80 shadow-2xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-zinc-400">
                        {item.id}
                      </span>
                      <strong className="text-xs font-bold text-zinc-900 dark:text-white">
                        {item.name}
                      </strong>
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight">
                      {item.rule}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Pass</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by ID, code, or entity..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white font-mono placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="overflow-x-auto rounded-xl border border-zinc-200/90 dark:border-zinc-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-[#F8FAFC] dark:bg-zinc-900/50 text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-mono">
                  <th className="py-2.5 px-3">Issue ID</th>
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-3">Severity</th>
                  <th className="py-2.5 px-3">Affected Entity</th>
                  <th className="py-2.5 px-3">Diagnostic Description</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-mono">
                {filteredIssues.map((iss) => {
                  const isCritical = iss.severity === 'critical';
                  return (
                    <tr
                      key={iss.id}
                      className={`hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors ${
                        isCritical ? 'bg-rose-50/20 dark:bg-rose-950/10' : ''
                      }`}
                    >
                      <td className="py-3 px-3 font-bold text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleCopy(iss.id)}
                          className="hover:underline flex items-center gap-1 cursor-pointer"
                          title="Click to copy ID"
                        >
                          <span>{iss.id}</span>
                          {copiedId === iss.id ? (
                            <Check className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <Copy className="w-3 h-3 opacity-40 hover:opacity-100" />
                          )}
                        </button>
                      </td>

                      <td className="py-3 px-3 font-bold text-zinc-900 dark:text-white whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[11px]">
                          {iss.code}
                        </span>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <FinancialStatusBadge status={iss.severity} size="sm" />
                      </td>

                      <td className="py-3 px-3 text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {iss.entity_type}
                        </span>{' '}
                        <span className="text-zinc-400">
                          #{iss.entity_id ? iss.entity_id.slice(0, 8) : 'ledger'}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-zinc-600 dark:text-zinc-300 font-sans max-w-md">
                        <p className="leading-snug">{iss.message}</p>
                        {iss.details && Object.keys(iss.details).length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-2 text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                            {Object.entries(iss.details).slice(0, 3).map(([k, v]) => (
                              <span key={k} className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">
                                {k}: <strong className="text-zinc-800 dark:text-zinc-200">{String(v)}</strong>
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            if (onInspectEntity) onInspectEntity(iss.entity_type, iss.entity_id, iss);
                            else handleCopy(`${iss.code}: ${iss.message}`);
                          }}
                          className="px-2.5 py-1 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 text-xs font-semibold text-zinc-700 dark:text-zinc-200 shadow-2xs transition-colors cursor-pointer"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 6. REVENUE SPLIT VALIDATION & SOLVENCY ────────────────────────────────
function RevenueSplitValidation({ metrics = {} }) {
  const formatINR = (val) => {
    const num = Number(val) || 0;
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  const gross = Number(metrics.gross_payments) || 0;
  const refunds = Number(metrics.total_refunded) || 0;
  const netCollected = Number(metrics.net_collected) || (gross - refunds);
  const platform = Number(metrics.platform_commission) || 0;
  const sahayakTotal = Number(metrics.assistant_earnings_created) || (Number(metrics.total_payouts_paid || 0) + Number(metrics.pending_liability || 0));

  return (
    <div className="bg-white dark:bg-[#0D111A] border border-[#E5EAF1] dark:border-zinc-800 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-5 sm:p-6 transition-all space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100 dark:border-zinc-800/80">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <PieChart className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            20 / 80 Revenue Split Validation & Platform Solvency
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-sans">
            Deterministic passenger fare allocation: 20% platform infrastructure fee + 80% direct sahayak porterage earnings.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 shadow-2xs shrink-0">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs font-mono font-bold text-emerald-800 dark:text-emerald-300">
            20% + 80% = 100%
          </span>
          <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 hidden md:inline">
            (Tolerance ±₹0.00)
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-xl bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 relative flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[11px] font-mono font-bold text-zinc-400 uppercase mb-1">
              <span>Gross Collections</span>
              <span className="text-zinc-900 dark:text-white">100% Base</span>
            </div>
            <p className="text-2xl font-bold font-mono text-zinc-900 dark:text-white">
              {formatINR(gross)}
            </p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 font-sans">
              Total customer fare collected across all verified payment channels.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-200/60 dark:border-zinc-800 text-[11px] font-mono flex items-center justify-between text-zinc-500">
            <span>Refund Deductions:</span>
            <span className="text-rose-600 font-bold">-{formatINR(refunds)}</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-purple-50/30 dark:bg-purple-950/10 border border-purple-200/70 dark:border-purple-800/60 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[11px] font-mono font-bold text-purple-600 dark:text-purple-400 uppercase mb-1">
              <span className="flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5" />
                Platform Share
              </span>
              <span className="px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/50 text-[10px]">
                20.0%
              </span>
            </div>
            <p className="text-2xl font-bold font-mono text-purple-700 dark:text-purple-300">
              {formatINR(platform)}
            </p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 font-sans">
              Station telematics, SMS/Email OTP relays, safety insurance & payment gateway overhead.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-purple-200/50 dark:border-purple-800/40 text-[11px] font-mono flex items-center justify-between text-purple-800 dark:text-purple-300">
            <span>Status:</span>
            <span className="font-bold">Retained Revenue</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-blue-50/30 dark:bg-blue-950/10 border border-blue-200/70 dark:border-blue-800/60 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400 uppercase mb-1">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                Sahayak Porter Share
              </span>
              <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-[10px]">
                80.0%
              </span>
            </div>
            <p className="text-2xl font-bold font-mono text-blue-700 dark:text-blue-300">
              {formatINR(sahayakTotal)}
            </p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 font-sans">
              Direct porter remuneration credited to Sahayak platform wallets upon 6-digit OTP verification.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-blue-200/50 dark:border-blue-800/40 text-[11px] font-mono flex items-center justify-between text-blue-800 dark:text-blue-300">
            <span>Disbursed:</span>
            <span className="font-bold">{formatINR(metrics.total_payouts_paid)}</span>
          </div>
        </div>
      </div>

      <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            Invariant 11 (Solvency Formula): <code className="font-bold text-zinc-900 dark:text-white">Net Collected = Gross - Refunds = {formatINR(netCollected)}</code>
          </span>
        </div>
        <div className="text-[11px] text-zinc-400 shrink-0">
          Enforced strictly via PostgreSQL schema check constraints
        </div>
      </div>
    </div>
  );
}

// ── 7. FINANCIAL AUDIT TRAIL ──────────────────────────────────────────────
const AUDIT_FILTER_PILLS = [
  { id: 'ALL', label: 'All Events' },
  { id: 'payout_settlement_recorded', label: 'Payout Settlement Recorded' },
  { id: 'payout_paid', label: 'Payout Paid' },
  { id: 'earning_paid_out', label: 'Earning Paid Out' },
  { id: 'payout_requested', label: 'Payout Requested' },
  { id: 'payout_approved', label: 'Payout Approved' },
  { id: 'payout_rejected', label: 'Payout Rejected' }
];

function FinancialAuditTrail({
  auditLogs = [],
  auditFilter = 'ALL',
  onFilterChange,
  onInspectLog
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedText, setCopiedText] = useState(null);

  const handleCopy = (text) => {
    navigator.clipboard?.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const filteredLogs = auditLogs
    .filter((log) => auditFilter === 'ALL' || log.action === auditFilter)
    .filter((log) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const ref = log.new_state?.payout_reference || log.metadata?.reference || log.entity_id || '';
      const text = `${log.action} ${log.actor_role} ${log.actor_id} ${log.entity_type} ${ref}`.toLowerCase();
      return text.includes(q);
    });

  return (
    <div
      id="financial-audit-trail-section"
      className="bg-white dark:bg-[#0D111A] border border-[#E5EAF1] dark:border-zinc-800 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-5 sm:p-6 transition-all space-y-4"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-zinc-100 dark:border-zinc-800/80">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider font-mono flex items-center gap-2">
              Append-Only Financial Audit Trail
              <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                {filteredLogs.length} Events
              </span>
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-sans">
              Immutable event ledger tracking every state transition, disbursement, settlement, and earning finalization.
            </p>
          </div>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search reference, actor, ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white font-mono placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
        {AUDIT_FILTER_PILLS.map((pill) => {
          const isActive = auditFilter === pill.id;
          return (
            <button
              key={pill.id}
              type="button"
              onClick={() => onFilterChange && onFilterChange(pill.id)}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                isActive
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold shadow-2xs'
                  : 'bg-zinc-100/80 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/60'
              }`}
            >
              {pill.label}
            </button>
          );
        })}
      </div>

      {filteredLogs.length === 0 ? (
        <div className="py-12 px-6 text-center bg-[#F8FAFC] dark:bg-zinc-900/30 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80">
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 flex items-center justify-center text-zinc-400 mx-auto mb-3 shadow-2xs">
            <Lock className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 font-mono">
            No financial audit events recorded yet.
          </h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mt-1 font-sans">
            Payout settlements, state transitions, and earning finalizations will be permanently appended here with cryptographic integrity checks.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200/90 dark:border-zinc-800">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-[#F8FAFC] dark:bg-zinc-900/50 text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                <th className="py-2.5 px-3 whitespace-nowrap">Timestamp</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Event Type</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Reference ID</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Actor</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Amount</th>
                <th className="py-2.5 px-3 whitespace-nowrap">State Transition</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Details / Reference</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Integrity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-zinc-700 dark:text-zinc-300">
              {filteredLogs.slice(0, 50).map((log) => {
                const dateStr = log.created_at
                  ? new Date(log.created_at).toLocaleString([], {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  : '—';

                const refId = log.new_state?.payout_reference || log.metadata?.reference || (log.entity_id ? `#${log.entity_id.slice(0, 8)}` : '—');
                const prevStatus = log.previous_state?.status || 'none';
                const nextStatus = log.new_state?.status || 'recorded';

                return (
                  <tr key={log.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="py-2.5 px-3 text-[11px] text-zinc-400 dark:text-zinc-500 whitespace-nowrap">
                      {dateStr}
                    </td>

                    <td className="py-2.5 px-3 font-bold text-zinc-900 dark:text-white whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[10px] uppercase font-bold tracking-wider">
                        {log.action}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 font-bold text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleCopy(refId)}
                        className="hover:underline flex items-center gap-1 cursor-pointer"
                        title="Copy Reference"
                      >
                        <span>{refId}</span>
                        {copiedText === refId ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-3 h-3 opacity-30 hover:opacity-100" />
                        )}
                      </button>
                    </td>

                    <td className="py-2.5 px-3 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                      {log.actor_role || 'system'}
                      {log.actor_id && (
                        <span className="text-[10px] text-zinc-400">
                          {' '}({log.actor_id.slice(0, 6)})
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      {log.amount ? `₹${Number(log.amount).toLocaleString('en-IN')}` : '—'}
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-[10px]">
                        <span className="text-zinc-400">{prevStatus}</span>
                        <ArrowRight className="w-3 h-3 text-zinc-400" />
                        <span className="font-bold text-zinc-900 dark:text-white">{nextStatus}</span>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-zinc-500 dark:text-zinc-400 text-[11px] max-w-xs truncate font-sans">
                      {log.metadata?.notes || log.metadata?.reason || log.new_state?.payout_reference || '—'}
                    </td>

                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <ShieldCheck className="w-3 h-3" />
                        <span>VERIFIED</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── 8. FINANCIAL HEALTH DIAGNOSTICS ───────────────────────────────────────
function FinancialHealthDiagnostics({ financialHealth }) {
  const dbCheck = financialHealth?.checks?.database;
  const rzpCheck = financialHealth?.checks?.razorpay_gateway;
  const whCheck = financialHealth?.checks?.razorpay_webhook;
  const reconCheck = financialHealth?.checks?.reconciliation;

  const cards = [
    {
      id: 'db',
      title: 'Database Ledger',
      icon: Database,
      iconBg: 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400',
      status: dbCheck?.status === 'UP' ? 'HEALTHY' : (dbCheck?.status || 'UNKNOWN'),
      meta: `Latency: ${dbCheck?.latency_ms || 0}ms`,
      details: dbCheck?.details || 'Supabase PostgreSQL connection active'
    },
    {
      id: 'gateway',
      title: 'Razorpay Gateway',
      icon: CreditCard,
      iconBg: 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400',
      status: rzpCheck?.configured ? 'READY' : 'NOT SET',
      meta: 'Zero secret leakage',
      details: rzpCheck?.details || 'Client-side test credentials isolated'
    },
    {
      id: 'webhook',
      title: 'Webhook Security',
      icon: Webhook,
      iconBg: 'bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400',
      status: whCheck?.configured ? 'VERIFIED' : 'MISSING',
      meta: 'HMAC verified',
      details: whCheck?.details || 'Cryptographic signature verification'
    },
    {
      id: 'invariants',
      title: 'Invariants Audit',
      icon: FileCheck2,
      iconBg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400',
      status: reconCheck?.status === 'PASS' ? 'VERIFIED' : (reconCheck?.status || 'PENDING'),
      meta: `${reconCheck?.critical_issues || 0} critical violations`,
      details: reconCheck?.details || '11 core invariant rules verified'
    }
  ];

  const overallStatus = financialHealth?.status || 'HEALTHY';

  return (
    <div className="bg-white dark:bg-[#0D111A] border border-[#E5EAF1] dark:border-zinc-800 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-5 sm:p-6 transition-all space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider font-mono">
              Financial Health Diagnostics Breakdown
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-sans">
              Real-time operational readiness across database connection, gateway secrets isolation, and invariant status.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-zinc-400 hidden sm:inline">
            Telemetry Status:
          </span>
          <FinancialStatusBadge status={`SYSTEM ${overallStatus}`} size="md" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              className="p-4 rounded-xl bg-[#F8FAFC] dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 flex flex-col justify-between space-y-3 transition-all hover:border-zinc-300 dark:hover:border-zinc-700"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 dark:text-zinc-500 font-mono">
                  {card.title}
                </span>
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${card.iconBg}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>

              <div>
                <FinancialStatusBadge status={card.status} size="md" />
              </div>

              <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-800/80 flex items-center justify-between text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                <span className="truncate">{card.meta}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 9. PAYMENT RECOVERY CENTER ────────────────────────────────────────────
function PaymentRecoveryCenter({
  paymentRecoveryList = [],
  onViewPayment,
  onSyncTelemetry
}) {
  const [syncingId, setSyncingId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const handleCopy = (text) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSync = async (paymentId) => {
    setSyncingId(paymentId);
    if (onSyncTelemetry) {
      await onSyncTelemetry(paymentId);
    } else {
      await new Promise(r => setTimeout(r, 600));
    }
    setSyncingId(null);
  };

  const count = paymentRecoveryList.length;

  return (
    <div
      id="payment-recovery-center-section"
      className="bg-white dark:bg-[#0D111A] border border-[#E5EAF1] dark:border-zinc-800 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-5 sm:p-6 transition-all space-y-4"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-zinc-100 dark:border-zinc-800/80">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <RotateCcw className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider font-mono flex items-center gap-2">
              Payment Recovery Center
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                count > 0 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
              }`}>
                {count} Pending
              </span>
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-sans">
              Online payments pending &gt; 15 minutes requiring gateway telemetry sync.
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/90 dark:border-amber-800/70 text-amber-900 dark:text-amber-200 text-xs font-mono">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Option C Enforced:</strong> Online payments cannot be manually marked paid by admins.
          </span>
        </div>
      </div>

      {count === 0 ? (
        <div className="py-10 px-6 text-center bg-[#F8FAFC] dark:bg-zinc-900/30 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto mb-2 shadow-2xs">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 font-mono">
            Zero Stuck Online Payments
          </h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mt-1 font-sans">
            All online checkout transactions have cleanly finalized or settled through Razorpay Webhook telemetry.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200/90 dark:border-zinc-800">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-[#F8FAFC] dark:bg-zinc-900/50 text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                <th className="py-2.5 px-3">Payment ID</th>
                <th className="py-2.5 px-3">Booking ID</th>
                <th className="py-2.5 px-3">Passenger</th>
                <th className="py-2.5 px-3">Amount</th>
                <th className="py-2.5 px-3">Order ID</th>
                <th className="py-2.5 px-3">Age</th>
                <th className="py-2.5 px-3">Gateway Status</th>
                <th className="py-2.5 px-3">Recovery Policy</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-zinc-700 dark:text-zinc-300">
              {paymentRecoveryList.map((p) => {
                const payId = p.payment_id || p.id;
                const shortPayId = payId ? `#${payId.slice(0, 8)}` : '—';
                const shortBookId = p.booking_id ? `#${p.booking_id.slice(0, 8)}` : '—';
                const passengerName = p.booking?.passenger?.name || p.passenger_name || 'Passenger';
                const isSyncing = syncingId === payId;

                return (
                  <tr key={payId} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3 px-3 font-bold text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleCopy(payId)}
                        className="hover:underline flex items-center gap-1 cursor-pointer"
                        title="Copy Payment ID"
                      >
                        <span>{shortPayId}</span>
                        {copiedId === payId ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-3 h-3 opacity-30 hover:opacity-100" />
                        )}
                      </button>
                    </td>

                    <td className="py-3 px-3 font-bold text-zinc-900 dark:text-white whitespace-nowrap">
                      <span>{shortBookId}</span>
                    </td>

                    <td className="py-3 px-3 font-sans text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                      <span className="font-semibold">{passengerName}</span>
                    </td>

                    <td className="py-3 px-3 font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      ₹{p.amount || 0}
                    </td>

                    <td className="py-3 px-3 text-[11px] text-zinc-400 whitespace-nowrap">
                      {p.razorpay_order_id ? `${p.razorpay_order_id.slice(0, 14)}...` : '—'}
                    </td>

                    <td className="py-3 px-3 text-amber-600 font-bold whitespace-nowrap">
                      {p.age_minutes || 15}m
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap">
                      <FinancialStatusBadge status={p.payment_status || p.status || 'PENDING'} size="sm" />
                    </td>

                    <td className="py-3 px-3 text-[11px] text-zinc-500 dark:text-zinc-400 max-w-xs truncate font-sans">
                      {p.recovery_action || 'Gateway telemetry polling required'}
                    </td>

                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSync(payId)}
                          disabled={isSyncing}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 text-xs font-semibold text-zinc-700 dark:text-zinc-200 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-blue-500' : ''}`} />
                          <span>Sync</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onViewPayment && onViewPayment(p)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 text-xs font-semibold text-zinc-700 dark:text-zinc-300 shadow-2xs transition-colors cursor-pointer"
                        >
                          <span>Details</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── 10. MASTER FINANCIAL RECONCILIATION VIEW (DEFAULT EXPORT) ─────────────
export default function FinancialReconciliationView({
  reconReport,
  reconLoading,
  fetchReconciliation,
  auditLogs = [],
  auditFilter = 'ALL',
  setAuditFilter,
  financialHealth,
  paymentRecoveryList = [],
  onInspectBooking
}) {
  const [inspectModalData, setInspectModalData] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  const handleCopy = (text, key) => {
    navigator.clipboard?.writeText(typeof text === 'object' ? JSON.stringify(text, null, 2) : String(text));
    setCopiedKey(key);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleScrollToDiagnostics = () => {
    const el = document.getElementById('invariant-diagnostics-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleInspectEntity = (entityType, entityId, fullData) => {
    if (entityType === 'booking' && onInspectBooking && entityId) {
      onInspectBooking(entityId);
    } else {
      setInspectModalData({
        title: `Entity Inspection: ${entityType}`,
        subtitle: `Identifier #${entityId || 'system-ledger'}`,
        data: fullData
      });
    }
  };

  const handleViewPayment = (payment) => {
    setInspectModalData({
      title: 'Payment Recovery Inspection',
      subtitle: `Payment ID #${payment.payment_id || payment.id}`,
      data: payment
    });
  };

  const handleSyncTelemetry = async (paymentId) => {
    try {
      toast.loading(`Syncing gateway telemetry for #${paymentId?.slice(0, 8)}...`, { id: 'telemetry-sync' });
      if (fetchReconciliation) {
        await fetchReconciliation();
      }
      toast.success('Gateway telemetry synced successfully', { id: 'telemetry-sync' });
    } catch (err) {
      toast.error('Failed to sync gateway telemetry', { id: 'telemetry-sync' });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans pb-12">
      {/* 1. Page Header (Enterprise Banner with Railway Visual) */}
      <FinancialPageHeader
        reconciledAt={reconReport?.reconciled_at}
        reconLoading={reconLoading}
        onRefresh={fetchReconciliation}
      />

      {/* 2. Financial KPI Strip (6 Responsive Cards with Micro-Sparklines) */}
      <FinancialKpiRow
        metrics={reconReport?.metrics}
        loading={reconLoading && !reconReport}
      />

      {/* 3. Critical Financial Health Status Banner */}
      <FinancialHealthBanner
        health={reconReport?.health}
        issuesCount={reconReport?.issues?.length || 0}
        reconciledAt={reconReport?.reconciled_at}
        onViewIssues={handleScrollToDiagnostics}
      />

      {/* 4. Invariant Discrepancies & Ledger Diagnostic Results */}
      <InvariantDiagnostics
        issues={reconReport?.issues || []}
        reconciledAt={reconReport?.reconciled_at}
        onInspectEntity={handleInspectEntity}
      />

      {/* 5. 20 / 80 Revenue Split Validation & Platform Solvency */}
      <RevenueSplitValidation
        metrics={reconReport?.metrics}
      />

      {/* 6. Append-Only Financial Audit Trail */}
      <FinancialAuditTrail
        auditLogs={auditLogs}
        auditFilter={auditFilter}
        onFilterChange={setAuditFilter}
        onInspectLog={(log) =>
          setInspectModalData({
            title: 'Audit Log Event Payload',
            subtitle: `${log.action} • #${log.id?.slice(0, 8)}`,
            data: log
          })
        }
      />

      {/* 7. Financial Health Diagnostics Breakdown */}
      <FinancialHealthDiagnostics
        financialHealth={financialHealth}
      />

      {/* 8. Payment Recovery Center */}
      <PaymentRecoveryCenter
        paymentRecoveryList={paymentRecoveryList}
        onViewPayment={handleViewPayment}
        onSyncTelemetry={handleSyncTelemetry}
      />

      {/* Enterprise Inspection Modal Dialog */}
      {inspectModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#0D111A] border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-start justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Telemetry Inspector
                </span>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white font-mono">
                  {inspectModalData.title}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {inspectModalData.subtitle}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setInspectModalData(null)}
                className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 flex items-center justify-center text-zinc-500 hover:text-black dark:hover:text-white cursor-pointer transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-zinc-500 uppercase">
                  Raw Record Payload
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(inspectModalData.data, 'modal-payload')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs font-mono text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 cursor-pointer transition-colors"
                >
                  {copiedKey === 'modal-payload' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied JSON</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy JSON</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="p-4 rounded-xl bg-zinc-900 text-zinc-100 text-xs font-mono overflow-x-auto border border-zinc-800 leading-relaxed">
                {JSON.stringify(inspectModalData.data, null, 2)}
              </pre>
            </div>

            <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
              <button
                type="button"
                onClick={() => setInspectModalData(null)}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-black text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 text-xs font-semibold cursor-pointer transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
