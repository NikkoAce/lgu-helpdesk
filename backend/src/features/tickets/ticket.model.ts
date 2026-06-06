import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IComment {
    _id?: Types.ObjectId;
    author: string;
    content: string;
    attachmentUrl?: string;
    createdAt?: Date;
}

export interface ITicket extends Document {
    subject: string;
    description: string;
    requesterName: string;
    requesterRole?: string;
    requesterOffice?: string;
    category?: string;
    subCategory?: string;
    urgency?: string;
    status: string;
    createdAt: Date;
    comments: mongoose.Types.DocumentArray<IComment & mongoose.Document>;
}

const commentSchema = new Schema<IComment>({
    author: { type: String, required: true },
    content: { type: String, required: true },
    attachmentUrl: { type: String },
    createdAt: { type: Date, default: Date.now }
});

const ticketSchema = new Schema<ITicket>({
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

const Ticket = mongoose.model<ITicket>('Ticket', ticketSchema);
export default Ticket;
