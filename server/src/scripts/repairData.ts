import db from '../config/db.js';
import { sanitizeUid, getUserTableName } from '../utils/tableUtils.js';

/**
 * OLD sanitize function to find legacy tables
 */
const getLegacyTableName = (uid: string, baseName: string): string => {
    const sUid = uid.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    return `user_${sUid}_${baseName}`;
};

const repairData = () => {
    console.log('Starting Data Migration (SQLite)...');

    try {
        // 1. Get all users
        const users = db.prepare('SELECT id FROM users').all() as any[];
        console.log(`Found ${users.length} users to process.`);

        for (const user of users) {
             const uid = user.id;
            console.log(`\nProcessing User: ${uid}`);

            // 2. Process Tables
            migrateTable(uid, 'friends');
            migrateTable(uid, 'incomes');
            migrateTable(uid, 'expenses');
            migrateTable(uid, 'splits');
        }

        console.log('\nMigration Completed Successfully.');
        process.exit(0);

    } catch (error) {
        console.error('Migration Failed:', error);
        process.exit(1);
    }
};

const migrateTable = (uid: string, baseName: string) => {
    const oldTable = getLegacyTableName(uid, baseName);
    const newTable = getUserTableName(uid, baseName);

    console.log(`  Converting ${baseName}: ${oldTable} -> ${newTable}`);

    // Check if old table exists
    const exists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?").get(oldTable);

    if (!exists) {
        console.log(`    Skipping: Old table ${oldTable} not found.`);
        return;
    }

    // Check if new table exists
    const newExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?").get(newTable);

    if (!newExists) {
        console.log(`    Warning: New table ${newTable} missing. Skipping copy.`);
        return;
    }

    try {
        // Copy Data
        // SQLite: INSERT OR IGNORE
        console.log(`    Copying data...`);
        if (baseName === 'friends') {
            db.prepare(`INSERT OR IGNORE INTO \`${newTable}\` (name, created_at) SELECT name, created_at FROM \`${oldTable}\``).run();
        } else if (baseName === 'incomes') {
            db.prepare(`INSERT OR IGNORE INTO \`${newTable}\` (amount, source, description, date, created_at) SELECT amount, source, description, date, created_at FROM \`${oldTable}\``).run();
        } else if (baseName === 'expenses') {
            db.prepare(`INSERT OR IGNORE INTO \`${newTable}\` (amount, category_id, description, date, created_at) SELECT amount, category_id, description, date, created_at FROM \`${oldTable}\``).run();
        } else if (baseName === 'splits') {
            db.prepare(`INSERT OR IGNORE INTO \`${newTable}\` (friend_id, friend_name, amount, description, is_paid, paid_at, date, created_at) SELECT friend_id, friend_name, amount, description, is_paid, paid_at, date, created_at FROM \`${oldTable}\``).run();
        }

        console.log(`    Success. Dropping old table...`);
        db.prepare(`DROP TABLE \`${oldTable}\``).run();

    } catch (err: any) {
        console.error(`    Error migrating ${oldTable}:`, err.message);
    }
};

repairData();
