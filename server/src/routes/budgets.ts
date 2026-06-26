import express from 'express';
import db from '../config/db.js';
import { authenticateToken, type AuthRequest } from '../middleware/auth.js';
import {
    type ActiveBudgetRow,
    type BudgetPeriodType,
    type BudgetRangeType,
    type BudgetSavingsRangeResponse,
    getPeriodEnd,
    getPeriodKey,
    getPeriodStart,
    getRangeCount,
    getRangeLabel,
    formatLocalDate,
    normalizeBudgetPeriodType,
    normalizeBudgetRangeType,
    parseBudgetDate,
    subtractPeriods,
    addPeriod,
} from '../utils/budget.js';

const router = express.Router();

function mapBudget(row: ActiveBudgetRow) {
    return {
        id: row.id,
        userId: row.user_id,
        periodType: row.period_type,
        amount: Number(row.amount),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        isActive: Boolean(row.is_active),
    };
}

function getActiveBudgets(uid: string) {
    return db.prepare(
        `SELECT id, user_id, period_type, amount, created_at, updated_at, is_active
         FROM budgets
         WHERE user_id = ? AND is_active = 1
         ORDER BY CASE period_type
             WHEN 'daily' THEN 1
             WHEN 'weekly' THEN 2
             WHEN 'monthly' THEN 3
             ELSE 4
         END`
    ).all(uid) as ActiveBudgetRow[];
}

function getActiveBudgetByPeriod(uid: string, periodType: BudgetPeriodType) {
    return db.prepare(
        `SELECT id, user_id, period_type, amount, created_at, updated_at, is_active
         FROM budgets
         WHERE user_id = ? AND period_type = ? AND is_active = 1
         ORDER BY updated_at DESC
         LIMIT 1`
    ).get(uid, periodType) as ActiveBudgetRow | undefined;
}

function getBudgetSpendForRange(uid: string, periodType: BudgetPeriodType, range: BudgetRangeType): BudgetSavingsRangeResponse {
    const budget = getActiveBudgetByPeriod(uid, periodType);
    if (!budget) {
        throw new Error('NO_ACTIVE_BUDGET');
    }

    const now = new Date();
    const periodCount = getRangeCount(range);
    const currentPeriodStart = getPeriodStart(now, periodType);
    const firstPeriodStart = subtractPeriods(currentPeriodStart, periodType, periodCount - 1);
    const lastPeriodEnd = getPeriodEnd(now, periodType);

    const expenses = db.prepare(
        `SELECT amount, date
         FROM expenses
         WHERE user_id = ? AND date >= ? AND date <= ?
         ORDER BY date ASC`
    ).all(
        uid,
        getPeriodKey(firstPeriodStart, periodType),
        formatLocalDate(lastPeriodEnd),
    ) as Array<{ amount: number; date: string }>;

    const spendByPeriod = new Map<string, number>();
    for (const expense of expenses) {
        const key = getPeriodKey(parseBudgetDate(expense.date), periodType);
        spendByPeriod.set(key, (spendByPeriod.get(key) || 0) + Number(expense.amount || 0));
    }

    let savingsTotal = 0;
    for (let i = 0; i < periodCount; i += 1) {
        const periodStart = addPeriod(firstPeriodStart, periodType, i);
        const key = getPeriodKey(periodStart, periodType);
        const spend = spendByPeriod.get(key) || 0;
        const savings = Math.max(0, Number(budget.amount) - spend);
        savingsTotal += savings;
    }

    return {
        savings: Number(savingsTotal.toFixed(2)),
        budget: Number(budget.amount),
        range_label: getRangeLabel(periodType, range),
    };
}

router.get('/', authenticateToken, (req: AuthRequest, res) => {
    try {
        const budgets = getActiveBudgets(req.user!.uid).map(mapBudget);
        res.json(budgets);
    } catch (error) {
        console.error('Error fetching budgets:', error);
        res.status(500).json({ error: 'Failed to fetch budgets' });
    }
});

