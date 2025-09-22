const express = require('express');
const router = express.Router();
const { registerUser, loginUser, forgotPassword, resetPassword, logoutUser, getCurrentUser, ssoRedirectGso } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

// A protected route to get the currently authenticated user's data
router.get('/me', authMiddleware, getCurrentUser);

// A protected route to handle Single Sign-On redirects to the GSO system
router.get('/sso/redirect/gso', authMiddleware, ssoRedirectGso);

module.exports = router;