import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import db from '../config/db.js';
import { createUserTables } from '../models/userSchema.js';
import admin from '../config/firebase.js';
import { sendLoginNotification, sendPasswordResetEmail } from '../services/emailService.js';

const router = express.Router();

// Register or get user
router.post('/register', authenticateToken, (req: AuthRequest, res) => {
    try {
        const { uid, email } = req.user!;
        const { username } = req.body;

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
            return;
        }

        db.prepare(
            'INSERT INTO users (id, username, email) VALUES (?, ?, ?)'
        ).run(uid, username || email?.split('@')[0] || null, email);

        // Create user-specific tables
        createUserTables(uid);

        const user = db.prepare('SELECT id, username, email, created_at FROM users WHERE id = ?').get(uid);
        res.status(201).json({ message: 'User registered successfully', user });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'Failed to register user' });
    }
});

// Confirm login and send notification email after a successful authenticated sign-in
router.post('/login', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const { uid, email } = req.user!;
        const userRow = db.prepare('SELECT email FROM users WHERE id = ? OR email = ?').get(uid, email || null) as any;
        const targetEmail = email || userRow?.email;

        if (targetEmail) {
            await sendLoginNotification(targetEmail);
        }

        res.json({
            message: 'Login confirmed',
            notificationSent: Boolean(targetEmail),
        });
    } catch (error) {
        console.error('Error sending login notification:', error);
        res.status(500).json({ error: 'Failed to send login notification' });
    }
});

// Send password reset email using Firebase-generated reset link and existing SMTP transport
router.post('/password-reset', async (req, res) => {
    const { email } = req.body ?? {};

    if (!email || typeof email !== 'string') {
        res.status(400).json({ error: 'Email is required' });
        return;
    }

    try {
        const resetLink = await admin.auth().generatePasswordResetLink(email.trim());
        await sendPasswordResetEmail(email.trim(), resetLink);

        res.json({
            message: 'Password reset email sent',
        });
    } catch (error: any) {
        console.error('Error sending password reset email:', error);

        const code = error?.code || '';
        if (code === 'auth/user-not-found') {
            res.status(404).json({ error: 'No account found with this email. Please sign up.' });
            return;
        }

        if (code === 'auth/invalid-email') {
            res.status(400).json({ error: 'Please enter a valid email address.' });
            return;
        }

        res.status(500).json({ error: 'Failed to send password reset email' });
    }
});

export default router;
