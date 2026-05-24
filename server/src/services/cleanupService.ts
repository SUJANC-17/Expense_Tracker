import cron from 'node-cron';
import db from '../config/db.js';
import { sanitizeUid, getUserTableName } from '../utils/tableUtils.js';
import { sendInactivityDeletionNotice } from './emailService.js';

export const startCleanupScheduler = () => {
    // Run every day at 03:00 AM
    cron.schedule('0 3 * * *', async () => {
        console.log('Running inactive user cleanup job...');
        runCleanup();
    });

    console.log('Inactive user cleanup scheduler started (03:00 AM daily).');
};

export const runCleanup = () => {
    try {
        // Find users inactive for more than 30 days
        // SQLite: last_active_at < date('now', '-30 days')
        const users = db.prepare("SELECT id, email FROM users WHERE last_active_at < date('now', '-30 days')").all() as any[];

        if (users.length === 0) {
            console.log('No inactive users found.');
            return;
        }

        for (const user of users) {
            console.log(`Processing inactive user: ${user.email} (${user.id})`);
            processUserCleanup(user.id, user.email);
        }
    } catch (error) {
        console.error('Error in cleanup job:', error);
    }
};

function getUserFullData(uid: string): any {
    const incomeTable = getUserTableName(uid, 'incomes');
    const expenseTable = getUserTableName(uid, 'expenses');
    const splitTable = getUserTableName(uid, 'splits');
    const friendTable = getUserTableName(uid, 'friends');

    const data: any = {};

    try {
        data.incomes = db.prepare(`SELECT * FROM \`${incomeTable}\``).all();
    } catch (e) { data.incomes = []; }

    try {
        data.expenses = db.prepare(`SELECT * FROM \`${expenseTable}\``).all();
    } catch (e) { data.expenses = []; }

    try {
        data.splits = db.prepare(`SELECT * FROM \`${splitTable}\``).all();
    } catch (e) { data.splits = []; }

    try {
        data.friends = db.prepare(`SELECT * FROM \`${friendTable}\``).all();
    } catch (e) { data.friends = []; }

    return data;
}

function deleteUserData(uid: string) {
    try {
        db.transaction(() => {
            const sUid = sanitizeUid(uid);
            const allTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as any[];
            const dbTables = allTables.map(r => r.name);

            const userTables = dbTables.filter((t: string) => t.includes(sUid));

            if (userTables.length > 0) {
                // SQLite doesn't have SET FOREIGN_KEY_CHECKS = 0; it has PRAGMA foreign_keys = OFF;
                // But DROP TABLE usually doesn't care if it's not a circular dependency.
                db.pragma('foreign_keys = OFF');
                for (const table of userTables) {
                    db.prepare(`DROP TABLE IF EXISTS \`${table}\``).run();
                    console.log(`Dropped table: ${table}`);
                }
                db.pragma('foreign_keys = ON');
            }

            db.prepare('DELETE FROM users WHERE id = ?').run(uid);
        })();
    } catch (error) {
        throw error;
    }
}

export const processUserCleanup = (uid: string, email: string) => {
    try {
        const fullData = getUserFullData(uid);

        // email sending is still async, but we don't need to await it for the cleanup flow to continue
        // unless we want to ensure it's sent before deleting. 
        // Given this is a background job, we'll fire and forget or wrap in async if needed.
        sendInactivityDeletionNotice(email, fullData).catch(emailError => {
            console.error(`Failed to send cleanup email to ${email}, proceeding with deletion anyway:`, emailError);
        });

        deleteUserData(uid);
    } catch (error) {
        console.error(`Error processing cleanup for user ${uid}:`, error);
        throw error;
    }
};
