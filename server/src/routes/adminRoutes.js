const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/adminMiddleware');
const {
  getStats,
  getPendingAssistants,
  getAssistants,
  approveAssistant,
  rejectAssistant,
  getAllBookings,
  getBookingById,
  updateBooking,
  getUsers,
  updateUser,
  deleteUser,
  getSOSAlerts,
  resolveSOS,
} = require('../controllers/adminController');

// All routes require authentication & admin role
router.use(protect, adminOnly);

// Platform overview & stats
router.get('/stats', getStats);

// Bookings management
router.get('/bookings', getAllBookings);
router.get('/bookings/:id', getBookingById);
router.patch('/bookings/:id', updateBooking);

// Assistant force & KYC
router.get('/pending-assistants', getPendingAssistants);
router.get('/assistants', getAssistants);
router.post('/assistants/:id/approve', approveAssistant);
router.post('/assistants/:id/reject', rejectAssistant);

// User / Passenger directory
router.get('/users', getUsers);
router.patch('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// SOS emergency incident command
router.get('/sos-alerts', getSOSAlerts);
router.post('/sos-alerts/:id/resolve', resolveSOS);

module.exports = router;