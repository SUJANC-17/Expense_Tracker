import { addDays, addMonths, addWeeks, endOfMonth, format, parseISO, startOfDay, startOfMonth, startOfWeek } from 'date-fns';
import type { BudgetPeriodType, Expense } from '../appTypes';

export function getPeriodStart(date: Date, periodType: BudgetPeriodType): Date {
    if (periodType === 'daily') return startOfDay(date);
    if (periodType === 'weekly') return startOfWeek(date, { weekStartsOn: 1 });
    return startOfMonth(date);
}

export function getPeriodEnd(date: Date, periodType: BudgetPeriodType): Date {
    if (periodType === 'daily') return startOfDay(date);
    if (periodType === 'weekly') return addDays(startOfWeek(date, { weekStartsOn: 1 }), 6);
    return endOfMonth(date);
}

export function addPeriod(date: Date, periodType: BudgetPeriodType, count: number): Date {
    if (periodType === 'daily') return addDays(date, count);
    if (periodType === 'weekly') return addWeeks(date, count);
    return addMonths(date, count);
}

export function subtractPeriod(date: Date, periodType: BudgetPeriodType, count: number): Date {
    return addPeriod(date, periodType, -count);
}

export function getPeriodKey(date: Date, periodType: BudgetPeriodType): string {
    const periodStart = getPeriodStart(date, periodType);
    return format(periodStart, 'yyyy-MM-dd');
}

export function formatBudgetPeriodLabel(periodType: BudgetPeriodType): string {
    if (periodType === 'daily') return 'Today';
    if (periodType === 'weekly') return 'This Week';
    return 'This Month';
}

export function getBudgetPeriodSpent(expenses: Expense[], periodType: BudgetPeriodType, referenceDate = new Date()): number {
    const start = getPeriodStart(referenceDate, periodType);
    const end = getPeriodEnd(referenceDate, periodType);

    return expenses.reduce((sum, expense) => {
        const expenseDate = parseISO(expense.date);
        if (expenseDate >= start && expenseDate <= end) {
            return sum + Number(expense.amount || 0);
        }
        return sum;
    }, 0);
}
