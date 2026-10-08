import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from '../api/axios';
import { useAuth } from './AuthContext';

export const NotificationContext = createContext({
  notifications: [],
  unreadCount: 0,
  unreadByType: {},
  loading: false,
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  markReadByType: async () => {},
  dismissNotification: async () => {},
  clearAll: async () => {},
  refreshNotifications: async () => {},
});

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadByType, setUnreadByType] = useState({});
  const [loading, setLoading] = useState(false);
  const isFetchingRef = useRef(false);

  const calculateCounts = useCallback((list) => {
    const unread = list.filter((n) => !n.is_read && !n.is_dismissed);
    const byType = {};
    unread.forEach((n) => {
      const t = n.type || 'info';
      byType[t] = (byType[t] || 0) + 1;
    });
    return {
      total: unread.length,
      byType,
    };
  }, []);

  const fetchNotifications = useCallback(async (isSilent = false) => {
    if (!user?.id) {
      setNotifications([]);
      setUnreadCount(0);
      setUnreadByType({});
      return;
    }

    if (isFetchingRef.current && isSilent) return;
    isFetchingRef.current = true;
    if (!isSilent) setLoading(true);

    try {
      const res = await axios.get('/notifications');
      if (res.data?.success) {
        const notifs = res.data.notifications || [];
        setNotifications(notifs);
        const { total, byType } = calculateCounts(notifs);
        setUnreadCount(res.data.unreadCount ?? total);
        setUnreadByType(res.data.unreadByType ?? byType);
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('[NOTIFICATIONS] Error loading notifications:', err?.message);
      }
    } finally {
      isFetchingRef.current = false;
      if (!isSilent) setLoading(false);
    }
  }, [user?.id, calculateCounts]);

  // Initial fetch and user switch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time socket listener
  useEffect(() => {
    if (!window.socket || !user?.id) return;

    const handleNewNotification = (newNotif) => {
      if (!newNotif) return;
      // Ensure it belongs to this user or is broadcast for this role
      if (newNotif.user_id && newNotif.user_id !== user.id) return;
      if (newNotif.target_role && newNotif.target_role !== user.role && user.role !== 'admin') return;

      setNotifications((prev) => {
        // Prevent duplicate
        if (prev.some((n) => n.id === newNotif.id)) return prev;
        const updated = [newNotif, ...prev];
        const { total, byType } = calculateCounts(updated);
        setUnreadCount(total);
        setUnreadByType(byType);
        return updated;
      });
    };

    const handleNotificationRead = ({ id }) => {
      if (!id) return;
      setNotifications((prev) => {
        const updated = prev.map((n) =>
          n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
        );
        const { total, byType } = calculateCounts(updated);
        setUnreadCount(total);
        setUnreadByType(byType);
        return updated;
      });
    };

    const handleAllRead = () => {
      setNotifications((prev) => {
        const now = new Date().toISOString();
        const updated = prev.map((n) => ({ ...n, is_read: true, read_at: now }));
        setUnreadCount(0);
        setUnreadByType({});
        return updated;
      });
    };

    const handleTypeRead = ({ type }) => {
      if (!type) return;
      setNotifications((prev) => {
        const now = new Date().toISOString();
        const updated = prev.map((n) =>
          n.type === type ? { ...n, is_read: true, read_at: now } : n
        );
        const { total, byType } = calculateCounts(updated);
        setUnreadCount(total);
        setUnreadByType(byType);
        return updated;
      });
    };

    const handleDismissed = ({ id }) => {
      if (!id) return;
      setNotifications((prev) => {
        const updated = prev.map((n) =>
          n.id === id ? { ...n, is_dismissed: true, read_at: n.read_at || new Date().toISOString() } : n
        );
        const { total, byType } = calculateCounts(updated);
        setUnreadCount(total);
        setUnreadByType(byType);
        return updated;
      });
    };

    window.socket.on('notification_new', handleNewNotification);
    window.socket.on('notification_read', handleNotificationRead);
    window.socket.on('notifications_all_read', handleAllRead);
    window.socket.on('notifications_type_read', handleTypeRead);
    window.socket.on('notification_dismissed', handleDismissed);

    return () => {
      window.socket.off('notification_new', handleNewNotification);
      window.socket.off('notification_read', handleNotificationRead);
      window.socket.off('notifications_all_read', handleAllRead);
      window.socket.off('notifications_type_read', handleTypeRead);
      window.socket.off('notification_dismissed', handleDismissed);
    };
  }, [user?.id, user?.role, calculateCounts]);

  const markAsRead = useCallback(async (id) => {
    if (!id) return;
    // Optimistic local update
    setNotifications((prev) => {
      const updated = prev.map((n) =>
        n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
      );
      const { total, byType } = calculateCounts(updated);
      setUnreadCount(total);
      setUnreadByType(byType);
      return updated;
    });

    try {
      await axios.patch(`/notifications/${id}/read`);
    } catch {
      // Fallback: try POST
      try {
        await axios.post(`/notifications/${id}/read`);
      } catch (err) {
        if (import.meta.env.DEV) {
          console.warn('[NOTIFICATIONS] Failed to mark read on server:', err?.message);
        }
      }
    }
  }, [calculateCounts]);

  const markAllAsRead = useCallback(async () => {
    const now = new Date().toISOString();
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, is_read: true, read_at: now }));
      return updated;
    });
    setUnreadCount(0);
    setUnreadByType({});

    try {
      await axios.post('/notifications/read-all');
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('[NOTIFICATIONS] Failed to mark all read on server:', err?.message);
      }
    }
  }, []);

  const markReadByType = useCallback(async (type) => {
    if (!type) return;
    const now = new Date().toISOString();
    setNotifications((prev) => {
      const updated = prev.map((n) =>
        n.type === type ? { ...n, is_read: true, read_at: now } : n
      );
      const { total, byType } = calculateCounts(updated);
      setUnreadCount(total);
      setUnreadByType(byType);
      return updated;
    });

    try {
      await axios.post('/notifications/read-by-type', { type });
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('[NOTIFICATIONS] Failed to mark type read on server:', err?.message);
      }
    }
  }, [calculateCounts]);

  const dismissNotification = useCallback(async (id) => {
    if (!id) return;
    setNotifications((prev) => {
      const updated = prev.map((n) =>
        n.id === id ? { ...n, is_dismissed: true, read_at: n.read_at || new Date().toISOString() } : n
      );
      const { total, byType } = calculateCounts(updated);
      setUnreadCount(total);
      setUnreadByType(byType);
      return updated;
    });

    try {
      await axios.patch(`/notifications/${id}/dismiss`);
    } catch {
      try {
        await axios.post(`/notifications/${id}/dismiss`);
      } catch (err) {
        if (import.meta.env.DEV) {
          console.warn('[NOTIFICATIONS] Failed to dismiss notification on server:', err?.message);
        }
      }
    }
  }, [calculateCounts]);

  const clearAll = useCallback(async () => {
    setNotifications([]);
    setUnreadCount(0);
    setUnreadByType({});

    try {
      await axios.post('/notifications/clear-all');
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('[NOTIFICATIONS] Failed to clear all on server:', err?.message);
      }
    }
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        unreadByType,
        loading,
        markAsRead,
        markAllAsRead,
        markReadByType,
        dismissNotification,
        clearAll,
        refreshNotifications: () => fetchNotifications(false),
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
