import { Kafka } from 'kafkajs';

// Shared Kafka Client Configuration
const kafka = new Kafka({
  clientId: 'flash-sale-app',
  brokers: [process.env.KAFKA_BROKERS || 'localhost:9092'],
});

export const producer = kafka.producer();

export const createConsumer = (groupId) => {
  return kafka.consumer({ groupId });
};

export async function connectProducer() {
  await producer.connect();
  console.log('Kafka Producer connected');
}
