import express from 'express';
import { 
  login, 
  register, 
  forgotPassword, 
  resetPassword, 
  changePassword, 
  updateProfile,
  getMe, 
  debugDb 
} from '../controllers/authController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/login', login);
router.post('/register', register);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/change-password', authenticateToken, changePassword);
router.post('/update-profile', authenticateToken, updateProfile);
router.get('/me', authenticateToken, getMe);
router.get('/profile', authenticateToken, getMe);
router.get('/debug-db', debugDb);

export default router;
