import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET must be set in the environment');
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
