import pool from './src/config/db.js';

async function listTables() {
    try {
        const [rows] = await pool.query('SHOW TABLES');
        const tables = rows.map(r => Object.values(r)[0]);
        console.log('Tables:', tables);
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

listTables();
