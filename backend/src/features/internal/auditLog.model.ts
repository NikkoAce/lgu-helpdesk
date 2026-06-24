import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAuditLog extends Document {
    action: string;
    performedBy: Types.ObjectId | string; // Could be a system action or specific user
    targetUser?: Types.ObjectId;
    details: string;
    timestamp: Date;
}

const auditLogSchema = new Schema<IAuditLog>({
    action: { type: String, required: true },
    performedBy: { type: Schema.Types.Mixed, required: true },
    targetUser: { type: Schema.Types.ObjectId, ref: 'User' },
    details: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
export default AuditLog;