router.post('/', authenticateToken, (req: AuthRequest, res) => {
    try {
        const uid = req.user!.uid;
        const periodType = normalizeBudgetPeriodType(req.body?.period_type ?? req.body?.periodType);
        const amountValue = Number(req.body?.amount);

        if (!periodType) {
            res.status(400).json({ error: 'period_type must be daily, weekly, or monthly' });
            return;
        }

        if (!Number.isFinite(amountValue) || amountValue <= 0) {
            res.status(400).json({ error: 'Amount must be greater than 0' });
            return;
        }

        const existingBudget = getActiveBudgetByPeriod(uid, periodType);

        if (existingBudget) {
            db.prepare(
                `UPDATE budgets
                 SET amount = ?, updated_at = DATETIME('now', 'localtime')
                 WHERE id = ? AND user_id = ?`
            ).run(amountValue, existingBudget.id, uid);

            const updated = getActiveBudgetByPeriod(uid, periodType);
            res.json(updated ? mapBudget(updated) : null);
            return;
        }

        const result = db.prepare(
            `INSERT INTO budgets (user_id, period_type, amount, created_at, updated_at, is_active)
             VALUES (?, ?, ?, DATETIME('now', 'localtime'), DATETIME('now', 'localtime'), 1)`
        ).run(uid, periodType, amountValue);

        const created = db.prepare(
            `SELECT id, user_id, period_type, amount, created_at, updated_at, is_active
             FROM budgets
             WHERE id = ? AND user_id = ?`
        ).get(result.lastInsertRowid, uid) as ActiveBudgetRow | undefined;

        res.status(201).json(created ? mapBudget(created) : null);
    } catch (error) {
        console.error('Error saving budget:', error);
        res.status(500).json({ error: 'Failed to save budget' });
    }
});

router.delete('/:id', authenticateToken, (req: AuthRequest, res) => {
    try {
        const uid = req.user!.uid;
        const budgetId = Number(req.params.id);

        if (!Number.isInteger(budgetId)) {
            res.status(400).json({ error: 'Invalid budget id' });
            return;
        }

        const result = db.prepare(
            `UPDATE budgets
             SET is_active = 0, updated_at = DATETIME('now', 'localtime')
             WHERE id = ? AND user_id = ? AND is_active = 1`
        ).run(budgetId, uid);

        if (result.changes === 0) {
            res.status(404).json({ error: 'Budget not found' });
            return;
        }

        res.json({ message: 'Budget removed' });
    } catch (error) {
        console.error('Error removing budget:', error);
        res.status(500).json({ error: 'Failed to remove budget' });
    }
});

router.get('/savings', authenticateToken, (req: AuthRequest, res) => {
    try {
        const uid = req.user!.uid;
        const periodType = normalizeBudgetPeriodType(req.query.period_type ?? req.query.periodType);
        const range = normalizeBudgetRangeType(req.query.range);

        if (!periodType) {
            res.status(400).json({ error: 'period_type must be daily, weekly, or monthly' });
            return;
        }

        const activeBudget = getActiveBudgetByPeriod(uid, periodType);
        if (!activeBudget) {
            res.status(404).json({ savings: null, message: 'No active budget set for this period' });
            return;
        }

        if (range === 'both') {
            const week = getBudgetSpendForRange(uid, periodType, 'week');
            const month = getBudgetSpendForRange(uid, periodType, 'month');
            res.json({
                period_type: periodType,
                week,
                month,
            });
            return;
        }

        const payload = getBudgetSpendForRange(uid, periodType, range);
        res.json({
            period_type: periodType,
            savings: payload.savings,
            budget: payload.budget,
            range_label: payload.range_label,
        });
    } catch (error) {
        if ((error as Error).message === 'NO_ACTIVE_BUDGET') {
            res.status(404).json({ savings: null, message: 'No active budget set for this period' });
            return;
        }

        console.error('Error calculating budget savings:', error);
        res.status(500).json({ error: 'Failed to calculate budget savings' });
    }
});

export default router;
