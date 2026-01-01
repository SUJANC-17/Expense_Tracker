import React, { useEffect, useState } from 'react';
import { apiClient } from '../utils/api';
import './Dashboard.css';

interface CategoryTotal {
    category: string;
    total: number;
}

interface Summary {
    year: number;
    month: number;
    total_income: number;
    total_expense: number;
    balance: number;
    all_time_balance: number;
    expenses_by_category: CategoryTotal[];
    total_unpaid_splits: number;
    incomes?: Array<{ id: number; amount: number; source: string; description: string; date: string }>;
    expenses?: Array<{ id: number; amount: number; category: string; description: string; date: string }>;
    splits?: Array<{ id: number; friend_name: string; amount: number; description: string; date: string; is_paid: boolean }>;
}

const Dashboard: React.FC = () => {
    const [summary, setSummary] = useState<Summary | null>(null);
    const [loading, setLoading] = useState(true);
    const [viewMonth, setViewMonth] = useState(new Date().getMonth() + 1);
    const [viewYear, setViewYear] = useState(new Date().getFullYear());

    useEffect(() => {
        fetchSummary(viewMonth, viewYear);

        // Listen for split creation events to refresh dashboard
        const handleSplitCreated = () => {
            fetchSummary(viewMonth, viewYear);
        };

        window.addEventListener('splitCreated', handleSplitCreated);

        return () => {
            window.removeEventListener('splitCreated', handleSplitCreated);
        };
    }, [viewMonth, viewYear]);

    const fetchSummary = async (month: number, year: number) => {
        setLoading(true);
        try {
            console.log(`Fetching detailed dashboard summary for ${month}/${year}...`);
            const data = await apiClient.get(`/summary/detailed?year=${year}&month=${month}`);
            const currentData = await apiClient.get('/summary/current');

            setSummary({
                ...data,
                total_unpaid_splits: currentData.total_unpaid_splits
            });
        } catch (error) {
            console.error('Error fetching summary:', error);
            setSummary({
                year,
                month,
                total_income: 0,
                total_expense: 0,
                balance: 0,
                all_time_balance: 0,
                expenses_by_category: [],
                total_unpaid_splits: 0
            });
        } finally {
            setLoading(false);
        }
    };


    if (loading) {
        return (
            <div className="dashboard">
                <div className="spinner"></div>
            </div>
        );
    }

    if (!summary) {
        return (
            <div className="dashboard">
                <div className="dashboard-header">
                    <h1 className="page-title">Dashboard</h1>
                    <p className="page-subtitle">Unable to load data</p>
                </div>
                <div className="summary-cards">
                    <div className="summary-card glass-card">
                        <p>Please check your connection and try refreshing the page.</p>
                    </div>
                </div>
            </div>
        );
    }

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <div className="title-section">
                    <h1 className="page-title">Dashboard</h1>
                    <p className="page-subtitle">
                        {monthNames[summary.month - 1]} {summary.year}
                    </p>
                </div>

                <div className="report-controls glass-card">
                    <div className="control-group">
                        <label className="input-label">View Period</label>
                        <div className="selector-row">
                            <select
                                className="input-field select-sm"
                                value={viewMonth}
                                onChange={(e) => setViewMonth(parseInt(e.target.value))}
                            >
                                {monthNames.map((name, index) => (
                                    <option key={name} value={index + 1}>{name}</option>
                                ))}
                            </select>
                            <select
                                className="input-field select-sm"
                                value={viewYear}
                                onChange={(e) => setViewYear(parseInt(e.target.value))}
                            >
                                {years.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={() => {
                            apiClient.post('/reports/generate', {
                                year: viewYear,
                                month: viewMonth
                            }).then(() => {
                                alert(`Report for ${monthNames[viewMonth - 1]} ${viewYear} sent to your email!`);
                            }).catch(() => {
                                alert('Failed to send report');
                            });
                        }}
                    >
                        📧 Send PDF Report
                    </button>
                </div>
            </div>

            <div className="summary-cards">
                <div className="summary-card glass-card income-card">
                    <div className="card-icon">💰</div>
                    <div className="card-content">
                        <h3 className="card-label">Total Income</h3>
                        <p className="card-value">₹{Number(summary.total_income).toFixed(2)}</p>
                    </div>
                </div>

                <div className="summary-card glass-card expense-card">
                    <div className="card-icon">💸</div>
                    <div className="card-content">
                        <h3 className="card-label">Total Expense</h3>
                        <p className="card-value">₹{Number(summary.total_expense).toFixed(2)}</p>
                    </div>
                </div>

                <div className={`summary-card glass-card ${summary.all_time_balance >= 0 ? 'balance-positive' : 'balance-negative'}`}>
                    <div className="card-icon">{summary.all_time_balance >= 0 ? '👑' : '📉'}</div>
                    <div className="card-content">
                        <h3 className="card-label">Lifetime Balance</h3>
                        <p className="card-value">₹{Number(summary.all_time_balance).toFixed(2)}</p>
                    </div>
                </div>

                <div className={`summary-card glass-card ${summary.balance >= 0 ? 'balance-positive' : 'balance-negative'}`}>
                    <div className="card-icon">{summary.balance >= 0 ? '📅' : '📉'}</div>
                    <div className="card-content">
                        <h3 className="card-label">Monthly Balance</h3>
                        <p className="card-value">₹{Number(summary.balance).toFixed(2)}</p>
                    </div>
                </div>
            </div>

            <div className="dashboard-grid">
                <div className="grid-left">
                    {/* Transaction Details - Hidden for December */}
                    {summary.month !== 12 && (
                        <div className="details-section">
                            <h2 className="section-title">Detailed Transactions for {monthNames[summary.month - 1]}</h2>

                            {summary.expenses && summary.expenses.length > 0 && (
                                <div className="table-wrapper glass-card">
                                    <h3 className="table-subtitle">Expenses</h3>
                                    <div className="table-container">
                                        <table className="data-table">
                                            <thead>
                                                <tr>
                                                    <th>Category</th>
                                                    <th>Description</th>
                                                    <th>Date</th>
                                                    <th className="text-right">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {summary.expenses.map(e => (
                                                    <tr key={e.id}>
                                                        <td><span className="badge">{e.category}</span></td>
                                                        <td>{e.description}</td>
                                                        <td>{new Date(e.date).toLocaleDateString()}</td>
                                                        <td className="text-right text-danger">-₹{Number(e.amount).toFixed(2)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {summary.incomes && summary.incomes.length > 0 && (
                                <div className="table-wrapper glass-card">
                                    <h3 className="table-subtitle text-success">Incomes</h3>
                                    <div className="table-container">
                                        <table className="data-table">
                                            <thead>
                                                <tr>
                                                    <th>Source</th>
                                                    <th>Description</th>
                                                    <th>Date</th>
                                                    <th className="text-right">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {summary.incomes.map(i => (
                                                    <tr key={i.id}>
                                                        <td>{i.source}</td>
                                                        <td>{i.description}</td>
                                                        <td>{new Date(i.date).toLocaleDateString()}</td>
                                                        <td className="text-right text-success">+₹{Number(i.amount).toFixed(2)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="grid-right">
                    {/* Category Breakdown */}
                    {Array.isArray(summary.expenses_by_category) && summary.expenses_by_category.length > 0 && (
                        <div className="category-breakdown glass-card">
                            <h2 className="section-title">Expenses by Category</h2>
                            <div className="category-list">
                                {summary.expenses_by_category.map((cat, index) => (
                                    <div key={index} className="category-item">
                                        <div className="category-info">
                                            <span className="category-name">{cat.category}</span>
                                            <div className="category-progress-bg">
                                                <div
                                                    className="category-progress-fill"
                                                    style={{ width: `${(cat.total / summary.total_expense) * 100}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                        <span className="category-amount">₹{Number(cat.total).toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {summary.total_unpaid_splits > 0 && (
                        <div className="unpaid-alert glass-card">
                            <div className="alert-icon">⏳</div>
                            <div className="alert-content">
                                <h3 className="alert-title">Amount Owed to You</h3>
                                <p className="alert-amount">₹{Number(summary.total_unpaid_splits).toFixed(2)}</p>
                                <p className="alert-note">(Across all months)</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
