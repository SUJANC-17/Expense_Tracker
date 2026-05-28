import initSqlJs from 'sql.js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

const TERMUX_DB_PATH = '/sdcard/Documents/ExpenseTracker/expense_tracker.db';

function resolveDefaultDbPath(): string {
    const onTermux =
        typeof process.env.TERMUX_VERSION === 'string' ||
        (process.env.PREFIX ?? '').includes('com.termux');
    if (onTermux) {
        return TERMUX_DB_PATH;
    }
    return './data/expense_tracker.db';
}

const dbPath = process.env.DB_PATH || resolveDefaultDbPath();
const dbDir = path.dirname(dbPath);

// Ensure the directory exists
if (!fs.existsSync(dbDir)) {
    try {
        fs.mkdirSync(dbDir, { recursive: true });
    } catch (err) {
        console.error('Failed to create DB directory:', err);
    }
}

// Load sql.js (explicit WASM path for Termux/Node ESM)
// @ts-ignore
const initSqlJsFn = (initSqlJs.default || initSqlJs) as typeof initSqlJs;
const configDir = path.dirname(fileURLToPath(import.meta.url));
const wasmPath = path.join(configDir, '../../node_modules/sql.js/dist/sql-wasm.wasm');
const sqlJsOptions = fs.existsSync(wasmPath) ? { locateFile: () => wasmPath } : {};
const SQL = await initSqlJsFn(sqlJsOptions);

// Load DB from file if it exists, otherwise start with empty DB
let dbData: Buffer | undefined = undefined;
if (fs.existsSync(dbPath)) {
    try {
        dbData = fs.readFileSync(dbPath);
        console.log(`Loaded SQLite database from ${dbPath} (${dbData.length} bytes)`);
    } catch (err) {
        console.error(`Failed to read SQLite database file from ${dbPath}:`, err);
    }
} else {
    console.log(`No existing database at ${dbPath}, starting fresh.`);
}

const sqlJsDb = new SQL.Database(dbData);

// Save function to write the in-memory DB back to the file
function saveDatabase() {
    try {
        const data = sqlJsDb.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(dbPath, buffer);
        console.log(`Saved SQLite database to ${dbPath} (${buffer.length} bytes)`);
    } catch (err) {
        console.error('Error saving SQLite database to file:', err);
    }
}

// Wrapper for Prepared Statement to match better-sqlite3 API
class WrappedStatement {
    constructor(
        private sql: string,
        private sqlJsDb: any,
        private persist: () => void
    ) {}

    all(...args: any[]): any[] {
        const stmt = this.sqlJsDb.prepare(this.sql);
        try {
            if (args.length > 0) {
                if (args.length === 1 && (Array.isArray(args[0]) || typeof args[0] === 'object' && args[0] !== null)) {
                    stmt.bind(args[0]);
                } else {
                    stmt.bind(args);
                }
            }
            const rows = [];
            while (stmt.step()) {
                rows.push(stmt.getAsObject());
            }
            return rows;
        } finally {
            stmt.free();
        }
    }

    get(...args: any[]): any | undefined {
        const stmt = this.sqlJsDb.prepare(this.sql);
        try {
            if (args.length > 0) {
                if (args.length === 1 && (Array.isArray(args[0]) || typeof args[0] === 'object' && args[0] !== null)) {
                    stmt.bind(args[0]);
                } else {
                    stmt.bind(args);
                }
            }
            if (stmt.step()) {
                return stmt.getAsObject();
            }
            return undefined;
        } finally {
            stmt.free();
        }
    }

    run(...args: any[]): { changes: number; lastInsertRowid: number } {
        const stmt = this.sqlJsDb.prepare(this.sql);
        try {
            if (args.length > 0) {
                if (args.length === 1 && (Array.isArray(args[0]) || typeof args[0] === 'object' && args[0] !== null)) {
                    stmt.bind(args[0]);
                } else {
                    stmt.bind(args);
                }
            }
            stmt.step();
        } finally {
            stmt.free();
        }

        // Get changes and last insert row ID
        const changesStmt = this.sqlJsDb.prepare('SELECT changes() AS changes');
        let changes = 0;
        try {
            if (changesStmt.step()) {
                changes = changesStmt.getAsObject().changes;
            }
        } finally {
            changesStmt.free();
        }

        const lastIdStmt = this.sqlJsDb.prepare('SELECT last_insert_rowid() AS id');
        let lastInsertRowid = 0;
        try {
            if (lastIdStmt.step()) {
                lastInsertRowid = lastIdStmt.getAsObject().id;
            }
        } finally {
            lastIdStmt.free();
        }

        this.persist();

        return { changes, lastInsertRowid };
    }
}

// Wrapper for the Database connection itself to match better-sqlite3 API
class WrappedDatabase {
    private transactionDepth = 0;

    constructor(private sqlJsDb: any, private saveFn: () => void) {}

    private persistIfIdle(): void {
        if (this.transactionDepth === 0) {
            this.saveFn();
        }
    }

    prepare(sql: string) {
        return new WrappedStatement(sql, this.sqlJsDb, () => this.persistIfIdle());
    }

    transaction(fn: (...args: any[]) => any) {
        return (...args: any[]) => {
            this.transactionDepth++;
            this.sqlJsDb.run('BEGIN TRANSACTION;');
            try {
                const result = fn(...args);
                this.sqlJsDb.run('COMMIT;');
                return result;
            } catch (error) {
                try {
                    this.sqlJsDb.run('ROLLBACK;');
                } catch (_) {}
                throw error;
            } finally {
                this.transactionDepth--;
                if (this.transactionDepth === 0) {
                    this.saveFn();
                }
            }
        };
    }

    exec(sql: string): this {
        this.sqlJsDb.exec(sql);
        this.persistIfIdle();
        return this;
    }

    pragma(pragmaString: string) {
        this.sqlJsDb.run(`PRAGMA ${pragmaString};`);
        this.persistIfIdle();
    }

    close() {
        this.saveFn();
        this.sqlJsDb.close();
    }
}

const db = new WrappedDatabase(sqlJsDb, saveDatabase);
db.pragma('foreign_keys = ON');

console.log('Connected to SQLite database via sql.js');

export default db;

