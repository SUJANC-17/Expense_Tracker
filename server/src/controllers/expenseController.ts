import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import pool from '../config/db.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { getUserTableName } from '../utils/tableUtils.js';

// Get all expenses for user
export const getExpenses = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const uid = req.user?.uid!;
        const tableName = getUserTableName(uid, 'expenses');
        const [rows] = await pool.query<RowDataPacket[]>(
            `SELECT e.*, c.name as category_name 
             FROM \`${tableName}\` e 
             JOIN categories c ON e.category_id = c.id 
             ORDER BY e.date DESC`
        );
        res.json(rows);
    } catch (error) {
        console.error('Error fetching expenses:', error);
        res.status(500).json({ error: 'Failed to fetch expenses' });
    }
};

// Get all categories
export const getCategories = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM categories ORDER BY name');
        res.json(rows);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
};

// Add new expense
export const addExpense = async (req: AuthRequest, res: Response): Promise<void> => {
    const { amount, category_id, description, date } = req.body;

    if (amount === undefined || amount === null || amount === '' || !category_id || !date) {
        res.status(400).json({ error: 'Amount, category, and date are required' });
        return;
    }

    try {
        const uid = req.user?.uid!;
        const tableName = getUserTableName(uid, 'expenses');
        const [result] = await pool.query<ResultSetHeader>(
            `INSERT INTO \`${tableName}\` (amount, category_id, description, date) VALUES (?, ?, ?, ?)`,
            [amount, category_id, description || null, date]
        );
        res.status(201).json({ id: result.insertId, message: 'Expense added successfully' });
    } catch (error) {
        console.error('Error adding expense:', error);
        res.status(500).json({ error: 'Failed to add expense' });
    }
};

// Update expense
export const updateExpense = async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const { amount, category_id, description, date } = req.body;

    try {
        const uid = req.user?.uid!;
        const tableName = getUserTableName(uid, 'expenses');
        const [result] = await pool.query<ResultSetHeader>(
            `UPDATE \`${tableName}\` SET amount = ?, category_id = ?, description = ?, date = ? WHERE id = ?`,
            [amount, category_id, description, date, id]
        );

        if (result.affectedRows === 0) {
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
export const deleteExpense = async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;

    try {
        const uid = req.user?.uid!;
        const tableName = getUserTableName(uid, 'expenses');
        const [result] = await pool.query<ResultSetHeader>(
            `DELETE FROM \`${tableName}\` WHERE id = ?`,
            [id]
        );

        if (result.affectedRows === 0) {
            res.status(404).json({ error: 'Expense not found' });
            return;
        }

        res.json({ message: 'Expense deleted successfully' });
    } catch (error) {
        console.error('Error deleting expense:', error);
        res.status(500).json({ error: 'Failed to delete expense' });
    }
};
