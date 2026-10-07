const supabase = require('../config/db');

/**
 * GET /api/notifications
 * Retrieves active notifications for the authenticated user.
 */
exports.getMyNotifications = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

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

    return res.status(200).json({
      success: true,
      notifications: notifications || []
    });
  } catch (err) {
    console.error('[NOTIFICATIONS] Unexpected error in getMyNotifications:', err);
    return res.status(500).json({ message: 'Server error while loading notifications.' });
  }
};

/**
 * PATCH /api/notifications/:id/read
 * Marks a specific notification as read.
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

    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('[NOTIFICATIONS] Error marking as read:', error);
      return res.status(500).json({ message: 'Failed to update notification.' });
    }

    return res.status(200).json({ success: true, message: 'Notification marked as read.' });
  } catch (err) {
    console.error('[NOTIFICATIONS] Unexpected error in markAsRead:', err);
    return res.status(500).json({ message: 'Server error while updating notification.' });
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

    const { error } = await supabase
      .from('notifications')
      .update({
        is_dismissed: true,
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (error) {
      console.error('[NOTIFICATIONS] Error clearing all notifications:', error);
      return res.status(500).json({ message: 'Failed to clear notifications.' });
    }

    return res.status(200).json({ success: true, message: 'All notifications cleared.' });
  } catch (err) {
    console.error('[NOTIFICATIONS] Unexpected error in clearAllNotifications:', err);
    return res.status(500).json({ message: 'Server error while clearing notifications.' });
  }
};
