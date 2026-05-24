import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import db from '../config/db.js';
import { getUserTableName } from '../utils/tableUtils.js';

// Get all friends for user
export const getFriends = (req: AuthRequest, res: Response): void => {
    try {
        const uid = req.user?.uid!;
        const tableName = getUserTableName(uid, 'friends');
        const rows = db.prepare(
            `SELECT * FROM \`${tableName}\` ORDER BY name ASC`
        ).all();
        res.json(rows);
    } catch (error) {
        console.error('Error fetching friends:', error);
        res.status(500).json({ error: 'Failed to fetch friends' });
    }
};

// Add a new friend
export const addFriend = (req: AuthRequest, res: Response): void => {
    const { name } = req.body;

    if (!name) {
        res.status(400).json({ error: 'Friend name is required' });
        return;
    }

    try {
        const uid = req.user?.uid!;
        const tableName = getUserTableName(uid, 'friends');
        const result = db.prepare(
            `INSERT INTO \`${tableName}\` (name) VALUES (?)`
        ).run(name);
        res.status(201).json({ id: Number(result.lastInsertRowid), name, message: 'Friend added successfully' });
    } catch (error: any) {
        if (error.message.includes('UNIQUE constraint failed')) {
            res.status(400).json({ error: 'Friend already exists' });
            return;
        }
        console.error('Error adding friend:', error);
        res.status(500).json({ error: 'Failed to add friend' });
    }
};

// Delete a friend
export const deleteFriend = (req: AuthRequest, res: Response): void => {
    const { id } = req.params;

    try {
        const uid = req.user?.uid!;
        const tableName = getUserTableName(uid, 'friends');

        // Prevent deleting 'Myself'
        const friend = db.prepare(
            `SELECT name FROM \`${tableName}\` WHERE id = ?`
        ).get(id) as any;

        if (friend && friend.name === 'Myself') {
            res.status(403).json({ error: 'Cannot delete the "Myself" profile' });
            return;
        }

        const result = db.prepare(
            `DELETE FROM \`${tableName}\` WHERE id = ?`
        ).run(id);

        if (result.changes === 0) {
            res.status(404).json({ error: 'Friend not found' });
            return;
        }

        res.json({ message: 'Friend deleted successfully' });
    } catch (error) {
        console.error('Error deleting friend:', error);
        res.status(500).json({ error: 'Failed to delete friend' });
    }
};
