import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getFriends, addFriend, deleteFriend } from '../controllers/friendController.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', getFriends);
router.post('/', addFriend);
router.delete('/:id', deleteFriend);

export default router;
