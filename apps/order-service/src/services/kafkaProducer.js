import { producer, connectProducer } from '../../../../shared/utils/kafka.js';

export { connectProducer };

export async function sendOrderEvent(orderData) {
  await producer.send({
    topic: 'order-events',
    messages: [
      { key: orderData.id, value: JSON.stringify(orderData) },
    ],
  });
  console.log(`Order event sent: ${orderData.id}`);
}
