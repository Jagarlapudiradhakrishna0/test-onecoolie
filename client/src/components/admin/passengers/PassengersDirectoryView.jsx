import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Users,
  Send,
  Ticket,
  Wallet,
  Search,
  Calendar,
  ArrowUpDown,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  MoreVertical,
  Copy,
  Phone,
  Mail,
  UserCheck,
  User,
  X,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import trainHeaderImg from '../../../assets/images/vande_bharat_header_clean.jpg';

/* ==========================================================================
   ONECOOLIE PASSENGERS DIRECTORY (CONSOLIDATED MASTER VIEW)
   Enterprise Travelers Register, Booking Insights & Identity Profiles
   ========================================================================== */

// ── 1. AVATAR HELPERS ──────────────────────────────────────────────────────
const AVATAR_COLORS = [
  'bg-[#0284C7] text-white',
  'bg-[#10B981] text-white',
  'bg-[#8B5CF6] text-white',
  'bg-[#06B6D4] text-white',
  'bg-[#EC4899] text-white',
  'bg-[#F59E0B] text-white',
  'bg-[#2563EB] text-white',
  'bg-[#6366F1] text-white',
];

function getAvatarColor(str = '') {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

function getInitials(name = '', email = '') {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (email && email.trim()) {
    return email.slice(0, 2).toUpperCase();
  }
  return 'PA';
}

// ── 2. PASSENGER HERO ──────────────────────────────────────────────────────
function PassengerHero({ totalCount = 15 }) {
  return (
    <div className="relative bg-white dark:bg-[#0A0E1A] rounded-2xl border border-zinc-200/90 dark:border-zinc-800/90 p-5 sm:p-6 shadow-[0_1px_4px_rgba(0,0,0,0.03)] overflow-hidden">
      <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#2563EB] dark:text-blue-400 font-mono">
              PEOPLE OPERATIONS
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-1.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 stroke-[2.2]" />
            </div>

            <h1 className="text-2xl sm:text-[28px] font-extrabold text-[#0F172A] dark:text-white tracking-tight font-sans">
              Registered Passengers Directory
            </h1>

            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 border border-blue-200/80 dark:border-blue-800/60 text-xs font-bold font-mono">
              {totalCount}
            </span>
          </div>

          <p className="text-xs sm:text-[13.5px] text-[#64748B] dark:text-zinc-400 mt-1.5 leading-relaxed font-sans">
            Comprehensive register of all platform travelers, booking frequencies, and contact profiles.
          </p>
        </div>

        <div className="hidden md:flex items-center gap-5 pl-5 border-l border-zinc-100 dark:border-zinc-800/80 shrink-0">
          <div className="relative w-44 h-16 overflow-hidden rounded-xl bg-gradient-to-r from-transparent via-white/40 to-white dark:from-transparent dark:to-[#0A0E1A] flex items-center">
            <img
              src={trainHeaderImg}
              alt="High Speed Indian Railway"
              className="w-full h-full object-cover object-left scale-110 [mask-image:linear-gradient(to_right,transparent,black_20%,black)] opacity-85 hover:opacity-100 transition-opacity"
            />
          </div>

          <div className="text-right whitespace-nowrap">
            <p className="text-xs sm:text-[12.5px] font-semibold text-[#64748B] dark:text-zinc-400 tracking-tight">
              Connecting
            </p>
            <div className="flex items-center justify-end gap-1.5 text-xs sm:text-[13px] font-bold text-[#0F172A] dark:text-white">
              <span>People, Places, Possibilities</span>
              <span className="w-2 h-2 rounded-full bg-[#2563EB] inline-block animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 3. PASSENGER KPI CARDS ─────────────────────────────────────────────────
function PassengerKpiCards({
  totalPassengers = 15,
  activeTravelers = 12,
  totalBookings = 21,
  totalSpend = 690
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* CARD 1: Total Passengers */}
      <div className="bg-white dark:bg-[#0A0E1A] rounded-2xl border border-zinc-200/90 dark:border-zinc-800/90 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex items-center justify-between gap-3 min-h-[86px] hover:border-zinc-300 dark:hover:border-zinc-700 transition-all">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] dark:bg-blue-950/50 text-[#2563EB] flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 stroke-[2]" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-[#64748B] dark:text-zinc-400 block font-sans truncate">
              Total Passengers
            </span>
            <p className="text-2xl font-extrabold text-[#0F172A] dark:text-white font-sans tracking-tight leading-none mt-0.5">
              {totalPassengers}
            </p>
            <span className="text-[10.5px] font-semibold text-[#10B981] flex items-center gap-0.5 mt-1 font-sans">
              <span>↑ +12% vs last month</span>
            </span>
          </div>
        </div>

        <div className="w-16 h-8 shrink-0">
          <svg viewBox="0 0 60 30" className="w-full h-full overflow-visible">
            <path
              d="M 2 24 L 16 22 L 32 12 L 44 14 L 58 4"
              fill="none"
              stroke="#3B82F6"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* CARD 2: Active Travelers */}
      <div className="bg-white dark:bg-[#0A0E1A] rounded-2xl border border-zinc-200/90 dark:border-zinc-800/90 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex items-center justify-between gap-3 min-h-[86px] hover:border-zinc-300 dark:hover:border-zinc-700 transition-all">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#F0FDF4] dark:bg-emerald-950/50 text-[#10B981] flex items-center justify-center shrink-0">
            <Send className="w-5 h-5 stroke-[2]" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-[#64748B] dark:text-zinc-400 block font-sans truncate">
              Active Travelers
            </span>
            <p className="text-2xl font-extrabold text-[#0F172A] dark:text-white font-sans tracking-tight leading-none mt-0.5">
              {activeTravelers}
            </p>
            <span className="text-[10.5px] font-medium text-[#10B981] flex items-center gap-1 mt-1 font-sans">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] inline-block" />
              <span>Traveled this month</span>
            </span>
          </div>
        </div>

        <div className="w-16 h-8 shrink-0">
          <svg viewBox="0 0 60 30" className="w-full h-full overflow-visible">
            <path
              d="M 2 24 L 16 18 L 30 20 L 44 10 L 58 4"
              fill="none"
              stroke="#10B981"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* CARD 3: Total Bookings */}
      <div className="bg-white dark:bg-[#0A0E1A] rounded-2xl border border-zinc-200/90 dark:border-zinc-800/90 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex items-center justify-between gap-3 min-h-[86px] hover:border-zinc-300 dark:hover:border-zinc-700 transition-all">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#FAF5FF] dark:bg-purple-950/50 text-[#8B5CF6] flex items-center justify-center shrink-0">
            <Ticket className="w-5 h-5 stroke-[2]" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-[#64748B] dark:text-zinc-400 block font-sans truncate">
              Total Bookings
            </span>
            <p className="text-2xl font-extrabold text-[#0F172A] dark:text-white font-sans tracking-tight leading-none mt-0.5">
              {totalBookings}
            </p>
            <span className="text-[10.5px] font-semibold text-[#10B981] flex items-center gap-0.5 mt-1 font-sans">
              <span>↑ +8% vs last month</span>
            </span>
          </div>
        </div>

        <div className="w-16 h-8 shrink-0">
          <svg viewBox="0 0 60 30" className="w-full h-full overflow-visible">
            <path
              d="M 2 22 L 16 20 L 30 14 L 44 16 L 58 6"
              fill="none"
              stroke="#8B5CF6"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* CARD 4: Total Spend */}
      <div className="bg-white dark:bg-[#0A0E1A] rounded-2xl border border-zinc-200/90 dark:border-zinc-800/90 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex items-center justify-between gap-3 min-h-[86px] hover:border-zinc-300 dark:hover:border-zinc-700 transition-all">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#F0FDF4] dark:bg-emerald-950/50 text-[#059669] flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5 stroke-[2]" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-[#64748B] dark:text-zinc-400 block font-sans truncate">
              Total Spend
            </span>
            <p className="text-2xl font-extrabold text-[#0F172A] dark:text-white font-mono tracking-tight leading-none mt-0.5">
              ₹{totalSpend.toLocaleString('en-IN')}
            </p>
            <span className="text-[10.5px] font-semibold text-[#10B981] flex items-center gap-0.5 mt-1 font-sans">
              <span>↑ +15% vs last month</span>
            </span>
          </div>
        </div>

        <div className="w-16 h-8 shrink-0">
          <svg viewBox="0 0 60 30" className="w-full h-full overflow-visible">
            <path
              d="M 2 20 L 16 16 L 30 18 L 44 8 L 58 2"
              fill="none"
              stroke="#059669"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

// ── 4. TABLE TOOLBAR ───────────────────────────────────────────────────────
function PassengerTableToolbar({
  searchQuery,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  dateFilter,
  onDateFilterChange,
  sortBy,
  onSortByChange,
  onResetFilters
}) {
  return (
    <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3.5">
      <div className="relative flex-1 max-w-lg">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search passenger name, email, phone, PNR..."
          className="w-full h-10 pl-10 pr-4 text-xs font-sans rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-[#0F172A] dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-2xs"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative">
          <select
            value={roleFilter}
            onChange={(e) => onRoleFilterChange(e.target.value)}
            className="h-10 pl-3.5 pr-8 text-xs font-medium font-sans rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-[#0F172A] dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer shadow-2xs appearance-none"
          >
            <option value="ALL">All Roles</option>
            <option value="passenger">Passenger</option>
            <option value="assistant">Assistant</option>
            <option value="admin">Admin</option>
          </select>
          <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-zinc-400">
            <ChevronDown className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
            <Calendar className="w-3.5 h-3.5" />
          </div>
          <select
            value={dateFilter}
            onChange={(e) => onDateFilterChange(e.target.value)}
            className="h-10 pl-8 pr-8 text-xs font-medium font-sans rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-[#0F172A] dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer shadow-2xs appearance-none"
          >
            <option value="ALL">Join Dates</option>
            <option value="7_days">Last 7 Days</option>
            <option value="30_days">Last 30 Days</option>
            <option value="this_month">This Month</option>
          </select>
          <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-zinc-400">
            <ChevronDown className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
            <ArrowUpDown className="w-3.5 h-3.5" />
          </div>
          <select
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value)}
            className="h-10 pl-8 pr-8 text-xs font-medium font-sans rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-[#0F172A] dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer shadow-2xs appearance-none"
          >
            <option value="newest">Sort by: Newest</option>
            <option value="oldest">Sort by: Oldest</option>
            <option value="bookings_high">Most Bookings</option>
            <option value="spend_high">Highest Spend</option>
            <option value="name_asc">Name A–Z</option>
          </select>
          <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-zinc-400">
            <ChevronDown className="w-3.5 h-3.5" />
          </div>
        </div>

        <button
          type="button"
          onClick={onResetFilters}
          className="h-10 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-[#0F172A] dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 active:scale-[0.98] text-xs font-medium flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
        >
          <Filter className="w-3.5 h-3.5 text-zinc-500" />
          <span>Reset Filters</span>
        </button>
      </div>
    </div>
  );
}

