import { Request, Response, NextFunction } from 'express';
import AuditLog from '../features/internal/auditLog.model';

// TODO: PHASE 4 - Move API keys into SystemClient collection.
export const validateSystemApiKey = (...systemNames: string[]) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const apiKey = req.headers['x-api-key'] || req.headers['x-system-api-key'];

        if (!apiKey) {
            res.status(401).json({ message: 'Access denied. Missing API key.' });
            return;
        }

        let matchedSystem: string | null = null;
        for (const systemName of systemNames) {
            const envKey = `${systemName.toUpperCase()}_API_KEY`;
            const expectedKey = process.env[envKey];
            if (expectedKey && apiKey === expectedKey) {
                matchedSystem = systemName;
                break;
            }
        }

        if (!matchedSystem) {
            res.status(403).json({ message: 'Forbidden. Invalid or missing API key for permitted systems.' });
            return;
        }

        // Log the API access event
        try {
            await AuditLog.create({
                action: 'system_api_key_used',
                performedBy: 'system',
                details: `System API key for ${matchedSystem} used on ${req.originalUrl}`
            });
        } catch (err) {
            console.error('Failed to write audit log for API key access:', err);
        }

        next();
    };
};
