import express from 'express';
import { getPayments, createPayment } from '../controllers/paymentController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', authenticateToken, getPayments);
router.post('/', authenticateToken, createPayment);

export default router;
