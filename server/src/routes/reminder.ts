import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import db from '../config/db.js';
import { DEFAULT_REMINDER_TIME, normalizeReminderTime, toBooleanFlag } from '../utils/reminder.js';

const router = express.Router();

router.get('/reminder-settings', authenticateToken, (req: AuthRequest, res) => {
    try {
        const uid = req.user?.uid!;
        const settings = db.prepare(
            `SELECT
                COALESCE(reminder_enabled, 1) AS reminder_enabled,
                COALESCE(reminder_time, ?) AS reminder_time
             FROM users
             WHERE id = ?`
        ).get(DEFAULT_REMINDER_TIME, uid) as any;

        if (!settings) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        res.json({
            reminderEnabled: Boolean(settings.reminder_enabled),
            reminderTime: settings.reminder_time || DEFAULT_REMINDER_TIME,
        });
    } catch (error) {
        console.error('Error loading reminder settings:', error);
        res.status(500).json({ error: 'Failed to load reminder settings' });
    }
});

router.put('/reminder-settings', authenticateToken, (req: AuthRequest, res) => {
    try {
        const uid = req.user?.uid!;
        const reminderEnabled = toBooleanFlag(req.body?.reminderEnabled ?? req.body?.reminder_enabled, true);
        const reminderTime = normalizeReminderTime(req.body?.reminderTime ?? req.body?.reminder_time);

        if (!reminderTime) {
            res.status(400).json({ error: 'Reminder time must be in HH:MM format' });
            return;
        }

        const result = db.prepare(
            `UPDATE users
             SET reminder_enabled = ?, reminder_time = ?, last_active_at = DATETIME('now', 'localtime')
             WHERE id = ?`
        ).run(reminderEnabled, reminderTime, uid);

        if (result.changes === 0) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        res.json({
            message: 'Reminder settings saved',
            reminderEnabled: Boolean(reminderEnabled),
            reminderTime,
        });
    } catch (error) {
        console.error('Error saving reminder settings:', error);
        res.status(500).json({ error: 'Failed to save reminder settings' });
    }
});

export default router;
