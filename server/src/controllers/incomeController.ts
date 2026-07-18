import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import db from '../config/db.js';

// Get all incomes for user (supports optional ?limit=N&offset=M&year=YYYY&month=MM)
export const getIncomes = (req: AuthRequest, res: Response): void => {
    try {
        const uid = req.user?.uid!;
        const { limit, offset, year, month } = req.query;

        const isPaginated = limit !== undefined;
        const limitVal  = isPaginated ? Math.max(1, Math.min(500, parseInt(String(limit), 10) || 50)) : null;
        const offsetVal = isPaginated ? Math.max(0, parseInt(String(offset), 10) || 0) : 0;

        const dateFilter = year && month
            ? `AND strftime('%Y', date) = ? AND strftime('%m', date) = ?`
            : year
            ? `AND strftime('%Y', date) = ?`
            : '';
        const dateParams: string[] = year && month
            ? [String(year), String(month).padStart(2, '0')]
            : year
            ? [String(year)]
            : [];

        const baseWhere = `WHERE user_id = ? ${dateFilter}`;
        const queryParams = [uid, ...dateParams];

        if (isPaginated) {
            const total = (db.prepare(
                `SELECT COUNT(*) as cnt FROM incomes ${baseWhere}`
            ).get(...queryParams) as any)?.cnt ?? 0;

            const rows = db.prepare(
                `SELECT id, user_id as userId, amount, source, description, date, created_at as createdAt
                 FROM incomes
                 ${baseWhere}
                 ORDER BY date DESC
                 LIMIT ? OFFSET ?`
            ).all(...queryParams, limitVal!, offsetVal);

            res.json({ data: rows, total, limit: limitVal, offset: offsetVal });
        } else {
            const rows = db.prepare(
                `SELECT id, user_id as userId, amount, source, description, date, created_at as createdAt
                 FROM incomes
                 ${baseWhere}
                 ORDER BY date DESC`
            ).all(...queryParams);

            res.json(rows);
        }
    } catch (error) {
        console.error('Error fetching incomes:', error);
        res.status(500).json({ error: 'Failed to fetch incomes' });
    }
};

// Add new income
export const addIncome = (req: AuthRequest, res: Response): void => {
    const { amount, source, description, date } = req.body;

    if ((amount === undefined || amount === null || amount === '') || !source || !date) {
        res.status(400).json({ error: 'Amount, source, and date are required' });
        return;
    }

    try {
        const uid = req.user?.uid!;
        const result = db.prepare(
            'INSERT INTO incomes (user_id, amount, source, description, date) VALUES (?, ?, ?, ?, ?)'
        ).run(uid, amount, source, description || null, date);
        const newIncome = db.prepare(
            'SELECT id, user_id as userId, amount, source, description, date, created_at as createdAt FROM incomes WHERE id = ? AND user_id = ?'
        ).get(result.lastInsertRowid, uid);

        res.status(201).json({
            ...newIncome as object,
            message: 'Income added successfully'
        });
    } catch (error) {
        console.error('Error adding income:', error);
        res.status(500).json({ error: 'Failed to add income' });
    }
};

// Update income
export const updateIncome = (req: AuthRequest, res: Response): void => {
    const { id } = req.params;
    const { amount, source, description, date } = req.body;

    try {
        const uid = req.user?.uid!;
        const result = db.prepare(
            'UPDATE incomes SET amount = ?, source = ?, description = ?, date = ? WHERE id = ? AND user_id = ?'
        ).run(amount, source, description, date, id, uid);

        if (result.changes === 0) {
            res.status(404).json({ error: 'Income not found' });
            return;
        }

        const updated = db.prepare(
            'SELECT id, user_id as userId, amount, source, description, date, created_at as createdAt FROM incomes WHERE id = ? AND user_id = ?'
        ).get(id, uid);
        res.json(updated);
    } catch (error) {
        console.error('Error updating income:', error);
        res.status(500).json({ error: 'Failed to update income' });
    }
};

// Delete income
export const deleteIncome = (req: AuthRequest, res: Response): void => {
    const { id } = req.params;

    try {
        const uid = req.user?.uid!;
        const result = db.prepare(
            'DELETE FROM incomes WHERE id = ? AND user_id = ?'
        ).run(id, uid);

        if (result.changes === 0) {
            res.status(404).json({ error: 'Income not found' });
            return;
        }

        res.json({ message: 'Income deleted successfully' });
    } catch (error) {
        console.error('Error deleting income:', error);
        res.status(500).json({ error: 'Failed to delete income' });
    }
};
