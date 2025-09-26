const User = require('./user.model.js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendEmail } = require('../../services/email.service.js');

const JWT_SECRET = process.env.JWT_SECRET;

exports.registerUser = async (req, res) => {
    try {
        const { employeeId, employmentType, name, role, password, office, email } = req.body;
        if (!employeeId || !employmentType || !name || !role || !password || !office || !email) {
            return res.status(400).json({ message: 'All fields are required.' });
        }
        // Ensure role is not an admin role during self-registration
        if (['ICTO Staff', 'ICTO Head'].includes(role)) {
            return res.status(400).json({ message: 'Cannot self-register as an administrator.' });
        }
        let existingUser = await User.findOne({ employeeId });
        if (existingUser) {
            // If user exists, check their status.
            if (existingUser.status === 'Active') return res.status(400).json({ message: 'This Employee ID is already registered and active.' });
            if (existingUser.status === 'Pending') return res.status(400).json({ message: 'This Employee ID has a pending registration. Please wait for approval.' });
            // If status is 'Rejected' or something else, we can allow re-registration by deleting the old record.
        }
        
        existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: 'Email address already registered.' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            employeeId,
            employmentType,
            name,
            role,
            office,
            email,
            password: hashedPassword,
            status: 'Pending' // Explicitly set status to Pending
        });
        await newUser.save();

        // --- NEW: Send email notification to admin for approval ---
        try {
            const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
            if (adminEmail) {
                const userManagementUrl = `${process.env.FRONTEND_URL}/users.html`;
                await emailService.sendEmail({
                    to: adminEmail,
                    subject: 'New User Registration Awaiting Approval',
                    htmlContent: `
                        <p>Hello Administrator,</p>
                        <p>A new user has registered and is awaiting your approval.</p>
                        <ul>
                            <li><strong>Name:</strong> ${newUser.name}</li>
                            <li><strong>Email:</strong> ${newUser.email}</li>
                            <li><strong>Employee ID:</strong> ${newUser.employeeId}</li>
                        </ul>
                        <p>Please visit the User Management page to approve or reject this registration.</p>
                        <p><a href="${userManagementUrl}" style="font-family: sans-serif; font-size: 14px; font-weight: bold; text-decoration: none; color: #ffffff; background-color: #0ea5e9; border: 15px solid #0ea5e9; border-radius: 3px; display: inline-block;">Go to User Management</a></p>
                        <p>Thank you,<br>LGU Employee Portal System</p>
                    `,
                    textContent: `Hello Administrator,\n\nA new user has registered and is awaiting your approval.\n\nDetails:\nName: ${newUser.name}\nEmail: ${newUser.email}\nEmployee ID: ${newUser.employeeId}\n\nPlease visit the User Management page to approve or reject this registration: ${userManagementUrl}\n\nThank you,\nLGU Employee Portal System`
                });
            }
        } catch (emailError) {
            // Log the email error but don't fail the registration process for the user.
            console.error('Failed to send admin notification email:', emailError.message);
        }

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

        // Deny login for non-active users
        // This check now strictly requires a user's status to be 'Active'.
        // We will run a script to update old accounts.
        if (user && user.status !== 'Active') {
            const reason = user.status === 'Pending' ? 'awaiting administrator approval' : 'rejected or inactive';
            return res.status(403).json({ message: `Your account is currently ${reason}. Please contact an administrator if you believe this is an error.` });
        }
        // If the user doesn't exist OR if they exist but don't have a password
        // (i.e., they are a Google-only user), treat it as invalid credentials.
        // This prevents the server from crashing on bcrypt.compare.
        if (!user || !user.password) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: 'Invalid credentials.' });

        const payload = { user: { id: user._id, name: user.name, role: user.role, office: user.office, email: user.email } };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

        // Set the token in an HttpOnly cookie
        res.cookie('portalAuthToken', token, {
            httpOnly: true, // Inaccessible to JavaScript
            secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in production
            sameSite: 'None', // Allows cross-domain cookies; requires Secure=true
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
            await emailService.sendEmail({
                to: user.email,
                subject: 'Password Reset Request',
                htmlContent,
                textContent
            });

            res.status(200).json({ message: 'A password reset link has been sent to your email.' });

        } catch (err) {
            // The email service now handles logging. We just need to clear the token.
            user.passwordResetToken = undefined;
            user.passwordResetExpires = undefined;
            await user.save({ validateBeforeSave: false }); // Save without running validators
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
        sameSite: 'None', // Must match the setting used during login
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

exports.ssoRedirectGso = async (req, res) => {
    try {
        // The user is authenticated via the HttpOnly cookie (verified by authMiddleware).
        // The req.user payload might be stale, so we must fetch the latest user data.
        const userId = req.user.id;
        const latestUser = await User.findById(userId).select('id name role office email');

        if (!latestUser) {
            return res.status(404).send('User not found. Unable to proceed with single sign-on.');
        }

        // Use the fresh user data from the database to create the payload.
        const userPayload = { id: latestUser.id, name: latestUser.name, role: latestUser.role, office: latestUser.office, email: latestUser.email };
        
        // Create a new, short-lived token specifically for the SSO jump (e.g., 30 seconds).
        const ssoToken = jwt.sign({ user: userPayload }, JWT_SECRET, { expiresIn: '2m' }); // Increased to 2 minutes for robustness

        // Determine the target GSO environment (prod or dev) from the query parameter.
        const targetEnv = req.query.env || 'prod';
        const gsoFrontendUrl = targetEnv === 'dev' 
            ? process.env.GSO_DEV_FRONTEND_URL 
            : process.env.GSO_PROD_FRONTEND_URL;

        if (!gsoFrontendUrl) {
            console.error(`SSO Error: GSO frontend URL for env '${targetEnv}' is not defined in environment variables.`);
            return res.status(500).send('SSO configuration error. Please contact an administrator.');
        }

        // Redirect the user's browser to the GSO system, passing the temporary SSO token.
        const redirectUrl = `${gsoFrontendUrl}?sso_token=${ssoToken}`;
        res.redirect(redirectUrl);

    } catch (error) {
        console.error('SSO Redirect Error:', error);
        res.status(500).send('An error occurred during the single sign-on process.');
    }
};

/**
 * @desc    Handles SSO redirect to the IT Helpdesk system.
 * @route   GET /api/auth/sso/redirect/helpdesk
 * @access  Private (requires HttpOnly cookie)
 */
exports.ssoRedirectHelpdesk = async (req, res) => {
    try {
        // The user is already authenticated via the HttpOnly cookie (verified by authMiddleware).
        // We just need to redirect them to the correct frontend.
        const helpdeskFrontendUrl = process.env.HELPDESK_FRONTEND_URL;

        if (!helpdeskFrontendUrl) {
            console.error(`SSO Error: HELPDESK_FRONTEND_URL is not defined in environment variables.`);
            return res.status(500).send('SSO configuration error. Please contact an administrator.');
        }

        // Append the specific entry page to the base URL to avoid 404 errors on Netlify.
        const redirectUrl = `${helpdeskFrontendUrl.replace(/\/$/, '')}/app.html`;

        res.redirect(redirectUrl);

    } catch (error) {
        console.error('SSO Redirect Error for Helpdesk:', error);
        res.status(500).send('An error occurred during the single sign-on process.');
    }
};

/**
 * @desc    Handles the callback after Google has authenticated the user
 * @route   GET /api/auth/google/callback
 * @access  Public (via redirect)
 */
exports.googleCallback = (req, res) => {
    // Passport attaches the authenticated user to req.user.
    // This user is the one we found or created in our passport.js config.
    const user = req.user;

    // Handle case where an existing but non-active user tries to sign in via Google
    if (user.status !== 'Active') {
        // Redirect with a status query parameter to show a message on the login page
        return res.redirect(`${process.env.FRONTEND_URL}/index.html?status=${user.status.toLowerCase()}`);
    }

    const payload = { user: { id: user._id, name: user.name, role: user.role, office: user.office, email: user.email } };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

    // Set the same HttpOnly cookie as our standard login
    res.cookie('portalAuthToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'None',
        maxAge: 60 * 60 * 1000 // 1 hour
    });

    // Redirect the user back to the frontend dashboard.
    res.redirect(`${process.env.FRONTEND_URL}/dashboard.html`);
};

/**
 * @desc    Check if an Employee ID is already registered
 * @route   GET /api/auth/check-employee-id/:id
 * @access  Public
 */
exports.checkEmployeeId = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ message: 'Employee ID is required.' });
        }

        const user = await User.findOne({ employeeId: id });

        if (user) {
            // Employee ID is taken
            res.status(200).json({ isAvailable: false, message: 'Employee ID is already in use.' });
        } else {
            // Employee ID is available
            res.status(200).json({ isAvailable: true });
        }
    } catch (error) {
        console.error('Check Employee ID Error:', error);
        res.status(500).json({ message: 'Error checking Employee ID.', error: error.message });
    }
};

/**
 * @desc    Change user's password
 * @route   PUT /api/auth/change-password
 * @access  Private (requires user to be logged in)
 */
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id; // From authMiddleware

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Please provide both current and new passwords.' });
        }

        const user = await User.findById(userId);
        if (!user || !user.password) {
            // This case handles users who signed up via Google and don't have a local password.
            return res.status(400).json({ message: 'Password change is not available for this account.' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Incorrect current password.' });
        }

        // Enforce password strength for the new password
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({ message: 'New password does not meet strength requirements.' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.status(200).json({ message: 'Password changed successfully.' });

    } catch (error) {
        console.error('Change Password Error:', error);
        res.status(500).json({ message: 'An error occurred while changing the password.' });
    }
};
