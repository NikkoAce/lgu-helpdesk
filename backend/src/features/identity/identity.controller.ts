import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { hrisSyncPayloadSchema } from './identity.validator';
import { processHrisSync, logHrisSyncRejection } from './identity.service';
import AuditLog from '../internal/auditLog.model';

export const introspectToken = async (req: Request, res: Response): Promise<any> => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ active: false });
        }

        const publicKey = process.env.PORTAL_PUBLIC_KEY ? process.env.PORTAL_PUBLIC_KEY.replace(/\\n/g, '\n') : '';
        if (!publicKey) {
            console.error('FATAL: PORTAL_PUBLIC_KEY not configured for introspection.');
            return res.status(500).json({ message: 'Server configuration error.' });
        }

        try {
            const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] }) as any;
            
            // Log introspection success
            await AuditLog.create({
                action: 'identity_api_access',
                performedBy: 'system',
                details: `Successful token introspection for user ${decoded.user?.employeeId}`
            }).catch(console.error);

            return res.status(200).json({
                active: true,
                sub: decoded.user?.id || '',
                employeeId: decoded.user?.employeeId || '',
                iss: decoded.iss || '',
                aud: decoded.aud || (Array.isArray(decoded.aud) ? decoded.aud : [decoded.aud].filter(Boolean))
            });
        } catch (verifyError) {
            return res.status(200).json({ active: false });
        }
    } catch (error: any) {
        console.error('Introspection Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const hrisSyncWebhook = async (req: Request, res: Response): Promise<any> => {
    try {
        const signature = req.headers['x-signature'] as string;
        if (!signature) {
            await logHrisSyncRejection('Missing X-Signature header');
            return res.status(401).json({ message: 'Unauthorized: Missing signature' });
        }

        const webhookSecret = process.env.HRIS_WEBHOOK_SECRET;
        if (!webhookSecret) {
            console.error('FATAL: HRIS_WEBHOOK_SECRET not configured.');
            return res.status(500).json({ message: 'Server configuration error' });
        }

        // Verify Signature
        const rawBody = JSON.stringify(req.body);
        const expectedSignature = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
        
        if (signature !== expectedSignature) {
            await logHrisSyncRejection('Invalid signature mismatch');
            return res.status(401).json({ message: 'Unauthorized: Invalid signature' });
        }

        // Validate Payload
        const validation = hrisSyncPayloadSchema.safeParse(req.body);
        if (!validation.success) {
            await logHrisSyncRejection(`Malformed payload: ${validation.error.message}`);
            return res.status(400).json({ message: 'Bad Request: Malformed payload', errors: validation.error.errors });
        }

        // Process accepted payload
        await processHrisSync(validation.data);

        return res.status(202).json({ message: 'Accepted' });
    } catch (error: any) {
        console.error('HRIS Sync Webhook Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
