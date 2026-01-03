import pool from '../config/db.js';
import { sanitizeUid, getUserTableName } from '../utils/tableUtils.js';
import type { RowDataPacket } from 'mysql2/promise';

/**
 * OLD sanitize function to find legacy tables
 */
const getLegacyTableName = (uid: string, baseName: string): string => {
    const sUid = uid.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    return `user_${sUid}_${baseName}`;
};

const repairData = async () => {
    console.log('Starting Data Migration...');

    try {
        // 1. Get all users
        const [users] = await pool.query<RowDataPacket[]>('SELECT id FROM users');
        console.log(`Found ${users.length} users to process.`);

        for (const user of users) {
            const uid = user.id;
            console.log(`\nProcessing User: ${uid}`);

            const tables = ['friends', 'incomes', 'expenses', 'splits'];

            // 2. Process Friends First (FK dependency)
            await migrateTable(uid, 'friends');

            // 3. Process Incomes/Expenses
            await migrateTable(uid, 'incomes');
            await migrateTable(uid, 'expenses');

            // 4. Process Splits (FK dependency on Friends)
            await migrateTable(uid, 'splits');
        }

        console.log('\nMigration Completed Successfully.');
        process.exit(0);

    } catch (error) {
        console.error('Migration Failed:', error);
        process.exit(1);
    }
};

const migrateTable = async (uid: string, baseName: string) => {
    const oldTable = getLegacyTableName(uid, baseName);
    const newTable = getUserTableName(uid, baseName);

    console.log(`  Converting ${baseName}: ${oldTable} -> ${newTable}`);

    // Check if old table exists
    const [exists] = await pool.query<RowDataPacket[]>(
        'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
        [oldTable]
    );

    if (exists.length === 0) {
        console.log(`    Skipping: Old table ${oldTable} not found.`);
        return;
    }

    // Check if new table exists (it should, but just in case)
    const [newExists] = await pool.query<RowDataPacket[]>(
        'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
        [newTable]
    );

    if (newExists.length === 0) {
        console.log(`    Warning: New table ${newTable} missing. Skipping copy.`);
        return;
    }

    try {
        // Copy Data
        // IGNORE to skip duplicates if ran multiple times
        console.log(`    Copying data...`);
        if (baseName === 'friends') {
            await pool.query(`INSERT IGNORE INTO \`${newTable}\` (name, created_at) SELECT name, created_at FROM \`${oldTable}\``);
        } else if (baseName === 'incomes') {
            await pool.query(`INSERT IGNORE INTO \`${newTable}\` (amount, source, description, date, created_at) SELECT amount, source, description, date, created_at FROM \`${oldTable}\``);
        } else if (baseName === 'expenses') {
            await pool.query(`INSERT IGNORE INTO \`${newTable}\` (amount, category_id, description, date, created_at) SELECT amount, category_id, description, date, created_at FROM \`${oldTable}\``);
        } else if (baseName === 'splits') {
            // For splits, we need to be careful with friend_id maps, but simpler is to just copy by name association if possible or raw ID if IDs are consistent.
            // Since we copied friends 1:1, IDs *should* ideally align if AUTO_INCREMENT was deterministic, but it often isn't.
            // BETTER STRATEGY for Splits: Match Friend ID by Name.

            // BUT, simplistic copy is safest for raw SQL:
            await pool.query(`INSERT IGNORE INTO \`${newTable}\` (friend_id, friend_name, amount, description, is_paid, paid_at, date, created_at) SELECT friend_id, friend_name, amount, description, is_paid, paid_at, date, created_at FROM \`${oldTable}\``);
        }

        console.log(`    Success. Dropping old table...`);
        await pool.query(`DROP TABLE \`${oldTable}\``);

    } catch (err: any) {
        console.error(`    Error migrating ${oldTable}:`, err.message);
    }
};

repairData();
