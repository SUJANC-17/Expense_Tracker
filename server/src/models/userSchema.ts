import pool from '../config/db.js';
import type { RowDataPacket } from 'mysql2/promise';
import { getUserTableName } from '../utils/tableUtils.js';

export const createUserTables = async (uid: string): Promise<void> => {
    const incomeTable = getUserTableName(uid, 'incomes');
    const expenseTable = getUserTableName(uid, 'expenses');
    const splitTable = getUserTableName(uid, 'splits');
    const friendTable = getUserTableName(uid, 'friends');

    try {
        const [dbCheck] = await pool.query<RowDataPacket[]>('SELECT DATABASE() as db');
        const dbName = dbCheck && dbCheck[0] ? dbCheck[0].db : 'unknown';
        console.log(`Creating tables for user ${uid} in database: ${dbName}`);

        // Create user-specific friends table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS \`${friendTable}\` (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(\`name\`)
            )
        `);

        // Ensure "Myself" profile exists
        await pool.query(`
            INSERT IGNORE INTO \`${friendTable}\` (name) VALUES ('Myself')
        `);

        // Create user-specific incomes table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS \`${incomeTable}\` (
                id INT AUTO_INCREMENT PRIMARY KEY,
                amount DECIMAL(10, 2) NOT NULL,
                source VARCHAR(255) NOT NULL,
                description TEXT,
                date DATE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create user-specific expenses table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS \`${expenseTable}\` (
                id INT AUTO_INCREMENT PRIMARY KEY,
                amount DECIMAL(10, 2) NOT NULL,
                category_id INT NOT NULL,
                description TEXT,
                date DATE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (category_id) REFERENCES categories(id)
            )
        `);

        // Create user-specific splits table with friend association and paid_at
        await pool.query(`
            CREATE TABLE IF NOT EXISTS \`${splitTable}\` (
                id INT AUTO_INCREMENT PRIMARY KEY,
                friend_id INT,
                friend_name VARCHAR(255),
                amount DECIMAL(10, 2) NOT NULL,
                description TEXT,
                is_paid BOOLEAN DEFAULT FALSE,
                paid_at TIMESTAMP NULL,
                date DATE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Add missing columns if they don't exist
        try {
            await pool.query(`ALTER TABLE \`${splitTable}\` ADD COLUMN friend_id INT`);
        } catch (e) { /* Column might already exist */ }
        
        try {
            await pool.query(`ALTER TABLE \`${splitTable}\` ADD COLUMN friend_name VARCHAR(255)`);
        } catch (e) { /* Column might already exist */ }
        
        try {
            await pool.query(`ALTER TABLE \`${splitTable}\` ADD COLUMN paid_at TIMESTAMP NULL`);
        } catch (e) { /* Column might already exist */ }

        // Add foreign key constraint separately to avoid issues
        try {
            await pool.query(`
                ALTER TABLE \`${splitTable}\` 
                ADD CONSTRAINT \`fk_${splitTable}_friend\` 
                FOREIGN KEY (friend_id) REFERENCES \`${friendTable}\`(id) ON DELETE SET NULL
            `);
        } catch (fkError) {
            // Constraint might already exist, ignore error
            console.log(`Foreign key constraint for ${splitTable} might already exist`);
        }

        console.log(`Tables created successfully for user: ${uid}`);
        
        // Verify tables were created
        const [tables] = await pool.query<RowDataPacket[]>(
            'SHOW TABLES LIKE ?', [`user_${uid.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_%`]
        );
        console.log(`Created ${tables.length} tables for user ${uid}`);
    } catch (error) {
        console.error(`Error creating tables for user ${uid}:`, error);
        throw error;
    }
};
