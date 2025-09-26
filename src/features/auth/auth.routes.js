const express = require('express');
const router = express.Router();
const passport = require('passport');
const rateLimit = require('express-rate-limit');
const { registerUser, loginUser, forgotPassword, resetPassword, logoutUser, getCurrentUser, ssoRedirectGso, ssoRedirectHelpdesk, googleCallback, checkEmployeeId, changePassword } = require('./auth.controller.js');
const authMiddleware = require('@/middleware/auth.middleware.js');

// --- Rate Limiter for Password Reset ---
// This prevents abuse of the forgot password endpoint by limiting requests from a single IP.
const forgotPasswordLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 10, // Limit each IP to 10 requests per window
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: {
        message: 'Too many password reset requests from this IP. Please try again after 15 minutes.'
    }
});

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);

// A protected route for a logged-in user to change their password
router.put('/change-password', authMiddleware, changePassword);

router.post('/forgot-password', forgotPasswordLimiter, forgotPassword);
router.post('/reset-password/:token', resetPassword);

// A public route to check if an Employee ID is already in use.
router.get('/check-employee-id/:id', checkEmployeeId);

// A protected route to get the currently authenticated user's data
router.get('/me', authMiddleware, getCurrentUser);

// A protected route to handle Single Sign-On redirects to the GSO system
router.get('/sso/redirect/gso', authMiddleware, ssoRedirectGso);

// NEW: A protected route to handle Single Sign-On redirects to the IT Helpdesk system
router.get('/sso/redirect/helpdesk', authMiddleware, ssoRedirectHelpdesk);

// --- Google OAuth Routes ---

// Route to initiate Google login.
// This will redirect the user to Google's consent screen.
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// The callback route that Google redirects to after user consent.
// Passport handles the code exchange, and then our controller takes over.
router.get(
    '/google/callback',
    passport.authenticate('google', { failureRedirect: `${process.env.FRONTEND_URL}/index.html?error=google-auth-failed`, session: true }),
    googleCallback // Our custom controller function for success
);

module.exports = router;