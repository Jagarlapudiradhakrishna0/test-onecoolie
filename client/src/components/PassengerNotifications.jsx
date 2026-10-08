import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Bell,
  Train,
  Luggage,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  Check,
  X,
  Sparkles,
  MapPin,
  Info,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

/* ============================================================
   ONECOOLIE PASSENGER NOTIFICATIONS — Real-Time Travel Alerts
   Swiss Minimalist Luxury Design with DB-Backed Read State
   ============================================================ */

export default function PassengerNotifications({
  bookings = [],
  activeBookings = [],
  onNavigateTab,
  className = '',
  buttonClassName = '',
}) {
  const navigate = useNavigate();
  const { t } = useLanguage();
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

  // Close dropdown on outside click
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

  // Build notifications feed with deterministic and stable IDs
  const notificationsList = useMemo(() => {
    const list = [];
    const seenIds = new Set();

    // 1. Backend Database Notifications (Authoritative source of truth)
    if (Array.isArray(dbNotifications) && dbNotifications.length > 0) {
      dbNotifications.forEach((bn) => {
        if (!bn || bn.is_dismissed) return;
        seenIds.add(bn.id);

        const isSos = bn.type === 'sos';
        const isBooking = bn.type === 'booking';

        list.push({
          id: bn.id,
          dbId: bn.id,
          bookingId: bn.booking_id,
          type: bn.type || 'info',
          urgency: isSos ? 'high' : 'normal',
          title: bn.title || 'Notification',
          description: bn.message || '',
          badge: bn.type ? bn.type.toUpperCase() : 'Notice',
          badgeStyle: isSos
            ? 'bg-rose-100 text-rose-800 border-rose-200'
            : 'bg-slate-100 text-zinc-800 border-slate-200',
          icon: isSos ? Info : isBooking ? Train : Bell,
          iconBg: isSos ? 'bg-rose-600 text-white' : 'bg-black text-white',
          time: bn.created_at
            ? new Date(bn.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : 'Recent',
          is_read: Boolean(bn.is_read),
        });
      });
    }

    // 2. Active In-Progress / Upcoming Bookings
    if (activeBookings && activeBookings.length > 0) {
      activeBookings.forEach((b) => {
        if (!b) return;
        const bId = b.id || b.booking_id || b._id || '';
        const stableId = bId ? `active-${bId}` : `active-${b.train_no || 'train'}-${b.journey_date || 'date'}`;
        if (seenIds.has(stableId)) return;
        seenIds.add(stableId);

        const rawStatus = String(b.booking_status || b.status || '').toLowerCase();
        const isAssigned = Boolean(
          b.assistant_id ||
          b.assistant ||
          ['assigned', 'accepted', 'arriving', 'in_service', 'reached'].includes(rawStatus)
        );

        list.push({
          id: stableId,
          bookingId: bId,
          booking: b,
          type: 'active',
          urgency: 'high',
          title: isAssigned
            ? `Assistant En Route · Train ${b.train_no || 'Express'}`
            : `Booking Active · Train ${b.train_no || 'Express'}`,
          description: isAssigned
            ? `Porter assigned for Coach ${b.coach || 'TBD'}, Seat ${b.seat_number || 'TBD'}. Meeting at platform.`
            : `Assistance scheduled at ${b.station_code || 'station'}. A licensed assistant will be assigned shortly.`,
          badge: isAssigned ? 'Assigned' : 'Scheduled',
          badgeStyle: isAssigned
            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
            : 'bg-blue-100 text-blue-800 border-blue-200',
          icon: isAssigned ? Luggage : Train,
          iconBg: isAssigned ? 'bg-emerald-600 text-white' : 'bg-black text-white',
          time: b.journey_time ? `Arrival: ${b.journey_time}` : 'Today',
          is_read: true,
        });
      });
    }

    // 3. Platform & Security Essential Notices
    list.push({
      id: 'tip-otp-security',
      type: 'tip',
      urgency: 'normal',
      title: 'Safe Journey: OTP Verification',
      description: 'Share your 6-digit verification code with your assistant only after meeting in person at the coach.',
      badge: 'Security',
      badgeStyle: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: ShieldCheck,
      iconBg: 'bg-emerald-600 text-white',
      time: 'Safety Tip',
      is_read: true,
    });

    list.push({
      id: 'tip-helpline-support',
      type: 'tip',
      urgency: 'normal',
      title: '24/7 Platform Helpline Active',
      description: 'Need urgent station assistance or coach guidance? Dial Railway Helpline 139 or contact OneCoolie support.',
      badge: 'Help',
      badgeStyle: 'bg-slate-100 text-zinc-700 border-slate-200',
      icon: Info,
      iconBg: 'bg-black text-white',
      time: '24/7',
      is_read: true,
    });

    return list;
  }, [dbNotifications, activeBookings]);

  const visibleNotifications = notificationsList;

  // Unread count authoritatively driven by database notifications
  const unreadCount = dbUnreadCount;

  const handleMarkAllRead = (e) => {
    e.stopPropagation();
    markAllAsRead();
  };

  const handleDismiss = (id, e) => {
    e.stopPropagation();
    if (id && typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id)) {
      dismissNotification(id);
    }
  };

  const handleItemClick = (item) => {
    // When viewed, mark this notification as read in database
    if (item.dbId && !item.is_read) {
      markAsRead(item.dbId);
    }
    setOpen(false);

    if (item.bookingId) {
      if (item.booking) {
        navigate(`/booking/${item.bookingId}`, { state: { booking: item.booking } });
      } else {
        onNavigateTab?.('trips');
      }
    } else {
      onNavigateTab?.('trips');
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        id="passenger-notification-bell-btn"
        onClick={() => setOpen((prev) => !prev)}
        className={`relative p-2.5 rounded-2xl transition-all duration-200 cursor-pointer ${
          open
            ? 'bg-zinc-900 text-white shadow-md'
            : 'bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200/80 shadow-xs'
        } ${buttonClassName}`}
        aria-label="Travel notifications and alerts"
        aria-expanded={open}
      >
        <Bell size={18} className="transition-transform group-hover:scale-105" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex items-center justify-center rounded-full h-4 min-w-[16px] px-1 bg-rose-600 text-[10px] font-black text-white ring-2 ring-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </span>
        )}
      </button>

      {/* Backdrop for Mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-xs z-40 sm:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Dropdown Flyout */}
      {open && (
        <div className="fixed inset-x-3 top-[68px] sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2.5 w-auto sm:w-[410px] max-w-[calc(100vw-24px)] bg-white border border-zinc-200/90 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] p-4 sm:p-5 z-50 text-zinc-900 animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-zinc-100 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-xs shadow-xs">
                <Bell size={14} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-sm sm:text-base tracking-tight text-zinc-900">
                    Travel Alerts
                  </h3>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-200">
                      {unreadCount} New
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-500 font-medium">
                  Real-time journey updates & platform advisories
                </p>
              </div>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                id="passenger-notif-mark-all-read"
                onClick={handleMarkAllRead}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-blue-50"
              >
                <Check size={12} />
                <span>Mark read</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-200">
            {visibleNotifications.length === 0 ? (
              <div className="py-8 text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 mb-2.5">
                  <CheckCircle2 size={22} className="text-emerald-500" />
                </div>
                <p className="text-xs font-bold text-zinc-800">All caught up</p>
                <p className="text-[11px] text-zinc-500 mt-0.5 max-w-[220px] mx-auto">
                  No active journey alerts. Safe travels!
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
                    className={`w-full flex items-start gap-3 p-3 rounded-2xl text-left transition-all cursor-pointer group ${
                      isUnread
                        ? 'bg-blue-50/70 hover:bg-blue-100/70 border border-blue-200/60'
                        : 'hover:bg-zinc-50 border border-transparent opacity-85'
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
                        <p className={`text-xs truncate ${isUnread ? 'font-bold text-zinc-900' : 'font-medium text-zinc-600'}`}>
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
                              onClick={(e) => handleDismiss(item.id, e)}
                              className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-zinc-400 hover:text-zinc-700 transition-opacity cursor-pointer"
                              title="Dismiss alert"
                              aria-label="Dismiss alert"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-[11px] text-zinc-600 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>

                      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-zinc-100">
                        <span className="text-[10px] text-zinc-500 font-medium flex items-center gap-1">
                          <Clock size={10} />
                          {item.time}
                        </span>
                        <span className="text-[10px] font-bold text-zinc-900 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                          View details <ArrowRight size={10} />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="pt-3 mt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Railway Assistance</span>
            </div>

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onNavigateTab?.('trips');
              }}
              className="font-bold text-zinc-900 hover:underline flex items-center gap-1 cursor-pointer text-[11px]"
            >
              My Bookings <ArrowRight size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
