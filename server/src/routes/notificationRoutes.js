const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', notificationController.getMyNotifications);
router.patch('/:id/read', notificationController.markAsRead);
router.patch('/:id/dismiss', notificationController.dismissNotification);
router.post('/clear-all', notificationController.clearAllNotifications);

module.exports = router;
