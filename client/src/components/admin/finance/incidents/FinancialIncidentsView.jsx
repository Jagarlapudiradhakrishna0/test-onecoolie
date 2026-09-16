import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert,
  RefreshCw,
  Radio,
  Activity,
  FolderOpen,
  Search,
  AlertTriangle,
  Bell,
  TrendingUp,
  Minus,
  CheckCircle2,
  ShieldCheck,
  Check,
  Eye,
  ExternalLink,
  ChevronRight,
  Calendar,
  Filter,
  ChevronDown,
  ChevronUp,
  TrendingDown,
  CreditCard,
  RotateCcw,
  Wallet,
  Database,
  HelpCircle,
  PieChart,
  Clock,
  Cpu,
  Info,
  X,
  Ticket,
  FileCode,
  Copy,
  User,
  ArrowRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import toast from 'react-hot-toast';
import trainHeaderGraphic from '../../../../assets/images/vande_bharat_header_clean.jpg';

/* ==========================================================================
   ONECOOLIE FINANCIAL INCIDENTS & FRAUD SURVEILLANCE (CONSOLIDATED)
   Real-time anomaly detection, fraud analysis, and incident resolution
   ========================================================================== */

// ── 1. INCIDENT STATUS & SEVERITY BADGE ───────────────────────────────────
function IncidentStatusBadge({ value, type = 'status', className = '', showDot = true }) {
  const normalized = (value || '').toLowerCase().trim();

  if (type === 'severity') {
    switch (normalized) {
      case 'critical':
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase tracking-wider bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-900/60 shadow-2xs ${className}`}
          >
            {showDot && <span className="w-1.5 h-1.5 rounded-full bg-rose-600 dark:bg-rose-400 shrink-0" />}
            <span>Critical</span>
          </span>
        );
      case 'warning':
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase tracking-wider bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-900/60 shadow-2xs ${className}`}
          >
            {showDot && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400 shrink-0" />}
            <span>Warning</span>
          </span>
        );
      case 'info':
      default:
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase tracking-wider bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-900/60 shadow-2xs ${className}`}
          >
            {showDot && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400 shrink-0" />}
            <span>{normalized || 'Info'}</span>
          </span>
        );
    }
  }

  // Type === 'status'
  switch (normalized) {
    case 'open':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold font-mono uppercase tracking-wider bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-900/60 shadow-2xs ${className}`}
        >
          {showDot && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 animate-pulse" />}
          <span>Open</span>
        </span>
      );
    case 'investigating':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold font-mono uppercase tracking-wider bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-900/60 shadow-2xs ${className}`}
        >
          {showDot && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 shrink-0" />}
          <span>Investigating</span>
        </span>
      );
    case 'resolved':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold font-mono uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-900/60 shadow-2xs ${className}`}
        >
          {showDot && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 shrink-0" />}
          <span>Resolved</span>
        </span>
      );
    case 'ignored':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold font-mono uppercase tracking-wider bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200/80 dark:border-zinc-700 shadow-2xs ${className}`}
        >
          {showDot && <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-zinc-500 shrink-0" />}
          <span>{normalized || 'Ignored'}</span>
        </span>
      );
  }
}

// ── 2. PAGE HEADER ────────────────────────────────────────────────────────
function FinancialIncidentsHeader({
  onRefresh,
  loading = false,
  lastSynced,
  isSurveillanceActive = true
}) {
  const formattedSyncTime = lastSynced
    ? new Date(lastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;

  return (
    <header className="relative overflow-hidden rounded-2xl bg-white dark:bg-[#0c1017] border border-[#E4E8EF] dark:border-zinc-800 shadow-[0_1px_4px_rgba(0,0,0,0.03)] p-6 sm:p-7 transition-all">
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        <div className="absolute -right-10 -top-12 -bottom-12 w-1/2 max-w-xl opacity-[0.14] dark:opacity-[0.08] mix-blend-luminosity">
          <img
            src={trainHeaderGraphic}
            alt="OneCoolie Network Visual"
            className="w-full h-full object-cover object-left mask-[radial-gradient(ellipse_at_center,black_40%,transparent_80%)]"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        </div>
        <div className="absolute inset-0 bg-linear-to-r from-white via-white/95 to-transparent dark:from-[#0c1017] dark:via-[#0c1017]/90 dark:to-transparent" />
      </div>

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="flex items-start gap-4 max-w-3xl">
          <div className="w-11 h-11 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 flex items-center justify-center shrink-0 shadow-2xs text-rose-600 dark:text-rose-400">
            <ShieldAlert className="w-5 h-5" />
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10.5px] font-bold tracking-widest text-rose-600 dark:text-rose-400 uppercase font-mono">
                Finance Operations
              </span>
              <span className="text-zinc-300 dark:text-zinc-700">•</span>
              <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                Railway Integrity Grid
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Financial Incidents, Fraud Detection &amp; Operations
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 leading-relaxed max-w-2xl font-sans">
              Automated surveillance engine detecting rapid payment failures, refund spikes, payout anomalies, and ledger corruption.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/50 shadow-2xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[11px] font-bold font-mono tracking-wider text-emerald-700 dark:text-emerald-300">
              SURVEILLANCE ACTIVE
            </span>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="group relative inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 border border-[#E4E8EF] dark:border-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-semibold shadow-2xs hover:shadow-xs transition-all duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-slate-500 dark:text-zinc-400 transition-transform duration-500 ${
                loading ? 'animate-spin text-blue-600' : 'group-hover:rotate-180'
              }`}
            />
            <span>Refresh Surveillance</span>
            {formattedSyncTime && (
              <span className="hidden md:inline text-[10px] text-slate-400 font-mono">
                ({formattedSyncTime})
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

// ── 3. KPI COMMAND STRIP & MINI SPARKLINES ────────────────────────────────
function Sparkline({ color = '#2563EB', isFlat = true, id = 'sparkline' }) {
  const pathData = isFlat
    ? 'M0,18 C15,18 25,18 40,18 C55,18 65,18 80,18'
    : 'M0,22 C12,20 20,24 32,15 C44,7 52,18 64,12 C72,8 76,4 80,6';

  return (
    <svg className="w-18 h-7 shrink-0 overflow-visible" viewBox="0 0 80 28" fill="none">
      <defs>
        <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path
        d={`${pathData} L80,28 L0,28 Z`}
        fill={`url(#spark-${id})`}
      />
      <path
        d={pathData}
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="80"
        cy={isFlat ? 18 : 6}
        r="2.5"
        fill={color}
        className="transition-all duration-300"
      />
    </svg>
  );
}

function IncidentKpiRow({
  stats = { total: 0, open: 0, investigating: 0, critical: 0, warning: 0 },
  activeFilter = 'ALL',
  onSelectFilter
}) {
  const cards = [
    {
      id: 'total',
      filterKey: 'ALL',
      label: 'TOTAL INCIDENTS',
      value: stats.total ?? 0,
      description: 'Recorded events',
      icon: Activity,
      color: '#2563EB',
      accentClass: 'border-blue-500/80',
      iconBg: 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400',
      numColor: 'text-slate-900 dark:text-white',
    },
    {
      id: 'open',
      filterKey: 'open',
      label: 'OPEN CASES',
      value: stats.open ?? 0,
      description: 'Requires triage',
      icon: FolderOpen,
      color: '#D97706',
      accentClass: 'border-amber-500/80',
      iconBg: 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400',
      numColor: (stats.open ?? 0) > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white',
    },
    {
      id: 'investigating',
      filterKey: 'investigating',
      label: 'INVESTIGATING',
      value: stats.investigating ?? 0,
      description: 'Under admin review',
      icon: Search,
      color: '#0284C7',
      accentClass: 'border-sky-500/80',
      iconBg: 'bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400',
      numColor: (stats.investigating ?? 0) > 0 ? 'text-sky-600 dark:text-sky-400' : 'text-slate-900 dark:text-white',
    },
    {
      id: 'critical',
      filterKey: 'critical',
      label: 'CRITICAL PRIORITY',
      value: stats.critical ?? 0,
      description: 'High severity',
      icon: AlertTriangle,
      color: '#E11D48',
      accentClass: 'border-rose-500/80',
      iconBg: 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400',
      numColor: (stats.critical ?? 0) > 0 ? 'text-rose-600 dark:text-rose-400 font-extrabold' : 'text-slate-900 dark:text-white',
    },
    {
      id: 'warnings',
      filterKey: 'warning',
      label: 'WARNINGS',
      value: stats.warning ?? 0,
      description: 'Advisory alerts',
      icon: Bell,
      color: '#F59E0B',
      accentClass: 'border-amber-400/80',
      iconBg: 'bg-amber-50 dark:bg-amber-950/50 text-amber-500 dark:text-amber-400',
      numColor: (stats.warning ?? 0) > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white',
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
      {cards.map((card) => {
        const IconComponent = card.icon;
        const isSelected = activeFilter.toLowerCase() === card.filterKey.toLowerCase();
        const hasValue = Number(card.value) > 0;

        return (
          <div
            key={card.id}
            onClick={() => onSelectFilter && onSelectFilter(card.filterKey)}
            className={`group relative overflow-hidden rounded-2xl bg-white dark:bg-[#0c1017] border p-4 sm:p-4.5 transition-all duration-200 cursor-pointer select-none ${
              isSelected
                ? 'border-blue-600 dark:border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
                : 'border-[#E4E8EF] dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)]'
            }`}
          >
            <div
              className={`absolute top-0 left-0 right-0 h-0.75 transition-opacity duration-200 ${
                isSelected ? 'opacity-100' : 'opacity-40 group-hover:opacity-100'
              }`}
              style={{ backgroundColor: card.color }}
            />

            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[10px] font-bold font-mono tracking-wider text-slate-500 dark:text-zinc-400 uppercase truncate">
                {card.label}
              </span>
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${card.iconBg}`}
              >
                <IconComponent className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="flex items-baseline justify-between gap-2 mt-1">
              <p className={`text-2xl sm:text-3xl font-bold font-mono tracking-tight leading-none ${card.numColor}`}>
                {card.value}
              </p>
              <Sparkline
                color={card.color}
                isFlat={!hasValue}
                id={card.id}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400 mt-2 font-sans">
              <span>{card.description}</span>
              {hasValue ? (
                <span className="text-[10px] font-mono font-medium text-slate-400 flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" />
                  active
                </span>
              ) : (
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                  nominal
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── 4. INCIDENT TABLE & EMPTY STATE ───────────────────────────────────────
function IncidentEmptyState({ filterLabel = 'ALL' }) {
  const isFiltered = filterLabel && filterLabel.toUpperCase() !== 'ALL';

  return (
    <div className="relative overflow-hidden rounded-2xl bg-slate-50/70 dark:bg-[#0b0e14]/60 border border-dashed border-slate-200 dark:border-zinc-800 p-8 sm:p-12 text-center select-none transition-all">
      <div className="relative z-10 max-w-xl mx-auto flex flex-col items-center">
        <div className="relative mb-5">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
            <CheckCircle2 className="w-8 h-8 stroke-[2]" />
          </div>
          <div className="absolute -inset-1.5 rounded-3xl border border-emerald-500/20 pointer-events-none animate-pulse" />
        </div>

        <h3 className="text-base sm:text-lg font-bold font-mono tracking-tight text-slate-900 dark:text-white uppercase mb-2">
          {isFiltered
            ? `No Incidents Under Filter "${filterLabel.toUpperCase()}"`
            : 'No Financial Incidents Detected'}
        </h3>

        <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 max-w-md leading-relaxed font-sans mb-7">
          {isFiltered
            ? `Surveillance engine is active. No recorded incident matches the active filter criteria.`
            : 'Automated surveillance engine is active. Zero anomalies or fraud triggers found across all railway nodes.'}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60 shadow-2xs">
            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
            <span className="text-[11px] font-medium font-sans text-emerald-800 dark:text-emerald-300">
              Payments flowing normally
            </span>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60 shadow-2xs">
            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
            <span className="text-[11px] font-medium font-sans text-emerald-800 dark:text-emerald-300">
              No unusual refund activity
            </span>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60 shadow-2xs">
            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
            <span className="text-[11px] font-medium font-sans text-emerald-800 dark:text-emerald-300">
              Ledger integrity verified
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function IncidentTable({
  incidents = [],
  onSelectIncident,
  onInspectBooking
}) {
  const formatAmount = (inc) => {
    const raw = inc.metadata?.amount || inc.metadata?.refund_amount || inc.metadata?.payout_amount || inc.amount;
    if (raw !== undefined && raw !== null && raw !== '') {
      const num = Number(raw);
      if (!isNaN(num)) {
        return `₹${num.toLocaleString('en-IN')}`;
      }
    }
    return '—';
  };

  const formatDetectedTime = (dateStr) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return (
      <div className="flex flex-col">
        <span className="font-mono text-[11px] font-semibold text-slate-800 dark:text-zinc-200">
          {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
        <span className="font-mono text-[9.5px] text-slate-400 dark:text-zinc-500">
          {date.toLocaleDateString([], { month: 'short', day: 'numeric' })}
        </span>
      </div>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-slate-200/80 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900/40 text-[10px] font-bold font-mono uppercase tracking-wider text-slate-500 dark:text-zinc-400">
            <th className="py-3 px-3.5">Severity</th>
            <th className="py-3 px-3.5">Incident ID</th>
            <th className="py-3 px-3.5">Type</th>
            <th className="py-3 px-3.5">Affected Payment</th>
            <th className="py-3 px-3.5">Booking</th>
            <th className="py-3 px-3.5">Amount</th>
            <th className="py-3 px-3.5">Detected</th>
            <th className="py-3 px-3.5">Status</th>
            <th className="py-3 px-3.5">Owner</th>
            <th className="py-3 px-3.5 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60 font-sans">
          {incidents.map((inc) => {
            const shortId = `#INC-${inc.id?.slice(0, 6).toUpperCase()}`;
            const paymentId = inc.payment_id || inc.metadata?.payment_id;
            const bookingId = inc.booking_id || inc.metadata?.booking_id;
            const ownerName = inc.metadata?.assignee || (inc.resolved_by ? 'Resolved' : 'Finance Ops');

            return (
              <tr
                key={inc.id}
                onClick={() => onSelectIncident && onSelectIncident(inc)}
                className="group hover:bg-blue-50/30 dark:hover:bg-blue-950/15 transition-colors duration-150 cursor-pointer"
              >
                <td className="py-3 px-3.5 whitespace-nowrap">
                  <IncidentStatusBadge value={inc.severity} type="severity" />
                </td>

                <td className="py-3 px-3.5 font-mono font-bold text-blue-600 dark:text-blue-400 group-hover:underline whitespace-nowrap">
                  {shortId}
                </td>

                <td className="py-3 px-3.5 font-mono font-semibold text-slate-800 dark:text-zinc-200 text-[11px] whitespace-nowrap">
                  {inc.incident_type}
                </td>

                <td className="py-3 px-3.5 font-mono text-[11px] text-slate-600 dark:text-zinc-400 whitespace-nowrap">
                  {paymentId ? (
                    <span className="bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-[10px]">
                      #PAY-{String(paymentId).slice(0, 6).toUpperCase()}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>

                <td className="py-3 px-3.5 font-mono text-[11px] whitespace-nowrap">
                  {bookingId ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onInspectBooking) onInspectBooking(bookingId);
                        else if (onSelectIncident) onSelectIncident(inc);
                      }}
                      className="text-slate-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 underline underline-offset-2 cursor-pointer"
                    >
                      #BK-{String(bookingId).slice(0, 6).toUpperCase()}
                    </button>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>

                <td className="py-3 px-3.5 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                  {formatAmount(inc)}
                </td>

                <td className="py-3 px-3.5 whitespace-nowrap">
                  {formatDetectedTime(inc.detected_at)}
                </td>

                <td className="py-3 px-3.5 whitespace-nowrap">
                  <IncidentStatusBadge value={inc.status} type="status" />
                </td>

                <td className="py-3 px-3.5 text-slate-500 dark:text-zinc-400 text-[11px] whitespace-nowrap">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-zinc-600" />
                    <span>{ownerName}</span>
                  </span>
                </td>

                <td className="py-3 px-3.5 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onSelectIncident) onSelectIncident(inc);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 text-[11px] font-semibold text-slate-700 dark:text-zinc-200 shadow-2xs hover:shadow-xs transition-all cursor-pointer"
                  >
                    <span>View</span>
                    <ChevronRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── 5. INCIDENT COMMAND CENTER ────────────────────────────────────────────
function IncidentCommandCenter({
  incidents = [],
  filter = 'ALL',
  onFilterChange,
  dateRange = 'ALL',
  onDateRangeChange,
  onSelectIncident,
  onInspectBooking,
  onOpenAuditTrail
}) {
  const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);

  const filterChips = [
    { key: 'ALL', label: 'ALL' },
    { key: 'open', label: 'OPEN' },
    { key: 'investigating', label: 'INVESTIGATING' },
    { key: 'resolved', label: 'RESOLVED' },
    { key: 'ignored', label: 'IGNORED' },
    { key: 'critical', label: 'CRITICAL' },
    { key: 'warning', label: 'WARNING' }
  ];

  const dateOptions = [
    { key: 'ALL', label: 'All Time' },
    { key: 'today', label: 'Today (24h)' },
    { key: '7d', label: 'Last 7 Days' },
    { key: '30d', label: 'Last 30 Days' }
  ];

  const activeCriticalIncident = incidents.find(
    (inc) =>
      inc.severity?.toLowerCase() === 'critical' &&
      (inc.status?.toLowerCase() === 'open' || inc.status?.toLowerCase() === 'investigating')
  );

  const filteredIncidents = incidents.filter((inc) => {
    if (filter !== 'ALL') {
      const f = filter.toLowerCase();
      if (f === 'critical' || f === 'warning' || f === 'info') {
        if (inc.severity?.toLowerCase() !== f) return false;
      } else {
        if (inc.status?.toLowerCase() !== f) return false;
      }
    }

    if (dateRange !== 'ALL' && inc.detected_at) {
      const detectedDate = new Date(inc.detected_at).getTime();
      const now = Date.now();
      if (dateRange === 'today' && now - detectedDate > 24 * 60 * 60 * 1000) return false;
      if (dateRange === '7d' && now - detectedDate > 7 * 24 * 60 * 60 * 1000) return false;
      if (dateRange === '30d' && now - detectedDate > 30 * 24 * 60 * 60 * 1000) return false;
    }

    return true;
  });

  const selectedDateLabel =
    dateOptions.find((d) => d.key === dateRange)?.label || 'Select Date Range';

  return (
    <section className="relative rounded-2xl bg-white dark:bg-[#0c1017] border border-[#E4E8EF] dark:border-zinc-800 shadow-[0_1px_4px_rgba(0,0,0,0.03)] p-5 sm:p-6 space-y-5 transition-all">
      {activeCriticalIncident && (
        <div className="relative overflow-hidden rounded-xl bg-rose-50/90 dark:bg-rose-950/30 border border-rose-300/80 dark:border-rose-900/60 p-4 transition-all">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-rose-100 dark:bg-rose-900/60 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold font-mono tracking-wider bg-rose-600 text-white px-2 py-0.5 rounded uppercase">
                    CRITICAL FINANCIAL INCIDENT
                  </span>
                  <span className="text-xs font-semibold text-rose-800 dark:text-rose-300">
                    Immediate investigation required.
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-rose-900 dark:text-rose-200 font-mono mt-1">
                  <span>
                    <strong>ID:</strong> #INC-{activeCriticalIncident.id?.slice(0, 6).toUpperCase()}
                  </span>
                  <span>•</span>
                  <span>
                    <strong>Rule:</strong> {activeCriticalIncident.incident_type}
                  </span>
                  {activeCriticalIncident.booking_id && (
                    <>
                      <span>•</span>
                      <span>
                        <strong>Booking:</strong> #BK-{activeCriticalIncident.booking_id.slice(0, 6).toUpperCase()}
                      </span>
                    </>
                  )}
                  {activeCriticalIncident.metadata?.amount && (
                    <>
                      <span>•</span>
                      <span>
                        <strong>Amount:</strong> ₹{Number(activeCriticalIncident.metadata.amount).toLocaleString('en-IN')}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              {onOpenAuditTrail && (
                <button
                  type="button"
                  onClick={onOpenAuditTrail}
                  className="px-3 py-1.5 rounded-lg bg-white/80 dark:bg-zinc-900 hover:bg-white border border-rose-200 dark:border-rose-900/60 text-xs font-semibold text-rose-800 dark:text-rose-300 transition-colors cursor-pointer shadow-2xs"
                >
                  View Audit Trail
                </button>
              )}
              <button
                type="button"
                onClick={() => onSelectIncident && onSelectIncident(activeCriticalIncident)}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <span>Investigate Incident</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-zinc-800/80">
        <div>
          <h2 className="text-sm sm:text-base font-bold font-mono tracking-tight text-slate-900 dark:text-white uppercase flex items-center gap-2">
            <span>FINANCIAL INCIDENT COMMAND CENTER</span>
            <span className="text-xs font-mono font-normal text-slate-400 dark:text-zinc-500 lowercase">
              ({filteredIncidents.length} {filteredIncidents.length === 1 ? 'event' : 'events'})
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400 font-sans mt-0.5">
            Real-time surveillance across payments, refunds, payouts and ledger integrity.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100/80 dark:bg-zinc-900/80 rounded-xl border border-slate-200/80 dark:border-zinc-800">
            {filterChips.map((chip) => {
              const isSelected = filter.toLowerCase() === chip.key.toLowerCase();
              return (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => onFilterChange && onFilterChange(chip.key)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDateMenuOpen(!isDateMenuOpen)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-medium shadow-2xs cursor-pointer transition-colors"
            >
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-mono text-[11px]">{selectedDateLabel}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isDateMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setIsDateMenuOpen(false)}
                />
                <div className="absolute right-0 mt-1.5 w-40 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-lg py-1 z-30 font-sans text-xs">
                  {dateOptions.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => {
                        onDateRangeChange && onDateRangeChange(opt.key);
                        setIsDateMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs font-mono transition-colors cursor-pointer ${
                        dateRange === opt.key
                          ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-bold'
                          : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {filteredIncidents.length === 0 ? (
        <IncidentEmptyState filterLabel={filter} />
      ) : (
        <IncidentTable
          incidents={filteredIncidents}
          onSelectIncident={onSelectIncident}
          onInspectBooking={onInspectBooking}
        />
      )}
    </section>
  );
}

// ── 6. INCIDENT TRENDS CHART ──────────────────────────────────────────────
function CustomChartTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const value = payload[0].value;
    return (
      <div className="bg-slate-900 text-white p-2.5 rounded-xl shadow-xl border border-slate-700 text-xs font-mono space-y-1">
        <p className="text-[10px] text-slate-400 font-bold uppercase">{label}</p>
        <p className="text-sm font-bold text-blue-400">
          {value} {value === 1 ? 'incident' : 'incidents'}
        </p>
      </div>
    );
  }
  return null;
}

function IncidentTrends({ incidents = [] }) {
  const [range, setRange] = useState('7D');

  const chartData = useMemo(() => {
    const daysCount = range === '90D' ? 90 : range === '30D' ? 30 : 7;
    const dataMap = new Map();

    const now = new Date();
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
      dataMap.set(key, { date: key, incidents: 0 });
    }

    incidents.forEach((inc) => {
      if (!inc.detected_at) return;
      const d = new Date(inc.detected_at);
      const key = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
      if (dataMap.has(key)) {
        const item = dataMap.get(key);
        item.incidents += 1;
      }
    });

    return Array.from(dataMap.values());
  }, [incidents, range]);

  const totalRangeIncidents = useMemo(
    () => chartData.reduce((acc, curr) => acc + curr.incidents, 0),
    [chartData]
  );

  return (
    <div className="rounded-2xl bg-white dark:bg-[#0c1017] border border-[#E4E8EF] dark:border-zinc-800 shadow-[0_1px_4px_rgba(0,0,0,0.03)] p-5 sm:p-6 flex flex-col justify-between transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="text-sm font-bold font-mono tracking-tight text-slate-900 dark:text-white uppercase flex items-center gap-2">
            <span>INCIDENT TRENDS</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 font-sans mt-0.5">
            Financial incident volume over time.
          </p>
        </div>

        <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-zinc-900 rounded-lg border border-slate-200 dark:border-zinc-800 self-start sm:self-auto">
          {['7D', '30D', '90D'].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold font-mono transition-all duration-150 cursor-pointer ${
                range === r
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="relative w-full h-56">
        {totalRangeIncidents === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 bg-white/40 dark:bg-transparent backdrop-blur-[0.5px]">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100/90 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 text-[11px] font-mono text-slate-600 dark:text-zinc-400 shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>No incidents recorded during this period.</span>
            </div>
          </div>
        )}

        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -24, bottom: 0 }}>
            <defs>
              <linearGradient id="incidentTrendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563EB" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#2563EB" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="currentColor"
              className="text-slate-200 dark:text-zinc-800/80"
            />

            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fontFamily: 'monospace', fill: '#94A3B8' }}
              dy={8}
            />

            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fontFamily: 'monospace', fill: '#94A3B8' }}
              domain={[0, (dataMax) => Math.max(dataMax + 1, 4)]}
              allowDecimals={false}
            />

            <Tooltip content={<CustomChartTooltip />} />

            <Area
              type="monotone"
              dataKey="incidents"
              stroke="#2563EB"
              strokeWidth={2}
              fill="url(#incidentTrendGradient)"
              activeDot={{ r: 4, fill: '#2563EB', stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── 7. INCIDENT CATEGORIES BREAKDOWN ──────────────────────────────────────
function IncidentCategories({ incidents = [] }) {
  const categoryStats = useMemo(() => {
    const counts = {
      paymentFailures: 0,
      refundSpikes: 0,
      payoutAnomalies: 0,
      ledgerCorruption: 0,
      suspiciousActivity: 0,
      other: 0
    };

    incidents.forEach((inc) => {
      const type = (inc.incident_type || '').toLowerCase();
      if (type.includes('payment_fail') || type.includes('gateway_failure') || type.includes('payment')) {
        counts.paymentFailures += 1;
      } else if (type.includes('refund') || type.includes('chargeback')) {
        counts.refundSpikes += 1;
      } else if (type.includes('payout') || type.includes('commission') || type.includes('treasury')) {
        counts.payoutAnomalies += 1;
      } else if (type.includes('ledger') || type.includes('invariant') || type.includes('reconciliation') || type.includes('solvency')) {
        counts.ledgerCorruption += 1;
      } else if (type.includes('suspicious') || type.includes('fraud') || type.includes('cancellation')) {
        counts.suspiciousActivity += 1;
      } else {
        counts.other += 1;
      }
    });

    const total = incidents.length;

    return [
      {
        id: 'payment_failures',
        name: 'Payment Failures',
        count: counts.paymentFailures,
        percent: total > 0 ? Math.round((counts.paymentFailures / total) * 100) : 0,
        icon: CreditCard,
        color: '#E11D48',
        fillClass: 'bg-rose-500',
        dotColor: 'bg-rose-500',
      },
      {
        id: 'refund_spikes',
        name: 'Refund Spikes',
        count: counts.refundSpikes,
        percent: total > 0 ? Math.round((counts.refundSpikes / total) * 100) : 0,
        icon: RotateCcw,
        color: '#F59E0B',
        fillClass: 'bg-amber-500',
        dotColor: 'bg-amber-500',
      },
      {
        id: 'payout_anomalies',
        name: 'Payout Anomalies',
        count: counts.payoutAnomalies,
        percent: total > 0 ? Math.round((counts.payoutAnomalies / total) * 100) : 0,
        icon: Wallet,
        color: '#10B981',
        fillClass: 'bg-emerald-500',
        dotColor: 'bg-emerald-500',
      },
      {
        id: 'ledger_corruption',
        name: 'Ledger Corruption',
        count: counts.ledgerCorruption,
        percent: total > 0 ? Math.round((counts.ledgerCorruption / total) * 100) : 0,
        icon: Database,
        color: '#8B5CF6',
        fillClass: 'bg-purple-500',
        dotColor: 'bg-purple-500',
      },
      {
        id: 'suspicious_activity',
        name: 'Suspicious Activity',
        count: counts.suspiciousActivity,
        percent: total > 0 ? Math.round((counts.suspiciousActivity / total) * 100) : 0,
        icon: AlertTriangle,
        color: '#6366F1',
        fillClass: 'bg-indigo-500',
        dotColor: 'bg-indigo-500',
      },
      {
        id: 'other',
        name: 'Other',
        count: counts.other,
        percent: total > 0 ? Math.round((counts.other / total) * 100) : 0,
        icon: HelpCircle,
        color: '#64748B',
        fillClass: 'bg-slate-400',
        dotColor: 'bg-slate-400',
      }
    ];
  }, [incidents]);

  return (
    <div className="rounded-2xl bg-white dark:bg-[#0c1017] border border-[#E4E8EF] dark:border-zinc-800 shadow-[0_1px_4px_rgba(0,0,0,0.03)] p-5 sm:p-6 flex flex-col justify-between transition-all">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold font-mono tracking-tight text-slate-900 dark:text-white uppercase">
            INCIDENT CATEGORIES
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 font-sans mt-0.5">
            Distribution by anomaly vector
          </p>
        </div>
        <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
          {incidents.length} total
        </span>
      </div>

      <div className="space-y-3.5 my-auto">
        {categoryStats.map((cat) => {
          return (
            <div key={cat.id} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${cat.dotColor} shrink-0`} />
                  <span className="font-medium text-slate-700 dark:text-zinc-300">
                    {cat.name}
                  </span>
                </div>
                <div className="flex items-center gap-3 font-mono text-[11px]">
                  <span className="font-bold text-slate-900 dark:text-white">
                    {cat.count}
                  </span>
                  <span className="text-slate-400 w-8 text-right">
                    {cat.percent}%
                  </span>
                </div>
              </div>

              <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${cat.fillClass}`}
                  style={{ width: `${Math.max(cat.percent, cat.count > 0 ? 3 : 0)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-3 border-t border-slate-100 dark:border-zinc-800/80 mt-3 text-[11px] font-mono text-slate-400 flex items-center justify-between">
        <span>Active Categories</span>
        <span className="text-slate-600 dark:text-zinc-300 font-semibold">6 monitors active</span>
      </div>
    </div>
  );
}

// ── 8. SURVEILLANCE STATUS ────────────────────────────────────────────────
function SurveillanceStatus({
  incidents = [],
  financialHealth,
  lastSynced
}) {
  const hasPaymentAlert = incidents.some(
    (i) =>
      i.severity === 'critical' &&
      (i.status === 'open' || i.status === 'investigating') &&
      (i.incident_type || '').toLowerCase().includes('payment')
  );

  const hasRefundAlert = incidents.some(
    (i) =>
      i.severity === 'critical' &&
      (i.status === 'open' || i.status === 'investigating') &&
      (i.incident_type || '').toLowerCase().includes('refund')
  );

  const hasPayoutAlert = incidents.some(
    (i) =>
      i.severity === 'critical' &&
      (i.status === 'open' || i.status === 'investigating') &&
      (i.incident_type || '').toLowerCase().includes('payout')
  );

  const hasLedgerAlert =
    financialHealth?.status === 'unhealthy' ||
    incidents.some(
      (i) =>
        i.severity === 'critical' &&
        (i.status === 'open' || i.status === 'investigating') &&
        (i.incident_type || '').toLowerCase().includes('ledger')
    );

  const hasFraudAlert = incidents.some(
    (i) =>
      i.severity === 'critical' &&
      (i.status === 'open' || i.status === 'investigating') &&
      (i.incident_type || '').toLowerCase().includes('fraud')
  );

  const engines = [
    {
      id: 'fraud',
      name: 'Fraud Detection Engine',
      status: hasFraudAlert ? 'Alert' : 'Active',
      isHealthy: !hasFraudAlert,
    },
    {
      id: 'payment',
      name: 'Payment Monitoring',
      status: hasPaymentAlert ? 'Alert' : 'Active',
      isHealthy: !hasPaymentAlert,
    },
    {
      id: 'refund',
      name: 'Refund Anomaly Detection',
      status: hasRefundAlert ? 'Alert' : 'Active',
      isHealthy: !hasRefundAlert,
    },
    {
      id: 'payout',
      name: 'Payout Integrity Checks',
      status: hasPayoutAlert ? 'Alert' : 'Active',
      isHealthy: !hasPayoutAlert,
    },
    {
      id: 'ledger',
      name: 'Ledger Consistency Monitor',
      status: hasLedgerAlert ? 'Degraded' : 'Active',
      isHealthy: !hasLedgerAlert,
    }
  ];

  const formattedLastScan = lastSynced
    ? new Date(lastSynced).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      })
    : new Date().toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });

  return (
    <div className="rounded-2xl bg-white dark:bg-[#0c1017] border border-[#E4E8EF] dark:border-zinc-800 shadow-[0_1px_4px_rgba(0,0,0,0.03)] p-5 sm:p-6 flex flex-col justify-between transition-all">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold font-mono tracking-tight text-slate-900 dark:text-white uppercase flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            <span>SYSTEM STATUS</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 font-sans mt-0.5">
            Surveillance engine components
          </p>
        </div>
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
      </div>

      <div className="space-y-2 my-auto">
        {engines.map((engine) => {
          return (
            <div
              key={engine.id}
              className={`rounded-xl px-3 py-2 flex items-center justify-between transition-colors text-xs ${
                engine.isHealthy
                  ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-900/40 text-slate-800 dark:text-zinc-200'
                  : 'bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200'
              }`}
            >
              <div className="flex items-center gap-2 font-medium">
                {engine.isHealthy ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0 animate-pulse" />
                )}
                <span className="text-[11.5px] font-sans">{engine.name}</span>
              </div>

              <div className="flex items-center gap-1.5 font-mono text-[10.5px] font-bold">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    engine.isHealthy ? 'bg-emerald-500' : 'bg-rose-600 animate-ping'
                  }`}
                />
                <span
                  className={
                    engine.isHealthy
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : 'text-rose-700 dark:text-rose-300'
                  }
                >
                  {engine.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] font-mono">
        <div className="flex items-center gap-1.5 text-slate-400 dark:text-zinc-500">
          <Clock className="w-3.5 h-3.5" />
          <span>Last Scan</span>
        </div>
        <span className="font-semibold text-slate-700 dark:text-zinc-300">
          {formattedLastScan}
        </span>
      </div>
    </div>
  );
}

// ── 9. AUTOMATED MONITORING BANNER ────────────────────────────────────────
function AutomatedMonitoringBanner() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/50 p-4 sm:p-5 transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>

          <div className="space-y-0.5">
            <h4 className="text-xs sm:text-sm font-bold font-mono tracking-tight text-slate-900 dark:text-white uppercase flex items-center gap-2">
              <span>Automated Monitoring Active</span>
            </h4>
            <p className="text-xs text-slate-600 dark:text-zinc-400 font-sans leading-relaxed">
              The system continuously monitors all financial transactions, payments, refunds, and payouts. You will be alerted immediately if any suspicious activity is detected.
            </p>
          </div>
        </div>

        <div className="shrink-0 self-start sm:self-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-zinc-900 border border-blue-200 dark:border-blue-900/60 shadow-2xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[11px] font-bold font-mono text-slate-800 dark:text-zinc-200 tracking-wider">
              All Systems Operational
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 10. INCIDENT DETAIL DRAWER ────────────────────────────────────────────
function IncidentDetailDrawer({
  incident,
  onClose,
  onInvestigate,
  onResolve,
  onIgnore,
  onInspectBooking,
  actionLoading = false
}) {
  const [activeAction, setActiveAction] = useState('view');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [ignoreReason, setIgnoreReason] = useState('');
  const [copiedKey, setCopiedKey] = useState(null);
  const [investigator, setInvestigator] = useState('Finance Operations (Primary)');
  const [isMetadataExpanded, setIsMetadataExpanded] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!incident) return null;

  const handleCopy = (text, key) => {
    navigator.clipboard?.writeText(typeof text === 'object' ? JSON.stringify(text, null, 2) : String(text));
    setCopiedKey(key);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleResolveSubmit = (e) => {
    e.preventDefault();
    if (!resolutionNotes || resolutionNotes.trim().length < 5) {
      setErrorMsg('Resolution notes must be at least 5 characters long.');
      return;
    }
    setErrorMsg('');
    onResolve(incident.id, resolutionNotes.trim());
  };

  const handleIgnoreSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');
    onIgnore(incident.id, ignoreReason.trim() || undefined);
  };

  const shortId = `#INC-${incident.id?.slice(0, 8).toUpperCase()}`;
  const paymentId = incident.payment_id || incident.metadata?.payment_id;
  const bookingId = incident.booking_id || incident.metadata?.booking_id;
  const amount =
    incident.metadata?.amount ||
    incident.metadata?.refund_amount ||
    incident.metadata?.payout_amount ||
    incident.amount;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none animate-fade-in">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity cursor-pointer"
        onClick={onClose}
      />

      <aside className="fixed inset-y-0 right-0 max-w-full flex pl-10 cursor-default">
        <div className="w-screen max-w-xl bg-white dark:bg-[#0c1017] border-l border-slate-200 dark:border-zinc-800 shadow-2xl flex flex-col animate-slide-left">
          <div className="p-5 sm:p-6 border-b border-slate-200/80 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/30 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200/80 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 shadow-2xs">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold font-mono tracking-tight text-slate-900 dark:text-white">
                    {shortId}
                  </h2>
                  <IncidentStatusBadge value={incident.severity} type="severity" />
                  <IncidentStatusBadge value={incident.status} type="status" />
                </div>
                <p className="text-xs font-mono font-semibold text-slate-500 dark:text-zinc-400">
                  Rule: {incident.incident_type}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-xs font-sans">
            <div className="rounded-xl bg-slate-50/80 dark:bg-zinc-900/50 border border-slate-200/70 dark:border-zinc-800 p-4 space-y-2.5">
              <h4 className="text-[10.5px] font-bold font-mono uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                1. Incident Overview
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Entity Type</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-zinc-200 uppercase">
                    {incident.entity_type || 'TRANSACTION_NODE'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Occurrences</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {incident.occurrence_count || 1} hits
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Detected At</span>
                  <span className="font-mono text-slate-700 dark:text-zinc-300">
                    {incident.detected_at ? new Date(incident.detected_at).toLocaleString() : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Investigation State</span>
                  <span className="font-mono text-slate-700 dark:text-zinc-300 capitalize">
                    {incident.status}
                  </span>
                </div>
              </div>

              {incident.description && (
                <div className="pt-2 border-t border-slate-200/60 dark:border-zinc-800 text-slate-600 dark:text-zinc-400">
                  <p className="leading-relaxed italic">{incident.description}</p>
                </div>
              )}
            </div>

            <div className="rounded-xl bg-white dark:bg-[#0c1017] border border-slate-200/70 dark:border-zinc-800 p-4 space-y-2.5">
              <h4 className="text-[10.5px] font-bold font-mono uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                2. Detection Details
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Surveillance Engine</span>
                  <span className="font-mono font-medium text-slate-800 dark:text-zinc-200">
                    OneCoolie Fraud &amp; Invariant Sentinel
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Trigger Signature</span>
                  <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                    {incident.incident_type}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Entity Identifier</span>
                  <span className="font-mono text-slate-700 dark:text-zinc-300">
                    #{incident.entity_id ? incident.entity_id.slice(0, 12) : 'platform-core'}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-white dark:bg-[#0c1017] border border-slate-200/70 dark:border-zinc-800 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-[10.5px] font-bold font-mono uppercase tracking-wider text-slate-400 dark:text-zinc-500 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                  <span>3. Payment Details</span>
                </h4>
                {amount && (
                  <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                    ₹{Number(amount).toLocaleString('en-IN')}
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Payment ID</span>
                  <span className="font-mono text-slate-700 dark:text-zinc-300">
                    {paymentId ? `#PAY-${String(paymentId).slice(0, 10)}` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Gateway Provider</span>
                  <span className="font-mono text-slate-800 dark:text-zinc-200">
                    Razorpay (India UPI / Cards)
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-white dark:bg-[#0c1017] border border-slate-200/70 dark:border-zinc-800 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-[10.5px] font-bold font-mono uppercase tracking-wider text-slate-400 dark:text-zinc-500 flex items-center gap-1.5">
                  <Ticket className="w-3.5 h-3.5 text-slate-400" />
                  <span>4. Booking Details</span>
                </h4>
                {bookingId && onInspectBooking && (
                  <button
                    type="button"
                    onClick={() => onInspectBooking(bookingId)}
                    className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Inspect Booking</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Booking Reference</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">
                    {bookingId ? `#BK-${String(bookingId).slice(0, 8).toUpperCase()}` : 'None Associated'}
                  </span>
                </div>
                {incident.passenger && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Passenger</span>
                    <span className="text-slate-700 dark:text-zinc-300 font-medium">
                      {incident.passenger.name} ({incident.passenger.phone || 'No phone'})
                    </span>
                  </div>
                )}
                {incident.assistant && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Sahayak / Assistant</span>
                    <span className="text-slate-700 dark:text-zinc-300 font-medium">
                      {incident.assistant.name} ({incident.assistant.station_code})
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl bg-white dark:bg-[#0c1017] border border-slate-200/70 dark:border-zinc-800 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-[10.5px] font-bold font-mono uppercase tracking-wider text-slate-400 dark:text-zinc-500 flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-slate-400" />
                  <span>5. Risk Signals &amp; Forensic Metadata</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setIsMetadataExpanded(!isMetadataExpanded)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 cursor-pointer"
                >
                  {isMetadataExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>

              {isMetadataExpanded && (
                <div className="relative">
                  <pre className="p-3 bg-slate-900 text-slate-200 rounded-xl text-[11px] font-mono overflow-x-auto max-h-48 border border-slate-800">
                    {incident.metadata && Object.keys(incident.metadata).length > 0
                      ? JSON.stringify(incident.metadata, null, 2)
                      : JSON.stringify(
                          {
                            rule: incident.incident_type,
                            severity: incident.severity,
                            detected_at: incident.detected_at,
                            entity_type: incident.entity_type,
                            occurrences: incident.occurrence_count || 1
                          },
                          null,
                          2
                        )}
                  </pre>
                  <button
                    type="button"
                    onClick={() => handleCopy(incident.metadata || incident, 'metadata')}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                    title="Copy JSON payload"
                  >
                    {copiedKey === 'metadata' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              )}
            </div>

            <div className="rounded-xl bg-white dark:bg-[#0c1017] border border-slate-200/70 dark:border-zinc-800 p-4 space-y-3">
              <h4 className="text-[10.5px] font-bold font-mono uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                6. Timeline &amp; Audit Trail
              </h4>
              <div className="relative pl-6 space-y-3 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-zinc-800">
                <div className="relative">
                  <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-rose-500 border-2 border-white dark:border-zinc-900" />
                  <p className="font-mono font-bold text-slate-800 dark:text-zinc-200 text-xs">
                    Anomaly Triggered &amp; Recorded
                  </p>
                  <p className="text-[10.5px] font-mono text-slate-400">
                    {incident.detected_at ? new Date(incident.detected_at).toLocaleString() : 'Recent'}
                  </p>
                </div>

                {incident.status === 'investigating' && (
                  <div className="relative">
                    <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-blue-500 border-2 border-white dark:border-zinc-900" />
                    <p className="font-mono font-bold text-slate-800 dark:text-zinc-200 text-xs">
                      Under Active Investigation
                    </p>
                    <p className="text-[10.5px] font-mono text-slate-400">
                      Assigned to {investigator}
                    </p>
                  </div>
                )}

                {incident.status === 'resolved' && (
                  <div className="relative">
                    <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-900" />
                    <p className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-xs">
                      Incident Resolved
                    </p>
                    <p className="text-[10.5px] font-mono text-slate-400">
                      {incident.resolved_at ? new Date(incident.resolved_at).toLocaleString() : 'Completed'}
                    </p>
                    {incident.resolution_notes && (
                      <p className="mt-1 text-xs text-slate-600 dark:text-zinc-400 bg-emerald-50/50 dark:bg-emerald-950/20 p-2 rounded border border-emerald-200/50 italic">
                        "{incident.resolution_notes}"
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-medium">
                {errorMsg}
              </div>
            )}
          </div>

          <div className="p-5 border-t border-slate-200/80 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-900/40">
            {activeAction === 'view' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-500 font-mono text-[11px]">Investigator:</span>
                  <select
                    value={investigator}
                    onChange={(e) => setInvestigator(e.target.value)}
                    className="bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1 text-xs font-sans text-slate-700 dark:text-zinc-200"
                  >
                    <option value="Finance Operations (Primary)">Finance Operations (Primary)</option>
                    <option value="Fraud Desk (Senior)">Fraud Desk (Senior)</option>
                    <option value="Platform Administrator">Platform Administrator</option>
                  </select>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {incident.status === 'open' && (
                    <button
                      type="button"
                      onClick={() => onInvestigate(incident.id)}
                      disabled={actionLoading}
                      className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-60"
                    >
                      {actionLoading ? 'Updating...' : 'Mark Investigating'}
                    </button>
                  )}

                  {(incident.status === 'open' || incident.status === 'investigating') && (
                    <>
                      <button
                        type="button"
                        onClick={() => setActiveAction('resolve')}
                        disabled={actionLoading}
                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-60"
                      >
                        Resolve Incident...
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveAction('ignore')}
                        disabled={actionLoading}
                        className="py-2 px-3 rounded-xl bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Ignore
                      </button>
                    </>
                  )}

                  {incident.status === 'resolved' && (
                    <div className="w-full text-center py-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-700 dark:text-emerald-300 font-mono text-xs font-bold border border-emerald-200/80 dark:border-emerald-900/60">
                      ✓ Incident Marked Resolved
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeAction === 'resolve' && (
              <form onSubmit={handleResolveSubmit} className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold font-mono text-slate-900 dark:text-white uppercase">
                    Resolve Incident #{shortId}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveAction('view')}
                    className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Enter detailed audit resolution notes (e.g. verified gateway refund trace, false positive due to duplicate webhook, manual adjustment verified)..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-sans text-slate-800 dark:text-zinc-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveAction('view')}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-60"
                  >
                    {actionLoading ? 'Resolving...' : 'Confirm Resolution'}
                  </button>
                </div>
              </form>
            )}

            {activeAction === 'ignore' && (
              <form onSubmit={handleIgnoreSubmit} className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold font-mono text-slate-900 dark:text-white uppercase">
                    Ignore Incident #{shortId}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveAction('view')}
                    className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
                <input
                  type="text"
                  value={ignoreReason}
                  onChange={(e) => setIgnoreReason(e.target.value)}
                  placeholder="Reason for ignoring (e.g. known staging test, manual override)..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-sans text-slate-800 dark:text-zinc-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-slate-500/20"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveAction('view')}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-black text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-60"
                  >
                    {actionLoading ? 'Updating...' : 'Confirm Ignore'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

// ── 11. MASTER FINANCIAL INCIDENTS VIEW (DEFAULT EXPORT) ───────────────────
export default function FinancialIncidentsView({
  incidentsList = [],
  incidentStats = { total: 0, open: 0, investigating: 0, critical: 0, warning: 0 },
  incidentsFilter = 'ALL',
  setIncidentsFilter,
  selectedIncident = null,
  setSelectedIncident,
  financialHealth = null,
  fetchAll,
  actionLoading = false,
  lastSynced,
  handleInvestigateIncident,
  handleResolveIncident,
  handleIgnoreIncident,
  onInspectBooking,
  onOpenAuditTrail
}) {
  const [dateRange, setDateRange] = useState('ALL');

  return (
    <div className="space-y-6 animate-fade-in max-w-[1520px] mx-auto transition-all">
      {/* 1. Page Header */}
      <FinancialIncidentsHeader
        onRefresh={fetchAll}
        loading={actionLoading}
        lastSynced={lastSynced}
      />

      {/* 2. KPI Command Strip */}
      <IncidentKpiRow
        stats={incidentStats}
        activeFilter={incidentsFilter}
        onSelectFilter={setIncidentsFilter}
      />

      {/* 3. Incident Command Center */}
      <IncidentCommandCenter
        incidents={incidentsList}
        filter={incidentsFilter}
        onFilterChange={setIncidentsFilter}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onSelectIncident={setSelectedIncident}
        onInspectBooking={onInspectBooking}
        onOpenAuditTrail={onOpenAuditTrail}
      />

      {/* 4. Analytics Row: Trends | Categories | Status */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-5 flex flex-col">
          <IncidentTrends incidents={incidentsList} />
        </div>

        <div className="lg:col-span-4 flex flex-col">
          <IncidentCategories incidents={incidentsList} />
        </div>

        <div className="lg:col-span-3 flex flex-col">
          <SurveillanceStatus
            incidents={incidentsList}
            financialHealth={financialHealth}
            lastSynced={lastSynced}
          />
        </div>
      </div>

      {/* 5. Automated Monitoring Banner */}
      <AutomatedMonitoringBanner />

      {/* 6. Right-Side Incident Detail Drawer */}
      {selectedIncident && (
        <IncidentDetailDrawer
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
          onInvestigate={handleInvestigateIncident}
          onResolve={handleResolveIncident}
          onIgnore={handleIgnoreIncident}
          onInspectBooking={onInspectBooking}
          actionLoading={actionLoading}
        />
      )}
    </div>
  );
}
