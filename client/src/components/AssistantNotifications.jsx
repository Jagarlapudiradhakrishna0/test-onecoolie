import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Bell,
  Luggage,
  Briefcase,
  Star,
  ShieldCheck,
  CheckCircle2,
  PhoneCall,
  ArrowRight,
  Clock,
  Sparkles,
  Check,
  Radio,
  X,
  AlertTriangle,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

/* ============================================================
   ONECOOLIE ASSISTANT NOTIFICATIONS — Dispatch & Duty Alerts
   Apple / Uber-Style Ops Alert Center with DB-Backed Read State
   ============================================================ */

export default function AssistantNotifications({
  requests = [],
  activeJobs = [],
  ratedJobs = [],
  online = false,
  station = 'KZJ',
  stationName = 'Kazipet Junction',
  onNavigate,
}) {
  const { lang, t } = useLanguage();
  const { user } = useAuth();
  const {
    notifications: dbNotifications,
    unreadCount: dbUnreadCount,
    markAsRead,
    markAllAsRead,
    dismissNotification,
  } = useNotifications();

  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Build unified notifications list
  const notificationsList = useMemo(() => {
    const list = [];
    const seenIds = new Set();

    // 1. Database Notifications (Official persistent source of truth)
    if (Array.isArray(dbNotifications) && dbNotifications.length > 0) {
      dbNotifications
        .filter((n) => !n.is_dismissed)
        .forEach((n) => {
          seenIds.add(n.id);
          const isReq = n.type === 'request';
          const isJob = n.type === 'job_completed';
          const isRating = n.type === 'rating';
          const isSos = n.type === 'sos';

          let icon = Luggage;
          let iconBg = 'bg-blue-600 text-white';
          let tab = 'dashboard';
          let badge = 'Alert';
          let badgeStyle = 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800';

          if (isReq) {
            icon = Luggage;
            iconBg = 'bg-blue-600 text-white';
            tab = 'dashboard';
            badge = 'Dispatch';
          } else if (isJob) {
            icon = CheckCircle2;
            iconBg = 'bg-emerald-600 text-white';
            tab = 'history';
            badge = 'Completed';
            badgeStyle = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
          } else if (isRating) {
            icon = Star;
            iconBg = 'bg-amber-500 text-white';
            tab = 'earnings';
            badge = 'Review';
            badgeStyle = 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800';
          } else if (isSos) {
            icon = AlertTriangle;
            iconBg = 'bg-rose-600 text-white';
            tab = 'dashboard';
            badge = 'SOS';
            badgeStyle = 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 border-rose-200 dark:border-rose-800';
          }

          list.push({
            id: n.id,
            dbId: n.id,
            type: n.type || 'info',
            urgency: isReq || isSos ? 'high' : 'normal',
            title: n.title,
            description: n.message,
            badge,
            badgeStyle,
            icon,
            iconBg,
            time: n.created_at ? new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent',
            tab,
            is_read: Boolean(n.is_read),
          });
        });
    }

    // 2. Active Jobs In-Progress (Live operational context)
    if (activeJobs && activeJobs.length > 0) {
      activeJobs.forEach((job, idx) => {
        const jobId = `active-job-${job.id || idx}`;
        if (seenIds.has(jobId)) return;
        seenIds.add(jobId);

        const coach = job.coach_position || job.coach || 'Coach';
        const pf = job.platform_number || job.platform || '1';
        const statusLabel =
          job.booking_status === 'confirmed'
            ? 'Awaiting OTP'
            : job.booking_status === 'in_progress'
              ? 'In Service'
              : 'Active';

        list.push({
          id: jobId,
          type: 'job',
          urgency: 'active',
          title: `Active Job: ${job.passenger_name || 'Passenger'}`,
          description: `Coach ${coach} · Platform ${pf} · ${statusLabel}`,
          badge: statusLabel,
          badgeStyle: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
          icon: Briefcase,
          iconBg: 'bg-emerald-600 text-white',
          time: 'Active Duty',
          tab: 'jobs',
          is_read: true,
        });
      });
    }

    // 3. Station Duty Status
    list.push({
      id: 'duty-status',
      type: 'status',
      urgency: 'status',
      title: online ? `On Duty: ${station}` : `Off Duty: ${station}`,
      description: online
        ? `Receiving passenger requests at ${stationName}.`
        : `Go On Duty to receive platform dispatch alerts.`,
      badge: online ? 'Live Radar' : 'Offline',
      badgeStyle: online
        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
        : 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400 border-slate-200 dark:border-zinc-700',
      icon: ShieldCheck,
      iconBg: online ? 'bg-black text-white dark:bg-zinc-800' : 'bg-slate-400 text-white',
      time: online ? 'Active' : 'Standby',
      tab: 'profile',
      is_read: true,
    });

    // 4. Emergency Helpline Support
    list.push({
      id: 'railway-safety',
      type: 'helpline',
      urgency: 'support',
      title: 'Railway Helpline & Safety',
      description: 'Dial 139 for Railway Passenger Care · Dial 112 for Police Emergency.',
      badge: '24x7 Help',
      badgeStyle: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 border-rose-200 dark:border-rose-800',
      icon: PhoneCall,
      iconBg: 'bg-rose-600 text-white',
      time: 'Support',
      action: () => {
        window.location.href = 'tel:139';
      },
      is_read: true,
    });

    return list;
  }, [dbNotifications, activeJobs, online, station, stationName]);

  const visibleNotifications = notificationsList;

  const visibleRequestsCount = visibleNotifications.filter(
    (n) => n.type === 'request' && !n.is_read
  ).length;

  // Unread badge count derived authoritatively from database notifications
  const unreadCount = dbUnreadCount;

  const handleDismissItem = (item) => {
    if (item.dbId) {
      dismissNotification(item.dbId);
    }
  };

  const handleMarkAllRead = () => {
    markAllAsRead();
  };

  const handleItemClick = (item) => {
    // Mark as read in database
    if (item.dbId && !item.is_read) {
      markAsRead(item.dbId);
    }

    if (item.action) {
      item.action();
    } else if (item.tab) {
      onNavigate?.(item.tab);
      if (item.tab === 'dashboard') {
        setTimeout(() => {
          document.getElementById('available-requests-section')?.scrollIntoView({ behavior: 'smooth' });
        }, 120);
      }
    }
    setOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`relative p-2.5 rounded-full transition-all cursor-pointer ${open
          ? 'bg-slate-100 dark:bg-zinc-800 text-black dark:text-white ring-2 ring-blue-500/20'
          : 'hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300'
          }`}
        title="Notifications & Duty Alerts"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#2563EB] ring-2 ring-white dark:ring-black" />
          </span>
        )}
      </button>

      {/* Mobile Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/25 z-40 sm:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Flyout Popover */}
      {open && (
        <div className="fixed inset-x-3 top-[68px] sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2.5 w-auto sm:w-96 max-w-lg bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] p-4 sm:p-5 z-50 text-zinc-900 dark:text-white animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-zinc-800/80 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold text-xs shadow-xs">
                <Bell size={14} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-sm sm:text-base tracking-tight text-zinc-900 dark:text-white">
                    {t('notificationsTitle')}
                  </h3>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#2563EB] text-white">
                      {unreadCount} {t('unread') || 'New'}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400 font-medium">
                  {t('notificationsSub')}
                </p>
              </div>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 cursor-pointer flex items-center gap-1 transition-colors"
              >
                <Check size={12} />
                <span>{t('markAllRead')}</span>
              </button>
            )}
          </div>

          {/* Notifications Scrollable List */}
          <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-zinc-800">
            {visibleNotifications.length === 0 ? (
              <div className="py-8 text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-400 mb-2.5">
                  <CheckCircle2 size={22} className="text-emerald-500" />
                </div>
                <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  {t('allCaughtUp')}
                </p>
                <p className="text-[11px] text-zinc-400 mt-0.5 max-w-[220px] mx-auto">
                  {t('noPendingAlerts')}
                </p>
              </div>
            ) : (
              visibleNotifications.map((item) => {
                const IconComponent = item.icon;
                const isUnread = !item.is_read;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    role="button"
                    tabIndex={0}
                    className={`w-full flex items-start gap-3 p-3 rounded-2xl text-left transition-all cursor-pointer group ${isUnread
                      ? 'bg-blue-50/70 dark:bg-blue-950/20 hover:bg-blue-100/70 dark:hover:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/40'
                      : 'hover:bg-slate-50 dark:hover:bg-zinc-800/50 border border-transparent opacity-80'
                      }`}
                  >
                    {/* Icon */}
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-xs ${item.iconBg}`}
                    >
                      <IconComponent size={16} />
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1.5 mb-1">
                        <p className={`text-xs truncate ${isUnread ? 'font-bold text-zinc-900 dark:text-zinc-100' : 'font-medium text-zinc-600 dark:text-zinc-400'}`}>
                          {item.title}
                        </p>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border uppercase tracking-wider ${item.badgeStyle}`}
                          >
                            {item.badge}
                          </span>
                          {item.dbId && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDismissItem(item);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-opacity cursor-pointer"
                              title="Dismiss from list"
                              aria-label="Dismiss from list"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-[11px] text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>

                      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100/60 dark:border-zinc-800/60">
                        <span className="text-[10px] text-zinc-400 font-medium flex items-center gap-1">
                          <Clock size={10} />
                          {item.time}
                        </span>
                        <span className="text-[10px] font-bold text-[#2563EB] dark:text-blue-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                          Open <ArrowRight size={10} />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom Action Footer */}
          <div className="pt-3 mt-3 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
              <span
                className={`w-2 h-2 rounded-full ${online ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                  }`}
              />
              <span>{station} {t('stationRadar')}</span>
            </div>

            {visibleRequestsCount > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onNavigate?.('dashboard');
                  setTimeout(() => {
                    document.getElementById('available-requests-section')?.scrollIntoView({ behavior: 'smooth' });
                  }, 120);
                }}
                className="font-bold text-[#2563EB] dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer text-[11px]"
              >
                {t('availableRequests')} ({visibleRequestsCount}) <ArrowRight size={12} />
              </button>
            ) : activeJobs.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onNavigate?.('jobs');
                }}
                className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer text-[11px]"
              >
                {t('myAssignedJob')} <ArrowRight size={12} />
              </button>
            ) : (
              <span className="text-[11px] text-zinc-400 font-mono">
                {t('onDuty')}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
