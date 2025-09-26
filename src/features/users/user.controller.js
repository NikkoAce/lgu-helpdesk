const User = require('..auth/user.model.js');
const { sendEmail } = require('../../services/email.service.js');

exports.getAllUsers = async (req, res) => {
    // Allow any user with 'ICTO' in their role to access this
    if (!req.user.role || !req.user.role.includes('ICTO')) {
        return res.status(403).json({ message: 'Forbidden: Access is restricted to ICTO personnel.' });
    }
    try {
        const { search, status } = req.query;
        let query = {};
 
        // Apply status filter
        if (status) {
            query.status = status;
        }
 
        // Apply search filter
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            query.$or = [
                { name: searchRegex },
                { email: searchRegex },
                { office: searchRegex },
                { employeeId: searchRegex }
            ];
        }

        const users = await User.find(query).select('-password -passwordResetToken -passwordResetExpires').sort({ name: 1 });
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users', error: error.message });
    }
};

exports.updateUser = async (req, res) => {
    // ... (logic for updating a user's details)
    if (!req.user.role || !req.user.role.includes('ICTO')) {
        return res.status(403).json({ message: 'Forbidden: Access is restricted to ICTO personnel.' });
    }
    try {
        const { name, role, office, employeeId } = req.body;
        const updateData = {};

        // Build an object with only the fields that were provided
        if (name) updateData.name = name;
        if (employeeId) {
            // Check if the new employeeId is already taken by another user
            const existingUser = await User.findOne({ employeeId: employeeId });
            if (existingUser && existingUser._id.toString() !== req.params.id) {
                return res.status(400).json({ message: 'This Employee ID is already in use by another account.' });
            }
            updateData.employeeId = employeeId;
        }
        if (role) updateData.role = role;
        if (office) updateData.office = office;

        // Ensure at least one field is being updated
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ message: 'No update data provided.' });
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true } // Return the updated document
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found.' });
        }
        res.status(200).json(updatedUser);
    } catch (error) {
        res.status(500).json({ message: 'Error updating user', error: error.message });
    }
};

exports.deleteUser = async (req, res) => {
     if (!req.user.role || !req.user.role.includes('ICTO')) {
        return res.status(403).json({ message: 'Forbidden: Access is restricted to ICTO personnel.' });
    }
    try {
        if (req.user.id === req.params.id) return res.status(400).json({ message: 'Cannot delete your own administrator account.' });
        const deletedUser = await User.findByIdAndDelete(req.params.id);
        if (!deletedUser) return res.status(404).json({ message: 'User not found.' });
        res.status(200).json({ message: 'User deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting user', error: error.message });
    }
};

/**
 * @desc    Get the currently logged-in user's data based on their token.
 *          This is used by other systems to verify a user's identity.
 */
exports.getMe = async (req, res) => {
    try {
        // The portal's own auth middleware will have decoded the token and put the user's ID on req.user.id
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/**
 * @desc    Update current user's profile
 * @route   PUT /api/users/me
 * @access  Private
 */
exports.updateUserProfile = async (req, res) => {
    try {
        const { name, email, office } = req.body;
        const userId = req.user.id; // From authMiddleware

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // If email is being changed, check if the new email is already taken by another user.
        if (email && email.toLowerCase() !== user.email) {
            const existingUser = await User.findOne({ email: email.toLowerCase() });
            if (existingUser) {
                return res.status(400).json({ message: 'This email address is already in use.' });
            }
            user.email = email.toLowerCase();
        }

        // Update other fields if they are provided in the request
        if (name) user.name = name;
        if (office) user.office = office;

        const updatedUser = await user.save();

        // Return a clean, updated user object (without sensitive data)
        res.status(200).json(updatedUser.toObject({ virtuals: true, versionKey: false, transform: (doc, ret) => { delete ret.password; return ret; } }));

    } catch (error) {
        console.error('Update Profile Error:', error);
        res.status(500).json({ message: 'An error occurred while updating the profile.' });
    }
};

/**
 * @desc    Acts as a proxy to fetch the list of offices from the GSO system.
 * @route   GET /api/users/offices
 * @access  Public
 */
exports.getGsoOffices = async (req, res) => {
    try {
        // Use the correct GSO backend URL, with a fallback to the most recent known URL.
        const gsoApiUrl = process.env.GSO_API_URL || 'https://gso-backend-mns8.onrender.com';
        const internalApiKey = process.env.INTERNAL_API_KEY;

        if (!internalApiKey) {
            console.error('FATAL: INTERNAL_API_KEY is not defined in the environment variables.');
            return res.status(500).json({ message: 'Server configuration error.' });
        }

        // Make an authenticated request to the GSO system using the shared internal API key.
        const response = await fetch(`${gsoApiUrl}/api/offices/public`, { // The GSO system exposes offices at this path.
            headers: {
                'X-Internal-API-Key': internalApiKey
            }
        });

        if (!response.ok) {
            throw new Error(`GSO API responded with status: ${response.status}`);
        }
        const offices = await response.json();
        res.status(200).json(offices);
    } catch (error) {
        console.error('Error proxying request to GSO for offices:', error);
        res.status(502).json({ message: 'Could not retrieve office list from the GSO system.' });
    }
};

/**
 * @desc    Approve or reject a pending user registration
 * @route   PATCH /api/users/:id/status
 * @access  Private (ICTO Head)
 */
exports.updateUserStatus = async (req, res) => {
    if (!req.user.role || !req.user.role.includes('ICTO')) {
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
            const portalLoginUrl = `${process.env.FRONTEND_URL}/index.html`;
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
    } catch (error) {
        console.error('Error updating user status:', error);
        res.status(500).json({ message: 'An error occurred while updating the user status.' });
    }
};
