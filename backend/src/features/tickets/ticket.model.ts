import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IComment {
    _id?: Types.ObjectId;
    author: string;
    content: string;
    attachmentUrl?: string;
    createdAt?: Date;
}

export interface ITicketStatusHistory {
    status: string;
    fromStatus: string;
    changedBy: Types.ObjectId | string;
    changedAt: Date;
    notes?: string;
    reason: string;
}

export interface ITicket extends Document {
    subject: string;
    description: string;
    requesterId?: string;
    requesterName: string;
    requesterRole?: string;
    requesterOffice?: string;
    category?: string;
    subCategory?: string;
    urgency?: string;
    status: string;
    assignedTo?: Types.ObjectId;
    firstResponseAt?: Date;
    resolvedAt?: Date;
    resolutionNotes?: string;
    createdAt: Date;
    statusHistory: mongoose.Types.DocumentArray<ITicketStatusHistory & mongoose.Document>;
    comments: mongoose.Types.DocumentArray<IComment & mongoose.Document>;
}

const commentSchema = new Schema<IComment>({
    author: { type: String, required: true },
    content: { type: String, required: true },
    attachmentUrl: { type: String },
    createdAt: { type: Date, default: Date.now }
});

const statusHistorySchema = new Schema<ITicketStatusHistory>({
    status: { type: String, required: true },
    fromStatus: { type: String, required: true },
    changedBy: { type: Schema.Types.Mixed, required: true },
    changedAt: { type: Date, default: Date.now },
    notes: { type: String },
    reason: { type: String, required: true }
});

const ticketSchema = new Schema<ITicket>({
    subject: { type: String, required: true },
    description: { type: String, required: true },
    requesterId: { type: String },
    requesterName: { type: String, required: true },
    requesterRole: String,
    requesterOffice: String,
    category: String,
    subCategory: String,
    urgency: String,
    status: { type: String, default: 'New' },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    firstResponseAt: { type: Date },
    resolvedAt: { type: Date },
    resolutionNotes: { type: String },
    createdAt: { type: Date, default: Date.now },
    statusHistory: [statusHistorySchema],
    comments: [commentSchema]
});

const Ticket = mongoose.model<ITicket>('Ticket', ticketSchema);
export default Ticket;
