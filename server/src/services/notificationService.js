// server/src/services/notificationService.js
const supabase = require('../config/db');

/**
 * Universal Notification Service
 * Manages creation, real-time dispatch, and synchronization of user notifications.
 */

/**
 * Create a single notification and dispatch via Socket.IO
 */
async function createNotification({
  userId,
  bookingId = null,
  title,
  message,
  type = 'info',
  metadata = {}
}) {
  if (!userId || !title) return null;

  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        booking_id: bookingId,
        title,
        message,
        type,
        is_read: false,
        is_dismissed: false,
        metadata: metadata || {},
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('[NOTIFICATION SERVICE] Error inserting notification:', error);
      return null;
    }

    // Real-time dispatch
    emitRealtimeNotification(userId, data);
    return data;
  } catch (err) {
    console.error('[NOTIFICATION SERVICE] Unexpected error creating notification:', err);
    return null;
  }
}

/**
 * Emit real-time notification to user's socket room
 */
function emitRealtimeNotification(userId, notification) {
  try {
    if (global.io && userId) {
      global.io.to(`user_${userId}`).emit('new_notification', notification);
      global.io.to(`user_${userId}`).emit('notification', notification);
      global.io.to(`user_${userId}`).emit('notification_badge_update', {
        type: notification.type,
        id: notification.id
      });
    }
  } catch (err) {
    console.warn('[NOTIFICATION SERVICE] Realtime emit error:', err);
  }
}

/**
 * Notify all approved online assistants assigned to a station
 */
async function notifyStationAssistants(stationCode, { title, message, type = 'request', metadata = {}, bookingId = null }) {
  if (!stationCode) return;
  try {
    const { data: assistants, error } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'assistant')
      .eq('station_code', stationCode);

    if (error || !assistants || assistants.length === 0) return;

    for (const ast of assistants) {
      await createNotification({
        userId: ast.id,
        bookingId,
        title,
        message,
        type,
        metadata
      });
    }
  } catch (err) {
    console.error('[NOTIFICATION SERVICE] Error notifying station assistants:', err);
  }
}

/**
 * Notify all administrative users
 */
async function notifyAdmins({ title, message, type = 'admin', metadata = {}, bookingId = null }) {
  try {
    const { data: admins, error } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin');

    if (error || !admins || admins.length === 0) return;

    for (const adm of admins) {
      await createNotification({
        userId: adm.id,
        bookingId,
        title,
        message,
        type,
        metadata
      });
    }

    if (global.io) {
      global.io.to('admin').emit('admin_alert', { title, message, type, metadata, bookingId });
    }
  } catch (err) {
    console.error('[NOTIFICATION SERVICE] Error notifying admins:', err);
  }
}

/**
 * Synchronize un-notified events for a user into public.notifications
 * Ensures historical database state matches actual events without duplication.
 */
