import { useEffect, useState } from 'react';
import {
    fetchSignInMethodsForEmail,
    EmailAuthProvider,
    linkWithCredential,
    linkWithPopup,
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut,
    onAuthStateChanged,
} from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import { apiClient } from '../utils/api';
import { getFriendlyAuthError } from '../utils/authErrors';
import type { User } from '../appTypes';

const MISMATCH_MESSAGE = 'This email is already registered with a different login method';

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const mapFirebaseUser = (firebaseUser: any): User => ({
    id: firebaseUser.uid,
    username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
    email: firebaseUser.email || '',
    createdAt: firebaseUser.metadata?.creationTime || new Date().toISOString(),
    photoURL: firebaseUser.photoURL || null,
    authProvider: firebaseUser.providerData?.[0]?.providerId || null,
    providerIds: (firebaseUser.providerData || [])
        .map((provider: any) => provider?.providerId)
        .filter(Boolean),
    hasPassword: (firebaseUser.providerData || []).some((provider: any) => provider?.providerId === 'password'),
    hasGoogle: (firebaseUser.providerData || []).some((provider: any) => provider?.providerId === 'google.com'),
});

const getActiveProviderId = (firebaseUser: any): string | null => {
    const providers = firebaseUser?.providerData || [];
    return providers.find((provider: any) => provider?.providerId)?.providerId || null;
};

