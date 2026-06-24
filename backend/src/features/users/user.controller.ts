import { Request, Response } from 'express';
import User from '../auth/user.model';
import { sendEmail } from '../../services/email.service';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import AuditLog from '../internal/auditLog.model';

/**
 * @desc    Get all users list (ICTO only)
 * @route   GET /api/users
 */
export const getAllUsers = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    if (!req.user || !req.user.role || !req.user.role.includes('ICTO')) {
        return res.status(403).json({ message: 'Forbidden: Access is restricted to ICTO personnel.' });
    }
    try {
        const { search, status } = req.query;
        const query: any = {};

        if (status) {
            query.status = status;
        }

        if (search) {
            const searchRegex = new RegExp(search as string, 'i');
            query.$or = [
                { name: searchRegex },
                { email: searchRegex },
                { office: searchRegex },
                { employeeId: searchRegex }
            ];
        }

        const users = await User.find(query)
            .select('-password -passwordResetToken -passwordResetExpires')
            .sort({ name: 1 });
        res.status(200).json(users);
    } catch (error: any) {
        res.status(500).json({ message: 'Error fetching users', error: error.message });
    }
};

/**
 * @desc    Update a user profile by admin (ICTO only)
 * @route   PATCH /api/users/:id
 */
export const updateUser = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    if (!req.user || !req.user.role || !req.user.role.includes('ICTO')) {
        return res.status(403).json({ message: 'Forbidden: Access is restricted to ICTO personnel.' });
    }
    try {
        const { name, role, office, officeId, employeeId } = req.body;
        const updateData: any = {};

        if (name) updateData.name = name;
        if (employeeId) {
            const existingUser = await User.findOne({ employeeId });
            if (existingUser && existingUser._id.toString() !== req.params.id) {
                return res.status(400).json({ message: 'This Employee ID is already in use by another account.' });
            }
            updateData.employeeId = employeeId;
        }
        if (role) updateData.role = role;
        if (office) updateData.office = office;
        if (officeId) updateData.officeId = officeId;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ message: 'No update data provided.' });
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found.' });
        }

        if (role) {
            try {
                await AuditLog.create({
                    action: 'role_change',
                    performedBy: req.user.id,
                    targetUser: updatedUser._id,
                    details: `User role changed to ${role}`
                });
            } catch (auditErr: any) {
                console.error('Failed to log role change:', auditErr.message);
            }
        }

        res.status(200).json(updatedUser);
    } catch (error: any) {
        res.status(500).json({ message: 'Error updating user', error: error.message });
    }
};

/**
 * @desc    Delete a user account (ICTO only)
 * @route   DELETE /api/users/:id
 */
export const deleteUser = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    if (!req.user || !req.user.role || !req.user.role.includes('ICTO')) {
        return res.status(403).json({ message: 'Forbidden: Access is restricted to ICTO personnel.' });
    }
    try {
        if (req.user.id === req.params.id) {
            return res.status(400).json({ message: 'Cannot delete your own administrator account.' });
        }
        const deletedUser = await User.findByIdAndDelete(req.params.id);
        if (!deletedUser) {
            return res.status(404).json({ message: 'User not found.' });
        }
        res.status(200).json({ message: 'User deleted successfully.' });
    } catch (error: any) {
        res.status(500).json({ message: 'Error deleting user', error: error.message });
    }
};

/**
 * @desc    Get currently logged-in user profile details (token validation verify)
 * @route   GET /api/users/me
 */
export const getMe = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        res.status(200).json(user);
    } catch (error: any) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/**
 * @desc    Update current user's profile information
 * @route   PUT /api/users/me
 */
