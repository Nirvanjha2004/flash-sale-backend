import express from 'express';
import { connectProducer } from './services/kafkaProducer.js';
// We'll need to create the redis client file
import redisClient from './config/redisClient.js'; 

const app = express();
app.use(express.json());

// Routes
import orderRoutes from './routes/orderRoutes.js';
app.use('/api/orders', orderRoutes);

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await connectProducer();
    app.listen(PORT, () => {
      console.log(`Order Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
