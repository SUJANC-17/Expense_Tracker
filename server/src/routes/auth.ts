import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import db from '../config/db.js';
import { createUserTables } from '../models/userSchema.js';
import { sendLoginNotification } from '../services/emailService.js';

const router = express.Router();

// Register or get user
router.post('/register', authenticateToken, (req: AuthRequest, res) => {
    try {
        const { uid, email } = req.user!;
        const { notifyLogin, username } = req.body;

        // Check if user exists by ID or Email (in case Firebase UID changed for the same email)
        const existing = db.prepare('SELECT id, username, last_active_at FROM users WHERE id = ? OR email = ?').get(uid, email) as any;

        if (existing) {
            // Update last_active_at and id to ensure it matches current Firebase UID.
            db.prepare(
                "UPDATE users SET id = ?, username = COALESCE(?, username), last_active_at = DATETIME('now', 'localtime') WHERE email = ?"
            ).run(uid, username || null, email);
            // Ensure tables exist for existing users too
            createUserTables(uid);
            const user = db.prepare('SELECT id, username, email, created_at FROM users WHERE id = ?').get(uid);
            res.json({ message: 'User authenticated', user });

            if (email && notifyLogin) {
                sendLoginNotification(email).catch(console.error);
            }
            return;
        }

        db.prepare(
            'INSERT INTO users (id, username, email) VALUES (?, ?, ?)'
        ).run(uid, username || email?.split('@')[0] || null, email);

        // Create user-specific tables
        createUserTables(uid);

        const user = db.prepare('SELECT id, username, email, created_at FROM users WHERE id = ?').get(uid);
        res.status(201).json({ message: 'User registered successfully', user });
        
        if (email && notifyLogin) {
            sendLoginNotification(email).catch(console.error);
        }
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'Failed to register user' });
    }
});

export default router;
