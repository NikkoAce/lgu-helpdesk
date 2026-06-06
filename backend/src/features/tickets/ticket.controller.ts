import { Response } from 'express';
import Ticket from './ticket.model';
import { v2 as cloudinary } from 'cloudinary';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

/**
 * @desc    Get tickets list scoped by role/office (ICTO, Department Head, Employee)
 * @route   GET /api/tickets
 */
export const getAllTickets = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const { role, name, office } = req.user;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const skip = (page - 1) * limit;
        const { status, search } = req.query;
        const queryFilter: any = {};

        // Role-based visibility scoping
        if (role.includes('ICTO')) {
            // ICTO Staff/Head sees all tickets
        } else if (role === 'Department Head') {
            queryFilter.requesterOffice = office;
        } else {
            queryFilter.requesterName = name;
        }

        if (status && status !== 'All') {
            queryFilter.status = status;
        }
        if (search) {
            queryFilter.subject = { $regex: search as string, $options: 'i' };
        }

        const totalTickets = await Ticket.countDocuments(queryFilter);
        const totalPages = Math.ceil(totalTickets / limit);
        const tickets = await Ticket.find(queryFilter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        const responseTickets = tickets.map(t => ({ ...t.toObject(), id: t._id }));

        res.status(200).json({
            tickets: responseTickets,
            currentPage: page,
            totalPages: totalPages
        });
    } catch (error: any) {
        res.status(500).json({ message: 'Error fetching tickets', error: error.message });
    }
};

/**
 * @desc    Submit a new IT support ticket
 * @route   POST /api/tickets
 */
export const createTicket = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const newTicket = new Ticket({
            ...req.body,
            requesterName: req.user.name,
            requesterRole: req.user.role,
            requesterOffice: req.user.office
        });
        await newTicket.save();
        res.status(201).json({ message: 'Ticket created successfully!', ticket: { ...newTicket.toObject(), id: newTicket._id } });
    } catch (error: any) {
        res.status(400).json({ message: 'Error creating ticket', error: error.message });
    }
};

/**
 * @desc    Fetch ticket by ID
 * @route   GET /api/tickets/:id
 */
export const getTicketById = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid Ticket ID.' });
        }
        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) {
            return res.status(404).json({ message: 'Ticket not found.' });
        }
        res.status(200).json({ ...ticket.toObject(), id: ticket._id });
    } catch (error: any) {
        res.status(500).json({ message: 'Error fetching ticket details', error: error.message });
    }
};

/**
 * @desc    Adds a comment to an active ticket (supports file attachments)
 * @route   POST /api/tickets/:id/comments
 */
export const addComment = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid Ticket ID.' });
        }

        const { content } = req.body;
        if (!content) {
            return res.status(400).json({ message: 'Comment content is required.' });
        }

        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) {
            return res.status(404).json({ message: 'Ticket not found.' });
        }

        const newComment: any = {
            author: req.user.name,
            content: content,
        };

        if (req.file) {
            newComment.attachmentUrl = req.file.path;
        }

        ticket.comments.push(newComment);
        await ticket.save();
        res.status(201).json(ticket.comments);
    } catch (error: any) {
        res.status(500).json({ message: 'Error adding comment', error: error.message });
    }
};

/**
 * @desc    Modifies ticket status (ICTO personnel only)
 * @route   PATCH /api/tickets/:id
 */
export const updateTicketStatus = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const { status } = req.body;
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid Ticket ID.' });
        }
        const allowedStatuses = ['New', 'In Progress', 'Resolved', 'Closed'];
        if (!status || !allowedStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid or missing status.' });
        }
        const updatedTicket = await Ticket.findByIdAndUpdate(req.params.id, { status }, { new: true });
        if (!updatedTicket) {
            return res.status(404).json({ message: 'Ticket not found.' });
        }
        res.status(200).json({ ...updatedTicket.toObject(), id: updatedTicket._id });
    } catch (error: any) {
        res.status(500).json({ message: 'Error updating ticket status', error: error.message });
    }
};

/**
 * @desc    Deletes file from Cloudinary and database comment model (ICTO only)
 * @route   DELETE /api/tickets/:ticketId/comments/:commentId/attachment
 */
export const deleteAttachment = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    if (!req.user || !req.user.role || !req.user.role.includes('ICTO')) {
        return res.status(403).json({ message: 'Forbidden: You do not have permission.' });
    }

    try {
        const { ticketId, commentId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(ticketId) || !mongoose.Types.ObjectId.isValid(commentId)) {
            return res.status(400).json({ message: 'Invalid ID format.' });
        }

        const ticket = await Ticket.findById(ticketId);
        if (!ticket) {
            return res.status(404).json({ message: 'Ticket not found.' });
        }

        const comment = ticket.comments.id(commentId);
        if (!comment) {
            return res.status(404).json({ message: 'Comment not found.' });
        }
        if (!comment.attachmentUrl) {
            return res.status(400).json({ message: 'Comment has no attachment.' });
        }

        // Extract Cloudinary public ID
        const urlParts = comment.attachmentUrl.split('/');
        const publicIdWithExtension = urlParts[urlParts.length - 1];
        const publicId = publicIdWithExtension.split('.')[0];
        const folder = urlParts[urlParts.length - 2];
        const fullPublicId = `${folder}/${publicId}`;

        // Invoke Cloudinary destruction
        await cloudinary.uploader.destroy(fullPublicId);

        comment.attachmentUrl = undefined;
        await ticket.save();

        res.status(200).json({ message: 'Attachment deleted successfully.', ticket });
    } catch (error: any) {
        console.error('Error deleting attachment:', error);
        res.status(500).json({ message: 'Error deleting attachment', error: error.message });
    }
};
