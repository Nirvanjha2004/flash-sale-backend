import express from 'express';
import { connectProducer } from './services/kafkaProducer.js';
import redisClient from './config/redisClient.js'; 

const app = express();
app.use(express.json());

// Routes
import orderRoutes from './routes/orderRoutes.js';
app.use('/api/orders', orderRoutes);

// 404 Handler for undefined routes
app.use((req, res, next) => {
  res.status(404).json({
    message: `Route ${req.method}:${req.originalUrl} not found`,
    error: 'Not Found',
    statusCode: 404
  });
});

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
