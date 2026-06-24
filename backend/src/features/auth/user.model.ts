import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    employeeId?: string;
    employeeIdVerified: boolean;
    employeeIdSource?: string;
    employmentType: string;
    name: string;
    role: string;
    office: string;
    departmentId?: mongoose.Types.ObjectId;
    systemAccess: string[];
    email: string;
    password?: string;
    googleId?: string;
    passwordResetToken?: string;
    passwordResetExpires?: Date;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}

const userSchema = new Schema<IUser>({
    employeeId: { type: String },
    employeeIdVerified: { type: Boolean, default: false },
    employeeIdSource: { type: String },
    employmentType: { type: String, required: true, default: 'Permanent' },
    name: { type: String, required: true },
    role: { type: String, required: true, default: 'Employee' },
    office: { type: String, required: true, default: 'Unassigned' },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department' },
    systemAccess: [{ type: String }],
    email: { type: String, required: true, unique: true },
    password: { type: String },
    googleId: { type: String },
    passwordResetToken: { type: String },
    passwordResetExpires: { type: Date },
    status: { type: String, required: true, default: 'Pending' }
}, { timestamps: true });

userSchema.index({ employeeId: 1 }, { unique: true, partialFilterExpression: { employeeId: { $type: 'string' } } });

const User = mongoose.model<IUser>('User', userSchema);
export default User;
