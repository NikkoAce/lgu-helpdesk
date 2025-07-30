const express = require('express');
const router = express.Router();
const { getAllTickets, createTicket, getTicketById, addComment, updateTicketStatus, deleteAttachment } = require('../controllers/ticketController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../config/multer');

router.get('/', authMiddleware, getAllTickets);
router.post('/', authMiddleware, createTicket);
router.get('/:id', authMiddleware, getTicketById);
router.patch('/:id', authMiddleware, updateTicketStatus);
router.post('/:id/comments', authMiddleware, upload.single('attachment'), addComment);
router.delete('/:ticketId/comments/:commentId/attachment', authMiddleware, deleteAttachment);

module.exports = router;