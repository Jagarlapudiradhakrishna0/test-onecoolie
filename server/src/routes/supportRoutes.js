const express = require('express');
const router = express.Router();

const {
  createTicket,
  getAllTickets,
  getTicketById,
  addMessageToTicket,
  updateTicketStatus
} = require('../controllers/supportController');
const { optionalProtect, protect } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/adminMiddleware');

// Unified Support & Desk Routes
// Accessible to both passengers and assistants (and admins)
router.use(optionalProtect);
router.post('/tickets', createTicket);
router.get('/tickets', getAllTickets);
router.get('/tickets/:id', getTicketById);
router.post('/tickets/:id/messages', addMessageToTicket);
router.patch('/tickets/:id/status', protect, requirePermission('support.manage'), updateTicketStatus);

// Also mount root aliases for direct `/api/support` or `/api/support-tickets` requests
router.post('/', createTicket);
router.get('/', getAllTickets);
router.get('/:id', getTicketById);
router.post('/:id/messages', addMessageToTicket);
router.patch('/:id/status', protect, requirePermission('support.manage'), updateTicketStatus);
router.patch('/:id', protect, requirePermission('support.manage'), updateTicketStatus);

module.exports = router;
