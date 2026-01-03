import type { User, Income, Expense, Split } from '../appTypes';

const STORAGE_KEYS = {
  USER: 'expense_tracker_user',
  INCOMES: 'expense_tracker_incomes',
  EXPENSES: 'expense_tracker_expenses',
  SPLITS: 'expense_tracker_splits',
};

export const storage = {
  // User
  getUser: (): User | null => {
    const data = localStorage.getItem(STORAGE_KEYS.USER);
    return data ? JSON.parse(data) : null;
  },
  setUser: (user: User) => {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  },
  clearUser: () => {
    localStorage.removeItem(STORAGE_KEYS.USER);
  },

  // Incomes
  getIncomes: (): Income[] => {
    const data = localStorage.getItem(STORAGE_KEYS.INCOMES);
    return data ? JSON.parse(data) : [];
  },
  setIncomes: (incomes: Income[]) => {
    localStorage.setItem(STORAGE_KEYS.INCOMES, JSON.stringify(incomes));
  },

  // Expenses
  getExpenses: (): Expense[] => {
    const data = localStorage.getItem(STORAGE_KEYS.EXPENSES);
    return data ? JSON.parse(data) : [];
  },
  setExpenses: (expenses: Expense[]) => {
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
  },

  // Splits
  getSplits: (): Split[] => {
    const data = localStorage.getItem(STORAGE_KEYS.SPLITS);
    return data ? JSON.parse(data) : [];
  },
  setSplits: (splits: Split[]) => {
    localStorage.setItem(STORAGE_KEYS.SPLITS, JSON.stringify(splits));
  },

  // Clear all data
  clearAll: () => {
    localStorage.removeItem(STORAGE_KEYS.INCOMES);
    localStorage.removeItem(STORAGE_KEYS.EXPENSES);
    localStorage.removeItem(STORAGE_KEYS.SPLITS);
  },
};
