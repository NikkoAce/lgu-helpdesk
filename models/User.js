const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    employeeId: { type: String, required: true, unique: true },
    employmentType: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, required: true },
    office: String,
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    passwordResetToken: String,
    passwordResetExpires: Date
});

module.exports = mongoose.model('User', userSchema);
