import express from 'express';
import { 
  getPurchaseOrders, 
  getPurchaseOrderById, 
  createPurchaseOrder, 
  updatePurchaseOrder, 
  deletePurchaseOrder, 
  getNextPoNumber,
  addPaymentToPo,
  confirmDelivery,
  getDashboardStats,
  getMonthlySpendReport,
  getVendorPerformanceReport
} from '../controllers/purchaseOrderController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/dashboard-stats', authenticateToken, getDashboardStats);
router.get('/next-number', authenticateToken, getNextPoNumber);
router.get('/report-monthly-spend', authenticateToken, getMonthlySpendReport);
router.get('/report-vendor-performance', authenticateToken, getVendorPerformanceReport);

router.get('/', authenticateToken, getPurchaseOrders);
router.post('/', authenticateToken, createPurchaseOrder);
router.get('/:id', authenticateToken, getPurchaseOrderById);
router.put('/:id', authenticateToken, updatePurchaseOrder);
router.delete('/:id', authenticateToken, deletePurchaseOrder);
router.post('/:id/payment', authenticateToken, addPaymentToPo);
router.patch('/:id/deliver', authenticateToken, confirmDelivery);

export default router;
