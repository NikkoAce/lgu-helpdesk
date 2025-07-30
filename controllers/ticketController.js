const Ticket = require('../models/Ticket'); 
const cloudinary = require('cloudinary').v2;
const mongoose = require('mongoose');


exports.getAllTickets = async (req, res) => {
    try {
        const { role, name, office } = req.user; // Get user details from the JWT
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const { status, search } = req.query;
        const queryFilter = {};

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
            queryFilter.subject = { $regex: search, $options: 'i' };
        }

        const totalTickets = await Ticket.countDocuments(queryFilter);
        const totalPages = Math.ceil(totalTickets / limit);
        const tickets = await Ticket.find(queryFilter).sort({ createdAt: -1 }).skip(skip).limit(limit);
        const responseTickets = tickets.map(t => ({ ...t.toObject(), id: t._id }));

        res.status(200).json({
            tickets: responseTickets,
            currentPage: page,
            totalPages: totalPages
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching tickets', error: error.message });
    }
};

exports.createTicket = async (req, res) => {
     try {
        const newTicket = new Ticket({ ...req.body, requesterName: req.user.name, requesterRole: req.user.role, requesterOffice: req.user.office });
        await newTicket.save();
        res.status(201).json({ message: 'Ticket created successfully!', ticket: { ...newTicket.toObject(), id: newTicket._id } });
    } catch (error) {
        res.status(400).json({ message: 'Error creating ticket', error: error.message });
    }
};

exports.getTicketById = async (req, res) => {
     try {
            if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'Invalid Ticket ID.' });
            const ticket = await Ticket.findById(req.params.id);
            if (!ticket) return res.status(404).json({ message: 'Ticket not found.' });
            res.status(200).json({ ...ticket.toObject(), id: ticket._id });
        } catch (error) {
            res.status(500).json({ message: 'Error fetching ticket details', error: error.message });
        }
};

exports.addComment = async (req, res) => {
    // ... (logic for adding a comment, including file upload)
    try {
            if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'Invalid Ticket ID.' });
            
            const { content } = req.body;
            if (!content) return res.status(400).json({ message: 'Comment content is required.' });
            
            const ticket = await Ticket.findById(req.params.id);
            if (!ticket) return res.status(404).json({ message: 'Ticket not found.' });
            
            const newComment = {
                author: req.user.name,
                content: content,
            };
    
            // If a file was uploaded, add its URL to the comment
            if (req.file) {
                newComment.attachmentUrl = req.file.path;
            }
    
            ticket.comments.push(newComment);
            await ticket.save();
            res.status(201).json(ticket.comments);
        } catch (error) {
            res.status(500).json({ message: 'Error adding comment', error: error.message });
        }
};

exports.updateTicketStatus = async (req, res) => {
   try {
           const { status } = req.body;
           if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'Invalid Ticket ID.' });
           const allowedStatuses = ['New', 'In Progress', 'Resolved', 'Closed'];
           if (!status || !allowedStatuses.includes(status)) return res.status(400).json({ message: 'Invalid or missing status.' });
           const updatedTicket = await Ticket.findByIdAndUpdate(req.params.id, { status }, { new: true });
           if (!updatedTicket) return res.status(404).json({ message: 'Ticket not found.' });
           res.status(200).json({ ...updatedTicket.toObject(), id: updatedTicket._id });
       } catch (error) {
           res.status(500).json({ message: 'Error updating ticket status', error: error.message });
       }
};

exports.deleteAttachment = async (req, res) => {
     // Security: Only allow ICTO staff to delete attachments
        if (!req.user.role || !req.user.role.includes('ICTO')) {
            return res.status(403).json({ message: 'Forbidden: You do not have permission to perform this action.' });
        }
    
        try {
            const { ticketId, commentId } = req.params;
            if (!mongoose.Types.ObjectId.isValid(ticketId) || !mongoose.Types.ObjectId.isValid(commentId)) {
                return res.status(400).json({ message: 'Invalid ID format.' });
            }
    
            const ticket = await Ticket.findById(ticketId);
            if (!ticket) return res.status(404).json({ message: 'Ticket not found.' });
    
            const comment = ticket.comments.id(commentId);
            if (!comment) return res.status(404).json({ message: 'Comment not found.' });
            if (!comment.attachmentUrl) return res.status(400).json({ message: 'Comment has no attachment.' });
    
            // Extract the public ID from the Cloudinary URL
            const urlParts = comment.attachmentUrl.split('/');
            const publicIdWithExtension = urlParts[urlParts.length - 1];
            const publicId = publicIdWithExtension.split('.')[0];
            const folder = urlParts[urlParts.length - 2];
            const fullPublicId = `${folder}/${publicId}`;
    
            // Tell Cloudinary to delete the file
            await cloudinary.uploader.destroy(fullPublicId);
    
            // Remove the URL from the comment in the database
            comment.attachmentUrl = undefined;
            await ticket.save();
    
            res.status(200).json({ message: 'Attachment deleted successfully.', ticket });
    
        } catch (error) {
            console.error('Error deleting attachment:', error);
            res.status(500).json({ message: 'Error deleting attachment', error: error.message });
        }
};
