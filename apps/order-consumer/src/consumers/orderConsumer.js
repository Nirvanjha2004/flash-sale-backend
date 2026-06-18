import { createConsumer } from '../../../../shared/utils/kafka.js';

async function run() {
  const consumer = createConsumer('order-consumer-group');
  await consumer.connect();
  await consumer.subscribe({ topic: 'order-events', fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const orderData = JSON.parse(message.value.toString());
      console.log(`Processing order: ${orderData.id}`);
      // TODO: Implement DB logic and Payment Gateway integration here
    },
  });
}

run().catch(console.error);
