import React, { createContext, useContext, useEffect, useState } from 'react';
import { type User, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../config/firebase';
import { apiClient } from '../utils/api';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    signup: (email: string, password: string) => Promise<void>;
    loginWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setUser(user);

            // Register user in backend if new
            if (user) {
                const notifyLogin = sessionStorage.getItem('login_notification_pending') === 'true' && !sessionStorage.getItem('session_synced');
                try {
                    await apiClient.post('/auth/register', { notifyLogin });
                } catch (error) {
                    console.error('Error registering user:', error);
                } finally {
                    sessionStorage.removeItem('login_notification_pending');
                    sessionStorage.setItem('session_synced', 'true');
                }
            }

            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const login = async (email: string, password: string) => {
        sessionStorage.setItem('login_notification_pending', 'true');
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            sessionStorage.removeItem('login_notification_pending');
            throw error;
        }
    };

    const signup = async (email: string, password: string) => {
        await createUserWithEmailAndPassword(auth, email, password);
    };

    const loginWithGoogle = async () => {
        const provider = new GoogleAuthProvider();
        sessionStorage.setItem('login_notification_pending', 'true');
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            sessionStorage.removeItem('login_notification_pending');
            throw error;
        }
    };

    const logout = async () => {
        await signOut(auth);
        sessionStorage.removeItem('session_synced');
        sessionStorage.removeItem('login_notification_pending');
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, signup, loginWithGoogle, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
