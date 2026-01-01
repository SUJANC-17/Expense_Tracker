const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const getAuthToken = async (): Promise<string | null> => {
    const user = (await import('firebase/auth')).getAuth().currentUser;
    if (!user) return null;
    return await user.getIdToken();
};

export const apiClient = {
    async get(endpoint: string) {
        const token = await getAuthToken();
        const response = await fetch(`${API_URL}${endpoint}`, {
            headers: {
                'Authorization': token ? `Bearer ${token}` : '',
                'ngrok-skip-browser-warning': 'true',
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
                'ngrok-skip-browser-warning': 'true',
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
                'ngrok-skip-browser-warning': 'true',
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
                'ngrok-skip-browser-warning': 'true',
            },
        });
        if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
        return response.json();
    },
};