export const updateUserProfile = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const { name, email, office, officeId } = req.body;
        const userId = req.user.id;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        if (email && email.toLowerCase() !== user.email) {
            const existingUser = await User.findOne({ email: email.toLowerCase() });
            if (existingUser) {
                return res.status(400).json({ message: 'This email address is already in use.' });
            }
            user.email = email.toLowerCase();
        }

        if (name) user.name = name;
        if (office) user.office = office;
        if (officeId) user.officeId = officeId;

        const updatedUser = await user.save();
        const userObj = updatedUser.toObject({
            virtuals: true,
            versionKey: false,
            transform: (_doc: any, ret: any) => {
                delete ret.password;
                return ret;
            }
        });
        res.status(200).json(userObj);
    } catch (error: any) {
        console.error('Update Profile Error:', error);
        res.status(500).json({ message: 'An error occurred while updating the profile.' });
    }
};



/**
 * @desc    Approve or reject a pending registration (ICTO only)
 * @route   PATCH /api/users/:id/status
 */
export const updateUserStatus = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    if (!req.user || !req.user.role || !req.user.role.includes('ICTO')) {
        return res.status(403).json({ message: 'Forbidden: Access is restricted to ICTO personnel.' });
    }

    try {
        const { status } = req.body; // Expecting 'Active' or 'Rejected'
        const userId = req.params.id;

        if (!['Active', 'Rejected'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status provided.' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        if (user.status !== 'Pending') {
            return res.status(400).json({ message: `User is not pending approval. Current status: ${user.status}` });
        }

        if (status === 'Active') {
            user.status = 'Active';
            await user.save();

            // Send approval email
            const portalLoginUrl = `${process.env.FRONTEND_URL}/login`;
            await sendEmail({
                to: user.email,
                subject: 'Your LGU Employee Portal Account is Approved!',
                htmlContent: `
                    <p>Hello ${user.name},</p>
                    <p>Congratulations! Your account for the LGU Daet Employee Portal has been approved.</p>
                    <p>You can now log in using your credentials by clicking the link below:</p>
                    <p><a href="${portalLoginUrl}" style="font-family: sans-serif; font-size: 14px; font-weight: bold; text-decoration: none; color: #ffffff; background-color: #0ea5e9; border: 15px solid #0ea5e9; border-radius: 3px; display: inline-block;">Login to Portal</a></p>
                    <p>Thank you,<br>The LGU Employee Portal Team</p>
                `,
                textContent: `Hello ${user.name},\n\nCongratulations! Your account for the LGU Daet Employee Portal has been approved. You can now log in at: ${portalLoginUrl}\n\nThank you,\nThe LGU Employee Portal Team`
            });

            try {
                await AuditLog.create({
                    action: 'approval',
                    performedBy: req.user.id,
                    targetUser: user._id,
                    details: `User ${user.employeeId} approved.`
                });
            } catch (auditErr: any) {
                console.error('Failed to log approval:', auditErr.message);
            }

            res.status(200).json({ message: `User ${user.name} has been approved.` });
        } else { // status === 'Rejected'
            const userEmail = user.email;
            const userName = user.name;
            await User.findByIdAndDelete(userId);

            // Send rejection email
            await sendEmail({
                to: userEmail,
                subject: 'Update on Your LGU Employee Portal Registration',
                htmlContent: `
                    <p>Hello ${userName},</p>
                    <p>We are writing to inform you that your registration for the LGU Daet Employee Portal could not be approved at this time.</p>
                    <p>If you believe this is an error or have any questions, please contact the ICTO department directly.</p>
                    <p>Thank you,<br>The LGU Employee Portal Team</p>
                `,
                textContent: `Hello ${userName},\n\nWe are writing to inform you that your registration for the LGU Daet Employee Portal could not be approved at this time. If you believe this is an error or have any questions, please contact the ICTO department directly.\n\nThank you,\nThe LGU Employee Portal Team`
            });

            res.status(200).json({ message: `User registration for ${userName} has been rejected and the record has been deleted.` });
        }
    } catch (error: any) {
        console.error('Error updating user status:', error);
        res.status(500).json({ message: 'An error occurred while updating the user status.' });
    }
};
