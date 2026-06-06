import express from 'express';
import {
    getAllTickets,
    createTicket,
    getTicketById,
    addComment,
    updateTicketStatus,
    deleteAttachment
} from './ticket.controller';
import authMiddleware from '../../middleware/auth.middleware';
import upload from '../../config/multer.config';

const router = express.Router();

router.get('/', authMiddleware as any, getAllTickets as any);
router.post('/', authMiddleware as any, createTicket as any);
router.get('/:id', authMiddleware as any, getTicketById as any);
router.patch('/:id', authMiddleware as any, updateTicketStatus as any);
router.post('/:id/comments', authMiddleware as any, upload.single('attachment') as any, addComment as any);
router.delete('/:ticketId/comments/:commentId/attachment', authMiddleware as any, deleteAttachment as any);

export default router;