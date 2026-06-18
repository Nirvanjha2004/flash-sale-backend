import redisClient from '../config/redisClient.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Controller for GET /api/v1/orderStatus/:orderId
 * Performs high-speed cache lookup.
 */
export async function getOrderStatus(req, res) {
  const { orderId } = req.params;
  const cacheKey = `payment:link:${orderId}`;

  try {
    // 1. Try Redis Cache first
    const cachedLink = await redisClient.get(cacheKey);
    if (cachedLink) {
      return res.status(200).json({ status: 'PENDING', paymentLink: cachedLink, source: 'cache' });
    }

    // 2. Fallback to Database
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.status(200).json({ status: order.status, paymentLink: order.paymentLink, source: 'db' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Controller for GET /api/orders/mock-gateway/pay
 * Simulates a payment gateway hosted checkout page.
 */
export async function handleMockPayment(req, res) {
  const { orderId } = req.query;

  // Simulate user delay
  setTimeout(async () => {
    // 90% success probability
    const success = Math.random() < 0.9;
    const status = success ? 'SUCCESS' : 'FAILED';
    
    // Trigger webhook asynchronously
    fetch('http://localhost:3000/api/orders/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, status }),
    }).catch(err => console.error('Webhook trigger failed', err));
  }, 1000);

  res.status(200).send(`<h1>Payment Page for ${orderId}</h1><p>Processing...</p>`);
}

/**
 * Controller for POST /api/v1/payments/webhook
 * Handles payment success callback.
 */
export async function handlePaymentWebhook(req, res) {
  const { orderId, status } = req.body;

  try {
    if (status === 'SUCCESS') {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'PAID' },
      });
      // Optionally remove from cache
      await redisClient.del(`payment:link:${orderId}`);
      console.log(`[Webhook] Order ${orderId} marked as PAID`);
    } else {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'FAILED' },
      });
    }

    res.status(200).json({ message: 'Webhook processed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}
