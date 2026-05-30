import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-env';
if (!process.env.JWT_SECRET) {
    console.warn('JWT_SECRET is not set; using fallback admin secret. Set JWT_SECRET in .env for production.');
}

export interface AdminAuthRequest extends Request {
    admin?: {
        email: string;
    };
}

export const authenticateAdmin = (
    req: AdminAuthRequest,
    res: Response,
    next: NextFunction
): void => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        res.status(401).json({ error: 'Admin access token required' });
        return;
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { email: string };
        req.admin = decoded;
        next();
    } catch (error) {
        console.error('Admin token verification failed:', error);
        res.status(403).json({ error: 'Invalid or expired admin token' });
        return;
    }
};
