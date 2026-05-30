import { useState, useEffect, useCallback } from 'react';
import type { Income, Expense, Split, Friend } from '../appTypes';
import { apiClient } from '../utils/api';
import { toast } from 'sonner';

export const useData = (userId: string | undefined) => {
    const [incomes, setIncomes] = useState<Income[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [splits, setSplits] = useState<Split[]>([]);
    const [friends, setFriends] = useState<Friend[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch all data function - defined before useEffect to avoid lint errors
    const fetchAllData = useCallback(async () => {
        setLoading(true);
        try {
            const [incomesData, expensesData, splitsData, friendsData] = await Promise.all([
                apiClient.get('/incomes'),
                apiClient.get('/expenses'),
                apiClient.get('/splits'),
                apiClient.get('/friends'),
            ]);
            console.log('Fetched Data:', { incomes: incomesData, expenses: expensesData });
            setIncomes(incomesData);
            setExpenses(expensesData);
            setSplits(splitsData);
            setFriends(friendsData);
        } catch (error) {
            console.error('CRITICAL: Error fetching all data:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            toast.error(`Database Connection Error: ${errorMessage}`);
        } finally {
            console.log('Data fetch attempt completed.');
            setLoading(false);
        }
    }, []);

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
            setLoading(false);
        }
    }, [userId, fetchAllData]);

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

    return {
        incomes,
        expenses,
        splits,
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
        friends,
        addFriend,
        deleteFriend,
        refreshData: fetchAllData,
    };
};
