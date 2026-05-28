import { auth } from '../config/firebase';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000/api';

export const getAuthToken = async (): Promise<string | null> => {
    if (auth.currentUser) return auth.currentUser.getIdToken();

    return new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            unsubscribe();
            if (user) {
                const token = await user.getIdToken();
                console.log(`[API] Resolved user ${user.email}, Token: Yes`);
                resolve(token);
            } else {
                console.warn('[API] Auth resolved: No user logged in');
                resolve(null);
            }
        });
    });
};

export const apiClient = {
    async get(endpoint: string) {
        const token = await getAuthToken();
        const response = await fetch(`${API_URL}${endpoint}`, {
            headers: {
                'Authorization': token ? `Bearer ${token}` : '',
            },
        });
        if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
        return response.json();
    },

    async post(endpoint: string, data: any) {
        const token = await getAuthToken();
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : '',
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `API Error: ${response.statusText}`);
        }
        return response.json();
    },

    async put(endpoint: string, data: any) {
        const token = await getAuthToken();
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : '',
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
        return response.json();
    },

    async delete(endpoint: string) {
        const token = await getAuthToken();
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'DELETE',
            headers: {
                'Authorization': token ? `Bearer ${token}` : '',
            },
        });
        if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
        return response.json();
    },
};
