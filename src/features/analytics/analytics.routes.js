const express = require('express');
const router = express.Router();
const { getDashboardSummary, getMainAnalytics } = require('./analytics.controller.js');
const authMiddleware = require('@/middleware/auth.middleware.js');

// Route for the main dashboard's personalized stats
router.get('/dashboard-summary', authMiddleware, getDashboardSummary);

// Route for the dedicated Analytics page (for ICTO Head)
router.get('/summary', authMiddleware, getMainAnalytics);

module.exports = router;
