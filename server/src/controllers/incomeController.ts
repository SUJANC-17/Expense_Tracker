import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import db from '../config/db.js';

// Get all incomes for user
export const getIncomes = (req: AuthRequest, res: Response): void => {
    try {
        const uid = req.user?.uid!;
        const rows = db.prepare(
            'SELECT id, user_id as userId, amount, source, description, date, created_at as createdAt FROM incomes WHERE user_id = ? ORDER BY date DESC'
        ).all(uid);

        res.json(rows);
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
