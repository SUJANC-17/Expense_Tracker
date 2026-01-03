import express from 'express';
import { authenticateToken, type AuthRequest } from '../middleware/auth.js';
import { generateAndSendReport } from '../services/scheduler.js';

const router = express.Router();

router.post('/send', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const { uid, email } = req.user!;
        const { year, month } = req.body;

        if (!uid || !email) {
            res.status(400).json({ error: 'User authentication incomplete' });
            return;
        }

        if (!year || !month) {
            res.status(400).json({ error: 'Year and month are required' });
            return;
        }

        await generateAndSendReport(uid, email, parseInt(year), parseInt(month));

        res.json({ message: 'Report sent successfully' });
    } catch (error) {
        console.error('Error sending report:', error);
        res.status(500).json({ error: 'Failed to send report' });
    }
});

export default router;
