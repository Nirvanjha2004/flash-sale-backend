import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { rateLimit } from '../middlewares/rateLimitMiddleware.js';
import { createOrder } from '../controllers/orderController.js';

const router = express.Router();

router.post('/', authenticate, rateLimit, createOrder);

export default router;
