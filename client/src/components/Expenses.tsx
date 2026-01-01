import React, { useEffect, useState } from 'react';
import { apiClient } from '../utils/api';
import '../components/Income.css';

interface Expense {
    id: number;
    amount: number;
    category_id: number;
    category_name: string;
    description: string;
    date: string;
}

interface Category {
    id: number;
    name: string;
}

const Expenses: React.FC = () => {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState({
        amount: '',
        category_id: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [expensesData, categoriesData] = await Promise.all([
                apiClient.get('/expenses'),
                apiClient.get('/expenses/categories'),
            ]);
            setExpenses(expensesData);
            setCategories(categoriesData);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await apiClient.put(`/expenses/${editingId}`, formData);
            } else {
                await apiClient.post('/expenses', formData);
            }
            resetForm();
            fetchData();
        } catch (error) {
            console.error('Error saving expense:', error);
        }
    };

    const handleEdit = (expense: Expense) => {
        setEditingId(expense.id);
        setFormData({
            amount: expense.amount.toString(),
            category_id: expense.category_id.toString(),
            description: expense.description || '',
            date: expense.date,
        });
        setShowForm(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this expense?')) return;
        try {
            await apiClient.delete(`/expenses/${id}`);
            fetchData();
        } catch (error) {
            console.error('Error deleting expense:', error);
        }
    };

    const resetForm = () => {
        setFormData({
            amount: '',
            category_id: '',
            description: '',
            date: new Date().toISOString().split('T')[0],
        });
        setEditingId(null);
        setShowForm(false);
    };

    if (loading) {
        return <div className="spinner"></div>;
    }

    return (
        <div className="container">
            <div className="page-header">
                <h1 className="page-title">Expense Management</h1>
                <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
                    {showForm ? 'Cancel' : '+ Add Expense'}
                </button>
            </div>

            {showForm && (
                <div className="form-card glass-card">
                    <h2 className="form-title">{editingId ? 'Edit Expense' : 'Add New Expense'}</h2>
                    <form onSubmit={handleSubmit} className="data-form">
                        <div className="form-row">
                            <div className="input-group">
                                <label className="input-label">Amount (₹)</label>
                                <input
                                    type="number"
                                    className="input-field"
                                    placeholder="500"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    required
                                    step="0.01"
                                />
                            </div>

                            <div className="input-group">
                                <label className="input-label">Category</label>
                                <select
                                    className="input-field"
                                    value={formData.category_id}
                                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                                    required
                                >
                                    <option value="">Select Category</option>
                                    {categories.map((cat) => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="input-group">
                                <label className="input-label">Date</label>
                                <input
                                    type="date"
                                    className="input-field"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="input-group">
                                <label className="input-label">Description (Optional)</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    placeholder="Additional notes"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="form-actions">
                            <button type="submit" className="btn btn-primary">
                                {editingId ? 'Update' : 'Add'} Expense
                            </button>
                            <button type="button" className="btn btn-secondary" onClick={resetForm}>
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="data-table glass-card">
                <h2 className="section-title">Expense History</h2>
                {(!Array.isArray(expenses) || expenses.length === 0) ? (
                    <p className="empty-state">No expense records yet. Add your first expense!</p>
                ) : (
                    <div className="table-responsive">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Category</th>
                                    <th>Description</th>
                                    <th>Amount</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {expenses.map((expense) => (
                                    <tr key={expense.id}>
                                        <td>{new Date(expense.date).toLocaleDateString()}</td>
                                        <td className="font-medium">{expense.category_name}</td>
                                        <td className="text-muted">{expense.description || '-'}</td>
                                        <td className={Number(expense.amount) < 0 ? 'amount-positive' : 'amount-negative'}>
                                            ₹{Number(expense.amount).toFixed(2)}
                                        </td>
                                        <td>
                                            <div className="action-buttons">
                                                <button className="btn-icon btn-edit" onClick={() => handleEdit(expense)}>
                                                    ✏️
                                                </button>
                                                <button className="btn-icon btn-delete" onClick={() => handleDelete(expense.id)}>
                                                    🗑️
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Expenses;
