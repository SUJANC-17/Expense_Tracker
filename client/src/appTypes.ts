export interface User {
    id: string;
    username: string;
    email: string;
    createdAt: string;
}

export interface Income {
    id: number;
    userId: string;
    amount: number;
    source: string;
    description: string;
    date: string;
}

export interface Expense {
    id: number;
    userId: string;
    amount: number;
    categoryId: number;
    description: string;
    date: string;
}

export interface Split {
    id: number;
    userId: string;
    friendName: string;
    amount: number;
    description: string;
    date: string;
    isPaid: boolean;
}

export interface Category {
    id: number;
    name: string;
    icon?: string;
}

export interface Friend {
    id: number;
    name: string;
    createdAt?: string;
}
