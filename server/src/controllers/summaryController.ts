import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import pool from '../config/db.js';
import type { RowDataPacket } from 'mysql2/promise';
import { getUserTableName } from '../utils/tableUtils.js';
import { createUserTables } from '../models/userSchema.js';

// Get monthly summary
export const getMonthlySummary = async (req: AuthRequest, res: Response): Promise<void> => {
    const { year, month } = req.query;

    if (!year || !month) {
        res.status(400).json({ error: 'Year and month are required' });
        return;
    }

    try {
        const uid = req.user?.uid!;
        const incomeTable = getUserTableName(uid, 'incomes');
        const expenseTable = getUserTableName(uid, 'expenses');
        const splitTable = getUserTableName(uid, 'splits');

        // Get total income for the month
        const [incomeRows] = await pool.query<RowDataPacket[]>(
            `SELECT COALESCE(SUM(amount), 0) as total_income 
             FROM \`${incomeTable}\` 
             WHERE YEAR(date) = ? AND MONTH(date) = ?`,
            [year, month]
        );

        // Get total expenses for the month
        const [expenseRows] = await pool.query<RowDataPacket[]>(
            `SELECT COALESCE(SUM(amount), 0) as total_expense 
             FROM \`${expenseTable}\` 
             WHERE YEAR(date) = ? AND MONTH(date) = ?`,
            [year, month]
        );

        // Get expenses by category
        const [categoryRows] = await pool.query<RowDataPacket[]>(
            `SELECT c.name as category, COALESCE(SUM(e.amount), 0) as total 
             FROM \`${expenseTable}\` e 
             JOIN categories c ON e.category_id = c.id 
             WHERE YEAR(e.date) = ? AND MONTH(e.date) = ? 
             GROUP BY c.name`,
            [year, month]
        );

        // Get income from settled splits for the month (Repayments)
        const [splitIncomeRows] = await pool.query<RowDataPacket[]>(
            `SELECT COALESCE(SUM(amount), 0) as total_split_income 
             FROM \`${splitTable}\` 
             WHERE is_paid = TRUE AND YEAR(paid_at) = ? AND MONTH(paid_at) = ?`,
            [year, month]
        );

        // Get total upfront splits created in the month (Outgoing money)
        const [splitExpenseRows] = await pool.query<RowDataPacket[]>(
            `SELECT COALESCE(SUM(amount), 0) as total_split_expense 
             FROM \`${splitTable}\` 
             WHERE YEAR(date) = ? AND MONTH(date) = ?`,
            [year, month]
        );

        // Get unpaid splits
        const [unpaidSplitsRows] = await pool.query<RowDataPacket[]>(
            `SELECT COALESCE(SUM(amount), 0) as total_unpaid 
             FROM \`${splitTable}\` 
             WHERE is_paid = FALSE`
        );

        const baseIncome = Number(incomeRows[0]?.total_income || 0);
        const splitRepayments = Number(splitIncomeRows[0]?.total_split_income || 0);

        const baseExpense = Number(expenseRows[0]?.total_expense || 0);
        const upfrontSplits = Number(splitExpenseRows[0]?.total_split_expense || 0);

        const totalIncome = baseIncome;
        const totalExpense = baseExpense + upfrontSplits;
        const balance = totalIncome - totalExpense + splitRepayments;
        const totalUnpaid = unpaidSplitsRows[0]?.total_unpaid || 0;

        // Calculate All-Time balance
        const [atIncomeRows] = await pool.query<RowDataPacket[]>(`SELECT COALESCE(SUM(amount), 0) as total FROM \`${incomeTable}\``);
        const [atExpenseRows] = await pool.query<RowDataPacket[]>(`SELECT COALESCE(SUM(amount), 0) as total FROM \`${expenseTable}\``);
        const [atUpfrontRows] = await pool.query<RowDataPacket[]>(`SELECT COALESCE(SUM(amount), 0) as total FROM \`${splitTable}\``);
        const [atRepaymentRows] = await pool.query<RowDataPacket[]>(`SELECT COALESCE(SUM(amount), 0) as total FROM \`${splitTable}\` WHERE is_paid = TRUE`);

        const allTimeBalance = Number(atIncomeRows[0]?.total || 0) -
            (Number(atExpenseRows[0]?.total || 0) + Number(atUpfrontRows[0]?.total || 0)) +
            Number(atRepaymentRows[0]?.total || 0);

        res.json({
            year,
            month,
            total_income: totalIncome,
            total_expense: totalExpense,
            balance,
            all_time_balance: allTimeBalance,
            expenses_by_category: categoryRows,
            total_unpaid_splits: totalUnpaid,
        });
    } catch (error) {
        console.error('Error fetching monthly summary:', error);
        res.status(500).json({ error: 'Failed to fetch monthly summary' });
    }
};

