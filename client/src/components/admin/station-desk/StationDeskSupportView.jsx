import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  LifeBuoy,
  X,
  Plus,
  Briefcase,
  Clock,
  Users,
  UserCheck,
  TrendingUp,
  Search,
  Filter,
  MessageSquare,
  ChevronRight,
  CheckSquare,
  Square,
  RefreshCw,
  Train,
  User,
  Phone,
  Mail,
  Copy,
  Check,
  Paperclip,
  Smile,
  Send,
  MoreHorizontal,
  CheckCheck,
  FileText,
  Zap
} from 'lucide-react';
import toast from 'react-hot-toast';
import axios from '../../../api/axios';
import { addTicketMessage } from '../../../utils/supportStore';
import { STATIONS } from '../../../utils/services';
import vandeBharatImg from '../../../assets/images/vande_bharat_ref_crop.jpg';

/* ==========================================================================
   ONECOOLIE STATION DESK & SUPPORT INBOX (CONSOLIDATED MASTER VIEW)
   Enterprise Desk Management, Supervisor Dispatch, and Real-time Chat
   ========================================================================== */

// ── 1. PAGE HEADER ─────────────────────────────────────────────────────────
function StationDeskPageHeader({ onRaiseTicket }) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-zinc-900 border border-[#E5E7EB] dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xs">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
          <span className="text-[11px] font-mono uppercase tracking-widest font-bold text-zinc-500 dark:text-zinc-400">
            SUPPORT &amp; ASSISTANCE
          </span>
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Station Desk &amp; Support Inbox
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-normal">
          Real-time ticket management, station supervisor dispatch, and passenger assistance support.
        </p>
      </div>

      <div className="flex items-center gap-3 sm:gap-4 self-start lg:self-center shrink-0">
        <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700/60">
          <img
            src={vandeBharatImg}
            alt="Vande Bharat Express"
            className="h-9 w-auto object-contain select-none pointer-events-none"
          />
          <div className="text-right">
            <p className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300 leading-tight">
              Together for
            </p>
            <p className="text-[11px] font-bold text-slate-900 dark:text-white flex items-center gap-1.5 justify-end">
              <span>Smoother Journeys</span>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onRaiseTicket}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-medium text-xs sm:text-sm rounded-xl flex items-center gap-2 transition-all shadow-[0_2px_8px_rgba(37,99,235,0.35)] cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Raise Support Ticket</span>
        </button>
      </div>
    </div>
  );
}

