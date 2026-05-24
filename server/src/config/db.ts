import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

const dbPath = process.env.DB_PATH || './data/expense_tracker.db';
const dbDir = path.dirname(dbPath);

// Ensure the directory exists
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath, { verbose: console.log });
db.pragma('foreign_keys = ON');

console.log('Connected to SQLite database at', dbPath);

export default db;
