import express from 'express';
import passport from 'passport';
import rateLimit from 'express-rate-limit';
import {
    registerUser,
    loginUser,
    forgotPassword,
    resetPassword,
    logoutUser,
    getCurrentUser,
    ssoRedirectGso,
    ssoRedirectHelpdesk,
    googleCallback,
    checkEmployeeId,
    changePassword
} from './auth.controller';
import authMiddleware from '../../middleware/auth.middleware';

const router = express.Router();

const forgotPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: 'Too many password reset requests from this IP. Please try again after 15 minutes.'
    }
});

// Login rate limiter (Security Audit recommendation)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30, // limit each IP to 30 login requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: 'Too many login attempts. Please try again after 15 minutes.'
    }
});

router.post('/register', registerUser);
router.post('/login', loginLimiter, loginUser);
router.post('/logout', logoutUser);
router.put('/change-password', authMiddleware as any, changePassword as any);
router.post('/forgot-password', forgotPasswordLimiter, forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.get('/check-employee-id/:id', checkEmployeeId);
router.get('/me', authMiddleware as any, getCurrentUser as any);
router.get('/sso/redirect/gso', authMiddleware as any, ssoRedirectGso as any);
router.get('/sso/redirect/helpdesk', authMiddleware as any, ssoRedirectHelpdesk as any);

// Google OAuth routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get(
    '/google/callback',
    passport.authenticate('google', { 
        failureRedirect: `${process.env.FRONTEND_URL}/index.html?error=google-auth-failed`,
        session: false // Disable express-session serialization to use JWT cookies exclusively
    }),
    googleCallback
);

export default router;