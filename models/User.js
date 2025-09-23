const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    // Made optional to support Google Sign-In. Uniqueness is handled by the index below.
    employeeId: { type: String },
    employmentType: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, required: true },
    office: String,
    email: { type: String, required: true, unique: true },
    // Made optional to support Google Sign-In
    password: { type: String },

    // Field for Google OAuth to store the user's unique Google ID
    googleId: { type: String },

    passwordResetToken: String,
    passwordResetExpires: Date
}, { timestamps: true }); // Added timestamps for better record tracking

// To prevent duplicate employee IDs for users who do register with one,
// we use a partial index that only enforces uniqueness for non-null values.
// This allows multiple users to have a null employeeId (e.g., Google sign-ups).
userSchema.index({ employeeId: 1 }, { unique: true, partialFilterExpression: { employeeId: { $type: 'string' } } });

module.exports = mongoose.model('User', userSchema);
