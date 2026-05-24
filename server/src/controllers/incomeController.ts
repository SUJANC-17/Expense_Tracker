import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import db from '../config/db.js';
import { getUserTableName } from '../utils/tableUtils.js';
import { createUserTables } from '../models/userSchema.js';

// Helper to handle table creation on error
const executeWithTableRetry = <T>(
    uid: string,
    operation: () => T
): T => {
    try {
        return operation();
    } catch (error: any) {
        if (error.message.includes('no such table')) {
            console.log(`Table missing for user ${uid}, attempting to create...`);
            createUserTables(uid);
            return operation();
        }
        throw error;
    }
};

// Get all incomes for user
export const getIncomes = (req: AuthRequest, res: Response): void => {
    try {
        const uid = req.user?.uid!;
        const tableName = getUserTableName(uid, 'incomes');

        const rows = executeWithTableRetry(uid, () => {
            return db.prepare(
                `SELECT * FROM \`${tableName}\` ORDER BY date DESC`
            ).all();
        });

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
        const tableName = getUserTableName(uid, 'incomes');

        const result = executeWithTableRetry(uid, () => {
            return db.prepare(
                `INSERT INTO \`${tableName}\` (amount, source, description, date) VALUES (?, ?, ?, ?)`
            ).run(amount, source, description || null, date);
        });

        res.status(201).json({
            id: Number(result.lastInsertRowid),
            amount: parseFloat(amount),
            source,
            description: description || null,
            date,
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
        const tableName = getUserTableName(uid, 'incomes');
        const result = db.prepare(
            `UPDATE \`${tableName}\` SET amount = ?, source = ?, description = ?, date = ? WHERE id = ?`
        ).run(amount, source, description, date, id);

        if (result.changes === 0) {
            res.status(404).json({ error: 'Income not found' });
            return;
        }

        res.json({ message: 'Income updated successfully' });
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
        const tableName = getUserTableName(uid, 'incomes');
        const result = db.prepare(
            `DELETE FROM \`${tableName}\` WHERE id = ?`
        ).run(id);

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
