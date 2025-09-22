const User = require('../models/User'); // We will create this model file next
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const JWT_SECRET = process.env.JWT_SECRET;

exports.registerUser = async (req, res) => {
    try {
        const { employeeId, employmentType, name, role, password, office, email } = req.body;
        if (!employeeId || !employmentType || !name || !role || !password || !office || !email) {
            return res.status(400).json({ message: 'All fields are required.' });
        }
        let existingUser = await User.findOne({ employeeId });
        if (existingUser) return res.status(400).json({ message: 'Employee ID already registered.' });
        
        existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: 'Email address already registered.' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({ employeeId, employmentType, name, role, office, email, password: hashedPassword });
        await newUser.save();
        res.status(201).json({ message: 'User registered successfully!' });
    } catch (error) {
        res.status(500).json({ message: 'Error registering user', error: error.message });
    }
};

exports.loginUser = async (req, res) => {
    try {
        const { employeeId, password } = req.body;
        if (!employeeId || !password) return res.status(400).json({ message: 'Employee ID and password are required.' });
        
        const user = await User.findOne({ employeeId });
        if (!user) return res.status(401).json({ message: 'Invalid credentials.' });
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: 'Invalid credentials.' });

        const payload = { user: { id: user._id, name: user.name, role: user.role, office: user.office, email: user.email } };
        jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' }, (err, token) => {
            if (err) throw err;
            res.status(200).json({ token });
        });
    } catch (error) {
        res.status(500).json({ message: 'Error logging in', error: error.message });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        // For security, always return a success-like message
        // to prevent attackers from checking if an email is registered.
        if (!user) {
            return res.status(200).json({ message: 'If an account with that email exists, a password reset link has been sent.' });
        }

        // 1. Generate a random reset token
        const resetToken = crypto.randomBytes(20).toString('hex');

        // 2. Hash the token and set it on the user model
        user.passwordResetToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');

        // 3. Set an expiry time (e.g., 15 minutes)
        user.passwordResetExpires = Date.now() + 15 * 60 * 1000;

        await user.save();

        // 4. Create the reset URL for the frontend portal
        const resetUrl = `https://lgu-employee-portal.netlify.app/reset-password.html?token=${resetToken}`;

        // 5. Send the email
        const message = `You are receiving this email because you (or someone else) has requested to reset the password for your account.\n\nPlease click on the following link, or paste it into your browser to complete the process:\n\n${resetUrl}\n\nThis link will expire in 15 minutes.\n\nIf you did not request this, please ignore this email and your password will remain unchanged.`;

        try {
            // --- DEBUGGING: Log email configuration ---
            console.log('--- Attempting to send email with Nodemailer ---');
            console.log('Email Host:', process.env.EMAIL_HOST);
            console.log('Email Port:', process.env.EMAIL_PORT);
            console.log('Email User:', process.env.EMAIL_USERNAME);
            // For security, we only check if the password is set, we don't log it.
            console.log('Email Password is set:', !!process.env.EMAIL_PASSWORD);

            const transporter = nodemailer.createTransport({
                host: process.env.EMAIL_HOST,
                port: process.env.EMAIL_PORT,
                secure: process.env.EMAIL_PORT == 465, // true for 465, false for other ports
                auth: {
                    user: process.env.EMAIL_USERNAME,
                    pass: process.env.EMAIL_PASSWORD,
                },
            });

            await transporter.sendMail({
                from: '"LGU Employee Portal" <noreply@lgu-portal.com>',
                to: user.email,
                subject: 'Password Reset Request',
                text: message,
            });

            res.status(200).json({ message: 'A password reset link has been sent to your email.' });

        } catch (err) {
            console.error('Email sending error:', err);
            user.passwordResetToken = undefined;
            user.passwordResetExpires = undefined;
            await user.save();
            return res.status(500).json({ message: 'Error sending email. Please try again later.' });
        }

    } catch (error) {
        console.error('Forgot Password Error:', error);
        res.status(500).json({ message: 'Server error. Please check the logs for details.' });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        // 1. Get hashed token from URL param
        const hashedToken = crypto
            .createHash('sha256')
            .update(req.params.token)
            .digest('hex');

        // 2. Find user by token and check if it's not expired
        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({ message: 'Password reset token is invalid or has expired.' });
        }

        // 3. Set the new password
        const { password } = req.body;
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();

        res.status(200).json({ message: 'Password has been reset successfully.' });

    } catch (error) {
        console.error('Reset Password Error:', error);
        res.status(500).json({ message: 'Error resetting password. Please check the logs for details.' });
    }
};
