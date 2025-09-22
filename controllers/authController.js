const User = require('../models/User'); // We will create this model file next
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const SibApiV3Sdk = require('@sendinblue/client'); // Brevo SDK

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
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

        // Set the token in an HttpOnly cookie
        res.cookie('portalAuthToken', token, {
            httpOnly: true, // Inaccessible to JavaScript
            secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in production
            sameSite: 'Strict', // Mitigates CSRF attacks
            maxAge: 60 * 60 * 1000 // 1 hour in milliseconds
        });

        // Send a success response without the token in the body
        res.status(200).json({ message: 'Login successful' });

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
        const passwordResetToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');

        // 3. Set an expiry time (e.g., 15 minutes)
        const passwordResetExpires = Date.now() + 15 * 60 * 1000;

        // Use updateOne to avoid validation issues on existing documents
        await User.updateOne({ _id: user._id }, {
            $set: { passwordResetToken, passwordResetExpires }
        });

        // 4. Create the reset URL for the frontend portal
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password.html?token=${resetToken}`;

        // 5. Send the email
        const textContent = `You are receiving this email because you (or someone else) has requested to reset the password for your account.\n\nPlease click on the following link, or paste it into your browser to complete the process:\n\n${resetUrl}\n\nThis link will expire in 15 minutes.\n\nIf you did not request this, please ignore this email and your password will remain unchanged.`;
        const htmlContent = `
            <p>Hello,</p>
            <p>You are receiving this email because you (or someone else) has requested to reset the password for your account.</p>
            <p>Please click on the link below to complete the process:</p>
            <p><a href="${resetUrl}" style="font-family: sans-serif; font-size: 14px; font-weight: bold; text-decoration: none; color: #ffffff; background-color: #0ea5e9; border: 15px solid #0ea5e9; border-radius: 3px; display: inline-block;">Reset Your Password</a></p>
            <p>This link will expire in 15 minutes.</p>
            <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
            <br>
            <p>Thank you,<br>The LGU Employee Portal Team</p>
        `;

        try {
            // Configure API key authorization: apiKey
            const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
            const apiKey = apiInstance.authentications['apiKey'];
            apiKey.apiKey = process.env.BREVO_API_KEY;
            const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
            sendSmtpEmail.subject = 'Password Reset Request';
            sendSmtpEmail.htmlContent = htmlContent;
            sendSmtpEmail.textContent = textContent; // Provide a plain text fallback
            sendSmtpEmail.sender = { name: 'LGU Employee Portal', email: process.env.BREVO_FROM_EMAIL };
            sendSmtpEmail.to = [{ email: user.email }];

            // Await the promise from the Brevo API
            await apiInstance.sendTransacEmail(sendSmtpEmail);

            res.status(200).json({ message: 'A password reset link has been sent to your email.' });

        } catch (err) {
            if (err.body) {
                // Brevo puts detailed errors in err.body
                console.error('Brevo Error Body:', err.body);
            }
            // Clear the token on failure
            await User.updateOne({ _id: user._id }, {
                $set: { passwordResetToken: undefined, passwordResetExpires: undefined }
            });
            
            return res.status(500).json({ message: 'Error sending email. Please try again later.' });
        }

    } catch (error) {
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

        // --- UPDATED: Enforce strong password policy ---
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!password || !passwordRegex.test(password)) {
            return res.status(400).json({
                message: 'Password does not meet strength requirements. It must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character.'
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Update the user's password and clear the reset token fields
        await User.updateOne({ _id: user._id }, {
            $set: { password: hashedPassword, passwordResetToken: undefined, passwordResetExpires: undefined }
        });

        res.status(200).json({ message: 'Password has been reset successfully.' });

    } catch (error) {
        console.error('Reset Password Error:', error);
        res.status(500).json({ message: 'Error resetting password. Please check the logs for details.' });
    }
};

exports.logoutUser = (req, res) => {
    // Clear the cookie by setting its expiration date to the past
    res.cookie('portalAuthToken', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict',
        expires: new Date(0) // Expire the cookie immediately
    });

    res.status(200).json({ message: 'Logout successful' });
};

exports.getCurrentUser = (req, res) => {
    // The authMiddleware has already verified the token and attached the user payload.
    // We can safely send this data back to the client.
    // The payload contains non-sensitive information as defined during login.
    res.status(200).json(req.user);
};
