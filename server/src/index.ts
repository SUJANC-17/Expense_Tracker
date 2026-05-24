import fs from 'fs';
import path from 'path';

const dbDir = '/sdcard/Documents/ExpenseTracker';
if (!fs.existsSync(dbDir)) {
    try {
        fs.mkdirSync(dbDir, { recursive: true });
    } catch (err) {
        console.error('Failed to create DB directory:', err);
    }
}

import express, { type Request, type Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeDatabase } from './models/schema.js';
import db from './config/db.js';
import { startMonthlyReportScheduler, generateAndSendReport } from './services/scheduler.js';
import { startCleanupScheduler } from './services/cleanupService.js';
import authRoutes from './routes/auth.js';
import incomeRoutes from './routes/income.js';
import expenseRoutes from './routes/expense.js';
import splitRoutes from './routes/split.js';
import summaryRoutes from './routes/summary.js';
import friendRoutes from './routes/friend.js';
import adminRoutes from './routes/admin.js';
import reportsRoutes from './routes/reports.js';
import { authenticateToken } from './middleware/auth.js';
import type { AuthRequest } from './middleware/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database
try {
    initializeDatabase();
    console.log('Database initialized');
} catch (err) {
    console.error('Failed to initialize database:', err);
}

// Start monthly report scheduler
startMonthlyReportScheduler();
startCleanupScheduler();

// Routes
app.get('/', (req: Request, res: Response) => {
    res.json({ message: 'Expense Tracker API is running' });
});

app.get('/api/health', (req: Request, res: Response) => {
    try {
        db.prepare('SELECT 1').get();
        res.json({ status: 'OK', database: 'Connected (SQLite)' });
    } catch (error: any) {
        res.status(500).json({ status: 'Error', database: error.message });
    }
});

app.use('/api/auth', authRoutes);
app.use('/api/incomes', incomeRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/splits', splitRoutes);
app.use('/api/summary', summaryRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/admin', adminRoutes);

// Manual report generation endpoint
app.post('/api/reports/generate', authenticateToken, async (req: AuthRequest, res: Response) => {
    const { year, month } = req.body;

    if (!year || !month) {
        res.status(400).json({ error: 'Year and month are required' });
        return;
    }

    try {
        await generateAndSendReport(req.user!.uid, req.user!.email!, year, month);
        res.json({ message: 'Report generated and sent successfully' });
    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
});

// Start server
try {
    const server = app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
    server.on('error', (e) => console.error('Server error:', e));
} catch (e) {
    console.error('Failed to start server:', e);
}

export default app;
