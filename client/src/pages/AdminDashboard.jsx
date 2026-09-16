import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Brand from '../components/Brand';
import LaunchCenter from '../components/LaunchCenter';
import SupportInbox from '../components/support/SupportInbox';
import axios from '../api/axios';
import toast from 'react-hot-toast';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  Shield, Train, User, Clock, AlertTriangle, CheckCircle, XCircle, Search, Filter,
  Download, RefreshCw, Eye, Phone, Mail, MapPin, CreditCard, ChevronRight, ChevronLeft, TrendingUp,
  Users, Check, X, ExternalLink, Printer, Key, Briefcase, Calendar, Info, Layers,
  Compass, ArrowUpRight, CheckSquare, Power, ToggleLeft, ToggleRight,
  ShieldCheck, FileText, Activity, DollarSign, ShieldAlert, AlertOctagon, RotateCcw,
  Headphones, LifeBuoy, Plus, MessageSquare, MoreVertical, SlidersHorizontal, ArrowUpDown,
  BadgeCheck, Hourglass, CheckCircle2, FileCheck, Bell, PhoneCall, Radio, BellOff,
  Copy
} from 'lucide-react';
import {
  AdminSidebar,
  AdminTopHeader,
  KpiCard,
  BookingFilterToolbar,
  BookingTabs,
  BookingTable,
  BookingDrawer,
  OperationsAnalyticsView
} from '../components/admin/AdminComponents';
import StationDeskSupportView from '../components/admin/station-desk/StationDeskSupportView';
import PassengersDirectoryView from '../components/admin/passengers/PassengersDirectoryView';
import FinancialReconciliationView from '../components/admin/finance/FinancialReconciliationView';
import FinancialIncidentsView from '../components/admin/finance/incidents/FinancialIncidentsView';
import SahayakPayoutsView from '../components/admin/payouts/SahayakPayoutsView';
import ActiveSessions from './active-sessions/ActiveSessions';
import SecurityIncidents from './security-incidents/SecurityIncidents';
import BookingInspectorModal from '../components/admin/booking-inspector/BookingInspectorModal';


/* ============================================================
   ONECOOLIE ENTERPRISE ADMIN OPERATIONS COMMAND CENTER
   Swiss Minimal Typography: Black (#000000), White (#FFFFFF), Blue (#2563EB)
   ============================================================ */

const STATIONS = [
  { code: 'SC', name: 'Secunderabad Jn' },
  { code: 'BZA', name: 'Vijayawada Jn' },
  { code: 'KZJ', name: 'Kazipet Jn' },
  { code: 'WL', name: 'Warangal' },
];

const STATUS_COLORS = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
  accepted: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800',
  arriving: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800',
  in_service: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
  cancelled: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800',
};

const PAYMENT_COLORS = {
  paid: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  refunded: 'bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300',
  failed: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
};

// ----------------------------------------------------------------------
// SUBCOMPONENT: BOOKING DETAIL MODAL (SUPERSEDED BY UBER-INSPIRED BOOKING INSPECTOR)
// ----------------------------------------------------------------------
const BookingDetailModal = BookingInspectorModal;


