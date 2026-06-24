import { Request, Response } from 'express';
import User from './user.model';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { sendEmail } from '../../services/email.service';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

// JWT_SECRET is no longer used, we use RS256 with PORTAL_PRIVATE_KEY

import AuditLog from '../internal/auditLog.model';
import { generateRS256Token, getJwks } from '../../utils/jwt.utils';

// Helper function to generate a secure 1-hour session token
const generateSessionToken = (user: any): string => {
    const payload = {
        user: {
            id: user._id,
            employeeId: user.employeeId,
            name: user.name,
            role: user.role,
            office: user.office,
            email: user.email,
            systemAccess: user.systemAccess || []
        }
    };
    return generateRS256Token(payload, 'lgu-daet-portal', '1h');
};

/**
 * @desc    Registers a new employee (Defaults to 'Pending' approval state)
 * @route   POST /api/auth/register
 */
export const registerUser = async (req: Request, res: Response): Promise<any> => {
    try {
        const { employeeId, employmentType, name, role, password, office, email } = req.body;
        if (!employeeId || !employmentType || !name || !role || !password || !office || !email) {
            return res.status(400).json({ message: 'All fields are required.' });
        }

        // Limit self-registration roles
        if (['ICTO Staff', 'ICTO Head'].includes(role)) {
            return res.status(400).json({ message: 'Cannot self-register as an administrator.' });
        }

        let existingUser = await User.findOne({ employeeId });
        if (existingUser) {
            if (existingUser.status === 'Active') {
                return res.status(400).json({ message: 'This Employee ID is already registered and active.' });
            }
            if (existingUser.status === 'Pending') {
                return res.status(400).json({ message: 'This Employee ID has a pending registration. Please wait for approval.' });
            }
        }

        existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email address already registered.' });
        }

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
            status: 'Pending'
        });
        await newUser.save();

        // Send admin notification
        try {
            const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
            if (adminEmail) {
                const userManagementUrl = `${process.env.HELPDESK_FRONTEND_URL}/users`;
                await sendEmail({
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
        } catch (emailError: any) {
            console.error('Failed to send admin notification email:', emailError.message);
        }

        res.status(201).json({ message: 'User registered successfully!' });
    } catch (error: any) {
        res.status(500).json({ message: 'Error registering user', error: error.message });
    }
};

/**
 * @desc    Credentials Login
 * @route   POST /api/auth/login
 */
export const loginUser = async (req: Request, res: Response): Promise<any> => {
    try {
        const { employeeId, password } = req.body;
        if (!employeeId || !password) {
            return res.status(400).json({ message: 'Employee ID and password are required.' });
        }

        const user = await User.findOne({ employeeId });

        if (user && user.status !== 'Active') {
            const reason = user.status === 'Pending' ? 'awaiting administrator approval' : 'rejected or inactive';
            return res.status(403).json({ message: `Your account is currently ${reason}. Please contact an administrator.` });
        }

        if (!user || !user.password) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        const token = generateSessionToken(user);

        // Set HttpOnly cookie
        res.cookie('portalAuthToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 60 * 60 * 1000 // 1 hour
        });

        // Audit Log
        try {
            await AuditLog.create({
                action: 'login',
                performedBy: user._id,
                targetUser: user._id,
                details: `User ${user.employeeId} logged in successfully.`
            });
        } catch (auditErr: any) {
            console.error('Failed to write audit log for login:', auditErr.message);
        }

        res.status(200).json({ message: 'Login successful' });
    } catch (error: any) {
        res.status(500).json({ message: 'Error logging in', error: error.message });
    }
};

/**
 * @desc    Initiates standard forgot-password flow
 * @route   POST /api/auth/forgot-password
 */
