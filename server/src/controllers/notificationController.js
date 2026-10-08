const supabase = require('../config/db');
const { syncUserNotifications } = require('../services/notificationService');

/**
 * GET /api/notifications
 * Retrieves active notifications for the authenticated user with authoritative unread counts.
 */
exports.getMyNotifications = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.id) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const userId = user.id;

    // Synchronize historical/pending events for this user if needed
    try {
      await syncUserNotifications(user);
    } catch (syncErr) {
      console.warn('[NOTIFICATIONS] Sync warning:', syncErr);
    }

    // Query active non-dismissed notifications for user
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('is_dismissed', false)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[NOTIFICATIONS] Error fetching notifications:', error);
      return res.status(500).json({ message: 'Failed to load notifications.' });
    }

    const list = notifications || [];

    // Calculate unread count and breakdowns by notification type
    const unreadCount = list.filter((n) => !n.is_read).length;
    const unreadByType = {};
    list.forEach((n) => {
      if (!n.is_read) {
        const t = n.type || 'info';
        unreadByType[t] = (unreadByType[t] || 0) + 1;
      }
    });

    return res.status(200).json({
      success: true,
      notifications: list,
      unreadCount,
      unreadByType
    });
  } catch (err) {
    console.error('[NOTIFICATIONS] Unexpected error in getMyNotifications:', err);
    return res.status(500).json({ message: 'Server error while loading notifications.' });
  }
};

/**
 * PATCH /api/notifications/:id/read
 * Marks a specific notification as read in the database for the authenticated user.
 */
exports.markAsRead = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    if (!id) {
      return res.status(400).json({ message: 'Notification ID is required.' });
    }

    const nowIso = new Date().toISOString();

    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: nowIso
      })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('[NOTIFICATIONS] Error marking as read:', error);
      return res.status(500).json({ message: 'Failed to update notification.' });
    }

    // Real-time broadcast to user's devices
    if (global.io) {
      global.io.to(`user_${userId}`).emit('notification_read', { id, read_at: nowIso });
    }

    return res.status(200).json({ success: true, message: 'Notification marked as read.' });
  } catch (err) {
    console.error('[NOTIFICATIONS] Unexpected error in markAsRead:', err);
    return res.status(500).json({ message: 'Server error while updating notification.' });
  }
};

/**
 * PATCH /api/notifications/read-all
 * POST /api/notifications/read-all
 * Marks all unread notifications as read for the authenticated user.
 */
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const nowIso = new Date().toISOString();

    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: nowIso
      })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('[NOTIFICATIONS] Error marking all as read:', error);
      return res.status(500).json({ message: 'Failed to mark notifications as read.' });
    }

    // Real-time broadcast
    if (global.io) {
      global.io.to(`user_${userId}`).emit('notifications_all_read', { read_at: nowIso });
      global.io.to(`user_${userId}`).emit('all_notifications_read', { read_at: nowIso });
    }

    return res.status(200).json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    console.error('[NOTIFICATIONS] Unexpected error in markAllAsRead:', err);
    return res.status(500).json({ message: 'Server error while updating notifications.' });
  }
};

/**
 * PATCH /api/notifications/read-by-type
 * POST /api/notifications/read-by-type
 * Marks all notifications of a specific type as read for the authenticated user.
 * (e.g. When assistant opens Trip History -> marks 'job_completed', Earnings -> 'rating', Dashboard -> 'request')
 */
exports.markReadByType = async (req, res) => {
  try {
    const userId = req.user?.id;
    const type = req.body?.type || req.query?.type;

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    if (!type) {
      return res.status(400).json({ message: 'Notification type is required.' });
    }

    const nowIso = new Date().toISOString();

    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: nowIso
      })
      .eq('user_id', userId)
      .eq('type', type)
      .eq('is_read', false);

    if (error) {
      console.error(`[NOTIFICATIONS] Error marking type '${type}' as read:`, error);
      return res.status(500).json({ message: 'Failed to update notifications.' });
    }

    // Real-time broadcast
    if (global.io) {
      global.io.to(`user_${userId}`).emit('notifications_type_read', { type, read_at: nowIso });
      global.io.to(`user_${userId}`).emit('notifications_read_by_type', { type, read_at: nowIso });
    }

    return res.status(200).json({ success: true, message: `All ${type} notifications marked as read.` });
  } catch (err) {
    console.error('[NOTIFICATIONS] Unexpected error in markReadByType:', err);
    return res.status(500).json({ message: 'Server error while updating notifications.' });
  }
};

/**
 * PATCH /api/notifications/:id/dismiss
 * Dismisses a specific notification.
 */
exports.dismissNotification = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    if (!id) {
      return res.status(400).json({ message: 'Notification ID is required.' });
    }

    const { error } = await supabase
      .from('notifications')
      .update({ is_dismissed: true })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('[NOTIFICATIONS] Error dismissing notification:', error);
      return res.status(500).json({ message: 'Failed to dismiss notification.' });
    }

    if (global.io) {
      global.io.to(`user_${userId}`).emit('notification_dismissed', { id });
    }

    return res.status(200).json({ success: true, message: 'Notification dismissed.' });
  } catch (err) {
    console.error('[NOTIFICATIONS] Unexpected error in dismissNotification:', err);
    return res.status(500).json({ message: 'Server error while dismissing notification.' });
  }
};

/**
 * POST /api/notifications/clear-all
 * Dismisses and marks as read all notifications for the authenticated user.
 */
exports.clearAllNotifications = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const nowIso = new Date().toISOString();

    const { error } = await supabase
      .from('notifications')
      .update({
        is_dismissed: true,
        is_read: true,
        read_at: nowIso
      })
      .eq('user_id', userId);

    if (error) {
      console.error('[NOTIFICATIONS] Error clearing all notifications:', error);
      return res.status(500).json({ message: 'Failed to clear notifications.' });
    }

    if (global.io) {
      global.io.to(`user_${userId}`).emit('all_notifications_cleared', { cleared_at: nowIso });
    }

    return res.status(200).json({ success: true, message: 'All notifications cleared.' });
  } catch (err) {
    console.error('[NOTIFICATIONS] Unexpected error in clearAllNotifications:', err);
    return res.status(500).json({ message: 'Server error while clearing notifications.' });
  }
};
