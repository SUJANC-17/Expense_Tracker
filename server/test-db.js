
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'expense_tracker',
    port: parseInt(process.env.DB_PORT || '3306'),
};

console.log('Attempting to connect with:', { ...config, password: '****' });

async function test() {
    try {
        const connection = await mysql.createConnection(config);
        console.log('SUCCESS: Connected to MySQL!');
        await connection.end();
    } catch (err) {
        console.error('FAILURE: Could not connect to MySQL:', err.message);
    }
}

test();
