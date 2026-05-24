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
        // SQLite: Table doesn't exist error message usually contains "no such table"
        if (error.message.includes('no such table')) {
            console.log(`Table missing for user ${uid}, attempting to create...`);
            createUserTables(uid);
            return operation();
        }
        throw error;
    }
};

// Get all expenses for user
export const getExpenses = (req: AuthRequest, res: Response): void => {
    try {
        const uid = req.user?.uid!;
        const tableName = getUserTableName(uid, 'expenses');

        const rows = executeWithTableRetry(uid, () => {
            return db.prepare(
                `SELECT e.*, c.name as category_name 
                 FROM \`${tableName}\` e 
                 JOIN categories c ON e.category_id = c.id 
                 ORDER BY e.date DESC`
            ).all();
        });

        res.json(rows);
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
    const { amount, category_id, description, date } = req.body;

    if (amount === undefined || amount === null || amount === '' || !category_id || !date) {
        res.status(400).json({ error: 'Amount, category, and date are required' });
        return;
    }

    try {
        const uid = req.user?.uid!;
        const tableName = getUserTableName(uid, 'expenses');
        
        const result = db.prepare(
            `INSERT INTO \`${tableName}\` (amount, category_id, description, date) VALUES (?, ?, ?, ?)`
        ).run(amount, category_id, description || null, date);

        const newExpense = db.prepare(
            `SELECT e.*, c.name as category_name 
             FROM \`${tableName}\` e 
             JOIN categories c ON e.category_id = c.id 
             WHERE e.id = ?`
        ).get(result.lastInsertRowid);

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
    const { amount, category_id, description, date } = req.body;

    try {
        const uid = req.user?.uid!;
        const tableName = getUserTableName(uid, 'expenses');
        const result = db.prepare(
            `UPDATE \`${tableName}\` SET amount = ?, category_id = ?, description = ?, date = ? WHERE id = ?`
        ).run(amount, category_id, description, date, id);

        if (result.changes === 0) {
            res.status(404).json({ error: 'Expense not found' });
            return;
        }

        res.json({ message: 'Expense updated successfully' });
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
        const tableName = getUserTableName(uid, 'expenses');
        const result = db.prepare(
            `DELETE FROM \`${tableName}\` WHERE id = ?`
        ).run(id);

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
