import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import db from '../config/db.js';

// Get all expenses for user (supports optional ?limit=N&offset=M&year=YYYY&month=MM)
export const getExpenses = (req: AuthRequest, res: Response): void => {
    try {
        const uid = req.user?.uid!;
        const { limit, offset, year, month } = req.query;

        const isPaginated = limit !== undefined;
        const limitVal  = isPaginated ? Math.max(1, Math.min(500, parseInt(String(limit), 10) || 50)) : null;
        const offsetVal = isPaginated ? Math.max(0, parseInt(String(offset), 10) || 0) : 0;

        // Build optional date filter clauses
        const dateFilter = year && month
            ? `AND strftime('%Y', e.date) = ? AND strftime('%m', e.date) = ?`
            : year
            ? `AND strftime('%Y', e.date) = ?`
            : '';
        const dateParams: string[] = year && month
            ? [String(year), String(month).padStart(2, '0')]
            : year
            ? [String(year)]
            : [];

        const baseWhere = `WHERE e.user_id = ? ${dateFilter}`;
        const queryParams = [uid, ...dateParams];

        if (isPaginated) {
            // Return paginated envelope so the client can implement "load more"
            const total = (db.prepare(
                `SELECT COUNT(*) as cnt FROM expenses e ${baseWhere}`
            ).get(...queryParams) as any)?.cnt ?? 0;

            const rows = db.prepare(
                `SELECT e.id, e.user_id as userId, e.amount, e.category_id as categoryId, e.description, e.date, e.created_at as createdAt, c.name as category_name
                 FROM expenses e
                 JOIN categories c ON e.category_id = c.id
                 ${baseWhere}
                 ORDER BY e.date DESC
                 LIMIT ? OFFSET ?`
            ).all(...queryParams, limitVal!, offsetVal);

            res.json({ data: rows, total, limit: limitVal, offset: offsetVal });
        } else {
            // No pagination params — return plain array (backward-compatible)
            const rows = db.prepare(
                `SELECT e.id, e.user_id as userId, e.amount, e.category_id as categoryId, e.description, e.date, e.created_at as createdAt, c.name as category_name
                 FROM expenses e
                 JOIN categories c ON e.category_id = c.id
                 ${baseWhere}
                 ORDER BY e.date DESC`
            ).all(...queryParams);

            res.json(rows);
        }
    } catch (error) {
        console.error('Error fetching expenses:', error);
        res.status(500).json({ error: 'Failed to fetch expenses' });
    }
};

// Get all categories
export const getCategories = (req: AuthRequest, res: Response): void => {
    try {
        const rows = db.prepare('SELECT * FROM categories ORDER BY name').all();
        res.json(rows);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
};

// Add new expense
export const addExpense = (req: AuthRequest, res: Response): void => {
    const { amount, category_id, categoryId, description, date } = req.body;
    const finalCategoryId = category_id || categoryId;

    if (amount === undefined || amount === null || amount === '' || !finalCategoryId || !date) {
        res.status(400).json({ error: 'Amount, category, and date are required' });
        return;
    }

    try {
        const uid = req.user?.uid!;
        const result = db.prepare(
            'INSERT INTO expenses (user_id, amount, category_id, description, date) VALUES (?, ?, ?, ?, ?)'
        ).run(uid, amount, finalCategoryId, description || null, date);

        const newExpense = db.prepare(
            `SELECT e.id, e.user_id as userId, e.amount, e.category_id as categoryId, e.description, e.date, e.created_at as createdAt, c.name as category_name
             FROM expenses e
             JOIN categories c ON e.category_id = c.id 
             WHERE e.id = ? AND e.user_id = ?`
        ).get(result.lastInsertRowid, uid);

        res.status(201).json({
            ...newExpense as object,
            message: 'Expense added successfully'
        });
    } catch (error) {
        console.error('Error adding expense:', error);
        res.status(500).json({ error: 'Failed to add expense' });
    }
};

// Update expense
export const updateExpense = (req: AuthRequest, res: Response): void => {
    const { id } = req.params;
    const { amount, category_id, categoryId, description, date } = req.body;
    const finalCategoryId = category_id || categoryId;

    try {
        const uid = req.user?.uid!;
        const result = db.prepare(
            'UPDATE expenses SET amount = ?, category_id = ?, description = ?, date = ? WHERE id = ? AND user_id = ?'
        ).run(amount, finalCategoryId, description, date, id, uid);

        if (result.changes === 0) {
            res.status(404).json({ error: 'Expense not found' });
            return;
        }

        const updated = db.prepare(
            `SELECT e.id, e.user_id as userId, e.amount, e.category_id as categoryId, e.description, e.date, e.created_at as createdAt, c.name as category_name
             FROM expenses e
             JOIN categories c ON e.category_id = c.id
             WHERE e.id = ? AND e.user_id = ?`
        ).get(id, uid);
        res.json(updated);
    } catch (error) {
        console.error('Error updating expense:', error);
        res.status(500).json({ error: 'Failed to update expense' });
    }
};

// Delete expense
export const deleteExpense = (req: AuthRequest, res: Response): void => {
    const { id } = req.params;

    try {
        const uid = req.user?.uid!;
        const result = db.prepare(
            'DELETE FROM expenses WHERE id = ? AND user_id = ?'
        ).run(id, uid);

        if (result.changes === 0) {
            res.status(404).json({ error: 'Expense not found' });
            return;
        }

        res.json({ message: 'Expense deleted successfully' });
    } catch (error) {
        console.error('Error deleting expense:', error);
        res.status(500).json({ error: 'Failed to delete expense' });
    }
};