// Get current month summary (for dashboard)
export const getCurrentMonthSummary = async (req: AuthRequest, res: Response): Promise<void> => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    try {
        const uid = req.user?.uid!;

        // Ensure user tables exist
        await createUserTables(uid);

        const incomeTable = getUserTableName(uid, 'incomes');
        const expenseTable = getUserTableName(uid, 'expenses');
        const splitTable = getUserTableName(uid, 'splits');

        console.log(`Fetching summary for user ${uid}`);

        // Get total income for current month
        const [incomeRows] = await pool.query<RowDataPacket[]>(
            `SELECT COALESCE(SUM(amount), 0) as total_income 
             FROM \`${incomeTable}\` 
             WHERE YEAR(date) = ? AND MONTH(date) = ?`,
            [year, month]
        );

        // Get total expenses for current month
        const [expenseRows] = await pool.query<RowDataPacket[]>(
            `SELECT COALESCE(SUM(amount), 0) as total_expense 
             FROM \`${expenseTable}\` 
             WHERE YEAR(date) = ? AND MONTH(date) = ?`,
            [year, month]
        );

        // Get expenses by category
        const [categoryRows] = await pool.query<RowDataPacket[]>(
            `SELECT c.name as category, COALESCE(SUM(e.amount), 0) as total 
             FROM \`${expenseTable}\` e 
             JOIN categories c ON e.category_id = c.id 
             WHERE YEAR(e.date) = ? AND MONTH(e.date) = ? 
             GROUP BY c.name`,
            [year, month]
        );

        // Get income from settled splits for the month (Repayments)
        const [splitIncomeRows] = await pool.query<RowDataPacket[]>(
            `SELECT COALESCE(SUM(amount), 0) as total_split_income 
             FROM \`${splitTable}\` 
             WHERE is_paid = TRUE AND YEAR(paid_at) = ? AND MONTH(paid_at) = ?`,
            [year, month]
        );

        // Get total upfront splits created in the month (Outgoing money)
        const [splitExpenseRows] = await pool.query<RowDataPacket[]>(
            `SELECT COALESCE(SUM(amount), 0) as total_split_expense 
             FROM \`${splitTable}\` 
             WHERE YEAR(date) = ? AND MONTH(date) = ?`,
            [year, month]
        );

        // Get unpaid splits (Owed to user)
        const [unpaidSplitsRows] = await pool.query<RowDataPacket[]>(
            `SELECT COALESCE(SUM(amount), 0) as total_unpaid 
             FROM \`${splitTable}\` 
             WHERE is_paid = FALSE`
        );

        const baseIncome = Number(incomeRows[0]?.total_income || 0);
        const splitRepayments = Number(splitIncomeRows[0]?.total_split_income || 0);
        const baseExpense = Number(expenseRows[0]?.total_expense || 0);
        const upfrontSplits = Number(splitExpenseRows[0]?.total_split_expense || 0);
        const totalIncome = baseIncome;
        const totalExpense = baseExpense + upfrontSplits;
        const balance = totalIncome - totalExpense + splitRepayments;
        const totalUnpaid = Number(unpaidSplitsRows[0]?.total_unpaid || 0);

        // Calculate All-Time balance
        const [atIncomeRows] = await pool.query<RowDataPacket[]>(`SELECT COALESCE(SUM(amount), 0) as total FROM \`${incomeTable}\``);
        const [atExpenseRows] = await pool.query<RowDataPacket[]>(`SELECT COALESCE(SUM(amount), 0) as total FROM \`${expenseTable}\``);
        const [atUpfrontRows] = await pool.query<RowDataPacket[]>(`SELECT COALESCE(SUM(amount), 0) as total FROM \`${splitTable}\``);
        const [atRepaymentRows] = await pool.query<RowDataPacket[]>(`SELECT COALESCE(SUM(amount), 0) as total FROM \`${splitTable}\` WHERE is_paid = TRUE`);

        const allTimeBalance = Number(atIncomeRows[0]?.total || 0) -
            (Number(atExpenseRows[0]?.total || 0) + Number(atUpfrontRows[0]?.total || 0)) +
            Number(atRepaymentRows[0]?.total || 0);

        const summary = {
            year,
            month,
            total_income: totalIncome,
            total_expense: totalExpense,
            balance,
            all_time_balance: allTimeBalance,
            expenses_by_category: categoryRows,
            total_unpaid_splits: totalUnpaid,
        };

        console.log('Summary calculated:', summary);
        res.json(summary);
    } catch (error) {
        console.error('Error fetching current month summary:', error);
        res.status(500).json({ error: 'Failed to fetch current month summary' });
    }
};

