import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Layers,
  TrendingUp,
  LifeBuoy,
  Activity,
  ShieldCheck,
  ShieldAlert,
  CreditCard,
  Briefcase,
  Users,
  AlertTriangle,
  Shield,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Menu,
  RefreshCw,
  Download,
  Bell,
  Sun,
  Moon,
  Search,
  Check,
  ArrowUpRight,
  Filter,
  X,
  SlidersHorizontal,
  ArrowUpDown,
  Eye,
  User,
  Phone,
  MessageSquare,
  Train,
  Clock,
  CheckCircle,
  Maximize2,
  Copy,
  Printer,
  Key,
  BarChart3,
  Compass,
  Calendar,
  CheckCheck,
  BellOff,
  UserCheck,
  Sparkles,
  FileText,
  Trash2,
  Ban,
  MoreVertical,
  Flag
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell
} from 'recharts';
import BookingInspectorModal from './booking-inspector/BookingInspectorModal';
import toast from 'react-hot-toast';

import oneCoolieLogo from '../../assets/onecoolie-logo.png';
import trainImg from '../../assets/images/vande_bharat_ref_crop.jpg';

/* ============================================================
   SHARED CONSTANTS & DICTIONARIES
   ============================================================ */

const ADMIN_STATIONS = [
  { code: 'SC', name: 'Secunderabad Jn' },
  { code: 'BZA', name: 'Vijayawada Jn' },
  { code: 'KZJ', name: 'Kazipet Jn' },
  { code: 'WL', name: 'Warangal' },
];

const ADMIN_STATUS_COLORS = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
  accepted: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800',
  arriving: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800',
  in_service: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
  cancelled: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800',
};

const ADMIN_PAYMENT_COLORS = {
  paid: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  refunded: 'bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300',
  failed: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
};

const STATUS_BADGE_STYLES = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
  accepted: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800',
  arriving: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800',
  in_service: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
  cancelled: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800',
};

const STATUS_PILL_STYLES = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200',
  accepted: 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border-blue-200',
  arriving: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 border-indigo-200',
  in_service: 'bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300 border-sky-200',
  completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200',
  cancelled: 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border-rose-200',
};

const MISSION_STATUS_COLORS = {
  PENDING: '#0EA5E9',
  ACCEPTED: '#10B981',
  ARRIVING: '#3B82F6',
  IN_SERVICE: '#F59E0B',
  COMPLETED: '#F97316',
  CANCELLED: '#6366F1',
};

