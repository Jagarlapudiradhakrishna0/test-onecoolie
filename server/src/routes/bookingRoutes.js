const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { 
    createBooking, 
    getMyBookings, 
    getBookingById, 
    cancelBooking,
    assignAssistant,
    processPayment
} = require('../controllers/bookingController');

router.post('/', protect, createBooking);
router.get('/my-bookings', protect, getMyBookings);
router.get('/:id', protect, getBookingById);
router.post('/:id/cancel', protect, cancelBooking);

// ONECOOLIE Backend Pipeline Routes
router.put('/:id/assign', protect, assignAssistant);
router.put('/:id/pay', protect, processPayment);

module.exports = router;