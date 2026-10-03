/**
 * server/src/routes/protectionRoutes.js
 *
 * Dedicated REST Routes for ONECOOLIE Journey Protection
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { paymentOrderLimiter, paymentVerifyLimiter } = require('../middleware/financialRateLimiter');
const {
  createProtectionOrder,
  verifyProtectionPayment,
  getProtectionForBooking,
  getProtectionTerms,
  cancelProtection,
  getAdminProtections
} = require('../controllers/protectionController');

// Public terms route (pre-launch policy terms documentation)
router.get('/terms', getProtectionTerms);
router.get('/:protectionId/terms', getProtectionTerms);

// Protected: Initialize Journey Protection Order (₹0.50 / 50 paise)
router.post('/create-order', paymentOrderLimiter, protect, createProtectionOrder);

// Protected: Verify Payment and Activate Protection
router.post('/verify-payment', paymentVerifyLimiter, protect, verifyProtectionPayment);

// Protected: Lookup Journey Protection for a Booking
router.get('/booking/:bookingId', protect, getProtectionForBooking);

// Protected: Cancel Protection
router.post('/:protectionId/cancel', protect, cancelProtection);

// Admin: List all Protection records
router.get('/admin/list', protect, getAdminProtections);

module.exports = router;
