import mongoose, { Schema, Document } from 'mongoose';

export interface IDepartment extends Document {
    code: string;
    name: string;
    isActive: boolean;
    externalReferences?: {
        ppemsOfficeId?: string;
    };
    createdAt: Date;
    updatedAt: Date;
}

const departmentSchema = new Schema<IDepartment>({
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    externalReferences: {
        ppemsOfficeId: { type: String }
    }
}, { timestamps: true });

const Department = mongoose.model<IDepartment>('Department', departmentSchema);
export default Department;
