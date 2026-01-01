import pool from './src/config/db.js';
import { getUserTableName } from './src/utils/tableUtils.js';

async function updateCategories() {
    try {
        console.log('Starting category updates...');

        // 0. Disable Foreign Key Checks
        await pool.query('SET FOREIGN_KEY_CHECKS=0');
        console.log('Disabled FK Checks');

        // 1. Rename Utilities -> Bills & Utilities
        await pool.query('UPDATE categories SET name = ? WHERE id = ?', ['Bills & Utilities', 4]);
        console.log('Renamed Utilities to Bills & Utilities');

        // 2. Rename Healthcare -> Health
        await pool.query('UPDATE categories SET name = ? WHERE id = ?', ['Health', 6]);
        console.log('Renamed Healthcare to Health');

        // 3. Insert Education (if not exists)
        const [eduRows] = await pool.query('SELECT id FROM categories WHERE name = ?', ['Education']);
        let educationId;
        if (eduRows.length === 0) {
            const [res] = await pool.query('INSERT INTO categories (name) VALUES (?)', ['Education']);
            educationId = res.insertId;
            console.log('Inserted Education');
        } else {
            educationId = eduRows[0].id;
        }

        // 4. Migrate Expenses
        // Rent (3) -> Bills & Utilities (4)
        // I need to do this for ALL user tables if they exist, but the prompt implies single user or I should iterate. 
        // Wait, the `categories` table is global, but `expenses_<uid>` are per user. 
        // I need to find all expense tables.

        // Helper to find all expense tables
        const [tables] = await pool.query("SHOW TABLES LIKE 'expenses_%'");
        const expenseTables = tables.map(row => Object.values(row)[0]);

        for (const table of expenseTables) {
            console.log(`Updating table: ${table}`);
            // Rent (3) -> Bills & Utilities (4)
            await pool.query(`UPDATE \`${table}\` SET category_id = 4 WHERE category_id = 3`); // Rent -> Bills

            // Other (9) -> Shopping (7)
            await pool.query(`UPDATE \`${table}\` SET category_id = 7 WHERE category_id = 9`); // Other -> Shopping
        }

        // Check for budgets table? Global or per user? 
        // Assuming no global budgets table based on previous checks.

        console.log('Expenses migrated.');

        // 5. Delete old categories
        await pool.query('DELETE FROM categories WHERE id IN (3, 9)');
        console.log('Deleted Rent and Other categories');

        // 6. Enable FK Checks
        await pool.query('SET FOREIGN_KEY_CHECKS=1');
        console.log('Enabled FK Checks');

        console.log('All updates completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

updateCategories();
