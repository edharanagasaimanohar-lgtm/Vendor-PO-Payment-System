import express from 'express';
import { getDeliveries, createDelivery } from '../controllers/deliveryController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', authenticateToken, getDeliveries);
router.post('/', authenticateToken, createDelivery);

export default router;
