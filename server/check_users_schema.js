import pool from './src/config/db.js';
import fs from 'fs';

async function checkUserSchema() {
    try {
        const [columns] = await pool.query('DESCRIBE users');
        fs.writeFileSync('users_schema.json', JSON.stringify(columns, null, 2));
        console.log('Schema written to users_schema.json');
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkUserSchema();