import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
    getIncomes,
    addIncome,
    updateIncome,
    deleteIncome,
} from '../controllers/incomeController.js';

const router = express.Router();

router.get('/', authenticateToken, getIncomes);
router.post('/', authenticateToken, addIncome);
router.put('/:id', authenticateToken, updateIncome);
router.delete('/:id', authenticateToken, deleteIncome);

export default router;
