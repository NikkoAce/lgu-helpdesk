const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    author: String,
    content: String,
    attachmentUrl: String,
    createdAt: { type: Date, default: Date.now }
});

const ticketSchema = new mongoose.Schema({
    subject: { type: String, required: true },
    description: { type: String, required: true },
    requesterName: { type: String, required: true },
    requesterRole: String,
    requesterOffice: String,
    category: String,
    subCategory: String,
    urgency: String,
    status: { type: String, default: 'New' },
    createdAt: { type: Date, default: Date.now },
    comments: [commentSchema]
});

module.exports = mongoose.model('Ticket', ticketSchema);
