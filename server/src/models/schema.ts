import db from '../config/db.js';

export const initializeDatabase = (): void => {
  try {
    // Create users table
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT,
        email TEXT UNIQUE NOT NULL,
        last_active_at DATETIME DEFAULT (DATETIME('now', 'localtime')),
        created_at DATETIME DEFAULT (DATETIME('now', 'localtime'))
      )
    `);

    // Add last_active_at if it doesn't exist
    try {
      db.exec("ALTER TABLE users ADD COLUMN last_active_at DATETIME DEFAULT (DATETIME('now', 'localtime'))");
    } catch (e) { /* Column probably already exists */ }

    try {
      db.exec('ALTER TABLE users ADD COLUMN username TEXT');
    } catch (e) { /* Column probably already exists */ }

    // Create categories table
    db.exec(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        created_at DATETIME DEFAULT (DATETIME('now', 'localtime'))
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS friends (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT (DATETIME('now', 'localtime')),
        UNIQUE(user_id, name),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS incomes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        amount REAL NOT NULL,
        source TEXT NOT NULL,
        description TEXT,
        date TEXT NOT NULL,
        created_at DATETIME DEFAULT (DATETIME('now', 'localtime')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        amount REAL NOT NULL,
        category_id INTEGER NOT NULL,
        description TEXT,
        date TEXT NOT NULL,
        created_at DATETIME DEFAULT (DATETIME('now', 'localtime')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(id)
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS splits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        friend_id INTEGER,
        friend_name TEXT,
        amount REAL NOT NULL,
        description TEXT,
        is_paid INTEGER DEFAULT 0,
        paid_at DATETIME NULL,
        date TEXT NOT NULL,
        created_at DATETIME DEFAULT (DATETIME('now', 'localtime')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (friend_id) REFERENCES friends(id) ON DELETE SET NULL
      )
    `);

    db.exec('CREATE INDEX IF NOT EXISTS idx_friends_user_name ON friends(user_id, name)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_incomes_user_date ON incomes(user_id, date)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, date)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_splits_user_date ON splits(user_id, date)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_splits_user_paid ON splits(user_id, is_paid)');

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
