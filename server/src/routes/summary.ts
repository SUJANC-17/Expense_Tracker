import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
    getMonthlySummary,
    getCurrentMonthSummary,
    getDetailedSummary,
    getTrends,
} from '../controllers/summaryController.js';

const router = express.Router();

router.get('/current', authenticateToken, getCurrentMonthSummary);
router.get('/detailed', authenticateToken, getDetailedSummary);
router.get('/trends', authenticateToken, getTrends);
router.get('/', authenticateToken, getMonthlySummary);

export default router;
