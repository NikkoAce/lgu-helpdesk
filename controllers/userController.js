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
