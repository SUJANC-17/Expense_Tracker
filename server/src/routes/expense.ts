import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
    getExpenses,
    getCategories,
    addExpense,
    updateExpense,
    deleteExpense,
} from '../controllers/expenseController.js';

const router = express.Router();

router.get('/', authenticateToken, getExpenses);
router.get('/categories', authenticateToken, getCategories);
router.post('/', authenticateToken, addExpense);
router.put('/:id', authenticateToken, updateExpense);
router.delete('/:id', authenticateToken, deleteExpense);

export default router;
