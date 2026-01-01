import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import pool from '../config/db.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { getUserTableName } from '../utils/tableUtils.js';

// Get all incomes for user
export const getIncomes = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const uid = req.user?.uid!;
        const tableName = getUserTableName(uid, 'incomes');
        const [rows] = await pool.query<RowDataPacket[]>(
            `SELECT * FROM \`${tableName}\` ORDER BY date DESC`
        );
        res.json(rows);
    } catch (error) {
        console.error('Error fetching incomes:', error);
        res.status(500).json({ error: 'Failed to fetch incomes' });
    }
};

// Add new income
export const addIncome = async (req: AuthRequest, res: Response): Promise<void> => {
    const { amount, source, description, date } = req.body;

    if ((amount === undefined || amount === null || amount === '') || !source || !date) {
        res.status(400).json({ error: 'Amount, source, and date are required' });
        return;
    }

    try {
        const uid = req.user?.uid!;
        const tableName = getUserTableName(uid, 'incomes');
        const [result] = await pool.query<ResultSetHeader>(
            `INSERT INTO \`${tableName}\` (amount, source, description, date) VALUES (?, ?, ?, ?)`,
            [amount, source, description || null, date]
        );
        res.status(201).json({ id: result.insertId, message: 'Income added successfully' });
    } catch (error) {
        console.error('Error adding income:', error);
        res.status(500).json({ error: 'Failed to add income' });
    }
};

// Update income
export const updateIncome = async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const { amount, source, description, date } = req.body;

    try {
        const uid = req.user?.uid!;
        const tableName = getUserTableName(uid, 'incomes');
        const [result] = await pool.query<ResultSetHeader>(
            `UPDATE \`${tableName}\` SET amount = ?, source = ?, description = ?, date = ? WHERE id = ?`,
            [amount, source, description, date, id]
        );

        if (result.affectedRows === 0) {
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
export const deleteIncome = async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;

    try {
        const uid = req.user?.uid!;
        const tableName = getUserTableName(uid, 'incomes');
        const [result] = await pool.query<ResultSetHeader>(
            `DELETE FROM \`${tableName}\` WHERE id = ?`,
            [id]
        );

        if (result.affectedRows === 0) {
            res.status(404).json({ error: 'Income not found' });
            return;
        }

        res.json({ message: 'Income deleted successfully' });
    } catch (error) {
        console.error('Error deleting income:', error);
        res.status(500).json({ error: 'Failed to delete income' });
    }
};
