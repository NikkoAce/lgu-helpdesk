import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { sendNotification } from './internal.controller';

const router = Router();

import { validateSystemApiKey } from '../../middleware/apiKey.middleware';

const notifyLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: { success: false, message: 'Too many notification requests from this IP, please try again later.' }
});

router.post('/notify', notifyLimiter, validateSystemApiKey('PPEMS', 'ZONING'), sendNotification);

export default router;
