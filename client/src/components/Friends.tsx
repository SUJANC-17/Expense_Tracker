import React, { useEffect, useState } from 'react';
import { apiClient } from '../utils/api';
import './Friends.css';

interface Friend {
    id: number;
    name: string;
    created_at: string;
}

interface FriendBalance {
    friend_id: number;
    friend_name: string;
    total_owed: number;
}

const Friends: React.FC = () => {
    const [friends, setFriends] = useState<Friend[]>([]);
    const [balances, setBalances] = useState<FriendBalance[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ name: '' });

    useEffect(() => {
        fetchFriends();
        fetchBalances();
    }, []);

    const fetchFriends = async () => {
        try {
            const data = await apiClient.get('/friends');
            setFriends(data);
        } catch (error) {
            console.error('Error fetching friends:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchBalances = async () => {
        try {
            const splits = await apiClient.get('/splits');
            const balanceMap = new Map<number, FriendBalance>();

            splits.forEach((split: any) => {
                if (!split.is_paid && split.friend_id) {
                    const existing = balanceMap.get(split.friend_id);
                    if (existing) {
                        existing.total_owed += Number(split.amount);
                    } else {
                        balanceMap.set(split.friend_id, {
                            friend_id: split.friend_id,
                            friend_name: split.friend_name,
                            total_owed: Number(split.amount)
                        });
                    }
                }
            });

            setBalances(Array.from(balanceMap.values()));
        } catch (error) {
            console.error('Error fetching balances:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await apiClient.post('/friends', formData);
            resetForm();
            fetchFriends();
        } catch (error: any) {
            console.error('Error adding friend:', error);
            alert(error.message || 'Failed to add friend.');
        }
    };

    const handleDelete = async (id: number, name: string) => {
        if (name === 'Myself') {
            alert('Cannot delete the "Myself" profile');
            return;
        }
        if (!confirm(`Are you sure you want to delete ${name}?`)) return;
        try {
            await apiClient.delete(`/friends/${id}`);
            fetchFriends();
            fetchBalances();
        } catch (error) {
            console.error('Error deleting friend:', error);
        }
    };

    const resetForm = () => {
        setFormData({ name: '' });
        setShowForm(false);
    };

    const getBalanceForFriend = (friendId: number): number => {
        const balance = balances.find(b => b.friend_id === friendId);
        return balance ? balance.total_owed : 0;
    };

    if (loading) {
        return <div className="spinner"></div>;
    }

    return (
        <div className="container">
            <div className="page-header">
                <h1 className="page-title">Friend Profiles</h1>
                <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
                    {showForm ? 'Cancel' : '+ Add Friend'}
                </button>
            </div>

            {showForm && (
                <div className="form-card glass-card">
                    <h2 className="form-title">Add New Friend</h2>
                    <form onSubmit={handleSubmit} className="data-form">
                        <div className="input-group">
                            <label className="input-label">Friend Name</label>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="Enter friend's name"
                                value={formData.name}
                                onChange={(e) => setFormData({ name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-actions">
                            <button type="submit" className="btn btn-primary">
                                Add Friend
                            </button>
                            <button type="button" className="btn btn-secondary" onClick={resetForm}>
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="friends-grid">
                {friends.map((friend) => {
                    const owed = getBalanceForFriend(friend.id);
                    return (
                        <div key={friend.id} className="friend-card glass-card">
                            <div className="friend-header">
                                <div className="friend-avatar">
                                    {friend.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="friend-info">
                                    <h3 className="friend-name">{friend.name}</h3>
                                    {owed > 0 && (
                                        <p className="friend-balance">
                                            Owes you: <span className="amount-positive">₹{owed.toFixed(2)}</span>
                                        </p>
                                    )}
                                    {owed === 0 && (
                                        <p className="friend-balance settled">All settled ✓</p>
                                    )}
                                </div>
                            </div>
                            {friend.name !== 'Myself' && (
                                <button
                                    className="btn-icon btn-delete"
                                    onClick={() => handleDelete(friend.id, friend.name)}
                                    title="Delete friend"
                                >
                                    🗑️
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            {friends.length === 0 && (
                <p className="empty-state">No friends added yet. Add your first friend!</p>
            )}
        </div>
    );
};

export default Friends;
