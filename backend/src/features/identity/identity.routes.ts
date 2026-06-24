import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { introspectToken, hrisSyncWebhook } from './identity.controller';
import { validateSystemApiKey } from '../../middleware/apiKey.middleware';

const router = Router();

// Rate limiter: 100 requests per 15 minutes
const identityLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { message: 'Too many requests from this IP, please try again later.' }
});

// Applies limiter to all identity routes
router.use(identityLimiter);

// /api/v1/identity/introspect
// Accessible by PPEMS, ZONING, and HRIS systems
router.post('/introspect', 
    validateSystemApiKey('PPEMS', 'ZONING', 'HRIS'),
    introspectToken
);

// /api/v1/identity/hris-sync
router.post('/hris-sync', validateSystemApiKey('HRIS'), hrisSyncWebhook);

export default router;
