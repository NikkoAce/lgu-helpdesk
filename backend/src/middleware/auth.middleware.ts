import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

if (!process.env.JWT_SECRET) {
    throw new Error('FATAL: JWT_SECRET environment variable is missing.');
}
const JWT_SECRET = process.env.JWT_SECRET;

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
    const token = req.cookies?.portalAuthToken;

    if (!token) {
        res.status(401).json({ message: 'Access denied. No token provided.' });
        return;
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { user: NonNullable<AuthenticatedRequest['user']> };
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
