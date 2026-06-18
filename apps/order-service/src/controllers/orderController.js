import { decrementStock } from '../../../../shared/utils/inventory.js';
import { sendOrderEvent } from '../services/kafkaProducer.js';
import redisClient from '../config/redisClient.js';

export async function createOrder(req, res) {
  const { productId, quantity } = req.body;
  const userId = req.user.id; // From auth middleware
  const stockKey = `product:${productId}:stock`;

  try {
    // 1. Atomic Stock Check & Decrement
    const remainingStock = await decrementStock(redisClient, stockKey, quantity);
    
    // 2. Queue Order Event
    const orderData = {
        id: crypto.randomUUID(), // Assuming Node 16+
        productId,
        quantity,
        userId,
        createdAt: new Date()
    };
    
    await sendOrderEvent(orderData);

    res.status(202).json({
        message: 'Order accepted',
        orderId: orderData.id,
        remainingStock
    });

  } catch (err) {
    if (err.message === 'INSUFFICIENT_STOCK' || err.message === 'PRODUCT_NOT_FOUND') {
      return res.status(400).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
