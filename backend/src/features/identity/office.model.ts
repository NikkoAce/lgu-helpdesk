import mongoose, { Schema, Document } from 'mongoose';

export interface IOffice extends Document {
    officeCode: string;
    officeName: string;
    shortName?: string;
    isActive: boolean;
    parentOfficeId?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const officeSchema = new Schema<IOffice>({
    officeCode: { type: String, required: true, unique: true, trim: true },
    officeName: { type: String, required: true, unique: true, trim: true },
    shortName: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    parentOfficeId: { type: Schema.Types.ObjectId, ref: 'Office' }
}, { timestamps: true });

export default mongoose.model<IOffice>('Office', officeSchema);
