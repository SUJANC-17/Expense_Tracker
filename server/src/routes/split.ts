import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
    getSplits,
    getUnpaidSplits,
    getSplitBalances,
    addSplit,
    addSplitBulk,
    markSplitPaid,
    updateSplit,
    deleteSplit,
} from '../controllers/splitController.js';

const router = express.Router();

router.get('/', authenticateToken, getSplits);
router.get('/unpaid', authenticateToken, getUnpaidSplits);
router.get('/balances', authenticateToken, getSplitBalances);
router.post('/bulk', authenticateToken, addSplitBulk);
router.post('/', authenticateToken, addSplit);
router.put('/:id', authenticateToken, updateSplit);
router.put('/:id/paid', authenticateToken, markSplitPaid);
router.delete('/:id', authenticateToken, deleteSplit);

export default router;