// ── 2. KPI CARDS ROW ───────────────────────────────────────────────────────
function Sparkline({ color = '#2563EB', path = 'M 0 16 Q 15 8 30 13 T 60 4' }) {
  return (
    <svg className="w-16 h-8 overflow-visible" viewBox="0 0 60 20" fill="none">
      <path
        d={path}
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StationDeskKpiRow({
  totalTickets = 13,
  activePending = 7,
  passengerInquiries = 11,
  sahayakOperational = 2,
  onFilterActive,
  onFilterPassenger,
  onFilterSahayak,
  onFilterAll,
}) {
  const cards = [
    {
      id: 'total',
      label: 'Total Desk Tickets',
      value: totalTickets,
      icon: Briefcase,
      iconBg: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400',
      badge: (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
          <TrendingUp className="w-3 h-3" />
          <span>+18% vs last week</span>
        </span>
      ),
      sparkColor: '#2563EB',
      sparkPath: 'M 0 16 Q 15 10 30 14 T 60 4',
      onClick: onFilterAll,
    },
    {
      id: 'active',
      label: 'Active / Pending',
      value: activePending,
      icon: Clock,
      iconBg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400',
      badge: (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          <span>Needs attention</span>
        </span>
      ),
      sparkColor: '#F59E0B',
      sparkPath: 'M 0 8 Q 15 15 30 11 T 60 14',
      onClick: onFilterActive,
    },
    {
      id: 'passenger',
      label: 'Passenger Inquiries',
      value: passengerInquiries,
      icon: Users,
      iconBg: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400',
      badge: (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
          <TrendingUp className="w-3 h-3" />
          <span>+22% vs last week</span>
        </span>
      ),
      sparkColor: '#2563EB',
      sparkPath: 'M 0 17 Q 15 7 30 12 T 60 5',
      onClick: onFilterPassenger,
    },
    {
      id: 'sahayak',
      label: 'Sahayak Operational',
      value: sahayakOperational,
      icon: UserCheck,
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400',
      badge: (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>On duty</span>
        </span>
      ),
      sparkColor: '#10B981',
      sparkPath: 'M 0 15 Q 15 11 30 13 T 60 4',
      onClick: onFilterSahayak,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.id}
            onClick={c.onClick}
            className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-[#E5E7EB] dark:border-zinc-800 shadow-xs hover:border-slate-300 dark:hover:border-zinc-700 transition-all duration-150 cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                {c.label}
              </span>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${c.iconBg}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div className="flex items-baseline justify-between gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                {c.value}
              </span>
              <Sparkline color={c.sparkColor} path={c.sparkPath} />
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-zinc-800/80">
              {c.badge}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── 3. TICKET LEDGER TABLE ─────────────────────────────────────────────────
function TicketLedger({
  tickets = [],
  searchQuery = '',
  onSearchChange,
  stationFilter = 'ALL',
  onStationChange,
  statusFilter = 'ALL',
  onStatusChange,
  priorityFilter = 'ALL',
  onPriorityChange,
  selectedTicketId = null,
  onSelectTicket,
  onResolveTicket,
  ticketUpdatingId = null,
  pendingCount = 0,
}) {
  const [selectedRowIds, setSelectedRowIds] = useState(new Set());

  const toggleSelectAll = () => {
    if (selectedRowIds.size === tickets.length) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(tickets.map((t) => t.id)));
    }
  };

  const toggleSelectRow = (id, e) => {
    e.stopPropagation();
    const next = new Set(selectedRowIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedRowIds(next);
  };

  const formatUpdatedDate = (t) => {
    const raw = t.updated_at || t.updatedAt || t.created_at || t.createdAt;
    if (!raw) return '—';
    try {
      const d = new Date(raw);
      return (
        d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) +
        ', ' +
        d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
    } catch {
      return '10 Sept, 18:24';
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-[#E5E7EB] dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-4">
      {/* 1. Header with Count & Action Required Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
          <h2 className="font-bold text-sm text-slate-900 dark:text-white font-mono uppercase tracking-wide">
            STATION DESK &amp; SUPPORT TICKETS LEDGER ({tickets.length})
          </h2>
        </div>
        {pendingCount > 0 && (
          <span className="self-start sm:self-auto px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/60">
            {pendingCount} Action Required
          </span>
        )}
      </div>

      {/* 2. Single-Row Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 items-center">
        <div className="lg:col-span-5 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search tickets, PNR, user, issue..."
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="w-full h-11 pl-10 pr-3.5 text-xs bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white dark:focus:bg-zinc-900 transition-all font-sans"
          />
        </div>

        <div className="lg:col-span-2">
          <select
            value={stationFilter}
            onChange={(e) => onStationChange?.(e.target.value)}
            className="w-full h-11 px-3 text-xs bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-700 rounded-xl text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer transition-all font-sans"
          >
            <option value="ALL">All Station Hubs</option>
            {STATIONS.map((st) => (
              <option key={st.code} value={st.code}>
                {st.code} - {st.name}
              </option>
            ))}
          </select>
        </div>

        <div className="lg:col-span-2">
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange?.(e.target.value)}
            className="w-full h-11 px-3 text-xs bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-700 rounded-xl text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer transition-all font-sans"
          >
            <option value="ALL">All Statuses</option>
            <option value="open">Open</option>
            <option value="in progress">In Progress</option>
            <option value="dispatched">Dispatched</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        <div className="lg:col-span-2">
          <select
            value={priorityFilter}
            onChange={(e) => onPriorityChange?.(e.target.value)}
            className="w-full h-11 px-3 text-xs bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-700 rounded-xl text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer transition-all font-sans"
          >
            <option value="ALL">All Priorities</option>
            <option value="normal">Normal</option>
            <option value="urgent">Urgent / High</option>
          </select>
        </div>

        <div className="lg:col-span-1">
          <button
            type="button"
            className="w-full h-11 px-3 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Filter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filters</span>
          </button>
        </div>
      </div>

      {/* 3. Ticket Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-zinc-800">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50/80 dark:bg-zinc-800/50 border-b border-slate-200 dark:border-zinc-800 text-[10px] uppercase tracking-wider text-slate-500 dark:text-zinc-400 font-mono font-bold select-none">
              <th className="py-3 px-3 w-8">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer flex items-center"
                >
                  {selectedRowIds.size === tickets.length && tickets.length > 0 ? (
                    <CheckSquare className="w-4 h-4 text-blue-600" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>
              </th>
              <th className="py-3 px-2.5">Channel</th>
              <th className="py-3 px-2.5">Ticket ID</th>
              <th className="py-3 px-2.5">Requester</th>
              <th className="py-3 px-2.5">Station</th>
              <th className="py-3 px-2.5">Category</th>
              <th className="py-3 px-2.5">PNR</th>
              <th className="py-3 px-2.5 max-w-[220px]">Description</th>
              <th className="py-3 px-2.5">Priority</th>
              <th className="py-3 px-2.5">Status</th>
              <th className="py-3 px-2.5">Updated</th>
              <th className="py-3 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80 font-sans">
            {tickets.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-10 text-center text-slate-400 font-mono text-xs">
                  No support desk tickets match the filter criteria.
                </td>
              </tr>
            ) : (
              tickets.map((t) => {
                const isAssistant = t.type === 'assistant' || Boolean(t.assistant_name && !t.passengerName);
                const isResolved = ['resolved', 'closed', 'resolved by station master'].includes(
                  (t.status || '').toLowerCase()
                );
                const isUrgent = ['urgent', 'high'].includes((t.priority || '').toLowerCase());
                const isMedium = (t.priority || '').toLowerCase() === 'medium';
                const isSelected =
                  String(selectedTicketId || '').toLowerCase().replace('#', '') ===
                  String(t.id).toLowerCase().replace('#', '');
                const isRowChecked = selectedRowIds.has(t.id);

                return (
                  <tr
                    key={t.id}
                    onClick={() => onSelectTicket?.(t.id)}
                    className={`transition-colors cursor-pointer group ${
                      isSelected
                        ? 'bg-blue-50/60 dark:bg-blue-950/30 font-medium'
                        : 'hover:bg-slate-50/80 dark:hover:bg-zinc-800/40'
                    }`}
                  >
                    <td className="py-3 px-3" onClick={(e) => toggleSelectRow(t.id, e)}>
                      <button
                        type="button"
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer flex items-center"
                      >
                        {isRowChecked ? (
                          <CheckSquare className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </td>

                    <td className="py-3 px-2.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                          isAssistant
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/70'
                            : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/70'
                        }`}
                      >
                        {isAssistant ? 'Sahayak' : 'Passenger'}
                      </span>
                    </td>

                    <td className="py-3 px-2.5 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                      #{t.id}
                    </td>

                    <td className="py-3 px-2.5 font-semibold text-slate-900 dark:text-zinc-100 whitespace-nowrap">
                      {t.passengerName || t.assistant_name || 'Passenger'}
                    </td>

                    <td className="py-3 px-2.5 font-mono font-bold text-slate-800 dark:text-zinc-200 whitespace-nowrap">
                      {t.station || 'KZJ'}
                    </td>

                    <td className="py-3 px-2.5 text-slate-700 dark:text-zinc-300 whitespace-nowrap max-w-[160px] truncate">
                      {t.subject || t.category || 'General'}
                    </td>

                    <td className="py-3 px-2.5 font-mono text-slate-500 dark:text-zinc-400 whitespace-nowrap">
                      {t.pnr || t.trip?.pnr || 'N/A'}
                    </td>

                    <td className="py-3 px-2.5 text-slate-500 dark:text-zinc-400 max-w-[200px] truncate">
                      {t.description || t.desc || 'No description provided'}
                    </td>

                    <td className="py-3 px-2.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                          isUrgent
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/70 dark:border-rose-800/70'
                            : isMedium
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/70'
                            : 'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300'
                        }`}
                      >
                        {t.priority || 'normal'}
                      </span>
                    </td>

                    <td className="py-3 px-2.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          isResolved
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60'
                            : (t.status || '').toLowerCase().includes('progress')
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60'
                        }`}
                      >
                        {t.status || 'Open'}
                      </span>
                    </td>

                    <td className="py-3 px-2.5 font-mono text-[11px] text-slate-500 dark:text-zinc-400 whitespace-nowrap">
                      {formatUpdatedDate(t)}
                    </td>

                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectTicket?.(t.id);
                            document.getElementById('live-support-workspace')?.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className="h-7 px-2.5 rounded-lg border border-slate-200 dark:border-zinc-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-zinc-200 hover:text-blue-600 dark:hover:text-blue-400 text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>Chat</span>
                        </button>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── 4. LIVE SUPPORT DESK LIST (LEFT PANEL) ─────────────────────────────────
function LiveSupportDeskList({
  tickets = [],
  selectedTicketId = null,
  onSelectTicket,
  onRefresh,
  isRefreshing = false,
}) {
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const counts = {
    all: tickets.length,
    active: tickets.filter((t) => {
      const s = (t.status || '').toLowerCase();
      return !['resolved', 'closed', 'resolved by station master'].includes(s);
    }).length,
    passenger: tickets.filter((t) => t.type === 'passenger' || Boolean(t.passengerName)).length,
    sahayak: tickets.filter((t) => t.type === 'assistant' || (!t.type && !t.passengerName)).length,
    resolved: tickets.filter((t) => {
      const s = (t.status || '').toLowerCase();
      return ['resolved', 'closed', 'resolved by station master'].includes(s);
    }).length,
  };

  const filteredTickets = tickets.filter((t) => {
    const s = (t.status || '').toLowerCase();
    const isResolved = ['resolved', 'closed', 'resolved by station master'].includes(s);
    const isActive = !isResolved;

    if (filter === 'active' && !isActive) return false;
    if (filter === 'resolved' && !isResolved) return false;
    if (filter === 'passenger' && !(t.type === 'passenger' || Boolean(t.passengerName))) return false;
    if (filter === 'sahayak' && !(t.type === 'assistant' || (!t.type && !t.passengerName))) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matches =
        (t.id && String(t.id).toLowerCase().includes(q)) ||
        (t.subject && t.subject.toLowerCase().includes(q)) ||
        (t.category && t.category.toLowerCase().includes(q)) ||
        (t.passengerName && t.passengerName.toLowerCase().includes(q)) ||
        (t.assistant_name && t.assistant_name.toLowerCase().includes(q)) ||
        (t.pnr && t.pnr.toLowerCase().includes(q)) ||
        (t.description && t.description.toLowerCase().includes(q));
      if (!matches) return false;
    }
    return true;
  });

  const formatTicketTime = (t) => {
    const raw = t.updated_at || t.updatedAt || t.created_at || t.createdAt;
    if (!raw) return '01:08 AM';
    try {
      const d = new Date(raw);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '01:08 AM';
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 border-r border-[#E5E7EB] dark:border-zinc-800">
      <div className="p-4 border-b border-slate-100 dark:border-zinc-800 space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white font-sans">
              Live Support Desk
            </h3>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live</span>
            </span>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Refresh tickets"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search passenger, PNR, issue..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white dark:focus:bg-zinc-900 transition-all font-sans"
          />
        </div>

        <div className="flex items-center bg-slate-100 dark:bg-zinc-800/80 p-0.5 rounded-xl text-[11px] font-semibold gap-0.5 overflow-x-auto select-none">
          {[
            { id: 'all', label: `All (${counts.all})` },
            { id: 'active', label: `Active (${counts.active})` },
            { id: 'passenger', label: `Passenger (${counts.passenger})` },
            { id: 'sahayak', label: `Sahayak (${counts.sahayak})` },
            { id: 'resolved', label: `Resolved (${counts.resolved})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`flex-1 py-1 px-2 rounded-lg transition-all text-center whitespace-nowrap cursor-pointer ${
                filter === tab.id
                  ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredTickets.length === 0 ? (
          <div className="py-12 text-center text-slate-400 dark:text-zinc-500 space-y-2">
            <MessageSquare className="w-8 h-8 mx-auto opacity-40 text-slate-400" />
            <p className="text-xs font-semibold">No tickets found</p>
            <p className="text-[10px] text-slate-400">Tickets will appear here automatically.</p>
          </div>
        ) : (
          filteredTickets.map((ticket) => {
            const isSelected =
              String(ticket.id).toLowerCase().replace('#', '') ===
              String(selectedTicketId || '').toLowerCase().replace('#', '');
            const isResolved = ['resolved', 'closed', 'resolved by station master'].includes(
              (ticket.status || '').toLowerCase()
            );
            const isAssistant = ticket.type === 'assistant' || Boolean(ticket.assistant_name && !ticket.passengerName);
            const isUrgent = ['urgent', 'high'].includes((ticket.priority || '').toLowerCase());

            return (
              <button
                key={ticket.id}
                type="button"
                onClick={() => onSelectTicket?.(ticket.id)}
                className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer group ${
                  isSelected
                    ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-400 dark:border-blue-600 shadow-xs'
                    : 'bg-white dark:bg-zinc-900 border-slate-200/90 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[11px] font-mono font-bold text-slate-700 dark:text-zinc-300">
                      #{ticket.id}
                    </span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                        isAssistant
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/60'
                          : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200/60'
                      }`}
                    >
                      {isAssistant ? 'Sahayak' : 'Passenger'}
                    </span>
                  </div>

                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isResolved
                        ? 'bg-emerald-500'
                        : isUrgent
                        ? 'bg-rose-500 animate-pulse'
                        : 'bg-amber-500'
                    }`}
                  />
                </div>

                <h4
                  className={`text-xs font-semibold truncate ${
                    isSelected ? 'text-blue-900 dark:text-blue-100 font-bold' : 'text-slate-900 dark:text-white'
                  }`}
                >
                  {ticket.subject || ticket.category || 'Platform Assistance'}
                </h4>

                <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500 dark:text-zinc-400">
                  <span className="truncate max-w-[130px]">
                    {ticket.passengerName || ticket.assistant_name || 'Passenger'}
                  </span>
                  <span className="font-mono text-[10px] shrink-0">
                    {formatTicketTime(ticket)}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── 5. TICKET CONVERSATION (CENTER PANEL) ──────────────────────────────────
function TicketConversationPanel({
  ticket = null,
  onUpdateTicketStatus,
  onOptimisticMessage,
}) {
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatBottomRef = useRef(null);
  const chatContainerRef = useRef(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [ticket?.conversation, ticket?.id]);

  if (!ticket) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 dark:text-zinc-500 bg-white dark:bg-zinc-900">
        <p className="text-sm font-semibold">Select a ticket from the left or ledger to view conversation</p>
      </div>
    );
  }

  const isResolved = ['resolved', 'closed', 'resolved by station master'].includes((ticket.status || '').toLowerCase());

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!replyText.trim() || isSending) return;

    const messageText = replyText.trim();
    setIsSending(true);

    const newMsg = {
      id: `msg-${Date.now()}`,
      sender: 'support',
      name: 'Station Desk Support',
      text: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    onOptimisticMessage?.(ticket.id, newMsg);
    setReplyText('');

    try {
      addTicketMessage(ticket.id, newMsg);
    } catch (err) {
      console.warn('Backend message sync notice:', err.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleStatusToggle = () => {
    if (isResolved) {
      onUpdateTicketStatus?.(ticket.id, 'open', 'Reopened by Station Desk Support');
    } else {
      onUpdateTicketStatus?.(ticket.id, 'Resolved by Station Master', 'Resolved via Admin Console');
    }
  };

  const formatCreated = () => {
    const raw = ticket.created_at || ticket.createdAt;
    if (!raw) return '08/09/2026, 01:08 AM';
    try {
      const d = new Date(raw);
      return d.toLocaleDateString('en-GB') + ', ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '08/09/2026, 01:08 AM';
    }
  };

  const getInitials = (name) => {
    if (!name) return 'RK';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const requesterInitials = getInitials(ticket.passengerName || ticket.assistant_name || 'RK');
  const conversation = ticket.conversation || [];

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-zinc-900 min-w-0">
      {/* Panel Header */}
      <div className="p-4 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-3 bg-white dark:bg-zinc-900 shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-black font-mono text-slate-900 dark:text-white tracking-tight">
              #{ticket.id}
            </h2>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                isResolved
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/60'
                  : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200/60'
              }`}
            >
              {ticket.status || 'OPEN'}
            </span>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-sans mt-0.5 truncate">
            Station: <span className="font-mono font-bold text-slate-700 dark:text-zinc-300">{ticket.station || 'KZJ'}</span>
            {' · '}Created: <span className="font-mono">{formatCreated()}</span>
            {' · '}Category: <span className="font-medium text-slate-700 dark:text-zinc-300">{ticket.subject || ticket.category || '1'}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleStatusToggle}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isResolved
                ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
            }`}
          >
            {isResolved ? 'Reopen Ticket' : 'Resolve'}
          </button>

          <button
            type="button"
            className="p-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Conversation Stream */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 sm:p-5 bg-slate-50/50 dark:bg-zinc-950/50 space-y-4 font-sans"
      >
        <div className="flex justify-center my-2 select-none">
          <span className="px-3 py-1 rounded-full text-[10px] font-semibold text-slate-500 dark:text-zinc-400 bg-slate-200/60 dark:bg-zinc-800">
            08 Sept 2026
          </span>
        </div>

        {conversation.length === 0 && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 flex items-center justify-center font-bold text-xs shrink-0 select-none">
              {requesterInitials}
            </div>
            <div className="space-y-1 max-w-[80%]">
              <div className="p-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl rounded-tl-xs shadow-2xs text-xs sm:text-sm text-slate-800 dark:text-zinc-200">
                {ticket.description || ticket.desc || 'Assistance requested at station.'}
              </div>
              <p className="text-[10px] text-slate-400 font-mono px-1">01:08 AM</p>
            </div>
          </div>
        )}

        {conversation.map((msg) => {
          if (msg.sender === 'system') {
            return (
              <div key={msg.id} className="flex justify-center my-3 select-none">
                <span className="px-4 py-1.5 rounded-full text-[11px] font-medium text-slate-600 dark:text-zinc-300 bg-slate-200/70 dark:bg-zinc-800 text-center max-w-md shadow-2xs">
                  {msg.text}
                </span>
              </div>
            );
          }

          const isSupport = msg.sender === 'support';

          if (isSupport) {
            return (
              <div key={msg.id} className="flex flex-col items-end space-y-1">
                <span className="text-[10px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider px-1">
                  Station Desk Support
                </span>
                <div className="p-3.5 bg-blue-600 text-white rounded-2xl rounded-tr-xs shadow-sm max-w-[80%] sm:max-w-[70%] text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                  {msg.text}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono px-1">
                  <span>{msg.timestamp || '07:39 PM'}</span>
                  <CheckCheck className="w-3 h-3 text-blue-600" />
                </div>
              </div>
            );
          }

          return (
            <div key={msg.id} className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 flex items-center justify-center font-bold text-xs shrink-0 select-none">
                {requesterInitials}
              </div>
              <div className="space-y-1 max-w-[80%] sm:max-w-[70%]">
                <div className="p-3.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white rounded-2xl rounded-tl-xs shadow-2xs text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                  {msg.text}
                </div>
                <p className="text-[10px] text-slate-400 font-mono px-1">
                  {msg.timestamp || '01:08 AM'}
                </p>
              </div>
            </div>
          );
        })}

        <div ref={chatBottomRef} />
      </div>

      {/* Reply Input Bar */}
      <div className="p-3 sm:p-4 border-t border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <button
            type="button"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Attach file"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Type your response to the ticket..."
            disabled={isSending}
            className="flex-1 h-11 px-4 text-xs sm:text-sm bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white dark:focus:bg-zinc-900 transition-all font-sans"
          />

          <button
            type="button"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Add emoji"
          >
            <Smile className="w-4 h-4" />
          </button>

          <button
            type="submit"
            disabled={!replyText.trim() || isSending}
            className="h-11 px-5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 text-white rounded-xl font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-[0_2px_8px_rgba(37,99,235,0.35)] cursor-pointer shrink-0"
          >
            <span>{isSending ? 'Sending...' : 'Send'}</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}

// ── 6. TICKET CONTEXT (RIGHT PANEL) ────────────────────────────────────────
function TicketContextPanel({
  ticket = null,
  onUpdateTicketStatus,
  onAssignSahayak,
  onAddNote,
}) {
  const [copiedField, setCopiedField] = useState(null);

  if (!ticket) {
    return (
      <div className="w-full lg:w-72 p-4 bg-white dark:bg-zinc-900 border-l border-[#E5E7EB] dark:border-zinc-800 text-center text-slate-400 dark:text-zinc-500 text-xs">
        Select a ticket to view context.
      </div>
    );
  }

  const copyToClipboard = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`Copied ${fieldName} to clipboard`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const isResolved = ['resolved', 'closed', 'resolved by station master'].includes((ticket.status || '').toLowerCase());

  const trip = ticket.trip || {
    trainNo: '57606',
    trainName: 'Vikarabad Secunderabad',
    route: `${ticket.station || 'KZJ'} → ${ticket.station || 'KZJ'}`,
    coach: 'D2',
    seat: '12 (Lower)',
  };

  const passengerName = ticket.passengerName || ticket.assistant_name || 'rk';
  const passengerPhone = ticket.passengerPhone || ticket.assistant_phone || '+91 9398553191';
  const passengerEmail = ticket.passengerEmail || '2303a52055@sru.edu.in';

  return (
    <div className="w-full lg:w-80 bg-white dark:bg-zinc-900 border-l border-[#E5E7EB] dark:border-zinc-800 p-4 space-y-4 overflow-y-auto shrink-0 font-sans">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
        <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
          <span>Ticket Context</span>
        </h3>
        <ChevronRight className="w-4 h-4 text-slate-400" />
      </div>

      {/* Train Details Card */}
      <div className="bg-slate-50 dark:bg-zinc-800/60 rounded-xl p-3.5 border border-slate-200/80 dark:border-zinc-700/60 space-y-2">
        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
          <Train className="w-4 h-4 shrink-0" />
          <span className="font-bold text-xs">Train Details</span>
        </div>

        <div>
          <p className="text-xs font-bold text-slate-900 dark:text-white">
            Train {trip.trainNo || '57606'}
          </p>
          <p className="text-[11px] text-slate-600 dark:text-zinc-300 font-medium">
            {trip.trainName || 'Vikarabad Secunderabad'}
          </p>
          <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono mt-0.5">
            {trip.route || `${ticket.station || 'KZJ'} → ${ticket.station || 'KZJ'}`}
          </p>
        </div>

        <div className="pt-2 border-t border-slate-200/80 dark:border-zinc-700 flex items-center justify-between text-[11px] font-semibold text-slate-700 dark:text-zinc-300 font-mono">
          <span>Coach: {trip.coach || 'D2'}</span>
          <span>Seat: {trip.seat || '12 (Lower)'}</span>
        </div>
      </div>

      {/* Passenger Details Card */}
      <div className="bg-slate-50 dark:bg-zinc-800/60 rounded-xl p-3.5 border border-slate-200/80 dark:border-zinc-700/60 space-y-2.5">
        <div className="flex items-center gap-2 text-slate-700 dark:text-zinc-300">
          <User className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="font-bold text-xs">Passenger Details</span>
        </div>

        <div>
          <p className="text-xs font-bold text-slate-900 dark:text-white">
            {passengerName}
          </p>

          <div className="flex items-center justify-between mt-1 text-[11px] font-mono text-slate-600 dark:text-zinc-300">
            <span className="flex items-center gap-1.5">
              <Phone className="w-3 h-3 text-slate-400" />
              <span>{passengerPhone}</span>
            </span>
            <button
              type="button"
              onClick={() => copyToClipboard(passengerPhone, 'phone')}
              className="text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
              title="Copy phone"
            >
              {copiedField === 'phone' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>

          <div className="flex items-center justify-between mt-1 text-[11px] font-mono text-slate-600 dark:text-zinc-300">
            <span className="flex items-center gap-1.5 truncate max-w-[190px]">
              <Mail className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate">{passengerEmail}</span>
            </span>
            <button
              type="button"
              onClick={() => copyToClipboard(passengerEmail, 'email')}
              className="text-slate-400 hover:text-blue-600 transition-colors cursor-pointer shrink-0 ml-1"
              title="Copy email"
            >
              {copiedField === 'email' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </div>

      {/* Ticket Information Card */}
      <div className="bg-slate-50 dark:bg-zinc-800/60 rounded-xl p-3.5 border border-slate-200/80 dark:border-zinc-700/60 space-y-2">
        <h4 className="font-bold text-[11px] text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
          Ticket Information
        </h4>

        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-zinc-400">Priority:</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60">
              {ticket.priority || 'Medium'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-zinc-400">Category:</span>
            <span className="font-semibold text-slate-800 dark:text-zinc-200">{ticket.subject || ticket.category || '1'}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-zinc-400">Status:</span>
            <span className={`font-bold ${isResolved ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'}`}>
              {ticket.status || 'Resolved'}
            </span>
          </div>

          <div className="flex items-center justify-between font-mono text-[11px]">
            <span className="text-slate-500 dark:text-zinc-400 font-sans">Created:</span>
            <span className="text-slate-700 dark:text-zinc-300">08/09/2026, 01:08 AM</span>
          </div>

          <div className="flex items-center justify-between font-mono text-[11px]">
            <span className="text-slate-500 dark:text-zinc-400 font-sans">Last Updated:</span>
            <span className="text-slate-700 dark:text-zinc-300">10/09/2026, 07:39 PM</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center gap-1.5 text-slate-700 dark:text-zinc-300 text-xs font-bold">
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          <span>Quick Actions</span>
        </div>

        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => {
              if (isResolved) {
                onUpdateTicketStatus?.(ticket.id, 'open', 'Reopened by Station Desk Support');
              } else {
                onUpdateTicketStatus?.(ticket.id, 'Resolved by Station Master', 'Resolved via Admin Console');
              }
            }}
            className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-zinc-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-zinc-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
            <span>{isResolved ? 'Reopen Ticket' : 'Mark Resolved'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              toast.success('Sahayak dispatch workflow initiated for ticket #' + ticket.id);
              onAssignSahayak?.(ticket);
            }}
            className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-zinc-700 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-zinc-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Assign to Sahayak</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const note = window.prompt('Enter internal operational note for ticket #' + ticket.id + ':');
              if (note) {
                toast.success('Internal note appended to ticket record');
                onAddNote?.(ticket.id, note);
              }
            }}
            className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-zinc-700 hover:border-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span>Add Internal Note</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 7. LIVE SUPPORT WORKSPACE (3-COLUMN DESK CONTAINER) ─────────────────────
function LiveSupportWorkspace({
  tickets = [],
  selectedTicketId = null,
  onSelectTicket,
  onUpdateTicketStatus,
  onOptimisticMessage,
  onRefresh,
  isRefreshing = false,
  onAssignSahayak,
  onAddNote,
}) {
  const selectedTicket =
    tickets.find(
      (t) => String(t.id).toLowerCase().replace('#', '') === String(selectedTicketId || '').toLowerCase().replace('#', '')
    ) ||
    tickets[0] ||
    null;

  return (
    <div
      id="live-support-workspace"
      className="bg-white dark:bg-zinc-900 border border-[#E5E7EB] dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden flex flex-col lg:flex-row h-[780px] min-h-[700px] font-sans"
    >
      <div className="w-full lg:w-[26%] shrink-0 h-full flex flex-col">
        <LiveSupportDeskList
          tickets={tickets}
          selectedTicketId={selectedTicket?.id}
          onSelectTicket={onSelectTicket}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
        />
      </div>

      <div className="flex-1 h-full min-w-0 flex flex-col">
        <TicketConversationPanel
          ticket={selectedTicket}
          onUpdateTicketStatus={onUpdateTicketStatus}
          onOptimisticMessage={onOptimisticMessage}
        />
      </div>

      <div className="hidden lg:flex w-[23%] shrink-0 h-full flex-col">
        <TicketContextPanel
          ticket={selectedTicket}
          onUpdateTicketStatus={onUpdateTicketStatus}
          onAssignSahayak={onAssignSahayak}
          onAddNote={onAddNote}
        />
      </div>
    </div>
  );
}

// ── 8. MASTER STATION DESK SUPPORT VIEW (DEFAULT EXPORT) ───────────────────
export default function StationDeskSupportView({
  supportTickets = [],
  setSupportTickets,
  selectedDeskTicketId = null,
  setSelectedDeskTicketId,
  ticketSearch = '',
  setTicketSearch,
  ticketStationFilter = 'ALL',
  setTicketStationFilter,
  ticketStatusFilter = 'ALL',
  setTicketStatusFilter,
  ticketPriorityFilter = 'ALL',
  setTicketPriorityFilter,
  ticketUpdatingId = null,
  handleUpdateTicketStatus,
  isRaiseTicketModalOpen = false,
  setIsRaiseTicketModalOpen,
  adminNewTicket,
  setAdminNewTicket,
  adminCreatingTicket = false,
  handleAdminCreateTicket,
  onRefresh,
  isRefreshing = false,
}) {
  const filteredTickets = useMemo(() => {
    return supportTickets.filter((t) => {
      if (ticketStationFilter !== 'ALL' && t.station !== ticketStationFilter) return false;
      if (ticketStatusFilter !== 'ALL') {
        const s = (t.status || '').toLowerCase();
        const f = ticketStatusFilter.toLowerCase();
        if (f === 'resolved' && !['resolved', 'closed', 'resolved by station master'].includes(s)) return false;
        if (f === 'in progress' && s !== 'in_progress' && s !== 'in progress') return false;
        if (f === 'dispatched' && s !== 'dispatched to station supervisor' && s !== 'open') return false;
        if (f === 'open' && s !== 'open') return false;
      }
      if (ticketPriorityFilter !== 'ALL') {
        const p = (t.priority || '').toLowerCase();
        const fp = ticketPriorityFilter.toLowerCase();
        if (fp === 'urgent' && p !== 'urgent' && p !== 'high') return false;
        if (fp === 'normal' && p !== 'normal' && p !== 'medium' && p !== 'low') return false;
      }
      if (ticketSearch && ticketSearch.trim()) {
        const q = ticketSearch.toLowerCase();
        const matches =
          (t.id && String(t.id).toLowerCase().includes(q)) ||
          (t.pnr && t.pnr.toLowerCase().includes(q)) ||
          (t.assistant_name && t.assistant_name.toLowerCase().includes(q)) ||
          (t.passengerName && t.passengerName.toLowerCase().includes(q)) ||
          (t.subject && t.subject.toLowerCase().includes(q)) ||
          (t.desc && t.desc.toLowerCase().includes(q)) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          (t.category && t.category.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [supportTickets, ticketStationFilter, ticketStatusFilter, ticketPriorityFilter, ticketSearch]);

  const totalDeskTickets = supportTickets.length;
  const pendingTicketsCount = useMemo(() => {
    return supportTickets.filter((t) =>
      ['dispatched to station supervisor', 'open', 'in_progress', 'bot_escalated'].includes((t.status || '').toLowerCase())
    ).length;
  }, [supportTickets]);

  const passengerInquiriesCount = useMemo(() => {
    return supportTickets.filter((t) => t.type === 'passenger' || Boolean(t.passengerName)).length;
  }, [supportTickets]);

  const sahayakOperationalCount = useMemo(() => {
    return supportTickets.filter((t) => t.type === 'assistant' || (!t.type && !t.passengerName)).length;
  }, [supportTickets]);

  const handleOptimisticMessage = (ticketId, newMsg) => {
    setSupportTickets?.((prev) =>
      prev.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              status: t.status === 'resolved' ? 'open' : t.status,
              conversation: [...(t.conversation || []), newMsg],
            }
          : t
      )
    );
  };

  return (
    <div className="space-y-5 animate-fade-in font-sans">
      {/* 1. Page Header */}
      <StationDeskPageHeader
        onRaiseTicket={() => setIsRaiseTicketModalOpen?.(true)}
      />

      {/* 2. 4-Card KPI Row */}
      <StationDeskKpiRow
        totalTickets={totalDeskTickets}
        activePending={pendingTicketsCount}
        passengerInquiries={passengerInquiriesCount}
        sahayakOperational={sahayakOperationalCount}
        onFilterAll={() => {
          setTicketStatusFilter?.('ALL');
          setTicketSearch?.('');
        }}
        onFilterActive={() => {
          setTicketStatusFilter?.('open');
        }}
        onFilterPassenger={() => {
          setTicketSearch?.('Passenger');
        }}
        onFilterSahayak={() => {
          setTicketSearch?.('Sahayak');
        }}
      />

      {/* 3. Ticket Ledger Card & Data Table */}
      <TicketLedger
        tickets={filteredTickets}
        searchQuery={ticketSearch}
        onSearchChange={setTicketSearch}
        stationFilter={ticketStationFilter}
        onStationChange={setTicketStationFilter}
        statusFilter={ticketStatusFilter}
        onStatusChange={setTicketStatusFilter}
        priorityFilter={ticketPriorityFilter}
        onPriorityChange={setTicketPriorityFilter}
        selectedTicketId={selectedDeskTicketId}
        onSelectTicket={(id) => setSelectedDeskTicketId?.(id)}
        onResolveTicket={(id) =>
          handleUpdateTicketStatus?.(id, 'Resolved by Station Master', 'Resolved via Admin Console')
        }
        ticketUpdatingId={ticketUpdatingId}
        pendingCount={pendingTicketsCount}
      />

      {/* 4. Three-Column Integrated Support Workspace */}
      <LiveSupportWorkspace
        tickets={supportTickets}
        selectedTicketId={selectedDeskTicketId}
        onSelectTicket={(id) => setSelectedDeskTicketId?.(id)}
        onUpdateTicketStatus={handleUpdateTicketStatus}
        onOptimisticMessage={handleOptimisticMessage}
        onRefresh={onRefresh}
        isRefreshing={isRefreshing}
        onAssignSahayak={(t) => {
          console.log('Dispatching sahayak for ticket:', t.id);
        }}
        onAddNote={(id, note) => {
          console.log('Appended internal note to ticket:', id, note);
        }}
      />

      {/* 5. Modal: Raise / Dispatch Support Ticket (Admin) */}
      {isRaiseTicketModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <LifeBuoy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white font-mono">
                    Raise Support Ticket
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Dispatch assistance or file station supervisor request
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRaiseTicketModalOpen?.(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdminCreateTicket} className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    Station Hub
                  </label>
                  <select
                    value={adminNewTicket?.station || 'KZJ'}
                    onChange={(e) => setAdminNewTicket?.({ ...adminNewTicket, station: e.target.value })}
                    className="input-base text-xs py-2 w-full bg-slate-50 dark:bg-zinc-950 border-slate-300 dark:border-zinc-700 rounded-xl"
                  >
                    {STATIONS.map((st) => (
                      <option key={st.code} value={st.code}>
                        {st.code} - {st.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    Requester Channel
                  </label>
                  <select
                    value={adminNewTicket?.type || 'passenger'}
                    onChange={(e) => setAdminNewTicket?.({ ...adminNewTicket, type: e.target.value })}
                    className="input-base text-xs py-2 w-full bg-slate-50 dark:bg-zinc-950 border-slate-300 dark:border-zinc-700 rounded-xl"
                  >
                    <option value="passenger">Passenger In-Transit</option>
                    <option value="assistant">Platform Sahayak / Staff</option>
                  </select>
                </div>
              </div>

              {adminNewTicket?.type === 'passenger' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 mb-1">
                      Passenger Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Ramesh Kumar"
                      value={adminNewTicket?.passengerName || ''}
                      onChange={(e) => setAdminNewTicket?.({ ...adminNewTicket, passengerName: e.target.value })}
                      className="input-base text-xs py-2 w-full bg-slate-50 dark:bg-zinc-950 border-slate-300 dark:border-zinc-700 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      placeholder="+91 98765 43210"
                      value={adminNewTicket?.passengerPhone || ''}
                      onChange={(e) => setAdminNewTicket?.({ ...adminNewTicket, passengerPhone: e.target.value })}
                      className="input-base text-xs py-2 w-full bg-slate-50 dark:bg-zinc-950 border-slate-300 dark:border-zinc-700 rounded-xl"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 mb-1">
                      Sahayak / Staff Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Suresh Porter"
                      value={adminNewTicket?.assistant_name || ''}
                      onChange={(e) => setAdminNewTicket?.({ ...adminNewTicket, assistant_name: e.target.value })}
                      className="input-base text-xs py-2 w-full bg-slate-50 dark:bg-zinc-950 border-slate-300 dark:border-zinc-700 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 mb-1">
                      Staff Phone / ID
                    </label>
                    <input
                      type="text"
                      placeholder="+91 98123 45678"
                      value={adminNewTicket?.assistant_phone || ''}
                      onChange={(e) => setAdminNewTicket?.({ ...adminNewTicket, assistant_phone: e.target.value })}
                      className="input-base text-xs py-2 w-full bg-slate-50 dark:bg-zinc-950 border-slate-300 dark:border-zinc-700 rounded-xl"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    Category
                  </label>
                  <select
                    value={adminNewTicket?.category || 'Booking'}
                    onChange={(e) => setAdminNewTicket?.({ ...adminNewTicket, category: e.target.value })}
                    className="input-base text-xs py-2 w-full bg-slate-50 dark:bg-zinc-950 border-slate-300 dark:border-zinc-700 rounded-xl"
                  >
                    <option value="Booking">Booking</option>
                    <option value="Payment">Payment</option>
                    <option value="Luggage Assistance">Luggage</option>
                    <option value="Platform Dispute">Dispute</option>
                    <option value="Emergency Support">Emergency</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={adminNewTicket?.priority || 'normal'}
                    onChange={(e) => setAdminNewTicket?.({ ...adminNewTicket, priority: e.target.value })}
                    className="input-base text-xs py-2 w-full bg-slate-50 dark:bg-zinc-950 border-slate-300 dark:border-zinc-700 rounded-xl"
                  >
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgent / High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    PNR Reference
                  </label>
                  <input
                    type="text"
                    placeholder="Optional PNR"
                    value={adminNewTicket?.pnr || ''}
                    onChange={(e) => setAdminNewTicket?.({ ...adminNewTicket, pnr: e.target.value })}
                    className="input-base text-xs py-2 w-full bg-slate-50 dark:bg-zinc-950 border-slate-300 dark:border-zinc-700 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Ticket Subject / Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Brief summary of assistance required"
                  value={adminNewTicket?.subject || ''}
                  onChange={(e) => setAdminNewTicket?.({ ...adminNewTicket, subject: e.target.value })}
                  className="input-base text-xs py-2 w-full bg-slate-50 dark:bg-zinc-950 border-slate-300 dark:border-zinc-700 rounded-xl font-sans"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Operational Description / Log *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Detail the issue, passenger location, coach/platform details..."
                  value={adminNewTicket?.description || ''}
                  onChange={(e) => setAdminNewTicket?.({ ...adminNewTicket, description: e.target.value })}
                  className="input-base text-xs py-2 w-full bg-slate-50 dark:bg-zinc-950 border-slate-300 dark:border-zinc-700 rounded-xl resize-none font-sans"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsRaiseTicketModalOpen?.(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adminCreatingTicket}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 text-white rounded-xl font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
                >
                  <span>{adminCreatingTicket ? 'Dispatching...' : 'Dispatch Ticket'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
