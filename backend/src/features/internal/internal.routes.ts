import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { sendNotification } from './internal.controller';

const router = Router();

const verifyInternalApiKey = (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.INTERNAL_API_KEY) {
        return res.status(401).json({ success: false, message: 'Unauthorized: Invalid API Key' });
    }
    next();
};

const notifyLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: { success: false, message: 'Too many notification requests from this IP, please try again later.' }
});

router.post('/notify', notifyLimiter, verifyInternalApiKey, sendNotification);

export default router;
