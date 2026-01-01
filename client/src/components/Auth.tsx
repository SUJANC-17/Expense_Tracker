import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const Auth: React.FC = () => {
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { loginWithGoogle } = useAuth();

    const handleGoogleLogin = async () => {
        setError('');
        setLoading(true);
        try {
            await loginWithGoogle();
        } catch (err: any) {
            setError(err.message || 'Google login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card glass-card">
                <div className="auth-header">
                    <h1 className="auth-title">💰 Expense Tracker</h1>
                    <p className="auth-subtitle">
                        Sign in to manage your expenses
                    </p>
                </div>

                {error && <div className="error-message">{error}</div>}

                <button
                    type="button"
                    className="btn btn-google w-full"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                >
                    <img 
                        src="https://developers.google.com/identity/images/g-logo.png" 
                        alt="Google" 
                        className="google-icon"
                    />
                    {loading ? 'Signing in...' : 'Continue with Google'}
                </button>
            </div>
        </div>
    );
};

export default Auth;