// Get detailed summary (including all transactions)
export const getDetailedSummary = async (req: AuthRequest, res: Response): Promise<void> => {
    const { year, month } = req.query;

    if (!year || !month) {
        res.status(400).json({ error: 'Year and month are required' });
        return;
    }

    try {
        const uid = req.user?.uid!;
        const incomeTable = getUserTableName(uid, 'incomes');
        const expenseTable = getUserTableName(uid, 'expenses');
        const splitTable = getUserTableName(uid, 'splits');

        // Reuse the logic for totals
        const [incomeRows] = await pool.query<RowDataPacket[]>(
            `SELECT COALESCE(SUM(amount), 0) as total_income FROM \`${incomeTable}\` WHERE YEAR(date) = ? AND MONTH(date) = ?`,
            [year, month]
        );
        const [expenseRows] = await pool.query<RowDataPacket[]>(
            `SELECT COALESCE(SUM(amount), 0) as total_expense FROM \`${expenseTable}\` WHERE YEAR(date) = ? AND MONTH(date) = ?`,
            [year, month]
        );
        const [splitIncomeRows] = await pool.query<RowDataPacket[]>(
            `SELECT COALESCE(SUM(amount), 0) as total_split_income FROM \`${splitTable}\` WHERE is_paid = TRUE AND YEAR(paid_at) = ? AND MONTH(paid_at) = ?`,
            [year, month]
        );
        const [splitExpenseRows] = await pool.query<RowDataPacket[]>(
            `SELECT COALESCE(SUM(amount), 0) as total_split_expense FROM \`${splitTable}\` WHERE YEAR(date) = ? AND MONTH(date) = ?`,
            [year, month]
        );

        // Get Details
        const [incomeDetails] = await pool.query<RowDataPacket[]>(
            `SELECT id, amount, source, description, date FROM \`${incomeTable}\` WHERE YEAR(date) = ? AND MONTH(date) = ? ORDER BY date DESC`,
            [year, month]
        );
        const [expenseDetails] = await pool.query<RowDataPacket[]>(
            `SELECT e.id, e.amount, c.name as category, e.description, e.date 
             FROM \`${expenseTable}\` e 
             JOIN categories c ON e.category_id = c.id 
             WHERE YEAR(e.date) = ? AND MONTH(e.date) = ? ORDER BY e.date DESC`,
            [year, month]
        );
        const [splitDetails] = await pool.query<RowDataPacket[]>(
            `SELECT id, friend_name, amount, description, date, is_paid 
             FROM \`${splitTable}\` WHERE YEAR(date) = ? AND MONTH(date) = ? ORDER BY date DESC`,
            [year, month]
        );

        const baseIncome = Number(incomeRows[0]?.total_income || 0);
        const splitRepayments = Number(splitIncomeRows[0]?.total_split_income || 0);
        const baseExpense = Number(expenseRows[0]?.total_expense || 0);
        const upfrontSplits = Number(splitExpenseRows[0]?.total_split_expense || 0);

        // Calculate All-Time balance
        const [atIncomeRows] = await pool.query<RowDataPacket[]>(`SELECT COALESCE(SUM(amount), 0) as total FROM \`${incomeTable}\``);
        const [atExpenseRows] = await pool.query<RowDataPacket[]>(`SELECT COALESCE(SUM(amount), 0) as total FROM \`${expenseTable}\``);
        const [atUpfrontRows] = await pool.query<RowDataPacket[]>(`SELECT COALESCE(SUM(amount), 0) as total FROM \`${splitTable}\``);
        const [atRepaymentRows] = await pool.query<RowDataPacket[]>(`SELECT COALESCE(SUM(amount), 0) as total FROM \`${splitTable}\` WHERE is_paid = TRUE`);

        const allTimeBalance = Number(atIncomeRows[0]?.total || 0) -
            (Number(atExpenseRows[0]?.total || 0) + Number(atUpfrontRows[0]?.total || 0)) +
            Number(atRepaymentRows[0]?.total || 0);

        res.json({
            year: Number(year),
            month: Number(month),
            total_income: baseIncome,
            total_expense: baseExpense + upfrontSplits,
            balance: baseIncome - (baseExpense + upfrontSplits) + splitRepayments,
            all_time_balance: allTimeBalance,
            incomes: incomeDetails,
            expenses: expenseDetails,
            splits: splitDetails
        });
    } catch (error) {
        console.error('Error fetching detailed summary:', error);
        res.status(500).json({ error: 'Failed to fetch detailed summary' });
    }
};

