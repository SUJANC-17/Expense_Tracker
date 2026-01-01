import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import pool from '../config/db.js';
import type { ResultSetHeader } from 'mysql2/promise';
import { createUserTables } from '../models/userSchema.js';

const router = express.Router();

// Register or get user
router.post('/register', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const { uid, email } = req.user!;

        // Check if user exists
        const [existing] = await pool.query(
            'SELECT id FROM users WHERE id = ?',
            [uid]
        );

        if (Array.isArray(existing) && existing.length > 0) {
            // Ensure tables exist for existing users too
            await createUserTables(uid);
            res.json({ message: 'User already exists', uid });
            return;
        }

        // Create new user
        await pool.query<ResultSetHeader>(
            'INSERT INTO users (id, email) VALUES (?, ?)',
            [uid, email]
        );

        // Create user-specific tables
        await createUserTables(uid);

        res.status(201).json({ message: 'User registered successfully', uid });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'Failed to register user' });
    }
});

export default router;
