import cron from 'node-cron';
import pool from '../config/db.js';
import { sanitizeUid } from '../utils/tableUtils.js';

export const startCleanupScheduler = () => {
    // Run every day at 03:00 AM
    cron.schedule('0 3 * * *', async () => {
        console.log('Running inactive user cleanup job...');
        const conn = await pool.getConnection();

        try {
            // Find users inactive for more than 1 month
            const [users] = await conn.query('SELECT id, email FROM users WHERE last_active_at < NOW() - INTERVAL 1 MONTH');

            if ((users as any[]).length === 0) {
                console.log('No inactive users found.');
                return;
            }

            for (const user of (users as any[])) {
                console.log(`Processing inactive user: ${user.email} (${user.id})`);
                await deleteUserData(conn, user.id);
            }
        } catch (error) {
            console.error('Error in cleanup job:', error);
        } finally {
            conn.release();
        }
    });

    console.log('Inactive user cleanup scheduler started (03:00 AM daily).');
};

const deleteUserData = async (conn: any, uid: string) => {
    try {
        await conn.beginTransaction();

        // Find all tables related to this user
        // We look for tables containing the sanitized UID
        const sUid = sanitizeUid(uid);
        const [allTables] = await conn.query('SHOW TABLES');
        const dbTables = allTables.map((r: any) => Object.values(r)[0]);

        // Match tables like user_<uid>_...
        // Using strict inclusion of the full sanitized UID to avoid partial matches
        const userTables = dbTables.filter((t: string) => t.includes(sUid));

        if (userTables.length > 0) {
            for (const table of userTables) {
                await conn.query(`DROP TABLE IF EXISTS \`${table}\``);
                console.log(`Dropped table: ${table}`);
            }
        } else {
            console.log(`No tables found for user ${uid}`);
        }

        // Delete user record
        await conn.query('DELETE FROM users WHERE id = ?', [uid]);
        console.log(`Deleted user record for ${uid}`);

        await conn.commit();
        console.log(`Successfully cleaned up user ${uid}`);
    } catch (error) {
        await conn.rollback();
        console.error(`Failed to cleanup user ${uid}:`, error);
        throw error; // Re-throw to be caught by the scheduler loop
    }
};