export const forgotPassword = async (req: Request, res: Response): Promise<any> => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            // Standard generic message to prevent account scanning
            return res.status(200).json({ message: 'If an account with that email exists, a password reset link has been sent.' });
        }

        const resetToken = crypto.randomBytes(20).toString('hex');
        const passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        const passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        await User.updateOne({ _id: user._id }, {
            $set: { passwordResetToken, passwordResetExpires }
        });

        const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
        const textContent = `You requested a password reset. Click the link to proceed: ${resetUrl}`;
        const htmlContent = `
            <p>You requested a password reset. Click the button below to update your password:</p>
            <p><a href="${resetUrl}" style="font-family: sans-serif; font-size: 14px; font-weight: bold; text-decoration: none; color: #ffffff; background-color: #0ea5e9; border: 15px solid #0ea5e9; border-radius: 3px; display: inline-block;">Reset Your Password</a></p>
            <p>This link will expire in 15 minutes.</p>
        `;

        try {
            await sendEmail({
                to: user.email,
                subject: 'Password Reset Request',
                htmlContent,
                textContent
            });
            res.status(200).json({ message: 'A password reset link has been sent to your email.' });
        } catch (err) {
            await User.updateOne({ _id: user._id }, {
                $unset: { passwordResetToken: 1, passwordResetExpires: 1 }
            });
            console.error('Failed to send password reset email:', err);
            return res.status(500).json({ message: 'Error sending email. Please try again later.' });
        }
    } catch (error: any) {
        res.status(500).json({ message: 'Server error.', error: error.message });
    }
};

/**
 * @desc    Updates user password with reset token
 * @route   POST /api/auth/reset-password/:token
 */
export const resetPassword = async (req: Request, res: Response): Promise<any> => {
    try {
        const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: new Date() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Password reset token is invalid or has expired.' });
        }

        const { password } = req.body;
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!password || !passwordRegex.test(password)) {
            return res.status(400).json({
                message: 'Password does not meet strength requirements. It must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character.'
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await User.updateOne({ _id: user._id }, {
            $set: { password: hashedPassword },
            $unset: { passwordResetToken: 1, passwordResetExpires: 1 }
        });

        res.status(200).json({ message: 'Password has been reset successfully.' });
    } catch (error: any) {
        console.error('Reset Password Error:', error);
        res.status(500).json({ message: 'Error resetting password.', error: error.message });
    }
};

/**
 * @desc    Revokes cookies session immediately
 * @route   POST /api/auth/logout
 */
export const logoutUser = (req: Request, res: Response): void => {
    res.cookie('portalAuthToken', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        expires: new Date(0)
    });
    res.status(200).json({ message: 'Logout successful' });
};

/**
 * @desc    Get currently logged-in user profile
 * @route   GET /api/auth/me
 */
export const getCurrentUser = (req: AuthenticatedRequest, res: Response): void => {
    res.status(200).json(req.user);
};

/**
 * @desc    JWKS Endpoint for public key verification
 * @route   GET /api/auth/.well-known/jwks.json
 */
export const getJwksEndpoint = (req: Request, res: Response): void => {
    res.status(200).json(getJwks());
};

/**
 * @desc    Single Sign-On (SSO) redirect to GSO System
 * @route   GET /api/auth/sso/redirect/gso
 */
