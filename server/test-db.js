import initSqlJs from 'sql.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const dbPath = process.env.DB_PATH || './data/expense_tracker.db';
const absolutePath = path.resolve(__dirname, dbPath);

console.log('Attempting to connect to SQLite (via sql.js) at:', absolutePath);

// Ensure directory exists
const dir = path.dirname(absolutePath);
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
}

async function test() {
    try {
        const initSqlJsFn = initSqlJs.default || initSqlJs;
        const SQL = await initSqlJsFn();

        let dbData = undefined;
        if (fs.existsSync(absolutePath)) {
            dbData = fs.readFileSync(absolutePath);
            console.log(`Loaded existing database file (${dbData.length} bytes)`);
        }

        const db = new SQL.Database(dbData);
        console.log('SUCCESS: Connected to SQLite via sql.js!');

        // Run a simple query
        const stmt = db.prepare('SELECT 1 as result');
        stmt.step();
        const row = stmt.getAsObject();
        console.log('Query result:', row.result);
        stmt.free();

        // Write a test table and save it to verify persistence
        db.run('CREATE TABLE IF NOT EXISTS _test_connection (id INTEGER PRIMARY KEY, status TEXT)');
        db.run("INSERT OR REPLACE INTO _test_connection (id, status) VALUES (1, 'ok')");
        
        // Export and save back to verify we can write to the file
        const data = db.export();
        fs.writeFileSync(absolutePath, Buffer.from(data));
        console.log('SUCCESS: Database changes persisted to file!');

        db.close();
    } catch (err) {
        console.error('FAILURE:', err);
    }
}

test();

