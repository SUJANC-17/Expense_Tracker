import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import db from '../config/db.js';
import { getOutstandingSplitBalances, roundCurrency } from '../services/splitBalanceService.js';

// Get all split expenses for user
export const getSplits = (req: AuthRequest, res: Response): void => {
    try {
        const uid = req.user?.uid!;
        const rows = db.prepare(
            'SELECT id, user_id as userId, friend_id, friend_name as friendName, friend_name, amount, description, is_paid as isPaid, is_paid, paid_at as paidAt, paid_at, date, created_at as createdAt FROM splits WHERE user_id = ? ORDER BY date DESC'
        ).all(uid);

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
        const rows = db.prepare(
            'SELECT id, user_id as userId, friend_id, friend_name as friendName, friend_name, amount, description, is_paid as isPaid, is_paid, paid_at as paidAt, paid_at, date, created_at as createdAt FROM splits WHERE user_id = ? AND is_paid = 0 ORDER BY date DESC'
        ).all(uid);
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
        const result = db.prepare(
            'INSERT INTO splits (user_id, friend_id, friend_name, amount, description, date, is_paid) VALUES (?, ?, ?, ?, ?, ?, 0)'
        ).run(uid, friend_id || null, friend_name || null, parseFloat(amount), description || null, date);

        console.log('Split inserted successfully:', result.lastInsertRowid);
        const newSplit = db.prepare(
            'SELECT id, user_id as userId, friend_id, friend_name as friendName, friend_name, amount, description, is_paid as isPaid, is_paid, paid_at as paidAt, paid_at, date, created_at as createdAt FROM splits WHERE id = ? AND user_id = ?'
        ).get(result.lastInsertRowid, uid);

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
        const normalizedTotalAmount = roundCurrency(parseFloat(totalAmount));
        const normalizedUserShare = userShare === undefined || userShare === null || userShare === ''
            ? 0
            : roundCurrency(parseFloat(userShare));
        const normalizedSplits = splits.map((split) => ({
            ...split,
            amount: roundCurrency(parseFloat(split.amount)),
        }));
        const assignedTotal = roundCurrency(
            normalizedUserShare + normalizedSplits.reduce((sum, split) => sum + split.amount, 0)
        );

        if (normalizedTotalAmount <= 0) {
            res.status(400).json({ error: 'Total amount must be greater than 0' });
            return;
        }

        if (normalizedSplits.length === 0) {
            res.status(400).json({ error: 'At least one friend split is required' });
            return;
        }

        if (normalizedUserShare <= 0) {
            res.status(400).json({ error: 'Payer share is required. The payer must be included in the split.' });
            return;
        }

        if (Math.abs(assignedTotal - normalizedTotalAmount) > 0.01) {
            res.status(400).json({ error: 'Split shares must add up to the total amount' });
            return;
        }

        db.transaction(() => {
            // 1. Handle user's personal share as an expense
            if (normalizedUserShare > 0) {
                // Find 'Split' category ID
                let category = db.prepare('SELECT id FROM categories WHERE name = ?').get('Split') as any;

                let categoryId = category?.id;
                if (!categoryId) {
                    // Fallback to 'Other' if 'Split' doesn't exist
                    category = db.prepare('SELECT id FROM categories WHERE name = ?').get('Other') as any;
                    categoryId = category?.id || 1;
                }

                db.prepare(
                    'INSERT INTO expenses (user_id, amount, category_id, description, date) VALUES (?, ?, ?, ?, ?)'
                ).run(uid, normalizedUserShare, categoryId, description || 'Personal share of split', date);
            }

            // 2. Handle friend splits
            const insertSplit = db.prepare(
                'INSERT INTO splits (user_id, friend_id, friend_name, amount, description, date, is_paid) VALUES (?, ?, ?, ?, ?, ?, 0)'
            );
            for (const split of normalizedSplits) {
                insertSplit.run(uid, split.friend_id || null, split.friend_name || null, split.amount, description || null, date);
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
        const result = db.prepare(
            'UPDATE splits SET is_paid = 1, paid_at = ? WHERE id = ? AND user_id = ?'
        ).run(now, id, uid);

        if (result.changes === 0) {
            res.status(404).json({ error: 'Split expense not found' });
            return;
        }

        const updated = db.prepare(
            'SELECT id, user_id as userId, friend_id, friend_name as friendName, friend_name, amount, description, is_paid as isPaid, is_paid, paid_at as paidAt, paid_at, date, created_at as createdAt FROM splits WHERE id = ? AND user_id = ?'
        ).get(id, uid);
        res.json(updated);
    } catch (error) {
        console.error('Error marking split as paid:', error);
        res.status(500).json({ error: 'Failed to mark split as paid' });
    }
};

// Update split
export const updateSplit = (req: AuthRequest, res: Response): void => {
    const { id } = req.params;
    const { friend_name, friendName, amount, description, date, is_paid, isPaid } = req.body;

    try {
        const uid = req.user?.uid!;
        const paidValue = is_paid ?? isPaid;
        const result = db.prepare(
            `UPDATE splits
             SET friend_name = COALESCE(?, friend_name),
                 amount = COALESCE(?, amount),
                 description = COALESCE(?, description),
                 date = COALESCE(?, date),
                 is_paid = COALESCE(?, is_paid)
             WHERE id = ? AND user_id = ?`
        ).run(
            friend_name ?? friendName ?? null,
            amount ?? null,
            description ?? null,
            date ?? null,
            paidValue === undefined ? null : (paidValue ? 1 : 0),
            id,
            uid
        );

        if (result.changes === 0) {
            res.status(404).json({ error: 'Split expense not found' });
            return;
        }

        const updated = db.prepare(
            'SELECT id, user_id as userId, friend_id, friend_name as friendName, friend_name, amount, description, is_paid as isPaid, is_paid, paid_at as paidAt, paid_at, date, created_at as createdAt FROM splits WHERE id = ? AND user_id = ?'
        ).get(id, uid);
        res.json(updated);
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
        const result = db.prepare(
            'DELETE FROM splits WHERE id = ? AND user_id = ?'
        ).run(id, uid);

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

export const getSplitBalances = (req: AuthRequest, res: Response): void => {
    try {
        const uid = req.user?.uid!;
        const { year, month } = req.query;
        const balances = getOutstandingSplitBalances(uid, {
            ...(typeof year === 'string' ? { year } : {}),
            ...(typeof month === 'string' ? { month } : {}),
        });

        res.json(balances);
    } catch (error) {
        console.error('Error fetching split balances:', error);
        res.status(500).json({ error: 'Failed to fetch split balances' });
    }
};

// Mark multiple splits as paid in bulk
export const markSplitsPaidBulk = (req: AuthRequest, res: Response): void => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({ error: 'List of IDs must be provided' });
        return;
    }
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    try {
        const uid = req.user?.uid!;
        const updateStmt = db.prepare(
            'UPDATE splits SET is_paid = 1, paid_at = ? WHERE id = ? AND user_id = ?'
        );

        db.transaction(() => {
            for (const id of ids) {
                updateStmt.run(now, id, uid);
            }
        })();

        // Fetch all the updated split records to send back
        const placeholders = ids.map(() => '?').join(',');
        const updated = db.prepare(
            `SELECT id, user_id as userId, friend_id, friend_name as friendName, friend_name, amount, description, is_paid as isPaid, is_paid, paid_at as paidAt, paid_at, date, created_at as createdAt FROM splits WHERE id IN (${placeholders}) AND user_id = ?`
        ).all(...ids, uid);

        res.json(updated);
    } catch (error) {
        console.error('Error marking splits as paid in bulk:', error);
        res.status(500).json({ error: 'Failed to mark splits as paid in bulk' });
    }
};

