import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import pool from '../config/db.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { getUserTableName } from '../utils/tableUtils.js';
import { createUserTables } from '../models/userSchema.js';

// Get all split expenses for user
export const getSplits = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const uid = req.user?.uid!;

        // Ensure user tables exist
        await createUserTables(uid);

        const tableName = getUserTableName(uid, 'splits');

        console.log(`Fetching splits from table: ${tableName}`);

        const [rows] = await pool.query<RowDataPacket[]>(
            `SELECT * FROM \`${tableName}\` ORDER BY date DESC`
        );

        console.log(`Found ${rows.length} splits`);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching splits:', error);
        res.status(500).json({ error: 'Failed to fetch split expenses' });
    }
};

// Get unpaid splits
export const getUnpaidSplits = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const uid = req.user?.uid!;
        const tableName = getUserTableName(uid, 'splits');
        const [rows] = await pool.query<RowDataPacket[]>(
            `SELECT * FROM \`${tableName}\` WHERE is_paid = FALSE ORDER BY date DESC`
        );
        res.json(rows);
    } catch (error) {
        console.error('Error fetching unpaid splits:', error);
        res.status(500).json({ error: 'Failed to fetch unpaid splits' });
    }
};

// Add new split expense
export const addSplit = async (req: AuthRequest, res: Response): Promise<void> => {
    const { friend_id, friend_name, amount, description, date } = req.body;

    console.log('Adding split with data:', { friend_id, friend_name, amount, description, date });

    if ((amount === undefined || amount === null || amount === '') || !date) {
        res.status(400).json({ error: 'Amount and date are required' });
        return;
    }

    try {
        const uid = req.user?.uid!;

        // Ensure user tables exist
        await createUserTables(uid);

        const tableName = getUserTableName(uid, 'splits');

        console.log(`Inserting into table: ${tableName}`);

        const [result] = await pool.query<ResultSetHeader>(
            `INSERT INTO \`${tableName}\` (friend_id, friend_name, amount, description, date, is_paid) VALUES (?, ?, ?, ?, ?, FALSE)`,
            [friend_id || null, friend_name || null, parseFloat(amount), description || null, date]
        );

        console.log('Split inserted successfully:', result.insertId);
        res.status(201).json({ id: result.insertId, message: 'Split expense added successfully' });
    } catch (error) {
        console.error('Error adding split:', error);
        res.status(500).json({ error: `Failed to add split expense: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
};

// Add splits in bulk (including personal expense)
export const addSplitBulk = async (req: AuthRequest, res: Response): Promise<void> => {
    const { totalAmount, description, date, userShare, splits } = req.body;

    if ((totalAmount === undefined || totalAmount === null || totalAmount === '') || !date || !Array.isArray(splits)) {
        res.status(400).json({ error: 'Total amount, date, and splits array are required' });
        return;
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
        const uid = req.user?.uid!;

        // Ensure user tables exist
        await createUserTables(uid);

        const splitTable = getUserTableName(uid, 'splits');
        const expenseTable = getUserTableName(uid, 'expenses');

        // 1. Handle user's personal share as an expense
        if (userShare && parseFloat(userShare) > 0) {
            // Find 'Split' category ID
            const [categories] = await connection.query<RowDataPacket[]>(
                'SELECT id FROM categories WHERE name = ?',
                ['Split']
            );

            let categoryId = categories[0]?.id;
            if (!categoryId) {
                // Fallback to 'Other' if 'Split' doesn't exist
                const [otherCat] = await connection.query<RowDataPacket[]>(
                    'SELECT id FROM categories WHERE name = ?',
                    ['Other']
                );
                categoryId = otherCat[0]?.id || 1;
            }

            await connection.query(
                `INSERT INTO \`${expenseTable}\` (amount, category_id, description, date) VALUES (?, ?, ?, ?)`,
                [parseFloat(userShare), categoryId, description || 'Personal share of split', date]
            );
        }

        // 2. Handle friend splits
        for (const split of splits) {
            await connection.query(
                `INSERT INTO \`${splitTable}\` (friend_id, friend_name, amount, description, date, is_paid) VALUES (?, ?, ?, ?, ?, FALSE)`,
                [split.friend_id || null, split.friend_name || null, parseFloat(split.amount), description || null, date]
            );
        }

        await connection.commit();
        res.status(201).json({ message: 'Bulk splits and expenses created successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('Error in addSplitBulk:', error);
        res.status(500).json({ error: 'Failed to process bulk split' });
    } finally {
        connection.release();
    }
};

// Mark split as paid
export const markSplitPaid = async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    try {
        const uid = req.user?.uid!;
        const tableName = getUserTableName(uid, 'splits');
        const [result] = await pool.query<ResultSetHeader>(
            `UPDATE \`${tableName}\` SET is_paid = TRUE, paid_at = ? WHERE id = ?`,
            [now, id]
        );

        if (result.affectedRows === 0) {
            res.status(404).json({ error: 'Split expense not found' });
            return;
        }

        res.json({ message: 'Split marked as paid' });
    } catch (error) {
        console.error('Error marking split as paid:', error);
        res.status(500).json({ error: 'Failed to mark split as paid' });
    }
};

// Update split
export const updateSplit = async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const { friend_name, amount, description, date, is_paid } = req.body;

    try {
        const uid = req.user?.uid!;
        const tableName = getUserTableName(uid, 'splits');
        const [result] = await pool.query<ResultSetHeader>(
            `UPDATE \`${tableName}\` SET friend_name = ?, amount = ?, description = ?, date = ?, is_paid = ? WHERE id = ?`,
            [friend_name, amount, description, date, is_paid, id]
        );

        if (result.affectedRows === 0) {
            res.status(404).json({ error: 'Split expense not found' });
            return;
        }

        res.json({ message: 'Split updated successfully' });
    } catch (error) {
        console.error('Error updating split:', error);
        res.status(500).json({ error: 'Failed to update split' });
    }
};

// Delete split
export const deleteSplit = async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;

    try {
        const uid = req.user?.uid!;
        const tableName = getUserTableName(uid, 'splits');
        const [result] = await pool.query<ResultSetHeader>(
            `DELETE FROM \`${tableName}\` WHERE id = ?`,
            [id]
        );

        if (result.affectedRows === 0) {
            res.status(404).json({ error: 'Split expense not found' });
            return;
        }

        res.json({ message: 'Split deleted successfully' });
    } catch (error) {
        console.error('Error deleting split:', error);
        res.status(500).json({ error: 'Failed to delete split' });
    }
};
