import { useState, useEffect } from 'react';
import type { Income, Expense, Split, Friend } from '../appTypes';
import { apiClient } from '../utils/api';

export const useData = (userId: string | undefined) => {
    const [incomes, setIncomes] = useState<Income[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [splits, setSplits] = useState<Split[]>([]);
    const [friends, setFriends] = useState<Friend[]>([]);
    const [loading, setLoading] = useState(true);

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
    }, [userId]);

    const fetchAllData = async () => {
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
            // @ts-ignore
            alert(`Database Connection Error: ${error.message || 'Unknown error'}`);
        } finally {
            console.log('Data fetch attempt completed.');
            setLoading(false);
        }
    };

    // Income methods
    const addIncome = async (income: Omit<Income, 'id'>) => {
        try {
            const newIncome = await apiClient.post('/incomes', income);
            setIncomes([...incomes, newIncome]);
            return newIncome;
        } catch (error) {
            console.error('Error adding income:', error);
            throw error;
        }
    };

    const updateIncome = async (id: number, income: Partial<Income>) => {
        try {
            const updated = await apiClient.put(`/incomes/${id}`, income);
            setIncomes(incomes.map(i => i.id === id ? updated : i));
            return updated;
        } catch (error) {
            console.error('Error updating income:', error);
            throw error;
        }
    };

    const deleteIncome = async (id: number) => {
        try {
            await apiClient.delete(`/incomes/${id}`);
            setIncomes(incomes.filter(i => i.id !== id));
        } catch (error) {
            console.error('Error deleting income:', error);
            throw error;
        }
    };

    // Expense methods
    const addExpense = async (expense: Omit<Expense, 'id'>) => {
        try {
            const newExpense = await apiClient.post('/expenses', expense);
            setExpenses([...expenses, newExpense]);
            return newExpense;
        } catch (error) {
            console.error('Error adding expense:', error);
            throw error;
        }
    };

    const updateExpense = async (id: number, expense: Partial<Expense>) => {
        try {
            const updated = await apiClient.put(`/expenses/${id}`, expense);
            setExpenses(expenses.map(e => e.id === id ? updated : e));
            return updated;
        } catch (error) {
            console.error('Error updating expense:', error);
            throw error;
        }
    };

    const deleteExpense = async (id: number) => {
        try {
            await apiClient.delete(`/expenses/${id}`);
            setExpenses(expenses.filter(e => e.id !== id));
        } catch (error) {
            console.error('Error deleting expense:', error);
            throw error;
        }
    };

    // Split methods
    const addSplit = async (split: Omit<Split, 'id'>) => {
        try {
            const newSplit = await apiClient.post('/splits', split);
            setSplits([...splits, newSplit]);
            return newSplit;
        } catch (error) {
            console.error('Error adding split:', error);
            throw error;
        }
    };

    const updateSplit = async (id: number, split: Partial<Split>) => {
        try {
            const updated = await apiClient.put(`/splits/${id}`, split);
            setSplits(splits.map(s => s.id === id ? updated : s));
            return updated;
        } catch (error) {
            console.error('Error updating split:', error);
            throw error;
        }
    };

    const deleteSplit = async (id: number) => {
        try {
            await apiClient.delete(`/splits/${id}`);
            setSplits(splits.filter(s => s.id !== id));
        } catch (error) {
            console.error('Error deleting split:', error);
            throw error;
        }
    };

    const addSplitBulk = async (bulkData: any) => {
        try {
            await apiClient.post('/splits/bulk', bulkData);
            await fetchAllData(); // Refresh everything to get new splits and updated expenses
        } catch (error) {
            console.error('Error adding bulk splits:', error);
            throw error;
        }
    };

    const markSplitPaid = async (id: number) => {
        return updateSplit(id, { isPaid: true });
    };

    // Friend methods
    const addFriend = async (friend: Omit<Friend, 'id'>) => {
        try {
            const newFriend = await apiClient.post('/friends', friend);
            setFriends([...friends, newFriend]);
            return newFriend;
        } catch (error) {
            console.error('Error adding friend:', error);
            throw error;
        }
    };

    const deleteFriend = async (id: number) => {
        try {
            await apiClient.delete(`/friends/${id}`);
            setFriends(friends.filter(f => f.id !== id));
        } catch (error) {
            console.error('Error deleting friend:', error);
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