export const ssoRedirectGso = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    let cleanPrivateKey = '';
    try {
        if (!req.user) {
            return res.status(401).send('Unauthorized');
        }
        const userId = req.user.id;
        const latestUser = await User.findById(userId).select('id name role office email');

        if (!latestUser) {
            return res.status(404).send('User not found. Unable to proceed with single sign-on.');
        }

        const userPayload = {
            id: latestUser._id,
            name: latestUser.name,
            role: latestUser.role,
            office: latestUser.office,
            email: latestUser.email
        };

        // Cryptographically sign via asymmetric RSA private key
        const privateKey = process.env.SSO_PRIVATE_KEY;
        if (!privateKey) {
            console.error('SSO ERROR: SSO_PRIVATE_KEY is not defined in environment variables.');
            return res.status(500).send('SSO configuration error. Please contact an administrator.');
        }

        // Clean quotes and handle escaped newlines
        cleanPrivateKey = privateKey
            .trim()
            .replace(/^['"]|['"]$/g, '')
            .replace(/\\n/g, '\n');

        const ssoToken = jwt.sign(
            { user: userPayload },
            cleanPrivateKey,
            { algorithm: 'RS256', expiresIn: '2m' }
        );

        const isDev = process.env.NODE_ENV === 'development';
        const gsoFrontendUrl = isDev
            ? process.env.GSO_DEV_FRONTEND_URL
            : process.env.GSO_PROD_FRONTEND_URL;

        if (!gsoFrontendUrl) {
            console.error(`SSO Error: GSO frontend URL for env '${isDev ? 'dev' : 'prod'}' is not defined.`);
            return res.status(500).send('SSO configuration error. Please contact an administrator.');
        }

        const redirectUrl = `${gsoFrontendUrl}?sso_token=${ssoToken}`;
        res.redirect(redirectUrl);
    } catch (error: any) {
        console.error('SSO Redirect Error:', error);
        res.status(500).send('An error occurred during the single sign-on process.');
    }
};

/**
 * @desc    Single Sign-On (SSO) redirect to IT Helpdesk
 * @route   GET /api/auth/sso/redirect/helpdesk
 */
export const ssoRedirectHelpdesk = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const helpdeskFrontendUrl = process.env.HELPDESK_FRONTEND_URL;
        if (!helpdeskFrontendUrl) {
            console.error('SSO Error: HELPDESK_FRONTEND_URL is not defined.');
            return res.status(500).send('SSO configuration error.');
        }

        const redirectUrl = `${helpdeskFrontendUrl.replace(/\/$/, '')}/app.html`;
        res.redirect(redirectUrl);
    } catch (error: any) {
        console.error('SSO Redirect Error for Helpdesk:', error);
        res.status(500).send('An error occurred during the single sign-on process.');
    }
};

/**
 * @desc    SSO Google callback endpoint
 * @route   GET /api/auth/google/callback
 */
export const googleCallback = (req: Request, res: Response): any => {
    const user = req.user as any;

    if (!user) {
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=google-auth-failed`);
    }

    if (user.status !== 'Active') {
        return res.redirect(`${process.env.FRONTEND_URL}/login?status=${user.status.toLowerCase()}`);
    }

    const token = generateSessionToken(user);

    res.cookie('portalAuthToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 60 * 60 * 1000 // 1 hour
    });

    // Audit Log for Google SSO login
    AuditLog.create({
        action: 'login',
        performedBy: user._id,
        targetUser: user._id,
        details: `User ${user.employeeId} logged in via Google SSO.`
    }).catch(err => console.error('Failed to write audit log for Google SSO login:', err));

    res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
};

/**
 * @desc    Checks Employee ID availability
 * @route   GET /api/auth/check-employee-id/:id
 */
export const checkEmployeeId = async (req: Request, res: Response): Promise<any> => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ message: 'Employee ID is required.' });
        }

        const user = await User.findOne({ employeeId: id });

        if (user) {
            res.status(200).json({ isAvailable: false, message: 'Employee ID is already in use.' });
        } else {
            res.status(200).json({ isAvailable: true });
        }
    } catch (error: any) {
        res.status(500).json({ message: 'Error checking Employee ID.', error: error.message });
    }
};

/**
 * @desc    Modifies user account password (logged-in session validation)
 * @route   PUT /api/auth/change-password
 */
export const changePassword = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized.' });
        }

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Please provide both current and new passwords.' });
        }

        const user = await User.findById(userId);
        if (!user || !user.password) {
            return res.status(400).json({ message: 'Password change is not available for this account.' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Incorrect current password.' });
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({ message: 'New password does not meet strength requirements.' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.status(200).json({ message: 'Password changed successfully.' });
    } catch (error: any) {
        console.error('Change Password Error:', error);
        res.status(500).json({ message: 'An error occurred while changing the password.' });
    }
};