// Get summary for last 6 months (trends)
export const getTrends = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const uid = req.user?.uid!;
        const incomeTable = getUserTableName(uid, 'incomes');
        const expenseTable = getUserTableName(uid, 'expenses');
        const splitTable = getUserTableName(uid, 'splits');

        const trends = [];
        const now = new Date();

        for (let i = 0; i < 6; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;

            const [incomeRows] = await pool.query<RowDataPacket[]>(
                `SELECT COALESCE(SUM(amount), 0) as total FROM \`${incomeTable}\` WHERE YEAR(date) = ? AND MONTH(date) = ?`,
                [year, month]
            );
            const [expenseRows] = await pool.query<RowDataPacket[]>(
                `SELECT COALESCE(SUM(amount), 0) as total FROM \`${expenseTable}\` WHERE YEAR(date) = ? AND MONTH(date) = ?`,
                [year, month]
            );
            const [splitExpenseRows] = await pool.query<RowDataPacket[]>(
                `SELECT COALESCE(SUM(amount), 0) as total FROM \`${splitTable}\` WHERE YEAR(date) = ? AND MONTH(date) = ?`,
                [year, month]
            );
            const [splitIncomeRows] = await pool.query<RowDataPacket[]>(
                `SELECT COALESCE(SUM(amount), 0) as total FROM \`${splitTable}\` WHERE is_paid = TRUE AND YEAR(paid_at) = ? AND MONTH(paid_at) = ?`,
                [year, month]
            );

            const inc = Number(incomeRows[0]?.total || 0);
            const exp = Number(expenseRows[0]?.total || 0) + Number(splitExpenseRows[0]?.total || 0);
            const rep = Number(splitIncomeRows[0]?.total || 0);

            trends.push({
                year,
                month,
                income: inc,
                expense: exp,
                balance: inc - exp + rep
            });
        }

        res.json(trends);
    } catch (error) {
        console.error('Error fetching trends:', error);
        res.status(500).json({ error: 'Failed to fetch trends' });
    }
};
