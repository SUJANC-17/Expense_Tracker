import { useState, useEffect } from 'react';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    updateProfile,
} from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import { apiClient } from '../utils/api';
import type { User } from '../appTypes';

export const useAuth = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                const appUser: User = {
                    id: firebaseUser.uid,
                    username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
                    email: firebaseUser.email || '',
                    createdAt: firebaseUser.metadata.creationTime || new Date().toISOString(),
                };
                setUser(appUser);
                const notifyLogin = sessionStorage.getItem('login_notification_pending') === 'true' && !sessionStorage.getItem('session_synced');
                apiClient.post('/auth/register', { notifyLogin, username: appUser.username })
                    .then((res) => {
                        if (res?.user) {
                            const syncedUser: User = {
                                id: res.user.id,
                                username: res.user.username || appUser.username,
                                email: res.user.email || appUser.email,
                                createdAt: res.user.created_at || appUser.createdAt,
                            };
                            setUser(syncedUser);
                            localStorage.setItem('user', JSON.stringify(syncedUser));
                        }
                    })
                    .catch(err => console.error('Silent registration error:', err))
                    .finally(() => {
                        sessionStorage.removeItem('login_notification_pending');
                        sessionStorage.setItem('session_synced', 'true');
                    });
                // Store user in localStorage for API authentication
                localStorage.setItem('user', JSON.stringify(appUser));
            } else {
                setUser(null);
                localStorage.removeItem('user');
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const sendLoginNotification = async () => {
        try {
            await apiClient.post('/auth/login', {});
        } catch (error) {
            console.error('Error sending login notification:', error);
        }
    };

    const login = async (email: string, password: string): Promise<void> => {
        try {
            sessionStorage.setItem('login_notification_pending', 'true');
            await signInWithEmailAndPassword(auth, email, password);
            await sendLoginNotification();
        } catch (error) {
            sessionStorage.removeItem('login_notification_pending');
            console.error('Error signing in:', error);
            throw error;
        }
    };

    const signup = async (username: string, email: string, password: string): Promise<void> => {
        try {
            const result = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(result.user, { displayName: username });
            await apiClient.post('/auth/register', { username });
            await signOut(auth);
            sessionStorage.removeItem('session_synced');
            sessionStorage.removeItem('login_notification_pending');
        } catch (error) {
            console.error('Error signing up:', error);
            throw error;
        }
    };

    const loginWithGoogle = async (): Promise<void> => {
        try {
            sessionStorage.setItem('login_notification_pending', 'true');
            const result = await signInWithPopup(auth, googleProvider);
            const appUser: User = {
                id: result.user.uid,
                username: result.user.displayName || result.user.email?.split('@')[0] || 'User',
                email: result.user.email || '',
                createdAt: result.user.metadata.creationTime || new Date().toISOString(),
            };
            localStorage.setItem('user', JSON.stringify(appUser));
            setUser(appUser);
            await sendLoginNotification();
        } catch (error) {
            sessionStorage.removeItem('login_notification_pending');
            console.error('Error signing in with Google:', error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
            localStorage.removeItem('user');
            sessionStorage.removeItem('session_synced');
            sessionStorage.removeItem('login_notification_pending');
            setUser(null);
        } catch (error) {
            console.error('Error signing out:', error);
            throw error;
        }
    };

    return { user, loading, login, signup, loginWithGoogle, logout };
};
