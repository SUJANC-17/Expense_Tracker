import React, { useEffect, useState } from 'react';
import { apiClient } from '../utils/api';
import './Income.css';

interface Income {
    id: number;
    amount: number;
    source: string;
    description: string;
    date: string;
}

const Income: React.FC = () => {
    const [incomes, setIncomes] = useState<Income[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState({
        amount: '',
        source: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
    });

    useEffect(() => {
        fetchIncomes();
    }, []);

    const fetchIncomes = async () => {
        try {
            const data = await apiClient.get('/incomes');
            setIncomes(data);
        } catch (error) {
            console.error('Error fetching incomes:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await apiClient.put(`/incomes/${editingId}`, formData);
            } else {
                await apiClient.post('/incomes', formData);
            }
            resetForm();
            fetchIncomes();
        } catch (error) {
            console.error('Error saving income:', error);
        }
    };

    const handleEdit = (income: Income) => {
        setEditingId(income.id);
        setFormData({
            amount: income.amount.toString(),
            source: income.source,
            description: income.description || '',
            date: income.date,
        });
        setShowForm(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this income?')) return;
        try {
            await apiClient.delete(`/incomes/${id}`);
            fetchIncomes();
        } catch (error) {
            console.error('Error deleting income:', error);
        }
    };

    const resetForm = () => {
        setFormData({
            amount: '',
            source: '',
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
                <h1 className="page-title">Income Management</h1>
                <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
                    {showForm ? 'Cancel' : '+ Add Income'}
                </button>
            </div>

            {showForm && (
                <div className="form-card glass-card">
                    <h2 className="form-title">{editingId ? 'Edit Income' : 'Add New Income'}</h2>
                    <form onSubmit={handleSubmit} className="data-form">
                        <div className="form-row">
                            <div className="input-group">
                                <label className="input-label">Amount (₹)</label>
                                <input
                                    type="number"
                                    className="input-field"
                                    placeholder="5000"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    required
                                    step="0.01"
                                />
                            </div>

                            <div className="input-group">
                                <label className="input-label">Source</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    placeholder="Salary, Freelance, etc."
                                    value={formData.source}
                                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                                    required
                                />
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
                                {editingId ? 'Update' : 'Add'} Income
                            </button>
                            <button type="button" className="btn btn-secondary" onClick={resetForm}>
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="data-table glass-card">
                <h2 className="section-title">Income History</h2>
                {(!Array.isArray(incomes) || incomes.length === 0) ? (
                    <p className="empty-state">No income records yet. Add your first income!</p>
                ) : (
                    <div className="table-responsive">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Source</th>
                                    <th>Description</th>
                                    <th>Amount</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {incomes.map((income) => (
                                    <tr key={income.id}>
                                        <td>{new Date(income.date).toLocaleDateString()}</td>
                                        <td className="font-medium">{income.source}</td>
                                        <td className="text-muted">{income.description || '-'}</td>
                                        <td className={Number(income.amount) < 0 ? 'amount-negative' : 'amount-positive'}>
                                            ₹{Number(income.amount).toFixed(2)}
                                        </td>
                                        <td>
                                            <div className="action-buttons">
                                                <button className="btn-icon btn-edit" onClick={() => handleEdit(income)}>
                                                    ✏️
                                                </button>
                                                <button className="btn-icon btn-delete" onClick={() => handleDelete(income.id)}>
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

export default Income;
