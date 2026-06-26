export const BUDGET_PERIOD_TYPES = ['daily', 'weekly', 'monthly'] as const;
export type BudgetPeriodType = typeof BUDGET_PERIOD_TYPES[number];

export const BUDGET_RANGE_TYPES = ['week', 'month', 'both'] as const;
export type BudgetRangeType = typeof BUDGET_RANGE_TYPES[number];

export interface ActiveBudgetRow {
    id: number;
    user_id: string;
    period_type: BudgetPeriodType;
    amount: number;
    created_at: string;
    updated_at: string;
    is_active: number;
}

export interface BudgetSavingsRangeResponse {
    savings: number;
    budget: number;
    range_label: string;
}

export interface BudgetSavingsResponse {
    period_type: BudgetPeriodType;
    week?: BudgetSavingsRangeResponse;
    month?: BudgetSavingsRangeResponse;
    savings?: number | null;
    budget?: number | null;
    range_label?: string;
    message?: string;
}

function pad(value: number): string {
    return value.toString().padStart(2, '0');
}

export function formatLocalDate(date: Date): string {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function startOfWeek(date: Date): Date {
    const current = startOfDay(date);
    const day = current.getDay();
    const daysSinceMonday = (day + 6) % 7;
    current.setDate(current.getDate() - daysSinceMonday);
    return current;
}

export function startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function addDays(date: Date, count: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + count);
    return next;
}

export function addWeeks(date: Date, count: number): Date {
    return addDays(date, count * 7);
}

export function addMonths(date: Date, count: number): Date {
    const next = new Date(date);
    next.setMonth(next.getMonth() + count);
    return next;
}

export function normalizeBudgetPeriodType(value: unknown): BudgetPeriodType | null {
    if (typeof value !== 'string') return null;
    return (BUDGET_PERIOD_TYPES as readonly string[]).includes(value) ? (value as BudgetPeriodType) : null;
}

export function normalizeBudgetRangeType(value: unknown): BudgetRangeType {
    if (typeof value !== 'string') return 'both';
    return (BUDGET_RANGE_TYPES as readonly string[]).includes(value) ? (value as BudgetRangeType) : 'both';
}

export function getPeriodStart(date: Date, periodType: BudgetPeriodType): Date {
    if (periodType === 'daily') return startOfDay(date);
    if (periodType === 'weekly') return startOfWeek(date);
    return startOfMonth(date);
}

export function getPeriodEnd(date: Date, periodType: BudgetPeriodType): Date {
    if (periodType === 'daily') return startOfDay(date);
    if (periodType === 'weekly') return addDays(startOfWeek(date), 6);
    return endOfMonth(date);
}

export function subtractPeriods(date: Date, periodType: BudgetPeriodType, count: number): Date {
    if (periodType === 'daily') return addDays(date, -count);
    if (periodType === 'weekly') return addWeeks(date, -count);
    return addMonths(date, -count);
}

export function addPeriod(date: Date, periodType: BudgetPeriodType, count: number): Date {
    if (periodType === 'daily') return addDays(date, count);
    if (periodType === 'weekly') return addWeeks(date, count);
    return addMonths(date, count);
}

export function getPeriodKey(date: Date, periodType: BudgetPeriodType): string {
    return formatLocalDate(getPeriodStart(date, periodType));
}

export function getRangeCount(range: BudgetRangeType): number {
    return range === 'week' ? 7 : 30;
}

export function getRangeLabel(periodType: BudgetPeriodType, range: BudgetRangeType): string {
    const units = periodType === 'daily' ? 'days' : periodType === 'weekly' ? 'weeks' : 'months';
    return `Last ${getRangeCount(range)} ${units}`;
}

export function parseBudgetDate(value: string): Date {
    return new Date(`${value}T00:00:00`);
}

