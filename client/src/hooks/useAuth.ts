import { useState, useEffect } from 'react';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
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
                    email: firebaseUser.email || '',
                    createdAt: firebaseUser.metadata.creationTime || new Date().toISOString(),
                };
                setUser(appUser);
                // Register/Login in backend
                apiClient.post('/auth/register', {}).catch(err => console.error('Silent registration error:', err));
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

    const loginWithGoogle = async (): Promise<void> => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const appUser: User = {
                id: result.user.uid,
                email: result.user.email || '',
                createdAt: result.user.metadata.creationTime || new Date().toISOString(),
            };
            localStorage.setItem('user', JSON.stringify(appUser));
            setUser(appUser);
        } catch (error) {
            console.error('Error signing in with Google:', error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
            localStorage.removeItem('user');
            setUser(null);
        } catch (error) {
            console.error('Error signing out:', error);
            throw error;
        }
    };

    return { user, loading, loginWithGoogle, logout };
};
