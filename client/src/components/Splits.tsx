import React, { useEffect, useState } from 'react';
import { apiClient } from '../utils/api';
import '../components/Income.css';
import './Splits.css';

interface Split {
    id: number;
    friend_id: number;
    friend_name: string;
    amount: number;
    description: string;
    is_paid: boolean;
    date: string;
}

interface Friend {
    id: number;
    name: string;
}

const Splits: React.FC = () => {
    const [splits, setSplits] = useState<Split[]>([]);
    const [friends, setFriends] = useState<Friend[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        totalAmount: '',
        selectedFriends: [] as number[],
        includeMySelf: true,
        description: '',
        date: new Date().toISOString().split('T')[0],
    });

    // Filter state
    const [filterFriendId, setFilterFriendId] = useState<string>('');
    const [filterDateFrom, setFilterDateFrom] = useState<string>('');
    const [filterDateTo, setFilterDateTo] = useState<string>('');

    useEffect(() => {
        fetchSplits();
        fetchFriends();
    }, []);

    const fetchSplits = async () => {
        try {
            console.log('Fetching splits...');
            const data = await apiClient.get('/splits');
            console.log('Splits fetched:', data);
            setSplits(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching splits:', error);
            setSplits([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchFriends = async () => {
        try {
            const data = await apiClient.get('/friends');
            setFriends(data.filter((f: Friend) => f.name !== 'Myself'));
        } catch (error) {
            console.error('Error fetching friends:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.selectedFriends.length === 0) {
            alert('Please select at least one friend to split with');
            return;
        }

        try {
            const totalAmount = parseFloat(formData.totalAmount);
            const numberOfPeople = formData.selectedFriends.length + (formData.includeMySelf ? 1 : 0);
            const sharePerPerson = totalAmount / numberOfPeople;
            const share = parseFloat(sharePerPerson.toFixed(2));

            console.log('Creating bulk splits:', {
                totalAmount,
                numberOfPeople,
                share,
                selectedFriends: formData.selectedFriends,
                includeMySelf: formData.includeMySelf
            });

            const bulkData = {
                totalAmount,
                description: formData.description || null,
                date: formData.date,
                userShare: formData.includeMySelf ? share : 0,
                splits: formData.selectedFriends.map(friendId => {
                    const friend = friends.find(f => f.id === friendId);
                    return {
                        friend_id: friendId,
                        friend_name: friend?.name || 'Unknown',
                        amount: share
                    };
                })
            };

            await apiClient.post('/splits/bulk', bulkData);

            resetForm();
            await fetchSplits();

            // Trigger dashboard refresh by dispatching a custom event
            window.dispatchEvent(new CustomEvent('splitCreated'));

            alert(`Bill split successfully! Each person's share: ₹${share.toFixed(2)}`);
        } catch (error) {
            console.error('Error creating splits:', error);
            alert(`Failed to create splits: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const handleFriendToggle = (friendId: number) => {
        setFormData(prev => ({
            ...prev,
            selectedFriends: prev.selectedFriends.includes(friendId)
                ? prev.selectedFriends.filter(id => id !== friendId)
                : [...prev.selectedFriends, friendId]
        }));
    };

    const handleMarkPaid = async (id: number) => {
        try {
            await apiClient.put(`/splits/${id}/paid`, {});
            fetchSplits();
        } catch (error) {
            console.error('Error marking split as paid:', error);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this split expense?')) return;
        try {
            await apiClient.delete(`/splits/${id}`);
            fetchSplits();
        } catch (error) {
            console.error('Error deleting split:', error);
        }
    };

    const resetForm = () => {
        setFormData({
            totalAmount: '',
            selectedFriends: [],
            includeMySelf: true,
            description: '',
            date: new Date().toISOString().split('T')[0],
        });
        setShowForm(false);
    };

    const calculateSharePreview = () => {
        if (!formData.totalAmount) return null;
        const total = parseFloat(formData.totalAmount);
        const numPeople = formData.selectedFriends.length + (formData.includeMySelf ? 1 : 0);
        if (numPeople === 0) return null;
        return (total / numPeople).toFixed(2);
    };

    // Derive filtered splits
    const filteredSplits = splits.filter((split) => {
        // Filter by friend
        if (filterFriendId) {
            const fid = parseInt(filterFriendId, 10);
            if (split.friend_id !== fid) return false;
        }
        // Filter by date from
        if (filterDateFrom) {
            const splitDate = new Date(split.date);
            const fromDate = new Date(filterDateFrom);
            // compare date only
            splitDate.setHours(0, 0, 0, 0);
            fromDate.setHours(0, 0, 0, 0);
            if (splitDate < fromDate) return false;
        }
        // Filter by date to
        if (filterDateTo) {
            const splitDate = new Date(split.date);
            const toDate = new Date(filterDateTo);
            splitDate.setHours(0, 0, 0, 0);
            toDate.setHours(0, 0, 0, 0);
            if (splitDate > toDate) return false;
        }
        return true;
    });

    const hasActiveFilter = filterFriendId || filterDateFrom || filterDateTo;

    const clearFilters = () => {
        setFilterFriendId('');
        setFilterDateFrom('');
        setFilterDateTo('');
    };

    if (loading) {
        return <div className="spinner"></div>;
    }

    return (
        <div className="container">
            <div className="page-header">
                <h1 className="page-title">Split Expenses</h1>
                <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
                    {showForm ? 'Cancel' : '+ Split Bill'}
                </button>
            </div>

            {showForm && (
                <div className="form-card glass-card">
                    <h2 className="form-title">Split a Bill</h2>
                    <form onSubmit={handleSubmit} className="data-form">
                        <div className="form-row">
                            <div className="input-group">
                                <label className="input-label">Total Bill Amount (₹)</label>
                                <input
                                    type="number"
                                    className="input-field"
                                    placeholder="1000"
                                    value={formData.totalAmount}
                                    onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                                    required
                                    step="0.01"
                                />
                            </div>

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
                        </div>

                        <div className="input-group">
                            <label className="input-label">Select Friends to Split With</label>
                            <div className="friends-selector">
                                <div
                                    className={`friend-chip ${formData.includeMySelf ? 'selected' : ''}`}
                                    onClick={() => setFormData({ ...formData, includeMySelf: !formData.includeMySelf })}
                                >
                                    <span>👤 Myself</span>
                                </div>
                                {friends.map(friend => (
                                    <div
                                        key={friend.id}
                                        className={`friend-chip ${formData.selectedFriends.includes(friend.id) ? 'selected' : ''}`}
                                        onClick={() => handleFriendToggle(friend.id)}
                                    >
                                        <span>👤 {friend.name}</span>
                                    </div>
                                ))}
                            </div>
                            {friends.length === 0 && (
                                <p className="text-muted" style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                                    No friends added yet. Go to Friends page to add some!
                                </p>
                            )}
                        </div>

                        {calculateSharePreview() && (
                            <div className="split-preview">
                                <p>Each person pays: <strong>₹{calculateSharePreview()}</strong></p>
                                <p className="text-muted">
                                    Split between {formData.selectedFriends.length + (formData.includeMySelf ? 1 : 0)} people
                                </p>
                                {formData.includeMySelf && (
                                    <p style={{ color: '#4CAF50', fontWeight: 'bold' }}>Your share: ₹{calculateSharePreview()}</p>
                                )}
                            </div>
                        )}

                        <div className="input-group">
                            <label className="input-label">Description (Optional)</label>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="Dinner, Movie, etc."
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>

                        <div className="form-actions">
                            <button type="submit" className="btn btn-primary">
                                Create Split
                            </button>
                            <button type="button" className="btn btn-secondary" onClick={resetForm}>
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="data-table glass-card">
                <div className="splits-filter-bar">
                    <h2 className="section-title" style={{ marginBottom: 0 }}>Split History</h2>
                    <div className="splits-filters">
                        <div className="filter-group">
                            <label className="filter-label">Friend</label>
                            <select
                                className="input-field filter-select"
                                value={filterFriendId}
                                onChange={(e) => setFilterFriendId(e.target.value)}
                            >
                                <option value="">All Friends</option>
                                {friends.map((f) => (
                                    <option key={f.id} value={f.id}>{f.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="filter-group">
                            <label className="filter-label">From</label>
                            <input
                                type="date"
                                className="input-field filter-date"
                                value={filterDateFrom}
                                onChange={(e) => setFilterDateFrom(e.target.value)}
                            />
                        </div>
                        <div className="filter-group">
                            <label className="filter-label">To</label>
                            <input
                                type="date"
                                className="input-field filter-date"
                                value={filterDateTo}
                                onChange={(e) => setFilterDateTo(e.target.value)}
                            />
                        </div>
                        {hasActiveFilter && (
                            <button className="btn btn-secondary filter-clear-btn" onClick={clearFilters}>
                                ✕ Clear
                            </button>
                        )}
                    </div>
                </div>

                {hasActiveFilter && (
                    <p className="filter-results-info">
                        Showing {filteredSplits.length} of {splits.length} splits
                    </p>
                )}

                {(!Array.isArray(splits) || splits.length === 0) ? (
                    <p className="empty-state">No split expenses yet. Split your first bill!</p>
                ) : filteredSplits.length === 0 ? (
                    <p className="empty-state">No splits match the selected filters.</p>
                ) : (
                    <div className="table-responsive">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Friend</th>
                                    <th>Description</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSplits.map((split) => (
                                    <tr key={split.id}>
                                        <td>{new Date(split.date).toLocaleDateString()}</td>
                                        <td className="font-medium">{split.friend_name}</td>
                                        <td className="text-muted">{split.description || '-'}</td>
                                        <td className={Number(split.amount) < 0 ? 'amount-positive' : 'amount-negative'}>
                                            ₹{Number(split.amount).toFixed(2)}
                                        </td>
                                        <td>
                                            {split.is_paid ? (
                                                <span className="status-badge status-paid">✓ Paid</span>
                                            ) : (
                                                <span className="status-badge status-unpaid">⏳ Pending</span>
                                            )}
                                        </td>
                                        <td>
                                            <div className="action-buttons">
                                                {!split.is_paid && (
                                                    <button
                                                        className="btn-icon btn-success"
                                                        onClick={() => handleMarkPaid(split.id)}
                                                        title="Mark as paid"
                                                    >
                                                        ✓
                                                    </button>
                                                )}
                                                <button
                                                    className="btn-icon btn-delete"
                                                    onClick={() => handleDelete(split.id)}
                                                >
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

export default Splits;
