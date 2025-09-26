const express = require('express');
const router = express.Router();
const { getAllUsers, updateUser, deleteUser, getMe, updateUserProfile, getGsoOffices } = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

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

// @route   PATCH /api/users/:id/status
// @desc    Approve or reject a pending user registration
// @access  Private (ICTO Head)
router.patch('/:id/status', authMiddleware, require('../controllers/userController').updateUserStatus);

router.patch('/:id', authMiddleware, updateUser);
router.delete('/:id', authMiddleware, deleteUser);

module.exports = router;