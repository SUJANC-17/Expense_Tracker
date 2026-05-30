import db from '../config/db.js';

export const createUserTables = (uid: string): void => {
    try {
        db.prepare('SELECT 1 FROM users WHERE id = ?').get(uid);
    } catch (error) {
        console.error(`Error verifying normalized tables for user ${uid}:`, error);
        throw error;
    }
};