export const useAuth = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    const flowMode = sessionStorage.getItem('auth_flow_mode');
                    await registerSession(firebaseUser, {
                        notifyLogin: false,
                        allowCreate: flowMode === 'signup-google',
                    });
                } catch (error) {
                    console.error('Session validation failed:', error);
                    try {
                        await signOut(auth);
                    } catch (_) {
                        // ignore sign-out cleanup errors
                    }
                    setUser(null);
                    localStorage.removeItem('user');
                }
            } else {
                setUser(null);
                localStorage.removeItem('user');
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const registerSession = async (
        firebaseUser: any,
        options: { notifyLogin?: boolean; allowCreate?: boolean } = {}
    ) => {
        const { notifyLogin = false, allowCreate = false } = options;
        const providerId = getActiveProviderId(firebaseUser);
        const appUser = mapFirebaseUser(firebaseUser);

        const registered: any = await apiClient.post('/auth/register', {
            username: appUser.username,
            photoURL: appUser.photoURL,
            providerIds: appUser.providerIds,
            allowCreate,
        });

        if (notifyLogin) {
            try {
                await apiClient.post('/auth/login', {});
            } catch (error) {
                console.error('Login notification failed:', error);
            }
        }

        const syncedUser: User = {
            id: registered?.user?.id || appUser.id,
            username: registered?.user?.username || appUser.username,
            email: registered?.user?.email || appUser.email,
            createdAt: registered?.user?.created_at || appUser.createdAt,
            photoURL: registered?.user?.photo_url || appUser.photoURL || null,
            authProvider: registered?.user?.auth_provider || providerId,
            providerIds: appUser.providerIds,
            hasPassword: appUser.hasPassword,
            hasGoogle: appUser.hasGoogle,
        };

        setUser(syncedUser);
        localStorage.setItem('user', JSON.stringify(syncedUser));
        sessionStorage.setItem('session_synced', 'true');
        sessionStorage.removeItem('login_notification_pending');
        sessionStorage.removeItem('auth_flow_mode');

        return syncedUser;
    };

    const login = async (email: string, password: string): Promise<void> => {
        const normalizedEmail = normalizeEmail(email);
        const methods = await fetchSignInMethodsForEmail(auth, normalizedEmail);
        if (methods.length > 0 && !methods.includes('password')) {
            throw new Error(MISMATCH_MESSAGE);
        }

        try {
            sessionStorage.setItem('login_notification_pending', 'true');
            const result = await signInWithEmailAndPassword(auth, normalizedEmail, password);
            try {
                await registerSession(result.user, { notifyLogin: true, allowCreate: false });
            } catch (registerError) {
                await signOut(auth);
                throw registerError;
            }
        } catch (error) {
            sessionStorage.removeItem('login_notification_pending');
            throw new Error(getFriendlyAuthError(error));
        }
    };

    const requestSignupOtp = async (username: string, email: string): Promise<{ challengeId: string; expiresInMinutes: number }> => {
        const normalizedEmail = normalizeEmail(email);
        const methods = await fetchSignInMethodsForEmail(auth, normalizedEmail);
        if (methods.length > 0) {
            throw new Error(MISMATCH_MESSAGE);
        }

        try {
            return await apiClient.post('/auth/signup/request-otp', {
                username: username.trim(),
                email: normalizedEmail,
            });
        } catch (error) {
            throw new Error(getFriendlyAuthError(error));
        }
    };

    const verifySignupOtp = async (payload: {
        challengeId: string;
        otp: string;
        username: string;
        email: string;
        password: string;
    }): Promise<void> => {
        const normalizedEmail = normalizeEmail(payload.email);

        try {
            await apiClient.post('/auth/signup/verify-otp', {
                challengeId: payload.challengeId,
                otp: payload.otp,
                username: payload.username.trim(),
                email: normalizedEmail,
                password: payload.password,
            });

            await login(normalizedEmail, payload.password);
        } catch (error) {
            throw new Error(getFriendlyAuthError(error));
        }
    };

    const loginWithGoogle = async (mode: 'login' | 'signup' = 'login'): Promise<void> => {
        try {
            sessionStorage.setItem('login_notification_pending', 'true');
            sessionStorage.setItem('auth_flow_mode', mode === 'signup' ? 'signup-google' : 'login-google');
            const result = await signInWithPopup(auth, googleProvider);
            const email = result.user.email ? normalizeEmail(result.user.email) : '';
            if (email) {
                const methods = await fetchSignInMethodsForEmail(auth, email);
                if (methods.length > 0 && !methods.includes('google.com')) {
                    await signOut(auth);
                    sessionStorage.removeItem('login_notification_pending');
                    throw new Error(MISMATCH_MESSAGE);
                }
            }
            try {
                await registerSession(result.user, {
                    notifyLogin: true,
                    allowCreate: mode === 'signup',
                });
            } catch (registerError) {
                await signOut(auth);
                throw registerError;
            }
        } catch (error) {
            sessionStorage.removeItem('login_notification_pending');
            sessionStorage.removeItem('auth_flow_mode');
            try {
                await signOut(auth);
            } catch (_) {
                // ignore sign-out cleanup errors
            }
            throw new Error(getFriendlyAuthError(error));
        }
    };

    const requestPasswordChangeOtp = async (): Promise<{ challengeId: string; expiresInMinutes: number }> => {
        try {
            return await apiClient.post('/auth/password-change/request-otp', {});
        } catch (error) {
            throw new Error(error instanceof Error ? error.message : 'Failed to send verification code');
        }
    };

    const verifyPasswordChangeOtp = async (challengeId: string, otp: string, newPassword: string): Promise<void> => {
        try {
            await apiClient.post('/auth/password-change/verify-otp', {
                challengeId,
                otp,
                newPassword,
            });
        } catch (error) {
            throw new Error(getFriendlyAuthError(error));
        }
    };

    const requestSetPasswordOtp = async (): Promise<{ challengeId: string; expiresInMinutes: number }> => {
        try {
            return await apiClient.post('/auth/password-setup/request-otp', {});
        } catch (error) {
            throw new Error(error instanceof Error ? error.message : 'Failed to send verification code');
        }
    };

    const verifySetPasswordOtp = async (challengeId: string, otp: string, newPassword: string): Promise<void> => {
        const currentUser = auth.currentUser;
        if (!currentUser?.email) {
            throw new Error('You must be signed in to set a password');
        }

        try {
            await apiClient.post('/auth/password-setup/verify-otp', {
                challengeId,
                otp,
            });

            const credential = EmailAuthProvider.credential(currentUser.email, newPassword);
            const result = await linkWithCredential(currentUser, credential);
            await registerSession(result.user, { notifyLogin: false, allowCreate: false });
        } catch (error) {
            throw new Error(getFriendlyAuthError(error));
        }
    };

    const linkGoogle = async (): Promise<void> => {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error('You must be signed in to link Google');
        }

        try {
            const result = await linkWithPopup(currentUser, googleProvider);
            await registerSession(result.user, { notifyLogin: false, allowCreate: false });
        } catch (error) {
            throw new Error(getFriendlyAuthError(error));
        }
    };

    const deleteAccount = async (): Promise<void> => {
        try {
            await apiClient.post('/auth/delete-account', {});
            await signOut(auth);
            localStorage.removeItem('user');
            sessionStorage.removeItem('session_synced');
            sessionStorage.removeItem('login_notification_pending');
            setUser(null);
        } catch (error) {
            throw new Error(getFriendlyAuthError(error));
        }
    };

    const logout = async () => {
        await signOut(auth);
        localStorage.removeItem('user');
        sessionStorage.removeItem('session_synced');
        sessionStorage.removeItem('login_notification_pending');
        setUser(null);
    };

    return {
        user,
        loading,
        login,
        requestSignupOtp,
        verifySignupOtp,
        loginWithGoogle,
        linkGoogle,
        requestPasswordChangeOtp,
        verifyPasswordChangeOtp,
        requestSetPasswordOtp,
        verifySetPasswordOtp,
        deleteAccount,
        logout,
    };
};
