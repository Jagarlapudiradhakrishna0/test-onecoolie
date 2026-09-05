const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { 
    createBooking, 
    getMyBookings, 
    getBookingById, 
    updateBooking,
    cancelBooking,
    rateBooking,
    assignAssistant,
    processPayment
} = require('../controllers/bookingController');

router.post('/', protect, createBooking);
router.get('/my-bookings', protect, getMyBookings);
router.get('/:id', protect, getBookingById);
router.put('/:id', protect, updateBooking);
router.post('/:id/cancel', protect, cancelBooking);
router.post('/:id/rating', protect, rateBooking);
router.post('/:id/rate', protect, rateBooking);

// ONECOOLIE Backend Pipeline Routes
router.put('/:id/assign', protect, assignAssistant);
router.put('/:id/pay', protect, processPayment);

module.exports = router;