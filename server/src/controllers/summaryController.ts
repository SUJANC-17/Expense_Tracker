import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import db from '../config/db.js';
import { getOutstandingSplitBalances } from '../services/splitBalanceService.js';

function monthTotals(uid: string, year: string, month: string) {
    const income = db.prepare(
        "SELECT COALESCE(SUM(amount), 0) as total FROM incomes WHERE user_id = ? AND strftime('%Y', date) = ? AND strftime('%m', date) = ?"
    ).get(uid, year, month) as any;
    const expense = db.prepare(
        "SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE user_id = ? AND strftime('%Y', date) = ? AND strftime('%m', date) = ?"
    ).get(uid, year, month) as any;
    const splitExpense = db.prepare(
        "SELECT COALESCE(SUM(amount), 0) as total FROM splits WHERE user_id = ? AND strftime('%Y', date) = ? AND strftime('%m', date) = ?"
    ).get(uid, year, month) as any;
    const splitIncome = db.prepare(
        "SELECT COALESCE(SUM(amount), 0) as total FROM splits WHERE user_id = ? AND is_paid = 1 AND strftime('%Y', paid_at) = ? AND strftime('%m', paid_at) = ?"
    ).get(uid, year, month) as any;

    return {
        income: Number(income?.total || 0),
        expense: Number(expense?.total || 0),
        splitExpense: Number(splitExpense?.total || 0),
        splitIncome: Number(splitIncome?.total || 0),
    };
}

function allTimeBalance(uid: string): number {
    const income = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM incomes WHERE user_id = ?').get(uid) as any;
    const expense = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE user_id = ?').get(uid) as any;
    const splitExpense = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM splits WHERE user_id = ?').get(uid) as any;
    const splitIncome = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM splits WHERE user_id = ? AND is_paid = 1').get(uid) as any;

    return Number(income?.total || 0) - Number(expense?.total || 0) - Number(splitExpense?.total || 0) + Number(splitIncome?.total || 0);
}

function summaryPayload(uid: string, year: string, month: string) {
    const totals = monthTotals(uid, year, month);
    const expensesByCategory = db.prepare(
        `SELECT c.name as category, COALESCE(SUM(e.amount), 0) as total
         FROM expenses e
         JOIN categories c ON e.category_id = c.id
         WHERE e.user_id = ? AND strftime('%Y', e.date) = ? AND strftime('%m', e.date) = ?
         GROUP BY c.name`
    ).all(uid, year, month);
    const totalExpense = totals.expense + totals.splitExpense;
    const unpaidSplitBalances = getOutstandingSplitBalances(uid, { year, month });
    const totalUnpaidSplits = unpaidSplitBalances.reduce((sum, split) => sum + split.outstandingAmount, 0);

    return {
        year: Number(year),
        month: Number(month),
        total_income: totals.income,
        total_expense: totalExpense,
        balance: totals.income - totalExpense + totals.splitIncome,
        all_time_balance: allTimeBalance(uid),
        expenses_by_category: expensesByCategory,
        total_unpaid_splits: totalUnpaidSplits,
        unpaid_split_balances: unpaidSplitBalances,
    };
}

export const getMonthlySummary = (req: AuthRequest, res: Response): void => {
    const { year, month } = req.query;
    if (!year || !month) {
        res.status(400).json({ error: 'Year and month are required' });
        return;
    }

    try {
        res.json(summaryPayload(req.user!.uid, String(year), String(month).padStart(2, '0')));
    } catch (error) {
        console.error('Error fetching monthly summary:', error);
        res.status(500).json({ error: 'Failed to fetch monthly summary' });
    }
};

export const getCurrentMonthSummary = (req: AuthRequest, res: Response): void => {
    const now = new Date();
    try {
        res.json(summaryPayload(
            req.user!.uid,
            now.getFullYear().toString(),
            (now.getMonth() + 1).toString().padStart(2, '0')
        ));
    } catch (error) {
        console.error('Error fetching current month summary:', error);
        res.status(500).json({ error: 'Failed to fetch current month summary' });
    }
};

export const getDetailedSummary = (req: AuthRequest, res: Response): void => {
    const { year, month } = req.query;
    if (!year || !month) {
        res.status(400).json({ error: 'Year and month are required' });
        return;
    }

    try {
        const uid = req.user!.uid;
        const formattedMonth = String(month).padStart(2, '0');
        const base = summaryPayload(uid, String(year), formattedMonth);

        const incomes = db.prepare(
            "SELECT id, amount, source, description, date FROM incomes WHERE user_id = ? AND strftime('%Y', date) = ? AND strftime('%m', date) = ? ORDER BY date DESC"
        ).all(uid, year, formattedMonth);
        const expenses = db.prepare(
            `SELECT e.id, e.amount, c.name as category, e.description, e.date
             FROM expenses e
             JOIN categories c ON e.category_id = c.id
             WHERE e.user_id = ? AND strftime('%Y', e.date) = ? AND strftime('%m', e.date) = ?
             ORDER BY e.date DESC`
        ).all(uid, year, formattedMonth);
        const splits = db.prepare(
            "SELECT id, friend_name, amount, description, date, is_paid FROM splits WHERE user_id = ? AND strftime('%Y', date) = ? AND strftime('%m', date) = ? ORDER BY date DESC"
        ).all(uid, year, formattedMonth);

        res.json({
            ...base,
            incomes,
            expenses,
            splits,
            unpaid_split_balances: getOutstandingSplitBalances(uid, { year: String(year), month: formattedMonth }),
        });
    } catch (error) {
        console.error('Error fetching detailed summary:', error);
        res.status(500).json({ error: 'Failed to fetch detailed summary' });
    }
};

export const getTrends = (req: AuthRequest, res: Response): void => {
    try {
        const uid = req.user!.uid;
        const trends = [];
        const now = new Date();

        for (let i = 0; i < 6; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const year = date.getFullYear().toString();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const totals = monthTotals(uid, year, month);
            const expense = totals.expense + totals.splitExpense;
            trends.push({
                year: Number(year),
                month: Number(month),
                income: totals.income,
                expense,
                balance: totals.income - expense + totals.splitIncome,
            });
        }

        res.json(trends);
    } catch (error) {
        console.error('Error fetching trends:', error);
        res.status(500).json({ error: 'Failed to fetch trends' });
    }
};
