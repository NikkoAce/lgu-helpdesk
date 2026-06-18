import mongoose, { Schema, Document } from 'mongoose';

export interface INotificationLog extends Document {
    to: string;
    subject: string;
    status: 'sent' | 'failed';
    errorDetails?: string;
    system: string;
    createdAt: Date;
}

const notificationLogSchema = new Schema<INotificationLog>({
    to: { type: String, required: true },
    subject: { type: String, required: true },
    status: { type: String, enum: ['sent', 'failed'], required: true },
    errorDetails: { type: String },
    system: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

export const NotificationLog = mongoose.model<INotificationLog>('NotificationLog', notificationLogSchema);
