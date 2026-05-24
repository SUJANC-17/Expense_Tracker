import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import db from '../config/db.js';
import { getUserTableName } from '../utils/tableUtils.js';
import { createUserTables } from '../models/userSchema.js';

// Get all split expenses for user
export const getSplits = (req: AuthRequest, res: Response): void => {
    try {
        const uid = req.user?.uid!;

        // Ensure user tables exist
        createUserTables(uid);

        const tableName = getUserTableName(uid, 'splits');

        console.log(`Fetching splits from table: ${tableName}`);

        const rows = db.prepare(
            `SELECT * FROM \`${tableName}\` ORDER BY date DESC`
        ).all();

        console.log(`Found ${rows.length} splits`);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching splits:', error);
        res.status(500).json({ error: 'Failed to fetch split expenses' });
    }
};

// Get unpaid splits
export const getUnpaidSplits = (req: AuthRequest, res: Response): void => {
    try {
        const uid = req.user?.uid!;
        const tableName = getUserTableName(uid, 'splits');
        const rows = db.prepare(
            `SELECT * FROM \`${tableName}\` WHERE is_paid = 0 ORDER BY date DESC`
        ).all();
        res.json(rows);
    } catch (error) {
        console.error('Error fetching unpaid splits:', error);
        res.status(500).json({ error: 'Failed to fetch unpaid splits' });
    }
};

// Add new split expense
export const addSplit = (req: AuthRequest, res: Response): void => {
    const { friend_id, friend_name, amount, description, date } = req.body;

    console.log('Adding split with data:', { friend_id, friend_name, amount, description, date });

    if ((amount === undefined || amount === null || amount === '') || !date) {
        res.status(400).json({ error: 'Amount and date are required' });
        return;
    }

    try {
        const uid = req.user?.uid!;

        // Ensure user tables exist
        createUserTables(uid);

        const tableName = getUserTableName(uid, 'splits');

        console.log(`Inserting into table: ${tableName}`);

        const result = db.prepare(
            `INSERT INTO \`${tableName}\` (friend_id, friend_name, amount, description, date, is_paid) VALUES (?, ?, ?, ?, ?, 0)`
        ).run(friend_id || null, friend_name || null, parseFloat(amount), description || null, date);

        console.log('Split inserted successfully:', result.lastInsertRowid);
        const newSplit = db.prepare(
            `SELECT * FROM \`${tableName}\` WHERE id = ?`
        ).get(result.lastInsertRowid);

        res.status(201).json({
            ...newSplit as object,
            message: 'Split expense added successfully'
        });
    } catch (error) {
        console.error('Error adding split:', error);
        res.status(500).json({ error: `Failed to add split expense: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
};

// Add splits in bulk (including personal expense)
export const addSplitBulk = (req: AuthRequest, res: Response): void => {
    const { totalAmount, description, date, userShare, splits } = req.body;

    if ((totalAmount === undefined || totalAmount === null || totalAmount === '') || !date || !Array.isArray(splits)) {
        res.status(400).json({ error: 'Total amount, date, and splits array are required' });
        return;
    }

    try {
        const uid = req.user?.uid!;

        // Ensure user tables exist
        createUserTables(uid);

        const splitTable = getUserTableName(uid, 'splits');
        const expenseTable = getUserTableName(uid, 'expenses');

        db.transaction(() => {
            // 1. Handle user's personal share as an expense
            if (userShare && parseFloat(userShare) > 0) {
                // Find 'Split' category ID
                let category = db.prepare('SELECT id FROM categories WHERE name = ?').get('Split') as any;

                let categoryId = category?.id;
                if (!categoryId) {
                    // Fallback to 'Other' if 'Split' doesn't exist
                    category = db.prepare('SELECT id FROM categories WHERE name = ?').get('Other') as any;
                    categoryId = category?.id || 1;
                }

                db.prepare(
                    `INSERT INTO \`${expenseTable}\` (amount, category_id, description, date) VALUES (?, ?, ?, ?)`
                ).run(parseFloat(userShare), categoryId, description || 'Personal share of split', date);
            }

            // 2. Handle friend splits
            const insertSplit = db.prepare(
                `INSERT INTO \`${splitTable}\` (friend_id, friend_name, amount, description, date, is_paid) VALUES (?, ?, ?, ?, ?, 0)`
            );
            for (const split of splits) {
                insertSplit.run(split.friend_id || null, split.friend_name || null, parseFloat(split.amount), description || null, date);
            }
        })();

        res.status(201).json({ message: 'Bulk splits and expenses created successfully' });
    } catch (error) {
        console.error('Error in addSplitBulk:', error);
        res.status(500).json({ error: 'Failed to process bulk split' });
    }
};

// Mark split as paid
export const markSplitPaid = (req: AuthRequest, res: Response): void => {
    const { id } = req.params;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    try {
        const uid = req.user?.uid!;
        const tableName = getUserTableName(uid, 'splits');
        const result = db.prepare(
            `UPDATE \`${tableName}\` SET is_paid = 1, paid_at = ? WHERE id = ?`
        ).run(now, id);

        if (result.changes === 0) {
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
export const updateSplit = (req: AuthRequest, res: Response): void => {
    const { id } = req.params;
    const { friend_name, amount, description, date, is_paid } = req.body;

    try {
        const uid = req.user?.uid!;
        const tableName = getUserTableName(uid, 'splits');
        const result = db.prepare(
            `UPDATE \`${tableName}\` SET friend_name = ?, amount = ?, description = ?, date = ?, is_paid = ? WHERE id = ?`
        ).run(friend_name, amount, description, date, is_paid ? 1 : 0, id);

        if (result.changes === 0) {
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
export const deleteSplit = (req: AuthRequest, res: Response): void => {
    const { id } = req.params;

    try {
        const uid = req.user?.uid!;
        const tableName = getUserTableName(uid, 'splits');
        const result = db.prepare(
            `DELETE FROM \`${tableName}\` WHERE id = ?`
        ).run(id);

        if (result.changes === 0) {
            res.status(404).json({ error: 'Split expense not found' });
            return;
        }

        res.json({ message: 'Split deleted successfully' });
    } catch (error) {
        console.error('Error deleting split:', error);
        res.status(500).json({ error: 'Failed to delete split' });
    }
};
