import express, { type Request, type Response } from 'express';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
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
import budgetsRoutes from './routes/budgets.js';
import reminderRoutes from './routes/reminder.js';
import { authenticateToken } from './middleware/auth.js';
import type { AuthRequest } from './middleware/auth.js';
import { startDailyReminderScheduler } from './services/dailyReminderScheduler.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const DEFAULT_ALLOWED_ORIGINS = new Set([
    'https://expensetrack.qzz.io',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
]);

const allowedOrigins = new Set([
    ...DEFAULT_ALLOWED_ORIGINS,
    ...(process.env.CORS_ALLOWED_ORIGINS || '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
]);

// Middleware
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.has(origin)) {
            callback(null, true);
            return;
        }

        callback(null, false);
    },
}));
// Compress all HTTP responses (gzip/deflate) — placed before express.json so
// the body parser doesn't fire on already-handled OPTIONS pre-flights.
app.use(compression());
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
startDailyReminderScheduler();

// Routes
app.get('/api', (req: Request, res: Response) => {
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
app.use('/api/budgets', budgetsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', reminderRoutes);

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

// ---------------------------------------------------------------------------
// Static frontend serving (production build)
// ---------------------------------------------------------------------------
// Resolve the client/dist directory relative to this compiled file.
// In dev (tsx), __filename points to server/src/index.ts → two levels up to
// the monorepo root, then into client/dist.
// In production (node dist/index.js), same relative path works.
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const clientDist = path.resolve(__dirname, '../../client/dist');

// Hashed asset chunks (JS/CSS/images with content-hash in filename):
// aggressively cache — 1 year, immutable.
app.use(
    '/assets',
    express.static(path.join(clientDist, 'assets'), {
        maxAge: '1y',
        immutable: true,
        // Don't fall through if file not found — avoids SPA catch-all hitting
        // for non-existent asset requests.
        fallthrough: false,
    })
);

// Other public files (manifest, icons, service worker, vite.svg …):
// short cache, no immutable flag.
app.use(
    express.static(clientDist, {
        maxAge: '1d',
        index: false, // index.html is handled separately below
    })
);

// SPA fallback — serve index.html for any non-API route.
// index.html is always revalidated so users pick up new deploys immediately.
app.get('*', (_req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(clientDist, 'index.html'));
});

// Start server
try {
    const server = app.listen(PORT, HOST, () => {
        console.log(`Server is running on http://${HOST}:${PORT}`);
    });
    server.on('error', (e) => console.error('Server error:', e));
} catch (e) {
    console.error('Failed to start server:', e);
}

export default app;
