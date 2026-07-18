import { useState, useEffect, useCallback } from 'react';
import type { Income, Expense, Split, Friend, Budget, BudgetPeriodType, Category } from '../appTypes';
import { apiClient } from '../utils/api';
import { toast } from 'sonner';

export const useData = (userId: string | undefined) => {
    const [incomes, setIncomes] = useState<Income[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [splits, setSplits] = useState<Split[]>([]);
    const [friends, setFriends] = useState<Friend[]>([]);
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchCategories = useCallback(async () => {
        try {
            const categoriesData = await apiClient.get('/expenses/categories');
            setCategories(categoriesData);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    }, []);

    // Fetch all data function - defined before useEffect to avoid lint errors
    const fetchAllData = useCallback(async () => {
        setLoading(true);
        try {
            const [incomesData, expensesData, splitsData, friendsData, budgetsData] = await Promise.all([
                apiClient.get('/incomes'),
                apiClient.get('/expenses'),
                apiClient.get('/splits'),
                apiClient.get('/friends'),
                apiClient.get('/budgets'),
            ]);
            console.log('Fetched Data:', { incomes: incomesData, expenses: expensesData });
            setIncomes(incomesData);
            setExpenses(expensesData);
            setSplits(splitsData);
            setFriends(friendsData);
            setBudgets(budgetsData);
            await fetchCategories();
        } catch (error) {
            console.error('CRITICAL: Error fetching all data:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            toast.error(`Database Connection Error: ${errorMessage}`);
        } finally {
            console.log('Data fetch attempt completed.');
            setLoading(false);
        }
    }, [fetchCategories]);

    // Fetch all data when userId changes
    useEffect(() => {
        if (userId) {
            fetchAllData();
        } else {
            // Clear sensitive data on logout AND set loading to false
            setIncomes([]);
            setExpenses([]);
            setSplits([]);
            setFriends([]);
            setBudgets([]);
            setCategories([]);
            setLoading(false);
        }
    }, [userId, fetchAllData]);

    useEffect(() => {
        const handleCategoriesUpdated = () => {
            if (!userId) return;
            void fetchCategories();
        };

        const handleStorageUpdate = (event: StorageEvent) => {
            if (!userId) return;
            if (event.key === 'expenseTracker_categories_updated_at') {
                void fetchCategories();
            }
        };

        window.addEventListener('expenseTracker:categories-updated', handleCategoriesUpdated as EventListener);
        window.addEventListener('storage', handleStorageUpdate);

        return () => {
            window.removeEventListener('expenseTracker:categories-updated', handleCategoriesUpdated as EventListener);
            window.removeEventListener('storage', handleStorageUpdate);
        };
    }, [fetchCategories, userId]);

    // Income methods
    const addIncome = async (income: Omit<Income, 'id'>) => {
        try {
            const newIncome = await apiClient.post('/incomes', income);
            setIncomes([...incomes, newIncome]);
            toast.success('Income added successfully');
            return newIncome;
        } catch (error) {
            console.error('Error adding income:', error);
            toast.error('Failed to add income');
            throw error;
        }
    };

    const updateIncome = async (id: number, income: Partial<Income>) => {
        try {
            const updated = await apiClient.put(`/incomes/${id}`, income);
            setIncomes(incomes.map(i => i.id === id ? updated : i));
            toast.success('Income updated');
            return updated;
        } catch (error) {
            console.error('Error updating income:', error);
            toast.error('Failed to update income');
            throw error;
        }
    };

    const deleteIncome = async (id: number) => {
        try {
            await apiClient.delete(`/incomes/${id}`);
            setIncomes(incomes.filter(i => i.id !== id));
            toast.success('Income deleted');
        } catch (error) {
            console.error('Error deleting income:', error);
            toast.error('Failed to delete income');
            throw error;
        }
    };

    // Expense methods
    const addExpense = async (expense: Omit<Expense, 'id'>) => {
        try {
            const newExpense = await apiClient.post('/expenses', expense);
            setExpenses([...expenses, newExpense]);
            toast.success('Expense added successfully');
            return newExpense;
        } catch (error) {
            console.error('Error adding expense:', error);
            toast.error('Failed to add expense');
            throw error;
        }
    };

    const updateExpense = async (id: number, expense: Partial<Expense>) => {
        try {
            const updated = await apiClient.put(`/expenses/${id}`, expense);
            setExpenses(expenses.map(e => e.id === id ? updated : e));
            toast.success('Expense updated');
            return updated;
        } catch (error) {
            console.error('Error updating expense:', error);
            toast.error('Failed to update expense');
            throw error;
        }
    };

    const deleteExpense = async (id: number) => {
        try {
            await apiClient.delete(`/expenses/${id}`);
            setExpenses(expenses.filter(e => e.id !== id));
            toast.success('Expense deleted');
        } catch (error) {
            console.error('Error deleting expense:', error);
            toast.error('Failed to delete expense');
            throw error;
        }
    };

    // Split methods
    const addSplit = async (split: Omit<Split, 'id'>) => {
        try {
            const newSplit = await apiClient.post('/splits', split);
            setSplits([...splits, newSplit]);
            toast.success('Split created successfully');
            return newSplit;
        } catch (error) {
            console.error('Error adding split:', error);
            toast.error('Failed to create split');
            throw error;
        }
    };

    const updateSplit = async (id: number, split: Partial<Split>) => {
        try {
            const updated = await apiClient.put(`/splits/${id}`, split);
            setSplits(splits.map(s => s.id === id ? updated : s));
            toast.success('Split updated');
            return updated;
        } catch (error) {
            console.error('Error updating split:', error);
            toast.error('Failed to update split');
            throw error;
        }
    };

    const deleteSplit = async (id: number) => {
        try {
            await apiClient.delete(`/splits/${id}`);
            setSplits(splits.filter(s => s.id !== id));
            toast.success('Split deleted');
        } catch (error) {
            console.error('Error deleting split:', error);
            toast.error('Failed to delete split');
            throw error;
        }
    };

    const addSplitBulk = async (bulkData: any) => {
        try {
            await apiClient.post('/splits/bulk', bulkData);
            await fetchAllData(); // Refresh everything to get new splits and updated expenses
            toast.success('Group split created successfully!');
        } catch (error) {
            console.error('Error adding bulk splits:', error);
            toast.error('Failed to create group split');
            throw error;
        }
    };

    const markSplitPaid = async (id: number) => {
        try {
            const updated = await apiClient.put(`/splits/${id}/paid`, {});
            setSplits(splits.map(s => s.id === id ? updated : s));
            toast.success('Split marked as paid');
            return updated;
        } catch (error) {
            console.error('Error marking split paid:', error);
            toast.error('Failed to mark split paid');
            throw error;
        }
    };

    const markSplitsPaidBulk = async (ids: number[]) => {
        try {
            const updatedList: Split[] = await apiClient.put('/splits/paid-bulk', { ids });
            const updatedMap = new Map(updatedList.map(item => [item.id, item]));
            setSplits(prevSplits => prevSplits.map(s => updatedMap.has(s.id) ? updatedMap.get(s.id)! : s));
            toast.success(`${ids.length} splits marked as paid`);
            return updatedList;
        } catch (error) {
            console.error('Error marking splits paid in bulk:', error);
            toast.error('Failed to mark splits as paid');
            throw error;
        }
    };


    // Friend methods
    const addFriend = async (friend: Omit<Friend, 'id'>) => {
        try {
            const newFriend = await apiClient.post('/friends', friend);
            setFriends([...friends, newFriend]);
            toast.success('Friend added');
            return newFriend;
        } catch (error) {
            console.error('Error adding friend:', error);
            toast.error('Failed to add friend');
            throw error;
        }
    };

    const deleteFriend = async (id: number) => {
        try {
            await apiClient.delete(`/friends/${id}`);
            setFriends(friends.filter(f => f.id !== id));
            toast.success('Friend removed');
        } catch (error) {
            console.error('Error deleting friend:', error);
            toast.error('Failed to remove friend');
            throw error;
        }
    };

    const saveBudget = async (periodType: BudgetPeriodType, amount: number) => {
        try {
            const saved = await apiClient.post('/budgets', {
                period_type: periodType,
                amount,
            }) as Budget;

            setBudgets((prev) => {
                const next = prev.filter((budget) => budget.periodType !== saved.periodType);
                return [...next, saved].sort((a, b) => {
                    const order: Record<BudgetPeriodType, number> = { daily: 0, weekly: 1, monthly: 2 };
                    return order[a.periodType] - order[b.periodType];
                });
            });

            toast.success(`${periodType.charAt(0).toUpperCase() + periodType.slice(1)} budget saved`);
            return saved;
        } catch (error) {
            console.error('Error saving budget:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to save budget');
            throw error;
        }
    };

    const removeBudget = async (id: number) => {
        try {
            await apiClient.delete(`/budgets/${id}`);
            setBudgets((prev) => prev.filter((budget) => budget.id !== id));
            toast.success('Budget removed');
        } catch (error) {
            console.error('Error removing budget:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to remove budget');
            throw error;
        }
    };

    return {
        incomes,
        expenses,
        splits,
        budgets,
        categories,
        loading,
        addIncome,
        updateIncome,
        deleteIncome,
        addExpense,
        updateExpense,
        deleteExpense,
        addSplit,
        addSplitBulk,
        updateSplit,
        deleteSplit,
        markSplitPaid,
        markSplitsPaidBulk,
        friends,
        addFriend,
        deleteFriend,
        saveBudget,
        removeBudget,
        refreshData: fetchAllData,
    };
};