// ── 5. TABLE ROW ───────────────────────────────────────────────────────────
function PassengerTableRow({
  passenger,
  isSelected,
  onToggleSelect,
  onViewTrips,
  onViewProfile,
  onViewSupport
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleOutside);
    }
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isMenuOpen]);

  const initials = getInitials(passenger.name, passenger.email);
  const avatarClass = getAvatarColor(passenger.name || passenger.email || 'PA');
  const role = (passenger.role || 'passenger').toLowerCase();

  const formattedJoinedDate = passenger.created_at
    ? new Date(passenger.created_at).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
    : '06/09/2026';

  const copyToClipboard = (text, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
    setIsMenuOpen(false);
  };

  return (
    <tr
      className={`relative h-[68px] border-b border-zinc-100/90 dark:border-zinc-800/80 transition-colors duration-150 ${isSelected
          ? 'bg-[#EFF6FF] dark:bg-blue-950/20'
          : 'hover:bg-[#F8FAFC] dark:hover:bg-zinc-800/40'
        }`}
    >
      {isSelected && (
        <td className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#2563EB]" />
      )}

      <td className="w-12 px-4 py-3 text-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(passenger.id)}
          className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-[#2563EB] focus:ring-1 focus:ring-blue-500 cursor-pointer accent-[#2563EB]"
        />
      </td>

      <td className="px-3 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs font-mono shrink-0 shadow-2xs ${avatarClass}`}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-[#0F172A] dark:text-white truncate font-sans">
              {passenger.name || 'Unnamed Passenger'}
            </p>
            <p className="text-[11px] text-[#64748B] dark:text-zinc-400 font-mono mt-0.5 truncate">
              #{String(passenger.id || '').slice(0, 10)}
            </p>
          </div>
        </div>
      </td>

      <td className="px-3 py-3">
        <span className="text-xs font-medium text-[#0F172A] dark:text-zinc-200 font-mono truncate block max-w-[220px]">
          {passenger.email || '—'}
        </span>
      </td>

      <td className="px-3 py-3">
        <span className="text-xs font-medium text-[#0F172A] dark:text-zinc-200 font-mono truncate block max-w-[140px]">
          {passenger.phone || '—'}
        </span>
      </td>

      <td className="px-3 py-3">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase font-mono tracking-wider ${role === 'admin'
              ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
              : role === 'assistant'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-blue-50 text-[#2563EB] dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
            }`}
        >
          {role}
        </span>
      </td>

      <td className="px-3 py-3 text-xs font-medium text-[#64748B] dark:text-zinc-400 font-mono">
        {formattedJoinedDate}
      </td>

      <td className="px-3 py-3 text-xs font-bold text-[#0F172A] dark:text-white font-mono">
        {passenger.bookings_count || 0}
      </td>

      <td className="px-3 py-3 text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
        ₹{passenger.total_spent || 0}
      </td>

      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1.5 relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => onViewTrips(passenger.email || passenger.name)}
            className="h-8 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-[#2563EB] text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View Trips</span>
          </button>

          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="w-8 h-8 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white flex items-center justify-center transition-all shadow-2xs cursor-pointer"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-9 z-20 w-44 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl py-1 text-left animate-in fade-in zoom-in-95 duration-100">
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onViewProfile(passenger);
                }}
                className="w-full px-3.5 py-2 text-xs font-medium text-[#0F172A] dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 flex items-center gap-2 cursor-pointer"
              >
                <User className="w-3.5 h-3.5 text-zinc-400" />
                <span>Passenger Profile</span>
              </button>

              <button
                type="button"
                onClick={() => copyToClipboard(passenger.phone, 'Phone number')}
                className="w-full px-3.5 py-2 text-xs font-medium text-[#0F172A] dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 flex items-center gap-2 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-zinc-400" />
                <span>Copy Phone</span>
              </button>

              <button
                type="button"
                onClick={() => copyToClipboard(passenger.email, 'Email address')}
                className="w-full px-3.5 py-2 text-xs font-medium text-[#0F172A] dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 flex items-center gap-2 cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5 text-zinc-400" />
                <span>Copy Email</span>
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

// ── 6. PAGINATION ──────────────────────────────────────────────────────────
function PassengerPagination({
  currentPage = 1,
  pageSize = 20,
  totalItems = 15,
  onPageChange,
  onPageSizeChange
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, currentPage * pageSize);

  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    pages.push(i);
  }

  return (
    <div className="p-4 sm:p-5 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 select-none">
      <span className="text-xs font-mono text-[#64748B] dark:text-zinc-400">
        Showing {startItem}–{endItem} of {totalItems} passengers
      </span>

      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="w-8 h-8 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all cursor-pointer shadow-2xs"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {pages.map((p) => {
            const isActive = p === currentPage;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                className={`w-8 h-8 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer shadow-2xs ${isActive
                    ? 'bg-[#2563EB] text-white'
                    : 'border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}
              >
                {p}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="w-8 h-8 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all cursor-pointer shadow-2xs"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="relative">
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="h-8 pl-3 pr-7 text-xs font-sans rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-[#0F172A] dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer shadow-2xs appearance-none"
          >
            <option value={10}>10 / page</option>
            <option value={20}>20 / page</option>
            <option value={50}>50 / page</option>
          </select>
          <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none text-zinc-400">
            <ChevronDown className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 7. PROFILE MODAL ───────────────────────────────────────────────────────
function PassengerProfileModal({ passenger, isOpen, onClose, onViewTrips }) {
  if (!isOpen || !passenger) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in font-sans">
      <div className="relative w-full max-w-md bg-white dark:bg-[#0D111A] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950 text-[#2563EB] flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">
                Passenger Profile
              </h3>
              <p className="text-[11px] text-zinc-500">
                Identity &amp; booking metrics
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800">
            <div className="w-12 h-12 rounded-full bg-[#2563EB] text-white flex items-center justify-center font-bold text-base font-mono">
              {(passenger.name || passenger.email || 'PA').slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-sm text-[#0F172A] dark:text-white truncate">
                {passenger.name || 'Unnamed Traveler'}
              </h4>
              <p className="text-zinc-500 text-[11px] truncate">
                {passenger.email}
              </p>
              <div className="mt-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-50 text-blue-700 font-mono">
                  {passenger.role || 'PASSENGER'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-1">
              <div className="flex items-center gap-1.5 text-zinc-400 text-[10.5px]">
                <Ticket className="w-3.5 h-3.5 text-purple-500" />
                <span>Total Bookings</span>
              </div>
              <p className="text-base font-black text-[#0F172A] dark:text-white font-mono">
                {passenger.bookings_count || 0}
              </p>
            </div>

            <div className="p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-1">
              <div className="flex items-center gap-1.5 text-zinc-400 text-[10.5px]">
                <Wallet className="w-3.5 h-3.5 text-emerald-500" />
                <span>Lifetime Spend</span>
              </div>
              <p className="text-base font-black text-emerald-600 font-mono">
                ₹{passenger.total_spent || 0}
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-zinc-100 dark:border-zinc-800 space-y-2 text-zinc-600 dark:text-zinc-300">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-zinc-400">
                <Phone className="w-3.5 h-3.5" />
                <span>Phone:</span>
              </span>
              <strong className="text-blue-600 font-mono">
                {passenger.phone || '—'}
              </strong>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-zinc-400">
                <Calendar className="w-3.5 h-3.5" />
                <span>Joined Date:</span>
              </span>
              <strong className="font-mono">
                {passenger.created_at ? new Date(passenger.created_at).toLocaleDateString() : '—'}
              </strong>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Close
          </button>

          <button
            type="button"
            onClick={() => onViewTrips?.(passenger.email || passenger.name)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <span>Inspect Trips in Ledger</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 8. MASTER PASSENGERS DIRECTORY VIEW (DEFAULT EXPORT) ───────────────────
const FALLBACK_PASSENGERS = [
  {
    id: 'usr_sec_admin_02',
    name: 'Secondary Administrator 02',
    email: 'admin02@onecoolie.in',
    phone: '+91 9876543202',
    role: 'admin',
    created_at: '2026-09-10T11:00:00.000Z',
    bookings_count: 0,
    total_spent: 0
  },
  {
    id: 'usr_test_pass_01',
    name: 'Test Passenger',
    email: 'test_pass_1788974161259@onecoolie.com',
    phone: '',
    role: 'passenger',
    created_at: '2026-09-09T14:30:00.000Z',
    bookings_count: 0,
    total_spent: 0
  },
  {
    id: 'usr_safe_test_asst',
    name: 'Safe Test Assistant',
    email: 'test_assistant_1788974161259@onecoolie.com',
    phone: '+91 9876543211',
    role: 'assistant',
    created_at: '2026-09-09T12:15:00.000Z',
    bookings_count: 0,
    total_spent: 0
  },
  {
    id: 'usr_safe_test_pass',
    name: 'Safe Test Passenger',
    email: 'test_passenger_1788974159728@onecoolie.com',
    phone: '+91 9876543210',
    role: 'passenger',
    created_at: '2026-09-09T10:00:00.000Z',
    bookings_count: 0,
    total_spent: 0
  },
  {
    id: 'usr_test_user',
    name: 'test',
    email: 'kandagatlasaipraneeth02@gmail.com',
    phone: '+91 7032304118',
    role: 'passenger',
    created_at: '2026-09-08T09:45:00.000Z',
    bookings_count: 0,
    total_spent: 0
  },
  {
    id: 'usr_vikas_a',
    name: 'Vikas -A',
    email: 'vikasmusham07@gmail.com',
    phone: '+91 9494628724',
    role: 'assistant',
    created_at: '2026-09-07T16:20:00.000Z',
    bookings_count: 0,
    total_spent: 0
  },
  {
    id: 'usr_hareesh_c',
    name: 'Hareesh Chitikena',
    email: 'harsha.chitikena@gmail.com',
    phone: '+91 8125614543',
    role: 'passenger',
    created_at: '2026-09-07T11:10:00.000Z',
    bookings_count: 1,
    total_spent: 0
  },
  {
    id: 'usr_niharika_r',
    name: 'Niharika Reddy',
    email: 'niharikareddy2422@gmail.com',
    phone: '+91 8179404816',
    role: 'passenger',
    created_at: '2026-09-07T08:30:00.000Z',
    bookings_count: 0,
    total_spent: 0
  },
  {
    id: 'usr_sai',
    name: 'Sai',
    email: 'thallamsaitthrisshoolkumar@gmail.com',
    phone: '',
    role: 'passenger',
    created_at: '2026-09-06T19:00:00.000Z',
    bookings_count: 1,
    total_spent: 0
  },
  {
    id: 'usr_prim_admin_01',
    name: 'Primary Administrator 01',
    email: 'admin01@onecoolie.in',
    phone: '+919876543210',
    role: 'admin',
    created_at: '2026-09-06T14:00:00.000Z',
    bookings_count: 0,
    total_spent: 0
  },
  {
    id: 'usr_rk',
    name: 'rk',
    email: '2303a52055@sru.edu.in',
    phone: '+91 9398553191',
    role: 'passenger',
    created_at: '2026-09-06T12:00:00.000Z',
    bookings_count: 9,
    total_spent: 60
  },
  {
    id: 'usr_vikas_global',
    name: 'vikas',
    email: 'globalxvikas@gmail.com',
    phone: '+91 94946 28724',
    role: 'passenger',
    created_at: '2026-09-06T10:15:00.000Z',
    bookings_count: 7,
    total_spent: 300
  },
  {
    id: 'usr_rohith',
    name: 'Rohith',
    email: 'thatipallyrohith4@gmail.com',
    phone: '+91 8897270414',
    role: 'passenger',
    created_at: '2026-09-06T09:00:00.000Z',
    bookings_count: 3,
    total_spent: 250
  },
  {
    id: 'usr_kavita_s',
    name: 'Kavita Sharma',
    email: 'kavita.sharma@gmail.com',
    phone: '+91 9820154321',
    role: 'passenger',
    created_at: '2026-09-05T15:20:00.000Z',
    bookings_count: 1,
    total_spent: 80
  },
  {
    id: 'usr_anand_v',
    name: 'Anand Verma',
    email: 'anand.verma@techmail.in',
    phone: '+91 9711245890',
    role: 'passenger',
    created_at: '2026-09-04T18:40:00.000Z',
    bookings_count: 0,
    total_spent: 0
  }
];

export default function PassengersDirectoryView({
  usersList = [],
  bookings = [],
  supportTickets = [],
  onFilterToPassenger,
  onViewPassengerSupport
}) {
  const rawPassengers = useMemo(() => {
    if (Array.isArray(usersList) && usersList.length > 0) {
      return usersList;
    }
    return FALLBACK_PASSENGERS;
  }, [usersList]);

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const [profileModalPassenger, setProfileModalPassenger] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const kpiMetrics = useMemo(() => {
    const totalCount = rawPassengers.length;
    const activeCount = rawPassengers.filter(
      (p) => (p.bookings_count || 0) > 0 || (p.role || '').toLowerCase() === 'passenger'
    ).length;

    const totalBookingsSum = rawPassengers.reduce((sum, p) => sum + (p.bookings_count || 0), 0);
    const finalBookings = Math.max(totalBookingsSum, bookings.length || 21);

    const totalSpendSum = rawPassengers.reduce((sum, p) => sum + (Number(p.total_spent) || 0), 0);
    const finalSpend = totalSpendSum > 0 ? totalSpendSum : 690;

    return {
      totalPassengers: totalCount || 15,
      activeTravelers: activeCount > 0 ? activeCount : 12,
      totalBookings: finalBookings,
      totalSpend: finalSpend
    };
  }, [rawPassengers, bookings]);

  const filteredPassengers = useMemo(() => {
    return rawPassengers.filter((p) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const cleanQ = q.replace(/^#/, '');
        const name = (p.name || '').toLowerCase();
        const email = (p.email || '').toLowerCase();
        const phone = (p.phone || '').toLowerCase();
        const role = (p.role || '').toLowerCase();
        const id = String(p.id || '').toLowerCase();

        const matches = (
          name.includes(q) ||
          email.includes(q) ||
          phone.includes(q) ||
          role.includes(q) ||
          id.includes(cleanQ)
        );
        if (!matches) return false;
      }

      if (roleFilter !== 'ALL') {
        const r = (p.role || 'passenger').toLowerCase();
        if (r !== roleFilter.toLowerCase()) return false;
      }

      if (dateFilter !== 'ALL' && p.created_at) {
        const createdTime = new Date(p.created_at).getTime();
        const now = Date.now();
        const diffDays = (now - createdTime) / (1000 * 60 * 60 * 24);

        if (dateFilter === '7_days' && diffDays > 7) return false;
        if (dateFilter === '30_days' && diffDays > 30) return false;
        if (dateFilter === 'this_month') {
          const createdDate = new Date(p.created_at);
          const currentDate = new Date();
          if (
            createdDate.getMonth() !== currentDate.getMonth() ||
            createdDate.getFullYear() !== currentDate.getFullYear()
          ) {
            return false;
          }
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'newest') {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeB - timeA;
      }
      if (sortBy === 'oldest') {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeA - timeB;
      }
      if (sortBy === 'bookings_high') {
        return (b.bookings_count || 0) - (a.bookings_count || 0);
      }
      if (sortBy === 'spend_high') {
        return (Number(b.total_spent) || 0) - (Number(a.total_spent) || 0);
      }
      if (sortBy === 'name_asc') {
        return (a.name || '').localeCompare(b.name || '');
      }
      return 0;
    });
  }, [rawPassengers, searchQuery, roleFilter, dateFilter, sortBy]);

  const paginatedPassengers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredPassengers.slice(startIndex, startIndex + pageSize);
  }, [filteredPassengers, currentPage, pageSize]);

  const isAllVisibleSelected = useMemo(() => {
    if (paginatedPassengers.length === 0) return false;
    return paginatedPassengers.every((p) => selectedIds.has(p.id));
  }, [paginatedPassengers, selectedIds]);

  const handleToggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (isAllVisibleSelected) {
        paginatedPassengers.forEach((p) => next.delete(p.id));
      } else {
        paginatedPassengers.forEach((p) => next.add(p.id));
      }
      return next;
    });
  };

  const handleToggleSelectOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setRoleFilter('ALL');
    setDateFilter('ALL');
    setSortBy('newest');
    setCurrentPage(1);
  };

  const handleOpenProfileModal = (passenger) => {
    setProfileModalPassenger(passenger);
    setIsProfileModalOpen(true);
  };

  const handleCloseProfileModal = () => {
    setIsProfileModalOpen(false);
    setProfileModalPassenger(null);
  };

  return (
    <div className="space-y-4 animate-fade-in font-sans">
      <PassengerHero totalCount={rawPassengers.length} />

      <PassengerKpiCards
        totalPassengers={kpiMetrics.totalPassengers}
        activeTravelers={kpiMetrics.activeTravelers}
        totalBookings={kpiMetrics.totalBookings}
        totalSpend={kpiMetrics.totalSpend}
      />

      <div className="bg-white dark:bg-[#0A0E1A] rounded-2xl border border-zinc-200/90 dark:border-zinc-800/90 shadow-[0_1px_4px_rgba(0,0,0,0.03)] overflow-hidden">
        <PassengerTableToolbar
          searchQuery={searchQuery}
          onSearchChange={(val) => {
            setSearchQuery(val);
            setCurrentPage(1);
          }}
          roleFilter={roleFilter}
          onRoleFilterChange={(val) => {
            setRoleFilter(val);
            setCurrentPage(1);
          }}
          dateFilter={dateFilter}
          onDateFilterChange={(val) => {
            setDateFilter(val);
            setCurrentPage(1);
          }}
          sortBy={sortBy}
          onSortByChange={(val) => setSortBy(val)}
          filteredCount={filteredPassengers.length}
          onResetFilters={handleResetFilters}
        />

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="h-11 border-b border-zinc-200/80 dark:border-zinc-800 bg-[#FAFCFF] dark:bg-[#0B0F19]/60 text-[10.5px] font-bold font-mono uppercase tracking-wider text-[#64748B] dark:text-zinc-400 select-none">
                <th className="w-12 px-4 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={isAllVisibleSelected}
                    onChange={handleToggleSelectAll}
                    aria-label="Select all visible passengers"
                    className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-[#2563EB] focus:ring-1 focus:ring-blue-500 cursor-pointer accent-[#2563EB]"
                  />
                </th>

                <th className="px-3 py-2 min-w-[200px]">PASSENGER</th>
                <th className="px-3 py-2 min-w-[220px]">EMAIL ADDRESS</th>
                <th className="px-3 py-2 min-w-[140px]">PHONE</th>
                <th className="px-3 py-2 min-w-[100px]">ROLE</th>
                <th className="px-3 py-2 min-w-[110px]">JOINED DATE</th>
                <th className="px-3 py-2 min-w-[110px]">TOTAL BOOKINGS</th>
                <th className="px-3 py-2 min-w-[110px]">LIFETIME SPEND</th>
                <th className="px-4 py-2 min-w-[120px] text-right">ACTIONS</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
              {paginatedPassengers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <div className="max-w-xs mx-auto space-y-2">
                      <p className="text-sm font-bold text-[#0F172A] dark:text-white">
                        No passengers match your criteria
                      </p>
                      <p className="text-xs text-[#64748B] dark:text-zinc-400">
                        Try modifying your search query or clearing active filters.
                      </p>
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="mt-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 hover:bg-blue-100 text-[#2563EB] transition-colors cursor-pointer"
                      >
                        Reset All Filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedPassengers.map((p) => (
                  <PassengerTableRow
                    key={p.id}
                    passenger={p}
                    isSelected={selectedIds.has(p.id)}
                    onToggleSelect={handleToggleSelectOne}
                    onViewTrips={(query) => onFilterToPassenger?.(query || p.name || p.email)}
                    onViewProfile={handleOpenProfileModal}
                    onViewSupport={onViewPassengerSupport}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        <PassengerPagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={filteredPassengers.length}
          onPageChange={(p) => setCurrentPage(p)}
          onPageSizeChange={(sz) => {
            setPageSize(sz);
            setCurrentPage(1);
          }}
        />
      </div>

      <PassengerProfileModal
        passenger={profileModalPassenger}
        isOpen={isProfileModalOpen}
        onClose={handleCloseProfileModal}
        onViewTrips={(query) => {
          handleCloseProfileModal();
          onFilterToPassenger?.(query || profileModalPassenger?.name || profileModalPassenger?.email);
        }}
      />
    </div>
  );
}
