import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const dbPath = process.env.DB_PATH || './data/expense_tracker.db';
const absolutePath = path.resolve(__dirname, dbPath);

console.log('Attempting to connect to SQLite at:', absolutePath);

// Ensure directory exists
const dir = path.dirname(absolutePath);
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
}

function test() {
    try {
        const db = new Database(absolutePath);
        console.log('SUCCESS: Connected to SQLite!');
        const row = db.prepare('SELECT 1 as result').get();
        console.log('Query result:', row.result);
        db.close();
    } catch (err) {
        console.error('FAILURE: Could not connect to SQLite:', err.message);
    }
}

test();
