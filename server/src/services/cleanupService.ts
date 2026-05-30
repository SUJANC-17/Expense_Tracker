import cron from 'node-cron';
import db from '../config/db.js';
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
    return {
        incomes: db.prepare('SELECT * FROM incomes WHERE user_id = ?').all(uid),
        expenses: db.prepare('SELECT * FROM expenses WHERE user_id = ?').all(uid),
        splits: db.prepare('SELECT * FROM splits WHERE user_id = ?').all(uid),
        friends: db.prepare('SELECT * FROM friends WHERE user_id = ?').all(uid),
    };
}

function deleteUserData(uid: string) {
    db.transaction(() => {
        db.prepare('DELETE FROM splits WHERE user_id = ?').run(uid);
        db.prepare('DELETE FROM expenses WHERE user_id = ?').run(uid);
        db.prepare('DELETE FROM incomes WHERE user_id = ?').run(uid);
        db.prepare('DELETE FROM friends WHERE user_id = ?').run(uid);
        db.prepare('DELETE FROM users WHERE id = ?').run(uid);
    })();
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
