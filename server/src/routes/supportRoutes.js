const express = require('express');
const router = express.Router();

const {
  createTicket,
  getAllTickets,
  getTicketById,
  addMessageToTicket,
  updateTicketStatus
} = require('../controllers/supportController');
const { optionalProtect } = require('../middleware/authMiddleware');

// Unified Support & Desk Routes
// Accessible to both passengers and assistants (and admins)
router.use(optionalProtect);
router.post('/tickets', createTicket);
router.get('/tickets', getAllTickets);
router.get('/tickets/:id', getTicketById);
router.post('/tickets/:id/messages', addMessageToTicket);
router.patch('/tickets/:id/status', updateTicketStatus);

// Also mount root aliases for direct `/api/support` or `/api/support-tickets` requests
router.post('/', createTicket);
router.get('/', getAllTickets);
router.get('/:id', getTicketById);
router.post('/:id/messages', addMessageToTicket);
router.patch('/:id/status', updateTicketStatus);
router.patch('/:id', updateTicketStatus);

module.exports = router;
