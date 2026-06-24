import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

if (!process.env.PORTAL_PUBLIC_KEY) {
    console.warn('WARNING: PORTAL_PUBLIC_KEY environment variable is missing. RS256 verification may fail.');
}
const PUBLIC_KEY = process.env.PORTAL_PUBLIC_KEY ? process.env.PORTAL_PUBLIC_KEY.replace(/\\n/g, '\n') : '';

export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        name: string;
        role: string;
        office: string;
        email: string;
        systemAccess?: string[];
    };
}

const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    // req.cookies is populated by cookie-parser middleware
    let token = req.cookies?.portalAuthToken;
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        const bearerToken = req.headers.authorization.split(' ')[1];
        if (bearerToken !== 'null' && bearerToken !== 'undefined') {
            token = bearerToken;
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Access denied. No token provided.' });
        return;
    }

    try {
        if (!PUBLIC_KEY) {
            throw new Error('Server missing public key configuration.');
        }
        const decoded = jwt.verify(token, PUBLIC_KEY, { algorithms: ['RS256'] }) as { user: NonNullable<AuthenticatedRequest['user']> };
        req.user = decoded.user;
        next();
    } catch (ex) {
        res.status(400).json({ message: 'Invalid token.' });
    }
};

export const requireRole = (allowedRoles: string[]) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
        if (!req.user || !req.user.role) {
            res.status(401).json({ message: 'Access denied. No user role found.' });
            return;
        }

        const userRoles = req.user.role.split(',').map(r => r.trim());
        const hasRole = userRoles.some(role => allowedRoles.includes(role));

        if (!hasRole) {
            res.status(403).json({ message: `Forbidden: Requires one of the following roles: ${allowedRoles.join(', ')}` });
            return;
        }

        next();
    };
};

export const requireSystemAccess = (systemName: string) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
        if (!req.user || !req.user.systemAccess) {
            res.status(401).json({ message: 'Access denied. No system access found.' });
            return;
        }

        if (!req.user.systemAccess.includes(systemName)) {
            res.status(403).json({ message: `Forbidden: Requires access to system '${systemName}'` });
            return;
        }

        next();
    };
};

export default authMiddleware;
