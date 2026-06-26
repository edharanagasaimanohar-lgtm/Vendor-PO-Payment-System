import express from 'express';
import { 
  getVendors, 
  getVendorById, 
  createVendor, 
  updateVendor, 
  deleteVendor, 
  restoreVendor,
  getVendorStatement 
} from '../controllers/vendorController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', authenticateToken, getVendors);
router.get('/:id', authenticateToken, getVendorById);
router.post('/', authenticateToken, createVendor);
router.put('/:id', authenticateToken, updateVendor);
router.delete('/:id', authenticateToken, deleteVendor);
router.post('/:id/restore', authenticateToken, restoreVendor);
router.get('/:id/statement', authenticateToken, getVendorStatement);

export default router;