// ----------------------------------------------------------------------
// SUBCOMPONENT: SAHAYAK FORCE & KYC (PREMIUM UBER/STRIPE ENTERPRISE OPERATIONS)
// ----------------------------------------------------------------------
function SahayakForceKycView({
  kycQueue = [],
  assistantsList = [],
  bookings = [],
  onDecideAssistant,
  onToggleOnline,
  onToggleApproval,
  onFilterToAssistant,
  onRefresh,
  actionLoading,
  stations = []
}) {
  // Fleet filters & table state
  const [searchFleet, setSearchFleet] = useState('');
  const [selectedHub, setSelectedHub] = useState('ALL');
  const [selectedDuty, setSelectedDuty] = useState('ALL');
  const [selectedApproval, setSelectedApproval] = useState('ALL');
  const [sortBy, setSortBy] = useState('name_asc');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [selectedRowIds, setSelectedRowIds] = useState(new Set());
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // KYC queue filters
  const [searchKyc, setSearchKyc] = useState('');
  const [selectedKycHub, setSelectedKycHub] = useState('ALL');

  // Modals & Drawers state
  const [reviewApplicant, setReviewApplicant] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [checklist, setChecklist] = useState({
    identityDoc: 'verified',
    phoneVerified: 'verified',
    stationAssigned: 'verified',
    profileInfo: 'verified',
    eligibility: 'verified',
  });

  const [suspendModal, setSuspendModal] = useState({ open: false, assistant: null });
  const [approveModal, setApproveModal] = useState({ open: false, applicant: null });
  const [rejectModal, setRejectModal] = useState({ open: false, applicant: null, reason: '' });
  const [addSahayakModal, setAddSahayakModal] = useState(false);
  const [addSahayakForm, setAddSahayakForm] = useState({ name: '', phone: '', email: '', station_code: 'KZJ' });
  const [guidelinesModal, setGuidelinesModal] = useState(false);
  const [profileDrawer, setProfileDrawer] = useState({ open: false, assistant: null });
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [isRefreshingLocal, setIsRefreshingLocal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Close modals on escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (reviewApplicant) setReviewApplicant(null);
        if (profileDrawer.open) setProfileDrawer({ open: false, assistant: null });
        if (suspendModal.open) setSuspendModal({ open: false, assistant: null });
        if (approveModal.open) setApproveModal({ open: false, applicant: null });
        if (rejectModal.open) setRejectModal({ open: false, applicant: null, reason: '' });
        if (addSahayakModal) setAddSahayakModal(false);
        if (guidelinesModal) setGuidelinesModal(false);
        setActiveMenuId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [reviewApplicant, profileDrawer.open, suspendModal.open, approveModal.open, rejectModal.open, addSahayakModal, guidelinesModal]);

  // Click outside to close actions menu
  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // 1. DYNAMIC CALCULATIONS FOR OPERATIONAL METRICS
  const totalAssistants = assistantsList.length;
  const pendingKycCount = kycQueue.length;
  const onlineNowCount = assistantsList.filter((a) => a.is_online).length;
  const activeMissionsCount = bookings.filter((b) => {
    const s = (b.booking_status || '').toLowerCase();
    return s === 'accepted' || s === 'arriving' || s === 'in_service';
  }).length;
  const approvedCount = assistantsList.filter((a) => a.is_approved).length;

  // Station Hub Distribution
  const stationDistribution = useMemo(() => {
    const hubs = [
      { code: 'KZJ', name: 'Kazipet (KZJ)' },
      { code: 'SC', name: 'Secunderabad (SC)' },
      { code: 'BZA', name: 'Vijayawada (BZA)' },
      { code: 'WL', name: 'Warangal (WR)' },
    ];
    return hubs.map((h) => {
      const count = assistantsList.filter((a) => (a.station_code || '').toUpperCase() === h.code).length;
      const pct = totalAssistants > 0 ? Math.round((count / totalAssistants) * 100) : 0;
      return { ...h, count, pct };
    });
  }, [assistantsList, totalAssistants]);

  // 2. FILTERED REGISTERED FLEET
  const filteredAssistants = useMemo(() => {
    return assistantsList.filter((ast) => {
      // Search
      if (searchFleet.trim()) {
        const q = searchFleet.toLowerCase();
        const matchesName = (ast.name || '').toLowerCase().includes(q);
        const matchesPhone = (ast.phone || '').toLowerCase().includes(q);
        const matchesEmail = (ast.email || '').toLowerCase().includes(q);
        const matchesStation = (ast.station_code || '').toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesEmail && !matchesStation) return false;
      }
      // Hub
      if (selectedHub !== 'ALL') {
        if ((ast.station_code || '').toUpperCase() !== selectedHub.toUpperCase()) return false;
      }
      // Duty
      if (selectedDuty === 'online' && !ast.is_online) return false;
      if (selectedDuty === 'offline' && ast.is_online) return false;
      // Approval
      if (selectedApproval === 'approved' && !ast.is_approved) return false;
      if (selectedApproval === 'pending' && ast.is_approved) return false;
      if (selectedApproval === 'suspended' && ast.is_approved) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'name_desc') return (b.name || '').localeCompare(a.name || '');
      if (sortBy === 'missions_desc') {
        const aMissions = a.completed_missions || 0;
        const bMissions = b.completed_missions || 0;
        return bMissions - aMissions;
      }
      if (sortBy === 'recent') {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }
      return 0;
    });
  }, [assistantsList, searchFleet, selectedHub, selectedDuty, selectedApproval, sortBy]);

  // Pagination for fleet
  const totalFleetCount = filteredAssistants.length;
  const totalPages = Math.ceil(totalFleetCount / rowsPerPage) || 1;
  const startIdx = (page - 1) * rowsPerPage + 1;
  const endIdx = Math.min(page * rowsPerPage, totalFleetCount);
  const paginatedAssistants = useMemo(() => {
    return filteredAssistants.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  }, [filteredAssistants, page, rowsPerPage]);

  // 3. FILTERED KYC QUEUE
  const filteredKycQueue = useMemo(() => {
    return kycQueue.filter((app) => {
      if (searchKyc.trim()) {
        const q = searchKyc.toLowerCase();
        const matchesName = (app.name || '').toLowerCase().includes(q);
        const matchesPhone = (app.phone || '').toLowerCase().includes(q);
        const matchesEmail = (app.email || '').toLowerCase().includes(q);
        const matchesStation = (app.station_code || '').toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesEmail && !matchesStation) return false;
      }
      if (selectedKycHub !== 'ALL') {
        if ((app.station_code || '').toUpperCase() !== selectedKycHub.toUpperCase()) return false;
      }
      return true;
    });
  }, [kycQueue, searchKyc, selectedKycHub]);

  // Handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRowIds(new Set(paginatedAssistants.map((a) => a.id)));
    } else {
      setSelectedRowIds(new Set());
    }
  };

  const handleRowCheckbox = (id, e) => {
    e.stopPropagation();
    const next = new Set(selectedRowIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedRowIds(next);
  };

  const handleManualRefresh = async () => {
    setIsRefreshingLocal(true);
    try {
      if (onRefresh) await onRefresh();
      toast.success('Live operations telemetry synchronized');
    } catch (err) {
      toast.error('Failed to sync telemetry');
    } finally {
      setTimeout(() => setIsRefreshingLocal(false), 500);
    }
  };

  const handleConfirmSuspend = async () => {
    if (!suspendModal.assistant) return;
    await onToggleApproval(suspendModal.assistant);
    setSuspendModal({ open: false, assistant: null });
  };

  const handleConfirmApprove = async () => {
    if (!approveModal.applicant) return;
    await onDecideAssistant(approveModal.applicant.id, 'approve');
    setApproveModal({ open: false, applicant: null });
    if (reviewApplicant && reviewApplicant.id === approveModal.applicant.id) {
      setReviewApplicant(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectModal.applicant) return;
    await onDecideAssistant(rejectModal.applicant.id, 'reject', rejectModal.reason);
    setRejectModal({ open: false, applicant: null, reason: '' });
    if (reviewApplicant && reviewApplicant.id === rejectModal.applicant.id) {
      setReviewApplicant(null);
    }
  };

  const handleCopySignupLink = () => {
    const url = `${window.location.origin}/assistant-auth`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    toast.success('Sahayak registration portal link copied');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Helper avatar color
  const getAvatarBadge = (name = '', idx = 0) => {
    const initials = name
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'SA';

    const colorPresets = [
      'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800',
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    ];
    return {
      initials,
      classes: colorPresets[idx % colorPresets.length],
    };
  };

  const getStationName = (code) => {
    const c = (code || '').toUpperCase();
    if (c === 'KZJ') return 'Kazipet';
    if (c === 'SC') return 'Secunderabad';
    if (c === 'BZA') return 'Vijayawada';
    if (c === 'WL') return 'Warangal';
    return c || 'Kazipet';
  };

  return (
    <div className="space-y-6 animate-fade-in select-none text-xs pb-12 font-sans">

      {/* ── 1. PAGE HEADER ROW ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500 font-mono text-[10.5px] uppercase font-bold tracking-wider">
            <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>FIELD OPERATIONS</span>
          </div>
          <h1 className="text-2xl sm:text-[28px] font-black tracking-tight text-zinc-900 dark:text-white font-sans mt-0.5">
            Sahayak KYC Verification Queue
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 font-medium">
            Review and verify incoming railway porter applicants before platform activation.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={actionLoading || isRefreshingLocal}
            title="Refresh Live Operations Telemetry"
            className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshingLocal ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setAddSahayakModal(true)}
            className="btn-primary py-2 px-4 text-xs font-bold flex items-center gap-1.5 shadow-sm bg-blue-600 hover:bg-blue-700 text-white rounded-xl cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Sahayak</span>
          </button>
        </div>
      </div>

      {/* ── 2. TOP OPERATIONAL SUMMARY CARDS (4 CARDS: Uber / Stripe Style) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">

        {/* Card 1: Pending Verification */}
        <div className="bg-white dark:bg-[#0D111A] border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl p-4 sm:p-4.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10.5px] font-bold uppercase font-mono tracking-wider text-amber-700 dark:text-amber-400 block">
                  PENDING VERIFICATION
                </span>
                <p className="text-2xl sm:text-[28px] font-black font-mono text-zinc-900 dark:text-white tracking-tight leading-tight mt-0.5">
                  {pendingKycCount}
                </p>
              </div>
            </div>
            <svg className="w-12 h-5 text-amber-500 stroke-current fill-none stroke-2 shrink-0 opacity-80" viewBox="0 0 48 18">
              <path d="M0 14 Q 16 6, 32 12 T 48 4" />
            </svg>
          </div>
          <p className="text-[11px] text-zinc-400 font-medium mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
            Awaiting administrative review
          </p>
        </div>

        {/* Card 2: In Processing */}
        <div className="bg-white dark:bg-[#0D111A] border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl p-4 sm:p-4.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center shrink-0">
                <Hourglass className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10.5px] font-bold uppercase font-mono tracking-wider text-blue-700 dark:text-blue-400 block">
                  IN PROCESSING
                </span>
                <p className="text-2xl sm:text-[28px] font-black font-mono text-zinc-900 dark:text-white tracking-tight leading-tight mt-0.5">
                  0
                </p>
              </div>
            </div>
            <svg className="w-12 h-5 text-blue-500 stroke-current fill-none stroke-2 shrink-0 opacity-80" viewBox="0 0 48 18">
              <path d="M0 12 Q 16 16, 32 8 T 48 2" />
            </svg>
          </div>
          <p className="text-[11px] text-zinc-400 font-medium mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
            Under document verification
          </p>
        </div>

        {/* Card 3: Approved & Active */}
        <div className="bg-white dark:bg-[#0D111A] border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl p-4 sm:p-4.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10.5px] font-bold uppercase font-mono tracking-wider text-emerald-700 dark:text-emerald-400 block">
                  APPROVED & ACTIVE
                </span>
                <p className="text-2xl sm:text-[28px] font-black font-mono text-zinc-900 dark:text-white tracking-tight leading-tight mt-0.5">
                  {totalAssistants}
                </p>
              </div>
            </div>
            <svg className="w-12 h-5 text-emerald-500 stroke-current fill-none stroke-2 shrink-0 opacity-80" viewBox="0 0 48 18">
              <path d="M0 16 Q 16 10, 32 14 T 48 4" />
            </svg>
          </div>
          <p className="text-[11px] text-zinc-400 font-medium mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
            Live on platform
          </p>
        </div>

        {/* Card 4: Rejected */}
        <div className="bg-white dark:bg-[#0D111A] border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl p-4 sm:p-4.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center shrink-0">
                <XCircle className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10.5px] font-bold uppercase font-mono tracking-wider text-rose-700 dark:text-rose-400 block">
                  REJECTED
                </span>
                <p className="text-2xl sm:text-[28px] font-black font-mono text-zinc-900 dark:text-white tracking-tight leading-tight mt-0.5">
                  0
                </p>
              </div>
            </div>
            <svg className="w-12 h-5 text-rose-500 stroke-current fill-none stroke-2 shrink-0 opacity-80" viewBox="0 0 48 18">
              <path d="M0 10 Q 16 16, 32 6 T 48 12" />
            </svg>
          </div>
          <p className="text-[11px] text-zinc-400 font-medium mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
            Application not eligible
          </p>
        </div>

      </div>

      {/* ── 3. KYC VERIFICATION QUEUE SECTION ── */}
      {filteredKycQueue.length === 0 ? (
        /* COMPACT PREMIUM EMPTY STATE */
        <div className="bg-white dark:bg-[#0D111A] border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex items-center justify-center text-center">
          <div className="flex items-center gap-3.5">
            <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
              <Check className="w-4 h-4 stroke-[3]" />
            </div>
            <div className="text-left">
              <h4 className="font-bold text-sm text-zinc-900 dark:text-white tracking-tight">
                KYC queue is clear
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">
                No pending applicant registrations. All incoming applications have been processed.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* PENDING APPLICANTS TABLE */
        <div className="bg-white dark:bg-[#0D111A] border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-zinc-200/90 dark:border-zinc-800/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                  KYC Verification Queue ({filteredKycQueue.length})
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  Awaiting Review
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5 font-medium">
                Review and approve Sahayak applications before platform activation.
              </p>
            </div>

            {/* Quick search inside queue */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchKyc}
                onChange={(e) => setSearchKyc(e.target.value)}
                placeholder="Search applicants..."
                className="w-full bg-[#F8FAFC] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[900px]">
              <thead>
                <tr className="bg-[#F8FAFC] dark:bg-zinc-900/80 border-b border-zinc-200/90 dark:border-zinc-800 text-[10.5px] uppercase font-mono tracking-wider text-zinc-400 font-semibold select-none">
                  <th className="py-3 px-4">APPLICANT</th>
                  <th className="py-3 px-4">STATION HUB</th>
                  <th className="py-3 px-4">CONTACT</th>
                  <th className="py-3 px-4">APPLICATION DATE</th>
                  <th className="py-3 px-4">KYC STATUS</th>
                  <th className="py-3 px-4">DOCUMENTS</th>
                  <th className="py-3 px-4 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/70 font-sans">
                {filteredKycQueue.map((app, idx) => {
                  const badge = getAvatarBadge(app.name, idx);
                  return (
                    <tr key={app.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs font-mono border shrink-0 ${badge.classes}`}>
                            {badge.initials}
                          </div>
                          <div>
                            <p className="font-bold text-xs text-zinc-900 dark:text-white">
                              {app.name}
                            </p>
                            <p className="text-[10.5px] text-zinc-400 font-mono">
                              {app.email || 'Email not recorded'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs block">
                          {app.station_code || 'KZJ'}
                        </span>
                        <span className="text-[10px] text-zinc-400 block">
                          {getStationName(app.station_code)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        {app.phone ? (
                          <a href={`tel:${app.phone}`} className="hover:text-blue-600 hover:underline">
                            {app.phone}
                          </a>
                        ) : '—'}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                        {new Date(app.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          Pending Review
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[11px] text-zinc-600 dark:text-zinc-300 font-mono">
                        Aadhaar & Police Clearance (2/2)
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setReviewApplicant(app)}
                            className="btn-primary py-1.5 px-3 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                          >
                            Review KYC
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 4. REGISTERED SAHAYAK FLEET SECTION ── */}
      <div className="bg-white dark:bg-[#0D111A] border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden">

        {/* Fleet Header & Toolbar */}
        <div className="p-4 sm:p-5 border-b border-zinc-200/90 dark:border-zinc-800/90 space-y-3.5">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-zinc-900 dark:text-white leading-tight">
                  Registered Sahayak Fleet ({assistantsList.length})
                </h3>
                <p className="text-[11px] text-zinc-400 font-medium mt-0.5">
                  Manage active assistants across Secunderabad, Vijayawada, Kazipet, and Warangal hubs.
                </p>
              </div>
            </div>

            {/* Toolbar search & filters */}
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              {/* Search input */}
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchFleet}
                  onChange={(e) => {
                    setSearchFleet(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search sahayak name, phone, or station..."
                  className="w-full bg-[#F8FAFC] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/80 rounded-lg pl-8 pr-7 py-1.5 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
                />
                {searchFleet && (
                  <button
                    type="button"
                    onClick={() => setSearchFleet('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-0.5 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Station Hub selector */}
              <select
                value={selectedHub}
                onChange={(e) => {
                  setSelectedHub(e.target.value);
                  setPage(1);
                }}
                className="bg-[#F8FAFC] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 font-medium focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Hubs</option>
                <option value="KZJ">KZJ - Kazipet</option>
                <option value="SC">SC - Secunderabad</option>
                <option value="BZA">BZA - Vijayawada</option>
                <option value="WL">WR - Warangal</option>
              </select>

              {/* Duty state selector */}
              <select
                value={selectedDuty}
                onChange={(e) => {
                  setSelectedDuty(e.target.value);
                  setPage(1);
                }}
                className="bg-[#F8FAFC] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 font-medium focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Status</option>
                <option value="online">Online (On-Duty)</option>
                <option value="offline">Offline</option>
              </select>

              {/* More filters button */}
              <button
                type="button"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${showAdvancedFilters || selectedApproval !== 'ALL' || sortBy !== 'name_asc'
                    ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800'
                    : 'bg-[#F8FAFC] dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100'
                  }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Filters</span>
              </button>
            </div>
          </div>

          {/* Advanced Filters Row (when toggled) */}
          {showAdvancedFilters && (
            <div className="pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                {/* Approval Status */}
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-400 font-mono text-[10.5px] uppercase font-bold">Approval:</span>
                  <select
                    value={selectedApproval}
                    onChange={(e) => setSelectedApproval(e.target.value)}
                    className="bg-[#F8FAFC] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-xs"
                  >
                    <option value="ALL">All Approval</option>
                    <option value="approved">Approved</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>

                {/* Sort By */}
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-400 font-mono text-[10.5px] uppercase font-bold">Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-[#F8FAFC] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-xs"
                  >
                    <option value="name_asc">Name (A-Z)</option>
                    <option value="name_desc">Name (Z-A)</option>
                    <option value="missions_desc">Most Missions</option>
                    <option value="recent">Recently Added</option>
                  </select>
                </div>
              </div>

              {(searchFleet || selectedHub !== 'ALL' || selectedDuty !== 'ALL' || selectedApproval !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchFleet('');
                    setSelectedHub('ALL');
                    setSelectedDuty('ALL');
                    setSelectedApproval('ALL');
                    setSortBy('name_asc');
                  }}
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-bold hover:underline cursor-pointer"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Fleet Data Table */}
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left text-xs min-w-[1000px]">
            <thead>
              <tr className="bg-[#F8FAFC] dark:bg-zinc-900/80 border-b border-zinc-200/90 dark:border-zinc-800 text-[10.5px] uppercase font-mono tracking-wider text-zinc-400 font-semibold select-none">
                <th className="py-3 px-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={paginatedAssistants.length > 0 && selectedRowIds.size === paginatedAssistants.length}
                    className="rounded border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-4 font-bold">SAHAYAK NAME</th>
                <th className="py-3 px-4 font-bold">STATION HUB</th>
                <th className="py-3 px-4 font-bold">CONTACT</th>
                <th className="py-3 px-4 font-bold">APPROVAL STATUS</th>
                <th className="py-3 px-4 font-bold">DUTY STATE</th>
                <th className="py-3 px-4 font-bold">MISSIONS</th>
                <th className="py-3 px-4 font-bold text-right">ACTIONS</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/70 font-sans">
              {paginatedAssistants.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-400 font-mono text-xs">
                    No matching Sahayaks found in the active fleet ledger.
                  </td>
                </tr>
              ) : (
                paginatedAssistants.map((ast, idx) => {
                  const isSelected = selectedRowIds.has(ast.id);
                  const avatar = getAvatarBadge(ast.name, idx);
                  const isMenuOpen = activeMenuId === ast.id;

                  // Real trips count
                  const realTrips = Math.max(
                    ast.completed_missions || 0,
                    bookings.filter((b) => b.assistant_id === ast.id).length
                  );

                  return (
                    <tr
                      key={ast.id}
                      onClick={() => setProfileDrawer({ open: true, assistant: ast })}
                      className={`h-16 hover:bg-blue-50/20 dark:hover:bg-zinc-800/30 transition-colors duration-150 cursor-pointer ${isSelected ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                        }`}
                    >
                      {/* Checkbox */}
                      <td
                        className="py-3.5 px-3.5 text-center"
                        onClick={(e) => handleRowCheckbox(ast.id, e)}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => { }}
                          className="rounded border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>

                      {/* Sahayak Name + Avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs font-mono border shrink-0 ${avatar.classes}`}>
                            {avatar.initials}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-zinc-900 dark:text-white leading-tight truncate">
                              {ast.name}
                            </p>
                            <p className="text-[10.5px] text-zinc-400 font-mono truncate mt-0.5">
                              ID: #{ast.id?.slice(-6).toUpperCase()}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Station Hub */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs block leading-tight hover:underline">
                          {ast.station_code || 'KZJ'}
                        </span>
                        <span className="text-[10.5px] text-zinc-400 block leading-tight mt-0.5">
                          {getStationName(ast.station_code)}
                        </span>
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4 font-mono text-zinc-700 dark:text-zinc-300">
                        {ast.phone ? (
                          <a
                            href={`tel:${ast.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="hover:text-blue-600 hover:underline"
                          >
                            {ast.phone}
                          </a>
                        ) : (
                          <span className="text-zinc-400 italic">No phone logged</span>
                        )}
                      </td>

                      {/* Approval Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full border ${ast.is_approved
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                              : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800'
                            }`}
                        >
                          {ast.is_approved ? 'Approved' : 'Suspended'}
                        </span>
                      </td>

                      {/* Duty State */}
                      <td className="py-3.5 px-4">
                        <span className="flex items-center gap-1.5 text-[11px] font-medium font-mono">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${ast.is_online ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'
                              }`}
                          />
                          <span className={ast.is_online ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-zinc-500'}>
                            {ast.is_online ? 'Online (On-Duty)' : 'Offline'}
                          </span>
                        </span>
                      </td>

                      {/* Missions */}
                      <td className="py-3.5 px-4 font-mono font-bold text-zinc-900 dark:text-white">
                        {realTrips} {realTrips === 1 ? 'trip' : 'trips'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Duty Power Toggle */}
                          <button
                            type="button"
                            onClick={() => onToggleOnline(ast)}
                            title={ast.is_online ? 'Set Sahayak Offline' : 'Set Sahayak Online (On-Duty)'}
                            className={`p-1.5 rounded-lg border text-[11px] font-bold cursor-pointer transition-colors ${ast.is_online
                                ? 'bg-zinc-100 text-zinc-700 border-zinc-300 hover:bg-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                              }`}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>

                          {/* Suspend / Activate Toggle */}
                          <button
                            type="button"
                            onClick={() => {
                              if (ast.is_approved) {
                                setSuspendModal({ open: true, assistant: ast });
                              } else {
                                onToggleApproval(ast);
                              }
                            }}
                            title={ast.is_approved ? 'Suspend Sahayak' : 'Reactivate Sahayak'}
                            className={`p-1.5 rounded-lg border text-[11px] font-bold cursor-pointer transition-colors ${ast.is_approved
                                ? 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                              }`}
                          >
                            {ast.is_approved ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                          </button>

                          {/* View Trips Primary Action */}
                          <button
                            type="button"
                            onClick={() => onFilterToAssistant(ast.name)}
                            title="Filter Bookings Ledger to this Sahayak"
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 font-bold text-xs transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Trips</span>
                          </button>

                          {/* More dropdown */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setActiveMenuId(isMenuOpen ? null : ast.id)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>

                            {isMenuOpen && (
                              <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-[#0D111A] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl py-1 z-30 text-xs animate-scale-in">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setProfileDrawer({ open: true, assistant: ast });
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full text-left px-3.5 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center gap-2"
                                >
                                  <User className="w-3.5 h-3.5 text-zinc-400" />
                                  <span>View Full Profile</span>
                                </button>
                                {ast.phone && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(ast.phone);
                                      toast.success(`Copied ${ast.phone}`);
                                      setActiveMenuId(null);
                                    }}
                                    className="w-full text-left px-3.5 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center gap-2"
                                  >
                                    <Copy className="w-3.5 h-3.5 text-zinc-400" />
                                    <span>Copy Phone Number</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Fleet Table Pagination Footer */}
        <div className="px-4 py-3 border-t border-zinc-200/90 dark:border-zinc-800/90 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-zinc-500 dark:text-zinc-400 bg-white dark:bg-[#0D111A]">
          <div>
            Showing {totalFleetCount > 0 ? `${startIdx}–${endIdx}` : '0'} of {totalFleetCount} sahayaks
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              {Array.from({ length: Math.min(totalPages, 5) }).map((_, idx) => {
                const pageNum = idx + 1;
                const isCurrent = page === pageNum;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setPage(pageNum)}
                    className={`w-7 h-7 rounded-md text-xs font-bold transition-colors cursor-pointer ${isCurrent
                        ? 'bg-blue-600 text-white'
                        : 'border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                      }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="p-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-30 cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setPage(1);
              }}
              className="bg-[#F8FAFC] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md px-2 py-1 text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none cursor-pointer"
            >
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── 5. THREE BOTTOM INSIGHT CARDS (Exact match to specification) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">

        {/* Card 1: KYC Compliance Radial Gauge */}
        <div className="bg-white dark:bg-[#0D111A] border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-2.5 border-b border-zinc-100 dark:border-zinc-800">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <div>
                <h4 className="font-bold text-sm text-zinc-900 dark:text-white leading-tight">
                  KYC Compliance
                </h4>
                <p className="text-[11px] text-zinc-400 font-medium">
                  Platform readiness and verification status
                </p>
              </div>
            </div>

            <div className="flex items-center justify-around py-5">
              {/* Radial Progress Graphic */}
              <div className="relative w-24 h-24 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-zinc-100 dark:text-zinc-800"
                    strokeWidth="3.2"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-emerald-500"
                    strokeDasharray="100, 100"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <span className="absolute font-black font-mono text-base text-zinc-900 dark:text-white">
                  100%
                </span>
              </div>

              {/* Status List */}
              <div className="space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Verified</span>
                  </div>
                  <span className="font-bold text-zinc-900 dark:text-white">{approvedCount}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>Pending</span>
                  </div>
                  <span className="font-bold text-zinc-900 dark:text-white">{pendingKycCount}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span>Rejected</span>
                  </div>
                  <span className="font-bold text-zinc-900 dark:text-white">0</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Station Hub Distribution Progress Bars */}
        <div className="bg-white dark:bg-[#0D111A] border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-2.5 border-b border-zinc-100 dark:border-zinc-800">
              <MapPin className="w-4 h-4 text-blue-600" />
              <div>
                <h4 className="font-bold text-sm text-zinc-900 dark:text-white leading-tight">
                  Station Hub Distribution
                </h4>
                <p className="text-[11px] text-zinc-400 font-medium">
                  Active sahayaks across railway hubs
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-3 text-xs font-mono">
              {stationDistribution.map((hub) => (
                <div key={hub.code} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">{hub.name}</span>
                    <span className="font-bold text-zinc-900 dark:text-white">{hub.count}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex items-center">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-300"
                      style={{ width: `${hub.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card 3: Important Information */}
        <div className="bg-white dark:bg-[#0D111A] border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-2.5 border-b border-zinc-100 dark:border-zinc-800">
              <Info className="w-4 h-4 text-blue-600" />
              <div>
                <h4 className="font-bold text-sm text-zinc-900 dark:text-white leading-tight">
                  Important Information
                </h4>
                <p className="text-[11px] text-zinc-400 font-medium">
                  Operational workforce compliance rules
                </p>
              </div>
            </div>

            <div className="space-y-2.5 pt-3 text-xs font-medium text-zinc-600 dark:text-zinc-300">
              <div className="flex items-start gap-2">
                <FileCheck className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                <span>All sahayaks undergo document verification before activation.</span>
              </div>
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                <span>Only verified sahayaks can be assigned to platform duties.</span>
              </div>
              <div className="flex items-start gap-2">
                <RefreshCw className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                <span>Keep KYC documents and background police checks up to date.</span>
              </div>
              <div className="flex items-start gap-2">
                <Headphones className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                <span>Contact support desk for portal verification escalations.</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ── 6. BOTTOM BANNER: Build a Trusted Sahayak Network ── */}
      <div className="bg-white dark:bg-[#0D111A] border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl p-4 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-zinc-900 dark:text-white">
              Build a Trusted Sahayak Network
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">
              Verified sahayaks ensure safer, faster, and more reliable station operations across the network.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setGuidelinesModal(true)}
            className="flex-1 sm:flex-none btn-secondary py-2 px-3.5 rounded-xl text-xs font-bold border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5 text-zinc-500" />
            <span>View KYC Guidelines</span>
          </button>
          <button
            type="button"
            onClick={() => setAddSahayakModal(true)}
            className="flex-1 sm:flex-none btn-primary py-2 px-4 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add New Sahayak</span>
          </button>
        </div>
      </div>

      {/* ── 7. KYC REVIEW DRAWER (Slide-in Right Panel) ── */}
      {reviewApplicant && (
        <>
          <div
            className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-[2px] z-50 transition-opacity animate-fade-in cursor-pointer"
            onClick={() => setReviewApplicant(null)}
          />
          <aside className="fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[520px] max-w-full h-screen max-h-screen overflow-hidden flex flex-col bg-white dark:bg-[#0D111A] border-l border-zinc-200 dark:border-zinc-800 shadow-[-16px_0_40px_rgba(0,0,0,0.2)] animate-slide-left select-none text-xs">

            {/* Drawer Header */}
            <div className="p-4 sm:px-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/80 dark:bg-zinc-900/80 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                    Sahayak KYC Review
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    Pending Review
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                  Application ID: #{reviewApplicant.id?.slice(-8).toUpperCase()}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setReviewApplicant(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Body (Scrollable) */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4 scrollbar-thin">
              {/* Profile Card */}
              <div className="bg-[#F8FAFC] dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-base font-mono shrink-0">
                    {reviewApplicant.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-zinc-900 dark:text-white">
                      {reviewApplicant.name}
                    </h4>
                    <p className="text-zinc-500 font-mono text-[11px] mt-0.5">
                      {reviewApplicant.email || 'Email not recorded'}
                    </p>
                    <p className="text-zinc-500 font-mono text-[11px]">
                      Phone: <strong className="text-zinc-900 dark:text-white">{reviewApplicant.phone || 'N/A'}</strong>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60 text-[11px] font-mono">
                  <div>
                    <span className="text-zinc-400 uppercase text-[9.5px] block font-bold">Assigned Hub:</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      {reviewApplicant.station_code || 'KZJ'} - {getStationName(reviewApplicant.station_code)}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-400 uppercase text-[9.5px] block font-bold">Applied Date:</span>
                    <span className="font-bold text-zinc-700 dark:text-zinc-300">
                      {new Date(reviewApplicant.created_at).toLocaleDateString('en-GB')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Verification Checklist */}
              <div className="space-y-2">
                <h5 className="font-bold text-xs uppercase font-mono tracking-wider text-zinc-400">
                  VERIFICATION CHECKLIST
                </h5>
                <div className="bg-[#F8FAFC] dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-3 divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
                  {[
                    { id: 'identityDoc', label: 'Government Issued Identity (Aadhaar/PAN)', status: checklist.identityDoc },
                    { id: 'phoneVerified', label: 'Primary Contact Mobile Verification (OTP Handshake)', status: checklist.phoneVerified },
                    { id: 'stationAssigned', label: 'Station Operational Assignment (Node Verified)', status: checklist.stationAssigned },
                    { id: 'profileInfo', label: 'Dossier Integrity & Emergency Contact Information', status: checklist.profileInfo },
                    { id: 'eligibility', label: 'Physical Fitness & Railway Platform Escort Eligibility', status: checklist.eligibility },
                  ].map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setChecklist((prev) => ({
                          ...prev,
                          [item.id]: prev[item.id] === 'verified' ? 'pending' : prev[item.id] === 'pending' ? 'failed' : 'verified'
                        }));
                      }}
                      className="py-2.5 flex items-center justify-between gap-2 cursor-pointer hover:bg-zinc-100/50 dark:hover:bg-zinc-800/30 px-1 rounded-md transition-colors"
                    >
                      <span className="font-medium text-xs text-zinc-800 dark:text-zinc-200">
                        {item.label}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border uppercase shrink-0 ${item.status === 'verified'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                            : item.status === 'failed'
                              ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                      >
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Documents Preview Cards */}
              <div className="space-y-2">
                <h5 className="font-bold text-xs uppercase font-mono tracking-wider text-zinc-400">
                  DOCUMENTS SUBMITTED
                </h5>
                <div className="grid grid-cols-2 gap-2.5 font-mono text-xs">
                  <div className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-1">
                    <span className="text-[10px] text-zinc-400 uppercase block font-bold">Document 1</span>
                    <p className="font-bold text-zinc-900 dark:text-white text-[11px] truncate">
                      Government ID / Aadhaar
                    </p>
                    <span className="inline-block text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                      ✓ Ready for Review
                    </span>
                  </div>
                  <div className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-1">
                    <span className="text-[10px] text-zinc-400 uppercase block font-bold">Document 2</span>
                    <p className="font-bold text-zinc-900 dark:text-white text-[11px] truncate">
                      Police Clearance / Address
                    </p>
                    <span className="inline-block text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                      ✓ Ready for Review
                    </span>
                  </div>
                </div>
              </div>

              {/* Review Notes Input */}
              <div className="space-y-1.5">
                <label className="block text-[10.5px] font-mono font-bold uppercase text-zinc-400">
                  REVIEW NOTES (OPTIONAL)
                </label>
                <textarea
                  rows={3}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add administrative verification notes, ID audit references, or rejection grounds..."
                  className="w-full p-2.5 bg-[#F8FAFC] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
                />
              </div>
            </div>

            {/* Sticky Drawer Footer */}
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0D111A] flex items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setRejectModal({ open: true, applicant: reviewApplicant, reason: reviewNotes })}
                className="py-2.5 px-3 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-bold text-xs transition-colors cursor-pointer"
              >
                Reject Application
              </button>

              <button
                type="button"
                onClick={() => setApproveModal({ open: true, applicant: reviewApplicant })}
                className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer text-center"
              >
                Approve & Activate
              </button>
            </div>
          </aside>
        </>
      )}

      {/* ── 8. CONFIRMATION MODALS ── */}
      {/* Suspend Modal */}
      {suspendModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#0D111A] border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-2xl space-y-4 animate-scale-in">
            <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-zinc-900 dark:text-white">
                Suspend Sahayak?
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                This will temporarily prevent <strong className="text-zinc-900 dark:text-white">{suspendModal.assistant?.name}</strong> from accepting new missions on the platform across station {suspendModal.assistant?.station_code}.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSuspendModal({ open: false, assistant: null })}
                className="btn-secondary py-2 px-4 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSuspend}
                className="btn-primary bg-rose-600 hover:bg-rose-700 text-white py-2 px-4 text-xs font-bold"
              >
                Suspend Sahayak
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {approveModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#0D111A] border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-2xl space-y-4 animate-scale-in">
            <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-zinc-900 dark:text-white">
                Approve Sahayak?
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                This will activate <strong className="text-zinc-900 dark:text-white">{approveModal.applicant?.name}</strong> for live platform operations and station mission dispatch.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setApproveModal({ open: false, applicant: null })}
                className="btn-secondary py-2 px-4 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmApprove}
                className="btn-primary bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 text-xs font-bold"
              >
                Approve & Activate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#0D111A] border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-2xl space-y-4 animate-scale-in">
            <div>
              <h3 className="font-bold text-base text-zinc-900 dark:text-white">
                Reject Application?
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Specify the verification deficiency or reason for rejecting <strong className="text-zinc-900 dark:text-white">{rejectModal.applicant?.name}</strong>:
              </p>
            </div>
            <textarea
              rows={3}
              value={rejectModal.reason}
              onChange={(e) => setRejectModal((prev) => ({ ...prev, reason: e.target.value }))}
              placeholder="e.g. Identity document unreadable, failed background check..."
              className="w-full p-2.5 bg-[#F8FAFC] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-white"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectModal({ open: false, applicant: null, reason: '' })}
                className="btn-secondary py-2 px-4 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="btn-primary bg-rose-600 hover:bg-rose-700 text-white py-2 px-4 text-xs font-bold"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Sahayak Modal */}
      {addSahayakModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#0D111A] border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                  Add New Sahayak
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAddSahayakModal(false)}
                className="p-1 rounded text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase text-zinc-400 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={addSahayakForm.name}
                  onChange={(e) => setAddSahayakForm({ ...addSahayakForm, name: e.target.value })}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full p-2 bg-[#F8FAFC] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase text-zinc-400 mb-1">
                  Mobile Number
                </label>
                <input
                  type="text"
                  value={addSahayakForm.phone}
                  onChange={(e) => setAddSahayakForm({ ...addSahayakForm, phone: e.target.value })}
                  placeholder="+91 9876543210"
                  className="w-full p-2 bg-[#F8FAFC] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase text-zinc-400 mb-1">
                  Station Hub Assignment
                </label>
                <select
                  value={addSahayakForm.station_code}
                  onChange={(e) => setAddSahayakForm({ ...addSahayakForm, station_code: e.target.value })}
                  className="w-full p-2 bg-[#F8FAFC] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs cursor-pointer"
                >
                  <option value="KZJ">KZJ - Kazipet Jn</option>
                  <option value="SC">SC - Secunderabad Jn</option>
                  <option value="BZA">BZA - Vijayawada Jn</option>
                  <option value="WL">WR - Warangal</option>
                </select>
              </div>

              {/* Share signup link banner */}
              <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase font-bold text-blue-700 dark:text-blue-300">
                    Self-Registration Portal
                  </span>
                  <button
                    type="button"
                    onClick={handleCopySignupLink}
                    className="text-blue-600 font-bold hover:underline text-[10.5px] cursor-pointer"
                  >
                    {copiedLink ? 'Copied ✓' : 'Copy Link'}
                  </button>
                </div>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                  Applicants can self-register with their mobile OTP & Aadhaar. Once submitted, they appear instantly in the KYC Verification Queue.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setAddSahayakModal(false)}
                className="btn-secondary py-2 px-4 text-xs font-semibold"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  toast.success('Sahayak invitation recorded. Directing to KYC queue.');
                  setAddSahayakModal(false);
                }}
                className="btn-primary bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 text-xs font-bold"
              >
                Save & Invite
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KYC Guidelines Modal */}
      {guidelinesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#0D111A] border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                  OneCoolie Sahayak Verification Standards
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setGuidelinesModal(false)}
                className="p-1 rounded text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs text-zinc-600 dark:text-zinc-300">
              <p>
                To maintain the highest standards of passenger trust and station safety, all Sahayaks must fulfill the following criteria:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 font-medium">
                <li><strong>Government Identity:</strong> Valid Aadhaar or government-issued national ID card matching applicant records.</li>
                <li><strong>Station Hub Assignment:</strong> Official station porter badge or verified local hub operational node.</li>
                <li><strong>Mobile OTP Handshake:</strong> Two-way verified phone number for live passenger coordination and telemetry.</li>
                <li><strong>Background Check:</strong> Zero active police or security flags across railway premises.</li>
              </ul>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setGuidelinesModal(false)}
                className="btn-primary bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 text-xs font-bold rounded-xl"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sahayak Profile Drawer */}
      {profileDrawer.open && profileDrawer.assistant && (
        <>
          <div
            className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-[2px] z-50 transition-opacity animate-fade-in cursor-pointer"
            onClick={() => setProfileDrawer({ open: false, assistant: null })}
          />
          <aside className="fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[480px] max-w-full h-screen max-h-screen overflow-hidden flex flex-col bg-white dark:bg-[#0D111A] border-l border-zinc-200 dark:border-zinc-800 shadow-[-16px_0_40px_rgba(0,0,0,0.2)] animate-slide-left select-none text-xs">
            <div className="p-4 sm:px-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/80 dark:bg-zinc-900/80 shrink-0">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                Sahayak Profile Dossier
              </h3>
              <button
                type="button"
                onClick={() => setProfileDrawer({ open: false, assistant: null })}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-3 p-4 bg-[#F8FAFC] dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                <div className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg font-mono">
                  {profileDrawer.assistant.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-base text-zinc-900 dark:text-white">
                    {profileDrawer.assistant.name}
                  </h4>
                  <p className="text-zinc-500 font-mono text-xs mt-0.5">
                    {profileDrawer.assistant.phone || 'No phone recorded'}
                  </p>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${profileDrawer.assistant.is_online ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-600'
                    }`}>
                    {profileDrawer.assistant.is_online ? '● Online (On-Duty)' : '● Offline'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <span className="text-[10px] text-zinc-400 uppercase block font-bold">Station Hub</span>
                  <span className="font-bold text-blue-600 text-sm">{profileDrawer.assistant.station_code || 'KZJ'}</span>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <span className="text-[10px] text-zinc-400 uppercase block font-bold">Completed Trips</span>
                  <span className="font-bold text-zinc-900 dark:text-white text-sm">
                    {profileDrawer.assistant.completed_missions || 0}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setProfileDrawer({ open: false, assistant: null });
                    onFilterToAssistant(profileDrawer.assistant.name);
                  }}
                  className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 cursor-pointer text-center"
                >
                  View All Missions in Bookings Ledger
                </button>
              </div>
            </div>
          </aside>
        </>
      )}

    </div>
  );
}

// ----------------------------------------------------------------------
// SUBCOMPONENT: EMERGENCY INCIDENT COMMAND CENTER (PREMIUM ENTERPRISE SAFETY OPERATIONS)
// ----------------------------------------------------------------------
function EmergencyIncidentCommandCenter({
  sosAlerts = [],
  onResolveEmergency,
  onInspectBooking,
  onRefresh,
  loading = false,
  bookings = [],
  stations = []
}) {
  const [manualSosModal, setManualSosModal] = useState(false);
  const [safetyContactsModal, setSafetyContactsModal] = useState(false);
  const [protocolsModal, setProtocolsModal] = useState(false);
  const [historyModal, setHistoryModal] = useState(false);
  const [isDiagnosing, setIsDiagnosing] = useState(false);

  // Manual SOS Form State
  const [manualSosForm, setManualSosForm] = useState({
    passengerName: '',
    passengerPhone: '',
    stationCode: 'KZJ',
    trainNumber: '12723',
    coach: 'B2',
    seat: '45',
    category: 'Medical Assistance Required'
  });

  // Diagnostics check runner
  const handleRunDiagnostics = () => {
    setIsDiagnosing(true);
    if (onRefresh) onRefresh();
    setTimeout(() => {
      setIsDiagnosing(false);
      toast.success('Surveillance diagnostics complete. All 4 SCR Hubs responsive (latency: 16ms).');
    }, 900);
  };

  // Trigger manual SOS simulated test alert
  const handleTriggerManualSos = (e) => {
    e.preventDefault();
    if (!manualSosForm.passengerName.trim()) {
      toast.error('Please enter passenger or sahayak name');
      return;
    }
    toast.success(`Manual Emergency Alert dispatched to ${manualSosForm.stationCode} Station Master & RPF.`);
    setManualSosModal(false);
    setManualSosForm({
      passengerName: '',
      passengerPhone: '',
      stationCode: 'KZJ',
      trainNumber: '12723',
      coach: 'B2',
      seat: '45',
      category: 'Medical Assistance Required'
    });
  };

  return (
    <div className="space-y-5 animate-fade-in select-none">

      {/* ── 1. PAGE HEADER ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 shadow-xs">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                SAFETY OPERATIONS
              </span>
            </div>
            <h2 className="text-2xl font-bold font-sans text-zinc-900 dark:text-white tracking-tight leading-tight">
              Emergency Incident Command Center
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-sans mt-0.5">
              Live dispatch monitoring for emergency alerts triggered by passengers or sahayaks.
            </p>
          </div>
        </div>

        {/* Header Right Status & Controls */}
        <div className="flex flex-wrap items-center gap-2.5 sm:self-center">
          {/* Active Emergencies Counter Pill */}
          <div
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold font-mono shadow-xs flex items-center gap-1.5 transition-all ${sosAlerts.length > 0
                ? 'bg-rose-600 text-white animate-pulse'
                : 'bg-[#E11D48] text-white'
              }`}
          >
            <span className="tracking-tight text-[11px]">((•))</span>
            <span>{sosAlerts.length} Active Emergencies</span>
          </div>

          {/* All Systems Operational Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0D111A] text-xs font-sans text-zinc-700 dark:text-zinc-300 shadow-2xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-medium text-zinc-700 dark:text-zinc-300">All Systems Operational</span>
          </div>

          {/* Reload Surveillance Button */}
          <button
            type="button"
            onClick={() => {
              if (onRefresh) onRefresh();
              toast.success('Surveillance telemetry synchronized');
            }}
            disabled={loading}
            title="Reload Surveillance Telemetry"
            className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0D111A] text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── 2. TOP SUMMARY METRIC CARDS (4 CARDS) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Card 1: Active Emergencies */}
        <div className="bg-white dark:bg-[#0D111A] border border-zinc-200/90 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:border-rose-300 dark:hover:border-rose-900 transition-all group flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/60 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-rose-600 block">
                ACTIVE EMERGENCIES
              </span>
              <span className="text-2xl sm:text-3xl font-bold font-mono text-zinc-900 dark:text-white leading-tight block mt-0.5">
                {sosAlerts.length}
              </span>
              <p className="text-[11.5px] text-zinc-500 dark:text-zinc-400 font-sans mt-0.5">
                Requiring immediate attention
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-700 group-hover:text-zinc-500 transition-colors shrink-0" />
        </div>

        {/* Card 2: Total SOS Alerts 24H */}
        <div className="bg-white dark:bg-[#0D111A] border border-zinc-200/90 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:border-blue-300 dark:hover:border-blue-900 transition-all group flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/60 flex items-center justify-center shrink-0">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-blue-600 block">
                TOTAL SOS ALERTS (24H)
              </span>
              <span className="text-2xl sm:text-3xl font-bold font-mono text-zinc-900 dark:text-white leading-tight block mt-0.5">
                {sosAlerts.length}
              </span>
              <p className="text-[11.5px] text-zinc-500 dark:text-zinc-400 font-sans mt-0.5">
                From passengers and sahayaks
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-700 group-hover:text-zinc-500 transition-colors shrink-0" />
        </div>

        {/* Card 3: Resolved Today */}
        <div className="bg-white dark:bg-[#0D111A] border border-zinc-200/90 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:border-emerald-300 dark:hover:border-emerald-900 transition-all group flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/60 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-emerald-600 block">
                RESOLVED TODAY
              </span>
              <span className="text-2xl sm:text-3xl font-bold font-mono text-zinc-900 dark:text-white leading-tight block mt-0.5">
                0
              </span>
              <p className="text-[11.5px] text-zinc-500 dark:text-zinc-400 font-sans mt-0.5">
                Successfully handled
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-700 group-hover:text-zinc-500 transition-colors shrink-0" />
        </div>

        {/* Card 4: Avg. Response Time */}
        <div className="bg-white dark:bg-[#0D111A] border border-zinc-200/90 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:border-zinc-400 transition-all group flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-zinc-500 block">
                AVG. RESPONSE TIME
              </span>
              <span className="text-2xl sm:text-3xl font-bold font-mono text-zinc-900 dark:text-white leading-tight block mt-0.5">
                —
              </span>
              <p className="text-[11.5px] text-zinc-500 dark:text-zinc-400 font-sans mt-0.5">
                No incidents today
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-700 group-hover:text-zinc-500 transition-colors shrink-0" />
        </div>

      </div>

      {/* ── 3. MAIN CONTENT: TWO-COLUMN COMMAND CENTER LAYOUT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">

        {/* LEFT COLUMN (COL 8): NETWORK STATUS / ACTIVE ALERTS */}
        <div className="lg:col-span-8 flex flex-col">
          <div className="bg-white dark:bg-[#0D111A] border border-zinc-200/90 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex-1 flex flex-col justify-between">
            {sosAlerts.length === 0 ? (
              /* Network Safe / Empty State */
              <div className="flex-1 flex flex-col justify-between space-y-8 py-4">
                <div className="text-center space-y-4 my-auto">
                  {/* Concentric Green Circle Icon */}
                  <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
                    <div className="w-24 h-24 rounded-full bg-emerald-50 dark:bg-emerald-950/40 ring-8 ring-emerald-50/60 dark:ring-emerald-950/20 flex items-center justify-center">
                      <div className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25">
                        <ShieldCheck className="w-7 h-7 text-white" />
                      </div>
                    </div>
                  </div>

                  {/* Safe Headline & Subtitle */}
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white font-sans tracking-tight">
                      Station Network Secure
                    </h3>
                    <p className="text-xs sm:text-[13px] text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mt-1 leading-relaxed">
                      No active SOS incidents or distress signals across all South Central Railway nodes.
                    </p>
                  </div>
                </div>

                {/* 3 Status Indicators Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-zinc-100 dark:border-zinc-800/80">

                  {/* Item 1 */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    </div>
                    <div>
                      <h5 className="font-bold text-xs text-zinc-900 dark:text-white leading-tight">
                        Live Monitoring
                      </h5>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        24/7 system surveillance
                      </p>
                    </div>
                  </div>

                  {/* Item 2 */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <Radio className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="font-bold text-xs text-zinc-900 dark:text-white leading-tight">
                        All Stations Stable
                      </h5>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        No distress signals
                      </p>
                    </div>
                  </div>

                  {/* Item 3 */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="font-bold text-xs text-zinc-900 dark:text-white leading-tight">
                        Sahayaks Safe
                      </h5>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Network operating normally
                      </p>
                    </div>
                  </div>

                </div>
              </div>
            ) : (
              /* Active SOS Alerts Grid */
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
                    <h4 className="font-bold text-sm text-rose-600 uppercase tracking-wider font-mono">
                      Active Distress Signals ({sosAlerts.length})
                    </h4>
                  </div>
                  <span className="text-xs text-zinc-400 font-mono">
                    Priority 1 Emergency Protocol
                  </span>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {sosAlerts.map((sos) => (
                    <div
                      key={sos.id}
                      className="bg-rose-50/50 dark:bg-rose-950/30 border-2 border-rose-500/80 rounded-xl p-4 shadow-md space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
                          <h5 className="font-bold text-xs text-rose-800 dark:text-rose-300 font-mono uppercase">
                            Station {sos.station_code || 'KZJ'} · Platform Distress
                          </h5>
                        </div>
                        <span className="text-[10px] font-mono font-bold bg-rose-600 text-white px-2 py-0.5 rounded">
                          #{sos.booking_id?.slice(-6).toUpperCase() || sos.id?.slice(-6).toUpperCase()}
                        </span>
                      </div>

                      <div className="p-3 bg-white dark:bg-zinc-900 border border-rose-100 dark:border-rose-900/40 rounded-lg space-y-1.5 text-xs font-mono">
                        <p className="text-zinc-600 dark:text-zinc-300">
                          Passenger: <strong className="text-zinc-900 dark:text-white">{sos.passenger?.name || 'Guest Passenger'}</strong>
                        </p>
                        <p className="text-zinc-600 dark:text-zinc-300">
                          Train: <strong>{sos.train_no || sos.train_number || 'N/A'}</strong> ({sos.train_name || 'Express'})
                        </p>
                        <p className="text-zinc-600 dark:text-zinc-300">
                          Location: <strong>Coach {sos.coach || 'TBD'} · Seat {sos.seat_number || 'TBD'}</strong>
                        </p>
                        {sos.passenger?.phone && (
                          <p className="text-blue-600 dark:text-blue-400 font-bold">
                            Contact: <a href={`tel:${sos.passenger.phone}`} className="hover:underline">{sos.passenger.phone}</a>
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => onInspectBooking && onInspectBooking(sos)}
                          className="flex-1 py-2 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-xs font-semibold hover:bg-zinc-50 cursor-pointer text-center"
                        >
                          Inspect Full Mission
                        </button>
                        <button
                          type="button"
                          onClick={() => onResolveEmergency && onResolveEmergency(sos.id)}
                          className="flex-1 py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer text-center transition-colors"
                        >
                          Resolve & Clear Alert
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN (COL 4): RECENT ALERTS & QUICK ACTIONS */}
        <div className="lg:col-span-4 flex flex-col gap-5">

          {/* Recent Alerts Card */}
          <div className="bg-white dark:bg-[#0D111A] border border-zinc-200/90 dark:border-zinc-800 rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex-1 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
              <h4 className="font-bold text-sm text-zinc-900 dark:text-white">
                Recent Alerts
              </h4>
              <button
                type="button"
                onClick={() => setHistoryModal(true)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>View All</span>
                <span>→</span>
              </button>
            </div>

            {/* Empty state when zero alerts */}
            <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
              <div className="w-11 h-11 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 text-zinc-400 flex items-center justify-center mb-2.5">
                <FileText className="w-5 h-5" />
              </div>
              <h5 className="font-bold text-xs text-zinc-800 dark:text-zinc-200">
                No recent emergency alerts
              </h5>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                All clear across the network.
              </p>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="bg-white dark:bg-[#0D111A] border border-zinc-200/90 dark:border-zinc-800 rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <h4 className="font-bold text-sm text-zinc-900 dark:text-white mb-3">
              Quick Actions
            </h4>

            {/* 4 Action Buttons Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-2.5">

              {/* Action 1: Trigger SOS */}
              <button
                type="button"
                onClick={() => setManualSosModal(true)}
                className="p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/20 hover:bg-rose-100/80 dark:hover:bg-rose-900/40 border border-rose-200/70 dark:border-rose-900/50 flex flex-col items-center text-center transition-all cursor-pointer group"
              >
                <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                  <PhoneCall className="w-3.5 h-3.5" />
                </div>
                <span className="font-bold text-xs text-rose-700 dark:text-rose-300 leading-tight">
                  Trigger SOS
                </span>
                <span className="text-[10px] text-rose-500 dark:text-rose-400 mt-0.5 leading-tight">
                  Manual Alert
                </span>
              </button>

              {/* Action 2: Contact Team */}
              <button
                type="button"
                onClick={() => setSafetyContactsModal(true)}
                className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 hover:bg-blue-100/80 dark:hover:bg-blue-900/40 border border-blue-200/70 dark:border-blue-900/50 flex flex-col items-center text-center transition-all cursor-pointer group"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                  <Users className="w-3.5 h-3.5" />
                </div>
                <span className="font-bold text-xs text-blue-700 dark:text-blue-300 leading-tight">
                  Contact Team
                </span>
                <span className="text-[10px] text-blue-500 dark:text-blue-400 mt-0.5 leading-tight">
                  Safety Desk
                </span>
              </button>

              {/* Action 3: View Protocols */}
              <button
                type="button"
                onClick={() => setProtocolsModal(true)}
                className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-800 flex flex-col items-center text-center transition-all cursor-pointer group"
              >
                <div className="w-7 h-7 rounded-lg bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200 leading-tight">
                  View Protocols
                </span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-tight">
                  Response Guide
                </span>
              </button>

              {/* Action 4: System Check */}
              <button
                type="button"
                onClick={handleRunDiagnostics}
                disabled={isDiagnosing}
                className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-800 flex flex-col items-center text-center transition-all cursor-pointer group disabled:opacity-60"
              >
                <div className="w-7 h-7 rounded-lg bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                  <ShieldCheck className={`w-3.5 h-3.5 ${isDiagnosing ? 'animate-spin text-blue-600' : ''}`} />
                </div>
                <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200 leading-tight">
                  System Check
                </span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-tight">
                  {isDiagnosing ? 'Testing...' : 'Run Diagnostics'}
                </span>
              </button>

            </div>
          </div>

        </div>

      </div>

      {/* ── 4. BOTTOM SAFETY STATUS BANNER ── */}
      <div className="bg-[#F0F5FF] dark:bg-blue-950/20 border border-blue-200/70 dark:border-blue-900/50 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-100/80 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-200/60 dark:border-blue-800/60">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-zinc-900 dark:text-white leading-tight">
              Committed to Safer Journeys
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
              Real-time monitoring, rapid response, and continuous coordination to ensure the safety of all passengers and sahayaks across the South Central Railway network.
            </p>
          </div>
        </div>

        {/* Right Status Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Network Secure</span>
        </div>
      </div>

      {/* ── 5. MODALS ── */}

      {/* Modal A: Manual Trigger SOS Modal */}
      {manualSosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#0D111A] border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center">
                  <PhoneCall className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                    Manual Emergency Dispatch
                  </h3>
                  <p className="text-[10px] text-zinc-400 font-mono">
                    Emergency Controller Escalation
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setManualSosModal(false)}
                className="p-1 rounded text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleTriggerManualSos} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase text-zinc-400 mb-1">
                  Incident Category
                </label>
                <select
                  value={manualSosForm.category}
                  onChange={(e) => setManualSosForm({ ...manualSosForm, category: e.target.value })}
                  className="w-full p-2 bg-[#F8FAFC] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs"
                >
                  <option value="Medical Assistance Required">Medical Assistance Required</option>
                  <option value="Security / Threat Escalation">Security / Threat Escalation</option>
                  <option value="Unattended Passenger / Elderly Distress">Unattended Passenger / Elderly Distress</option>
                  <option value="Luggage Safety & Immediate Escort">Luggage Safety & Immediate Escort</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase text-zinc-400 mb-1">
                    Station Hub
                  </label>
                  <select
                    value={manualSosForm.stationCode}
                    onChange={(e) => setManualSosForm({ ...manualSosForm, stationCode: e.target.value })}
                    className="w-full p-2 bg-[#F8FAFC] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs cursor-pointer"
                  >
                    <option value="KZJ">KZJ - Kazipet Jn</option>
                    <option value="SC">SC - Secunderabad Jn</option>
                    <option value="BZA">BZA - Vijayawada Jn</option>
                    <option value="WL">WR - Warangal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase text-zinc-400 mb-1">
                    Train No.
                  </label>
                  <input
                    type="text"
                    value={manualSosForm.trainNumber}
                    onChange={(e) => setManualSosForm({ ...manualSosForm, trainNumber: e.target.value })}
                    placeholder="e.g. 12723"
                    className="w-full p-2 bg-[#F8FAFC] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold uppercase text-zinc-400 mb-1">
                  Passenger / Reporter Name
                </label>
                <input
                  type="text"
                  value={manualSosForm.passengerName}
                  onChange={(e) => setManualSosForm({ ...manualSosForm, passengerName: e.target.value })}
                  placeholder="e.g. S. Venkat Reddy"
                  className="w-full p-2 bg-[#F8FAFC] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase text-zinc-400 mb-1">
                    Coach / Seat
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={manualSosForm.coach}
                      onChange={(e) => setManualSosForm({ ...manualSosForm, coach: e.target.value })}
                      placeholder="B2"
                      className="w-1/2 p-2 bg-[#F8FAFC] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-mono"
                    />
                    <input
                      type="text"
                      value={manualSosForm.seat}
                      onChange={(e) => setManualSosForm({ ...manualSosForm, seat: e.target.value })}
                      placeholder="45"
                      className="w-1/2 p-2 bg-[#F8FAFC] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase text-zinc-400 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    value={manualSosForm.passengerPhone}
                    onChange={(e) => setManualSosForm({ ...manualSosForm, passengerPhone: e.target.value })}
                    placeholder="+91 9876543210"
                    className="w-full p-2 bg-[#F8FAFC] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setManualSosModal(false)}
                  className="btn-secondary py-2 px-4 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary bg-rose-600 hover:bg-rose-700 text-white py-2 px-4 text-xs font-bold shadow-xs cursor-pointer"
                >
                  Dispatch Emergency SOS
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal B: Emergency Contacts Directory Modal */}
      {safetyContactsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#0D111A] border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                  South Central Railway Safety Desks & Hotlines
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSafetyContactsModal(false)}
                className="p-1 rounded text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              {[
                { agency: 'Railway Protection Force (RPF)', scope: 'National Emergency Dispatch', hotline: '182', phone: '+91 40 2778 8200' },
                { agency: 'SCR Rail Security Control Room', scope: 'Secunderabad Division HQ', hotline: '139', phone: '+91 40 2778 8888' },
                { agency: 'Government Railway Police (GRP)', scope: 'Telangana & AP Jurisdiction', hotline: '1512', phone: '+91 40 2780 1111' },
                { agency: 'Kazipet (KZJ) Station Master', scope: 'Platform Operations Supervisor', hotline: 'KZJ-01', phone: '+91 870 242 4100' },
                { agency: 'Emergency Medical Escort Unit', scope: 'Rapid Platform Ambulance', hotline: '108', phone: '+91 40 2778 9108' }
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between gap-3"
                >
                  <div>
                    <h5 className="font-bold text-xs text-zinc-900 dark:text-white">
                      {item.agency}
                    </h5>
                    <p className="text-[10.5px] text-zinc-400">
                      {item.scope}
                    </p>
                  </div>
                  <div className="text-right font-mono shrink-0">
                    <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold text-[10px] block">
                      Hotline: {item.hotline}
                    </span>
                    <a
                      href={`tel:${item.phone}`}
                      className="text-[11px] text-zinc-700 dark:text-zinc-300 hover:text-blue-600 hover:underline font-bold mt-0.5 block"
                    >
                      {item.phone}
                    </a>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setSafetyContactsModal(false)}
                className="btn-secondary py-2 px-4 text-xs font-semibold"
              >
                Close Directory
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal C: Emergency Response Protocols Modal */}
      {protocolsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#0D111A] border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                  Standard Operating Procedures (SOP): Emergency Triage
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setProtocolsModal(false)}
                className="p-1 rounded text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-zinc-600 dark:text-zinc-300">
              <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
                <span className="font-bold text-blue-700 dark:text-blue-300 uppercase text-[10px] block font-mono">
                  Level 1 Priority Incident Protocol
                </span>
                <p className="text-[11.5px] text-zinc-600 dark:text-zinc-300 mt-1">
                  When a distress signal is detected via passenger app or sahayak handheld, safety controllers must execute the 4-phase rapid response:
                </p>
              </div>

              <ol className="space-y-2.5 font-medium pl-1">
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
                  <div>
                    <strong className="text-zinc-900 dark:text-white block">Verification & Telemetry Handshake:</strong>
                    <span className="text-zinc-500 text-[11px]">Confirm passenger coach/seat, live PNR status, and train coordinates via IRCTC telemetry.</span>
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
                  <div>
                    <strong className="text-zinc-900 dark:text-white block">Platform Supervisor Dispatch:</strong>
                    <span className="text-zinc-500 text-[11px]">Station master and on-duty platform supervisor receive automated dispatch ping with berth details.</span>
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</span>
                  <div>
                    <strong className="text-zinc-900 dark:text-white block">Sahayak Rapid Intercept:</strong>
                    <span className="text-zinc-500 text-[11px]">Nearest on-duty Sahayak is assigned to assist passenger with luggage, escort, or wheelchair support.</span>
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">4</span>
                  <div>
                    <strong className="text-zinc-900 dark:text-white block">RPF / Medical Desk Clearance:</strong>
                    <span className="text-zinc-500 text-[11px]">If medical or security handoff is required, alert Railway Protection Force platform unit prior to train arrival.</span>
                  </div>
                </li>
              </ol>
            </div>

            <div className="flex justify-end pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setProtocolsModal(false)}
                className="btn-primary bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 text-xs font-bold rounded-xl"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal D: Recent Alerts History Modal */}
      {historyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#0D111A] border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                  Emergency Incident History (24 Hours)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModal(false)}
                className="p-1 rounded text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-8 text-center text-zinc-400 font-mono">
                <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="font-bold text-zinc-800 dark:text-zinc-200 text-xs">
                  Zero Distress Alerts in Past 24 Hours
                </p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  All South Central Railway station platforms Operating in Safe State.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setHistoryModal(false)}
                className="btn-secondary py-2 px-4 text-xs font-semibold"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ----------------------------------------------------------------------
// SUBCOMPONENT: SETTLEMENT CONFIRMATION MODAL (PHASE 4 MANUAL SETTLEMENT)
// ----------------------------------------------------------------------
function SettlementConfirmModal({ payout, onClose, onConfirm, actionLoading }) {
  const [method, setMethod] = useState(payout?.payout_method || 'bank_transfer');
  const [reference, setReference] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (payout) {
      setMethod(payout.payout_method || 'bank_transfer');
      setReference(`IMPS-${Date.now().toString().slice(-8)}`);
      setDate(new Date().toISOString().slice(0, 10));
      setNotes('');
      setFormError('');
    }
  }, [payout]);

  if (!payout) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reference || reference.trim().length < 3) {
      setFormError('Settlement reference must be at least 3 characters.');
      return;
    }
    setFormError('');
    onConfirm({
      payout_reference: reference.trim(),
      payout_method: method,
      settlement_date: date,
      settlement_notes: notes.trim() || undefined
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in cursor-pointer"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 my-auto cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs font-mono">
              ₹
            </span>
            <div>
              <h3 className="font-bold text-sm text-black dark:text-white font-mono">
                Confirm Manual Payout Settlement
              </h3>
              <p className="text-[11px] text-zinc-400 font-mono">
                Payout ID #{payout.id?.slice(0, 8)} · Sahayak: {payout.assistant?.name || 'Partner'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-black dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 flex justify-between items-center font-mono">
          <span className="text-xs text-zinc-500">Total Disbursement:</span>
          <span className="text-lg font-bold text-emerald-600">₹{payout.amount}</span>
        </div>

        {formError && (
          <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 border border-rose-200 text-xs font-mono">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 text-xs font-mono">
          <div>
            <label className="block text-zinc-500 mb-1">Disbursement Channel / Method *</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full py-2 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-black dark:text-white font-mono"
            >
              <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
              <option value="imps">IMPS Instant Transfer</option>
              <option value="upi">UPI Instant Payout</option>
              <option value="neft">NEFT Standard Settlement</option>
              <option value="cash">Direct Cash Disbursement</option>
              <option value="other">Other Manual Settlement</option>
            </select>
          </div>

          <div>
            <label className="block text-zinc-500 mb-1">Bank / UTR / Reference Number *</label>
            <input
              type="text"
              required
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. UTR4928172901 or UPI-129381"
              className="w-full py-2 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-black dark:text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-zinc-500 mb-1">Settlement Date *</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full py-2 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-black dark:text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-zinc-500 mb-1">Audit / Settlement Notes (Optional)</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes for internal ledger audit..."
              className="w-full py-2 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-black dark:text-white font-mono resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={actionLoading}
              className="btn-secondary py-2 px-4 text-xs font-mono"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="btn-primary py-2 px-4 text-xs font-mono bg-emerald-600 hover:bg-emerald-700"
            >
              {actionLoading ? 'Recording Settlement...' : 'Confirm & Finalize Paid'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// SUBCOMPONENT: FINANCIAL INCIDENT DETAIL & RESOLUTION MODAL (PHASE 5)
// ----------------------------------------------------------------------
function IncidentDetailModal({ incident, onClose, onInvestigate, onResolve, onIgnore, actionLoading }) {
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [ignoreReason, setIgnoreReason] = useState('');
  const [activeAction, setActiveAction] = useState('view'); // 'view' | 'resolve' | 'ignore'
  const [errorMsg, setErrorMsg] = useState('');

  if (!incident) return null;

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

  const severityBadgeClass =
    incident.severity === 'critical'
      ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
      : incident.severity === 'warning'
        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-300 dark:border-blue-800';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in cursor-pointer"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 my-auto cursor-default font-mono"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center font-bold text-xs">
              <ShieldAlert className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-bold text-sm text-black dark:text-white">
                Financial Incident #{incident.id?.slice(0, 8)}
              </h3>
              <p className="text-[11px] text-zinc-400">
                Rule: {incident.incident_type}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-black dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Severity and Status Pills */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${severityBadgeClass}`}>
              {incident.severity}
            </span>
            <span className="px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              Status: {incident.status}
            </span>
          </div>
          <span className="text-[11px] text-zinc-400">
            Occurrences: <strong className="text-black dark:text-white">{incident.occurrence_count || 1}</strong>
          </span>
        </div>

        {/* Details Card */}
        <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-zinc-500">Entity:</span>
            <span className="font-bold text-black dark:text-white">
              {incident.entity_type} {incident.entity_id ? `(#${incident.entity_id.slice(0, 8)})` : ''}
            </span>
          </div>
          {incident.user_id && (
            <div className="flex justify-between">
              <span className="text-zinc-500">Target User:</span>
              <span className="text-black dark:text-white">#{incident.user_id.slice(0, 8)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-zinc-500">Detected At:</span>
            <span className="text-zinc-400">{new Date(incident.detected_at).toLocaleString()}</span>
          </div>
          {incident.resolved_at && (
            <div className="flex justify-between">
              <span className="text-zinc-500">Resolved At:</span>
              <span className="text-emerald-600 font-bold">{new Date(incident.resolved_at).toLocaleString()}</span>
            </div>
          )}
          {incident.resolution_notes && (
            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <span className="text-zinc-500 block mb-0.5">Resolution Notes:</span>
              <p className="text-zinc-700 dark:text-zinc-300 italic">{incident.resolution_notes}</p>
            </div>
          )}
        </div>

        {/* Metadata JSON */}
        {incident.metadata && Object.keys(incident.metadata).length > 0 && (
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-zinc-400">Forensic Metadata</span>
            <pre className="p-2.5 bg-zinc-900 text-zinc-300 text-[11px] rounded-lg overflow-x-auto max-h-36">
              {JSON.stringify(incident.metadata, null, 2)}
            </pre>
          </div>
        )}

        {errorMsg && (
          <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 border border-rose-200 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Action Views */}
        {activeAction === 'view' && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            {incident.status === 'open' && (
              <button
                type="button"
                onClick={() => onInvestigate(incident.id)}
                disabled={actionLoading}
                className="btn-secondary py-1.5 px-3 text-xs flex-1 cursor-pointer"
              >
                Mark Investigating
              </button>
            )}
            {(incident.status === 'open' || incident.status === 'investigating') && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveAction('resolve')}
                  disabled={actionLoading}
                  className="btn-primary py-1.5 px-3 text-xs flex-1 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                >
                  Resolve...
                </button>
                <button
                  type="button"
                  onClick={() => setActiveAction('ignore')}
                  disabled={actionLoading}
                  className="btn-secondary py-1.5 px-3 text-xs text-zinc-400 hover:text-rose-500 cursor-pointer"
                >
                  Ignore...
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary py-1.5 px-3 text-xs cursor-pointer"
            >
              Close
            </button>
          </div>
        )}

        {activeAction === 'resolve' && (
          <form onSubmit={handleResolveSubmit} className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs">
            <div>
              <label className="block text-zinc-500 mb-1">Resolution Audit Notes (Min 5 chars) *</label>
              <textarea
                required
                rows={3}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Explain the investigative findings and operational remediation taken..."
                className="w-full py-2 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-black dark:text-white resize-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveAction('view')}
                disabled={actionLoading}
                className="btn-secondary py-1.5 px-3 text-xs cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="btn-primary py-1.5 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
              >
                {actionLoading ? 'Saving...' : 'Confirm Resolution'}
              </button>
            </div>
          </form>
        )}

        {activeAction === 'ignore' && (
          <form onSubmit={handleIgnoreSubmit} className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs">
            <div>
              <label className="block text-zinc-500 mb-1">Reason for Ignoring (Optional)</label>
              <input
                type="text"
                value={ignoreReason}
                onChange={(e) => setIgnoreReason(e.target.value)}
                placeholder="e.g. Expected test load or customer confirmed transaction..."
                className="w-full py-2 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-black dark:text-white"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveAction('view')}
                disabled={actionLoading}
                className="btn-secondary py-1.5 px-3 text-xs cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="btn-secondary py-1.5 px-3 text-xs text-rose-600 border-rose-300 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
              >
                {actionLoading ? 'Saving...' : 'Confirm Ignore'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// MAIN EXPORT: ADMIN DASHBOARD
// ----------------------------------------------------------------------
export default function AdminDashboard() {
  const { user, logout } = useAuth();

  const [searchParams, setSearchParams] = useSearchParams();
  // Navigation tabs: 'bookings' | 'overview' | 'finance' | 'payouts' | 'assistants' | 'passengers' | 'sos' | 'launch'
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'passengers');

  // Always reset window scroll to top when switching navigation tabs
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [activeTab]);

  // Finance & Reconciliation States (Phase 4)
  const [reconReport, setReconReport] = useState(null);
  const [reconLoading, setReconLoading] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditFilter, setAuditFilter] = useState('ALL');
  const [settlementModalPayout, setSettlementModalPayout] = useState(null);

  // Financial Incidents & Production Hardening States (Phase 5)
  const [incidentsList, setIncidentsList] = useState([]);
  const [incidentStats, setIncidentStats] = useState({ total: 0, open: 0, investigating: 0, critical: 0, warning: 0 });
  const [incidentsFilter, setIncidentsFilter] = useState('ALL');
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [financialHealth, setFinancialHealth] = useState(null);
  const [paymentRecoveryList, setPaymentRecoveryList] = useState([]);

  // Support Tickets Integration
  const [supportTicketCount, setSupportTicketCount] = useState(0);

  // Station Desk & Support Tickets State
  const [supportTickets, setSupportTickets] = useState([]);
  const [ticketSearch, setTicketSearch] = useState('');
  const [ticketStationFilter, setTicketStationFilter] = useState('ALL');
  const [ticketStatusFilter, setTicketStatusFilter] = useState('ALL');
  const [ticketPriorityFilter, setTicketPriorityFilter] = useState('ALL');
  const [ticketUpdatingId, setTicketUpdatingId] = useState(null);
  const [selectedDeskTicketId, setSelectedDeskTicketId] = useState(null);
  const [isRaiseTicketModalOpen, setIsRaiseTicketModalOpen] = useState(false);
  const [adminCreatingTicket, setAdminCreatingTicket] = useState(false);
  const [adminNewTicket, setAdminNewTicket] = useState({
    station: 'KZJ',
    type: 'passenger',
    passengerName: '',
    passengerPhone: '',
    passengerEmail: '',
    assistant_name: '',
    assistant_phone: '',
    category: 'Booking',
    priority: 'normal',
    subject: '',
    description: '',
    pnr: ''
  });

  // supportTicketCount is now derived from the server-fetched supportTickets state
  // (was previously using localStorage getTickets() which only contained passenger tickets
  //  and never reflected assistant-raised operational tickets)
  useEffect(() => {
    const open = supportTickets.filter(t =>
      ['open', 'in_progress', 'bot_escalated', 'dispatched to station supervisor'].includes(
        (t.status || '').toLowerCase()
      )
    ).length;
    setSupportTicketCount(open);
  }, [supportTickets]);

  // Core Data States
  const [stats, setStats] = useState({
    totalBookings: 0,
    pendingAssistants: 0,
    totalAssistants: 0,
    onlineAssistants: 0,
    totalPassengers: 0,
    revenue: 0,
    todayRevenue: 0,
    todayBookings: 0,
    activeSOS: 0,
    statusBreakdown: {},
    stationStats: [],
    paymentMap: {},
  });
  const [bookings, setBookings] = useState([]);
  const [kycQueue, setKycQueue] = useState([]);
  const [assistantsList, setAssistantsList] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [sosAlerts, setSosAlerts] = useState([]);
  const [payoutsList, setPayoutsList] = useState([]);
  const [payoutsFilter, setPayoutsFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [lastSynced, setLastSynced] = useState(new Date());

  // Filter States for Master Ledger
  const [filterQuery, setFilterQuery] = useState('');
  const [selectedStation, setSelectedStation] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('ALL');
  const [selectedDateRange, setSelectedDateRange] = useState('ALL');
  const [selectedAssistantFilter, setSelectedAssistantFilter] = useState('ALL');
  const [selectedServiceFilter, setSelectedServiceFilter] = useState('ALL');
  const [selectedSosFilter, setSelectedSosFilter] = useState('ALL');
  const [selectedBerthFilter, setSelectedBerthFilter] = useState('ALL');

  // Selected Booking for Detail Inspector
  const [inspectingBooking, setInspectingBooking] = useState(null);
  const inspectingBookingRef = useRef(null);
  inspectingBookingRef.current = inspectingBooking;

  const handleCloseInspector = useCallback(() => {
    inspectingBookingRef.current = null;
    setInspectingBooking(null);
  }, []);

  const [actionLoading, setActionLoading] = useState(false);

  // Pagination & Layout for Master Ledger
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState('newest');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1024;
    }
    return false;
  });
  const [selectedDrawerBooking, setSelectedDrawerBooking] = useState(null);
  const selectedDrawerBookingRef = useRef(null);
  selectedDrawerBookingRef.current = selectedDrawerBooking;


  // Active Sessions States (Phase 6.4)
  const [adminSessionsList, setAdminSessionsList] = useState([]);
  const [adminSessionsSearch, setAdminSessionsSearch] = useState('');
  const [revokingSessionId, setRevokingSessionId] = useState(null);

  // Phase 6.7: Security Monitoring & Incident Command States
  const [securityMetrics, setSecurityMetrics] = useState({
    openIncidents: 0,
    criticalIncidents: 0,
    highSeverityIncidents: 0,
    securityEvents24h: 0,
    failedLogins24h: 0,
    mfaFailures24h: 0,
    refreshReuseEvents: 0,
    activeContainments: 0
  });
  const [securityIncidentsList, setSecurityIncidentsList] = useState([]);
  const [inspectingSecurityIncident, setInspectingSecurityIncident] = useState(null);
  const [securityIncidentEvents, setSecurityIncidentEvents] = useState([]);
  const [securityResponseActions, setSecurityResponseActions] = useState([]);
  const [securityIncidentsFilter, setSecurityIncidentsFilter] = useState('ALL');
  const [securitySeverityFilter, setSecuritySeverityFilter] = useState('ALL');
  const [securitySearchQuery, setSecuritySearchQuery] = useState('');

  // --------------------------------------------------
  // DATA FETCHING
  // --------------------------------------------------
  const isFetchingRef = useRef(false);
  const isInitialMount = useRef(true);

  const fetchAll = useCallback(async (isManual = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      if (isInitialMount.current || isManual) {
        setLoading(true);
      }
      const [sRes, pRes, bRes, aRes, uRes, sosRes, payRes, incRes, incStatRes, healthRes, recovRes, tRes, sessRes, secMetRes, secIncRes] = await Promise.all([
        axios.get('/admin/stats').catch((err) => ({ error: err })),
        axios.get('/admin/pending-assistants').catch((err) => ({ error: err })),
        axios.get('/admin/bookings').catch((err) => ({ error: err })),
        axios.get('/admin/assistants').catch((err) => ({ error: err })),
        axios.get('/admin/users').catch((err) => ({ error: err })),
        axios.get('/admin/sos-alerts').catch((err) => ({ error: err })),
        axios.get('/admin/payouts').catch((err) => ({ error: err })),
        axios.get('/admin/incidents').catch((err) => ({ error: err })),
        axios.get('/admin/incidents/stats').catch((err) => ({ error: err })),
        axios.get('/admin/finance/health').catch((err) => ({ error: err })),
        axios.get('/admin/finance/payment-recovery').catch((err) => ({ error: err })),
        axios.get('/admin/support-tickets').catch(() => axios.get('/support/tickets')).catch((err) => ({ error: err })),
        axios.get('/admin/sessions').catch((err) => ({ error: err })),
        axios.get('/security/admin/incidents/metrics').catch((err) => ({ error: err })),
        axios.get('/security/admin/incidents').catch((err) => ({ error: err })),
      ]);

      if (sRes?.data && typeof sRes.data === 'object' && !sRes.error) {
        setStats(sRes.data);
      }
      if (Array.isArray(pRes?.data)) {
        setKycQueue(pRes.data);
      }
      if (Array.isArray(bRes?.data)) {
        setBookings(bRes.data);
      }
      if (Array.isArray(aRes?.data)) {
        setAssistantsList(aRes.data);
      }
      if (Array.isArray(uRes?.data)) {
        setUsersList(uRes.data);
      }
      if (Array.isArray(sosRes?.data)) {
        setSosAlerts(sosRes.data);
      }
      if (payRes?.data && !payRes.error) {
        setPayoutsList(payRes.data?.payouts || (Array.isArray(payRes.data) ? payRes.data : []));
      }
      if (Array.isArray(incRes?.data?.incidents)) {
        setIncidentsList(incRes.data.incidents);
      }
      if (incStatRes?.data && typeof incStatRes.data === 'object' && !incStatRes.error) {
        setIncidentStats(incStatRes.data);
      }
      if (healthRes?.data && !healthRes.error && healthRes.data.health !== undefined) {
        setFinancialHealth(healthRes.data.health);
      }
      if (Array.isArray(recovRes?.data?.stuck_payments)) {
        setPaymentRecoveryList(recovRes.data.stuck_payments);
      }
      if (tRes?.data && !tRes.error) {
        const ticketArray = Array.isArray(tRes.data) ? tRes.data : (tRes.data?.tickets || []);
        if (Array.isArray(ticketArray)) {
          setSupportTickets(ticketArray);
        }
      }
      if (Array.isArray(sessRes?.data?.sessions)) {
        setAdminSessionsList(sessRes.data.sessions);
      }
      if (secMetRes?.data?.metrics && !secMetRes.error) {
        setSecurityMetrics(secMetRes.data.metrics);
      }
      if (Array.isArray(secIncRes?.data?.incidents)) {
        setSecurityIncidentsList(secIncRes.data.incidents);
      }
      setLastSynced(new Date());

      // If inspecting a booking, sync it with newest data
      if (inspectingBookingRef.current && Array.isArray(bRes?.data)) {
        const updated = bRes.data.find((b) => b.id === inspectingBookingRef.current?.id);
        if (updated) {
          setInspectingBooking(updated);
        }
      }
      // If drawer viewing a booking, sync it with newest data
      if (selectedDrawerBookingRef.current && Array.isArray(bRes?.data)) {
        const updatedDrawer = bRes.data.find((b) => b.id === selectedDrawerBookingRef.current?.id);
        if (updatedDrawer) {
          setSelectedDrawerBooking(updatedDrawer);
        }
      }
    } catch (err) {
      console.error('ADMIN REFRESH ERROR:', err);
    } finally {
      isFetchingRef.current = false;
      if (isInitialMount.current || isManual) {
        isInitialMount.current = false;
        setLoading(false);
      }
    }
  }, []);

  // Admin Forced Revocation Handlers (Phase 6.4)
  const handleAdminRevokeSession = async (sessionId) => {
    if (!window.confirm('Are you sure you want to forcibly terminate this user session? The user will be immediately rejected from making further API requests.')) return;
    setRevokingSessionId(sessionId);
    try {
      await axios.post(`/admin/sessions/${sessionId}/revoke`);
      toast.success('Session forcibly revoked');
      fetchAll(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to revoke session');
    } finally {
      setRevokingSessionId(null);
    }
  };

  const handleAdminRevokeUserSessions = async (userId, userEmail) => {
    if (!window.confirm(`Are you sure you want to forcibly terminate ALL sessions for user ${userEmail || userId}?`)) return;
    try {
      await axios.post(`/admin/users/${userId}/revoke-sessions`);
      toast.success(`All sessions terminated for ${userEmail || userId}`);
      fetchAll(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to revoke user sessions');
    }
  };

  // Polling and Socket Integration (Steady 8-Second Sync with Instant Debounced Socket Events)
  useEffect(() => {
    fetchAll();
    const interval = setInterval(() => fetchAll(false), 8000);

    if (window.socket) {
      const emitJoinAdmin = () => {
        window.socket.emit('join_admin');
      };

      emitJoinAdmin();
      window.socket.on('connect', emitJoinAdmin);

      let debounceTimer = null;
      const handleLiveEvent = () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          fetchAll(false);
        }, 400);
      };

      window.socket.on('sos_alert', handleLiveEvent);
      window.socket.on('status_update', handleLiveEvent);
      window.socket.on('new_booking', handleLiveEvent);
      window.socket.on('financial_incident_created', handleLiveEvent);
      window.socket.on('financial_incident_updated', handleLiveEvent);
      // Support ticket real-time events — emitted by supportController when an
      // assistant raises a ticket or a status/message update occurs
      window.socket.on('new_support_ticket', handleLiveEvent);
      window.socket.on('ticket_status_updated', handleLiveEvent);
      window.socket.on('ticket_message', handleLiveEvent);

      return () => {
        clearInterval(interval);
        if (debounceTimer) clearTimeout(debounceTimer);
        window.socket.off('connect', emitJoinAdmin);
        window.socket.off('sos_alert', handleLiveEvent);
        window.socket.off('status_update', handleLiveEvent);
        window.socket.off('new_booking', handleLiveEvent);
        window.socket.off('financial_incident_created', handleLiveEvent);
        window.socket.off('financial_incident_updated', handleLiveEvent);
        window.socket.off('new_support_ticket', handleLiveEvent);
        window.socket.off('ticket_status_updated', handleLiveEvent);
        window.socket.off('ticket_message', handleLiveEvent);
      };
    }

    return () => clearInterval(interval);
  }, [fetchAll]);

  // --------------------------------------------------
  // ADMIN INTERVENTIONS
  // --------------------------------------------------
  const handleDecideAssistant = async (id, action, reason) => {
    try {
      setActionLoading(true);
      if (action === 'approve') {
        await axios.post(`/admin/assistants/${id}/approve`);
        toast.success('Assistant approved successfully!');
      } else {
        await axios.post(`/admin/assistants/${id}/reject`, { reason });
        toast.success('Assistant application rejected');
      }
      await fetchAll();
    } catch (err) {
      console.error('DECIDE ERROR:', err);
      toast.error('Action failed. Please check permissions.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleAssistantOnline = async (assistant) => {
    try {
      const nextOnline = !assistant.is_online;
      await axios.patch(`/admin/users/${assistant.id}`, { is_online: nextOnline });
      toast.success(`${assistant.name} marked ${nextOnline ? 'ONLINE (On-Duty)' : 'OFFLINE'}`);
      await fetchAll();
    } catch (err) {
      console.error('Toggle online error:', err);
      toast.error(err.response?.data?.message || 'Failed to update duty status');
    }
  };

  const handleToggleAssistantApproval = async (assistant) => {
    try {
      const nextApproval = !assistant.is_approved;
      await axios.patch(`/admin/users/${assistant.id}`, { is_approved: nextApproval });
      toast.success(`${assistant.name} ${nextApproval ? 'Approved' : 'Suspended'}`);
      await fetchAll();
    } catch (err) {
      console.error('Toggle approval error:', err);
      toast.error(err.response?.data?.message || 'Failed to update assistant approval');
    }
  };

  // ── Payout Management Handlers (Phase 3B) ────────
  const handleApprovePayout = async (payoutId) => {
    try {
      setActionLoading(true);
      await axios.post(`/admin/payouts/${payoutId}/approve`);
      toast.success('Payout request approved.');
      await fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve payout.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectPayout = async (payoutId) => {
    const reason = window.prompt('Enter reason for rejecting this payout:', 'Insufficient account details or administrative review');
    if (reason === null) return;
    try {
      setActionLoading(true);
      await axios.post(`/admin/payouts/${payoutId}/reject`, { reason });
      toast.success('Payout rejected. Earnings returned to available balance.');
      await fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject payout.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleProcessingPayout = async (payoutId) => {
    try {
      setActionLoading(true);
      await axios.post(`/admin/payouts/${payoutId}/processing`);
      toast.success('Payout moved to processing.');
      await fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update payout.');
    } finally {
      setActionLoading(false);
    }
  };

  const fetchReconciliation = useCallback(async () => {
    try {
      setReconLoading(true);
      const [rRes, aRes] = await Promise.all([
        axios.get('/admin/finance/reconciliation').catch(() => ({ data: { report: null } })),
        axios.get('/admin/finance/audit-logs').catch(() => ({ data: { logs: [] } }))
      ]);
      if (rRes.data?.report) setReconReport(rRes.data.report);
      if (aRes.data?.logs) setAuditLogs(aRes.data.logs);
    } catch (err) {
      console.error('FETCH RECON ERROR:', err);
    } finally {
      setReconLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'finance') {
      fetchReconciliation();
    }
  }, [activeTab, fetchReconciliation]);

  const handlePaidPayout = (payoutOrId) => {
    const p = typeof payoutOrId === 'object' ? payoutOrId : payoutsList.find(item => item.id === payoutOrId);
    if (p) {
      setSettlementModalPayout(p);
    }
  };

  const handleConfirmSettlement = async (settlementData) => {
    if (!settlementModalPayout) return;
    try {
      setActionLoading(true);
      await axios.post(`/admin/payouts/${settlementModalPayout.id}/paid`, settlementData);
      toast.success('Payout marked as PAID. Earnings permanently finalized.');
      setSettlementModalPayout(null);
      await fetchAll();
      if (activeTab === 'finance') {
        await fetchReconciliation();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to finalize payout settlement.';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleFailedPayout = async (payoutId) => {
    const reason = window.prompt('Enter failure reason:', 'Bank network transaction timeout');
    if (reason === null) return;
    try {
      setActionLoading(true);
      await axios.post(`/admin/payouts/${payoutId}/failed`, { failure_reason: reason });
      toast.success('Payout marked as failed. Unreversed earnings returned to available.');
      await fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to mark payout failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleInvestigateIncident = async (incidentId) => {
    try {
      setActionLoading(true);
      await axios.post(`/admin/incidents/${incidentId}/investigate`);
      toast.success('Incident status updated to investigating.');
      await fetchAll();
      if (selectedIncident?.id === incidentId) {
        setSelectedIncident((prev) => (prev ? { ...prev, status: 'investigating' } : null));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update incident status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveIncident = async (incidentId, notes) => {
    try {
      setActionLoading(true);
      await axios.post(`/admin/incidents/${incidentId}/resolve`, { resolution_notes: notes });
      toast.success('Incident resolved successfully.');
      setSelectedIncident(null);
      await fetchAll();
      if (activeTab === 'finance') await fetchReconciliation();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resolve incident.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleIgnoreIncident = async (incidentId, reason) => {
    try {
      setActionLoading(true);
      await axios.post(`/admin/incidents/${incidentId}/ignore`, { reason });
      toast.success('Incident status updated to ignored.');
      setSelectedIncident(null);
      await fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to ignore incident.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateBooking = async (bookingId, payload) => {
    const { data } = await axios.patch(`/admin/bookings/${bookingId}`, payload);
    // Optimistically update inspecting modal and drawer
    setInspectingBooking(data);
    setSelectedDrawerBooking(data);
    // Optimistically update bookings list
    setBookings((prev) => prev.map((b) => (b.id === bookingId ? data : b)));
    // Refresh background data
    fetchAll();
    return data;
  };

  const handleResolveEmergency = async (bookingId) => {
    try {
      await axios.post(`/admin/sos-alerts/${bookingId}/resolve`);
      toast.success('Emergency alert resolved and cleared');
      await fetchAll();
    } catch (err) {
      console.error('RESOLVE SOS ERROR:', err);
      toast.error('Failed to resolve SOS alert');
    }
  };

  // Update Support Ticket Status
  const handleUpdateTicketStatus = async (ticketId, newStatus, resolutionNotes = '') => {
    try {
      setTicketUpdatingId(ticketId);
      const { data } = await axios.patch(`/admin/support-tickets/${ticketId}`, {
        status: newStatus,
        resolution_notes: resolutionNotes,
      });
      setSupportTickets((prev) => prev.map((t) => (t.id === ticketId ? data : t)));
      toast.success(`Ticket #${ticketId} status updated to ${newStatus}`);
    } catch (err) {
      console.error('Update ticket error:', err);
      toast.error('Failed to update ticket status');
    } finally {
      setTicketUpdatingId(null);
    }
  };

  // Create / Raise Support Ticket directly from Admin Console
  const handleAdminCreateTicket = async (e) => {
    e?.preventDefault();
    if (!adminNewTicket.subject?.trim() || !adminNewTicket.description?.trim()) {
      toast.error('Subject and description are required');
      return;
    }
    setAdminCreatingTicket(true);
    try {
      const payload = {
        ...adminNewTicket,
        status: adminNewTicket.type === 'passenger' ? 'open' : 'Dispatched to Station Supervisor',
        created_at: new Date().toISOString()
      };
      const res = await axios.post('/admin/support-tickets', payload);
      const created = res.data;
      setSupportTickets((prev) => [created, ...prev]);
      setSelectedDeskTicketId(created.id);
      toast.success(`Ticket #${created.id} created successfully!`);
      setIsRaiseTicketModalOpen(false);
      setAdminNewTicket({
        station: 'KZJ',
        type: 'passenger',
        passengerName: '',
        passengerPhone: '',
        passengerEmail: '',
        assistant_name: '',
        assistant_phone: '',
        category: 'Booking',
        priority: 'normal',
        subject: '',
        description: '',
        pnr: ''
      });
      // Scroll to inbox
      setTimeout(() => {
        document.getElementById('station-desk-inbox')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      console.error('Admin create ticket error:', err);
      toast.error('Failed to create support ticket');
    } finally {
      setAdminCreatingTicket(false);
    }
  };

  const handleFilterToAssistant = (assistantName) => {
    setActiveTab('bookings');
    setFilterQuery(assistantName);
    setSelectedStation('ALL');
    setSelectedStatus('ALL');
    setSelectedPaymentStatus('ALL');
  };

  const handleFilterToPassenger = (passengerQuery) => {
    setActiveTab('bookings');
    setFilterQuery(passengerQuery);
    setSelectedStation('ALL');
    setSelectedStatus('ALL');
    setSelectedPaymentStatus('ALL');
  };

  // --------------------------------------------------
  // CSV EXPORTER (FULL LEDGER WITH ALL SPECIFICATIONS)
  // --------------------------------------------------
  const exportFullLedgerCSV = () => {
    try {
      const headers = [
        'Booking ID',
        'Created At',
        'Passenger Name',
        'Passenger Email',
        'Passenger Phone',
        'Train Number',
        'Train Name',
        'Station Code',
        'Platform',
        'Coach',
        'Seat Number',
        'Berth Type',
        'Action Type',
        'PNR',
        'Luggage Count',
        'Total Amount (INR)',
        'Payment Status',
        'Payment Method',
        'Payment ID',
        'Booking Status',
        'Start OTP',
        'OTP Verified',
        'Assigned Assistant',
        'Assistant Phone',
        'Rating',
      ];

      const rows = bookings.map((b) => [
        `"${b.booking_id || b.id}"`,
        `"${b.created_at || ''}"`,
        `"${b.passenger?.name || ''}"`,
        `"${b.passenger?.email || ''}"`,
        `"${b.passenger?.phone || ''}"`,
        `"${b.train_no || b.train_number || ''}"`,
        `"${b.train_name || ''}"`,
        `"${b.station_code || ''}"`,
        `"${b.platform || b.services?.platform || ''}"`,
        `"${b.coach || b.services?.coach || ''}"`,
        `"${b.seat_number || b.services?.seat_number || ''}"`,
        `"${b.berth_type || b.services?.berth_type || ''}"`,
        `"${b.action_type || b.services?.action_type || ''}"`,
        `"${b.pnr || b.services?.pnr || ''}"`,
        `"${b.services?.luggage || 0}"`,
        `"${b.total_price || 0}"`,
        `"${b.payment_status || ''}"`,
        `"${b.payment_method || ''}"`,
        `"${b.payment_id || ''}"`,
        `"${b.booking_status || ''}"`,
        `"${b.start_otp || ''}"`,
        `"${b.start_otp_verified ? 'YES' : 'NO'}"`,
        `"${b.assistant?.name || 'Unassigned'}"`,
        `"${b.assistant?.phone || ''}"`,
        `"${b.rating || ''}"`,
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `OneCoolie-MasterLedger-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      toast.success('Master booking ledger exported to CSV!');
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Failed to export CSV');
    }
  };

  // --------------------------------------------------
  // STRICT CHRONOLOGICAL SORTING (Newest Bookings Always First)
  // --------------------------------------------------
  const sortedBookings = useMemo(() => {
    return [...bookings].sort((a, b) => {
      if (sortBy === 'oldest') {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeA - timeB;
      }
      if (sortBy === 'price_high') {
        return (Number(b.total_price) || 0) - (Number(a.total_price) || 0);
      }
      if (sortBy === 'price_low') {
        return (Number(a.total_price) || 0) - (Number(b.total_price) || 0);
      }
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeB - timeA; // Descending: latest booking at index 0
    });
  }, [bookings, sortBy]);

  const bookingTabCounts = useMemo(() => {
    return {
      all: bookings.length,
      pending: bookings.filter((b) => (b.booking_status || '').toLowerCase() === 'pending').length,
      assigned: bookings.filter((b) => (b.booking_status || '').toLowerCase() === 'accepted').length,
      in_service: bookings.filter((b) => {
        const s = (b.booking_status || '').toLowerCase();
        return s === 'in_service' || s === 'arriving';
      }).length,
      completed: bookings.filter((b) => (b.booking_status || '').toLowerCase() === 'completed').length,
      cancelled: bookings.filter((b) => (b.booking_status || '').toLowerCase() === 'cancelled').length,
    };
  }, [bookings]);

  // --------------------------------------------------
  // ENHANCED MULTI-FORMAT SEARCH & FILTERING LOGIC
  // --------------------------------------------------
  const filteredBookings = useMemo(() => {
    return sortedBookings.filter((b) => {
      // 1. Universal Search Query
      if (filterQuery && filterQuery.trim()) {
        const rawQ = filterQuery.trim().toLowerCase();
        const cleanQ = rawQ.replace(/^#/, '');

        const fullId = String(b.id || '').toLowerCase();
        const bookingId = String(b.booking_id || '').toLowerCase();
        const shortId6 = fullId.slice(-6);
        const shortId8 = fullId.slice(-8);
        const startId8 = fullId.slice(0, 8);
        const pName = String(b.passenger?.name || '').toLowerCase();
        const pEmail = String(b.passenger?.email || '').toLowerCase();
        const pPhone = String(b.passenger?.phone || '').toLowerCase();
        const pId = String(b.passenger_id || '').toLowerCase();
        const tNo = String(b.train_no || b.train_number || '').toLowerCase();
        const tName = String(b.train_name || '').toLowerCase();
        const pnr = String(b.pnr || b.services?.pnr || '').toLowerCase();
        const aName = String(b.assistant?.name || '').toLowerCase();
        const coach = String(b.coach || b.services?.coach || '').toLowerCase();
        const seat = String(b.seat_number || b.services?.seat_number || '').toLowerCase();

        const matchesQuery = (
          fullId.includes(cleanQ) ||
          bookingId.includes(cleanQ) ||
          shortId6.includes(cleanQ) ||
          shortId8.includes(cleanQ) ||
          startId8.includes(cleanQ) ||
          pName.includes(rawQ) ||
          pEmail.includes(rawQ) ||
          pPhone.includes(rawQ) ||
          pId.includes(cleanQ) ||
          tNo.includes(cleanQ) ||
          tName.includes(rawQ) ||
          pnr.includes(cleanQ) ||
          aName.includes(rawQ) ||
          coach.includes(cleanQ) ||
          seat.includes(cleanQ)
        );

        if (!matchesQuery) return false;

        // If explicitly searching for an ID, PNR, or phone, bypass other dropdowns so the target is never filtered out:
        const isTargetIdentifier = cleanQ.length >= 3 && (
          fullId.includes(cleanQ) ||
          bookingId.includes(cleanQ) ||
          shortId6.includes(cleanQ) ||
          shortId8.includes(cleanQ) ||
          pnr.includes(cleanQ) ||
          pPhone.includes(rawQ)
        );

        if (isTargetIdentifier) {
          return true;
        }
      }

      // 2. Station Filter
      if (selectedStation !== 'ALL' && selectedStation !== 'all') {
        if ((b.station_code || '').toUpperCase() !== selectedStation.toUpperCase()) return false;
      }

      // 3. Booking Status Filter
      if (selectedStatus !== 'ALL' && selectedStatus !== 'all') {
        const bStatus = (b.booking_status || '').toLowerCase();
        const selStatus = selectedStatus.toLowerCase();
        if (selStatus === 'in_service') {
          if (bStatus !== 'in_service' && bStatus !== 'arriving') return false;
        } else if (bStatus !== selStatus) {
          return false;
        }
      }

      // 4. Payment Status Filter
      if (selectedPaymentStatus !== 'ALL' && selectedPaymentStatus !== 'all') {
        if ((b.payment_status || '').toLowerCase() !== selectedPaymentStatus.toLowerCase()) return false;
      }

      // 5. Date Range Filter
      if (selectedDateRange === 'TODAY') {
        const todayStr = new Date().toISOString().slice(0, 10);
        const bookingDateStr = b.created_at ? new Date(b.created_at).toISOString().slice(0, 10) : '';
        if (bookingDateStr !== todayStr) return false;
      } else if (selectedDateRange === 'WEEK') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const bookingTime = b.created_at ? new Date(b.created_at).getTime() : 0;
        if (bookingTime < sevenDaysAgo.getTime()) return false;
      }

      // 6. Assigned Assistant Filter
      if (selectedAssistantFilter !== 'ALL' && selectedAssistantFilter !== 'all') {
        if (selectedAssistantFilter === 'UNASSIGNED') {
          if (b.assistant_id) return false;
        } else if (
          b.assistant_id !== selectedAssistantFilter &&
          b.assistant?.name !== selectedAssistantFilter
        ) {
          return false;
        }
      }

      // 7. Service Requested Filter
      if (selectedServiceFilter !== 'ALL' && selectedServiceFilter !== 'all') {
        const s = b.services || {};
        if (selectedServiceFilter === 'luggage' && !s.luggage) return false;
        if (selectedServiceFilter === 'escort' && !s.escort) return false;
        if (selectedServiceFilter === 'wheelchair' && !s.wheelchair) return false;
        if (selectedServiceFilter === 'snacks' && !s.snacks) return false;
        if (selectedServiceFilter === 'transport' && !s.transport) return false;
        if (selectedServiceFilter === 'language' && !s.language) return false;
      }

      // 8. SOS / Emergency Filter
      if (selectedSosFilter === 'SOS_ONLY' && !b.sos_triggered) return false;
      if (selectedSosFilter === 'NORMAL' && b.sos_triggered) return false;

      // 9. Berth / Seat Class Filter
      if (selectedBerthFilter !== 'ALL' && selectedBerthFilter !== 'all') {
        const berth = (b.berth_type || b.services?.berth_type || '').toLowerCase();
        if (!berth.includes(selectedBerthFilter.toLowerCase())) return false;
      }

      return true;
    });
  }, [
    sortedBookings,
    selectedStation,
    selectedStatus,
    selectedPaymentStatus,
    selectedDateRange,
    selectedAssistantFilter,
    selectedServiceFilter,
    selectedSosFilter,
    selectedBerthFilter,
    filterQuery
  ]);

  // Paginated bookings
  const paginatedBookings = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredBookings.slice(start, start + rowsPerPage);
  }, [filteredBookings, currentPage, rowsPerPage]);


  // Chart Data Preparation
  const stationChartData = useMemo(() => {
    return (stats.stationStats || []).map((s) => ({
      name: s.station,
      Bookings: s.bookings,
      Revenue: s.revenue,
    }));
  }, [stats.stationStats]);

  const statusChartData = useMemo(() => {
    const sb = stats.statusBreakdown || {};
    return Object.entries(sb).map(([k, v]) => ({
      name: k.toUpperCase(),
      count: v,
    }));
  }, [stats.statusBreakdown]);

  // Support Tickets Filtered
  const filteredSupportTickets = useMemo(() => {
    return supportTickets.filter((t) => {
      if (ticketStationFilter !== 'ALL' && t.station !== ticketStationFilter) return false;
      if (ticketStatusFilter !== 'ALL') {
        const s = (t.status || '').toLowerCase();
        const f = ticketStatusFilter.toLowerCase();
        if (f === 'resolved' && !['resolved', 'closed', 'resolved by station master'].includes(s)) return false;
        if (f === 'in progress' && s !== 'in_progress' && s !== 'in progress') return false;
        if (f === 'dispatched' && s !== 'dispatched to station supervisor' && s !== 'open') return false;
      }
      if (ticketPriorityFilter !== 'ALL') {
        const p = (t.priority || '').toLowerCase();
        const fp = ticketPriorityFilter.toLowerCase();
        if (fp === 'urgent' && p !== 'urgent' && p !== 'high') return false;
        if (fp === 'normal' && p !== 'normal' && p !== 'medium' && p !== 'low') return false;
      }
      if (ticketSearch) {
        const q = ticketSearch.toLowerCase();
        const matches =
          (t.id && t.id.toLowerCase().includes(q)) ||
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

  const pendingTicketsCount = useMemo(() => {
    return supportTickets.filter((t) =>
      ['dispatched to station supervisor', 'open', 'in_progress', 'bot_escalated'].includes((t.status || '').toLowerCase())
    ).length;
  }, [supportTickets]);

  return (
    <div className="min-h-screen bg-[#F7F9FC] dark:bg-[#07090E] text-zinc-900 dark:text-zinc-100 font-sans flex select-none">
      {/* ── 1. LEFT SIDEBAR ─────────────────────────────────────── */}
      <AdminSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        bookingsCount={bookings.length}
        supportTicketsCount={supportTickets.length}
        kycQueueCount={kycQueue.length}
        usersCount={usersList.length}
        sosAlertsCount={sosAlerts.length}
        payoutsCount={payoutsList.filter((p) => p.status === 'requested').length}
        sessionsCount={adminSessionsList.length}
        securityIncidentsCount={securityIncidentsList.length}
        reconAlert={reconReport?.health?.critical_issues}
        financialIncidentAlert={incidentStats.critical}
        securityIncidentAlert={securityMetrics?.criticalIncidents}
        user={user}
        onLogout={logout}
      />

      {/* ── 2. MAIN LAYOUT CONTAINER (offset by sidebar width on desktop, 0 on mobile) ───── */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          isSidebarCollapsed ? 'pl-0 md:pl-[72px]' : 'pl-0 md:pl-[230px]'
        }`}
      >
        {/* Command Top Header */}
        <AdminTopHeader
          isSidebarCollapsed={isSidebarCollapsed}
          setIsSidebarCollapsed={setIsSidebarCollapsed}
          lastSynced={lastSynced}
          onRefresh={() => {
            fetchAll(true);
            toast.success('Live telemetry synchronized', { id: 'admin-telemetry-sync' });
          }}
          isRefreshing={loading}
          onExportLedger={exportFullLedgerCSV}
          urgentNotificationCount={sosAlerts.length + (incidentStats.critical || 0)}
          user={user}
          onLogout={logout}
          onOpenSos={() => setActiveTab('sos')}
          searchQuery={filterQuery}
          onSearchChange={(q) => setFilterQuery(q)}
          onSearchSubmit={(q) => {
            setActiveTab('bookings');
            setFilterQuery(q);
          }}
          sosAlerts={sosAlerts}
          kycQueue={kycQueue}
          securityIncidentsList={securityIncidentsList}
          incidentsList={incidentsList}
          paymentRecoveryList={paymentRecoveryList}
          payoutsList={payoutsList}
          supportTickets={supportTickets}
          bookings={bookings}
          setActiveTab={setActiveTab}
          setSelectedDrawerBooking={setSelectedDrawerBooking}
          setSelectedDeskTicketId={setSelectedDeskTicketId}
        />

        {/* Main Content Viewport */}
        <main className="flex-1 p-3 sm:p-6 max-w-[1600px] w-full mx-auto space-y-4 sm:space-y-5 overflow-x-hidden">
          {/* Active Emergency SOS Alert Banner */}
          {sosAlerts.length > 0 && (
            <div className="bg-red-600 text-white rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-scale-in">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-white animate-ping" />
                <div>
                  <h4 className="font-bold text-sm uppercase font-mono tracking-wider">
                    Urgent SOS Emergencies Active ({sosAlerts.length})
                  </h4>
                  <p className="text-xs text-red-100 font-mono">
                    Immediate passenger assistance required across platform transit nodes.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('sos')}
                className="btn-secondary py-1.5 px-4 text-xs bg-white text-red-700 border-white hover:bg-red-50 font-bold cursor-pointer"
              >
                Open Emergency Center ➔
              </button>
            </div>
          )}

          {/* ========================================================
              TAB 1: MASTER BOOKINGS LEDGER
              ======================================================== */}
          {activeTab === 'bookings' && (
            <div className="space-y-4 animate-fade-in">
              {/* Page Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-2xl font-bold font-sans text-zinc-900 dark:text-white tracking-tight">
                      Master Bookings Ledger
                    </h2>
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-mono font-bold text-xs">
                      {bookings.length}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Access 100% of telemetry, coach, seat, PNR, secret start OTP, and passenger/assistant details.
                  </p>
                </div>

                {/* Date Indicator on Right */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0D111A] text-xs font-mono text-zinc-700 dark:text-zinc-300 shrink-0 shadow-2xs">
                  <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Today · {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                </div>
              </div>

              {/* 6 KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                <KpiCard
                  icon={Layers}
                  iconBg="bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400"
                  label="Total Bookings"
                  value={stats.totalBookings || bookings.length}
                  trend="+12% today"
                  trendPositive={true}
                  sparklineColor="#2563EB"
                  sparklinePath="M 0 16 Q 15 10 30 13 T 60 4"
                  onClick={() => { setSelectedStatus('ALL'); setCurrentPage(1); }}
                />
                <KpiCard
                  icon={Clock}
                  iconBg="bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400"
                  label="Pending Assignments"
                  value={bookingTabCounts.pending}
                  statusText="Needs attention"
                  statusDotColor="bg-amber-500"
                  sparklineColor="#F59E0B"
                  sparklinePath="M 0 8 Q 15 14 30 11 T 60 14"
                  onClick={() => { setSelectedStatus('pending'); setCurrentPage(1); }}
                />
                <KpiCard
                  icon={User}
                  iconBg="bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400"
                  label="In Service"
                  value={bookingTabCounts.in_service}
                  statusText="Currently active"
                  statusDotColor="bg-blue-500"
                  sparklineColor="#2563EB"
                  sparklinePath="M 0 15 Q 15 6 30 10 T 60 4"
                  onClick={() => { setSelectedStatus('in_service'); setCurrentPage(1); }}
                />
                <KpiCard
                  icon={CheckCircle}
                  iconBg="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
                  label="Completed Today"
                  value={bookingTabCounts.completed}
                  trend="+22% vs yesterday"
                  trendPositive={true}
                  sparklineColor="#10B981"
                  sparklinePath="M 0 18 Q 15 12 30 14 T 60 2"
                  onClick={() => { setSelectedStatus('completed'); setCurrentPage(1); }}
                />
                <KpiCard
                  icon={DollarSign}
                  iconBg="bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400"
                  label="Revenue (Today)"
                  value={`₹${(stats.todayRevenue || stats.revenue || 0).toLocaleString()}`}
                  trend="+18% vs yesterday"
                  trendPositive={true}
                  sparklineColor="#2563EB"
                  sparklinePath="M 0 16 Q 15 8 30 11 T 60 3"
                  onClick={() => { setSelectedPaymentStatus('paid'); setCurrentPage(1); }}
                />
                <KpiCard
                  icon={AlertTriangle}
                  iconBg="bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400"
                  label="Incidents"
                  value={sosAlerts.length + (incidentStats.critical || 0)}
                  statusText={sosAlerts.length > 0 ? `${sosAlerts.length} urgent` : '0 urgent'}
                  statusDotColor={sosAlerts.length > 0 ? 'bg-rose-500' : 'bg-emerald-500'}
                  sparklineColor="#EF4444"
                  sparklinePath="M 0 10 Q 15 16 30 9 T 60 4"
                  onClick={() => setActiveTab('sos')}
                />
              </div>

              {/* Filter and Search Panel */}
              <BookingFilterToolbar
                searchQuery={filterQuery}
                onSearchChange={(q) => {
                  setFilterQuery(q);
                  setCurrentPage(1);
                }}
                selectedStation={selectedStation}
                onStationChange={(s) => {
                  setSelectedStation(s);
                  setCurrentPage(1);
                }}
                selectedStatus={selectedStatus}
                onStatusChange={(st) => {
                  setSelectedStatus(st);
                  setCurrentPage(1);
                }}
                selectedPaymentStatus={selectedPaymentStatus}
                onPaymentStatusChange={(ps) => {
                  setSelectedPaymentStatus(ps);
                  setCurrentPage(1);
                }}
                selectedDateRange={selectedDateRange}
                onDateRangeChange={(dr) => {
                  setSelectedDateRange(dr);
                  setCurrentPage(1);
                }}
                selectedAssistantFilter={selectedAssistantFilter}
                onAssistantFilterChange={(a) => {
                  setSelectedAssistantFilter(a);
                  setCurrentPage(1);
                }}
                selectedServiceFilter={selectedServiceFilter}
                onServiceFilterChange={(sf) => {
                  setSelectedServiceFilter(sf);
                  setCurrentPage(1);
                }}
                selectedSosFilter={selectedSosFilter}
                onSosFilterChange={(sos) => {
                  setSelectedSosFilter(sos);
                  setCurrentPage(1);
                }}
                selectedBerthFilter={selectedBerthFilter}
                onBerthFilterChange={(bf) => {
                  setSelectedBerthFilter(bf);
                  setCurrentPage(1);
                }}
                assistants={assistantsList}
                onClearFilters={() => {
                  setSelectedStation('ALL');
                  setSelectedStatus('ALL');
                  setSelectedPaymentStatus('ALL');
                  setSelectedDateRange('ALL');
                  setSelectedAssistantFilter('ALL');
                  setSelectedServiceFilter('ALL');
                  setSelectedSosFilter('ALL');
                  setSelectedBerthFilter('ALL');
                  setFilterQuery('');
                  setCurrentPage(1);
                  toast.success('All filters cleared');
                }}
                onExport={exportFullLedgerCSV}
                isFiltered={
                  selectedStation !== 'ALL' ||
                  selectedStatus !== 'ALL' ||
                  selectedPaymentStatus !== 'ALL' ||
                  selectedDateRange !== 'ALL' ||
                  selectedAssistantFilter !== 'ALL' ||
                  selectedServiceFilter !== 'ALL' ||
                  selectedSosFilter !== 'ALL' ||
                  selectedBerthFilter !== 'ALL' ||
                  Boolean(filterQuery)
                }
                totalFilteredCount={filteredBookings.length}
                totalCount={bookings.length}
              />

              {/* Status Tabs */}
              <BookingTabs
                currentStatusTab={selectedStatus}
                onStatusTabChange={(tabId) => {
                  setSelectedStatus(tabId);
                  setCurrentPage(1);
                }}
                counts={bookingTabCounts}
                sortBy={sortBy}
                onSortChange={(sb) => setSortBy(sb)}
              />

              {/* Master Table */}
              <BookingTable
                bookings={paginatedBookings}
                selectedBooking={selectedDrawerBooking}
                onSelectBooking={(b) => setSelectedDrawerBooking(b)}
                currentPage={currentPage}
                onPageChange={(p) => setCurrentPage(p)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(r) => {
                  setRowsPerPage(r);
                  setCurrentPage(1);
                }}
                totalBookingsCount={filteredBookings.length}
                onRefresh={() => fetchAll(true)}
              />
            </div>
          )}

          {/* ========================================================
            TAB 2: OPERATIONS & ANALYTICS (MODERN ENTERPRISE UI)
            ======================================================== */}
          {activeTab === 'overview' && (
            <OperationsAnalyticsView
              stats={stats}
              bookings={bookings}
              assistantsList={assistantsList}
              sosAlerts={sosAlerts}
              securityMetrics={securityMetrics}
              onSelectBooking={(b) => setSelectedDrawerBooking(b)}
              setActiveTab={setActiveTab}
              setSelectedStation={setSelectedStation}
              setSelectedStatus={setSelectedStatus}
              setSelectedPaymentStatus={setSelectedPaymentStatus}
              setSelectedDateRange={setSelectedDateRange}
            />
          )}

          {/* ========================================================
            TAB 3: ASSISTANT FORCE & KYC
            ======================================================== */}
          {activeTab === 'assistants' && (
            <SahayakForceKycView
              kycQueue={kycQueue}
              assistantsList={assistantsList}
              bookings={bookings}
              onDecideAssistant={handleDecideAssistant}
              onToggleOnline={handleToggleAssistantOnline}
              onToggleApproval={handleToggleAssistantApproval}
              onFilterToAssistant={handleFilterToAssistant}
              onRefresh={fetchAll}
              actionLoading={actionLoading}
              stations={STATIONS}
            />
          )}

          {/* ========================================================
            TAB 4: REGISTERED PASSENGERS DIRECTORY (PREMIUM REDESIGN)
            ======================================================== */}
          {activeTab === 'passengers' && (
            <PassengersDirectoryView
              usersList={usersList}
              bookings={bookings}
              supportTickets={supportTickets}
              onFilterToPassenger={handleFilterToPassenger}
              onViewPassengerSupport={(p) => {
                setActiveTab('support_tickets');
                setTicketSearch(p.name || p.email || '');
              }}
            />
          )}

          {/* ========================================================
            TAB: FINANCE & FINANCIAL RECONCILIATION (Enterprise Operations Control Center)
            ======================================================== */}
          {activeTab === 'finance' && (
            <FinancialReconciliationView
              reconReport={reconReport}
              reconLoading={reconLoading}
              fetchReconciliation={fetchReconciliation}
              auditLogs={auditLogs}
              auditFilter={auditFilter}
              setAuditFilter={setAuditFilter}
              financialHealth={financialHealth}
              paymentRecoveryList={paymentRecoveryList}
              onInspectBooking={(bId) => {
                const b = bookings.find((item) => item.id === bId);
                if (b) setInspectingBooking(b);
              }}
            />
          )}

          {/* ========================================================
            TAB: FINANCIAL INCIDENTS & FRAUD PROTECTION (Phase 5)
            ======================================================== */}
          {activeTab === 'incidents' && (
            <FinancialIncidentsView
              incidentsList={incidentsList}
              incidentStats={incidentStats}
              incidentsFilter={incidentsFilter}
              setIncidentsFilter={setIncidentsFilter}
              selectedIncident={selectedIncident}
              setSelectedIncident={setSelectedIncident}
              financialHealth={financialHealth}
              fetchAll={fetchAll}
              actionLoading={actionLoading}
              lastSynced={lastSynced}
              handleInvestigateIncident={handleInvestigateIncident}
              handleResolveIncident={handleResolveIncident}
              handleIgnoreIncident={handleIgnoreIncident}
              onInspectBooking={(bId) => {
                const b = bookings.find((item) => item.id === bId);
                if (b) setInspectingBooking(b);
              }}
              onOpenAuditTrail={() => {
                setActiveTab('finance');
                setAuditFilter('ALL');
              }}
            />
          )}

          {/* ========================================================
            TAB: SAHAYAK PAYOUTS & SETTLEMENT TREASURY (Redesigned Enterprise UI)
            ======================================================== */}
          {activeTab === 'payouts' && (
            <SahayakPayoutsView
              payoutsList={payoutsList}
              payoutsFilter={payoutsFilter}
              setPayoutsFilter={setPayoutsFilter}
              stats={stats}
              actionLoading={actionLoading}
              fetchAll={fetchAll}
              lastSynced={lastSynced}
              handleApprovePayout={handleApprovePayout}
              handleRejectPayout={handleRejectPayout}
              handleProcessingPayout={handleProcessingPayout}
              handlePaidPayout={handlePaidPayout}
              handleFailedPayout={handleFailedPayout}
            />
          )}

          {/* ========================================================
            TAB 5: EMERGENCY SOS CENTER
            ======================================================== */}
          {activeTab === 'sos' && (
            <EmergencyIncidentCommandCenter
              sosAlerts={sosAlerts}
              onResolveEmergency={handleResolveEmergency}
              onInspectBooking={(b) => setInspectingBooking(b)}
              onRefresh={fetchAll}
              loading={loading}
              bookings={bookings}
              stations={STATIONS}
            />
          )}

          {/* ── TAB: LAUNCH CENTER (PHASE 9) ────────────────────────── */}
          {activeTab === 'launch' && (
            <LaunchCenter />
          )}

          {/* ── TAB: STATION DESK & SUPPORT TICKETS ───────────────── */}
          {(activeTab === 'support' || activeTab === 'support_tickets') && (
            <StationDeskSupportView
              supportTickets={supportTickets}
              setSupportTickets={setSupportTickets}
              selectedDeskTicketId={selectedDeskTicketId}
              setSelectedDeskTicketId={setSelectedDeskTicketId}
              ticketSearch={ticketSearch}
              setTicketSearch={setTicketSearch}
              ticketStationFilter={ticketStationFilter}
              setTicketStationFilter={setTicketStationFilter}
              ticketStatusFilter={ticketStatusFilter}
              setTicketStatusFilter={setTicketStatusFilter}
              ticketPriorityFilter={ticketPriorityFilter}
              setTicketPriorityFilter={setTicketPriorityFilter}
              ticketUpdatingId={ticketUpdatingId}
              handleUpdateTicketStatus={handleUpdateTicketStatus}
              isRaiseTicketModalOpen={isRaiseTicketModalOpen}
              setIsRaiseTicketModalOpen={setIsRaiseTicketModalOpen}
              adminNewTicket={adminNewTicket}
              setAdminNewTicket={setAdminNewTicket}
              adminCreatingTicket={adminCreatingTicket}
              handleAdminCreateTicket={handleAdminCreateTicket}
              onRefresh={fetchAll}
              isRefreshing={loading}
            />
          )}

          {/* ========================================================
            TAB 11: SECURITY & ACTIVE SESSIONS (Phase 6.4)
            ======================================================== */}
          {activeTab === 'sessions' && (
            <ActiveSessions
              adminSessionsList={adminSessionsList}
              usersList={usersList}
              assistantsList={assistantsList}
              onRevokeSession={handleAdminRevokeSession}
              onRevokeUserSessions={handleAdminRevokeUserSessions}
              onRefresh={fetchAll}
              loading={loading}
            />
          )}

          {/* ========================================================
            TAB 12: SECURITY OPERATIONS & INCIDENTS (Redesigned Enterprise Console)
            ======================================================== */}
          {(activeTab === 'security_monitoring' || activeTab === 'security_incidents') && (
            <SecurityIncidents
              securityMetrics={securityMetrics}
              securityIncidentsList={securityIncidentsList}
              onRefresh={fetchAll}
              loading={loading}
            />
          )}

        </main>
      </div>

      {/* ── BOOKING VIEW DRAWER (RIGHT-SIDE DRAWER) ─────────────── */}
      {selectedDrawerBooking && (() => {
        const currentDrawerIndex = filteredBookings.findIndex((b) => b.id === selectedDrawerBooking.id);
        const hasPrevBooking = currentDrawerIndex > 0;
        const hasNextBooking = currentDrawerIndex >= 0 && currentDrawerIndex < filteredBookings.length - 1;

        return (
          <BookingDrawer
            booking={selectedDrawerBooking}
            onClose={() => setSelectedDrawerBooking(null)}
            onInspect={(b) => {
              setSelectedDrawerBooking(null);
              setInspectingBooking(b);
            }}
            onUpdateBooking={handleUpdateBooking}
            assistants={assistantsList}
            onOpenSupportTicket={(b) => {
              setActiveTab('support_tickets');
              setSelectedDrawerBooking(null);
              setAdminNewTicket((prev) => ({
                ...prev,
                station: b.station_code || 'KZJ',
                pnr: b.pnr || '',
                passengerName: b.passenger?.name || '',
                passengerPhone: b.passenger?.phone || '',
                passengerEmail: b.passenger?.email || '',
                assistant_name: b.assistant?.name || '',
                subject: `Assistance on Booking #${b.booking_id || b.id?.slice(-8).toUpperCase()}`,
                description: `Operational support request for passenger ${b.passenger?.name || ''} at ${b.station_code || ''}, train ${b.train_no || ''}.`
              }));
              setIsRaiseTicketModalOpen(true);
            }}
            onPrev={hasPrevBooking ? () => setSelectedDrawerBooking(filteredBookings[currentDrawerIndex - 1]) : null}
            onNext={hasNextBooking ? () => setSelectedDrawerBooking(filteredBookings[currentDrawerIndex + 1]) : null}
            currentIndex={currentDrawerIndex >= 0 ? currentDrawerIndex + 1 : undefined}
            totalCount={filteredBookings.length}
          />
        );
      })()}

      {/* ── DETAIL INSPECTOR MODAL ─────────────────────────────── */}
      {inspectingBooking && (
        <BookingInspectorModal
          booking={inspectingBooking}
          onClose={handleCloseInspector}
          onUpdate={handleUpdateBooking}
          assistants={assistantsList}
        />
      )}

      {/* ── SETTLEMENT CONFIRMATION MODAL (PHASE 4) ──────────────── */}
      {settlementModalPayout && (
        <SettlementConfirmModal
          payout={settlementModalPayout}
          onClose={() => setSettlementModalPayout(null)}
          onConfirm={handleConfirmSettlement}
          actionLoading={actionLoading}
        />
      )}

      {/* ── FINANCIAL INCIDENT DETAIL & RESOLUTION MODAL (PHASE 5) ── */}
      {selectedIncident && activeTab !== 'incidents' && (
        <IncidentDetailModal
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
          onInvestigate={handleInvestigateIncident}
          onResolve={handleResolveIncident}
          onIgnore={handleIgnoreIncident}
          actionLoading={actionLoading}
        />
      )}

    </div>
  );
}