import db from '../config/db.js';

export const initializeDatabase = (): void => {
  try {
    // Create users table
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        jwt_id TEXT,
        email TEXT UNIQUE NOT NULL,
        last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add last_active_at if it doesn't exist (SQLite ALTER TABLE is limited but this should work for base setup)
    try {
      db.exec('ALTER TABLE users ADD COLUMN last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP');
    } catch (e) { /* Column probably already exists */ }

    // Add jwt_id if it doesn't exist
    try {
      db.exec('ALTER TABLE users ADD COLUMN jwt_id TEXT');
    } catch (e) { /* Column probably already exists */ }

    // Create categories table
    db.exec(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert default categories
    const defaultCategories = ['Food', 'Travel', 'Rent', 'Utilities', 'Entertainment', 'Healthcare', 'Shopping', 'Split', 'Other'];
    const insertCategory = db.prepare('INSERT OR IGNORE INTO categories (name) VALUES (?)');
    
    db.transaction(() => {
      for (const cat of defaultCategories) {
        insertCategory.run(cat);
      }
    })();

    console.log('Database global tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};
