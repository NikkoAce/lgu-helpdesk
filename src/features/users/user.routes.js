const express = require('express');
const router = express.Router();
const { getAllUsers, updateUser, deleteUser, getMe, updateUserProfile, getGsoOffices, updateUserStatus } = require('./user.controller.js');
const authMiddleware = require('middleware/auth.middleware.js');

// This new route will allow other systems to verify a user's token.
// It's placed before other routes with parameters to avoid conflicts.
router.get('/me', authMiddleware, getMe);

// This route acts as a public proxy to fetch offices from the GSO system.
// It's used by both the registration and profile pages.
router.get('/offices', getGsoOffices);

// @route   PUT /api/users/me
// @desc    Update current user's profile information
// @access  Private (requires a valid token)
router.put('/me', authMiddleware, updateUserProfile);

router.get('/', authMiddleware, getAllUsers);

// IMPORTANT: More specific routes must come before general routes with parameters.
// '/:id/status' must be before '/:id'.
router.patch('/:id/status', authMiddleware, updateUserStatus); // Approve/Reject
router.patch('/:id', authMiddleware, updateUser); // Edit
router.delete('/:id', authMiddleware, deleteUser); // Delete

module.exports = router;