import cron from 'node-cron';
import pool from '../config/db.js';
import { sanitizeUid, getUserTableName } from '../utils/tableUtils.js';
import { sendInactivityDeletionNotice } from './emailService.js';
import type { RowDataPacket } from 'mysql2/promise';

export const startCleanupScheduler = () => {
    // Run every day at 03:00 AM
    cron.schedule('0 3 * * *', async () => {
        console.log('Running inactive user cleanup job...');
        await runCleanup();
    });

    console.log('Inactive user cleanup scheduler started (03:00 AM daily).');
};

export const runCleanup = async () => {
    const conn = await pool.getConnection();

    try {
        // Find users inactive for more than 30 days
        const [users] = await conn.query<RowDataPacket[]>('SELECT id, email FROM users WHERE last_active_at < NOW() - INTERVAL 30 DAY');

        if (users.length === 0) {
            console.log('No inactive users found.');
            return;
        }

        for (const user of users) {
            console.log(`Processing inactive user: ${user.email} (${user.id})`);
            await processUserCleanup(conn, user.id, user.email);
        }
    } catch (error) {
        console.error('Error in cleanup job:', error);
    } finally {
        conn.release();
    }
};

async function getUserFullData(conn: any, uid: string): Promise<any> {
    const incomeTable = getUserTableName(uid, 'incomes');
    const expenseTable = getUserTableName(uid, 'expenses');
    const splitTable = getUserTableName(uid, 'splits');
    const friendTable = getUserTableName(uid, 'friends');

    const data: any = {};

    try {
        const [rows] = await conn.query(`SELECT * FROM \`${incomeTable}\``);
        data.incomes = rows;
    } catch (e) { data.incomes = []; }

    try {
        const [rows] = await conn.query(`SELECT * FROM \`${expenseTable}\``);
        data.expenses = rows;
    } catch (e) { data.expenses = []; }

    try {
        const [rows] = await conn.query(`SELECT * FROM \`${splitTable}\``);
        data.splits = rows;
    } catch (e) { data.splits = []; }

    try {
        const [rows] = await conn.query(`SELECT * FROM \`${friendTable}\``);
        data.friends = rows;
    } catch (e) { data.friends = []; }

    return data;
}

async function deleteUserData(conn: any, uid: string) {
    try {
        await conn.beginTransaction();

        const sUid = sanitizeUid(uid);
        const [allTables] = await conn.query('SHOW TABLES');
        const dbTables = allTables.map((r: any) => Object.values(r)[0]);

        const userTables = dbTables.filter((t: string) => t.includes(sUid));

        if (userTables.length > 0) {
            await conn.query('SET FOREIGN_KEY_CHECKS = 0');
            for (const table of userTables) {
                await conn.query(`DROP TABLE IF EXISTS \`${table}\``);
                console.log(`Dropped table: ${table}`);
            }
            await conn.query('SET FOREIGN_KEY_CHECKS = 1');
        }

        await conn.query('DELETE FROM users WHERE id = ?', [uid]);
        await conn.commit();
    } catch (error) {
        await conn.rollback();
        // Ensure we re-enable checks if something fails, though rollback might handle transaction scope
        try { await conn.query('SET FOREIGN_KEY_CHECKS = 1'); } catch (e) { }
        throw error;
    }
}

export const processUserCleanup = async (conn: any, uid: string, email: string) => {
    try {
        const fullData = await getUserFullData(conn, uid);

        try {
            await sendInactivityDeletionNotice(email, fullData);
        } catch (emailError) {
            console.error(`Failed to send cleanup email to ${email}, proceeding with deletion anyway:`, emailError);
        }

        await deleteUserData(conn, uid);
    } catch (error) {
        console.error(`Error processing cleanup for user ${uid}:`, error);
        throw error;
    }
};
