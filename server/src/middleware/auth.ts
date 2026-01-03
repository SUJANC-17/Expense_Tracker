import type { Request, Response, NextFunction } from 'express';
import admin from '../config/firebase.js';
import pool from '../config/db.js';

export interface AuthRequest extends Request {
    user?: {
        uid: string;
        email?: string;
    };
}

export const authenticateToken = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    const authHeader = req.headers.authorization;
    console.log(`[Auth] Request to ${req.path} - Header Present: ${!!authHeader}`);
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        console.warn('[Auth] No token provided');
        res.status(401).json({ error: 'Access token required' });
        return;
    }

    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = {
            uid: decodedToken.uid,
            ...(decodedToken.email && { email: decodedToken.email }),
        };

        // Update last activity timestamp (fire and forget)
        pool.query('UPDATE users SET last_active_at = NOW() WHERE id = ?', [decodedToken.uid])
            .catch(err => console.error('Failed to update last_active_at:', err));

        next();
    } catch (error) {
        console.error('Token verification error:', error);
        res.status(403).json({ error: 'Invalid or expired token' });
    }
};
