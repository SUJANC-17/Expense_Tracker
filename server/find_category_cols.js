import pool from './src/config/db.js';

async function findCategoryColumns() {
    try {
        const [rows] = await pool.query(`
            SELECT TABLE_NAME, COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE COLUMN_NAME = 'category_id' 
            AND TABLE_SCHEMA = DATABASE()
        `);
        console.log('Tables with category_id:', rows.map(r => r.TABLE_NAME));
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

findCategoryColumns();