async function syncUserNotifications(user) {
  if (!user || !user.id) return;

  try {
    const userId = user.id;
    const userRole = user.role;

    if (userRole === 'assistant') {
      // 1. Sync pending requests at assistant's station
      if (user.station_code) {
        const { data: pendingRequests } = await supabase
          .from('bookings')
          .select('id, booking_id, train_number, services, station_code, created_at, passenger:passenger_id(name)')
          .eq('station_code', user.station_code)
          .eq('booking_status', 'pending')
          .is('assistant_id', null)
          .order('created_at', { ascending: false })
          .limit(10);

        if (pendingRequests && pendingRequests.length > 0) {
          for (const req of pendingRequests) {
            const { data: existing } = await supabase
              .from('notifications')
              .select('id')
              .eq('user_id', userId)
              .eq('booking_id', req.id)
              .eq('type', 'request')
              .maybeSingle();

            if (!existing) {
              const coach = req.services?.coach || req.coach || 'TBD';
              const seat = req.services?.seat_number || req.seat_number || 'TBD';
              const pName = req.passenger?.name || req.passenger_name || 'Passenger';
              const trainNo = req.train_number || 'Express';

              await supabase.from('notifications').insert({
                user_id: userId,
                booking_id: req.id,
                title: `New Dispatch: ${pName}`,
                message: `Train ${trainNo} · Coach ${coach} · Seat ${seat}`,
                type: 'request',
                is_read: false,
                is_dismissed: false,
                metadata: { bookingId: req.id, station: req.station_code },
                created_at: req.created_at || new Date().toISOString()
              });
            }
          }
        }
      }

      // 2. Sync completed jobs for this assistant
      const { data: completedJobs } = await supabase
        .from('bookings')
        .select('id, booking_id, train_number, total_price, updated_at, created_at')
        .eq('assistant_id', userId)
        .eq('booking_status', 'completed')
        .order('created_at', { ascending: false })
        .limit(10);

      if (completedJobs && completedJobs.length > 0) {
        for (const job of completedJobs) {
          const { data: existing } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', userId)
            .eq('booking_id', job.id)
            .eq('type', 'job_completed')
            .maybeSingle();

          if (!existing) {
            await supabase.from('notifications').insert({
              user_id: userId,
              booking_id: job.id,
              title: `Job Completed · ₹${job.total_price || '0'}`,
              message: `Assistance completed for booking #${job.booking_id || job.id.slice(0, 8)}.`,
              type: 'job_completed',
              is_read: false,
              is_dismissed: false,
              metadata: { bookingId: job.id },
              created_at: job.updated_at || job.created_at || new Date().toISOString()
            });
          }
        }
      }

      // 3. Sync ratings/reviews for this assistant
      const { data: ratedJobs } = await supabase
        .from('bookings')
        .select('id, booking_id, rating, review, updated_at')
        .eq('assistant_id', userId)
        .not('rating', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(10);

      if (ratedJobs && ratedJobs.length > 0) {
        for (const job of ratedJobs) {
          const { data: existing } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', userId)
            .eq('booking_id', job.id)
            .eq('type', 'rating')
            .maybeSingle();

          if (!existing) {
            await supabase.from('notifications').insert({
              user_id: userId,
              booking_id: job.id,
              title: `Passenger Rating: ★ ${Number(job.rating).toFixed(1)} / 5.0`,
              message: job.review ? `"${job.review}"` : 'Passenger submitted a verified 5-star rating.',
              type: 'rating',
              is_read: false,
              is_dismissed: false,
              metadata: { bookingId: job.id, rating: job.rating },
              created_at: job.updated_at || new Date().toISOString()
            });
          }
        }
      }
    } else if (userRole === 'passenger') {
      // Sync recent bookings for passenger
      const { data: myBookings } = await supabase
        .from('bookings')
        .select('id, booking_id, train_number, services, booking_status, created_at, updated_at')
        .eq('passenger_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (myBookings && myBookings.length > 0) {
        for (const b of myBookings) {
          const { data: existing } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', userId)
            .eq('booking_id', b.id)
            .maybeSingle();

          if (!existing) {
            const status = b.booking_status;
            const trainNo = b.train_number || 'Express';
            const coach = b.services?.coach || '--';
            const seat = b.services?.seat_number || '--';
            const title = status === 'completed'
              ? `Trip Completed · Train ${trainNo}`
              : status === 'cancelled'
                ? `Booking Cancelled · Train ${trainNo}`
                : `Booking Confirmed · Train ${trainNo}`;
            const message = `Coach ${coach}, Seat ${seat}. Booking #${b.booking_id || b.id.slice(0, 8)}.`;

            await supabase.from('notifications').insert({
              user_id: userId,
              booking_id: b.id,
              title,
              message,
              type: status === 'completed' ? 'service_completed' : 'booking',
              is_read: false,
              is_dismissed: false,
              metadata: { bookingId: b.id },
              created_at: b.updated_at || b.created_at || new Date().toISOString()
            });
          }
        }
      }
    } else if (userRole === 'admin') {
      // Sync active SOS alerts for admin
      const { data: activeSos } = await supabase
        .from('bookings')
        .select('id, booking_id, train_number, services, station_code, updated_at, passenger:passenger_id(name)')
        .eq('sos_triggered', true)
        .order('updated_at', { ascending: false })
        .limit(5);

      if (activeSos && activeSos.length > 0) {
        for (const sos of activeSos) {
          const { data: existing } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', userId)
            .eq('booking_id', sos.id)
            .eq('type', 'sos')
            .maybeSingle();

          if (!existing) {
            const pName = sos.passenger?.name || 'Passenger';
            const coach = sos.services?.coach || '—';
            const seat = sos.services?.seat_number || '—';
            const trainNo = sos.train_number || 'Express';

            await supabase.from('notifications').insert({
              user_id: userId,
              booking_id: sos.id,
              title: `Emergency SOS Alert · Train ${trainNo}`,
              message: `Passenger ${pName} at Coach ${coach}, Seat ${seat} (${sos.station_code || 'station'}).`,
              type: 'sos',
              is_read: false,
              is_dismissed: false,
              metadata: { bookingId: sos.id },
              created_at: sos.updated_at || new Date().toISOString()
            });
          }
        }
      }
    }
  } catch (err) {
    console.error('[NOTIFICATION SERVICE] Error syncing user notifications:', err);
  }
}

module.exports = {
  createNotification,
  emitRealtimeNotification,
  notifyStationAssistants,
  notifyAdmins,
  syncUserNotifications
};
