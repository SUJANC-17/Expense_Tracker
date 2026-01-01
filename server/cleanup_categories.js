import pool from './src/config/db.js';

async function cleanupCategories() {
    try {
        console.log('Starting cleanup...');

        // 0. Disable FK Checks
        await pool.query('SET FOREIGN_KEY_CHECKS=0');

        // 1. Move expenses from Utilities (146) -> Bills & Utilities (4)
        // Check finding tables again
        const [tables] = await pool.query("SHOW TABLES LIKE 'expenses_%'");
        const expenseTables = tables.map(row => Object.values(row)[0]);

        for (const table of expenseTables) {
            console.log(`Cleaning table: ${table}`);
            await pool.query(`UPDATE \`${table}\` SET category_id = 4 WHERE category_id = 146`);
            await pool.query(`UPDATE \`${table}\` SET category_id = 6 WHERE category_id = 147`);
        }

        // 2. Delete the duplicates
        await pool.query('DELETE FROM categories WHERE id IN (146, 147)');
        console.log('Deleted duplicates (146, 147)');

        // 3. Enable FK Checks
        await pool.query('SET FOREIGN_KEY_CHECKS=1');

        console.log('Cleanup complete.');
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

cleanupCategories();
