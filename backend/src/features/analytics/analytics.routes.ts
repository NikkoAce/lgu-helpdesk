import express from 'express';
import { getDashboardSummary, getMainAnalytics } from './analytics.controller';
import authMiddleware from '../../middleware/auth.middleware';

const router = express.Router();

router.get('/dashboard-summary', authMiddleware as any, getDashboardSummary as any);
router.get('/summary', authMiddleware as any, getMainAnalytics as any);

export default router;
