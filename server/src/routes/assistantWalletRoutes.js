/**
 * server/src/routes/assistantWalletRoutes.js
 *
 * Dedicated Assistant Wallet Routes (Phase 4 / Production V4.0)
 * Mounted at: /api/assistant-wallet
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getWallet,
  getTransactions,
  initiateTopup,
  verifyTopup
} = require('../controllers/assistantWalletController');
const { getEarnings } = require('../controllers/payoutController');
const { walletTopupLimiter } = require('../middleware/financialRateLimiter');

router.use(protect);

// Authoritative Wallet Balances
router.get('/', getWallet);

// Job Earning History
router.get('/earnings', getEarnings);

// Immutable Transaction Ledger
router.get('/transactions', getTransactions);

// Wallet Top-up Flow (Rate-limited, integer paise, compliance verified)
router.post('/topup/initiate', walletTopupLimiter, initiateTopup);
router.post('/topup/verify', walletTopupLimiter, verifyTopup);

module.exports = router;
