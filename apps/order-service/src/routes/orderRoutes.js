import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { rateLimit } from '../middlewares/rateLimitMiddleware.js';
import { createOrder, getOrderStatus, handlePaymentWebhook, handleMockPayment } from '../controllers/orderController.js';

const router = express.Router();

router.post('/', authenticate, rateLimit, createOrder);
router.get('/status/:orderId', authenticate, getOrderStatus);
router.get('/mock-gateway/pay', handleMockPayment);
router.post('/webhook', handlePaymentWebhook);

export default router;
