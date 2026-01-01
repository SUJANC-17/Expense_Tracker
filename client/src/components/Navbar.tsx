import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar: React.FC = () => {
    const { logout } = useAuth();
    const location = useLocation();

    const isActive = (path: string) => location.pathname === path;

    return (
        <nav className="navbar glass-card">
            <div className="navbar-brand">
                <span className="brand-icon">💰</span>
                <span className="brand-name">Expense Tracker</span>
            </div>

            <div className="navbar-links">
                <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>
                    <span className="nav-icon">📊</span>
                    Dashboard
                </Link>
                <Link to="/income" className={`nav-link ${isActive('/income') ? 'active' : ''}`}>
                    <span className="nav-icon">💰</span>
                    Income
                </Link>
                <Link to="/expenses" className={`nav-link ${isActive('/expenses') ? 'active' : ''}`}>
                    <span className="nav-icon">💸</span>
                    Expenses
                </Link>
                <Link to="/splits" className={`nav-link ${isActive('/splits') ? 'active' : ''}`}>
                    <span className="nav-icon">🤝</span>
                    Splits
                </Link>
                <Link to="/friends" className={`nav-link ${isActive('/friends') ? 'active' : ''}`}>
                    <span className="nav-icon">👥</span>
                    Friends
                </Link>
            </div>

            <button onClick={logout} className="btn btn-secondary logout-btn">
                Logout
            </button>
        </nav>
    );
};

export default Navbar;
