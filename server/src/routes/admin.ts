import express from 'express';
import db from '../config/db.js';
import jwt from 'jsonwebtoken';
import { processUserCleanup } from '../services/cleanupService.js';
import { getUserTableName } from '../utils/tableUtils.js';
import { authenticateAdmin } from '../middleware/adminAuth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-env';

// Admin Login (Email + PIN)
router.post('/login', (req, res) => {
    const { email, pin } = req.body;
    if (email === 'sujanc3306@gmail.com' && pin === '1010') {
        // Generate Token
        const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ success: true, message: 'Welcome Admin', token });
    } else {
        res.status(401).json({ error: 'Invalid admin credentials' });
    }
});

// Admin-accessible categories endpoint
router.get('/categories', (req, res) => {
    try {
        const rows = db.prepare('SELECT * FROM categories ORDER BY name').all();
        res.json(rows);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// Protect all following routes
router.use(authenticateAdmin);

// List all users
router.get('/users', (req, res) => {
    try {
        const users = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// List tables for a specific user
router.get('/users/:uid/tables', (req, res) => {
    const { uid } = req.params;
    try {
        const prefix = getUserTableName(uid, '');
        const allTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as any[];
        const dbTables = allTables.map(r => r.name);
        const userTables = dbTables.filter((t: string) => t.startsWith(prefix));
        res.json(userTables);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch user tables' });
    }
});

// Get records for a specific table
router.get('/users/:uid/tables/:tableName/data', (req, res) => {
    const { uid, tableName } = req.params;
    try {
        const expectedPrefix = getUserTableName(uid, '');
        if (!tableName.startsWith(expectedPrefix)) {
            res.status(403).json({ error: 'Access denied to this table' });
            return;
        }

        const rows = db.prepare(`SELECT * FROM \`${tableName}\` LIMIT 100`).all();
        res.json(rows);
    } catch (error) {
        console.error('Error fetching table data:', error);
        res.status(500).json({ error: 'Failed to fetch table data' });
    }
});

// Delete user (with export + wipe)
router.delete('/users/:uid', (req, res) => {
    const { uid } = req.params;
    try {
        const user = db.prepare('SELECT email FROM users WHERE id = ?').get(uid) as any;
        if (user) {
            const email = user.email;
            processUserCleanup(uid, email);
            res.json({ message: `User ${email} and all data has been wiped successfully.` });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (error) {
        console.error('Admin delete error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

export default router;
