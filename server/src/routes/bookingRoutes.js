const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    createBooking,
    getMyBookings,
    getBookingById,
    getBookingSummary,
    getCancellationPolicy,
    getCancelQuote,
    cancelBooking,
    rebookQuote,
    rebookBooking,
    assignAssistant,
    processPayment,
    updateBooking,
    updateBookingServices,
    rateBooking
} = require('../controllers/bookingController');

const { bookingCancellationLimiter } = require('../middleware/financialRateLimiter');

// Policy route (unparameterized)
router.get('/cancellation-policy', getCancellationPolicy);

router.post('/', protect, createBooking);
router.get('/my-bookings', protect, getMyBookings);
router.get('/:id/summary', protect, getBookingSummary);
router.get('/:id', protect, getBookingById);
router.put('/:id', protect, updateBooking);
router.put('/:id/services', protect, updateBookingServices);
router.patch('/:id/services', protect, updateBookingServices);

// Cancellation & Rebooking Routes
router.post('/:id/cancel-quote', protect, getCancelQuote);
router.post('/:id/cancel', bookingCancellationLimiter, protect, cancelBooking);
router.post('/:id/rebook-quote', protect, rebookQuote);
router.post('/:id/rebook', protect, rebookBooking);

// ONECOOLIE Backend Pipeline Routes
router.put('/:id/assign', protect, assignAssistant);
router.put('/:id/pay', protect, processPayment);
router.post('/:id/rating', protect, rateBooking);
router.post('/:id/rate', protect, rateBooking);
router.post('/:id/review', protect, rateBooking);

module.exports = router;