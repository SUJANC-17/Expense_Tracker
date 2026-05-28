import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import db from '../config/db.js';
import { createUserTables } from '../models/userSchema.js';

const router = express.Router();

// Register or get user
router.post('/register', authenticateToken, (req: AuthRequest, res) => {
    try {
        const { uid, email } = req.user!;

        // Check if user exists by ID or Email (in case Firebase UID changed for the same email)
        const existing = db.prepare('SELECT id FROM users WHERE id = ? OR email = ?').get(uid, email);

        if (existing) {
            // Update last_active_at, jwt_id, and id (to ensure it matches current Firebase UID)
            db.prepare(
                "UPDATE users SET id = ?, last_active_at = DATETIME('now', 'localtime'), jwt_id = ? WHERE email = ?"
            ).run(uid, uid, email);
            // Ensure tables exist for existing users too
            createUserTables(uid);
            res.json({ message: 'User authenticated', uid });
            return;
        }

        // Create new user with jwt_id
        db.prepare(
            'INSERT INTO users (id, email, jwt_id) VALUES (?, ?, ?)'
        ).run(uid, email, uid);

        // Create user-specific tables
        createUserTables(uid);

        res.status(201).json({ message: 'User registered successfully', uid });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'Failed to register user' });
    }
});

export default router;
