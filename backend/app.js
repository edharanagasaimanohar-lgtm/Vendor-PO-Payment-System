import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import vendorRoutes from './routes/vendorRoutes.js';
import purchaseOrderRoutes from './routes/purchaseOrderRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import deliveryRoutes from './routes/deliveryRoutes.js';
import { getDashboardStats, getMonthlySpendReport, getVendorPerformanceReport } from './controllers/purchaseOrderController.js';
import { authenticateToken } from './middleware/authMiddleware.js';
import { errorHandler } from './middleware/errorMiddleware.js';

const app = express();

const corsOptions = {};
if (process.env.CORS_ORIGIN) {
  corsOptions.origin = process.env.CORS_ORIGIN.split(',').map(item => item.trim());
  corsOptions.credentials = true;
}
app.use(cors(corsOptions));
app.use(express.json());

// API route groups
app.use('/api/auth', authRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/deliveries', deliveryRoutes);

// Dashboard & Report endpoints
app.get('/api/dashboard/stats', authenticateToken, getDashboardStats);
app.get('/api/reports/monthly-spend', authenticateToken, getMonthlySpendReport);
app.get('/api/reports/vendor-performance', authenticateToken, getVendorPerformanceReport);

// Global Error Handler
app.use(errorHandler);

export default app;
