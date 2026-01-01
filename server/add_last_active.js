import pool from './src/config/db.js';

async function addLastActiveColumn() {
    try {
        console.log('Adding last_active_at to users table...');

        // Add column if it doesn't exist. 
        // Using ON UPDATE CURRENT_TIMESTAMP makes it update automatically when the row is touched.
        // However, usually we might need to manually touch the user row on activity if activity is in OTHER tables.
        // But for "addition or anything", usually implies interacting with the app.
        // If we just adding an expense, the user row isn't updated by default.
        // So we might need a middleware to touch the user row.

        const query = `
            ALTER TABLE users 
            ADD COLUMN last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        `;

        await pool.query(query);
        console.log('Added last_active_at column successfully.');
        process.exit(0);
    } catch (error) {
        // Ignore if column already exists (error code 1060)
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('Column last_active_at already exists.');
            process.exit(0);
        }
        console.error(error);
        process.exit(1);
    }
}

addLastActiveColumn();
