import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import db from '../config/db.js';
import { getUserTableName } from '../utils/tableUtils.js';
import { createUserTables } from '../models/userSchema.js';

// Get monthly summary
export const getMonthlySummary = (req: AuthRequest, res: Response): void => {
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

        const formattedMonth = String(month).padStart(2, '0');

        // Get total income for the month
        const incomeResult = db.prepare(
            `SELECT COALESCE(SUM(amount), 0) as total_income 
             FROM \`${incomeTable}\` 
             WHERE strftime('%Y', date) = ? AND strftime('%m', date) = ?`
        ).get(year, formattedMonth) as any;

        // Get total expenses for the month
        const expenseResult = db.prepare(
            `SELECT COALESCE(SUM(amount), 0) as total_expense 
             FROM \`${expenseTable}\` 
             WHERE strftime('%Y', date) = ? AND strftime('%m', date) = ?`
        ).get(year, formattedMonth) as any;

        // Get expenses by category
        const categoryRows = db.prepare(
            `SELECT c.name as category, COALESCE(SUM(e.amount), 0) as total 
             FROM \`${expenseTable}\` e 
             JOIN categories c ON e.category_id = c.id 
             WHERE strftime('%Y', e.date) = ? AND strftime('%m', e.date) = ? 
             GROUP BY c.name`
        ).all(year, formattedMonth);

        // Get income from settled splits for the month (Repayments)
        const splitIncomeResult = db.prepare(
            `SELECT COALESCE(SUM(amount), 0) as total_split_income 
             FROM \`${splitTable}\` 
             WHERE is_paid = 1 AND strftime('%Y', paid_at) = ? AND strftime('%m', paid_at) = ?`
        ).get(year, formattedMonth) as any;

        // Get total upfront splits created in the month (Outgoing money)
        const splitExpenseResult = db.prepare(
            `SELECT COALESCE(SUM(amount), 0) as total_split_expense 
             FROM \`${splitTable}\` 
             WHERE strftime('%Y', date) = ? AND strftime('%m', date) = ?`
        ).get(year, formattedMonth) as any;

        // Get unpaid splits
        const unpaidSplitsResult = db.prepare(
            `SELECT COALESCE(SUM(amount), 0) as total_unpaid 
             FROM \`${splitTable}\` 
             WHERE is_paid = 0`
        ).get() as any;

        const totalIncome = Number(incomeResult?.total_income || 0);
        const totalExpense = Number(expenseResult?.total_expense || 0) + Number(splitExpenseResult?.total_split_expense || 0);
        const splitRepayments = Number(splitIncomeResult?.total_split_income || 0);
        const summaryBalance = totalIncome - totalExpense + splitRepayments;
        const totalUnpaid = unpaidSplitsResult?.total_unpaid || 0;

        // Calculate All-Time balance
        const atIncome = (db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM \`${incomeTable}\``).get() as any).total;
        const atExpense = (db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM \`${expenseTable}\``).get() as any).total;
        const atUpfront = (db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM \`${splitTable}\``).get() as any).total;
        const atRepayment = (db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM \`${splitTable}\` WHERE is_paid = 1`).get() as any).total;

        const allTimeBalance = Number(atIncome) - (Number(atExpense) + Number(atUpfront)) + Number(atRepayment);

        res.json({
            year,
            month,
            total_income: totalIncome,
            total_expense: totalExpense,
            balance: summaryBalance,
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
export const getCurrentMonthSummary = (req: AuthRequest, res: Response): void => {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');

    try {
        const uid = req.user?.uid!;

        // Ensure user tables exist
        createUserTables(uid);

        const incomeTable = getUserTableName(uid, 'incomes');
        const expenseTable = getUserTableName(uid, 'expenses');
        const splitTable = getUserTableName(uid, 'splits');

        console.log(`Fetching summary for user ${uid}`);

        // Get total income for current month
        const incomeResult = db.prepare(
            `SELECT COALESCE(SUM(amount), 0) as total_income 
             FROM \`${incomeTable}\` 
             WHERE strftime('%Y', date) = ? AND strftime('%m', date) = ?`
        ).get(year, month) as any;

        // Get total expenses for current month
        const expenseResult = db.prepare(
            `SELECT COALESCE(SUM(amount), 0) as total_expense 
             FROM \`${expenseTable}\` 
             WHERE strftime('%Y', date) = ? AND strftime('%m', date) = ?`
        ).get(year, month) as any;

        // Get expenses by category
        const categoryRows = db.prepare(
            `SELECT c.name as category, COALESCE(SUM(e.amount), 0) as total 
             FROM \`${expenseTable}\` e 
             JOIN categories c ON e.category_id = c.id 
             WHERE strftime('%Y', e.date) = ? AND strftime('%m', e.date) = ? 
             GROUP BY c.name`
        ).all(year, month);

        // Get income from settled splits for the month (Repayments)
        const splitIncomeResult = db.prepare(
            `SELECT COALESCE(SUM(amount), 0) as total_split_income 
             FROM \`${splitTable}\` 
             WHERE is_paid = 1 AND strftime('%Y', paid_at) = ? AND strftime('%m', paid_at) = ?`
        ).get(year, month) as any;

        // Get total upfront splits created in the month (Outgoing money)
        const splitExpenseResult = db.prepare(
            `SELECT COALESCE(SUM(amount), 0) as total_split_expense 
             FROM \`${splitTable}\` 
             WHERE strftime('%Y', date) = ? AND strftime('%m', date) = ?`
        ).get(year, month) as any;

        // Get unpaid splits (Owed to user)
        const unpaidSplitsResult = db.prepare(
            `SELECT COALESCE(SUM(amount), 0) as total_unpaid 
             FROM \`${splitTable}\` 
             WHERE is_paid = 0`
        ).get() as any;

        const totalIncome = Number(incomeResult?.total_income || 0);
        const baseExpense = Number(expenseResult?.total_expense || 0);
        const upfrontSplits = Number(splitExpenseResult?.total_split_expense || 0);
        const splitRepayments = Number(splitIncomeResult?.total_split_income || 0);
        
        const totalExpense = baseExpense + upfrontSplits;
        const balance = totalIncome - totalExpense + splitRepayments;
        const totalUnpaid = Number(unpaidSplitsResult?.total_unpaid || 0);

        // Calculate All-Time balance
        const atIncome = (db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM \`${incomeTable}\``).get() as any).total;
        const atExpense = (db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM \`${expenseTable}\``).get() as any).total;
        const atUpfront = (db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM \`${splitTable}\``).get() as any).total;
        const atRepayment = (db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM \`${splitTable}\` WHERE is_paid = 1`).get() as any).total;

        const allTimeBalance = Number(atIncome) - (Number(atExpense) + Number(atUpfront)) + Number(atRepayment);

        const summary = {
            year: Number(year),
            month: Number(month),
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
export const getDetailedSummary = (req: AuthRequest, res: Response): void => {
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

        const formattedMonth = String(month).padStart(2, '0');

        // Reuse the logic for totals
        const incomeResult = db.prepare(
            `SELECT COALESCE(SUM(amount), 0) as total_income FROM \`${incomeTable}\` WHERE strftime('%Y', date) = ? AND strftime('%m', date) = ?`
        ).get(year, formattedMonth) as any;
        
        const expenseResult = db.prepare(
            `SELECT COALESCE(SUM(amount), 0) as total_expense FROM \`${expenseTable}\` WHERE strftime('%Y', date) = ? AND strftime('%m', date) = ?`
        ).get(year, formattedMonth) as any;
        
        const splitIncomeResult = db.prepare(
            `SELECT COALESCE(SUM(amount), 0) as total_split_income FROM \`${splitTable}\` WHERE is_paid = 1 AND strftime('%Y', paid_at) = ? AND strftime('%m', paid_at) = ?`
        ).get(year, formattedMonth) as any;
        
        const splitExpenseResult = db.prepare(
            `SELECT COALESCE(SUM(amount), 0) as total_split_expense FROM \`${splitTable}\` WHERE strftime('%Y', date) = ? AND strftime('%m', date) = ?`
        ).get(year, formattedMonth) as any;

        // Get Details
        const incomeDetails = db.prepare(
            `SELECT id, amount, source, description, date FROM \`${incomeTable}\` WHERE strftime('%Y', date) = ? AND strftime('%m', date) = ? ORDER BY date DESC`
        ).all(year, formattedMonth);
        
        const expenseDetails = db.prepare(
            `SELECT e.id, e.amount, c.name as category, e.description, e.date 
             FROM \`${expenseTable}\` e 
             JOIN categories c ON e.category_id = c.id 
             WHERE strftime('%Y', e.date) = ? AND strftime('%m', e.date) = ? ORDER BY e.date DESC`
        ).all(year, formattedMonth);
        
        const splitDetails = db.prepare(
            `SELECT id, friend_name, amount, description, date, is_paid 
             FROM \`${splitTable}\` WHERE strftime('%Y', date) = ? AND strftime('%m', date) = ? ORDER BY date DESC`
        ).all(year, formattedMonth);

        const totalIncome = Number(incomeResult?.total_income || 0);
        const splitRepayments = Number(splitIncomeResult?.total_split_income || 0);
        const baseExpense = Number(expenseResult?.total_expense || 0);
        const upfrontSplits = Number(splitExpenseResult?.total_split_expense || 0);
        const totalExpense = baseExpense + upfrontSplits;

        // Calculate All-Time balance
        const atIncome = (db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM \`${incomeTable}\``).get() as any).total;
        const atExpense = (db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM \`${expenseTable}\``).get() as any).total;
        const atUpfront = (db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM \`${splitTable}\``).get() as any).total;
        const atRepayment = (db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM \`${splitTable}\` WHERE is_paid = 1`).get() as any).total;

        const allTimeBalance = Number(atIncome) - (Number(atExpense) + Number(atUpfront)) + Number(atRepayment);

        res.json({
            year: Number(year),
            month: Number(month),
            total_income: totalIncome,
            total_expense: totalExpense,
            balance: totalIncome - totalExpense + splitRepayments,
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
export const getTrends = (req: AuthRequest, res: Response): void => {
    try {
        const uid = req.user?.uid!;
        const incomeTable = getUserTableName(uid, 'incomes');
        const expenseTable = getUserTableName(uid, 'expenses');
        const splitTable = getUserTableName(uid, 'splits');

        const trends = [];
        const now = new Date();

        for (let i = 0; i < 6; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const year = date.getFullYear().toString();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');

            const incomeResult = db.prepare(
                `SELECT COALESCE(SUM(amount), 0) as total FROM \`${incomeTable}\` WHERE strftime('%Y', date) = ? AND strftime('%m', date) = ?`
            ).get(year, month) as any;
            
            const expenseResult = db.prepare(
                `SELECT COALESCE(SUM(amount), 0) as total FROM \`${expenseTable}\` WHERE strftime('%Y', date) = ? AND strftime('%m', date) = ?`
            ).get(year, month) as any;
            
            const splitExpenseResult = db.prepare(
                `SELECT COALESCE(SUM(amount), 0) as total FROM \`${splitTable}\` WHERE strftime('%Y', date) = ? AND strftime('%m', date) = ?`
            ).get(year, month) as any;
            
            const splitIncomeResult = db.prepare(
                `SELECT COALESCE(SUM(amount), 0) as total FROM \`${splitTable}\` WHERE is_paid = 1 AND strftime('%Y', paid_at) = ? AND strftime('%m', paid_at) = ?`
            ).get(year, month) as any;

            const inc = Number(incomeResult?.total || 0);
            const exp = Number(expenseResult?.total || 0) + Number(splitExpenseResult?.total || 0);
            const rep = Number(splitIncomeResult?.total || 0);

            trends.push({
                year: Number(year),
                month: Number(month),
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
