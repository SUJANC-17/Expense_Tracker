export interface User {
    id: string;
    username: string;
    email: string;
    createdAt: string;
    photoURL?: string;
    authProvider?: string | null;
    providerIds?: string[];
    hasPassword?: boolean;
    hasGoogle?: boolean;
}

export interface ReminderSettings {
    reminderEnabled: boolean;
    reminderTime: string;
}

export type BudgetPeriodType = 'daily' | 'weekly' | 'monthly';

export interface Budget {
    id: number;
    userId: string;
    periodType: BudgetPeriodType;
    amount: number;
    createdAt: string;
    updatedAt: string;
    isActive: boolean;
}

export interface BudgetSavingsRange {
    savings: number;
    budget: number;
    range_label: string;
}

export interface BudgetSavingsResponse {
    period_type: BudgetPeriodType;
    week?: BudgetSavingsRange;
    month?: BudgetSavingsRange;
    savings?: number | null;
    budget?: number | null;
    range_label?: string;
    message?: string;
}

export interface Income {
    id: number;
    userId: string;
    amount: number;
    source: string;
    description: string;
    date: string;
}

export interface Expense {
    id: number;
    userId: string;
    amount: number;
    categoryId: number;
    description: string;
    date: string;
}

export interface Split {
    id: number;
    userId: string;
    friendId?: number | null;
    friendName: string;
    amount: number;
    description: string;
    date: string;
    isPaid: boolean;
    paidAt?: string | null;
    createdAt?: string;
}

export interface Category {
    id: number;
    name: string;
    icon?: string;
}

export interface Friend {
    id: number;
    name: string;
    createdAt?: string;
}
