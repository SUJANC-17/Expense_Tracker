const API_URL = import.meta.env.VITE_API_URL || '/api';

const getAdminToken = (): string | null => {
    return localStorage.getItem('admin_token');
};

export const adminApi = {
    async get(endpoint: string) {
        const token = getAdminToken();
        const response = await fetch(`${API_URL}${endpoint}`, {
            headers: {
                'Authorization': token ? `Bearer ${token}` : '',
            },
        });
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('admin_token');
                // Optional: Trigger a redirect or state change if needed
            }
            throw new Error(`API Error: ${response.statusText}`);
        }
        return response.json();
    },

    async post(endpoint: string, data: any) {
        const token = getAdminToken();
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

    async delete(endpoint: string) {
        const token = getAdminToken();
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
