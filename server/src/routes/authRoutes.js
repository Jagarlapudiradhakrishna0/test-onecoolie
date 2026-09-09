const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

const { protect } = require('../middleware/authMiddleware');

const {
  register,
  login,
  sendOtp,
  verifyOtpAndLogin,
  verifyOtpAndRegister,
  checkEmail,
  updatePhoneNumber,
  getPhoneStatus,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  setupAdminMfa,
  verifyAdminMfaEnrollment,
  getAdminMfaStatus,
  verifyAdminMfaLogin,
  regenerateAdminRecoveryCodes,
  refreshTokenHandler,
  logoutHandler,
  logoutAllHandler,
  getMySessionsHandler
} = require('../controllers/authController');

/*
|--------------------------------------------------------------------------
| Rate Limiters
|--------------------------------------------------------------------------
|
| OTP send: max 3 requests per 15 minutes per IP
|   Prevents spam/abuse of the email sending endpoint
|
| OTP verify: max 10 requests per 15 minutes per IP
|   Secondary rate limit on top of per-OTP attempt tracking
|
| Forgot password: max 3 requests per 15 minutes per IP
|   Prevents email flooding and account enumeration timing attacks
|
*/

const otpSendLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes window
  max: 20, // allow 20 requests per 5 minutes
  message: {
    message: 'Too many OTP requests. Please wait a few minutes before trying again.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false }
});

const otpVerifyLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes window
  max: 30, // allow 30 verification attempts per 5 minutes
  message: {
    message: 'Too many verification attempts. Please wait a moment before trying again.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const checkEmailLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20,
  message: {
    message: 'Too many requests. Please slow down.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 reset requests per 15 minutes per IP
  message: {
    message: 'Too many password reset requests. Please wait 15 minutes before trying again.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per 15 minutes per IP
  message: {
    message: 'Too many login attempts. Please wait 15 minutes before trying again.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false }
});

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 registration attempts per 15 minutes per IP
  message: {
    message: 'Too many registration attempts. Please wait 15 minutes before trying again.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false }
});

/*
|--------------------------------------------------------------------------
| OTP Routes — Production Email Authentication
|--------------------------------------------------------------------------
*/

// Check whether email is registered (used for UX branching)
router.post('/otp/check-email', checkEmailLimiter, checkEmail);

// Send OTP to email
router.post('/otp/send', otpSendLimiter, sendOtp);

// Verify OTP and log in existing user
router.post('/otp/verify-login', otpVerifyLimiter, verifyOtpAndLogin);

// Verify OTP and register new user
router.post('/otp/verify-register', otpVerifyLimiter, verifyOtpAndRegister);

/*
|--------------------------------------------------------------------------
| Forgot Password Routes — Secure 3-Step Password Reset
|--------------------------------------------------------------------------
*/

// Step 1: Request password reset OTP
router.post('/forgot-password', forgotPasswordLimiter, forgotPassword);

// Step 2: Verify OTP and receive short-lived reset token
router.post('/verify-reset-otp', otpVerifyLimiter, verifyResetOtp);

// Step 3: Reset password using the verified reset token
router.post('/reset-password', resetPassword);

/*
|--------------------------------------------------------------------------
| Legacy Password Routes — kept for admin portal & backward compatibility
|--------------------------------------------------------------------------
*/

router.post('/register', registerLimiter, register);
router.post('/login', loginLimiter, login);

/*
|--------------------------------------------------------------------------
| Phase 6.2: Admin Multi-Factor Authentication (TOTP) Routes
|--------------------------------------------------------------------------
*/

const mfaVerifyLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 15,
  message: {
    message: 'Too many MFA verification attempts. Please wait a few minutes before trying again.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Admin MFA enrollment initialization
router.post('/admin/mfa/setup', setupAdminMfa);

// Admin MFA first-time enrollment confirmation
router.post('/admin/mfa/verify-enrollment', mfaVerifyLimiter, verifyAdminMfaEnrollment);

// Admin MFA status inspection
router.get('/admin/mfa/status', protect, getAdminMfaStatus);

// Admin MFA challenge verification during login
router.post('/admin/mfa/verify-login', mfaVerifyLimiter, verifyAdminMfaLogin);

// Admin emergency recovery code regeneration
router.post('/admin/mfa/regenerate-recovery-codes', protect, regenerateAdminRecoveryCodes);

/*
|--------------------------------------------------------------------------
| Phase 6.3: Session Management & Refresh Token Rotation Routes
|--------------------------------------------------------------------------
*/

const refreshLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  message: { message: 'Too many token refresh requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Phase 6.6: CSRF Protection & Token Endpoint
const { csrfEndpoint, csrfProtection } = require('../middleware/csrfProtection');

// Issue fresh CSRF double-submit cookie & token
router.get('/csrf-token', csrfEndpoint);

// Refresh access token via opaque refresh token (cookie or body)
router.post('/refresh', refreshLimiter, csrfProtection, refreshTokenHandler);

// Invalidate current server-side session (logout)
router.post('/logout', protect, csrfProtection, logoutHandler);

// Invalidate all active sessions across all devices
router.post('/logout-all', protect, csrfProtection, logoutAllHandler);

// List active & past sessions for authenticated user
router.get('/sessions', protect, getMySessionsHandler);

// Account Profile & Phone Management
router.put('/update-phone', protect, updatePhoneNumber);
router.get('/phone-status', protect, getPhoneStatus);

module.exports = router;