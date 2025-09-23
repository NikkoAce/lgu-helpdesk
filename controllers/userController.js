const User = require('../models/User');
const mongoose = require('mongoose');



exports.getAllUsers = async (req, res) => {
    // ... (logic for fetching all users)
    if (req.user.role !== 'ICTO Head') return res.status(403).json({ message: 'Forbidden: Access is restricted to administrators.' });
    try {
        const users = await User.find().select('-password').sort({ name: 1 });
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users', error: error.message });
    }
};

exports.updateUser = async (req, res) => {
    // ... (logic for updating a user's details)
    if (req.user.role !== 'ICTO Head') {
        return res.status(403).json({ message: 'Forbidden: Access is restricted to administrators.' });
    }
    try {
        const { name, role, office } = req.body;
        const updateData = {};

        // Build an object with only the fields that were provided
        if (name) updateData.name = name;
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
     if (req.user.role !== 'ICTO Head') return res.status(403).json({ message: 'Forbidden' });
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
        const response = await fetch(`${gsoApiUrl}/api/offices`, { // Assuming the GSO route is /api/offices and is secured by the key
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
