import db from '../config/db.js';
import { getUserTableName, getOldUserTableName } from '../utils/tableUtils.js';

export const createUserTables = (uid: string): void => {
    const categories = ['incomes', 'expenses', 'splits', 'friends'];

    try {
        // Migration logic: Check if old tables exist and rename them
        for (const cat of categories) {
            const oldTable = getOldUserTableName(uid, cat);
            const newTable = getUserTableName(uid, cat);

            if (oldTable === newTable) continue;

            const oldExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(oldTable);

            if (oldExists) {
                const newExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(newTable);

                if (!newExists) {
                    console.log(`Migrating/Renaming old table ${oldTable} to ${newTable}...`);
                    db.exec(`ALTER TABLE "${oldTable}" RENAME TO "${newTable}"`);
                }
            }
        }

        const incomeTable = getUserTableName(uid, 'incomes');
        const expenseTable = getUserTableName(uid, 'expenses');
        const splitTable = getUserTableName(uid, 'splits');
        const friendTable = getUserTableName(uid, 'friends');

        console.log(`Creating/Verifying tables for user ${uid}`);

        db.transaction(() => {
            // Create user-specific friends table
            db.exec(`
                CREATE TABLE IF NOT EXISTS "${friendTable}" (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(name)
                )
            `);

            // Ensure "Myself" profile exists
            db.prepare(`INSERT OR IGNORE INTO "${friendTable}" (name) VALUES ('Myself')`).run();

            // Create user-specific incomes table
            db.exec(`
                CREATE TABLE IF NOT EXISTS "${incomeTable}" (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    amount REAL NOT NULL,
                    source TEXT NOT NULL,
                    description TEXT,
                    date TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Create user-specific expenses table
            db.exec(`
                CREATE TABLE IF NOT EXISTS "${expenseTable}" (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    amount REAL NOT NULL,
                    category_id INTEGER NOT NULL,
                    description TEXT,
                    date TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (category_id) REFERENCES categories(id)
                )
            `);

            // Create user-specific splits table
            db.exec(`
                CREATE TABLE IF NOT EXISTS "${splitTable}" (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    friend_id INTEGER,
                    friend_name TEXT,
                    amount REAL NOT NULL,
                    description TEXT,
                    is_paid INTEGER DEFAULT 0,
                    paid_at DATETIME NULL,
                    date TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (friend_id) REFERENCES "${friendTable}"(id) ON DELETE SET NULL
                )
            `);

            // Add missing columns if they don't exist
            const tableInfo = db.prepare(`PRAGMA table_info("${splitTable}")`).all() as any[];
            const columnNames = tableInfo.map(c => c.name);

            if (!columnNames.includes('friend_id')) {
                db.exec(`ALTER TABLE "${splitTable}" ADD COLUMN friend_id INTEGER`);
            }
            if (!columnNames.includes('friend_name')) {
                db.exec(`ALTER TABLE "${splitTable}" ADD COLUMN friend_name TEXT`);
            }
            if (!columnNames.includes('paid_at')) {
                db.exec(`ALTER TABLE "${splitTable}" ADD COLUMN paid_at DATETIME NULL`);
            }
        })();

        console.log(`Tables created successfully for user: ${uid}`);
    } catch (error) {
        console.error(`Error creating tables for user ${uid}:`, error);
        throw error;
    }
};
