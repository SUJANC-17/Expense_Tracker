import pool from '../config/db.js';

export const initializeDatabase = async (): Promise<void> => {
  try {
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create categories table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert default categories
    await pool.query(`
      INSERT IGNORE INTO categories (name) VALUES 
      ('Food'), ('Travel'), ('Rent'), ('Utilities'), 
      ('Entertainment'), ('Healthcare'), ('Shopping'), ('Split'), ('Other')
    `);

    console.log('Database global tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};
