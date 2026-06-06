import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        name: string;
        role: string;
        office: string;
        email: string;
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

export default authMiddleware;
