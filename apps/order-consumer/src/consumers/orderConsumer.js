import { PrismaClient } from '@prisma/client';
import { requestPaymentLink } from '../services/paymentService.js';
import { createConsumer } from '../../../../shared/utils/kafka.js';

const prisma = new PrismaClient();

async function run() {
  const consumer = createConsumer('order-consumer-group');
  await consumer.connect();
  await consumer.subscribe({ topic: 'order-events', fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const orderData = JSON.parse(message.value.toString());
      console.log(`[Order Consumer] Processing order: ${orderData.id}`);
      
      try {
        // 1. Persist to Database
        const order = await prisma.order.create({
          data: {
            id: orderData.id,
            userId: orderData.userId,
            productId: orderData.productId,
            quantity: orderData.quantity,
            totalAmount: 100.00, // Dummy amount calculation
            status: 'PENDING',
            expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
          },
        });

        // 2. Request Payment Link
        const paymentLink = await requestPaymentLink(order.id, order.totalAmount);

        // 3. Update Order with Payment Link
        await prisma.order.update({
          where: { id: order.id },
          data: { paymentLink },
        });

        console.log(`[Order Consumer] Order ${order.id} persisted and payment link generated.`);
        
        // TODO: Push to 'order-status-updates' Kafka topic for Notification Service
      } catch (error) {
        console.error(`[Order Consumer] Error processing order ${orderData.id}:`, error);
      }
    },
  });
}

run().catch(console.error);
