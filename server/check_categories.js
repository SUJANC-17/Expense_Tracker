import pool from './src/config/db.js';
import fs from 'fs';

async function checkCategories() {
    try {
        const [categories] = await pool.query('SELECT * FROM categories');
        fs.writeFileSync('categories.json', JSON.stringify(categories, null, 2));
        console.log('Categories written to categories.json');
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkCategories();
