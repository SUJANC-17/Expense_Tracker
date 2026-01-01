import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import pool from '../config/db.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { getUserTableName } from '../utils/tableUtils.js';

// Get all friends for user
export const getFriends = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const uid = req.user?.uid!;
        const tableName = getUserTableName(uid, 'friends');
        const [rows] = await pool.query<RowDataPacket[]>(
            `SELECT * FROM \`${tableName}\` ORDER BY name ASC`
        );
        res.json(rows);
    } catch (error) {
        console.error('Error fetching friends:', error);
        res.status(500).json({ error: 'Failed to fetch friends' });
    }
};

// Add a new friend
export const addFriend = async (req: AuthRequest, res: Response): Promise<void> => {
    const { name } = req.body;

    if (!name) {
        res.status(400).json({ error: 'Friend name is required' });
        return;
    }

    try {
        const uid = req.user?.uid!;
        const tableName = getUserTableName(uid, 'friends');
        const [result] = await pool.query<ResultSetHeader>(
            `INSERT INTO \`${tableName}\` (name) VALUES (?)`,
            [name]
        );
        res.status(201).json({ id: result.insertId, name, message: 'Friend added successfully' });
    } catch (error: any) {
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ error: 'Friend already exists' });
            return;
        }
        console.error('Error adding friend:', error);
        res.status(500).json({ error: 'Failed to add friend' });
    }
};

// Delete a friend
export const deleteFriend = async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;

    try {
        const uid = req.user?.uid!;
        const tableName = getUserTableName(uid, 'friends');

        // Prevent deleting 'Myself' if needed, or just let it happen. 
        // Better to prevent it.
        const [friend] = await pool.query<RowDataPacket[]>(
            `SELECT name FROM \`${tableName}\` WHERE id = ?`,
            [id]
        );

        if (friend && friend[0] && friend[0].name === 'Myself') {
            res.status(403).json({ error: 'Cannot delete the "Myself" profile' });
            return;
        }

        const [result] = await pool.query<ResultSetHeader>(
            `DELETE FROM \`${tableName}\` WHERE id = ?`,
            [id]
        );

        if (result.affectedRows === 0) {
            res.status(404).json({ error: 'Friend not found' });
            return;
        }

        res.json({ message: 'Friend deleted successfully' });
    } catch (error) {
        console.error('Error deleting friend:', error);
        res.status(500).json({ error: 'Failed to delete friend' });
    }
};
