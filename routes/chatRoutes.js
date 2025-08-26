// routes/chatRoutes.js
const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

router.get('/sessions', chatController.getSessions);
router.get('/:session_id/messages', chatController.getChatLogs);
router.get('/escalated-sessions', chatController.getEscalatedSessions);
router.get('/escalated-messages', chatController.getEscalatedChatLogs);
router.post('/message', chatController.sendMessage);
router.post('/assign/:session_id', chatController.assignAgent);
router.get('/unread/sessions', chatController.getSessionsWithUnread);
router.get('/bulk-orders', chatController.getBulkOrders);
router.get('/bulk-orders/unread', chatController.getBulkOrderSessionsWithUnread);
router.get('/archive', chatController.getArchivedChats);
router.post('/create-agent', chatController.createAgent);
router.post('/login', chatController.loginAgent);

module.exports = router;
