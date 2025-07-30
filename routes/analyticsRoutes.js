const express = require('express');
const router = express.Router();
const { getDashboardSummary, getMainAnalytics } = require('../controllers/analyticsController');
const authMiddleware = require('../middleware/authMiddleware');

// Route for the main dashboard's personalized stats
router.get('/dashboard-summary', authMiddleware, getDashboardSummary);

// Route for the dedicated Analytics page (for ICTO Head)
router.get('/summary', authMiddleware, getMainAnalytics);

module.exports = router;