const STATUS_BADGE_MAP = {
  pending: { label: 'PENDING ➔', bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800' },
  accepted: { label: 'CONFIRMED', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800' },
  arriving: { label: 'ARRIVING', bg: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800' },
  in_service: { label: 'IN SERVICE', bg: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800' },
  completed: { label: 'COMPLETED', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800' },
  cancelled: { label: 'CANCELLED', bg: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800' },
};

const resolveServiceName = (booking) => {
  const s = booking?.services || {};
  if (s.wheelchair) return 'Wheelchair Assist';
  if (s.escort) return 'Meet & Assist';
  if (s.luggage) return 'Luggage Help';
  if (booking?.action_type === 'collect_from_seat') return 'De-boarding Assist';
  return 'Boarding Load';
};

/* ============================================================
   1. ADMIN SIDEBAR COMPONENT
   ============================================================ */

export function AdminSidebar({
  activeTab,
  setActiveTab,
  isCollapsed,
  setIsCollapsed,
  bookingsCount = 21,
  supportTicketsCount = 13,
  kycQueueCount = 0,
  usersCount = 15,
  sosAlertsCount = 0,
  payoutsCount = 0,
  sessionsCount = 50,
  securityIncidentsCount = 15,
  reconAlert = 0,
  financialIncidentAlert = 0,
  securityIncidentAlert = 0,
  user,
  onLogout
}) {
  const navSections = [
    {
      title: 'OPERATIONS HUB',
      items: [
        {
          id: 'bookings',
          label: 'Master Bookings Ledger',
          icon: Layers,
          badge: bookingsCount,
          badgeColor: 'bg-blue-600 text-white'
        },
        {
          id: 'overview',
          label: 'Operations & Analytics',
          icon: TrendingUp
        },
        {
          id: 'support_tickets',
          label: 'Station Desk & Support',
          icon: LifeBuoy,
          badge: supportTicketsCount,
          badgeColor: 'bg-zinc-800 text-zinc-300'
        },
        {
          id: 'launch',
          label: 'Launch Centers',
          icon: Activity
        }
      ]
    },
    {
      title: 'FINANCE',
      items: [
        {
          id: 'finance',
          label: 'Finance & Reconciliations',
          icon: ShieldCheck,
          alert: reconAlert > 0 ? reconAlert : undefined
        },
        {
          id: 'incidents',
          label: 'Financial Incidents',
          icon: ShieldAlert,
          alert: financialIncidentAlert > 0 ? financialIncidentAlert : undefined
        },
        {
          id: 'payouts',
          label: 'Sahayak Payouts',
          icon: CreditCard,
          badge: payoutsCount > 0 ? payoutsCount : undefined,
          badgeColor: 'bg-blue-600 text-white'
        }
      ]
    },
    {
      title: 'FIELD OPERATIONS',
      items: [
        {
          id: 'assistants',
          label: 'Sahayak Force & KYC',
          icon: Briefcase,
          badge: kycQueueCount > 0 ? kycQueueCount : undefined,
          badgeColor: 'bg-amber-500 text-white'
        }
      ]
    },
    {
      title: 'PEOPLE',
      items: [
        {
          id: 'passengers',
          label: 'Passengers Directory',
          icon: Users,
          badge: usersCount > 0 ? usersCount : undefined,
          badgeColor: 'bg-zinc-800 text-zinc-300'
        }
      ]
    },
    {
      title: 'SAFETY',
      items: [
        {
          id: 'sos',
          label: 'Emergency Incident / SOS',
          icon: AlertTriangle,
          badge: sosAlertsCount > 0 ? sosAlertsCount : 'SOS',
          badgeColor: 'bg-red-600 text-white font-bold'
        },
        {
          id: 'sessions',
          label: 'Active Sessions',
          icon: Shield,
          badge: sessionsCount > 0 ? sessionsCount : undefined,
          badgeColor: 'bg-emerald-600 text-white'
        },
        {
          id: 'security_monitoring',
          label: 'Security & Incidents',
          icon: ShieldAlert,
          badge: securityIncidentsCount > 0 ? securityIncidentsCount : undefined,
          badgeColor: 'bg-rose-600 text-white',
          alert: securityIncidentAlert > 0 ? securityIncidentAlert : undefined
        }
      ]
    }
  ];

  return (
    <>
      {/* Mobile Drawer Overlay Backdrop */}
      {!isCollapsed && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden animate-fade-in"
          onClick={() => setIsCollapsed(true)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 md:z-40 bg-[#080B12] text-white flex flex-col border-r border-[#151B28] transition-all duration-300 ease-in-out select-none ${
          isCollapsed
            ? '-translate-x-full md:translate-x-0 md:w-[72px]'
            : 'translate-x-0 w-[240px] md:w-[230px] shadow-2xl md:shadow-none'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-[#151B28] shrink-0">
          {!isCollapsed ? (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <img
                src={oneCoolieLogo}
                alt="ONECOOLIE"
                className="h-7 w-auto object-contain shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-[13px] tracking-wide text-white uppercase font-sans">
                    ONECOOLIE
                  </span>
                </div>
                <p className="text-[9.5px] text-zinc-400 font-medium tracking-tight truncate leading-tight">
                  Making Every Journey Easier
                </p>
              </div>
            </div>
          ) : (
            <div className="mx-auto">
              <img
                src={oneCoolieLogo}
                alt="ONECOOLIE"
                className="h-7 w-auto object-contain"
              />
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Navigation Sections Scrollable */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2.5 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800">
          {navSections.map((sec, secIdx) => (
            <div key={sec.title || secIdx} className="space-y-1">
              {!isCollapsed && (
                <p className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400/80 mb-1.5 font-mono">
                  {sec.title}
                </p>
              )}

              <div className="space-y-0.5">
                {sec.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id || (item.id === 'support_tickets' && activeTab === 'support');
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(item.id);
                        if (typeof window !== 'undefined' && window.innerWidth < 768) {
                          setIsCollapsed(true);
                        }
                      }}
                      title={isCollapsed ? item.label : undefined}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-150 group cursor-pointer ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-[0_2px_12px_rgba(37,99,235,0.45)]'
                          : 'text-zinc-300 hover:text-white hover:bg-white/[0.06]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-colors ${
                            isActive
                              ? 'text-white'
                              : item.alert
                              ? 'text-rose-400 animate-pulse'
                              : 'text-zinc-400 group-hover:text-zinc-200'
                          }`}
                        />
                        {!isCollapsed && (
                          <span className="truncate text-left text-[11.5px] font-medium tracking-tight">
                            {item.label}
                          </span>
                        )}
                      </div>

                      {!isCollapsed && (
                        <div className="flex items-center gap-1.5 shrink-0 ml-1.5">
                          {item.alert ? (
                            <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold animate-pulse font-mono">
                              {item.alert}
                            </span>
                          ) : item.badge !== undefined && (typeof item.badge === 'string' ? Boolean(item.badge) : item.badge > 0) ? (
                            <span
                              className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold font-mono ${
                                isActive
                                  ? 'bg-white/25 text-white'
                                  : item.badgeColor || 'bg-zinc-800 text-zinc-300'
                              }`}
                            >
                              {item.badge}
                            </span>
                          ) : null}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Section */}
        <div className="p-2.5 border-t border-[#151B28] space-y-2.5 shrink-0 bg-[#07090F]">
          {/* Promotional Train Card (when expanded) */}
          {!isCollapsed && (
            <div className="relative rounded-xl overflow-hidden p-3 border border-white/10 group cursor-pointer shadow-md bg-gradient-to-br from-blue-950/60 to-zinc-950/90">
              {/* Background image overlay */}
              <img
                src={trainImg}
                alt="High Speed Train"
                className="absolute inset-0 w-full h-full object-cover object-center opacity-30 group-hover:opacity-40 group-hover:scale-105 transition-all duration-300"
              />
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <p className="text-[11.5px] font-bold text-white leading-tight">
                    Smarter Stations
                  </p>
                  <p className="text-[11px] font-medium text-blue-200 leading-tight">
                    Happier Journeys
                  </p>
                </div>
                <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center text-white group-hover:bg-blue-600 transition-colors">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          )}

          {/* Version info */}
          {!isCollapsed && (
            <div className="px-1">
              <p className="text-[9.5px] text-zinc-400 font-mono">
                OneCoolie Operations <span className="text-zinc-400">v1.0.0</span>
              </p>
            </div>
          )}

          {/* Profile Card & Logout */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs font-mono shrink-0 ring-2 ring-blue-500/30">
                PA
              </div>
              {!isCollapsed && (
                <div className="min-w-0">
                  <p className="text-[11.5px] font-semibold text-white truncate leading-tight">
                    Primary Administrator
                  </p>
                  <p className="text-[10px] text-zinc-400 font-mono truncate leading-tight">
                    {user?.email || 'admin01@onecoolie.in'}
                  </p>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined' && window.innerWidth < 768) {
                    setIsCollapsed(true);
                  }
                  onLogout();
                }}
                title="Sign Out"
                className="flex items-center gap-1 text-[11px] font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-2 py-1 rounded-md transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

/* ============================================================
   2. ADMIN TOP HEADER COMPONENT
   ============================================================ */

export function AdminTopHeader({
  isSidebarCollapsed,
  setIsSidebarCollapsed,
  lastSynced,
  onRefresh,
  isRefreshing,
  onExportLedger,
  urgentNotificationCount = 0,
  user,
  onLogout,
  onOpenSos,
  searchQuery = '',
  onSearchChange,
  onSearchSubmit,
  sosAlerts = [],
  kycQueue = [],
  securityIncidentsList = [],
  incidentsList = [],
  paymentRecoveryList = [],
  payoutsList = [],
  supportTickets = [],
  bookings = [],
  setActiveTab,
  setSelectedDrawerBooking,
  setSelectedDeskTicketId
}) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notificationFilterTab, setNotificationFilterTab] = useState('ALL');
  const [readNotificationIds, setReadNotificationIds] = useState(() => {
    try {
      const saved = localStorage.getItem('admin_read_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState(() => {
    try {
      const saved = localStorage.getItem('admin_dismissed_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isDarkMode, setIsDarkMode] = useState(
    typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : false
  );
  const searchInputRef = useRef(null);
  const notificationRef = useRef(null);

  // Live clock updating every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Global shortcut: ⌘ K or Ctrl+K to focus search bar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close notification popover on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target)) {
        setIsNotificationOpen(false);
      }
    };
    if (isNotificationOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isNotificationOpen]);

  // Persist read and dismissed notifications
  useEffect(() => {
    try {
      localStorage.setItem('admin_read_notifications', JSON.stringify(readNotificationIds));
    } catch {}
  }, [readNotificationIds]);

  useEffect(() => {
    try {
      localStorage.setItem('admin_dismissed_notifications', JSON.stringify(dismissedNotificationIds));
    } catch {}
  }, [dismissedNotificationIds]);

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.toggle('dark');
    setIsDarkMode(isDark);
    try {
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    } catch (e) {
      // ignore
    }
  };

  const formatHeaderDate = (date) => {
    if (!date) return 'Thu, 10 Sept 2026';
    const options = { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-GB', options);
  };

  const formatHeaderTime = (date) => {
    if (!date) return '11:31 PM';
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const formatSyncedTime = (date) => {
    if (!date) return '10 Sept 2026, 23:31:55';
    const dayMonthYear = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    return `${dayMonthYear}, ${time}`;
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return 'Just now';
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now - d;
      if (diffMs < 0) return 'Just now';
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 60) return `${Math.max(1, diffSec)}s ago`;
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return 'Recently';
    }
  };

  // Compile full administrative notification stream from real database telemetry
  const allNotifications = useMemo(() => {
    const list = [];

    // 1. SOS Emergency Alerts (Highest priority)
    if (Array.isArray(sosAlerts) && sosAlerts.length > 0) {
      sosAlerts.forEach((b) => {
        list.push({
          id: `sos-${b.id || b.booking_id}`,
          type: 'emergency',
          tabGroup: 'urgent',
          badge: 'SOS EMERGENCY',
          badgeColor: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800',
          iconBg: 'bg-rose-100 text-rose-700 dark:bg-rose-950/90 dark:text-rose-400 border-rose-300 dark:border-rose-800',
          title: `Emergency SOS Alert · Train ${b.train_no || 'Express'}`,
          description: `Passenger ${b.passenger?.name || b.passenger_name || 'Passenger'} triggered emergency assist at Coach ${b.coach || '—'}, Seat ${b.seat_number || '—'} (${b.station_code || 'station'}). Immediate assistance required.`,
          timestamp: b.updated_at || b.created_at || new Date().toISOString(),
          actionLabel: 'Command SOS',
          onAction: () => {
            if (setActiveTab) setActiveTab('sos');
            if (setSelectedDrawerBooking) setSelectedDrawerBooking(b);
          }
        });
      });
    }

    // 2. KYC Applications Awaiting Approval
    if (Array.isArray(kycQueue) && kycQueue.length > 0) {
      kycQueue.forEach((a) => {
        list.push({
          id: `kyc-${a.id}`,
          type: 'kyc',
          tabGroup: 'kyc',
          badge: 'KYC APPLICATION',
          badgeColor: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/80 dark:text-purple-300 dark:border-purple-800',
          iconBg: 'bg-purple-100 text-purple-700 dark:bg-purple-950/90 dark:text-purple-400 border-purple-300 dark:border-purple-800',
          title: `New Sahayak Applicant · ${a.name || 'Applicant'}`,
          description: `Submitted credentials & KYC documents for Station ${a.station_code || 'SCR'}. Documents awaiting administrator verification.`,
          timestamp: a.created_at || new Date().toISOString(),
          actionLabel: 'Review KYC',
          onAction: () => {
            if (setActiveTab) setActiveTab('assistants');
          }
        });
      });
    }

    // 3. Security Threats & Incidents (Critical / High / Open)
    if (Array.isArray(securityIncidentsList) && securityIncidentsList.length > 0) {
      securityIncidentsList
        .filter((inc) => inc.status === 'open' || inc.status === 'investigating' || inc.severity === 'critical')
        .slice(0, 8)
        .forEach((inc) => {
          const isCritical = inc.severity === 'critical';
          const typeFormatted = (inc.incident_type || 'threat')
            .split('_')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
          list.push({
            id: `sec-${inc.id}`,
            type: 'security',
            tabGroup: isCritical ? 'urgent' : 'finance',
            badge: `${inc.severity?.toUpperCase() || 'SECURITY'} THREAT`,
            badgeColor: isCritical
              ? 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800'
              : 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800',
            iconBg: isCritical
              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/90 dark:text-rose-400 border-rose-300 dark:border-rose-800'
              : 'bg-amber-100 text-amber-700 dark:bg-amber-950/90 dark:text-amber-400 border-amber-300 dark:border-amber-800',
            title: `Security Anomaly · ${typeFormatted}`,
            description: inc.description || `Detected anomaly from IP ${inc.ip_address || 'network'}. Triage required.`,
            timestamp: inc.last_detected_at || inc.created_at || new Date().toISOString(),
            actionLabel: 'Triage Threat',
            onAction: () => {
              if (setActiveTab) setActiveTab('security_monitoring');
            }
          });
        });
    }

    // 4. Financial Incidents & Payment Recovery
    if (Array.isArray(incidentsList) && incidentsList.length > 0) {
      incidentsList
        .filter((f) => f.status === 'open' || f.status === 'investigating')
        .slice(0, 6)
        .forEach((f) => {
          list.push({
            id: `fin-${f.id}`,
            type: 'finance',
            tabGroup: 'finance',
            badge: 'PAYMENT ANOMALY',
            badgeColor: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800',
            iconBg: 'bg-amber-100 text-amber-700 dark:bg-amber-950/90 dark:text-amber-400 border-amber-300 dark:border-amber-800',
            title: `Financial Anomaly · Booking #${f.booking_id || f.id?.slice(-6).toUpperCase()}`,
            description: f.description || `Payment discrepancy flagged for reconciliation (₹${f.amount || '—'}).`,
            timestamp: f.created_at || new Date().toISOString(),
            actionLabel: 'Reconcile',
            onAction: () => {
              if (setActiveTab) setActiveTab('incidents');
            }
          });
        });
    }

    // 5. Pending Sahayak Payouts
    if (Array.isArray(payoutsList) && payoutsList.length > 0) {
      payoutsList
        .filter((p) => p.status === 'pending' || p.status === 'held')
        .slice(0, 6)
        .forEach((p) => {
          list.push({
            id: `pay-${p.id}`,
            type: 'payout',
            tabGroup: 'finance',
            badge: 'PAYOUT REQUEST',
            badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800',
            iconBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/90 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800',
            title: `Payout Requested · ₹${p.amount || '0'}`,
            description: `Settlement request from ${p.assistant_name || 'Sahayak'} (${p.station_code || 'station'}) awaiting admin authorization.`,
            timestamp: p.created_at || new Date().toISOString(),
            actionLabel: 'Authorize',
            onAction: () => {
              if (setActiveTab) setActiveTab('payouts');
            }
          });
        });
    }

    // 6. Station Desk & Support Tickets (Open / Escalated)
    if (Array.isArray(supportTickets) && supportTickets.length > 0) {
      supportTickets
        .filter((t) => ['open', 'bot_escalated', 'in_progress'].includes((t.status || '').toLowerCase()))
        .slice(0, 6)
        .forEach((t) => {
          const isUrgent = t.priority === 'urgent' || t.status === 'bot_escalated';
          list.push({
            id: `ticket-${t.id}`,
            type: 'support',
            tabGroup: isUrgent ? 'urgent' : 'finance',
            badge: `${t.priority?.toUpperCase() || 'SUPPORT'} TICKET`,
            badgeColor: isUrgent
              ? 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800'
              : 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/80 dark:text-indigo-300 dark:border-indigo-800',
            iconBg: isUrgent
              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/90 dark:text-rose-400 border-rose-300 dark:border-rose-800'
              : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/90 dark:text-indigo-400 border-indigo-300 dark:border-indigo-800',
            title: `Station Desk · ${t.subject || 'Passenger Inquiry'}`,
            description: `${t.passenger_name ? `${t.passenger_name}: ` : ''}${t.description?.slice(0, 90) || 'Support request awaiting administrative review'}...`,
            timestamp: t.created_at || new Date().toISOString(),
            actionLabel: 'Open Desk',
            onAction: () => {
              if (setActiveTab) setActiveTab('station_desk');
              if (setSelectedDeskTicketId) setSelectedDeskTicketId(t.id);
            }
          });
        });
    }

    // 7. Unassigned Active Bookings Needing Sahayak
    if (Array.isArray(bookings) && bookings.length > 0) {
      bookings
        .filter((b) => (b.booking_status === 'pending' || b.booking_status === 'confirmed') && !b.assistant_id && !b.assistant)
        .slice(0, 6)
        .forEach((b) => {
          list.push({
            id: `booking-${b.id}`,
            type: 'booking',
            tabGroup: 'urgent',
            badge: 'UNASSIGNED BOOKING',
            badgeColor: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800',
            iconBg: 'bg-blue-100 text-blue-700 dark:bg-blue-950/90 dark:text-blue-400 border-blue-300 dark:border-blue-800',
            title: `Awaiting Sahayak · Train ${b.train_no || 'Express'}`,
            description: `Station ${b.station_code || 'SCR'}. Passenger ${b.passenger?.name || b.passenger_name || 'Passenger'} at Coach ${b.coach || 'TBD'}, Seat ${b.seat_number || 'TBD'}.`,
            timestamp: b.created_at || new Date().toISOString(),
            actionLabel: 'Assign',
            onAction: () => {
              if (setActiveTab) setActiveTab('bookings');
              if (setSelectedDrawerBooking) setSelectedDrawerBooking(b);
            }
          });
        });
    }

    const sorted = list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const seen = new Set();
    const deduplicated = [];
    for (const item of sorted) {
      const key = `${item.type}:${item.title}:${item.description}`;
      if (!seen.has(key) && !seen.has(item.id)) {
        seen.add(key);
        seen.add(item.id);
        deduplicated.push(item);
      }
    }
    return deduplicated;
  }, [sosAlerts, kycQueue, securityIncidentsList, incidentsList, payoutsList, supportTickets, bookings, setActiveTab, setSelectedDrawerBooking, setSelectedDeskTicketId]);

  // Filter out dismissed notifications
  const visibleNotifications = useMemo(() => {
    return allNotifications.filter((n) => !dismissedNotificationIds.includes(n.id));
  }, [allNotifications, dismissedNotificationIds]);

  const unreadCount = useMemo(() => {
    return visibleNotifications.filter((n) => !readNotificationIds.includes(n.id)).length;
  }, [visibleNotifications, readNotificationIds]);

  const urgentCount = useMemo(() => {
    return visibleNotifications.filter((n) => n.tabGroup === 'urgent').length;
  }, [visibleNotifications]);

  const kycCount = useMemo(() => {
    return visibleNotifications.filter((n) => n.tabGroup === 'kyc').length;
  }, [visibleNotifications]);

  const financeCount = useMemo(() => {
    return visibleNotifications.filter((n) => n.tabGroup === 'finance').length;
  }, [visibleNotifications]);

  const displayedNotifications = useMemo(() => {
    if (notificationFilterTab === 'urgent') return visibleNotifications.filter((n) => n.tabGroup === 'urgent');
    if (notificationFilterTab === 'kyc') return visibleNotifications.filter((n) => n.tabGroup === 'kyc');
    if (notificationFilterTab === 'finance') return visibleNotifications.filter((n) => n.tabGroup === 'finance');
    return visibleNotifications;
  }, [visibleNotifications, notificationFilterTab]);

  const handleMarkAllRead = () => {
    const allIds = visibleNotifications.map((n) => n.id);
    setReadNotificationIds((prev) => Array.from(new Set([...prev, ...allIds])));
    toast.success('All administrative notifications marked as read');
  };

  const handleDismissNotification = (id, e) => {
    e.stopPropagation();
    setDismissedNotificationIds((prev) => Array.from(new Set([...prev, id])));
  };

  const handleNotificationClick = (item) => {
    setReadNotificationIds((prev) => Array.from(new Set([...prev, item.id])));
    setIsNotificationOpen(false);
    if (item.onAction) item.onAction();
  };

  const handleClearDismissed = () => {
    setDismissedNotificationIds([]);
    toast.success('Notification stream reset');
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white dark:bg-[#0A0D14] border-b border-zinc-200/90 dark:border-zinc-800/90 px-4 sm:px-6 flex items-center justify-between shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-colors select-none">
      
      {/* LEFT SECTION */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          title="Toggle Navigation Sidebar"
        >
          <Menu className="w-4 h-4" />
        </button>

        <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-mono">
          OPERATIONS HUB
        </span>

        <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-zinc-200 dark:border-zinc-800 text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-[11.5px] text-zinc-700 dark:text-zinc-300">
            SCR Telemetry Active
          </span>
        </div>
      </div>

      {/* CENTER SECTION */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-4">
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
            <Search className="w-3.5 h-3.5" />
          </div>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && onSearchSubmit) {
                onSearchSubmit(searchQuery);
              }
            }}
            placeholder="Search by booking ID, passenger, phone, train, PNR..."
            className="w-full pl-9 pr-14 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-[#F8FAFC] dark:bg-zinc-900/60 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all font-sans"
          />
          <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
            <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500 shadow-2xs">
              ⌘ K
            </kbd>
          </div>
        </div>
      </div>

      {/* RIGHT SECTION */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        {/* Last Synced & Refresh Button */}
        <div className="hidden lg:flex items-center gap-2 text-xs font-mono text-zinc-500 dark:text-zinc-400">
          <span className="text-[11px]">Last synced: {formatSyncedTime(lastSynced)}</span>
          <button
            type="button"
            onClick={onRefresh}
            title="Synchronize Live Telemetry"
            className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>

        {/* Export Ledger Button */}
        <button
          type="button"
          onClick={onExportLedger}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 shadow-2xs transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
          <span>Export Ledger</span>
        </button>

        {/* Notification Bell & Dropdown */}
        <div className="relative" ref={notificationRef}>
          <button
            type="button"
            onClick={() => {
              setIsNotificationOpen(!isNotificationOpen);
              if (isProfileMenuOpen) setIsProfileMenuOpen(false);
            }}
            className={`relative p-2 rounded-lg transition-colors cursor-pointer ${
              isNotificationOpen
                ? 'bg-blue-50 text-blue-600 dark:bg-zinc-800 dark:text-blue-400'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
            title={`${unreadCount} unread administrative alerts`}
          >
            <Bell className="w-4 h-4" />

            {/* Pulsing emergency beacon if active SOS alerts exist */}
            {sosAlerts && sosAlerts.length > 0 && (
              <span className="animate-ping absolute top-1.5 right-1.5 h-3.5 w-3.5 rounded-full bg-red-400 opacity-75 pointer-events-none" />
            )}

            {/* Unread count badge - purely real count, zero hardcoded placeholders */}
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 rounded-full bg-red-600 text-white text-[9px] font-bold font-mono flex items-center justify-center shadow-xs">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Center Popover */}
          {isNotificationOpen && (
            <div
              className="fixed inset-x-2 top-16 sm:absolute sm:inset-auto sm:right-0 sm:mt-2 sm:w-[450px] max-w-full sm:max-w-[94vw] bg-white dark:bg-[#0D111A] rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 z-50 overflow-hidden animate-scale-in flex flex-col font-sans"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-4 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-900/40 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Bell className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-white leading-tight">
                      Admin Notifications
                    </h4>
                    <p className="text-[10.5px] text-zinc-500 dark:text-zinc-400">
                      Live platform events & alerts
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Mark all read</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (onRefresh) onRefresh();
                    }}
                    title="Refresh Alerts"
                    className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsNotificationOpen(false)}
                    className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="px-3 pt-2 pb-1 border-b border-zinc-100 dark:border-zinc-800/80 bg-white dark:bg-[#0D111A] flex items-center gap-1 overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setNotificationFilterTab('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition-colors cursor-pointer ${
                    notificationFilterTab === 'ALL'
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  All ({visibleNotifications.length})
                </button>
                <button
                  type="button"
                  onClick={() => setNotificationFilterTab('urgent')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition-colors cursor-pointer flex items-center gap-1.5 ${
                    notificationFilterTab === 'urgent'
                      ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-bold'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" />
                  Urgent ({urgentCount})
                </button>
                <button
                  type="button"
                  onClick={() => setNotificationFilterTab('kyc')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition-colors cursor-pointer ${
                    notificationFilterTab === 'kyc'
                      ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 font-bold'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  KYC & Staff ({kycCount})
                </button>
                <button
                  type="button"
                  onClick={() => setNotificationFilterTab('finance')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition-colors cursor-pointer ${
                    notificationFilterTab === 'finance'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-bold'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  Finance & Desk ({financeCount})
                </button>
              </div>

              {/* Feed List */}
              <div className="overflow-y-auto max-h-[420px] divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {displayedNotifications.length === 0 ? (
                  <div className="p-10 text-center flex flex-col items-center justify-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <h5 className="text-xs font-bold text-zinc-900 dark:text-white">
                      All Caught Up
                    </h5>
                    <p className="text-[11px] text-zinc-400 max-w-xs leading-relaxed">
                      No active alerts in this category. All operations and telemetry are running within normal parameters.
                    </p>
                    {dismissedNotificationIds.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearDismissed}
                        className="text-[11px] text-blue-600 dark:text-blue-400 font-medium hover:underline mt-1 cursor-pointer"
                      >
                        Reset dismissed alerts
                      </button>
                    )}
                  </div>
                ) : (
                  displayedNotifications.map((n) => {
                    const isUnread = !readNotificationIds.includes(n.id);
                    return (
                      <div
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className={`p-3.5 hover:bg-blue-50/30 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer group relative flex gap-3 items-start ${
                          isUnread ? 'bg-blue-50/15 dark:bg-blue-950/10' : ''
                        }`}
                      >
                        {/* Unread dot */}
                        {isUnread && (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 shrink-0 mt-2" />
                        )}

                        {/* Icon */}
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${n.iconBg}`}>
                          {n.type === 'emergency' && <AlertTriangle className="w-4 h-4" />}
                          {n.type === 'kyc' && <UserCheck className="w-4 h-4" />}
                          {n.type === 'security' && <ShieldAlert className="w-4 h-4" />}
                          {n.type === 'finance' && <CreditCard className="w-4 h-4" />}
                          {n.type === 'payout' && <CreditCard className="w-4 h-4" />}
                          {n.type === 'support' && <MessageSquare className="w-4 h-4" />}
                          {n.type === 'booking' && <Train className="w-4 h-4" />}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold uppercase tracking-wider border ${n.badgeColor}`}>
                              {n.badge}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-mono shrink-0">
                              {formatTimeAgo(n.timestamp)}
                            </span>
                          </div>

                          <h5 className="text-xs font-bold text-zinc-900 dark:text-white leading-snug truncate">
                            {n.title}
                          </h5>

                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed mt-0.5 line-clamp-2">
                            {n.description}
                          </p>

                          <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-zinc-100/60 dark:border-zinc-800/40">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
                              <span>{n.actionLabel}</span>
                              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                            </span>

                            <button
                              type="button"
                              onClick={(e) => handleDismissNotification(n.id, e)}
                              className="text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 opacity-0 group-hover:opacity-100 transition-opacity p-1 cursor-pointer"
                              title="Dismiss"
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2.5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/50 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 text-zinc-500 font-mono text-[10.5px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Real-time event stream</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsNotificationOpen(false);
                    if (setActiveTab) setActiveTab('bookings');
                  }}
                  className="font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  View Master Ledger →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Platform Administrator Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-zinc-200 dark:border-zinc-800 hover:opacity-90 cursor-pointer"
          >
            <div className="w-7 h-7 rounded-full bg-[#0E1B33] text-blue-400 border border-blue-500/40 flex items-center justify-center font-mono font-bold text-[11px]">
              PA
            </div>
            <span className="hidden xl:inline-block text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              Platform Administrator
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
          </button>

          {isProfileMenuOpen && (
            <div
              className="absolute right-0 mt-2 w-52 bg-white dark:bg-[#0D111A] rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-800 py-1.5 z-50 animate-scale-in"
              onClick={() => setIsProfileMenuOpen(false)}
            >
              <div className="px-3.5 py-2 border-b border-zinc-100 dark:border-zinc-800/80">
                <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                  {user?.name || 'Platform Administrator'}
                </p>
                <p className="text-[10px] text-zinc-500 font-mono truncate">
                  {user?.email || 'admin01@onecoolie.in'}
                </p>
              </div>
              <div className="py-1">
                <button
                  type="button"
                  onClick={onLogout}
                  className="w-full px-3.5 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Live Date & Time Display */}
        <div className="hidden lg:flex flex-col text-right pl-3 border-l border-zinc-200 dark:border-zinc-800 text-xs font-mono">
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight">
            {formatHeaderDate(currentTime)}
          </span>
          <span className="text-[12px] font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
            {formatHeaderTime(currentTime)}
          </span>
        </div>
      </div>
    </header>
  );
}

/* ============================================================
   3. KPI CARD COMPONENT
   ============================================================ */

export function KpiCard({
  icon: Icon,
  iconBg = 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400',
  label,
  value,
  trend,
  trendPositive = true,
  statusText,
  statusDotColor,
  sparklineColor = '#2563EB',
  sparklinePath = 'M 0 16 Q 15 12 30 14 T 60 4',
  onClick
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-[#0D111A] border border-zinc-200/90 dark:border-zinc-800/90 rounded-xl p-3 sm:p-4 min-w-0 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] dark:hover:border-zinc-700 transition-all duration-200 flex flex-col justify-between select-none ${
        onClick ? 'cursor-pointer hover:-translate-y-0.5' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
            <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-[11px] font-medium text-zinc-500 dark:text-zinc-400 leading-tight truncate">
              {label}
            </p>
            <h3 className="text-lg sm:text-2xl font-bold font-sans text-zinc-900 dark:text-white mt-0.5 tracking-tight truncate">
              {value}
            </h3>
          </div>
        </div>
      </div>

      {/* Bottom status / trend row with mini sparkline */}
      <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] font-medium">
          {statusDotColor ? (
            <span className={`w-2 h-2 rounded-full ${statusDotColor} shrink-0`} />
          ) : null}

          {statusText ? (
            <span className="text-zinc-600 dark:text-zinc-400 truncate">
              {statusText}
            </span>
          ) : trend ? (
            <span
              className={`flex items-center gap-0.5 ${
                trendPositive
                  ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                  : 'text-rose-600 dark:text-rose-400 font-semibold'
              }`}
            >
              <ArrowUpRight className="w-3 h-3 shrink-0" />
              <span>{trend}</span>
            </span>
          ) : null}
        </div>

        {/* Subtle decorative vector sparkline */}
        <div className="w-14 h-5 shrink-0 opacity-80">
          <svg viewBox="0 0 60 20" fill="none" className="w-full h-full">
            <path
              d={sparklinePath}
              stroke={sparklineColor}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   4. BOOKING FILTER TOOLBAR COMPONENT
   ============================================================ */

export function BookingFilterToolbar({
  searchQuery,
  onSearchChange,
  selectedStation,
  onStationChange,
  selectedStatus,
  onStatusChange,
  selectedPaymentStatus,
  onPaymentStatusChange,
  selectedDateRange,
  onDateRangeChange,
  selectedAssistantFilter = 'ALL',
  onAssistantFilterChange,
  selectedServiceFilter = 'ALL',
  onServiceFilterChange,
  selectedSosFilter = 'ALL',
  onSosFilterChange,
  selectedBerthFilter = 'ALL',
  onBerthFilterChange,
  assistants = [],
  onClearFilters,
  onExport,
  isFiltered,
  totalFilteredCount,
  totalCount
}) {
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  // Compute total active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedStation && selectedStation !== 'ALL') count++;
    if (selectedStatus && selectedStatus !== 'ALL') count++;
    if (selectedPaymentStatus && selectedPaymentStatus !== 'ALL') count++;
    if (selectedDateRange && selectedDateRange !== 'ALL') count++;
    if (selectedAssistantFilter && selectedAssistantFilter !== 'ALL') count++;
    if (selectedServiceFilter && selectedServiceFilter !== 'ALL') count++;
    if (selectedSosFilter && selectedSosFilter !== 'ALL') count++;
    if (selectedBerthFilter && selectedBerthFilter !== 'ALL') count++;
    if (searchQuery && searchQuery.trim()) count++;
    return count;
  }, [
    selectedStation,
    selectedStatus,
    selectedPaymentStatus,
    selectedDateRange,
    selectedAssistantFilter,
    selectedServiceFilter,
    selectedSosFilter,
    selectedBerthFilter,
    searchQuery
  ]);

  return (
    <div className="bg-white dark:bg-[#0D111A] border border-zinc-200/90 dark:border-zinc-800/90 rounded-xl p-3.5 sm:p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-3">
      {/* Top row: Search input + Filters + Export buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search bar */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by booking ID, passenger name, phone, train, PNR..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-[#F8FAFC] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/80 rounded-lg pl-9 pr-8 py-2 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-sans"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowMoreFilters((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              showMoreFilters || isFiltered
                ? 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-700 shadow-2xs'
                : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800'
            }`}
            title={showMoreFilters ? 'Hide Advanced Filters' : 'Show Advanced Filters'}
          >
            <Filter className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-blue-600 text-white leading-none">
                {activeFiltersCount}
              </span>
            )}
            {showMoreFilters ? (
              <ChevronUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            )}
          </button>

          <button
            type="button"
            onClick={onExport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-zinc-500" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Primary Multi-filter row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5 pt-1 text-xs">
        {/* Station Hub */}
        <div>
          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 font-mono">
            Station Hub
          </label>
          <select
            value={selectedStation}
            onChange={(e) => onStationChange(e.target.value)}
            className="w-full bg-[#F8FAFC] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/80 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option value="ALL">All Stations</option>
            {ADMIN_STATIONS.map((st) => (
              <option key={st.code} value={st.code}>
                {st.code} - {st.name}
              </option>
            ))}
          </select>
        </div>

        {/* Booking Status */}
        <div>
          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 font-mono">
            Booking Status
          </label>
          <select
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            className="w-full bg-[#F8FAFC] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/80 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="accepted">Assigned / Accepted</option>
            <option value="arriving">Arriving</option>
            <option value="in_service">In Service</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Settlement Status */}
        <div>
          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 font-mono">
            Settlement Status
          </label>
          <select
            value={selectedPaymentStatus}
            onChange={(e) => onPaymentStatusChange(e.target.value)}
            className="w-full bg-[#F8FAFC] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/80 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option value="ALL">All Settlements</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="refunded">Refunded</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {/* Date Range */}
        <div>
          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 font-mono">
            Date Range
          </label>
          <select
            value={selectedDateRange}
            onChange={(e) => onDateRangeChange(e.target.value)}
            className="w-full bg-[#F8FAFC] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/80 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option value="ALL">All Time</option>
            <option value="TODAY">Today Only</option>
            <option value="WEEK">Last 7 Days</option>
          </select>
        </div>

        {/* More Filters Toggle */}
        <div className="flex flex-col justify-end">
          <button
            type="button"
            onClick={() => setShowMoreFilters((prev) => !prev)}
            className={`w-full flex items-center justify-center gap-1.5 border rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              showMoreFilters
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-[#F8FAFC] dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700/80 text-blue-600 dark:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-zinc-800'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{showMoreFilters ? 'Hide Filters' : 'More Filters'}</span>
            {showMoreFilters ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 opacity-70" />
            )}
          </button>
        </div>
      </div>

      {/* Advanced Filters Expandable Tray */}
      {showMoreFilters && (
        <div className="bg-[#F8FAFC] dark:bg-zinc-900/80 border border-zinc-200/90 dark:border-zinc-800 rounded-xl p-3.5 sm:p-4 space-y-3.5 animate-fade-in shadow-2xs">
          <div className="flex items-center justify-between border-b border-zinc-200/70 dark:border-zinc-800 pb-2.5">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h4 className="font-bold text-xs text-zinc-900 dark:text-white">
                Advanced Telemetry & Service Filters
              </h4>
            </div>

            <div className="flex items-center gap-3">
              {isFiltered && (
                <button
                  type="button"
                  onClick={onClearFilters}
                  className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-bold hover:underline cursor-pointer"
                >
                  Reset All
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowMoreFilters(false)}
                className="text-[11px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 font-medium cursor-pointer"
              >
                Close ✕
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* 1. Assigned Sahayak */}
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 font-mono">
                Assigned Sahayak
              </label>
              <select
                value={selectedAssistantFilter}
                onChange={(e) => onAssistantFilterChange && onAssistantFilterChange(e.target.value)}
                className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="ALL">All Sahayaks & Staff</option>
                <option value="UNASSIGNED">⚠️ Unassigned (Needs Staff)</option>
                {assistants.length > 0 ? (
                  assistants.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.station_code || 'Hub'})
                    </option>
                  ))
                ) : (
                  <option value="vikas-a">Vikas - A (KZJ)</option>
                )}
              </select>
            </div>

            {/* 2. Requested Services */}
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 font-mono">
                Requested Service
              </label>
              <select
                value={selectedServiceFilter}
                onChange={(e) => onServiceFilterChange && onServiceFilterChange(e.target.value)}
                className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="ALL">All Services</option>
                <option value="luggage">🧳 Luggage Assistance (Porters)</option>
                <option value="wheelchair">♿ Wheelchair / Senior Transit</option>
                <option value="escort">🚶 Seat Escort & Navigation</option>
                <option value="snacks">🍱 Snacks & Water Delivery</option>
                <option value="transport">🛺 Exit Transport / Taxi</option>
                <option value="language">🗣️ Language Translation Support</option>
              </select>
            </div>

            {/* 3. Safety & Emergency SOS */}
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 font-mono">
                Safety & Emergency SOS
              </label>
              <select
                value={selectedSosFilter}
                onChange={(e) => onSosFilterChange && onSosFilterChange(e.target.value)}
                className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="ALL">All Safety Levels</option>
                <option value="SOS_ONLY">🚨 Emergency SOS Active Only</option>
                <option value="NORMAL">Normal Operations (Clean)</option>
              </select>
            </div>

            {/* 4. Berth / Seat Class */}
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 font-mono">
                Berth / Seat Class
              </label>
              <select
                value={selectedBerthFilter}
                onChange={(e) => onBerthFilterChange && onBerthFilterChange(e.target.value)}
                className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="ALL">All Berth Types</option>
                <option value="lower">Lower Berth</option>
                <option value="upper">Upper Berth</option>
                <option value="middle">Middle Berth</option>
                <option value="side">Side Berth</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Filter status row / Clear action */}
      {isFiltered && (
        <div className="flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-zinc-800 text-xs font-mono text-zinc-500">
          <span>
            Filtered: <strong>{totalFilteredCount}</strong> of {totalCount} records matching
          </span>
          <button
            type="button"
            onClick={onClearFilters}
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-bold hover:underline cursor-pointer"
          >
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  );
}


/* ============================================================
   5. BOOKING TABS COMPONENT
   ============================================================ */

export function BookingTabs({
  currentStatusTab,
  onStatusTabChange,
  counts = {
    all: 0,
    pending: 0,
    assigned: 0,
    in_service: 0,
    completed: 0,
    cancelled: 0
  },
  sortBy,
  onSortChange
}) {
  const tabs = [
    { id: 'ALL', label: 'All Bookings', count: counts.all },
    { id: 'pending', label: 'Pending', count: counts.pending },
    { id: 'assigned', label: 'Assigned', count: counts.assigned },
    { id: 'in_service', label: 'In Service', count: counts.in_service },
    { id: 'completed', label: 'Completed', count: counts.completed },
    { id: 'cancelled', label: 'Cancelled', count: counts.cancelled },
  ];

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-0.5 select-none">
      {/* Tabs */}
      <div className="flex items-center gap-1 sm:gap-4 overflow-x-auto scrollbar-none">
        {tabs.map((tab) => {
          const isActive = currentStatusTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onStatusTabChange(tab.id)}
              className={`flex items-center gap-2 py-3 px-2 sm:px-3 text-xs font-semibold whitespace-nowrap transition-all border-b-2 -mb-0.5 cursor-pointer ${
                isActive
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10.5px] font-mono transition-colors ${
                    isActive
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-bold'
                      : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Sort selection */}
      <div className="flex items-center gap-1.5 pb-2 sm:pb-0 shrink-0">
        <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400" />
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
          className="bg-transparent text-xs font-medium text-zinc-700 dark:text-zinc-300 border-none focus:outline-none cursor-pointer pr-1"
        >
          <option value="newest">Sort: Latest First</option>
          <option value="oldest">Sort: Oldest First</option>
          <option value="price_high">Sort: Price High to Low</option>
          <option value="price_low">Sort: Price Low to High</option>
        </select>
      </div>
    </div>
  );
}

/* ============================================================
   6. BOOKING TABLE COMPONENT
   ============================================================ */

export function BookingTable({
  bookings = [],
  selectedBooking,
  onSelectBooking,
  currentPage,
  onPageChange,
  rowsPerPage,
  onRowsPerPageChange,
  totalBookingsCount,
  onRefresh
}) {
  const [selectedRowIds, setSelectedRowIds] = useState(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);

  // Close context menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRowIds(new Set(bookings.map((b) => b.id)));
    } else {
      setSelectedRowIds(new Set());
    }
  };

  const handleRowCheckbox = (id, e) => {
    e.stopPropagation();
    const next = new Set(selectedRowIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedRowIds(next);
  };

  const totalPages = Math.ceil(totalBookingsCount / rowsPerPage) || 1;
  const startIdx = (currentPage - 1) * rowsPerPage + 1;
  const endIdx = Math.min(currentPage * rowsPerPage, totalBookingsCount);

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // --- Bulk action API call ---
  const apiBulkAction = async (action, ids, reason) => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/admin/bookings/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action, ids: Array.from(ids), reason })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Bulk action failed');
    }
    return res.json();
  };

  const handleBulkAction = async (action) => {
    if (selectedRowIds.size === 0) return;
    const count = selectedRowIds.size;
    const labels = { cancel: 'Cancel', delete: 'Delete', mark_paid: 'Mark as Paid', flag_suspicious: 'Flag' };
    const label = labels[action] || action;
    const reason = action === 'cancel' ? 'Bulk cancel by admin' : action === 'delete' ? 'Bulk delete by admin' : 'Bulk action by admin';

    setBulkLoading(true);
    const loadingToast = toast.loading(`Applying "${label}" to ${count} booking(s)…`);
    try {
      const result = await apiBulkAction(action, selectedRowIds, reason);
      toast.dismiss(loadingToast);
      toast.success(`${label}: ${result.successCount} booking(s) updated.`, { duration: 4000 });
      setSelectedRowIds(new Set());
      if (typeof onRefresh === 'function') onRefresh();
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error(err.message || 'Bulk action failed');
    } finally {
      setBulkLoading(false);
    }
  };

  // --- Per-row single action (wraps bulk with one id) ---
  const handleRowAction = async (action, bookingId, e) => {
    e.stopPropagation();
    setOpenMenuId(null);
    const labels = { cancel: 'Cancel', delete: 'Delete', mark_paid: 'Mark as Paid', flag_suspicious: 'Flag' };
    const label = labels[action] || action;
    const reason = `Single ${action} by admin`;
    const loadingToast = toast.loading(`${label} booking…`);
    try {
      const result = await apiBulkAction(action, new Set([bookingId]), reason);
      toast.dismiss(loadingToast);
      toast.success(`Booking ${label.toLowerCase()}d.`, { duration: 3000 });
      if (typeof onRefresh === 'function') onRefresh();
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error(err.message || `${label} failed`);
    }
  };

  return (
    <div className="bg-white dark:bg-[#0D111A] border border-zinc-200/90 dark:border-zinc-800/90 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col">

      {/* ── Bulk Action Toolbar ── */}
      <div
        className={`transition-all duration-300 overflow-hidden ${
          selectedRowIds.size > 0 ? 'max-h-16 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 dark:bg-blue-700 border-b border-blue-500">
          <span className="text-white text-xs font-bold font-mono mr-2">
            {selectedRowIds.size} selected
          </span>

          <button
            type="button"
            disabled={bulkLoading}
            onClick={() => handleBulkAction('cancel')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white/15 hover:bg-white/25 text-white transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Ban className="w-3.5 h-3.5" />
            Cancel
          </button>

          <button
            type="button"
            disabled={bulkLoading}
            onClick={() => handleBulkAction('mark_paid')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white/15 hover:bg-white/25 text-white transition-colors disabled:opacity-50 cursor-pointer"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Mark Paid
          </button>

          <button
            type="button"
            disabled={bulkLoading}
            onClick={() => handleBulkAction('flag_suspicious')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-400/30 hover:bg-amber-400/40 text-amber-100 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Flag className="w-3.5 h-3.5" />
            Flag
          </button>

          <button
            type="button"
            disabled={bulkLoading}
            onClick={() => {
              if (window.confirm(`Permanently delete ${selectedRowIds.size} booking(s)? This cannot be undone.`)) {
                handleBulkAction('delete');
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/30 hover:bg-red-500/40 text-red-100 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>

          <button
            type="button"
            onClick={() => setSelectedRowIds(new Set())}
            className="ml-auto inline-flex items-center gap-1 text-white/70 hover:text-white text-xs cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            Clear
          </button>
        </div>
      </div>

      <div className="overflow-x-auto min-h-[360px]">
        <table className="w-full text-left text-xs border-collapse min-w-[1100px]">
          <thead>
            <tr className="bg-[#F8FAFC] dark:bg-zinc-900/80 border-b border-zinc-200/90 dark:border-zinc-800 text-[10.5px] uppercase font-mono tracking-wider text-zinc-400 font-semibold select-none">
              <th className="py-3 px-3 w-10 text-center">
                <input
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={bookings.length > 0 && selectedRowIds.size === bookings.length}
                  className="rounded border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </th>
              <th className="py-3 px-3.5 font-bold">BOOKING ID</th>
              <th className="py-3 px-3.5 font-bold">PASSENGER</th>
              <th className="py-3 px-3.5 font-bold">TRAIN &amp; PNR</th>
              <th className="py-3 px-3.5 font-bold">STATION</th>
              <th className="py-3 px-3.5 font-bold">COACH / SEAT</th>
              <th className="py-3 px-3.5 font-bold">SERVICE</th>
              <th className="py-3 px-3.5 font-bold">SAHAYAK</th>
              <th className="py-3 px-3.5 font-bold">STATUS</th>
              <th className="py-3 px-3.5 font-bold">PAYMENT</th>
              <th className="py-3 px-3.5 font-bold">UPDATED</th>
              <th className="py-3 px-3.5 font-bold text-right sticky right-0 bg-[#F8FAFC] dark:bg-zinc-900 border-b border-zinc-200/90 dark:border-zinc-800 shadow-[-6px_0_10px_-4px_rgba(0,0,0,0.06)] z-10">
                ACTION
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/70">
            {bookings.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-16 text-center text-zinc-400 font-mono">
                  No matching bookings found in the operations ledger.
                </td>
              </tr>
            ) : (
              bookings.map((b) => {
                const isCurrentSelected = selectedBooking?.id === b.id;
                const isChecked = selectedRowIds.has(b.id);
                const rawStatus = (b.booking_status || 'pending').toLowerCase();
                const displayStatus =
                  rawStatus === 'accepted' ? 'CONFIRMED' : rawStatus.toUpperCase();
                const isMenuOpen = openMenuId === b.id;

                return (
                  <tr
                    key={b.id}
                    onClick={() => onSelectBooking(b)}
                    className={`transition-colors duration-150 cursor-pointer group ${
                      isCurrentSelected
                        ? 'bg-blue-50/70 dark:bg-blue-950/30'
                        : isChecked
                        ? 'bg-zinc-50 dark:bg-zinc-900/50'
                        : 'hover:bg-blue-50/30 dark:hover:bg-zinc-800/30'
                    }`}
                  >
                    {/* Checkbox */}
                    <td
                      className="py-3 px-3 text-center"
                      onClick={(e) => handleRowCheckbox(b.id, e)}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="rounded border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>

                    {/* Booking ID & Ref */}
                    <td className="py-3 px-3.5 font-mono">
                      <span className="text-blue-600 dark:text-blue-400 font-bold block leading-tight hover:underline">
                        #{b.booking_id || b.id?.slice(-8).toUpperCase()}
                      </span>
                      <span className="block text-[10px] text-zinc-400 mt-0.5 leading-tight">
                        Ref: #{b.id?.slice(-8).toUpperCase()}
                      </span>
                    </td>

                    {/* Passenger */}
                    <td className="py-3 px-3.5">
                      <p className="font-semibold text-zinc-900 dark:text-white leading-tight truncate max-w-[130px]">
                        {b.passenger?.name || 'Guest'}
                      </p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono mt-0.5 leading-tight truncate max-w-[130px]">
                        {b.passenger?.phone || b.passenger?.email || '—'}
                      </p>
                    </td>

                    {/* Train & PNR */}
                    <td className="py-3 px-3.5">
                      <div className="font-mono font-bold text-zinc-900 dark:text-white leading-tight">
                        {b.train_no || b.train_number || '—'}
                      </div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate max-w-[120px] leading-tight mt-0.5">
                        {b.train_name || 'Express'}
                      </div>
                      {b.pnr && (
                        <span className="inline-block mt-0.5 px-1 py-0.2 rounded text-[9.5px] font-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                          PNR: {b.pnr}
                        </span>
                      )}
                    </td>

                    {/* Station */}
                    <td className="py-3 px-3.5">
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-[12px] block leading-tight">
                        {b.station_code}
                      </span>
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono block leading-tight mt-0.5">
                        Platform {b.platform || '1'}
                      </span>
                    </td>

                    {/* Coach / Seat */}
                    <td className="py-3 px-3.5 font-mono">
                      <span className="font-bold text-zinc-900 dark:text-white block leading-tight">
                        {b.coach || 'TBD'} - {b.seat_number || 'TBD'}
                      </span>
                      <span className="text-[10.5px] text-zinc-500 dark:text-zinc-400 block leading-tight mt-0.5 font-sans">
                        {b.berth_type || (b.action_type === 'collect_from_seat' ? 'Lower' : 'Upper')}
                      </span>
                    </td>

                    {/* Service */}
                    <td className="py-3 px-3.5">
                      <span className="text-zinc-800 dark:text-zinc-200 font-medium text-[11.5px] whitespace-nowrap">
                        {resolveServiceName(b)}
                      </span>
                    </td>

                    {/* Sahayak */}
                    <td className="py-3 px-3.5">
                      <div className="flex items-center gap-1.5 min-w-[110px]">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            b.assistant?.name ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                        />
                        <span className="truncate text-zinc-800 dark:text-zinc-200 font-medium text-[11.5px]">
                          {b.assistant?.name || 'Unassigned'}
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3.5">
                      <span
                        className={`inline-block text-[10px] font-bold uppercase font-mono px-2 py-0.5 rounded-full border ${
                          STATUS_BADGE_STYLES[rawStatus] || 'border-zinc-200 text-zinc-700'
                        }`}
                      >
                        {displayStatus}
                      </span>
                      {b.sos_triggered && (
                        <span className="flex items-center gap-1 text-[9px] font-bold text-red-600 animate-pulse mt-0.5">
                          <AlertTriangle className="w-2.5 h-2.5" /> SOS
                        </span>
                      )}
                    </td>

                    {/* Payment */}
                    <td className="py-3 px-3.5 font-mono">
                      <span className="font-bold text-zinc-900 dark:text-white block leading-tight">
                        ₹{b.total_price || 0}
                      </span>
                      <span
                        className={`text-[10px] font-semibold uppercase block leading-tight mt-0.5 ${
                          b.payment_status === 'paid'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {b.payment_status || 'Pending'}
                      </span>
                    </td>

                    {/* Updated */}
                    <td className="py-3 px-3.5 font-mono text-[11px] text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                      <div>{formatTime(b.updated_at || b.created_at)}</div>
                      <div className="text-[10px] text-zinc-400 mt-0.5">
                        {formatDate(b.updated_at || b.created_at)}
                      </div>
                    </td>

                    {/* Action (View + ⋮ Menu) */}
                    <td
                      className={`py-3 px-3.5 text-right sticky right-0 transition-colors shadow-[-6px_0_10px_-4px_rgba(0,0,0,0.06)] z-10 ${
                        isCurrentSelected
                          ? 'bg-[#EDF5FF] dark:bg-[#111C2E]'
                          : isChecked
                          ? 'bg-zinc-50 dark:bg-zinc-900'
                          : 'bg-white dark:bg-[#0D111A] group-hover:bg-[#F2F7FF] dark:group-hover:bg-[#141A26]'
                      }`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectBooking(b);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors cursor-pointer px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-950/50"
                        >
                          <span>View</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>

                        {/* Three-dot context menu */}
                        <div className="relative" ref={isMenuOpen ? menuRef : null}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(isMenuOpen ? null : b.id);
                            }}
                            className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors cursor-pointer"
                            title="More actions"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>

                          {isMenuOpen && (
                            <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl z-50 py-1 animate-in fade-in slide-in-from-top-1 duration-150">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onSelectBooking(b); setOpenMenuId(null); }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5 text-blue-500" />
                                View Details
                              </button>

                              <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />

                              <button
                                type="button"
                                onClick={(e) => handleRowAction('cancel', b.id, e)}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
                              >
                                <Ban className="w-3.5 h-3.5 text-amber-500" />
                                Cancel Booking
                              </button>

                              <button
                                type="button"
                                onClick={(e) => handleRowAction('mark_paid', b.id, e)}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
                              >
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                                Mark as Paid
                              </button>

                              <button
                                type="button"
                                onClick={(e) => handleRowAction('flag_suspicious', b.id, e)}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
                              >
                                <Flag className="w-3.5 h-3.5 text-orange-500" />
                                Flag Suspicious
                              </button>

                              <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />

                              <button
                                type="button"
                                onClick={(e) => {
                                  if (window.confirm('Delete this booking? This action cannot be undone.')) {
                                    handleRowAction('delete', b.id, e);
                                  } else {
                                    e.stopPropagation();
                                    setOpenMenuId(null);
                                  }
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete Booking
                              </button>
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

      {/* Table Pagination Footer */}
      <div className="px-4 py-3 border-t border-zinc-200/90 dark:border-zinc-800/90 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-zinc-500 dark:text-zinc-400 bg-white dark:bg-[#0D111A]">
        <div>
          Showing {totalBookingsCount > 0 ? `${startIdx}-${endIdx}` : '0'} of {totalBookingsCount} bookings
        </div>

        <div className="flex items-center gap-2">
          {/* Page buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => onPageChange(currentPage - 1)}
              className="p-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 cursor-pointer"
              title="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {Array.from({ length: Math.min(totalPages, 5) }).map((_, idx) => {
              const pageNum = idx + 1;
              const isCurrent = currentPage === pageNum;
              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => onPageChange(pageNum)}
                  className={`w-7 h-7 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                    isCurrent
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
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange(currentPage + 1)}
              className="p-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 cursor-pointer"
              title="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Rows per page */}
          <select
            value={rowsPerPage}
            onChange={(e) => onRowsPerPageChange(Number(e.target.value))}
            className="bg-[#F8FAFC] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md px-2 py-1 text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none cursor-pointer"
          >
            <option value={10}>10 / page</option>
            <option value={15}>15 / page</option>
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
          </select>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   7. BOOKING DRAWER COMPONENT
   ============================================================ */

export function BookingDrawer({
  booking,
  onClose,
  onInspect,
  onUpdateBooking,
  assistants = [],
  onOpenSupportTicket,
  onPrev,
  onNext,
  currentIndex,
  totalCount
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedAssistantId, setSelectedAssistantId] = useState(booking?.assistant_id || '');
  const [assignLoading, setAssignLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Keyboard navigation & ESC to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && onPrev) {
        onPrev();
      } else if (e.key === 'ArrowRight' && onNext) {
        onNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onPrev, onNext]);

  // Update selected assistant when booking changes
  useEffect(() => {
    setSelectedAssistantId(booking?.assistant_id || '');
    setIsAssigning(false);
  }, [booking?.id, booking?.assistant_id]);

  if (!booking) return null;

  const rawStatus = (booking.booking_status || 'pending').toLowerCase();
  const displayStatus = rawStatus === 'accepted' ? 'CONFIRMED' : rawStatus.toUpperCase();

  const handleCopyId = () => {
    const text = booking.booking_id || booking.id || '';
    if (text) {
      navigator.clipboard.writeText(text);
      setCopiedId(true);
      toast.success(`Copied #${text}`);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleAssignSubmit = async () => {
    try {
      setAssignLoading(true);
      await onUpdateBooking(booking.id, { assistant_id: selectedAssistantId || null });
      toast.success(selectedAssistantId ? 'Sahayak assigned successfully' : 'Sahayak unassigned');
      setIsAssigning(false);
    } catch (err) {
      toast.error('Failed to assign Sahayak');
    } finally {
      setAssignLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const timelineEvents = [
    {
      title: 'Booking Created',
      time: formatDate(booking.created_at),
      completed: true,
    },
    {
      title: 'Assistant Assigned',
      time: booking.assistant ? (booking.assigned_at ? formatDate(booking.assigned_at) : 'Assigned') : 'Pending',
      completed: Boolean(booking.assistant_id || booking.assistant),
    },
    {
      title: 'Assistant Reached',
      time: rawStatus === 'in_service' || rawStatus === 'completed' ? 'Reached Station Node' : 'Pending',
      completed: rawStatus === 'in_service' || rawStatus === 'completed',
    },
    {
      title: 'Service Started',
      time: booking.service_started_at ? formatDate(booking.service_started_at) : (rawStatus === 'in_service' || rawStatus === 'completed' ? 'OTP Verified' : 'Pending'),
      completed: rawStatus === 'in_service' || rawStatus === 'completed',
    },
    {
      title: 'Service Completed',
      time: booking.completed_at ? formatDate(booking.completed_at) : (rawStatus === 'completed' ? 'Completed' : 'Pending'),
      completed: rawStatus === 'completed',
    },
  ];

  return (
    <>
      {/* BACKDROP OVERLAY */}
      <div
        className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-[2px] z-40 transition-opacity animate-fade-in cursor-pointer 2xl:hidden"
        onClick={onClose}
        aria-label="Close drawer"
      />

      {/* DRAWER PANEL */}
      <aside className="fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[460px] max-w-full h-screen max-h-screen overflow-hidden flex flex-col bg-white dark:bg-[#0D111A] border-l border-zinc-200 dark:border-zinc-800 shadow-[-16px_0_40px_rgba(0,0,0,0.2)] animate-slide-left select-none text-xs">
        
        {/* HEADER */}
        <div className="p-3.5 sm:px-5 border-b border-zinc-200 dark:border-zinc-800 shrink-0 bg-zinc-50/80 dark:bg-zinc-900/80 backdrop-blur-xs">
          <div className="flex items-center justify-between gap-2">
            {/* Back button & Paging counter */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onClose}
                className="p-1 -ml-1 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-mono font-bold"
                title="Back to Table (Esc)"
              >
                <ChevronLeft className="w-4 h-4 text-zinc-400" />
                <span>Back</span>
              </button>

              {totalCount && currentIndex && (
                <div className="flex items-center gap-1 ml-2 pl-2 border-l border-zinc-200 dark:border-zinc-700">
                  <span className="text-[10.5px] font-mono text-zinc-400 font-semibold">
                    {currentIndex} / {totalCount}
                  </span>
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      disabled={!onPrev}
                      onClick={onPrev}
                      className="p-1 rounded text-zinc-400 hover:text-zinc-800 dark:hover:text-white disabled:opacity-25 disabled:hover:text-zinc-400 cursor-pointer"
                      title="Previous booking (Left Arrow)"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={!onNext}
                      onClick={onNext}
                      className="p-1 rounded text-zinc-400 hover:text-zinc-800 dark:hover:text-white disabled:opacity-25 disabled:hover:text-zinc-400 cursor-pointer"
                      title="Next booking (Right Arrow)"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Expand to Full Modal + Close buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onInspect && onInspect(booking)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                title="Expand to Full Screen Inspector Modal"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Close Drawer (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Title & Status */}
          <div className="mt-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <h2 className="text-base sm:text-lg font-mono font-black text-zinc-900 dark:text-white tracking-tight">
                #{booking.booking_id || booking.id?.slice(-8).toUpperCase()}
              </h2>
              <button
                type="button"
                onClick={handleCopyId}
                className="p-1 text-zinc-400 hover:text-blue-600 transition-colors cursor-pointer rounded hover:bg-zinc-200/50 dark:hover:bg-zinc-800"
                title="Copy booking ID"
              >
                {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold font-mono border ${
                STATUS_PILL_STYLES[rawStatus] || 'border-zinc-200 text-zinc-700'
              }`}
            >
              {displayStatus}
            </span>
          </div>

          {/* Ref & Date */}
          <p className="text-[10.5px] font-mono text-zinc-400 mt-1">
            Ref: #{booking.id?.slice(-8).toUpperCase()} · {formatDate(booking.created_at)}
          </p>

          {/* Drawer Tabs */}
          <div className="flex items-center gap-4 mt-2.5 border-t border-zinc-200/80 dark:border-zinc-800/80 pt-2">
            {['overview', 'timeline', 'support', 'incidents'].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`pb-1 text-xs font-semibold capitalize transition-all border-b-2 -mb-2 cursor-pointer ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* DRAWER BODY */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-4 space-y-3.5 scrollbar-thin">
          {activeTab === 'overview' && (
            <>
              {/* Passenger Details Card */}
              <div className="bg-[#F8FAFC] dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 font-mono text-[10.5px] uppercase font-bold">
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-zinc-400" /> Passenger Details
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-[13px] text-zinc-900 dark:text-white">
                      {booking.passenger?.name || 'Guest Passenger'}
                    </h4>
                    <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                      {booking.passenger?.phone || 'No phone recorded'}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {booking.passenger?.phone && (
                      <a
                        href={`tel:${booking.passenger.phone}`}
                        className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-blue-600 transition-colors"
                        title="Call Passenger"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => onOpenSupportTicket && onOpenSupportTicket(booking)}
                      className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-blue-600 transition-colors cursor-pointer"
                      title="Send Message / Open Ticket"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Train Details Card */}
              <div className="bg-[#F8FAFC] dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-3 space-y-2.5">
                <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 font-mono text-[10.5px] uppercase font-bold">
                  <Train className="w-3.5 h-3.5 text-zinc-400" /> Train Details
                </div>

                <div>
                  <h4 className="font-bold text-[13px] text-zinc-900 dark:text-white">
                    {booking.train_no || booking.train_number || '—'} · {booking.train_name || 'Express'}
                  </h4>
                  <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                    {booking.source || 'Boarding'} ➔ {booking.destination || booking.station_code || 'Secunderabad'}
                  </p>
                  <p className="text-[10.5px] text-zinc-400 font-mono mt-0.5">
                    {booking.journey_date || 'Today'} {booking.journey_time ? `· ${booking.journey_time}` : ''}
                  </p>
                </div>

                {/* Station + Platform */}
                <div className="flex items-center justify-between pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60">
                  <div className="font-mono">
                    <span className="font-bold text-zinc-900 dark:text-white text-xs">
                      {booking.station_code} · {booking.station_name || 'Station Hub'}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10.5px] font-mono font-bold bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
                    Platform {booking.platform || '1'}
                  </span>
                </div>

                {/* 3 mini cards: Coach, Seat, Service */}
                <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-center">
                  <div className="bg-white dark:bg-zinc-800 p-2 rounded-lg border border-zinc-200/60 dark:border-zinc-700/60">
                    <span className="text-[9.5px] text-zinc-400 uppercase block font-semibold">Coach</span>
                    <span className="font-bold text-zinc-900 dark:text-white text-xs mt-0.5 block">
                      {booking.coach || 'TBD'}
                    </span>
                  </div>
                  <div className="bg-white dark:bg-zinc-800 p-2 rounded-lg border border-zinc-200/60 dark:border-zinc-700/60">
                    <span className="text-[9.5px] text-zinc-400 uppercase block font-semibold">Seat</span>
                    <span className="font-bold text-zinc-900 dark:text-white text-xs mt-0.5 block truncate">
                      {booking.seat_number || 'TBD'} {booking.berth_type ? `· ${booking.berth_type[0]}` : ''}
                    </span>
                  </div>
                  <div className="bg-white dark:bg-zinc-800 p-2 rounded-lg border border-zinc-200/60 dark:border-zinc-700/60">
                    <span className="text-[9.5px] text-zinc-400 uppercase block font-semibold">Service</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400 text-[10.5px] mt-0.5 block truncate">
                      {resolveServiceName(booking)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sahayak Card */}
              <div className="bg-[#F8FAFC] dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 font-mono text-[10.5px] uppercase font-bold">
                    <Users className="w-3.5 h-3.5 text-zinc-400" /> Sahayak
                  </div>
                  {booking.assistant?.name ? (
                    <button
                      type="button"
                      onClick={() => setIsAssigning(!isAssigning)}
                      className="text-blue-600 dark:text-blue-400 text-[11px] font-bold hover:underline cursor-pointer"
                    >
                      {isAssigning ? 'Cancel' : 'Reassign'}
                    </button>
                  ) : null}
                </div>

                {booking.assistant?.name ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <h4 className="font-bold text-[13px] text-zinc-900 dark:text-white">
                          {booking.assistant.name}
                        </h4>
                      </div>
                      <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                        {booking.assistant.phone || 'Phone not logged'}
                      </p>
                    </div>
                    {booking.assistant.phone && (
                      <a
                        href={`tel:${booking.assistant.phone}`}
                        className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-emerald-600 transition-colors"
                        title="Call Sahayak"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">
                        Not Assigned
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      We are looking for the nearest available assistant.
                    </p>
                    {!isAssigning && (
                      <button
                        type="button"
                        onClick={() => setIsAssigning(true)}
                        className="mt-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-blue-600 hover:bg-blue-50 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                      >
                        + Assign Sahayak
                      </button>
                    )}
                  </div>
                )}

                {/* Inline assignment picker */}
                {isAssigning && (
                  <div className="pt-2 border-t border-zinc-200/80 dark:border-zinc-800/80 space-y-2">
                    <label className="block text-[10px] font-mono text-zinc-400 uppercase font-bold">
                      Select Station Assistant:
                    </label>
                    <select
                      value={selectedAssistantId}
                      onChange={(e) => setSelectedAssistantId(e.target.value)}
                      className="w-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg p-2 text-xs text-zinc-900 dark:text-white focus:outline-blue-500"
                    >
                      <option value="">-- Leave Unassigned --</option>
                      {assistants.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.station_code || 'Hub'}) {a.is_online ? '• Online' : ''}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleAssignSubmit}
                        disabled={assignLoading}
                        className="flex-1 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 cursor-pointer disabled:opacity-50"
                      >
                        {assignLoading ? 'Saving...' : 'Confirm Assignment'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAssigning(false)}
                        className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Card */}
              <div className="bg-[#F8FAFC] dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 font-mono text-[10.5px] uppercase font-bold">
                    <CreditCard className="w-3.5 h-3.5 text-zinc-400" /> Payment
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-lg font-black font-mono text-zinc-900 dark:text-white">
                      ₹{booking.total_price || 0}
                    </span>
                    <span
                      className={`text-[11px] font-semibold ${
                        booking.payment_status === 'paid'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      Status: {booking.payment_status || 'Pending'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onInspect && onInspect(booking)}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>View Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Booking Timeline */}
              <div className="bg-[#F8FAFC] dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-3 space-y-2.5">
                <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 font-mono text-[10.5px] uppercase font-bold">
                  <Clock className="w-3.5 h-3.5 text-zinc-400" /> Booking Timeline
                </div>

                <div className="relative pl-5 space-y-3 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-200 dark:before:bg-zinc-800">
                  {timelineEvents.map((evt, idx) => (
                    <div key={idx} className="relative">
                      <span
                        className={`absolute -left-5 top-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                          evt.completed
                            ? 'bg-blue-600 text-white'
                            : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {evt.completed ? '✓' : '•'}
                      </span>
                      <p
                        className={`text-xs font-semibold ${
                          evt.completed
                            ? 'text-zinc-900 dark:text-white'
                            : 'text-zinc-400 dark:text-zinc-500'
                        }`}
                      >
                        {evt.title}
                      </p>
                      <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                        {evt.time}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Secret Start OTP Card */}
              {booking.start_otp && (
                <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900 flex items-center justify-between">
                  <div>
                    <span className="text-zinc-500 dark:text-zinc-400 block text-[10px] uppercase font-mono font-bold">
                      Secret Start OTP
                    </span>
                    <span className="text-base font-black font-mono tracking-wider text-blue-600 dark:text-blue-400">
                      {booking.start_otp}
                    </span>
                  </div>
                  <span className="text-[10.5px] font-mono px-2 py-0.5 rounded-full bg-white dark:bg-zinc-800 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-bold">
                    {booking.start_otp_verified ? 'Verified ✓' : 'Awaiting Handshake'}
                  </span>
                </div>
              )}
            </>
          )}

          {/* Timeline Detailed Tab */}
          {activeTab === 'timeline' && (
            <div className="space-y-3">
              <h4 className="font-bold text-sm text-zinc-900 dark:text-white">
                Lifecycle Event Audit
              </h4>
              <div className="space-y-2 font-mono text-xs">
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                  <span className="text-zinc-400 block text-[10px]">Created At</span>
                  <span className="font-bold">{formatDate(booking.created_at)}</span>
                </div>
                {booking.service_started_at && (
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                    <span className="text-zinc-400 block text-[10px]">Service Started</span>
                    <span className="font-bold">{formatDate(booking.service_started_at)}</span>
                  </div>
                )}
                {booking.completed_at && (
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                    <span className="text-zinc-400 block text-[10px]">Completed At</span>
                    <span className="font-bold">{formatDate(booking.completed_at)}</span>
                  </div>
                )}
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                  <span className="text-zinc-400 block text-[10px]">Secret Start OTP</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {booking.start_otp || '------'}
                  </span>
                  <span className="text-[10px] text-zinc-400 block mt-0.5">
                    Verified: {booking.start_otp_verified ? 'Yes' : 'Awaiting handshake'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Support Tab */}
          {activeTab === 'support' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-1.5">
                  <LifeBuoy className="w-4 h-4 text-blue-600" /> Linked Support Tickets
                </h4>
              </div>
              <p className="text-zinc-500 text-xs">
                Need to assist this passenger or report an operational delay?
              </p>
              <button
                type="button"
                onClick={() => onOpenSupportTicket && onOpenSupportTicket(booking)}
                className="w-full py-2.5 px-3 bg-blue-600 text-white rounded-lg font-bold text-xs hover:bg-blue-700 transition-colors cursor-pointer"
              >
                + Raise Desk Ticket for Booking #{booking.booking_id || booking.id?.slice(-8).toUpperCase()}
              </button>
            </div>
          )}

          {/* Incidents Tab */}
          {activeTab === 'incidents' && (
            <div className="space-y-3">
              <h4 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" /> Incident & SOS Status
              </h4>
              {booking.sos_triggered ? (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-bold font-mono text-xs">
                    <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
                    EMERGENCY SOS ACTIVE
                  </div>
                  <p className="text-[11px] text-rose-600 dark:text-rose-400">
                    Passenger or Sahayak triggered emergency telemetry at {formatDate(booking.sos_triggered_at)}.
                  </p>
                  <button
                    type="button"
                    onClick={() => onUpdateBooking(booking.id, { sos_triggered: false })}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 cursor-pointer"
                  >
                    Mark SOS Resolved
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-center text-zinc-400 font-mono text-xs">
                  No active safety or emergency incidents logged for this booking.
                </div>
              )}
            </div>
          )}
        </div>

        {/* DRAWER FOOTER */}
        <div className="p-3 sm:px-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0D111A] space-y-2 shrink-0 z-10 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
          {!booking.assistant_id && (
            <button
              type="button"
              onClick={() => setIsAssigning(true)}
              className="w-full py-2.5 rounded-xl bg-[#090D16] dark:bg-blue-600 text-white font-bold text-xs hover:bg-zinc-800 dark:hover:bg-blue-700 transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-2"
            >
              <Users className="w-4 h-4" />
              <span>Assign Sahayak</span>
            </button>
          )}

          {booking.assistant_id && (rawStatus === 'accepted' || rawStatus === 'arriving' || rawStatus === 'in_service') && (
            <button
              type="button"
              onClick={() => onInspect && onInspect(booking)}
              className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Verify Handshake OTP & Inspect</span>
            </button>
          )}

          {rawStatus === 'completed' && (
            <button
              type="button"
              onClick={() => onInspect && onInspect(booking)}
              className="w-full py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold text-xs hover:bg-emerald-100 transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Completed · Inspect Full Audit</span>
            </button>
          )}

          <div className="grid grid-cols-2 gap-2">
            {booking.passenger?.phone ? (
              <a
                href={`tel:${booking.passenger.phone}`}
                className="py-2 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-zinc-500" />
                <span>Call Passenger</span>
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="py-2 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-400 font-semibold text-[11px] flex items-center justify-center gap-1.5 opacity-50"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>No Phone</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onOpenSupportTicket && onOpenSupportTicket(booking)}
              className="py-2 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5 text-zinc-500" />
              <span>Raise Ticket</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

/* ============================================================
   8. BOOKING DETAIL MODAL COMPONENT (SUPERSEDED BY UBER INSPECTOR)
   ============================================================ */

export function BookingDetailModal(props) {
  return <BookingInspectorModal {...props} />;
}

/* ============================================================
   9. OPERATIONS ANALYTICS VIEW COMPONENT
   ============================================================ */

export function OperationsAnalyticsView({
  stats = {},
  bookings = [],
  assistantsList = [],
  sosAlerts = [],
  securityMetrics = {},
  onSelectBooking,
  setActiveTab,
  setSelectedStation,
  setSelectedStatus,
  setSelectedPaymentStatus,
  setSelectedDateRange
}) {
  const [stationMetric, setStationMetric] = useState('bookings');
  const [stationTimeRange, setStationTimeRange] = useState('7d');
  const [selectedStationFilter, setSelectedStationFilter] = useState('ALL');
  const [dateFilterOpen, setDateFilterOpen] = useState(false);
  const [currentDateFilter, setCurrentDateFilter] = useState('today');

  const formattedToday = useMemo(() => {
    const now = new Date();
    const day = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    return `Today · ${day}`;
  }, []);

  const totalBookingsCount = stats.totalBookings || bookings.length;

  const pendingAssignmentsCount = useMemo(() => {
    return bookings.filter(
      (b) => (b.booking_status || '').toLowerCase() === 'pending' || !b.assistant_id
    ).length;
  }, [bookings]);

  const inServiceCount = useMemo(() => {
    return bookings.filter((b) => {
      const s = (b.booking_status || '').toLowerCase();
      return s === 'in_service' || s === 'arriving';
    }).length;
  }, [bookings]);

  const completedTodayCount = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return bookings.filter((b) => {
      const isComp = (b.booking_status || '').toLowerCase() === 'completed';
      const isToday = b.completed_at?.startsWith(todayStr) || b.created_at?.startsWith(todayStr);
      return isComp && isToday;
    }).length;
  }, [bookings]);

  const grossRevenue = stats.revenue || 0;
  const incidentsCount = (sosAlerts.length || 0) + (securityMetrics?.criticalIncidents || 0);

  const stationChartData = useMemo(() => {
    const standardHubs = ['KZJ', 'BZA', 'SC', 'WL'];
    const hubMap = {
      KZJ: { name: 'KZJ', bookings: 0, revenue: 0 },
      BZA: { name: 'BZA', bookings: 0, revenue: 0 },
      SC: { name: 'SC', bookings: 0, revenue: 0 },
      WL: { name: 'WL', bookings: 0, revenue: 0 },
    };

    bookings.forEach((b) => {
      const st = (b.station_code || 'KZJ').toUpperCase();
      if (!hubMap[st]) {
        hubMap[st] = { name: st, bookings: 0, revenue: 0 };
      }
      hubMap[st].bookings += 1;
      if (b.payment_status === 'paid') {
        hubMap[st].revenue += Number(b.total_price) || 0;
      }
    });

    const result = standardHubs.map((h) => hubMap[h] || { name: h, bookings: 0, revenue: 0 });
    Object.keys(hubMap).forEach((st) => {
      if (!standardHubs.includes(st)) {
        result.push(hubMap[st]);
      }
    });
    return result;
  }, [bookings]);

  const statusChartData = useMemo(() => {
    const sourceBookings = selectedStationFilter === 'ALL'
      ? bookings
      : bookings.filter((b) => (b.station_code || '').toUpperCase() === selectedStationFilter);

    const counts = {
      PENDING: 0,
      ACCEPTED: 0,
      ARRIVING: 0,
      IN_SERVICE: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    };

    sourceBookings.forEach((b) => {
      const s = (b.booking_status || 'pending').toLowerCase();
      if (s === 'pending') counts.PENDING += 1;
      else if (s === 'accepted') counts.ACCEPTED += 1;
      else if (s === 'arriving') counts.ARRIVING += 1;
      else if (s === 'in_service') counts.IN_SERVICE += 1;
      else if (s === 'completed') counts.COMPLETED += 1;
      else if (s === 'cancelled') counts.CANCELLED += 1;
    });

    return [
      { name: 'PENDING', count: counts.PENDING, color: MISSION_STATUS_COLORS.PENDING },
      { name: 'ACCEPTED', count: counts.ACCEPTED, color: MISSION_STATUS_COLORS.ACCEPTED },
      { name: 'ARRIVING', count: counts.ARRIVING, color: MISSION_STATUS_COLORS.ARRIVING },
      { name: 'IN_SERVICE', count: counts.IN_SERVICE, color: MISSION_STATUS_COLORS.IN_SERVICE },
      { name: 'COMPLETED', count: counts.COMPLETED, color: MISSION_STATUS_COLORS.COMPLETED },
      { name: 'CANCELLED', count: counts.CANCELLED, color: MISSION_STATUS_COLORS.CANCELLED },
    ];
  }, [bookings, selectedStationFilter]);

  const recentBookings = useMemo(() => {
    return [...bookings]
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, 4);
  }, [bookings]);

  const formatTimeOnly = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const formatDateOnly = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const activeSahayaks = useMemo(() => {
    const list = Array.isArray(assistantsList) ? assistantsList : [];

    return list.slice(0, 4).map((ast) => {
      const activeCount = (bookings || []).filter(
        (b) => b.assistant_id === ast.id && (b.booking_status === 'accepted' || b.booking_status === 'arriving' || b.booking_status === 'in_service')
      ).length;

      const initials = (ast.name || 'S')
        .split(' ')
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

      let timeAgo = 'Offline';
      let timeAgoTooltip = 'No active sessions recorded';

      if (ast.is_online) {
        timeAgo = 'Active now';
        timeAgoTooltip = 'Online with active authenticated session';
      } else if (ast.closed_at) {
        const d = new Date(ast.closed_at);
        const diffMs = Date.now() - d.getTime();
        if (!isNaN(diffMs) && diffMs >= 0) {
          const diffSec = Math.floor(diffMs / 1000);
          const diffMin = Math.floor(diffSec / 60);
          const diffHours = Math.floor(diffMin / 60);
          const diffDays = Math.floor(diffHours / 24);

          if (diffSec < 60) {
            timeAgo = 'Just now';
          } else if (diffMin < 60) {
            timeAgo = `${diffMin}m ago`;
          } else if (diffHours < 24) {
            timeAgo = `${diffHours}h ago`;
          } else {
            timeAgo = `${diffDays}d ago`;
          }
          timeAgoTooltip = `Closed ${timeAgo}`;
        }
      } else if (ast.last_active_at) {
        const d = new Date(ast.last_active_at);
        const diffMs = Date.now() - d.getTime();
        if (!isNaN(diffMs) && diffMs >= 0) {
          const diffSec = Math.floor(diffMs / 1000);
          const diffMin = Math.floor(diffSec / 60);
          const diffHours = Math.floor(diffMin / 60);
          const diffDays = Math.floor(diffHours / 24);

          if (diffSec < 60) {
            timeAgo = 'Just now';
          } else if (diffMin < 60) {
            timeAgo = `${diffMin}m ago`;
          } else if (diffHours < 24) {
            timeAgo = `${diffHours}h ago`;
          } else {
            timeAgo = `${diffDays}d ago`;
          }
          timeAgoTooltip = `Last active ${timeAgo}`;
        }
      }

      return {
        ...ast,
        initials: initials || 'S',
        activeCount,
        timeAgo,
        timeAgoTooltip
      };
    });
  }, [assistantsList, bookings]);

  return (
    <div className="space-y-5 animate-fade-in select-none">
      
      {/* 1. PAGE HEADER ROW */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-900 dark:text-white font-sans">
            Operations & Analytics
          </h1>
          <p className="text-xs sm:text-[13px] text-zinc-500 dark:text-zinc-400 mt-1 font-medium">
            Live insights from railway operations, bookings, sahayaks, stations and passenger assistance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Date Selector Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setDateFilterOpen(!dateFilterOpen)}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-2 shadow-2xs hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-colors cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-zinc-500" />
              <span>{formattedToday}</span>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            </button>

            {dateFilterOpen && (
              <div
                className="absolute right-0 mt-1.5 w-44 bg-white dark:bg-[#0D111A] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl py-1 z-20 text-xs animate-scale-in"
                onClick={() => setDateFilterOpen(false)}
              >
                {[
                  { id: 'today', label: 'Today (Live)' },
                  { id: 'yesterday', label: 'Yesterday' },
                  { id: 'week', label: 'Last 7 Days' },
                  { id: 'month', label: 'This Month' },
                  { id: 'all', label: 'All Recorded Time' }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setCurrentDateFilter(opt.id);
                      if (setSelectedDateRange) {
                        setSelectedDateRange(opt.id === 'today' ? 'TODAY' : opt.id === 'week' ? 'WEEK' : 'ALL');
                      }
                    }}
                    className={`w-full text-left px-3 py-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/70 font-medium ${
                      currentDateFilter === opt.id ? 'text-blue-600 font-bold' : 'text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Vande Bharat Real-time Operations Banner Card */}
          <div className="hidden sm:flex items-center gap-3 px-3.5 py-1.5 rounded-2xl bg-gradient-to-r from-blue-50/80 via-white to-white dark:from-blue-950/30 dark:via-zinc-900 dark:to-zinc-900 border border-blue-100/90 dark:border-blue-900/40 shadow-2xs">
            <img
              src={trainImg}
              alt="Vande Bharat Train"
              className="h-9 w-auto object-contain rounded-lg shrink-0"
            />
            <div className="leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-zinc-900 dark:text-white">
                  Real-time Operations
                </span>
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              </div>
              <p className="text-[10.5px] text-zinc-500 dark:text-zinc-400 font-medium">
                for Smoother Journeys
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. SIX COMPACT KPI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-3.5">
        
        {/* Card 1: Total Bookings */}
        <div
          onClick={() => {
            setActiveTab('bookings');
            setSelectedStatus('ALL');
          }}
          className="bg-white dark:bg-[#0D111A] border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl p-3.5 sm:p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-md hover:border-blue-500/50 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
            <FileText className="w-4 h-4" />
          </div>
          <div className="mt-2.5">
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block tracking-tight">
              Total Bookings
            </span>
            <p className="text-2xl sm:text-[28px] font-black font-mono text-zinc-900 dark:text-white tracking-tight leading-none mt-1">
              {totalBookingsCount}
            </p>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              ↑ +12%
            </span>
            <svg className="w-10 h-4 text-blue-500 stroke-current fill-none stroke-2" viewBox="0 0 40 16">
              <path d="M0 12 Q 10 4, 20 10 T 40 3" />
            </svg>
          </div>
        </div>

        {/* Card 2: Pending Assignments */}
        <div
          onClick={() => {
            setActiveTab('bookings');
            setSelectedStatus('pending');
          }}
          className="bg-white dark:bg-[#0D111A] border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl p-3.5 sm:p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-md hover:border-amber-500/50 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
          <div className="mt-2.5">
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block tracking-tight">
              Pending Assignments
            </span>
            <p className="text-2xl sm:text-[28px] font-black font-mono text-zinc-900 dark:text-white tracking-tight leading-none mt-1">
              {pendingAssignmentsCount}
            </p>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[10.5px] font-bold text-amber-600 dark:text-amber-400 font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Needs attention
            </span>
            <svg className="w-10 h-4 text-amber-500 stroke-current fill-none stroke-2" viewBox="0 0 40 16">
              <path d="M0 10 Q 10 2, 20 8 T 40 4" />
            </svg>
          </div>
        </div>

        {/* Card 3: In Service */}
        <div
          onClick={() => {
            setActiveTab('bookings');
            setSelectedStatus('in_service');
          }}
          className="bg-white dark:bg-[#0D111A] border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl p-3.5 sm:p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-md hover:border-emerald-500/50 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
            <Train className="w-4 h-4" />
          </div>
          <div className="mt-2.5">
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block tracking-tight">
              In Service
            </span>
            <p className="text-2xl sm:text-[28px] font-black font-mono text-zinc-900 dark:text-white tracking-tight leading-none mt-1">
              {inServiceCount}
            </p>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[10.5px] font-bold text-blue-600 dark:text-blue-400 font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Live transit
            </span>
            <svg className="w-10 h-4 text-emerald-500 stroke-current fill-none stroke-2" viewBox="0 0 40 16">
              <path d="M0 14 Q 10 6, 20 12 T 40 4" />
            </svg>
          </div>
        </div>

        {/* Card 4: Completed Today */}
        <div
          onClick={() => {
            setActiveTab('bookings');
            setSelectedStatus('completed');
          }}
          className="bg-white dark:bg-[#0D111A] border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl p-3.5 sm:p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-md hover:border-indigo-500/50 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
            <CheckCircle className="w-4 h-4" />
          </div>
          <div className="mt-2.5">
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block tracking-tight">
              Completed Today
            </span>
            <p className="text-2xl sm:text-[28px] font-black font-mono text-zinc-900 dark:text-white tracking-tight leading-none mt-1">
              {completedTodayCount}
            </p>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[10.5px] font-bold text-zinc-400 font-mono">
              — 0%
            </span>
            <svg className="w-10 h-4 text-indigo-500 stroke-current fill-none stroke-2" viewBox="0 0 40 16">
              <path d="M0 10 Q 15 2, 25 12 T 40 6" />
            </svg>
          </div>
        </div>

        {/* Card 5: Gross Revenue */}
        <div
          onClick={() => {
            setActiveTab('bookings');
            setSelectedPaymentStatus('paid');
          }}
          className="bg-white dark:bg-[#0D111A] border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl p-3.5 sm:p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-md hover:border-blue-500/50 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
            <CreditCard className="w-4 h-4" />
          </div>
          <div className="mt-2.5">
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block tracking-tight">
              Gross Revenue
            </span>
            <p className="text-2xl sm:text-[28px] font-black font-mono text-zinc-900 dark:text-white tracking-tight leading-none mt-1">
              ₹{grossRevenue}
            </p>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[10.5px] font-bold text-zinc-400 font-mono">
              — 0%
            </span>
            <svg className="w-10 h-4 text-blue-500 stroke-current fill-none stroke-2" viewBox="0 0 40 16">
              <path d="M0 12 Q 10 4, 20 10 T 40 4" />
            </svg>
          </div>
        </div>

        {/* Card 6: Incidents */}
        <div
          onClick={() => setActiveTab('sos')}
          className="bg-white dark:bg-[#0D111A] border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl p-3.5 sm:p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-md hover:border-rose-500/50 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="mt-2.5">
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block tracking-tight">
              Incidents
            </span>
            <p className="text-2xl sm:text-[28px] font-black font-mono text-zinc-900 dark:text-white tracking-tight leading-none mt-1">
              {incidentsCount}
            </p>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              ↓ -100%
            </span>
            <svg className="w-10 h-4 text-rose-500 stroke-current fill-none stroke-2" viewBox="0 0 40 16">
              <path d="M0 8 Q 10 14, 20 8 T 40 14" />
            </svg>
          </div>
        </div>

      </div>

      {/* 3. TWO-COLUMN ANALYTICS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        
        {/* Left: Station Demand & Volume */}
        <div className="bg-white dark:bg-[#0D111A] border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl p-4 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-zinc-900 dark:text-white leading-tight">
                  Station Demand & Volume
                </h3>
                <p className="text-[11px] text-zinc-400 font-medium">
                  Booking volume across station hubs
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <select
                value={stationMetric}
                onChange={(e) => setStationMetric(e.target.value)}
                className="bg-[#F8FAFC] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-700 dark:text-zinc-300 font-medium focus:outline-none cursor-pointer"
              >
                <option value="bookings">Bookings</option>
                <option value="revenue">Revenue</option>
              </select>

              <select
                value={stationTimeRange}
                onChange={(e) => setStationTimeRange(e.target.value)}
                className="bg-[#F8FAFC] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-700 dark:text-zinc-300 font-medium focus:outline-none cursor-pointer"
              >
                <option value="7d">Last 7 days</option>
                <option value="today">Today</option>
                <option value="30d">This Month</option>
              </select>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('bookings');
                }}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="View in Ledger"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Vertical Bar Chart */}
          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stationChartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.12} />
                <XAxis
                  dataKey="name"
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#E2E8F0', strokeWidth: 1 }}
                />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(37, 99, 235, 0.04)' }}
                  contentStyle={{
                    backgroundColor: '#090D16',
                    borderColor: '#1E293B',
                    borderRadius: '10px',
                    color: '#ffffff',
                    fontSize: '11.5px',
                    fontFamily: 'monospace'
                  }}
                  formatter={(val, name) => [stationMetric === 'revenue' ? `₹${val}` : `${val} bookings`, name]}
                />
                <Bar
                  dataKey={stationMetric === 'revenue' ? 'revenue' : 'bookings'}
                  fill="#2563EB"
                  radius={[5, 5, 0, 0]}
                  maxBarSize={54}
                  label={{
                    position: 'top',
                    fill: '#64748B',
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: 'monospace'
                  }}
                  onClick={(entry) => {
                    if (entry?.name) {
                      setSelectedStation(entry.name);
                      setActiveTab('bookings');
                    }
                  }}
                  className="cursor-pointer"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Mission Status Distribution */}
        <div className="bg-white dark:bg-[#0D111A] border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl p-4 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 pb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-zinc-900 dark:text-white leading-tight">
                  Mission Status Distribution
                </h3>
                <p className="text-[11px] text-zinc-400 font-medium">
                  Current status of all assistance missions
                </p>
              </div>
            </div>

            <select
              value={selectedStationFilter}
              onChange={(e) => setSelectedStationFilter(e.target.value)}
              className="bg-[#F8FAFC] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-700 dark:text-zinc-300 font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Stations</option>
              <option value="KZJ">KZJ Hub</option>
              <option value="BZA">BZA Hub</option>
              <option value="SC">SC Hub</option>
              <option value="WL">WL Hub</option>
            </select>
          </div>

          {/* Horizontal Bar Chart */}
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={statusChartData}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.12} />
                <XAxis
                  type="number"
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#E2E8F0', strokeWidth: 1 }}
                  allowDecimals={false}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="#64748B"
                  fontSize={10.5}
                  tickLine={false}
                  axisLine={false}
                  width={85}
                  tick={{ fontWeight: 600, fontFamily: 'monospace' }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(37, 99, 235, 0.04)' }}
                  contentStyle={{
                    backgroundColor: '#090D16',
                    borderColor: '#1E293B',
                    borderRadius: '10px',
                    color: '#ffffff',
                    fontSize: '11.5px',
                    fontFamily: 'monospace'
                  }}
                  formatter={(val) => [`${val} missions`, 'Total']}
                />
                <Bar
                  dataKey="count"
                  background={{ fill: '#F1F5F9', radius: 4 }}
                  radius={[0, 4, 4, 0]}
                  barSize={14}
                  label={{
                    position: 'right',
                    fill: '#64748B',
                    fontSize: 10.5,
                    fontWeight: 700,
                    fontFamily: 'monospace'
                  }}
                  onClick={(entry) => {
                    if (entry?.name) {
                      setSelectedStatus(entry.name.toLowerCase());
                      setActiveTab('bookings');
                    }
                  }}
                  className="cursor-pointer"
                >
                  {statusChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* 4. THREE LOWER CONTENT CARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        
        {/* Column 1: Recent Bookings */}
        <div className="lg:col-span-5 bg-white dark:bg-[#0D111A] border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl p-4 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-white leading-tight">
                    Recent Bookings
                  </h3>
                  <p className="text-[11px] text-zinc-400 font-medium">
                    Latest booking requests
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('bookings');
                  setSelectedStatus('ALL');
                }}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* List of recent bookings */}
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 mt-1">
              {recentBookings.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-400 font-mono">
                  No recent bookings recorded.
                </div>
              ) : (
                recentBookings.map((b) => {
                  const rawStatus = (b.booking_status || 'pending').toLowerCase();
                  const badge = STATUS_BADGE_MAP[rawStatus] || STATUS_BADGE_MAP.pending;

                  return (
                    <div
                      key={b.id}
                      onClick={() => onSelectBooking && onSelectBooking(b)}
                      className="py-3 flex items-center justify-between gap-2 hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 rounded-xl px-2 -mx-2 transition-colors cursor-pointer group"
                    >
                      {/* Booking ID */}
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs shrink-0 group-hover:underline">
                        #{b.booking_id || b.id?.slice(-8).toUpperCase()}
                      </span>

                      {/* Passenger & Train */}
                      <div className="min-w-0 flex-1 px-2">
                        <p className="font-bold text-xs text-zinc-900 dark:text-white truncate leading-tight">
                          {b.passenger?.name || 'Guest Passenger'}
                        </p>
                        <p className="text-[10.5px] text-zinc-400 font-mono truncate leading-tight mt-0.5">
                          {b.train_no || b.train_number || '12722'} · {b.train_name || 'Dakshin Express'}
                        </p>
                      </div>

                      {/* Time & Date */}
                      <div className="text-right shrink-0 font-mono pr-1 hidden sm:block">
                        <p className="font-bold text-xs text-zinc-800 dark:text-zinc-200 leading-tight">
                          {formatTimeOnly(b.created_at)}
                        </p>
                        <p className="text-[10px] text-zinc-400 leading-tight mt-0.5">
                          {formatDateOnly(b.created_at)}
                        </p>
                      </div>

                      {/* Status pill + Chevron */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${badge.bg}`}>
                          {badge.label}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-blue-600 transition-colors" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Column 2: Sahayak Activity */}
        <div className="lg:col-span-4 bg-white dark:bg-[#0D111A] border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl p-4 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-white leading-tight">
                    Sahayak Activity
                  </h3>
                  <p className="text-[11px] text-zinc-400 font-medium">
                    Live assistant operations
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('assistants')}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* List of assistants */}
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 mt-1">
              {activeSahayaks.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-400 font-mono">
                  No sahayaks registered in fleet.
                </div>
              ) : (
                activeSahayaks.map((ast) => (
                  <div
                    key={ast.id}
                    onClick={() => setActiveTab('assistants')}
                    className="py-2.5 flex items-center justify-between gap-2 hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 rounded-xl px-2 -mx-2 transition-colors cursor-pointer group"
                  >
                    {/* Initial Avatar */}
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                      {ast.initials}
                    </div>

                    {/* Name & Station / Assignments */}
                    <div className="min-w-0 flex-1 px-1">
                      <p className="font-bold text-xs text-zinc-900 dark:text-white truncate leading-tight group-hover:text-blue-600 transition-colors">
                        {ast.name}
                      </p>
                      <p className="text-[10.5px] text-zinc-400 font-medium truncate leading-tight mt-0.5">
                        ● {ast.station_code || 'KZJ'} · {ast.activeCount > 0 ? `${ast.activeCount} active assignment${ast.activeCount > 1 ? 's' : ''}` : 'No active assignment'}
                      </p>
                    </div>

                    {/* Online / Idle Badge + Timestamp */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                          ast.activeCount > 0
                            ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400'
                            : ast.is_online
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400'
                        }`}
                      >
                        {ast.activeCount > 0 ? 'On Duty' : ast.is_online ? 'Online' : 'Idle ▾'}
                      </span>
                      <span
                        title={ast.timeAgoTooltip || ''}
                        className="text-[10px] text-zinc-400 font-mono hidden sm:inline-block cursor-default"
                      >
                        {ast.timeAgo}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-blue-600 transition-colors" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Column 3: System Health */}
        <div className="lg:col-span-3 bg-white dark:bg-[#0D111A] border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl p-4 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-zinc-900 dark:text-white leading-tight">
                  System Health
                </h3>
                <p className="text-[11px] text-zinc-400 font-medium">
                  Live platform status
                </p>
              </div>
            </div>

            {/* List of system services */}
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 mt-1">
              {[
                { name: 'SCR Telemetry', status: 'Active ➔', dot: 'bg-emerald-500 animate-pulse' },
                { name: 'API Services', status: 'Operational', dot: 'bg-emerald-500' },
                { name: 'Database', status: 'Operational', dot: 'bg-emerald-500' },
                { name: 'Real-time Sync', status: 'Active ➔', dot: 'bg-emerald-500 animate-pulse' },
                { name: 'File Storage', status: 'Operational', dot: 'bg-emerald-500' },
                { name: 'Notification Service', status: 'Operational', dot: 'bg-emerald-500' }
              ].map((svc) => (
                <div
                  key={svc.name}
                  className="py-2 flex items-center justify-between gap-2 text-xs font-mono"
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${svc.dot}`} />
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">
                      {svc.name}
                    </span>
                  </div>

                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-900/60">
                    {svc.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

/* ============================================================
   DEFAULT EXPORT BUNDLE
   ============================================================ */

export default {
  AdminSidebar,
  AdminTopHeader,
  KpiCard,
  BookingFilterToolbar,
  BookingTabs,
  BookingTable,
  BookingDrawer,
  BookingDetailModal,
  OperationsAnalyticsView,
};
